import assert from "node:assert/strict";
import test from "node:test";

test("performance runner overrides inherited server and origin variables", async () => {
  let runner;
  try {
    runner = await import("../../scripts/performance-runner.mjs");
  } catch {
    assert.fail("performance runner must expose its child environment");
  }

  const env = runner.performanceEnvironment({
    HOST: "0.0.0.0",
    PORT: "9999",
    POVKH_SITE_ORIGIN: "https://wrong.example",
  });

  assert.equal(env.HOST, "127.0.0.1");
  assert.equal(env.PORT, "4322");
  assert.equal(env.POVKH_SITE_ORIGIN, "http://127.0.0.1:4322");
});
