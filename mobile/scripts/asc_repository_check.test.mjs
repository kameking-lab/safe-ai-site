import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { checkRepository } from './asc_repository_check.mjs';

async function fixture(fn) {
  const root = await mkdtemp(path.join(tmpdir(), 'asc9-images-'));
  try {
    await mkdir(path.join(root, 'asc'));
    await mkdir(path.join(root, 'scripts'));
    await writeFile(path.join(root, 'scripts/asc_capture_windows.mjs'), 'capture fixture');
    await writeFile(path.join(root, 'native.html'), 'source fixture\n');
    await mkdir(path.join(root, 'fastlane/screenshots/ja'), { recursive: true });
    const image = path.join(root, 'fastlane/screenshots/ja/01-home-test.jpg');
    const manifestPath = path.join(root, 'fastlane/screenshots/manifest.json');
    const raw = Buffer.alloc(120 * 260 * 3);
    for (let y = 0; y < 260; y++) for (let x = 0; x < 120; x++) {
      const offset = (y * 120 + x) * 3;
      raw.fill((y % 30 < 8 && x % 30 < 20) ? 40 : 240, offset, offset + 3);
    }
    await sharp(raw, { raw: { width: 120, height: 260, channels: 3 } }).jpeg().toFile(image);
    await writeFile(path.join(root, 'asc/capture.json'), JSON.stringify({ devices: [{ slug: 'test', width: 120, height: 260 }], screens: ['01-home'] }));
    const manifest = { authentication: 'anonymous', quota_grants: 0,
      capture_script_sha256: createHash('sha256').update('capture fixture').digest('hex'),
      local_source_sha256: { 'native.html': createHash('sha256').update('source fixture\n').digest('hex') },
      images: [{ file: path.basename(image),
      sha256: createHash('sha256').update(await readFile(image)).digest('hex'),
      visual_review: { status: 'approved', reviewed_at: '2026-11-05T00:00:00Z', readable_japanese: true,
        no_loading: true, no_empty_ad_slot: true, no_personal_information: true } }] };
    const save = () => writeFile(manifestPath, JSON.stringify(manifest));
    await save();
    await fn({ root, image, manifest, save });
  } finally { await rm(root, { recursive: true, force: true }); }
}
test('fully decodes a reviewed nonblank set', () => fixture(async ({ root }) => checkRepository(root)));
test('rejects an image changed after review', () => fixture(async ({ root, image }) => {
  await writeFile(image, Buffer.from('changed'));
  await assert.rejects(checkRepository(root), /Hash mismatch/);
}));
test('rejects pending manual review', () => fixture(async ({ root, manifest, save }) => {
  manifest.images[0].visual_review.status = 'pending'; await save();
  await assert.rejects(checkRepository(root), /Manual visual review/);
}));
test('rejects stale captured application source', () => fixture(async ({ root }) => {
  await writeFile(path.join(root, 'native.html'), 'changed source');
  await assert.rejects(checkRepository(root), /Captured source changed/);
}));
test('accepts cross-platform source line endings', () => fixture(async ({ root }) => {
  await writeFile(path.join(root, 'native.html'), 'source fixture\r\n');
  await checkRepository(root);
}));
test('rejects a public asset changed since capture', () => fixture(async ({ root, manifest, save }) => {
  await writeFile(path.join(root, 'asset.png'), Buffer.from([0, 128, 255]));
  manifest.public_asset_sha256 = { 'asset.png': createHash('sha256').update(Buffer.from([0, 128, 255])).digest('hex') };
  await save();
  await checkRepository(root);
  await writeFile(path.join(root, 'asset.png'), Buffer.from([0, 129, 255]));
  await assert.rejects(checkRepository(root), /Captured asset changed/);
}));
test('rejects corrupted JPEG even when its hash is updated', () => fixture(async ({ root, image, manifest, save }) => {
  const bytes = (await readFile(image)).subarray(0, 350);
  await writeFile(image, bytes); manifest.images[0].sha256 = createHash('sha256').update(bytes).digest('hex'); await save();
  await assert.rejects(checkRepository(root));
}));
test('rejects a blank JPEG even when reviewed and correctly hashed', () => fixture(async ({ root, image, manifest, save }) => {
  const bytes = await sharp({ create: { width: 120, height: 260, channels: 3, background: '#fff' } }).jpeg().toBuffer();
  await writeFile(image, bytes); manifest.images[0].sha256 = createHash('sha256').update(bytes).digest('hex'); await save();
  await assert.rejects(checkRepository(root), /Blank image/);
}));
