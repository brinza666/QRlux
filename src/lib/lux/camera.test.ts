import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickDefaultCamera, scoreCamera, type CameraInfo } from "./camera.ts";

function cam(id: string, label: string, facing: CameraInfo["facing"] = "unknown"): CameraInfo {
  return { id, label, facing };
}

describe("default lens", () => {
  it("never prefers macro over the main rear camera", () => {
    const cams = [
      cam("macro", "Back Macro Camera", "environment"),
      cam("main", "Back Camera", "environment"),
      cam("front", "Front Camera", "user"),
    ];
    assert.equal(pickDefaultCamera(cams), "main");
    assert.ok(scoreCamera(cams[1]!) > scoreCamera(cams[0]!));
  });

  it("treats plain wide as the main lens, not a skip", () => {
    const cams = [
      cam("uw", "Ultra-wide", "environment"),
      cam("wide", "Wide", "environment"),
      cam("macro", "Macro", "environment"),
    ];
    assert.equal(pickDefaultCamera(cams), "wide");
  });

  it("picks camera2 0 facing back over later back modules", () => {
    const cams = [
      cam("0", "camera2 0, facing back", "environment"),
      cam("2", "camera2 2, facing back", "environment"),
      cam("3", "camera2 3, facing back", "environment"),
      cam("1", "camera2 1, facing front", "user"),
    ];
    assert.equal(pickDefaultCamera(cams), "0");
  });

  it("never prefers a telephoto / 3x over the main wide", () => {
    const cams = [
      cam("tele", "Back Telephoto Camera 3x", "environment"),
      cam("wide", "Back Camera", "environment"),
      cam("macro", "Back Macro Camera", "environment"),
    ];
    assert.equal(pickDefaultCamera(cams), "wide");
    assert.ok(scoreCamera(cams[1]!) > scoreCamera(cams[0]!));
  });
});
