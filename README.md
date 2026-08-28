# LUX — internal file transfer

Private tool: copy a file from one screen to another by showing QR codes. No Wi-Fi, no Bluetooth, no account.

This project is for internal use. Do not announce it. The public site is noindexed.

## Use it

1. On the **computer**, open [Send](https://brinza666.github.io/QRlux/s).
2. First QR is a setup code. Scan it with the phone’s normal camera — it opens **Receive**.
3. After a few seconds the big QR starts sending `lux-receive.apk` (or pick **Your file**).
4. On the **phone**, allow camera, pick the lens that sees the other screen (not macro / 3×), then start scan. Hold still.
5. When the file is ready, tap download once.

### Android apps

| App | Role |
| --- | --- |
| [lux-receive.apk](https://github.com/brinza666/QRlux/releases/download/v1.0.0/lux-receive.apk) | Catch a file |
| [lux-send.apk](https://github.com/brinza666/QRlux/releases/download/v1.0.0/lux-send.apk) | Broadcast from a phone screen |

Install one at a time. Android will warn about unknown apps — allow this browser, then Install. Uninstall the old copy before putting a new one on.

Keep the sending screen in the foreground and bright. If Receive looks zoomed or shows the floor, pick another lens before scanning.

Files up to 16 MB. There is no encryption — anyone who can see the screen can rebuild the file.

## Site

- [Start](https://brinza666.github.io/QRlux/)
- [Send](https://brinza666.github.io/QRlux/s) — `…/QRlux/s`
- [Receive](https://brinza666.github.io/QRlux/r) — `…/QRlux/r`
