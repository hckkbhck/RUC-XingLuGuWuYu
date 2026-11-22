import {button, node} from '../dom.js';
import {schoolServiceLink} from '../school-services.js';
import {asset, avatarSources} from '../../src/characters.js';
import {makeProfileStore} from '../../src/profile.js';
import {dishGroups} from './dishes.js';
import {mountDishReviews} from './review-form.js';

const artWidth = 1597, artHeight = 985;
const profileStore = makeProfileStore();
const sectionArt = {
  '菜品介绍':[537,177,345,75], '同学评价':[120,451,348,71], '写评价':[121,731,334,74]
};

function sprite(sheet, [x,y,w,h], className = '') {
  const el = node('span','recipe-sprite ' + className);
  el.setAttribute('aria-hidden','true');
  el.style.aspectRatio = w + '/' + h;
  el.style.backgroundImage = 'var(--recipe-' + sheet + ')';
  el.style.backgroundSize = (artWidth/w*100) + '% ' + (artHeight/h*100) + '%';
  el.style.backgroundPosition = (x/(artWidth-w)*100) + '% ' + (y/(artHeight-h)*100) + '%';
  return el;
}

function placeOnMenu(el, [x,y,w,h]) {
  for (const [prop,val] of [['left',x/artWidth],['top',y/artHeight],['width',w/artWidth],['height',h/artHeight]]) {
    el.style.setProperty('--menu-' + prop, val*100 + '%');
  }
}

function page(panel, title, mode, back, onLeave) {
  const body = panel.show(title,{symbol:'food',canteenPage:true,back,onLeave});
  const sheet = node('div','recipe-page recipe-' + mode);
  for (const [key,file] of [['menu','menu'],['detail','dish']]) {
    const url = new URL(asset('assets/canteen/' + file + '.jpg'), document.baseURI);
    sheet.style.setProperty('--recipe-' + key,'url("' + url.href + '")');
  }
  body.append(sheet);
  return sheet;
}

function heading(text, className, level = 'h3') {
  const el = node(level,className);
  el.append(node('span','visually-hidden',text));
  return el;
}

function section(title, className) {
  const box = node('section','recipe-box ' + className);
  const label = heading(title,'recipe-badge');
  label.append(sprite('detail',sectionArt[title]));
  box.append(label);
  return box;
}

function reviewRow(review) {
  const row = node('li','recipe-review');
  let portrait;
  if (review.portrait) portrait = sprite('detail',review.portrait,'recipe-avatar');
  else if (Object.hasOwn(avatarSources,review.avatarId)) {
    portrait = node('img','recipe-avatar'); portrait.alt = ''; portrait.src = asset(avatarSources[review.avatarId]);
  } else portrait = node('span','recipe-initial',review.nickname.slice(0,1));
  const author = node('b','',review.nickname);
  if(review.local) author.append(node('small','recipe-local-label','仅本机'));
  row.append(portrait,author,node('div','review-text',review.text));
  return row;
}

function showDish(panel, dish, back) {
  const lifetime = new AbortController();
  const sheet = page(panel,dish.name,'detail',back,()=>lifetime.abort());
  const header = node('header','recipe-heading');
  const arrow = button('返回每日菜谱',back,'recipe-back');
  arrow.append(sprite('detail',[70,71,104,80]));
  const title = node('h2','',dish.name);
  title.tabIndex = -1;
  const flower = () => sprite('detail',[542,65,123,89],'recipe-flower');
  header.append(arrow,flower(),title,flower());
  const info = section('菜品介绍','recipe-info');
  const pic = dish.id === 'cinnamon-roll' ? sprite('detail',[165,176,317,232],'recipe-food') : sprite('menu',dish.plate,'recipe-food');
  const [, , plateWidth, plateHeight] = dish.plate;
  pic.style.setProperty('--food-aspect', dish.id === 'cinnamon-roll' ? 317/232 : plateWidth/plateHeight);
  const copy = node('div','recipe-copy');
  for (const line of [dish.description,dish.price,dish.counter].filter(Boolean)) copy.append(node('p','',line));
  info.append(pic,copy);

  const comments = section('同学评价','recipe-comments');
  const compose = section('写评价','recipe-compose');
  mountDishReviews({dish,comments,compose,reviewRow,profileStore,signal:lifetime.signal});
  sheet.append(header,info,comments,compose); title.focus({preventScroll:true});
}

export function openCanteenHome(panel, {collect,last,visitWall,onReadMenu}) {
  function home(returning = false) {
    const sheet = page(panel,'中区食堂','home',panel.close);
    const header = node('header','recipe-heading');
    const title = node('h2','','中区食堂');
    title.tabIndex = -1;
    const flower = () => sprite('detail',[542,65,123,89],'recipe-flower');
    header.append(flower(),title,flower());
    const close = button('回到校园',panel.close,'recipe-home-close');
    close.setAttribute('aria-label','回到校园');
    close.replaceChildren(sprite('menu',[1432,75,104,99]));
    const spread = node('div','recipe-home-spread');
    const facade = node('div','recipe-facade');
    const building = node('img');
    building.src = asset('assets/landmarks/中区食堂贴图.png'); building.alt = '中区食堂正门';
    facade.append(building);
    const options = node('div','option-list recipe-home-options');
    const daily = button('每日菜谱',()=>openCanteenMenu(panel,{back:()=>home(true),collect,onReadMenu}),'recipe-home-option','food');
    options.append(daily,schoolServiceLink('canteen','recipe-home-option'));
    options.append(button('查看校园拾光',visitWall,'recipe-home-option','camera'));
    spread.append(facade,options);
    const grain = sprite('detail',[1144,201,324,188],'recipe-home-paper');
    sheet.append(grain,header,close,spread);
    if(last) sheet.append(node('p','recipe-footprint','上次足迹　'+last));
    (returning ? daily : title).focus({preventScroll:true});
  }
  home();
}

function openCanteenMenu(panel, {back,collect,onReadMenu}) {
  function showMenu(selected) {
    const sheet = page(panel,'中区食堂 · 当日菜谱','menu',back);
    const header = heading('中区食堂 · 当日菜谱','recipe-menu-title','h2');
    header.tabIndex = -1;
    const close = button('关闭菜谱',panel.close,'recipe-close menu-hotspot');
    placeOnMenu(close,[1431,75,106,98]);
    sheet.append(header,close);
    let focus = header;
    for (const group of dishGroups) {
      const groupBox = node('section','recipe-group');
      groupBox.setAttribute('aria-label',group.name);
      const label = heading(group.name,'recipe-group-label');
      label.append(sprite('menu',group.plaque)); groupBox.append(label);
      for (const dish of group.dishes) {
        const pick = button(dish.name,()=>showDish(panel,dish,()=>showMenu(dish.id)),'recipe-pick menu-hotspot');
        pick.setAttribute('aria-label',dish.name);
        placeOnMenu(pick,dish.label);
        pick.prepend(sprite('menu',dish.plate,'recipe-plate'));
        groupBox.append(pick);
        if (selected === dish.id) focus = pick;
      }
      sheet.append(groupBox);
    }
    const save = button('记下今日菜单',()=>collect(dishGroups.flatMap(group=>group.dishes.map(dish=>dish.name))),'recipe-save','mark');
    const leave = button('返回中区食堂',back,'recipe-leave menu-hotspot');
    leave.setAttribute('aria-label','返回中区食堂');
    placeOnMenu(leave,[1163,811,326,76]);
    sheet.append(save,leave);
    onReadMenu(sheet.parentElement);
    focus.focus();
  }
  showMenu();
}
