// Downloads the official Hajin Tac-Map tiles (zoom 0-4, 256px) into public/tiles/{z}/{x}/{y}.png.
// Run once with:  npm run tiles
// Skips tiles that already exist, so it is safe to re-run. Map imagery © Activision.
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://www.callofduty.com/cdn/blog/guides/maps/mw4/dmz/hajin/baselayer/v1/tiles';
const OUT = path.resolve('public/tiles');
const MAX_ZOOM = 4;
const CONCURRENCY = 8;

const jobs = [];
for (let z = 0; z <= MAX_ZOOM; z++) {
  const n = 2 ** z;
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) jobs.push({ z, x, y });
}

const exists = (p) => access(p).then(() => true, () => false);
let done = 0, skipped = 0, failed = 0;

async function worker() {
  while (jobs.length) {
    const { z, x, y } = jobs.shift();
    const file = path.join(OUT, String(z), String(x), `${y}.png`);
    if (await exists(file)) { skipped++; continue; }
    try {
      const res = await fetch(`${BASE}/${z}/${x}/${y}.png`);
      if (res.status === 404) { skipped++; continue; } // edge tiles that don't exist
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
      done++;
    } catch (err) {
      failed++;
      console.error(`✗ ${z}/${x}/${y}: ${err.message}`);
    }
  }
}

const total = jobs.length;
console.log(`Fetching ${total} Hajin tiles into ${OUT} ...`);
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`Done: ${done} downloaded, ${skipped} skipped, ${failed} failed.`);
if (failed) process.exitCode = 1;
