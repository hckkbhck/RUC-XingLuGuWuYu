import {changedFlower, gardenError, otherFlower, validateChange} from '../game/garden/mutation.js';

// The adapters supply parameterized statements for Node SQLite and hosted D1.
export async function changeFlower(db, owner, draft) {
  const action = validateChange(draft);
  const {plot, flower, revision} = draft;
  if (action === 'plant') {
    const inserted = await db.run(
      'INSERT INTO flowers(plot,owner,flower,nickname,revision) VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING',
      plot,owner,flower,draft.nickname.trim(),crypto.randomUUID());
    if (inserted) return;
    const mine = await db.first('SELECT plot, flower FROM flowers WHERE owner = ?',owner);
    if (mine?.plot === plot && mine.flower === flower) return;
    throw gardenError(409,mine ? '你已经在花园里种过一朵花了。' : '这个花位已有主人，请再选一个。');
  }
  const affected = action === 'remove'
    ? await db.run('DELETE FROM flowers WHERE plot = ? AND owner = ? AND revision = ?',plot,owner,revision)
    : await db.run('UPDATE flowers SET flower = ?, revision = ? WHERE plot = ? AND owner = ? AND revision = ?',
        flower,crypto.randomUUID(),plot,owner,revision);
  if (affected) return;
  const current = await db.first('SELECT owner FROM flowers WHERE plot = ?',plot);
  if (current && current.owner !== owner) throw otherFlower();
  throw changedFlower();
}

export async function gardenSnapshot(db, owner) {
  const rows = await db.all('SELECT plot, flower, nickname, revision, owner = ? AS mine FROM flowers ORDER BY plot',owner);
  return {entries:rows.map(row => ({...row, mine:Boolean(row.mine)}))};
}
