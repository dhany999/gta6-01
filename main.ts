// Solmar Bay — make.fun gta6-01 entry program.
// Copies game/ and screenshots/ from this repository into the output
// directory, then writes /output/dossier.json with the kit's buildDossier.
import { buildDossier } from './vendor/makefun-game.ts';
import { cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const root = new URL('.', import.meta.url).pathname;

await mkdir(out, { recursive: true });
await rm(join(out, 'game'), { recursive: true, force: true });
await rm(join(out, 'screenshots'), { recursive: true, force: true });
await cp(join(root, 'game'), join(out, 'game'), { recursive: true });
await cp(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });
const dossier = buildDossier(out, caps);
await writeFile(join(out, 'dossier.json'), dossier);
const gameFiles = await readdir(join(out, 'game'), { recursive: true });
const shots = await readdir(join(out, 'screenshots'));
console.log(`Solmar Bay entry written to ${out} (${gameFiles.length} game entries, ${shots.length} screenshots, dossier ${dossier.length} bytes)`);
