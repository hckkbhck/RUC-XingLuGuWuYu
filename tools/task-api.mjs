import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {taskResponse} from './task-records.mjs';

export function createTaskApi(directory) {
  mkdirSync(directory,{recursive:true});
  const sqlite = new DatabaseSync(join(directory,'tasks.sqlite'));
  sqlite.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS campus_tasks (
      id TEXT PRIMARY KEY, owner TEXT NOT NULL, author TEXT NOT NULL, title TEXT NOT NULL,
      description TEXT NOT NULL, location TEXT NOT NULL, created INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'open', version INTEGER NOT NULL DEFAULT 1, assignee TEXT, helper TEXT
    );
    CREATE TABLE IF NOT EXISTS task_notes (
      id TEXT PRIMARY KEY, task TEXT NOT NULL REFERENCES campus_tasks(id), owner TEXT NOT NULL,
      author TEXT NOT NULL, body TEXT NOT NULL, created INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS task_notes_task ON task_notes(task);
    CREATE INDEX IF NOT EXISTS campus_tasks_status ON campus_tasks(status);
    CREATE INDEX IF NOT EXISTS campus_tasks_owner ON campus_tasks(owner);
    CREATE INDEX IF NOT EXISTS campus_tasks_assignee ON campus_tasks(assignee);`);
  const db = {
    first:(sql,...args) => sqlite.prepare(sql).get(...args),
    all:(sql,...args) => sqlite.prepare(sql).all(...args),
    run:(sql,...args) => sqlite.prepare(sql).run(...args).changes
  };
  return async (req,res) => {
    // A private browser capability, independent of the ID displayed on the campus profile card.
    const secret = req.headers['x-task-key'];
    const actor = typeof secret === 'string' && /^[a-f0-9]{64}$/.test(secret)
      ? createHash('sha256').update(secret).digest('hex') : null;
    const request = new Request(new URL(req.url,'http://localhost'),{method:req.method,headers:req.headers,
      ...(!['GET','HEAD'].includes(req.method) && {body:req,duplex:'half'})});
    const result = await taskResponse(request,db,actor);
    res.writeHead(result.status,Object.fromEntries(result.headers)).end(await result.text());
  };
}
