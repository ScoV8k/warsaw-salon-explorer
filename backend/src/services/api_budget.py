import sqlite3
from datetime import datetime
from typing import Callable, Optional
from zoneinfo import ZoneInfo

# Google resets daily quotas at midnight Pacific Time, so the budget day follows it.
QUOTA_TZ = ZoneInfo("America/Los_Angeles")


class ApiBudget:
    """Daily counters of paid Google API calls, persisted in SQLite.

    `daily_limit` caps all calls together (keep it under the Google Cloud quota);
    `kind_limits` optionally caps one kind, e.g. photo downloads, whose free tier
    is smaller than the others.
    """

    def __init__(
        self,
        db_path: str,
        daily_limit: int,
        kind_limits: Optional[dict[str, int]] = None,
        now: Optional[Callable[[], datetime]] = None,
    ):
        self.db_path = db_path
        self.daily_limit = daily_limit
        self.kind_limits = kind_limits or {}
        self._now = now or (lambda: datetime.now(QUOTA_TZ))
        self._migrate()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path, timeout=5, isolation_level=None)

    def _migrate(self) -> None:
        conn = self._connect()
        columns = {r[1] for r in conn.execute("PRAGMA table_info(api_usage)")}
        legacy = bool(columns) and "kind" not in columns
        if legacy:  # earlier single-counter version: keep its counts so today's usage isn't lost
            conn.execute("ALTER TABLE api_usage RENAME TO api_usage_legacy")
        conn.execute(
            """CREATE TABLE IF NOT EXISTS api_usage (
                   day TEXT NOT NULL, kind TEXT NOT NULL, count INTEGER NOT NULL,
                   PRIMARY KEY (day, kind))"""
        )
        if legacy:
            conn.execute("INSERT INTO api_usage (day, kind, count) SELECT day, 'legacy', count FROM api_usage_legacy")
            conn.execute("DROP TABLE api_usage_legacy")
        conn.close()

    def _today(self) -> str:
        return self._now().astimezone(QUOTA_TZ).date().isoformat()

    def try_consume(self, kind: str) -> bool:
        """Reserve one call of `kind`. False once a limit for today is reached."""
        day = self._today()
        conn = self._connect()
        try:
            conn.execute("BEGIN IMMEDIATE")  # serialises concurrent reservations
            counts = dict(conn.execute("SELECT kind, count FROM api_usage WHERE day = ?", (day,)).fetchall())
            kind_limit = self.kind_limits.get(kind)
            if sum(counts.values()) >= self.daily_limit or (
                kind_limit is not None and counts.get(kind, 0) >= kind_limit
            ):
                conn.execute("ROLLBACK")
                return False
            conn.execute(
                """INSERT INTO api_usage (day, kind, count) VALUES (?, ?, 1)
                   ON CONFLICT(day, kind) DO UPDATE SET count = count + 1""",
                (day, kind),
            )
            conn.execute("COMMIT")
            return True
        finally:
            conn.close()

    def usage(self) -> dict:
        day = self._today()
        conn = self._connect()
        counts = dict(conn.execute("SELECT kind, count FROM api_usage WHERE day = ?", (day,)).fetchall())
        conn.close()
        return {
            "day": day,
            "used": sum(counts.values()),
            "limit": self.daily_limit,
            "by_kind": {
                kind: {"used": counts.get(kind, 0), "limit": self.kind_limits.get(kind)}
                for kind in sorted(set(counts) | set(self.kind_limits))
            },
        }
