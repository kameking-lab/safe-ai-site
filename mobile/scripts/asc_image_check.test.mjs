import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
import { checkImages } from "./asc_image_check.mjs";

test("rejects white, black, status-only, sparse loading and skeleton frames; accepts distributed settled UI", async t => {
  const directory = await mkdtemp(join(tmpdir(), "asc8-pixels-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const image = async (name, body, background = "white") => {
    const path = join(directory, name + ".png");
    await sharp(Buffer.from(`<svg width="600" height="1200"><rect width="600" height="1200" fill="${background}"/>${body}</svg>`)).png().toFile(path);
    return path;
  };
  const white = await image("white", ""), black = await image("black", "", "black");
  const status = await image("status", '<rect x="30" y="20" width="540" height="35"/>');
  const loading = await image("loading", '<circle cx="300" cy="600" r="16" fill="none" stroke="black" stroke-width="4"/><rect x="240" y="640" width="120" height="5"/>');
  const skeleton = await image("skeleton", '<rect x="50" y="260" width="500" height="650" rx="20" fill="#eee"/>');
  for (const path of [white, black, status, loading, skeleton]) {
    assert.equal((await checkImages(path, 600, 1200)).accepted, false, path);
  }
  const content = Array.from({ length: 15 }, (_, i) => `<rect x="70" y="${180 + i * 53}" width="${i % 2 ? 270 : 440}" height="12" fill="#333"/>`).join("");
  const ui = await image("ui", content);
  assert.equal((await checkImages(ui, 600, 1200, ui)).accepted, true);
  const changed = await image("changed", content + '<rect x="40" y="500" width="500" height="100" fill="black"/>');
  assert.equal((await checkImages(ui, 600, 1200, changed)).accepted, false);
  await assert.rejects(checkImages(ui, 601, 1200), /dimensions/);
  const invalid = join(directory, "corrupt.png");
  await writeFile(invalid, "not a PNG");
  await assert.rejects(checkImages(invalid, 600, 1200));
  const cli = spawnSync(process.execPath, [fileURLToPath(new URL("./asc_image_check.mjs", import.meta.url)), ui, "600", "1200", ui], { encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).accepted, true);
  const tablet = async (name, body) => {
    const path = join(directory, name + '.png');
    await sharp(Buffer.from(`<svg width="2064" height="2752"><rect width="2064" height="2752" fill="white"/>${body}</svg>`)).png().toFile(path);
    return path;
  };
  const column = Array.from({ length: 13 }, (_, i) => `<rect x="110" y="${400 + i * 90}" width="340" height="20" fill="#333"/>`).join('');
  const tabletUi = await tablet('tablet-column', column);
  assert.equal((await checkImages(tabletUi, 2064, 2752, tabletUi)).accepted, true);
  for (const [name, body] of [['blank', ''], ['status', '<rect x="50" y="20" width="1700" height="35"/>'],
    ['spinner', '<circle cx="1032" cy="1376" r="25" fill="none" stroke="black" stroke-width="6"/>'],
    ['skeleton', '<rect x="110" y="400" width="900" height="900" fill="#eee"/>']]) {
    assert.equal((await checkImages(await tablet(name, body), 2064, 2752)).accepted, false, name);
  }
});
