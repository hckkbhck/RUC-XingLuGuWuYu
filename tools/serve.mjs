import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep, join } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const prefix = (process.argv[4] ?? '').replace(/\/$/, '');
const port = Number(process.argv[3] ?? 4173);
const host = process.env.CAMPUS_HOST || '127.0.0.1';
const gardenDirectory = resolve(process.env.CAMPUS_GARDEN_DIR || '.garden-data');
const canteenDirectory = resolve(process.env.CAMPUS_CANTEEN_DIR || '.canteen-data');
const taskDirectory = resolve(process.env.CAMPUS_TASK_DIR || '.task-data');
const legacyApis = process.argv.includes('--legacy-api');
let taskApi;
let gardenApi;
let canteenApi;
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.wav', 'audio/wav'],
]);
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (prefix && (pathname==='/' || pathname===prefix)) {
      response.writeHead(302, {Location:prefix+'/'}).end();
      return;
    }
    if (prefix && !pathname.startsWith(prefix + '/')) {
      response.writeHead(404).end();
      return;
    }
    if (legacyApis && pathname.slice(prefix.length) === '/api/flower-garden') {
      try {
        gardenApi ??= import('./garden-api.mjs').then(module => module.createGardenApi(gardenDirectory));
        const handle = await gardenApi;
        await handle(request, response);
      } catch {
        response.writeHead(503, {'Content-Type':'application/json'}).end(JSON.stringify({message:'共享花园服务暂时不可用。'}));
      }
      return;
    }
    if (legacyApis && pathname.slice(prefix.length) === '/api/canteen-reviews') {
      try {
        canteenApi ??= import('./canteen-api.mjs').then(module=>module.createCanteenApi(canteenDirectory))
          .catch(error=>{canteenApi=null; throw error;});
        const handle=await canteenApi;
        await handle(request,response,url.searchParams);
      } catch {
        response.writeHead(503,{'Content-Type':'application/json'}).end(JSON.stringify({message:'共享评价服务暂时不可用。'}));
      }
      return;
    }
    if (legacyApis && pathname.slice(prefix.length) === '/api/tasks') {
      try {
        taskApi ??= import('./task-api.mjs').then(module => module.createTaskApi(taskDirectory))
          .catch(error => { taskApi = null; throw error; });
        await (await taskApi)(request,response);
      } catch {
        response.writeHead(503,{'Content-Type':'application/json'}).end(JSON.stringify({message:'任务栏暂时不可用，请重试。'}));
      }
      return;
    }
    let file = resolve(root, '.' + pathname.slice(prefix.length));
    const foldedFile = file.toLowerCase();
    const isPrivate = [gardenDirectory,canteenDirectory,taskDirectory].some(dir =>
      foldedFile === dir.toLowerCase() || foldedFile.startsWith(dir.toLowerCase() + sep));
    if ((file !== root && !file.startsWith(root + sep)) || isPrivate || /\.sqlite\b/i.test(file)) {
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
server.listen(port, host, () => console.log('http://'+host+':' + server.address().port + prefix + '/'));
