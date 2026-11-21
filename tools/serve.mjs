import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep, join } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const prefix = (process.argv[4] ?? '').replace(/\/$/, '');
const port = Number(process.argv[3] ?? 4173);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
]);
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (prefix && !pathname.startsWith(prefix + '/')) {
      response.writeHead(404).end();
      return;
    }
    let file = resolve(root, '.' + pathname.slice(prefix.length));
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(404).end();
      return;
    }
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types.get(extname(file)) ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
server.listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port + prefix + '/'));
