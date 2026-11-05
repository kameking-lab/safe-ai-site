// Use the existing pinned sharp dependency; no new Python/CI installation.
import sharp from "sharp";
import { pathToFileURL } from "node:url";

async function sample(path, width, height) {
  const image = sharp(path);
  const metadata = await image.metadata();
  if (metadata.width !== width || metadata.height !== height) {
    throw new Error(`Unexpected dimensions ${metadata.width}x${metadata.height}; expected ${width}x${height}`);
  }
  // Exclude status bar, home indicator and edge chrome. A status bar or a
  // spinner on an otherwise white WebView must not count as content.
  const left = Math.floor(width * 0.05), top = Math.floor(height * 0.12);
  const { data, info } = await image.flatten({ background: "#ffffff" })
    .extract({ left, top, width: width - 2 * left, height: Math.floor(height * 0.78) })
    .resize(240, 480, { fit: "fill" }).removeAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
  const luminance = [], tiles = Array(24).fill(0), histogram = new Map();
  let sum = 0, squares = 0, ink = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const value = (r + g + b) / 3;
      luminance.push(value); sum += value; squares += value * value;
      const bucket = `${r >> 4},${g >> 4},${b >> 4}`;
      histogram.set(bucket, (histogram.get(bucket) ?? 0) + 1);
      if (value < 190) {
        ink++;
        tiles[Math.floor(y / 80) * 4 + Math.floor(x / 60)]++;
      }
    }
  }
  const count = luminance.length, occupied = tiles.map(n => n / (60 * 80) >= 0.01);
  const stats = {
    width, height, inkFraction: ink / count,
    stddev: Math.sqrt(Math.max(0, squares / count - (sum / count) ** 2)),
    dominantFraction: Math.max(...histogram.values()) / count,
    occupiedTiles: occupied.filter(Boolean).length,
    occupiedRows: Array.from({ length: 6 }, (_, y) => occupied.slice(y * 4, y * 4 + 4).some(Boolean)).filter(Boolean).length,
  };
  // Tablet layouts can show a genuine single card in a narrow left column.
  // Still require ink/contrast and content across three vertical regions;
  // a blank page, status bar, central spinner or skeleton cannot qualify.
  const tablet = width / height >= 0.7;
  const minimumTiles = tablet ? 3 : 6, minimumInk = tablet ? 0.004 : 0.008;
  stats.accepted = stats.inkFraction >= minimumInk && stats.stddev >= 8 && stats.dominantFraction < 0.985
    && stats.occupiedTiles >= minimumTiles && stats.occupiedRows >= 3;
  return { stats, luminance };
}

export async function checkImages(path, width, height, second) {
  const first = await sample(path, width, height);
  const result = { accepted: first.stats.accepted, first: first.stats };
  if (second) {
    const final = await sample(second, width, height);
    let difference = 0, changed = 0;
    for (let i = 0; i < first.luminance.length; i++) {
      const delta = Math.abs(first.luminance[i] - final.luminance[i]);
      difference += delta;
      if (delta > 20) changed++;
    }
    result.second = final.stats;
    result.meanDifference = difference / first.luminance.length;
    result.changedFraction = changed / first.luminance.length;
    result.accepted &&= final.stats.accepted && result.meanDifference <= 2 && result.changedFraction <= 0.01;
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [path, width, height, second] = process.argv.slice(2);
  console.log(JSON.stringify(await checkImages(path, Number(width), Number(height), second)));
}
