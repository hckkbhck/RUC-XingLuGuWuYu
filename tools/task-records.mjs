// Shared by the SQLite development server and the hosted D1 Worker.
const failure = (status, message) => Object.assign(new Error(message), {status});
const keyPattern = /^[a-f0-9]{32}$/;
const nameSegments = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh', {granularity:'grapheme'}) : null;
function key(value) {
  if (typeof value !== 'string' || !keyPattern.test(value)) throw failure(400, '任务编号无效。');
  return value;
}
function field(value, limit, label, optional = false) {
  if (typeof value !== 'string' || value.length > limit || (!optional && !value.trim()))
    throw failure(400, '请检查' + label + '，最多可写 ' + limit + ' 字。');
  return value.trim();
}
const columns = `t.id, t.title, t.location, t.author, t.helper, t.status, t.version, t.created,
  t.owner = ? AS mine, COALESCE(t.assignee = ?, 0) AS helping,
  (SELECT COUNT(*) FROM task_notes n WHERE n.task = t.id) AS notes`;

export async function readTasks(db, actor, params) {
  if (params.has('id')) {
    const id = key(params.get('id'));
    const task = await db.first('SELECT ' + columns + ', t.description FROM campus_tasks t WHERE t.id = ?', actor, actor, id);
    if (!task) throw failure(404, '找不到这张委托。');
    const messages = await db.all('SELECT id, author, body, created FROM task_notes WHERE task = ? ORDER BY rowid', id);
    return {task, messages};
  }
  const filter = params.get('filter') || 'all';
  const before = Number(params.get('before') || Number.MAX_SAFE_INTEGER);
  if (!Number.isSafeInteger(before) || before < 1 || !['all','open','mine'].includes(filter))
    throw failure(400, '请重新打开任务列表。');
  let clause = '';
  const args = [actor, actor, before];
  if (filter === 'mine') { clause = ' AND (t.owner = ? OR t.assignee = ?)'; args.push(actor, actor); }
  if (filter === 'open') clause = " AND t.status = 'open'";
  const rows = await db.all('SELECT ' + columns + ', t.rowid AS cursor FROM campus_tasks t WHERE t.rowid < ?' +
    clause + ' ORDER BY t.rowid DESC LIMIT 25', ...args);
  const tasks = rows.slice(0,24);
  return {tasks, next:rows.length > tasks.length ? tasks.at(-1).cursor : null};
}

export async function changeTask(db, actor, draft) {
  if (!draft || typeof draft !== 'object') throw failure(400, '请填写委托内容。');
  const id = key(draft.id);
  const author = field(draft.nickname, 256, '昵称');
  const nameLength = Array.from(nameSegments ? nameSegments.segment(author) : author).length;
  if (nameLength < 2 || nameLength > 16) throw failure(400, '请检查玩家昵称。');
  const now = Date.now();
  if (draft.action === 'publish') {
    const title = field(draft.title, 48, '委托标题');
    const description = field(draft.description, 600, '任务说明');
    const location = field(draft.location ?? '', 60, '交接地点', true);
    const changed = await db.run(`INSERT INTO campus_tasks (id, owner, author, title, description, location, created)
      VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING`, id, actor, author, title, description, location, now);
    if (!changed && !await db.first('SELECT id FROM campus_tasks WHERE id=? AND owner=? AND title=? AND description=? AND location=?',
      id, actor, title, description, location)) throw failure(409, '这张委托已经提交，请返回任务栏查看。');
    return {id};
  }
  if (draft.action === 'message') {
    const message = key(draft.messageId);
    const body = field(draft.body, 300, '留言');
    const inserted = await db.run(`INSERT INTO task_notes (id, task, owner, author, body, created)
      SELECT ?, id, ?, ?, ?, ? FROM campus_tasks WHERE id=? AND status IN ('open','taken')
      ON CONFLICT(id) DO NOTHING`, message, actor, author, body, now, id);
    if (!inserted && !await db.first('SELECT id FROM task_notes WHERE id=? AND task=? AND owner=? AND body=?', message, id, actor, body))
      throw failure(409, '这张委托已结束，无法添加留言。');
    return {id};
  }
  if (!Number.isSafeInteger(draft.version) || draft.version < 1) throw failure(400,'请刷新委托状态。');
  const steps = {
    claim:["status='taken', assignee=?, helper=?", "status='open' AND owner<>?", [actor,author]],
    release:["status='open', assignee=NULL, helper=NULL", "status='taken' AND assignee=?", []],
    complete:["status='done'", "status='taken' AND owner=?", []],
    cancel:["status='cancelled'", "status='open' AND owner=?", []]
  };
  if (!Object.hasOwn(steps,draft.action)) throw failure(400,'未知的任务操作。');
  const [update, condition, values] = steps[draft.action];
  const changed = await db.run('UPDATE campus_tasks SET '+update+', version=version+1 WHERE id=? AND version=? AND '+condition,
    ...values,id,draft.version,actor);
  if (!changed) throw failure(409,'当前状态无法执行此操作，请查看最新的委托。');
  return {id};
}

export async function taskResponse(request, db, actor) {
  const options = {headers:{'Cache-Control':'private, no-store'}};
  try {
    if (!actor) throw failure(401,'请登录《RUC物语》后再打开任务栏。');
    let result;
    if (request.method === 'GET') result = await readTasks(db, actor, new URL(request.url).searchParams);
    else if (request.method === 'POST') {
      if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw failure(415,'请提交 JSON 格式的委托。');
      const reader = request.body?.getReader();
      if (!reader) throw failure(400,'请填写委托。');
      const bytes = new Uint8Array(8192);
      let used = 0;
      for (;;) {
        const {done,value} = await reader.read();
        if (done) break;
        if (used + value.length > bytes.length) { await reader.cancel(); throw failure(413,'提交内容过长。'); }
        bytes.set(value,used); used += value.length;
      }
      let draft;
      try { draft = JSON.parse(new TextDecoder().decode(bytes.subarray(0,used))); }
      catch { throw failure(400,'无法读取委托。'); }
      result = await changeTask(db, actor, draft);
    } else throw failure(405,'此操作不可用。');
    return Response.json(result,options);
  } catch (error) {
    return Response.json({message:error.status ? error.message : '任务栏暂时无法读取或保存，请重试。'},
      {...options,status:error.status || 503});
  }
}
