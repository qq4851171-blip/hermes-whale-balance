"""Whale Balance desktop plugin — backend API, mounted at /api/plugins/whale-balance/.

Self-contained: inlines the balance/today-usage/fx/peak fetch logic from
/opt/hermes-shared/scripts/whale_card_gen.py so the plugin works from a Git
checkout without depending on any server-local scratch script.

Read-only and safe: DeepSeek balance via platform API (GET), admin state.db
opened with mode=ro, exchange rate via public GET. No writes, no key echo.
Handlers are plain `def` → FastAPI runs them in a worker thread (never block
the gateway event loop; see extending-the-dashboard.md §Backend API routes).
"""
from __future__ import annotations

import datetime
import json
import subprocess
from pathlib import Path

from fastapi import APIRouter

router = APIRouter()

ENV_FILE = Path("/home/fivetree/.hermes/profiles/admin/.env")
DB = Path("/home/fivetree/.hermes/profiles/admin/state.db")
SQLITE = "/opt/hermes-shared/bin/sqlite3-3.53.4"
TZ8 = datetime.timezone(datetime.timedelta(hours=8))
CURL = ["curl", "-s", "--max-time", "15"]


def _read_key() -> str:
    try:
        for line in ENV_FILE.open(encoding="utf-8"):
            line = line.strip()
            if line.startswith("DEEPSEEK_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    except OSError:
        pass
    return ""


def _balance() -> dict | None:
    key = _read_key()
    if not key:
        return None
    r = subprocess.run(
        CURL + ["-H", f"Authorization: Bearer {key}", "https://api.deepseek.com/user/balance"],
        capture_output=True, text=True, timeout=20)
    try:
        j = json.loads(r.stdout)
        bi = j["balance_infos"][0]
        return {
            "total": round(float(bi["total_balance"]), 2),
            "available": bool(j.get("is_available")),
            "currency": bi.get("currency", "CNY"),
        }
    except Exception:
        return None


def _today_usage() -> dict:
    now = datetime.datetime.now(TZ8)
    t0 = int(datetime.datetime(now.year, now.month, now.day, tzinfo=TZ8).timestamp())
    sql = ("SELECT model, ROUND(SUM(estimated_cost_usd),4), SUM(input_tokens), "
           "SUM(output_tokens), SUM(cache_read_tokens), SUM(api_call_count) "
           f"FROM session_model_usage WHERE last_seen >= {t0} GROUP BY model ORDER BY 2 DESC;")
    try:
        r = subprocess.run([SQLITE, f"file:{DB}?mode=ro", sql],
                           capture_output=True, text=True, timeout=10)
    except Exception:
        return {"usd": 0.0, "models": [], "rows": []}
    total, models, rows = 0.0, [], []
    for ln in r.stdout.strip().splitlines():
        p = ln.split("|")
        if len(p) < 6:
            continue
        try:
            usd = float(p[1] or 0)
        except ValueError:
            continue
        total += usd
        rows.append({"model": p[0], "usd": usd,
                     "tin": int(p[2] or 0), "tout": int(p[3] or 0),
                     "tcache": int(p[4] or 0), "calls": int(p[5] or 0)})
        if usd > 0:
            models.append(p[0])
    return {"usd": round(total, 4), "models": models, "rows": rows}


def _fx() -> float | None:
    for url in ["https://open.er-api.com/v6/latest/USD",
                "https://api.exchangerate-api.com/v4/latest/USD"]:
        try:
            r = subprocess.run(CURL + [url], capture_output=True, text=True, timeout=12)
            rate = json.loads(r.stdout).get("rates", {}).get("CNY")
            if rate:
                return float(rate)
        except Exception:
            continue
    return None


def _is_peak() -> bool:
    now = datetime.datetime.now(TZ8)
    if now.weekday() >= 5:
        return False
    t = now.hour + now.minute / 60
    return (9 <= t < 12) or (14 <= t < 18)


@router.get("/balance")
def get_balance() -> dict:
    """状态栏 pill 用的轻量快照：余额 + 今日开销 + 峰谷。"""
    bal = _balance()
    usage = _today_usage()
    rate = _fx()
    est_cny = round(usage["usd"] * rate, 2) if rate else None
    return {
        "ok": bal is not None,
        "total": bal["total"] if bal else None,
        "currency": bal["currency"] if bal else "CNY",
        "available": bal["available"] if bal else False,
        "today_usd": usage["usd"],
        "today_cny_est": est_cny,
        "rate": rate,
        "models": usage["models"],
        "rows": usage["rows"],
        "peak": _is_peak(),
        "updated": datetime.datetime.now(TZ8).strftime("%Y-%m-%d %H:%M"),
        "error": None if bal else "余额接口不可用（检查密钥/网络）",
    }
