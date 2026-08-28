# LUX recovery and repair log

Use this if a change needs to be reverted or the next session has to pick up cold.

## Public URLs

- Landing: https://brinza666.github.io/QRlux/
- **PC Send (what people actually open):** https://brinza666.github.io/QRlux/app.html?mode=send
- Phone Receive: https://brinza666.github.io/QRlux/app.html?mode=receive
- Handshake (stock camera QR): https://brinza666.github.io/QRlux/go
- APKs: GitHub Releases `v1.0.0` and `/releases/*.apk`

GitHub Pages serves **`docs/` only**. The TanStack `/send` route is the live preview, not the public site. Fixes for the PC webpage must land in `mobile/App.tsx` + `AppSend` / `SendStudio`.

## Revert

```
git log --oneline -15
git revert HEAD          # last repair
git checkout <sha> -- path
```

Repo: `brinza666/QRlux`, branch `main`.

## Bugs this repair targeted (2026-08-28 photo)

1. **PC Send had no Receive-APK default / buttons.** Last UX pass hid samples; public send is `app.html`, which did not auto-arm `lux-receive.apk`.
2. **QR too small at 100% zoom.** Two-column / padded plate on a monitor with a browser sidebar. Needs cinema square ≈ `min(100vw, 100dvh − HUD)`.
3. **Hard 12–15 fps, no slider.** Adaptive encode + oversized QR version. Slider 8–36, live.
4. **No phone bootstrap.** Need a still URL QR (`/go`) that opens the Receive app (`lux://receive`) or the browser Receive page.
5. **APK = black screen.** `App.tsx` waits on `fetch(mode.json)` with `mode === null` rendering an empty `bg-bg` div. Android `file://` fetch can hang. Fix: load `index.html?mode=send|receive` from `BuildConfig`, never block UI.
6. **Receive “two videos”.** React Strict Mode unmounts before `getUserMedia` resolves, so the first stream is never stopped. Opera video pop-out also clones visible `<video>`. Fix: stream singleton + hidden video + canvas preview.
7. **Opera video optimisation.** Cannot be disabled from JS. Hide the `<video>` element and preview via canvas so Opera’s enhancer has nothing on-screen to hijack.
8. **Dense QR (block ≤ 1920)** made version-30 codes the phone cannot read from across a desk. Revert blocks to 360–720.

## File map

| Area | File |
| --- | --- |
| Public SPA shell | `mobile/App.tsx`, `mobile/main.tsx` |
| PC/phone send UI | `src/components/send-studio.tsx` |
| Receive camera | `src/components/receive-stage.tsx`, `src/lib/lux/scan.ts` |
| Fountain / size | `src/lib/lux/codec.ts` |
| FPS pump | `src/lib/lux/broadcast.ts` |
| Android WebView | `android/app/src/main/java/app/lux/MainActivity.java` |
| Receive deep link | `android/app/src/receive/AndroidManifest.xml` |
| Handshake page | `docs/go.html` |
| Pages landing | `docs/index.html` |

## Rebuild

```
npx vite build --config vite.mobile.config.ts
cp mobile-dist/index.html docs/app.html
sh scripts/build-apks.sh
# copy APKs into public/releases, docs/releases, gh release upload --clobber
```
