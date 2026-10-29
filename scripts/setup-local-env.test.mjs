import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setupLocalEnv } from "./setup-local-env.mjs";

function fixture(run) {
  const directory = mkdtempSync(join(tmpdir(), "momentum-env-"));
  try { run(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}

test("a fresh clone gets the browser and server public settings before Vite starts", () => {
  fixture((directory) => {
    const example = "SUPABASE_URL=https://example.test\nSUPABASE_PUBLISHABLE_KEY=public-test\nVITE_SUPABASE_URL=https://example.test\nVITE_SUPABASE_PUBLISHABLE_KEY=public-test\n";
    writeFileSync(join(directory, ".env.example"), example);
    assert.equal(setupLocalEnv(directory), "created");
    assert.equal(readFileSync(join(directory, ".env"), "utf8"), example);
  });
});

test("existing local settings are never overwritten", () => {
  fixture((directory) => {
    writeFileSync(join(directory, ".env"), "CUSTOM_SETTING=keep\n");
    writeFileSync(join(directory, ".env.example"), "CUSTOM_SETTING=replace\n");
    assert.equal(setupLocalEnv(directory), "existing");
    assert.equal(readFileSync(join(directory, ".env"), "utf8"), "CUSTOM_SETTING=keep\n");
  });
});

test("missing example stops setup rather than inventing a backend", () => {
  fixture((directory) => {
    assert.throws(() => setupLocalEnv(directory), /Lipsește .env.example/);
    assert.equal(existsSync(join(directory, ".env")), false);
  });
});