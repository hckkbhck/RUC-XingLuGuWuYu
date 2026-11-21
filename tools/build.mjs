import { copyFile, cp, mkdir, readFile, writeFile } from 'node:fs/promises';

const base = new URL('../', import.meta.url);
const dist = new URL('dist/', base);
const read = path => readFile(new URL(path, base), 'utf8');

await mkdir(dist, { recursive: true });
await copyFile(new URL('index.html', base), new URL('index.html', dist));
for (const folder of ['src/', 'vendor/']) {
  await cp(new URL(folder, base), new URL(folder, dist), { recursive: true });
}

const [html, css, engine, campus, art, main, license] = await Promise.all(
  ['index.html', 'src/style.css', 'vendor/phaser-arcade-physics.min.js',
    'src/campus.js', 'src/art.js', 'src/main.js', 'vendor/PHASER-LICENSE.md'].map(read),
);
const source = [campus, art, main].map(module => module
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/^export /gm, '')).join('\n');
const escapeScript = code => code.replace(/<\/script/gi, '<\\/script');
const standalone = html
  .replace(/<link rel="stylesheet"[^>]*>/, () => '<style>\n' + css + '</style>')
  .replace(/^ *<script[^\n]*\n/gm, '')
  .replace('</body>', () => '<!--\nPhaser MIT license\n' + license + '\n-->\n<script>\n' +
    escapeScript(engine) + '\n</script>\n<script>\n' + escapeScript(source) + '\n</script>\n</body>');
await writeFile(new URL('RUC-Campus-Walk.html', dist), standalone);
console.log('Static release and RUC-Campus-Walk.html were built in dist/.');
