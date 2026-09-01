#!/usr/bin/env python3
"""Write designed, no-JS GitHub Pages HTML. Send/Receive stay the single-file app."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
DOCS = ROOT / "docs"
BASE = "/QRlux"
GH = "https://github.com/brinza666/QRlux"
REL = f"{GH}/releases/download/v1.0.0"

MARK = """<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
      <rect x="2.2" y="2.2" width="7.6" height="7.6" stroke="currentColor" stroke-width="1.8"/>
      <rect x="14.2" y="2.2" width="7.6" height="7.6" stroke="currentColor" stroke-width="1.8"/>
      <rect x="2.2" y="14.2" width="7.6" height="7.6" stroke="currentColor" stroke-width="1.8"/>
      <rect x="15" y="15" width="6" height="6" fill="currentColor"/>
    </svg>"""

GH_ICON = """<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.7 4.6 18.7 4.9 18.7 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.9 1.2 3.2 0 4.7-2.8 5.7-5.5 6 .4.3.8 1.1.8 2.2V23c0 .3.2.7.8.6A12 12 0 0 0 12 .3z"/></svg>"""


def header(active: str) -> str:
    def item(key: str, href: str, label: str) -> str:
        on = ' class="on"' if key == active else ""
        return f'      <a href="{href}"{on}>{label}</a>'

    return f"""  <header class="top">
    <a class="brand" href="{BASE}/">{MARK}
      LUX
    </a>
    <nav>
{item("how", f"{BASE}/how/", "Use")}
{item("send", f"{BASE}/s/", "Send")}
{item("receive", f"{BASE}/r/", "Receive")}
{item("android", f"{BASE}/android/", "Android")}
      <a class="gh" href="{GH}" target="_blank" rel="noreferrer">{GH_ICON} GitHub</a>
    </nav>
  </header>"""


FOOT = f"""  <footer class="foot">
    <div class="foot-inner">
      <p class="mono">LUX · internal</p>
      <a href="{GH}">github.com/brinza666/QRlux</a>
    </div>
  </footer>"""


def page(title: str, active: str, body: str) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
  <meta name="theme-color" content="#09090b"/>
  <meta name="color-scheme" content="dark"/>
  <meta name="robots" content="noindex,nofollow,noarchive"/>
  <title>{title}</title>
  <link rel="icon" type="image/svg+xml" href="{BASE}/favicon.svg"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Sora:wght@400;500;600;700&display=swap"/>
  <link rel="stylesheet" href="{BASE}/lux.css"/>
