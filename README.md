# LUX — optical file transfer

LUX copies a file from one screen to another with a fountain of QR codes. The transfer itself does not need Wi-Fi, Bluetooth, an account, or a direct network connection between the devices.

This project is for internal use. The public helper site is noindexed.

## Web apps

- **Send:** https://brinza666.github.io/QRlux/s
- **Receive:** https://brinza666.github.io/QRlux/r
- **Start / documentation:** https://brinza666.github.io/QRlux/

The same transfer engine is used by the web apps and Android builds.

## Send a file

1. Open **Send** on the computer or sending device.
2. Scan the setup QR with the receiving phone if Receive is not already open.
3. Pick **Your file**, **Receive APK**, or **Send APK**, then start the fountain.
4. Keep the sender in the foreground and keep screen brightness reasonably high.
5. On Receive, allow camera access, choose the rear lens that shows the whole sending screen, then start scanning.
6. When reconstruction completes, save the received file.

### QR sizing

The sender constrains the QR plate by both viewport width and the usable viewport height. This keeps the complete QR, including its quiet zone, visible on mobile browsers with large address/tab bars instead of allowing the bottom or sides to be clipped.

### Camera / zoom handling

Android browsers can expose macro, telephoto, ultra-wide, and main cameras as separate video inputs. Receive therefore lists the available lenses and prefers the main rear camera. It also requests optical **1×** zoom when the browser exposes zoom controls. If the preview is still cropped, choose another rear lens before scanning.

## Transfer tuning

Current fresh-install defaults are tuned for higher throughput while retaining a camera-friendly QR density:

| Setting | Default |
| --- | ---: |
| Display rate | 16 fps |
| Hold each QR | 1× |
| Header interval | every 5 frames |
| Echo / resend | 8% |
| QR density | Balanced |

Compared with the previous 10 fps / 2× hold defaults, the sender can present substantially more unique fountain symbols per second. Actual end-to-end speed still depends on QR encoding cost, display refresh, camera exposure/focus, browser decoding performance, and device distance.

The Receive fallback decoder also reduces its working resolution after it has locked onto a LUX stream and stops trying inverted QR detection on every locked frame. Browsers with native `BarcodeDetector` continue to use the native decoder first.

If a camera cannot keep up, lower **Display fps**, increase **Hold each QR**, or switch **QR density** to **Easy scan** in Advanced settings.

## Android apps

| App | Role |
| --- | --- |
| [lux-receive.apk](https://github.com/brinza666/QRlux/releases/download/v1.0.0/lux-receive.apk) | Receive and reconstruct a file |
| [lux-send.apk](https://github.com/brinza666/QRlux/releases/download/v1.0.0/lux-send.apk) | Broadcast a file from an Android screen |

Android may require permission to install an APK from the browser or file manager used to open it.

## Build / deploy

Useful commands:

```sh
npm ci
npm test
npm run typecheck
npm run build:mobile
npm run build:pages
npm run build:apks
```

GitHub Pages is deployed from `.github/workflows/pages.yml`. A push to `main` rebuilds the mobile single-file app, stages it as `/s`, `/r`, `/send`, and `/receive`, and deploys the generated `docs` artifact.

## Links

- [Start](https://brinza666.github.io/QRlux/)
- [How it works](https://brinza666.github.io/QRlux/how)
- [Send](https://brinza666.github.io/QRlux/s)
- [Receive](https://brinza666.github.io/QRlux/r)
- [Source](https://github.com/brinza666/QRlux)
