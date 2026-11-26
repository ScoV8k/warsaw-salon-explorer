#!/usr/bin/env bash
# Installs or updates the Beauty Salons API on an Ubuntu 24.04 VM (Oracle Cloud Always Free).
# Safe to re-run: it pulls the latest code, keeps the server's database, photo cache and env file.
#
#   sudo bash deploy/setup.sh
#
# First run creates /etc/beauty-salons.env from the example and stops so you can fill it in.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/ScoV8k/warsaw-salon-explorer.git}"
BRANCH="${BRANCH:-main}"
APP_USER=beauty
APP_DIR=/opt/beauty-salons
DATA_DIR=/var/lib/beauty-salons
ENV_FILE=/etc/beauty-salons.env

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo."; exit 1; }
export DEBIAN_FRONTEND=noninteractive

echo "==> Packages"
apt-get update -q
apt-get install -y -q python3-venv git curl gpg debian-keyring debian-archive-keyring apt-transport-https iptables-persistent
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt -o /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get install -y -q caddy
fi

echo "==> Firewall (Oracle's Ubuntu image rejects everything but SSH by default)"
for port in 80 443; do
  iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null \
    || iptables -I INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT
done
netfilter-persistent save

echo "==> App user and code"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home-dir "$APP_DIR" --shell /usr/sbin/nologin "$APP_USER"
install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git -C "$APP_DIR" fetch -q origin "$BRANCH"
  sudo -u "$APP_USER" git -C "$APP_DIR" checkout -q "$BRANCH"
  sudo -u "$APP_USER" git -C "$APP_DIR" pull -q --ff-only origin "$BRANCH"
else
  sudo -u "$APP_USER" git clone -q --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
[ -d "$APP_DIR/.venv" ] || sudo -u "$APP_USER" python3 -m venv "$APP_DIR/.venv"
sudo -u "$APP_USER" "$APP_DIR/.venv/bin/pip" install -q -r "$APP_DIR/backend/requirements.txt"

echo "==> Data (copied once; the server's copy is never overwritten)"
install -d -o "$APP_USER" -g "$APP_USER" -m 750 "$DATA_DIR" "$DATA_DIR/photo_cache"
[ -f "$DATA_DIR/salons.db" ] || install -o "$APP_USER" -g "$APP_USER" -m 640 "$APP_DIR/backend/salons.db" "$DATA_DIR/salons.db"

if [ ! -f "$ENV_FILE" ]; then
  install -m 600 "$APP_DIR/deploy/beauty-salons.env.example" "$ENV_FILE"
  echo
  echo "Created $ENV_FILE. Fill in PLACES_API_KEY, API_DOMAIN and ALLOWED_ORIGINS, then re-run this script."
  exit 0
fi
API_DOMAIN="$(grep -E '^API_DOMAIN=' "$ENV_FILE" | cut -d= -f2- | tr -d '[:space:]')"
[ -n "$API_DOMAIN" ] || { echo "API_DOMAIN is empty in $ENV_FILE"; exit 1; }

echo "==> Services"
install -m 644 "$APP_DIR/deploy/beauty-salons.service" /etc/systemd/system/beauty-salons.service
sed "s/__API_DOMAIN__/$API_DOMAIN/" "$APP_DIR/deploy/Caddyfile" > /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable -q beauty-salons caddy
systemctl restart beauty-salons
systemctl reload-or-restart caddy

echo "==> Health check"
for _ in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:3001/api/health; then
    echo
    echo "OK. Public URL: https://$API_DOMAIN/api/health"
    exit 0
  fi
  sleep 1
done
echo "API did not start. Logs: journalctl -u beauty-salons -n 50"
exit 1