</head>
<body>
<div class="wrap">
{header(active)}
  <main>
{body}
  </main>
{FOOT}
</div>
</body>
</html>
"""


HOME = """    <p class="kicker">Internal · air-gapped</p>
    <h1>Files, as light.</h1>
    <p class="lead">Point a phone at a computer screen. The file arrives as QR frames. No network between the two devices. For internal use only.</p>
    <div class="row">
      <a class="btn primary" href="{base}/s/">Send</a>
      <a class="btn" href="{base}/r/">Receive</a>
      <a class="btn" href="{base}/android/">Install APKs</a>
    </div>
    <section class="card">
      <p class="mono">Steps</p>
      <ol>
        <li>Computer opens Send. Phone opens Receive.</li>
        <li>Scan the first setup QR if Receive is not open yet.</li>
        <li>Hold the phone so the whole square is in view. Pick the lens that sees the other screen, not macro.</li>
        <li>Download once when the file is ready.</li>
      </ol>
    </section>""".format(base=BASE)

HOW = """    <p class="kicker">Internal use</p>
    <h1>How to use LUX</h1>
    <ol>
      <li><strong>Computer:</strong> open Send. Leave that tab in the foreground. The first QR is a setup code — scan it with the phone camera app if Receive is not open yet.</li>
      <li><strong>Phone:</strong> open Receive (installed app, or the Receive page). Allow the camera. Pick the rear lens that sees the other screen — not macro.</li>
      <li>Fill the phone finder with the glowing square. Hold still. Filename, pieces, and time left stay on screen.</li>
      <li>When it says the file is ready, tap download once. Install APKs from Downloads later.</li>
    </ol>
    <h2>If it will not lock</h2>
    <ul>
      <li>You should see the computer screen, not the floor. Switch lens if the view is wrong.</li>
      <li>Turn off Opera video pop-out / booster.</li>
      <li>Do not pinch-zoom the page. The plate is already full-window.</li>
      <li>Keep the sending screen bright. Fill the camera with the QR.</li>
    </ul>
    <p>Anyone who can see the sending screen can rebuild the file. Internal use only.</p>
    <div class="row">
      <a class="btn primary" href="{base}/s/">Send</a>
      <a class="btn" href="{base}/r/">Receive</a>
      <a class="btn" href="{gh}">GitHub</a>
    </div>""".format(base=BASE, gh=GH)

ANDROID = f"""    <p class="kicker">Internal · Android</p>
    <h1>Two small installers</h1>
    <p class="lead">Receive on the phone that catches files. Send on the phone that broadcasts. Download one APK at a time. Uninstall the old copy first.</p>
    <section class="card">
      <p class="mono">As light</p>
      <h2>PC screen → phone browser</h2>
      <ol>
        <li>On the computer, open Send. It starts with a setup QR, then the Receive APK.</li>
        <li>On the phone, open Receive. Allow camera, pick the lens that sees the other screen, hold still.</li>
        <li>When it finishes, tap Download once. Install later from Downloads.</li>
      </ol>
      <div class="row">
        <a class="btn primary" href="{BASE}/s/">Open Send</a>
        <a class="btn" href="{BASE}/r/">Receive</a>
      </div>
    </section>
    <div class="grid two">
      <article class="card">
        <p class="mono">Send</p>
        <h2>LUX Send</h2>
        <p>Broadcast a file from the phone screen.</p>
        <div class="row"><a class="btn primary full" href="{REL}/lux-send.apk">lux-send.apk</a></div>
      </article>
      <article class="card">
        <p class="mono">Receive</p>
        <h2>LUX Receive</h2>
        <p>Camera decoder. Save reconstructed files to Downloads.</p>
        <div class="row"><a class="btn primary full" href="{REL}/lux-receive.apk">lux-receive.apk</a></div>
      </article>
    </div>
    <p>Source: <a class="fg" href="{GH}">github.com/brinza666/QRlux</a>. Copies also in <a class="fg" href="{BASE}/releases/">/releases</a>.</p>"""

NOT_FOUND = f"""    <p class="kicker">Missing</p>
    <h1>This page is not here.</h1>
    <p class="lead">The designed LUX pages live on a short list of URLs.</p>
    <div class="row">
      <a class="btn primary" href="{BASE}/">Home</a>
      <a class="btn" href="{BASE}/how/">How to use</a>
      <a class="btn" href="{GH}">GitHub</a>
    </div>"""

GO = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="noindex,nofollow"/>
  <meta http-equiv="refresh" content="0;url={BASE}/r/"/>
  <title>LUX Receive</title>
  <script>location.replace("{BASE}/r/");</script>
  <link rel="stylesheet" href="{BASE}/lux.css"/>
</head>
<body>
<div class="wrap">
{header("receive")}
  <main>
    <p class="kicker">LUX</p>
    <h1>Opening Receive…</h1>
    <div class="row">
      <a class="btn primary" href="{BASE}/r/">Continue</a>
      <a class="btn" href="{GH}">GitHub</a>
    </div>
  </main>
{FOOT}
</div>
</body>
</html>
"""


def write(rel: str, text: str) -> None:
    path = DOCS / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print("wrote", path.relative_to(ROOT))


def main() -> None:
    DOCS.mkdir(exist_ok=True)
    css = (SITE / "lux.css").read_text(encoding="utf-8")
    (DOCS / "lux.css").write_text(css, encoding="utf-8")
    fav = ROOT / "public" / "favicon.svg"
    if fav.exists():
        (DOCS / "favicon.svg").write_bytes(fav.read_bytes())
    write("index.html", page("LUX", "home", HOME))
    write("how/index.html", page("How to use LUX", "how", HOW))
    write("android/index.html", page("LUX Android", "android", ANDROID))
    write("404.html", page("LUX", "home", NOT_FOUND))
    write("go.html", GO)
    (DOCS / ".nojekyll").write_text("", encoding="utf-8")
    (DOCS / "robots.txt").write_text("User-agent: *\nDisallow: /\n", encoding="utf-8")


if __name__ == "__main__":
    main()
