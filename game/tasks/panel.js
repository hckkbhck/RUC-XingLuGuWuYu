import {node,button,icon} from '../dom.js';
import {newKey,requestTasks} from './client.js';

const labels = {open:'待办',taken:'进行中',done:'已完成',cancelled:'已撤回'};
const dates = new Intl.DateTimeFormat('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
const statusTag = task => node('span','task-stamp '+task.status,labels[task.status]);
function field(label, name, placeholder, limit, multiline = false, required = true) {
  const group = node('label','task-field');
  const input = node(multiline ? 'textarea' : 'input');
  input.name = name; input.placeholder = placeholder; input.maxLength = limit; input.required = required;
  if (multiline) input.rows = 3;
  group.append(node('span','',label),input);
  return group;
}
function submit(label) {
  const control = node('button','task-button main',label);
  control.type = 'submit';
  return control;
}

export function openTaskBoard(panel,profiles,toast) {
  let filter = 'all', cursors = [null];
  function page(title,back,backLabel) {
    const controller = new AbortController();
    let refresh, busy = false, pendingRead = 0, requestNumber = 0, loaded = false, previous;
    const signal = controller.signal;
    const body = panel.show(title,{taskPage:true,placeId:'plaza',back,backLabel,onLeave() {
      controller.abort();
      window.removeEventListener('focus',onFocus);
      document.removeEventListener('visibilitychange',onFocus);
    }});
    const content = node('div','task-content');
    const feedback = node('div','task-feedback');
    feedback.setAttribute('role','status'); feedback.hidden = true;
    body.append(content,feedback);
    function note(message,retry) {
      feedback.replaceChildren(node('span','',message));
      if (retry) feedback.append(button('重新读取',retry,'task-link'));
      feedback.hidden = !message;
    }
    function onFocus() { if (!document.hidden) refresh?.(); }
    function watch(params,paint) {
      refresh = async () => {
        if (pendingRead || busy || signal.aborted) return;
        const ticket = ++requestNumber;
        pendingRead = ticket;
        try {
          const data = await requestTasks(profiles.read(),params);
          if (signal.aborted || pendingRead !== ticket) return;
          if (feedback.dataset.readError || !loaded) { note(''); delete feedback.dataset.readError; }
          const signature = JSON.stringify(data);
          if (signature !== previous) { paint(data); previous = signature; }
          loaded = true;
        } catch (error) {
          if (!signal.aborted && pendingRead === ticket) { feedback.dataset.readError = 'true'; note(error.message,refresh); }
        } finally { if (pendingRead === ticket) pendingRead = 0; }
      };
      note('正在读取本机任务…');
      refresh();
      window.addEventListener('focus',onFocus);
      document.addEventListener('visibilitychange',onFocus);
    }
    async function write(draft,done) {
      if (busy || signal.aborted) return;
      busy = true; pendingRead = 0; note('');
      const controls = [...content.querySelectorAll('button:not(:disabled), input, textarea')];
      controls.forEach(el => { el.disabled = true; });
      try {
        await requestTasks(profiles.read(),{},draft);
        if (!signal.aborted) done();
      } catch (error) {
        if (!signal.aborted) note(error.message);
      } finally {
        busy = false;
        if (!signal.aborted) {
          controls.forEach(el => { el.disabled = false; });
          await refresh?.();
        }
      }
    }
    return {content,watch,write};
  }
  function list() {
    const view = page('校园任务栏');
    const toolbar = node('div','task-toolbar');
    const filters = node('div','task-filters');
    filters.setAttribute('role','group'); filters.setAttribute('aria-label','筛选任务');
    for (const [value,label] of [['all','全部'],['open','待办'],['taken','进行中']]) {
      const tab = button(label,() => { if (filter !== value) { filter = value; cursors = [null]; list(); } },'task-tab');
      tab.setAttribute('aria-pressed',String(value === filter)); filters.append(tab);
    }
    const add = button('新建任务',compose,'task-button main','plus');
    add.disabled = true;
    toolbar.append(filters,add);
    const wall = node('div','task-wall'), pager = node('div','task-pager');
    view.content.append(toolbar,wall,pager);
    const params = {filter};
    if (cursors.at(-1)) params.before = cursors.at(-1);
    view.watch(params,({tasks,next}) => {
      add.disabled = false;
      const activeId = document.activeElement?.dataset.taskId;
      wall.replaceChildren(); pager.replaceChildren();
      if (!tasks.length) {
        const empty = node('div','task-empty');
        const sheet = node('i','task-empty-sheet'); sheet.setAttribute('aria-hidden','true');
        const copy = node('div');
        const heading = filter === 'all' ? '还没有本机任务' : '当前分类没有任务';
        const hint = '点「新建任务」记下要做的事。';
        copy.append(node('h3','',heading),node('p','',hint)); empty.append(sheet,copy); wall.append(empty);
      }
      for (const task of tasks) {
        const card = node('button','task-card');
        card.type = 'button'; card.dataset.taskId = task.id;
        card.onclick = () => detail(task.id);
        const line = node('span','task-card-top');
        line.append(statusTag(task),node('time','task-date',dates.format(task.created)));
        const meta = node('span','task-card-meta',task.author + ' 创建');
        meta.append(node('span','',task.notes + ' 条备注'));
        card.append(line,node('strong','',task.title));
        if (task.location) card.append(node('span','task-place',task.location));
        card.append(meta); wall.append(card);
        if (activeId === task.id) card.focus({preventScroll:true});
      }
      if (cursors.length > 1) pager.append(button('上一页',()=>{cursors.pop(); list();},'task-link'));
      if (next) pager.append(button('下一页',()=>{cursors.push(next); list();},'task-link'));
    });
  }
  function compose() {
    const view = page('新建校园任务',list,'返回任务栏');
    const form = node('form','task-paper task-form');
    form.append(field('任务标题','title','例如：帮忙送一份社团文件',48),
      field('交接地点（选填）','location','例如：求是楼一层 → 学生活动中心',60,false,false),
      field('任务说明','description','需要做什么？请写下交接时间和注意事项。',600,true));
    const foot = node('div','task-form-foot');
    foot.append(node('small','','保存在此浏览器，可自行开始、备注和完成。'),submit('贴到任务栏'));
    form.append(foot); view.content.append(form);
    const id = newKey();
    form.onsubmit = event => {
      event.preventDefault();
      const draft = Object.fromEntries(new FormData(form));
      view.write({...draft,id,action:'publish'},() => { cursors = [null]; toast('已创建任务'); detail(id); });
    };
  }
  function detail(id) {
    const view = page('任务详情',list,'返回任务栏');
    const sheet = node('article','task-paper task-detail'), thread = node('section','task-thread');
    const heading = node('h3','','个人备注'), messages = node('ol','task-messages');
    const form = node('form','task-reply');
    const reply = node('input'); reply.maxLength = 300; reply.required = true;
    reply.setAttribute('aria-label','个人备注'); reply.placeholder = '写下任务进展';
    const send = submit('保存备注');
    form.append(reply,send); thread.append(heading,messages,form);
    sheet.hidden = thread.hidden = true;
    view.content.append(sheet,thread);
    let messageId = newKey();
    form.onsubmit = e => {
      e.preventDefault();
      view.write({id,action:'message',messageId,body:reply.value},() => { reply.value = ''; messageId = newKey(); toast('备注已保存'); });
    };
    view.watch({id},({task,messages:rows}) => {
      sheet.hidden = thread.hidden = false;
      const active = document.activeElement?.dataset.taskAction;
      const meta = node('div','task-detail-meta');
      meta.append(statusTag(task),node('time','task-date',dates.format(task.created)));
      sheet.replaceChildren(meta,node('h3','task-title',task.title),node('p','task-description',task.description));
      if (task.location) {
        const place = node('div','task-location'); place.append(icon('pin'),node('span','',task.location)); sheet.append(place);
      }
      const handoff = node('div','task-handoff');
      const people = node('span','task-people',task.author+' 创建');
      handoff.append(people);
      const actions = node('div','task-actions');
      function action(label,name,style) {
        const btn = button(label,() => view.write({id,action:name,version:task.version},() => {
          toast({claim:'已开始任务',release:'任务已放回待办',complete:'任务已完成',cancel:'任务已撤回'}[name]);
        }),style);
        btn.dataset.taskAction = name; actions.append(btn);
      }
      if (task.status === 'open') action('开始任务','claim','task-button main');
      if (task.status === 'open') action('撤回任务','cancel','task-link');
      if (task.status === 'taken') action('放回待办','release','task-link');
      if (task.status === 'taken') action('确认完成','complete','task-button main');
      handoff.append(actions); sheet.append(handoff);
      if (active) actions.querySelector('[data-task-action="'+active+'"]')?.focus({preventScroll:true});
      heading.textContent = '个人备注' + (rows.length ? ' · '+rows.length : '');
      messages.replaceChildren();
      for (const row of rows) {
        const item = node('li');
        const by = node('div','task-by');
        by.append(node('b','',row.author),node('time','task-date',dates.format(row.created)));
        item.append(by,node('p','',row.body)); messages.append(item);
      }
      const closed = task.status === 'done' || task.status === 'cancelled';
      if (!rows.length) messages.append(node('li','task-no-messages',closed ? '这项任务没有备注。' : '还没有备注，可在这里记录进展。'));
      form.hidden = closed;
    });
  }
  list();
}
