import {button, node} from '../dom.js';
import {pixelEmblem} from '../place-emblems.js';
import {asset} from '../../src/characters.js';
import {wallLocations} from './wall-data.js';

const stops = [
  {id:'canteen', action:'read-menu', title:'去中区食堂看看今天吃什么', hint:'在食堂门前互动，打开「每日菜谱」，看看今天有没有想吃的菜。', art:'food'},
  {id:'flower-garden', action:'plant', title:'去崇德花园种下一朵小花', hint:'到崇德楼北侧的花园，选「种一朵你的花」，挑一个空花位和喜欢的花种，再点种下。', art:'garden'},
  {id:'lide', action:'start-study', title:'去立德楼找间空教室自习', hint:'到立德楼南门，选「找空教室自习」，挑一间空教室坐下。', art:'hall'}
];

export function createExplorationSession() {
  const stamped = new Set();
  const wallsRead = new Set();
  let signedAt = null;
  return {
    hasStamp: id => stamped.has(id),
    get count() { return stamped.size; },
    get total() { return stops.length; },
    get discovered() {
      return [...wallsRead].reduce((sum,id) => sum + wallLocations[id].entries.length, 0);
    },
    get complete() { return stamped.size === stops.length; },
    get signedAt() { return signedAt; },
    readWall(id) {
      if (Object.hasOwn(wallLocations,id)) wallsRead.add(id);
    },
    stamp(id,action) {
      if (stamped.has(id) || !stops.some(stop => stop.id === id && stop.action === action)) return false;
      stamped.add(id);
      return true;
    },
    sign(id) {
      if (!this.complete || signedAt || !Object.hasOwn(wallLocations,id)) return false;
      signedAt = id;
      return true;
    }
  };
}

export function explorationTotals(session) {
  return '集齐 ' + session.count + ' 枚任务印章，读到 ' + session.discovered + ' 则校园记忆。';
}

export function showExplorationBook(panel, session, compose) {
  const body = panel.show('校园探索手册', {subtitle:'初见校园', symbol:'book'});
  const sheet = node('section','explore-sheet');
  const heading = node('div','explore-heading');
  heading.append(pixelEmblem('book'), node('strong','',session.complete ? '三枚印章已集齐' : '我的校园任务'),
    node('span','explore-count',session.count + ' / ' + session.total));
  sheet.append(heading, node('p','explore-intro',session.complete ? explorationTotals(session) :
    '在校园里做三件小事，每做一件，手册就添一枚印章。你可以从任一处出发。'));
  const list = node('ul','explore-stops');
  for (const stop of stops) {
    const done = session.hasStamp(stop.id);
    const row = node('li',done ? 'is-visited' : '');
    const copy = node('div');
    copy.append(node('strong','',stop.title), node('small','',stop.hint));
    row.append(pixelEmblem(stop.art),copy);
    if (done) {
      const stamp = node('img','explore-stamp');
      stamp.src = asset('assets/memories/exploration-seal.png');
      stamp.alt = stop.title + '，已盖章';
      row.append(stamp);
    }
    list.append(row);
  }
  sheet.append(list);
  if (session.signedAt) {
    sheet.append(node('p','explore-signed','✓ 初见校园已完成 · 我的痕迹留在了' + wallLocations[session.signedAt].name + '。'));
  } else if (session.complete) {
    sheet.append(button('留下我的痕迹',compose,'primary','mark'));
  }
  sheet.append(button(session.count ? '继续漫游' : '出发探索',()=>panel.close(),'secondary','foot'));
  body.append(sheet);
}
