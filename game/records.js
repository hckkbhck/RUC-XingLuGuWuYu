const KEY = 'ruc.zhongguancun.fieldnotes.v1';

export function createRecords(storage = () => window.localStorage) {
  const read = () => {
    try {
      const rows = JSON.parse(storage().getItem(KEY) || '[]');
      return Array.isArray(rows) ? rows.filter(row => row && typeof row.placeId === 'string' &&
        typeof row.eventId === 'string' && typeof row.title === 'string' &&
        Number.isFinite(row.time)) : [];
    } catch { return []; }
  };
  return {
    all: read,
    last: (placeId, eventId) => read().find(row => row.placeId === placeId && row.eventId === eventId),
    save(placeId, eventId, title, detail = '', photo = '') {
      const entry = {placeId, eventId, title, detail, photo, time: Date.now()};
      const old = read().filter(row => row.placeId !== placeId || row.eventId !== eventId);
      storage().setItem(KEY, JSON.stringify([entry, ...old]));
      return entry;
    }
  };
}

export const recordTime = time => new Intl.DateTimeFormat('zh-CN', {
  month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
}).format(new Date(time));
