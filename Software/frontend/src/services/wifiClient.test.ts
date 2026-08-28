import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeHost, readingUrl, WIFI_DEFAULT_HOST } from "./wifiClient";
import { parseBlePayload } from "./bleParser";

describe("wifiClient", () => {
  it("builds a cleartext /reading URL on the SoftAP gateway", () => {
    assert.equal(readingUrl(WIFI_DEFAULT_HOST), "http://192.168.4.1/reading");
    assert.equal(readingUrl("http://192.168.4.1/foo"), "http://192.168.4.1/reading");
    assert.equal(normalizeHost(" 192.168.43.12 "), "192.168.43.12");
  });

  it("accepts a volume-only JSON packet with null BP", () => {
    const parsed = parseBlePayload(
      JSON.stringify({
        vol_ml: 340,
        rate_15: 40,
        hr: null,
        sbp: null,
        si: null,
        state: "monitor",
        batt: 80,
        seq: 3,
        sensor_fail: false,
      }),
    );
    assert.ok(parsed);
    assert.equal(parsed.reading.volumeMl, 340);
    assert.equal(parsed.reading.shockIndex, null);
    assert.equal(parsed.appEvaluatedState, "monitor");
  });
});
