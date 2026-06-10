#!/usr/bin/env python3
"""
atp_scraper.py — Estrae i dati punto-per-punto dalle pagine Stats Centre di ATP Tour.

Uso: python scripts/atp_scraper.py <URL>
Esempio:
  python scripts/atp_scraper.py "https://www.atptour.com/en/scores/stats-centre/archive/2026/416/ms093"

Output:
  atp_pbp_{slug}.json       — 195+ punti con set/game/score/server/result/speed/rally
  atp_complete_{slug}.json  — PBP + stats + meta completo

Richiede:
    pip install playwright pycryptodome
    playwright install chromium
"""

import asyncio
import base64
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("Installa playwright: pip install playwright && playwright install chromium")
    sys.exit(1)

try:
    from Crypto.Cipher import AES
    from Crypto.Util.Padding import unpad
    HAS_CRYPTO = True
except ImportError:
    print("⚠ pycryptodome non installato — decrittazione Infosys disabilitata")
    print("  pip install pycryptodome")
    HAS_CRYPTO = False


# ── Algoritmo di key-derivation Infosys (da main.js bundle) ──────────────────
# Ingegnerizzazione inversa da itp-atp-sls.infosys-platforms.com/itp/prod/atp/match-centre/main.js
# Funzione modulo 326: const s = e => { const t = (e => { ... "#" + i + "$" })(new Date(e.lastModified)) ... }
#   - key = "#" + derive(lastModified) + "$"  (16 bytes → AES-128)
#   - iv  = key.toUpperCase()
#   - mode = AES-CBC, padding = PKCS7

def _base_n(num: int, base: int) -> str:
    if num == 0:
        return "0"
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    r = ""
    while num > 0:
        r = chars[num % base] + r
        num //= base
    return r


def derive_infosys_key(last_modified_ms: int, tz_offset_minutes: int = 0) -> str:
    """
    Deriva la chiave AES-128 dal campo lastModified dell'API Infosys ATP.
    tz_offset_minutes = getTimezoneOffset() JS (0 per UTC, -120 per UTC+2, ecc.)
    In prod l'encryption server usa UTC (tz=0).
    """
    adjusted = last_modified_ms + 60 * tz_offset_minutes * 1000
    dt = datetime.fromtimestamp(adjusted / 1000, tz=timezone.utc)
    a = dt.day
    r = int(f"{a:02d}"[::-1])
    n = dt.year
    s = int(str(n)[::-1])
    ts_as_hex_int = int(str(int(last_modified_ms)), 16)
    i = _base_n(ts_as_hex_int, 36) + _base_n((n + s) * (a + r), 24)
    o = len(i)
    if o < 14:
        i += "0" * (14 - o)
    elif o > 14:
        i = i[:14]
    return "#" + i + "$"


def decrypt_infosys(response_b64: str, last_modified_ms: int) -> dict | list | None:
    """Decripta il campo 'response' dei payload Infosys ATP. Ritorna il JSON parsed."""
    if not HAS_CRYPTO:
        return None
    key_str = derive_infosys_key(last_modified_ms, tz_offset_minutes=0)
    key = key_str.encode("utf-8")
    iv = key_str.upper().encode("utf-8")
    ct = base64.b64decode(response_b64)
    try:
        cipher = AES.new(key, AES.MODE_CBC, iv)
        plain = unpad(cipher.decrypt(ct), AES.block_size).decode("utf-8")
        return json.loads(plain)
    except Exception as e:
        return None


# ── Infosys endpoint URLs ──────────────────────────────────────────────────────
def infosys_urls(year: str, event_id: str, match_id: str) -> dict[str, str]:
    mid = match_id.upper()
    base = "https://itp-atp-sls.infosys-platforms.com"
    return {
        "match_beats": f"{base}/prod/api/match-beats/data/year/{year}/eventId/{event_id}/matchId/{mid}",
        "keystats":    f"{base}/static/prod/stats-plus/{year}/{event_id}/{mid}/keystats.json",
        "rally":       f"{base}/static/prod/rally-analysis/{year}/{event_id}/{mid}/data.json",
        "strokes":     f"{base}/static/prod/stroke-analysis/v2/{year}/{event_id}/{mid}/data.json",
        "insights":    f"{base}/static/prod/insights/{year}/{event_id}/{mid}/data.json",
        "courtvision": f"{base}/static/prod/court-vision/{year}/{event_id}/{mid}/data.json",
    }


