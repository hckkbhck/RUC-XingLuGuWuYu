import { readFile, writeFile } from 'node:fs/promises';
const html = await readFile('dist/RUC-Campus-Walk.html', 'utf8');
const run = async () => {
  const output = document.querySelector('#smoke');
  const game = document.querySelector('#game');
  const dialog = document.querySelector('#dialog');
  const prompt = document.querySelector('#prompt');
  const progress = () => document.querySelector('#progress').textContent;
  const expect = (value, note) => {
    if (!value) throw new Error(note + ' ' + JSON.stringify({ ...game.dataset }) + ' ' + progress());
    output.append(document.createTextNode('✓ ' + note + '\n'));
  };
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const settle = async () => { await frame(); await frame(); await frame(); };
  const codes = { A: 65, W: 87, E: 69, M: 77, ArrowLeft: 37, ArrowRight: 39 };
  const key = (name, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {
    code: name.length === 1 ? 'Key' + name : name, key: name.toLowerCase(), keyCode: codes[name],
    which: codes[name], bubbles: true, cancelable: true,
  }));
  const tap = async name => { key(name, true); await settle(); key(name, false); await settle(); };
  const walk = async (name, done, observe = () => {}) => {
    const until = performance.now() + 4300;
    key(name, true);
    try {
      while (!done()) {
        if (performance.now() > until) throw new Error('movement timed out ' + name);
        await frame();
        observe();
      }
    } finally { key(name, false); }
    await settle();
  };
  const save = (name, canvas = game.querySelector('canvas')) => {
    const link = document.createElement('a');
    link.download = name + '.png';
    link.href = canvas.toDataURL('image/png');
    link.textContent = name + '.png';
    output.append(link, document.createTextNode('  '));
  };

  try {
    for (let i = 0; !game.dataset.x && i < 120; i++) await frame();
    const x = () => Number(game.dataset.x);
    const y = () => Number(game.dataset.y);
    expect(game.dataset.ready === '3.90.0' && x() === 1528 && y() === 501 && !prompt.hidden, 'Phaser 3.90.0 · 东门出生及互动提示');
    const canvas = game.querySelector('canvas');
    expect(Math.abs(canvas.clientWidth - innerWidth) <= 1 && Math.abs(canvas.clientHeight - innerHeight) <= 1, '可行走地图铺满网页');
    expect(prompt.querySelector('.bubble')?.textContent === '!' && Number.isFinite(parseFloat(prompt.style.left)) && Number.isFinite(parseFloat(prompt.style.top)), '感叹号气泡定位在角色上方');
    save('01-east-gate');
    await tap('E');
    expect(dialog.open && !dialog.hidden && prompt.hidden && progress() === '0 / 3', 'E 打开任务栏并隐藏气泡');
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(!dialog.open && dialog.hidden && !prompt.hidden && progress() === '0 / 3', '关闭任务栏后恢复气泡且任务没有推进');
    await tap('E'); await tap('E');
    expect(dialog.hidden && progress() === '1 / 3' && game.dataset.poster === 'empty', '接取任务');
    await tap('M');
    expect(document.querySelector('#full-map').open, 'M 打开全校地图');
    save('02-campus-map', document.querySelector('#map-canvas'));
    await tap('M');
    expect(!document.querySelector('#full-map').open, 'M 关闭全校地图');
    const camera = game.dataset.cameraX;
    const strideFrames = new Set();
    await walk('ArrowLeft', () => x() <= 1030, () => strideFrames.add(game.dataset.frame));
    expect(x() > 1010 && y() === 501 && game.dataset.cameraX !== camera, '方向键沿主路到广场，镜头跟随');
    expect(['1', '2', '3', '4', '5', '6'].every(frame => strideFrames.has(frame)) && game.dataset.frame === '0',
      '走路时六帧轮换，松开按键后回到站立帧');
    await tap('E');
    expect(prompt.hidden && dialog.hidden && progress() === '1 / 3', '范围外没有提示且 E 不打开对话');
    await walk('W', () => y() <= 452);
    await walk('A', () => x() <= 974);
    expect(game.dataset.near === 'board' && !prompt.hidden, 'WASD 进入公告栏互动范围');
    await tap('E'); await tap('E');
    expect(progress() === '2 / 3' && game.dataset.poster === 'empty', '阅读公告栏，红色海报尚未出现');
    await walk('ArrowRight', () => x() >= 1027);
    await walk('W', () => game.dataset.blocked.includes('up'));
    expect(y() >= 315 && y() <= 323 && game.dataset.near === 'library', '图书馆外墙阻挡，正门互动范围有效');
    await tap('E');
    expect(!dialog.hidden && document.querySelector('#dialog-title').textContent.includes('图书馆'), '打开图书馆服务台对话');
    await tap('E');
    expect(progress() === '3 / 3' && game.dataset.poster === 'posted' && !document.querySelector('#notice').hidden, '任务完成，公告栏切换到红色迎新海报');
    await settle();
    save('03-poster-posted');
    document.querySelector('#reset').click();
    await settle();
    expect(x() === 1528 && y() === 501 && progress() === '0 / 3' && game.dataset.poster === 'empty', '重置角色、任务和海报');
    output.append(document.createTextNode('\nALL PASSED'));
  } catch (error) { output.append(document.createTextNode('\nFAIL: ' + error.message)); }
};
const report = '<pre id="smoke" style="position:fixed;top:65px;left:12px;z-index:8;margin:0;padding:10px;background:#14251c;color:#e7dbad;white-space:pre-wrap">浏览器验收\n</pre>';
await writeFile('dist/.browser-qa.html', html.replace('<body>', '<body>' + report)
  .replace('</body>', '<script>(' + run.toString() + ')();</script></body>'));
