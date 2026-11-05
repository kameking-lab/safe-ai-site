// Decode every committed image and require a hash-bound manual visual review.
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { checkImages } from './asc_image_check.mjs';

export async function checkRepository(root = fileURLToPath(new URL('../', import.meta.url))) {
  const config = JSON.parse(await readFile(path.join(root, 'asc/capture.json'), 'utf8'));
  const directory = path.join(root, 'fastlane/screenshots/ja');
  const manifest = JSON.parse(await readFile(path.join(directory, '../manifest.json'), 'utf8'));
  const expected = config.devices.flatMap(device => config.screens.map(screen => ({
    file: `${screen}-${device.slug}.jpg`, width: device.width, height: device.height,
  })));
  const names = (await readdir(directory)).sort();
  if (JSON.stringify(names) !== JSON.stringify(expected.map(e => e.file).sort())) throw new Error('Unexpected screenshot set');
  if (manifest.images?.length !== expected.length || new Set(manifest.images.map(e => e.file)).size !== expected.length) throw new Error('Invalid manifest image set');
  if (manifest.authentication !== 'anonymous' || manifest.quota_grants !== 0) throw new Error('Require anonymous quota-free provenance');
  if (!manifest.capture_script_sha256 || !manifest.local_source_sha256 || !Object.keys(manifest.local_source_sha256).length) throw new Error('Missing source provenance');
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  if (hash((await readFile(path.join(root, 'scripts/asc_capture_windows.mjs'), 'utf8')).replace(/\r\n/g, '\n')) !== manifest.capture_script_sha256) throw new Error('Capture script changed');
  for (const [file, digest] of Object.entries(manifest.local_source_sha256)) {
    if (hash((await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n')) !== digest) throw new Error(`Captured source changed: ${file}`);
  }
  for (const entry of expected) {
    const evidence = manifest.images.find(e => e.file === entry.file);
    const bytes = await readFile(path.join(directory, entry.file));
    if (evidence?.sha256 !== createHash('sha256').update(bytes).digest('hex')) throw new Error(`Hash mismatch: ${entry.file}`);
    const review = evidence.visual_review;
    if (review?.status !== 'approved' || !review.reviewed_at ||
      !['readable_japanese', 'no_loading', 'no_empty_ad_slot', 'no_personal_information'].every(key => review[key] === true)) {
      throw new Error(`Manual visual review required: ${entry.file}`);
    }
    const metadata = await sharp(bytes, { failOn: 'warning' }).metadata();
    if (metadata.format !== 'jpeg' || metadata.hasAlpha || metadata.width !== entry.width || metadata.height !== entry.height) throw new Error(`Wrong format/size: ${entry.file}`);
    // Full decode rejects corrupt images beyond the JPEG header.
    await sharp(bytes, { failOn: 'warning' }).raw().toBuffer();
    if (!(await checkImages(path.join(directory, entry.file), entry.width, entry.height)).accepted) throw new Error(`Blank image: ${entry.file}`);
  }
  console.log(`ASC repository screenshot decode, dimensions, SHA-256, content and visual-review validation PASS (${expected.length} images)`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await checkRepository();
