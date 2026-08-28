# LUX recovery notes

Last public repair commit: `bc9ebf4` (black APK / tiny QR).
This pass: camera picker, same-size setup QR, native WebView, hold/echo frames.

```
git log --oneline -8
git revert HEAD
```

## What the screenshots showed

- Receive was looking at the **floor** (wrong lens / no picker). Opera also showed a second `<video>`.
- Setup QR was a small URL code; fountain QR was dense → camera re-zoomed.
- APK still pinch-zoomed like a webpage.
- 1–2 fps decode, 34 min ETA: each QR was only shown once at 16 fps; camera never froze a frame. Headers every 6 unique frames were easy to miss.

## Safe tweaks (do not change the wire format)

| Knob | Default | Effect |
| --- | --- | --- |
| Display fps | 12 | How fast the plate flips |
| Hold each QR | 3× | Repeat the same code so the camera can lock |
| Header every N | 3 | First 8 uniques are headers, then every N |
| Echo % | 18 | Randomly re-send earlier systematic pieces |
| Density | easy | Smaller modules vs fewer pieces |
| Setup-QR loop | off | Keep plate size stable |

Unsafe to change without a protocol bump: magic `LUX\x01`, ESI→neighbors, soliton, Base64 packing.

## Rebuild

```
npx vite build --config vite.mobile.config.ts
cp mobile-dist/index.html docs/app.html
sh scripts/build-apks.sh
```
