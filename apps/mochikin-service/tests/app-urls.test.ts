import test from "node:test";
import assert from "node:assert/strict";
import { getAppTargetUrlFromEnv, updateAppTargetUrl, validateUrl } from "../src/lib/apps";

test("App URLs: fallback to environment or undefined when unset", () => {
  const url = getAppTargetUrlFromEnv("STOKIS");
  // If NEXT_PUBLIC_STOKIS_URL is configured in env, it returns string, otherwise undefined
  if (process.env.NEXT_PUBLIC_STOKIS_URL) {
    assert.equal(url, process.env.NEXT_PUBLIC_STOKIS_URL);
  } else {
    assert.equal(typeof url, "undefined");
  }
});

test("App URLs: rejects invalid URL format", async () => {
  await assert.rejects(
    async () => {
      await updateAppTargetUrl("STOKIS", "invalid-url-without-protocol");
    },
    {
      name: "TypeError",
    }
  );

  await assert.rejects(
    async () => {
      await updateAppTargetUrl("STOKIS", "ftp://example.com/stokis");
    },
    /Protokol URL harus diawali dengan http:\/\/ atau https:\/\//
  );

  assert.throws(
    () => validateUrl("https:/localhost:3001", "URL"),
    /format http:\/\/ atau https:\/\//i
  );
  assert.equal(validateUrl("http://localhost:3001", "URL").origin, "http://localhost:3001");
});
