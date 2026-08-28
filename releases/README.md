# LUX Android APKs

Sideload these on two phones. They are stored in this folder so you can open the GitHub repo on the phone and download them later — no Play Store.

| APK | Package | Role |
| --- | --- | --- |
| [lux-send.apk](lux-send.apk) | `app.lux.send` | Broadcast a file as a QR fountain |
| [lux-receive.apk](lux-receive.apk) | `app.lux.receive` | Point the camera, rebuild, save to Downloads |

Direct links (open on the phone):

- https://github.com/brinza666/QRlux/raw/main/releases/lux-send.apk
- https://github.com/brinza666/QRlux/raw/main/releases/lux-receive.apk

## Install

1. Download the APK in Chrome.
2. If Android blocks it, tap **Settings** on the warning and allow the browser to install unknown apps.
3. Open the file and tap **Install**.
4. On Receive, allow the camera.

Signed with the repo debug keystore (`android/app/debug.keystore`) so later rebuilds can update in place. Hashes: [SHA256SUMS](SHA256SUMS).

Rebuild: `npm run build:apks`