def hawkeye_url(year: str, event_id: str, match_id: str) -> str:
    mid = match_id.upper()
    return f"https://www.atptour.com/-/Hawkeye/MatchStats/Complete/{year}/{event_id}/{mid}"


# ── Main scraper ──────────────────────────────────────────────────────────────
def slugify(url: str) -> str:
    parts = urlparse(url).path.strip("/").split("/")
    return "_".join(parts[-3:]) if len(parts) >= 3 else "atp_match"


async def scrape(url: str) -> dict:
    parsed_url = urlparse(url)
    path_parts = parsed_url.path.strip("/").split("/")
    try:
        arch_idx = path_parts.index("archive")
        year     = path_parts[arch_idx + 1]
        event_id = path_parts[arch_idx + 2]
        match_id = path_parts[arch_idx + 3]
    except (ValueError, IndexError):
        year = event_id = match_id = None

    infosys = infosys_urls(year, event_id, match_id) if year else {}
    hawk_url = hawkeye_url(year, event_id, match_id) if year else None

    decrypted: dict[str, dict | list] = {}

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        ctx = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="en-US",
            viewport={"width": 1440, "height": 900},
        )
        page = await ctx.new_page()
        await page.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', { get: () => undefined });"
        )

        print(f"Apertura: {url}")
        await page.goto(url, wait_until="load", timeout=90_000)
        print("  Attesa caricamento (15s)…")
        await page.wait_for_timeout(15_000)

        # Rimuovi overlay cookie OneTrust
        await page.evaluate("""() => {
            const s = document.getElementById('onetrust-consent-sdk');
            if (s) s.remove();
            document.body.style.overflow = '';
        }""")
        await page.wait_for_timeout(1_000)

        # ── Hawkeye (plaintext — set-level stats) ──────────────────────────────
        hawkeye_data = None
        if hawk_url:
            try:
                resp = await page.evaluate(f"""async () => {{
                    const r = await fetch("{hawk_url}");
                    if (!r.ok) return null;
                    return await r.json();
                }}""")
                if resp:
                    hawkeye_data = resp
                    print(f"  ✓ Hawkeye: {list(resp.keys())[:4]}")
            except Exception as e:
                print(f"  ✗ Hawkeye: {e}")

        # ── Infosys (cifrati → decifra) ────────────────────────────────────────
        for key_name, ep_url in infosys.items():
            try:
                resp = await page.evaluate(f"""async () => {{
                    const r = await fetch("{ep_url}");
                    if (!r.ok) return null;
                    const j = await r.json();
                    return {{ lastModified: j.lastModified, response: j.response }};
                }}""")
                if resp and resp.get("response"):
                    plain = decrypt_infosys(resp["response"], resp["lastModified"])
                    if plain is not None:
                        decrypted[key_name] = plain
                        n = len(plain) if isinstance(plain, list) else "dict"
                        print(f"  ✓ {key_name}: decifrato ({n})")
                    else:
                        print(f"  ✗ {key_name}: decryption fallita")
                else:
                    print(f"  ✗ {key_name}: 404 o null")
            except Exception as e:
                print(f"  ✗ {key_name}: {str(e)[:80]}")

        # ── DOM — stats visibili ───────────────────────────────────────────────
        dom_stats = await page.evaluate("""() => {
            const root = document.getElementById('InfosysMatchCenter');
            return root ? root.innerText.slice(0, 30000) : '';
        }""")

        await browser.close()

    return {
        "url": url,
        "year": year,
        "event_id": event_id,
        "match_id": match_id,
        "hawkeye": hawkeye_data,
        "infosys": decrypted,
        "dom_stats_text": dom_stats,
    }


