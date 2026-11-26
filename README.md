# 💇 Warsaw Beauty Salon Explorer

A lightweight, full-stack web application for browsing and discovering beauty salons across Warsaw. Data is dynamically fetched from the Google Places API via a custom scraper, stored efficiently, and presented in an interactive list and map view.

> ⚠️ **LIVE DEMO & ARCHITECTURE NOTICE**
> 
> **Live Demo:** [https://warsaw-salon-explorer-eta.vercel.app/](https://warsaw-salon-explorer-eta.vercel.app/)
> 
> Please note the following constraints of this free-tier deployment:
> * 🖥️ **Always-on backend:** The API runs on an Oracle Cloud Always Free VM (no spin-down, no cold start).
> * 🗺️ **Data Scope:** To optimize Google Places API costs, the seeded database covers only selected districts. The scraper itself is fully scalable to the entire city.
> * 🖼️ **Photos on demand:** Lists and the map only show photos the backend has already cached. A photo is fetched from Google only when someone opens a salon (the cover automatically, the rest on click), and the backend enforces a hard daily budget of Google calls (`PLACES_DAILY_BUDGET`, default 30). Placeholders mean a photo hasn't been opened yet or today's budget is used up.

## ✨ Features Implemented
- **Data Collection:** Automated scraper fetching initial data from Google Places.
- **Listing & Map View:** Interactive UI displaying salon name, district, rating, and price range.
- **Detailed View:** Full details for specific salons (address, services, photos).
- **Data Modification:** Full support for manual modification of single salon details via API, saving changes directly to the backend storage.
- **Filtering/Search:** Integrated district and service filtering.

---

## 🚀 How to Run Locally

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Google API Key** (with Places API (New) and Maps JavaScript API enabled)

### 1. Setup & Environment
Clone the repository and install dependencies:
```bash
git clone <repo-url> && cd Beauty_salons
pip install -r requirements.txt
cd frontend && npm install && cd ..
```

Create environment files:

**`.env`** (Project root)
```env
PLACES_API_KEY=your_google_api_key
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_api_key
```

### 2. Populate Database & Run
First, run the scraper to populate the database:
```bash
python scraper/main.py
```

Start the backend API (port 3001):
```bash
cd backend
python run.py
```

Start the frontend app (port 3000):
```bash
cd frontend
npm run dev
```

---

## ☁️ Deployment (Oracle Cloud Always Free)

Backend: Ubuntu 24.04 VM (Ampere A1) → Caddy (automatic HTTPS) → uvicorn, managed by systemd. Frontend: Vercel.

1. Create an Ubuntu 24.04 VM and open TCP 80 and 443 in its subnet's Security List.
2. Point a hostname at the VM's public IP (e.g. a free `duckdns.org` subdomain).
3. On the VM:
   ```bash
   git clone https://github.com/ScoV8k/warsaw-salon-explorer.git && cd warsaw-salon-explorer
   sudo bash deploy/setup.sh          # first run creates /etc/beauty-salons.env
   sudo nano /etc/beauty-salons.env   # PLACES_API_KEY, API_DOMAIN, ALLOWED_ORIGINS
   sudo bash deploy/setup.sh          # installs and starts everything
   ```
4. On Vercel set `NEXT_PUBLIC_API_URL=https://<your-domain>` and redeploy.

Re-run `sudo bash deploy/setup.sh` to deploy new code. The server keeps its own database and photo cache in `/var/lib/beauty-salons`. `GET /api/health` shows today's Google API usage.

Backend tests (mocked Google, no cost): `cd backend && python -m unittest discover -s tests`

---

## 🛠 Architecture & Tech Stack

- **Scraper:** Python + `requests`. Fetches places and deduplicates data.
- **Backend:** **FastAPI**. Serves REST endpoints and proxies Google Place Photos.
- **Database:** **SQLite**. Chosen for its lightweight footprint, speed, and convenience at the current project scale. For a larger production deployment, I would migrate to **PostgreSQL**.
- **Frontend:** **Next.js 16** (App Router) + React 19 + Tailwind CSS.

---

## 🔮 What I'd Improve With More Time

- **Remove external API dependencies for local development** — Currently, the app requires a Google API key to run locally. I would implement a fully static seed database and placeholder images (e.g., Unsplash Source) for the local/testing environment to make it 100% plug-and-play for other developers.
- **Responsive design** — Optimize the layout for mobile devices, since users typically search for salons on their phones.
- **Full-text search** — Replace basic `LIKE` queries with a proper search engine for faster, typo-tolerant results.
