import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { chooseBlockSize, frameLength, packHeader, unpackFrame, Transmitter } from "./codec.ts";
import {
  encodeFrameQr,
  FOUNTAIN_MAX_VERSION,
  bytesToB64,
  b64ToBytes,
  parseQrText,
  qrVersionForBytes,
} from "./qr.ts";

describe("scannable fountain frames", () => {
  it("keeps a 150 KB APK at a phone-scannable QR version", () => {
    const bs = chooseBlockSize(150_000);
    const frame = frameLength(bs);
    const version = qrVersionForBytes(bytesToB64(new Uint8Array(frame)).length);
    assert.ok(version <= FOUNTAIN_MAX_VERSION, `version ${version} block ${bs} frame ${frame}`);
    assert.ok(bs <= 320, `block ${bs} is too fat for a phone camera`);
  });

  it("round-trips a header through base64 the way a QR would", async () => {
    const tx = await Transmitter.fromFile({
      filename: "lux-receive.apk",
      mime: "application/vnd.android.package-archive",
      bytes: new Uint8Array(12_000).map((_, i) => i & 0xff),
    });
    const packed = packHeader(tx.header);
    const qr = encodeFrameQr(packed);
    assert.ok(qr.version <= FOUNTAIN_MAX_VERSION, `header QR v${qr.version}`);
    const back = parseQrText(qr.text);
    assert.ok(back);
    const unpacked = unpackFrame(back!);
    assert.equal(unpacked?.kind, "header");
    if (unpacked?.kind === "header") {
      assert.equal(unpacked.header.filename, "lux-receive.apk");
      assert.equal(unpacked.header.k, tx.header.k);
    }
  });

  it("base64 of a symbol frame still fits the pinned QR version", async () => {
    const tx = await Transmitter.fromFile({
      filename: "note.txt",
      mime: "text/plain",
      bytes: new Uint8Array(150_000).map((_, i) => (i * 13) & 0xff),
    });
    const symbol = tx.symbolAt(0);
    const qr = encodeFrameQr(symbol, qrVersionForBytes(bytesToB64(tx.headerBytes()).length));
    assert.ok(qr.version <= FOUNTAIN_MAX_VERSION, `symbol QR v${qr.version}`);
    const round = b64ToBytes(qr.text);
    assert.deepEqual(round, symbol);
  });
});
