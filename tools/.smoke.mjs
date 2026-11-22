import {readFile, writeFile} from 'node:fs/promises';

const html = await readFile('dist/RUC-Campus-Walk.html', 'utf8');
async function run() {
  const get = id => document.getElementById(id);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const report = get('smoke');
  function check(ok, label) {
    if (!ok) throw new Error(label);
    report.append('✓ ' + label + '\n');
  }
  async function wait(test) {
    const start = performance.now();
    while (!test()) {
      if (performance.now()-start > 7000) throw new Error('等待超时 '+test);
      await sleep(25);
    }
  }
  try {
    await wait(() => get('registration').open || !get('player-badge').hidden);
    const shell = get('game-shell');
    check(shell.dataset.x === '1509' && shell.dataset.y === '361','从圆形求是广场出生');
    if (get('registration').open) {
      get('nickname').value='验收同学';
      document.querySelector('#character-options [data-option=daisy]').click();
      get('choose-avatar').click();
      document.querySelector('#avatar-options [data-option=burgundy-hoodie]').click();
      document.querySelector('.campus-enter').click();
      await wait(()=>!get('registration').open);
    }
    get('player-badge').click();
    check(get('profile-card').open && get('card-id').textContent.length===36,'读取玩家名片');
    document.querySelector('#profile-card .card-close').click();
    await sleep(60);
    window.dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight'}));
    try { await wait(()=>+shell.dataset.x>=1519); }
    finally { window.dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowRight'})); }
    check(+shell.dataset.x>=1519,'注册后恢复人物移动');
    get('atlas-open').click();
    const pins=[...document.querySelectorAll('.map-pin')].map(b=>b.dataset.place);
    check(pins.filter(id=>!id.startsWith('tz-')).length===17 && pins.includes('flower-garden') && pins.includes('lide') && pins.includes('tz-learning') && pins.includes('tz-bus-stop') && pins.includes('plaza') && pins.includes('gate') && !pins.some(id=>id.startsWith('red-')),'导览包含崇德花园等中关村十七个地点和通州校区');
    get('panel-close').click();
    report.append('ALL PASSED');
  } catch (error) { report.append('FAIL: '+error.message); }
}
const report='<pre id="smoke" style="position:fixed;left:1em;bottom:1em;z-index:10;pointer-events:none;padding:1em;background:#193828;color:white">浏览器验收\n</pre>';
await writeFile('dist/.browser-qa.html',html.replace('<body>','<body>'+report)
  .replace('</body>',()=>'<script>('+run.toString()+')();</script></body>'));
