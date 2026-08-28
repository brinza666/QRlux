# LUX recovery notes

Last known good public commit before this repair pass: `1824eb2`
(GitHub `brinza666/QRlux`, branch `main`).

```
git log --oneline -5
git revert HEAD     # if you must undo the latest repair
```

## What the user actually opens

GitHub Pages only serves `docs/`:

| URL | File |
| --- | --- |
| https://brinza666.github.io/QRlux/ | `docs/index.html` |
| https://brinza666.github.io/QRlux/app.html?mode=send | `docs/app.html` ← **this is the PC sender** |
| https://brinza666.github.io/QRlux/app.html?mode=receive | same file, receive UI |
| APKs | `docs/releases/*.apk` + GitHub Release `v1.0.0` |

The TanStack routes `/send` and `/receive` are the Grok live preview. They are **not** what the phone/PC hits on GitHub. Fixes must land in `mobile/App.tsx` + `AppSend` / `ReceiveStage`, then `npm run build:apks` copies into `docs/app.html`.

## Bugs this pass repairs

1. **Black APK** — `App.tsx` waited on `fetch("./mode.json")` with no timeout. Android WebView `file://` fetch can hang → blank `bg-bg` screen, no permission UI. Fix: `?mode=` on `loadUrl`, `LuxAndroid.getMode()`, never hang.
2. **Send does not default to Receive APK** — APK sample buttons were removed; `armed` started false. Fix: default payload `lux-receive.apk`, auto-start after a handshake QR.
3. **QR too small at 100% zoom** — stats column + `max-w` ate the plate. Fix: cinema layout, QR uses the viewport.
4. **Hard 12/15 fps, no control** — encode cost + no slider. Fix: FPS slider 8–36, user target wins.
5. **Two cameras / Opera video tools** — `<video>` is treated as a movie by Opera (pop-out / booster) and StrictMode double-mounted `getUserMedia`. Fix: hidden 1×1 video, visible canvas preview, camera singleton, no StrictMode.
6. **Handshake** — first QR is a normal URL the phone camera app can scan: opens LUX Receive if installed, otherwise the receive webpage.

## Rebuild

```
npx vite build --config vite.mobile.config.ts
cp mobile-dist/index.html docs/app.html
sh scripts/build-apks.sh
# copy APKs to public/releases, docs/releases, gh release upload v1.0.0 --clobber
```
