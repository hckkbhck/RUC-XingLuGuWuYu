import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, posix } from 'node:path';
import { soundConfig } from '../game/audio-config.js';
import { artSources } from '../game/scenery.js';

import { demoEntries } from '../game/memories/demo.js';
import { wallLocations, wallPhotoPath } from '../game/memories/wall-data.js';

const project = new URL('../', import.meta.url);
const dist = new URL('dist/', project);
const site = new URL('site/', dist);
const entry = './game/app.js';
const engine = 'vendor/phaser-arcade-physics.min.js';
const stylesheets = ['./game/ui.css','./game/activity.css','./game/canteen/menu.css','./src/profile.css','./game/memories/album.css','./game/memories/wall.css','./game/memories/exploration.css','./game/tasks/board.css','./game/place-type.css','./game/building-panels.css'];
const modules = new Map();
const assetPaths = new Set([
  ...Object.values(artSources),
  'assets/memories/exploration-seal.png',
  ...demoEntries.filter(entry => entry.hasPhoto).map(entry => entry.photoPath),
  ...Object.values(wallLocations).flatMap(place => Object.keys(place.photos).map(wallPhotoPath)),
  'assets/identity/autumn-registration.jpg',
  'assets/canteen/menu.jpg',
  'assets/canteen/dish.jpg',
  ...soundConfig.map(sound => sound.path),
]);
const mimeType = { '.png': 'image/png', '.jpg':'image/jpeg', '.wav': 'audio/wav' };
const asDataUrl = (type, data) => 'data:' + type + ';base64,' + Buffer.from(data).toString('base64');
const read = (path, encoding) => readFile(new URL(path, project), encoding);
const name = path => 'campus/' + path;
const moduleReference = /(\bfrom\s*|\bimport\s*(?:\(\s*)?)(['"])(\.{1,2}\/[^'"\r\n]+)\2/g;

async function collectModule(path) {
  if (modules.has(path)) return;
  const source = await read(path, 'utf8');
  modules.set(path, source);
  for (const [, , , relativePath] of source.matchAll(moduleReference)) {
    const dependency = posix.normalize(posix.join(posix.dirname(path), relativePath));
    if (!/^(game|src)\//.test(dependency) || extname(dependency) !== '.js') {
      throw new Error('Unsupported release module: ' + dependency);
    }
    await collectModule(dependency);
  }
}

async function copyToSite(path) {
  const destination = new URL(path, site);
  await mkdir(new URL(dirname(path) + '/', site), { recursive: true });
  await copyFile(new URL(path, project), destination);
}

function replaceRequired(html, search, substitute) {
  if (!html.includes(search)) throw new Error('Release markup missing ' + search);
  return html.replace(search, () => substitute);
}

const [html, css] = await Promise.all([
  read('index.html', 'utf8'),
  Promise.all(stylesheets.map(path=>read(path,'utf8'))),
  collectModule(posix.normalize(entry)),
]);

// Each embedded dependency keeps its own module scope and exports.
const imports = {};
for (const [path, source] of modules) {
  const embedded = source.replace(moduleReference, (_match, prefix, quote, relativePath) => {
    const dependency = posix.normalize(posix.join(posix.dirname(path), relativePath));
    return prefix + quote + name(dependency) + quote;
  });
  imports[name(path)] = asDataUrl('text/javascript', embedded);
}
const assets = Object.fromEntries(await Promise.all([...assetPaths].map(async path => [
  path,
  asDataUrl(mimeType[extname(path)], await read(path)),
])));
const importMap = JSON.stringify({ imports });
let standalone = html;
standalone = replaceRequired(standalone, 'src="./' + engine + '"',
  'src="' + asDataUrl('text/javascript', await read(engine)) + '"');
for (const [i,path] of stylesheets.entries()) {
  standalone = replaceRequired(standalone, '<link rel="stylesheet" href="' + path + '">', '<style>\n' + css[i] + '\n</style>');
}
standalone = replaceRequired(standalone, '<script type="module" src="' + entry + '"></script>', [
  '<script>globalThis.CAMPUS_ASSETS = ' + JSON.stringify(assets) + ';</script>',
  '<script type="importmap">' + importMap + '</script>',
  '<script type="module">import ' + JSON.stringify(name(posix.normalize(entry))) + ';</script>',
].join('\n  '));

await Promise.all(['index.html', 'campus.html', engine, ...stylesheets, ...modules.keys(), ...assetPaths].map(copyToSite));
await copyToSite('campus/index.html');
await Promise.all([
  writeFile(new URL('RUC物语.html', dist), standalone),
  writeFile(new URL('RUC-Campus-Walk.html', dist), standalone),
  writeFile(new URL('RUC-Campus-Welcome.html', dist), standalone),
  writeFile(new URL('index.html', dist), '<!doctype html>\n<html lang="zh-CN"><meta charset="utf-8"><title>RUC物语</title><meta http-equiv="refresh" content="0; url=./site/"><a href="./site/">进入RUC物语</a></html>\n'),
]);
console.log('Web release: dist/site/');
console.log('Standalone release: dist/RUC物语.html (also available under the two original filenames)');
