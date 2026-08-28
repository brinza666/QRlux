# LUX

Transfer files as light. One screen broadcasts a fountain of QR frames. A camera on another device drinks them until the file reconstitutes. No Wi-Fi, no Bluetooth, no pairing.

The clip this was built from is real: a sending phone paints QR codes at ~60 fps (~3 KB per frame), a second phone scans the blizzard, and the payload comes back — in that recording, 365 KB in 2.6 s (~140 KB/s). LUX is an original web take on the same idea (Luby Transform fountain codes + animated QR), not a clone of any native app.

## Run it

```bash
npm install
npm run dev
```

Then:

1. **Home** — live same-screen loopback. A JPEG is fountain-coded, painted as QR, and rebuilt in place.
2. **Send** — pick a file (or a built-in sample). Keep the QR plate on screen.
3. **Receive** — on a second device, grant camera, point at the sender. Start mid-stream if you want; fountain codes do not care which frames you catch.
4. **Android** — two sideload APKs (`lux-send.apk`, `lux-receive.apk`) live in [`releases/`](releases/README.md). Open that folder on the phone and download for later install.

`npm run typecheck` and `npm test` cover the TypeScript surface and the fountain round-trip. `npm run build:apks` rebuilds both Android packages.

## How it works

Ordinary QR slideshows die when the camera misses frame 7. A one-way optical link has no ACK, so you cannot ask for a retransmission.

LUX splits the file into **K** source blocks and emits an endless stream of **symbols**. Each symbol is the XOR of a random subset of blocks (degree drawn from a robust soliton, mixed with systematic degree-1 symbols so a peel cannot stall). The receiver needs slightly more than K *distinct* symbols, in any order, with drops. A peeling decoder XORs known blocks out of each symbol; when a symbol collapses to one unknown, that block is recovered and the ripple continues.

Header frames (filename, MIME, K, block size, SHA-256, gzip flag) are interleaved every few symbols. The file is offered only after the hash matches.

```
file → [gzip?] → K blocks → LT symbols → pack frame → QR → screen
camera → QR decode → unpack → peel → [gunzip?] → SHA-256 → file
```

Same-screen loopback feeds the decoder the **same bytes** painted into each QR (codec-accurate, fast). Two-device Receive is the real optical path (`BarcodeDetector` where it exists, `jsQR` otherwise).

There is **no encryption**. Anyone who can see the screen can capture the file. Treat it like holding up a document.

## Layout (where to change things)

| Want | File |
| --- | --- |
| Soliton / systematic mix / peeler | [`src/lib/lux/fountain.ts`](src/lib/lux/fountain.ts) |
| Frame format, gzip, hash, 512 KB cap | [`src/lib/lux/codec.ts`](src/lib/lux/codec.ts) |
| QR version, ECC, canvas draw | [`src/lib/lux/qr.ts`](src/lib/lux/qr.ts) |
| Built-in sample payloads | [`src/lib/lux/samples.ts`](src/lib/lux/samples.ts) |
| Stream FPS, demo / send UI | [`src/components/transfer-stage.tsx`](src/components/transfer-stage.tsx) |
| Camera receive | [`src/routes/receive.tsx`](src/routes/receive.tsx) |
| Phone send / receive shells | [`src/components/app-send.tsx`](src/components/app-send.tsx), [`src/components/app-receive.tsx`](src/components/app-receive.tsx) |
| Android WebView host | [`android/app/src/main/java/app/lux/MainActivity.java`](android/app/src/main/java/app/lux/MainActivity.java) |

Useful knobs:

- `TARGET_FPS` in `transfer-stage.tsx` — raise for brighter panels, lower if a phone overheats.
- `chooseBlockSize()` / `HEADER_PERIOD` in `codec.ts` — denser frames vs. easier camera lock.
- `symbolNeighbors()` in `fountain.ts` — currently even ESIs are systematic, then LT, then cycling degree-1. Swap this if you want a pure rateless stream.
- `MAX_FILE_BYTES` — default 512 KB so a browser tab stays honest.

## Frame layout

```
HEADER  magic "LUX\x01" | type=1 | gzip | k | blockSize | payloadSize | origSize | session | sha256 | name | mime
SYMBOL  magic "LUX\x01" | type=2 | esi | payload[blockSize]  (padded to frameLen)
```

QR payload is standard Base64 of that binary frame (byte mode via `uqr`).

## Browser vs native

Native phone-to-phone tests of this technique land around 140–200 KB/s (version-40 QR, ~2953 bytes/frame, 60 fps, a tuned decoder). This web build uses a smaller QR so `uqr` + `jsQR` stay smooth. Throughput is lower; the codec is the same family.

## Stack

TanStack Start, React 19, Tailwind v4, `uqr`, `jsQR`. Auth and database are unused — everything stays on-device.

## License

Apache License 2.0. See [LICENSE](LICENSE).
