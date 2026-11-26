import sqlite3
from datetime import datetime
from typing import Callable, Optional
from zoneinfo import ZoneInfo

# Google resets daily quotas at midnight Pacific Time, so the budget day follows it.
QUOTA_TZ = ZoneInfo("America/Los_Angeles")


class ApiBudget:
    """Daily counter of paid Google API calls, persisted in SQLite."""

    def __init__(self, db_path: str, daily_limit: int, now: Optional[Callable[[], datetime]] = None):
        self.db_path = db_path
        self.daily_limit = daily_limit
        self._now = now or (lambda: datetime.now(QUOTA_TZ))
        conn = self._connect()
        conn.execute("CREATE TABLE IF NOT EXISTS api_usage (day TEXT PRIMARY KEY, count INTEGER NOT NULL)")
        conn.commit()
        conn.close()

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self.db_path, timeout=5)

    def _today(self) -> str:
        return self._now().astimezone(QUOTA_TZ).date().isoformat()

    def try_consume(self) -> bool:
        """Reserve one call. Returns False once today's limit is reached."""
        if self.daily_limit <= 0:
            return False
        conn = self._connect()
        try:
            cur = conn.execute(
                """INSERT INTO api_usage (day, count) VALUES (?, 1)
                   ON CONFLICT(day) DO UPDATE SET count = count + 1 WHERE count < ?""",
                (self._today(), self.daily_limit),
            )
            conn.commit()
            return cur.rowcount == 1
        finally:
            conn.close()

    def usage(self) -> dict:
        day = self._today()
        conn = self._connect()
        row = conn.execute("SELECT count FROM api_usage WHERE day = ?", (day,)).fetchone()
        conn.close()
        return {"day": day, "used": row[0] if row else 0, "limit": self.daily_limit}