def extract_pbp(match_beats_data: dict) -> list[dict]:
    """Estrae lista piatta dei punti dal JSON match-beats decifrato."""
    pd = match_beats_data.get("playerData", {})
    p1 = pd.get("tm1Ply1Name", "P1")
    p2 = pd.get("tm2Ply1Name", "P2")

    points = []
    for setd in match_beats_data.get("setData", []):
        set_num = setd["set"]
        for gamed in setd.get("gameData", []):
            for pt in gamed.get("pointData", []):
                server = int(pt.get("server", "1"))
                scorer = int(pt.get("scorer", "1"))
                points.append({
                    "set":           set_num,
                    "game":          gamed["game"],
                    "point":         pt.get("point"),
                    "pointId":       pt.get("pointId", ""),
                    "server":        server,
                    "serverName":    p1 if server == 1 else p2,
                    "scorer":        scorer,
                    "scorerName":    p1 if scorer == 1 else p2,
                    "p1Won":         scorer == 1,
                    "serve":         pt.get("serve"),       # 1=first, 2=second
                    "result":        pt.get("result"),      # A/DF/W/UE/FE
                    "stroke":        pt.get("stroke"),      # shot type
                    "hand":          pt.get("hand"),
                    "serveSpeed":    pt.get("serveSpeed"),
                    "faultServeSpd": pt.get("faultSrvSpd"),
                    "rallyCount":    pt.get("tm1Rally"),
                    "isBrkPt":       pt.get("isBrkPt", False),
                    "isCrucialPt":   pt.get("isCrucialPt", False),
                    "tm1GameScore":  pt.get("tm1GameScore", ""),
                    "tm2GameScore":  pt.get("tm2GameScore", ""),
                    "isTieBreak":    gamed.get("isTieBreak", False),
                    "tm1SetScore":   gamed.get("tm1SetScore"),
                    "tm2SetScore":   gamed.get("tm2SetScore"),
                    "momentumP1":    gamed.get("momentumScoreTeam1"),
                    "momentumP2":    gamed.get("momentumScoreTeam2"),
                })
    return points


async def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    url  = sys.argv[1]
    slug = slugify(url)

    print("=== ATP Tour Scraper + Infosys Decrypt ===")
    print(f"URL: {url}\n")

    raw = await scrape(url)

    # ── Estrai PBP ─────────────────────────────────────────────────────────────
    mb = raw["infosys"].get("match_beats")
    points = extract_pbp(mb) if mb else []

    # ── Output PBP ─────────────────────────────────────────────────────────────
    if points:
        pbp_path = Path(f"atp_pbp_{slug}.json")
        pbp_data = {
            "match_id": raw.get("match_id", slug),
            "event_id": raw.get("event_id"),
            "year": raw.get("year"),
            "player1": mb["playerData"].get("tm1Ply1Name"),
            "player2": mb["playerData"].get("tm2Ply1Name"),
            "winner": mb.get("matchWinner"),
            "total_points": len(points),
            "points": points,
        }
        pbp_path.write_text(json.dumps(pbp_data, indent=2, ensure_ascii=False))
        print(f"\n✓ PBP salvato: {pbp_path} ({len(points)} punti)")

        # Preview
        from collections import Counter
        res_dist = Counter(p["result"] for p in points)
        print(f"  Distribuzione risultati: {dict(res_dist)}")
        p1_pts = sum(1 for p in points if p["p1Won"])
        p2_pts = len(points) - p1_pts
        print(f"  Punti: P1={p1_pts}, P2={p2_pts}")
        print("\n  Ultimi 5 punti:")
        for p in points[-5:]:
            srv = "1st" if p["serve"] == 1 else "2nd"
            print(f"    S{p['set']}G{p['game']}P{p['point']} | "
                  f"server={p['serverName'][:10]:10} | "
                  f"{srv} {p['serveSpeed']}kmh | "
                  f"result={p['result']:3} | rally={p['rallyCount']} | "
                  f"winner={p['scorerName'][:12]}")
    else:
        print("\n⚠ Nessun punto estratto — match-beats non disponibile o non decifrato")
        if raw["dom_stats_text"]:
            print("\nDOM stats (anteprima):")
            print(raw["dom_stats_text"][:1000])

    # ── Output completo (tutti i dati) ─────────────────────────────────────────
    complete_path = Path(f"atp_complete_{slug}.json")
    complete_path.write_text(
        json.dumps({k: v for k, v in raw.items() if k != "dom_stats_text"},
                   indent=2, ensure_ascii=False, default=str)
    )
    print(f"\n✓ Dataset completo: {complete_path} ({complete_path.stat().st_size:,} bytes)")
    print(f"  Endpoint Infosys decifrati: {list(raw['infosys'].keys())}")


if __name__ == "__main__":
    asyncio.run(main())
