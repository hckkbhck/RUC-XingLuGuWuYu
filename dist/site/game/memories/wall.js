import {button, node} from '../dom.js';
import {asset} from '../../src/characters.js';
import {wallLocations, wallPhotoPath} from './wall-data.js';
import {explorationTotals} from './exploration.js';

const dateFormat = new Intl.DateTimeFormat('zh-CN', {
  year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false
});

function photoImage(key, description) {
  const img = node('img');
  img.src = asset(wallPhotoPath(key));
  img.alt = description;
  img.width = 336;
  img.height = 224;
  return img;
}

export function createMemoryWall(panel, getNickname, exploration) {
  const additions = new Map();

  function showWall(placeId, back, {published = false, finished = false} = {}) {
    const place = wallLocations[placeId];
    const title = finished ? '初见校园已完成' : place.name;
    const body = panel.show(title, {subtitle:place.name + ' · 地点涂鸦墙', albumArt:'exhibit-board', back});
    if (finished) {
      const note = node('section','explore-note');
      note.setAttribute('role','status');
      note.append(node('strong','',explorationTotals(exploration)),node('p','','你把自己的故事留在了' + place.name + '，就在下面的第一张。'));
      body.append(note);
    }
    const entries = [...(additions.get(placeId) || []), ...place.entries];
    const pinboard = node('div','album-wall trace-board');
    const toolbar = node('div','trace-toolbar');
    const count = node('strong','', '共 ' + entries.length + ' 则痕迹');
    const write = button('留下我的痕迹', () => compose(placeId, () => showWall(placeId,back), back), 'primary', 'mark');
    toolbar.append(count, write);
    body.append(toolbar);
    if (published && !finished) {
      const status = node('p','trace-success','已贴到墙上，你的痕迹排在第一张。');
      status.setAttribute('role','status');
      body.append(status);
    }
    for (const entry of entries) {
      const card = node('figure','album-print trace-card');
      const caption = node('figcaption');
      const credit = node('div','trace-credit');
      const time = node('time','',dateFormat.format(new Date(entry.time)));
      time.dateTime = entry.time;
      credit.append(node('strong','',entry.nickname), time);
      caption.append(node('p','trace-story',entry.text), credit);
      card.append(photoImage(entry.photo, place.photos[entry.photo]), caption);
      pinboard.append(card);
    }
    body.append(pinboard);
  }

  function compose(placeId, cancel, back) {
    const body = panel.show('留下我的痕迹', {
      subtitle:'校园拾光', albumArt:'camera', back:cancel, backLabel:'返回上一页'
    });
    const form = node('form','trace-form');
    const placeLabel = node('label','','发布地点');
    const location = node('select');
    location.name = 'place';
    for (const [id,place] of Object.entries(wallLocations)) location.add(new Option(place.name,id));
    location.value = placeId;
    placeLabel.append(location);
    const nameLabel = node('label','','昵称');
    const name = node('input');
    name.name = 'nickname'; name.required = true; name.maxLength = 24;
    name.autocomplete = 'nickname'; name.value = getNickname() || '';
    nameLabel.append(name);
    const textLabel = node('label','','想留在这里的话');
    const text = node('textarea');
    text.name = 'story'; text.required = true; text.maxLength = 280; text.rows = 3;
    textLabel.append(text);
    const choices = node('fieldset','trace-photos');
    function updatePhotos() {
      choices.replaceChildren(node('legend','','选择一张地点照片'));
      for (const [key, description] of Object.entries(wallLocations[location.value].photos)) {
        const label = node('label','trace-choice');
        const radio = node('input');
        radio.type = 'radio'; radio.name = 'photo'; radio.value = key;
        radio.checked = choices.querySelector('input') === null;
        label.append(radio, photoImage(key,''), node('span','',description));
        choices.append(label);
      }
    }
    location.onchange = updatePhotos;
    updatePhotos();
    const actions = node('div','album-actions');
    const submit = node('button','primary','发布'); submit.type = 'submit';
    actions.append(node('small','album-hint','新痕迹仅在本次游玩中保留。'), button('取消',cancel,'secondary'), submit);
    form.append(placeLabel, choices, nameLabel, textLabel, actions);
    form.onsubmit = event => {
      event.preventDefault();
      if (!name.value.trim() || !text.value.trim()) {
        panel.error('请填写昵称，并写下想留在这里的话。');
        (name.value.trim() ? text : name).focus();
        return;
      }
      const entry = {nickname:name.value.trim(), text:text.value.trim(), photo:form.elements.photo.value, time:new Date().toISOString()};
      const destination = location.value;
      if (!additions.has(destination)) additions.set(destination, []);
      additions.get(destination).unshift(entry);
      showWall(destination, destination === placeId ? back : null, {published:true, finished:exploration.sign(destination)});
    };
    body.append(form);
  }
  return {showWall, compose};
}
