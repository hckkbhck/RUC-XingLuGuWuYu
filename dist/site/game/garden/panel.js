import {button, node} from '../dom.js';
import {asset} from '../../src/characters.js';
import {bed, capacity, flowers, flowerName, plotLabel, validPlot} from './plots.js';

function picture(flower) {
  const image = node('img');
  image.src = asset('assets/flowers/'+flower+'.png');
  image.alt = '';
  return image;
}

export function openGarden({panel, store, initialPlot, onChange, recordMyFlower}) {
  let active = true, busy = true, selected = initialPlot, variety = flowers[0].id;
  let edit = null, readFailed = false;
  const body = panel.show('种一朵你的花', {symbol:'leaf', placeId:'flower-garden', subtitle:'崇德楼北侧', onLeave:() => { active=false; }});
  const summary = node('div','garden-summary'), scope = node('span'), count = node('strong');
  summary.append(scope,count);
  const grid = node('div','garden-grid');
  grid.style.setProperty('--columns',bed.columns);
  grid.setAttribute('role','group');
  grid.setAttribute('aria-label','选择花位，可用方向键移动');
  grid.append(node('span'));
  for (let i=1;i<=bed.columns;i++) grid.append(node('span','garden-axis',String(i)));
  const cells = [];
  function select(plot) {
    selected = plot;
    edit = null;
    panel.error('');
    render();
  }
  for (let plot=0;plot<capacity;plot++) {
    if (plot%bed.columns===0) grid.append(node('span','garden-axis',plotLabel(plot)[0]));
    const cell = node('button','garden-cell');
    cell.type = 'button';
    cell.onclick = () => select(plot);
    cell.onkeydown = event => {
      const directions = {ArrowUp:-bed.columns, ArrowDown:bed.columns, ArrowLeft:-1, ArrowRight:1};
      if (!(event.key in directions)) return;
      event.preventDefault();
      const next = plot+directions[event.key];
      if (validPlot(next)) { select(next); cells[next].focus(); }
    };
    grid.append(cell);
    cells.push(cell);
  }
  const detail = node('p','garden-detail');
  detail.setAttribute('aria-live','polite');
  const choices = node('div','garden-varieties');
  choices.setAttribute('role','group'); choices.setAttribute('aria-label','选择花种');
  for (const {id,name} of flowers) {
    const choice = button(name, () => { variety=id; render(); }, 'garden-choice');
    choice.dataset.flower = id;
    choice.prepend(picture(id));
    choices.append(choice);
  }
  function begin(action) {
    const entry = store.entries.find(row => row.plot === selected && row.mine);
    if (busy || !entry) return;
    edit = {action, revision:entry.revision, flower:entry.flower};
    variety = entry.flower;
    panel.error('');
    render();
    (action==='replace' ? choices.querySelector('[aria-pressed="true"]') : cancel).focus();
  }
  const replace = button('更换花种',()=>begin('replace'),'secondary','leaf');
  const remove = button('铲掉这朵花',()=>begin('remove'),'secondary');
  const cancel = button('取消',()=>{ const origin=edit?.action==='replace'?replace:remove; edit=null; render(); origin.focus(); },'secondary');
  const save = button('种在这里', async () => {
    if (busy || readFailed || save.disabled) return;
    busy = true;
    const plot = selected, flower = variety, action = edit?.action ?? 'plant', revision = edit?.revision;
    render();
    panel.error('');
    try {
      if (action==='remove') await store.remove(plot, revision);
      else if (action==='replace') await store.replace(plot, revision, flower);
      else await store.plant(plot,flower);
      if (active) panel.close();
      onChange(action,plot,flower);
    } catch (error) {
      await store.refresh().catch(() => { readFailed=true; });
      if (active) { edit=null; busy=false; render(); panel.error(error.message); }
    }
  }, 'primary','leaf');
  const retry = button('重新读取花园',load,'secondary');
  const record = button('用这朵花盖章',async () => {
    if (busy || !recordMyFlower) return;
    busy=true;
    render();
    try {
      const rows=await store.refresh();
      if (!active) return;
      if (rows.some(row => row.plot===selected && row.mine)) {
        panel.close();
        recordMyFlower();
      } else panel.error('花位已更新，请重新选择自己的花。');
    } catch(error) {
      if (active) { readFailed=true; panel.error(error.message); }
    } finally { busy=false; if (active) render(); }
  },'primary','book');
  retry.hidden = true;
  const actions=node('div','garden-actions');
  actions.append(record,replace,remove,save,cancel,retry);
  body.append(summary,grid,detail,choices,actions);
  function render() {
    const rows = new Map(store.entries.map(row => [row.plot,row]));
    const mine = store.entries.find(row => row.mine), entry = rows.get(selected);
    if (edit && (!entry?.mine || edit.revision!==entry.revision)) {
      edit=null;
      panel.error('花位已更新，请重新选择操作。');
    }
    const canPlant = store.loaded && !mine && !entry && validPlot(selected);
    count.textContent = store.loaded ? '已开花 '+rows.size+' / '+capacity : '';
    scope.textContent = '本机花园 · 仅此浏览器可见';
    for (const [plot,cell] of cells.entries()) {
      const row=rows.get(plot), description = row ? row.nickname+'的'+flowerName(row.flower) : '空花位';
      cell.setAttribute('aria-label',plotLabel(plot)+' · '+description);
      cell.title = cell.getAttribute('aria-label');
      cell.setAttribute('aria-pressed',String(plot===selected));
      cell.tabIndex = plot===(selected ?? 0) ? 0 : -1;
      cell.disabled = busy || readFailed || !store.loaded;
      cell.classList.toggle('my-flower',Boolean(row?.mine));
      if (cell.dataset.flower !== (row?.flower || '')) {
        cell.dataset.flower = row?.flower || '';
        cell.replaceChildren(...(row ? [picture(row.flower)] : []));
      }
    }
    detail.textContent = readFailed ? '暂时无法读取最新花位。' : busy && !store.loaded ? '正在读取花位…' :
      edit?.action==='remove' ? '铲掉 '+plotLabel(selected)+' 的'+flowerName(edit.flower)+'后，这个格子就空出来了。你可以再选一个空格种花。' :
      edit?.action==='replace' ? '为 '+plotLabel(selected)+' 换一种花，花位仍归你。' :
      entry ? plotLabel(selected)+' · '+(entry.mine?'你':entry.nickname)+'种下的'+flowerName(entry.flower) :
      rows.size === capacity ? '80 个花位都已开花。点一朵花可以查看种花人。' :
      mine ? '你的'+flowerName(mine.flower)+'开在 '+plotLabel(mine.plot)+'。点一朵花可以查看种花人。' :
      validPlot(selected) ? plotLabel(selected)+' 是空花位，选一朵喜欢的花吧。' : '选一个空花位，留下你的一朵花。';
    const editing = !!edit, canManage = entry?.mine && !editing && !readFailed;
    record.hidden=!recordMyFlower || !canManage;
    record.disabled=busy;
    choices.hidden = readFailed || (!canPlant && edit?.action!=='replace');
    for (const b of choices.children) {
      b.disabled = busy;
      b.setAttribute('aria-pressed',String(b.dataset.flower===variety));
    }
    replace.hidden=remove.hidden=!canManage;
    replace.disabled=remove.disabled=cancel.disabled=busy;
    cancel.hidden=!editing || readFailed;
    save.hidden = readFailed || (!canPlant && !editing);
    save.disabled = busy || save.hidden || (edit?.action==='replace' && edit.flower===variety);
    save.querySelector('span').textContent = busy ? '正在保存…' : edit?.action==='remove' ? '确认铲掉' :
      edit?.action==='replace' ? '换成'+flowerName(variety) : '在 '+(validPlot(selected)?plotLabel(selected):'')+' 种下'+flowerName(variety);
    retry.hidden=!readFailed;
  }
  async function load() {
    busy=true; readFailed=false; panel.error(''); render();
    try {
      await store.refresh();
      if (!active) return;
      selected ??= store.entries.find(row => row.mine)?.plot ?? null;
      busy=false; render();
    } catch (error) {
      if (!active) return;
      busy=false; readFailed=true; render(); panel.error(error.message);
    }
  }
  load();
  return () => { if (active && !busy) render(); };
}
