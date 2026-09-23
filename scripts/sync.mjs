// Copies the renderer modules from a checkout of the blog they come from
// (mejistus.github.io/assets/) into src/, then rebuilds dist/.
//
//   node scripts/sync.mjs [path/to/mejistus.github.io]   (default: ../mejistus.github.io)
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = resolve(root, process.argv[2] || '../mejistus.github.io');
const FILES = ['latex.js', 'tikz-nn.js', 'lint.js', 'bib.js'];

for (const f of FILES) {
  const from = join(site, 'assets', f);
  if (!existsSync(from)) { console.error(`not found: ${from}`); process.exit(1); }
  copyFileSync(from, join(root, 'src', f));
  console.log(`src/${f} ← ${from}`);
}
execFileSync(process.execPath, [join(root, 'scripts/build.mjs')], { stdio: 'inherit' });
