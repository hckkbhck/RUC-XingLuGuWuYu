export const newKey = () => Array.from(crypto.getRandomValues(new Uint8Array(16)),
  byte => byte.toString(16).padStart(2,'0')).join('');

let opening;
function openBoard() {
  if (!opening) {
    opening = new Promise((resolve,reject) => {
      const request = indexedDB.open('ruc.campus.personal-tasks',1);
      request.onupgradeneeded = () => {
        const tasks = request.result.createObjectStore('tasks',{keyPath:['owner','id']});
        tasks.createIndex('owner','owner');
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); opening = null; };
        resolve(db);
      };
    }).catch(error => { opening = null; throw error; });
  }
  return opening;
}

function field(value,limit,optional=false) {
  if (typeof value !== 'string' || value.length > limit || (!optional && !value.trim()))
    throw new Error('请检查任务内容与字数。');
  return value.trim();
}

const transitions = {
  claim: ['open','taken'], release: ['taken','open'],
  complete: ['taken','done'], cancel: ['open','cancelled']
};

function applyDraft(task, profile, draft) {
  if (draft.action === 'publish') {
    const title = field(draft.title,48);
    const location = field(draft.location ?? '',60,true);
    const description = field(draft.description,600);
    if (task) {
      if (task.title !== title || task.location !== location || task.description !== description)
        throw new Error('该任务编号已存在，请重新打开任务列表。');
      return task;
    }
    return {id:draft.id, owner:profile.id, author:profile.nickname, title, location, description,
      created:Date.now(), version:1, status:'open', messages:[]};
  }
  if (!task) throw new Error('找不到这项本机任务。');
  if (draft.action === 'message') {
    const body = field(draft.body,300);
    const previous = task.messages.find(row => row.id === draft.messageId);
    if (previous && previous.body === body) return task;
    if (previous || !draft.messageId || !['open','taken'].includes(task.status))
      throw new Error('无法保存备注，请重新打开任务。');
    task.messages.push({id:draft.messageId, body, author:profile.nickname, created:Date.now()});
    return task;
  }
  const next = transitions[draft.action];
  if (!next || task.status !== next[0] || task.version !== draft.version)
    throw new Error('任务状态已变化，请查看最新状态。');
  task.status = next[1];
  task.version++;
  return task;
}

async function writeTask(db,profile,draft) {
  return new Promise((resolve,reject) => {
    const tx = db.transaction('tasks','readwrite');
    const store = tx.objectStore('tasks');
    const request = store.get([profile.id,draft.id]);
    let failure;
    request.onsuccess = () => {
      try { store.put(applyDraft(request.result,profile,draft)); }
      catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => resolve({id:draft.id});
    tx.onabort = () => reject(failure || tx.error || new Error('本机任务未保存，请重试。'));
  });
}

function summary(task) {
  const {messages,...row} = task;
  return {...row,notes:messages.length};
}

export async function requestTasks(profile,params={},draft) {
  if (!profile?.id) throw new Error('请先登记玩家资料。');
  const db = await openBoard();
  if (draft) return writeTask(db,profile,draft);
  const store = db.transaction('tasks').objectStore('tasks');
  const query = params.id ? store.get([profile.id,params.id]) : store.index('owner').getAll(profile.id);
  const result = await new Promise((resolve,reject) => {
    query.onsuccess = () => resolve(query.result);
    query.onerror = () => reject(query.error);
  });
  if (params.id) {
    if (!result) throw new Error('找不到这项本机任务。');
    return {task:summary(result),messages:result.messages};
  }
  result.sort((a,b) => b.created-a.created || b.id.localeCompare(a.id));
  const start = params.before ? result.findIndex(row => row.id === params.before)+1 : 0;
  const rows = result.slice(start).filter(row => !params.filter || params.filter === 'all' || row.status === params.filter);
  const page = rows.slice(0,24);
  return {tasks:page.map(summary),next:rows.length > page.length ? page.at(-1).id : null};
}
