import {places,spawn,WIDTH,HEIGHT,westCampusWidth,tongzhouX,baotaRoad,campusNameAt,entrance,drawAtlas,plaza,inShape} from './layout.js';
import {createWorld} from './world.js';
import {createEvents} from './events.js';
import {emblemForPlace, pixelEmblem} from './place-emblems.js';
import {createRecords,recordTime} from './records.js';
import {AudioManager} from './audio.js';
import {icon,node,button} from './dom.js';
import {findRoute} from './navigation.js';
import {setupIdentity} from '../src/profile-ui.js';
import {makeProfileStore} from '../src/profile.js';
import {getImage} from './scenery.js';
import {startCampusScene} from './campus-scene.js';
import {createMemoryLayer,taskBoard} from './memories/map.js';
import {openTaskBoard} from './tasks/panel.js';
import {createAlbum} from './memories/album.js';
import {createMemoryWall} from './memories/wall.js';
import {createExplorationSession, showExplorationBook} from './memories/exploration.js';
import {readEntries} from './memories/store.js';
import {asset} from '../src/characters.js';
import {createGardenStore} from './garden/store.js';
import {openGarden} from './garden/panel.js';
import {plotAt,plotLabel,flowerName} from './garden/plots.js';

const $=id=>document.getElementById(id);
const shell=$('game-shell'),canvas=$('campus-view'),dialog=$('panel'),mini=$('mini-map');
const placesById=new Map(places.map(p=>[p.id,p]));
const audio=new AudioManager(),records=createRecords();
let world,events,state={...spawn,near:null},target=null,route=[],routeOrigin=null;
let returnTo=null,backHandler=null,toastTimer,sceneTimer,sceneMode=null,mapSelection=null,zoom=1;
let feedbackCount=0;
let identityLocked=true;
const memoryLayer=createMemoryLayer();
let redrawGarden;
const garden=createGardenStore(() => redrawGarden?.());
let memoryEntries=[],memoryLoad=0,leavePanel=null;
const clickFeedback=new WeakMap();
function playFeedback(event,placeId){
  feedbackCount++;
  audio.emit(event,placeId);
}
document.addEventListener('click',e=>{
  if(e.target.closest?.('button'))clickFeedback.set(e,feedbackCount);
},true);
document.addEventListener('click',e=>{
  if(clickFeedback.get(e)===feedbackCount)playFeedback('click');
});
for(const el of document.querySelectorAll('[data-icon]'))el.prepend(icon(el.dataset.icon));
for(const type of ['pointerdown','keydown'])window.addEventListener(type,()=>{
  if(!audio.started||audio.ctx?.state!=='running')audio.unlock();
  else audio.loops();
},{capture:true,passive:true});
function toast(message,ms=2800){
  clearTimeout(toastTimer);const el=$('toast');el.textContent=message;el.hidden=false;
  toastTimer=setTimeout(()=>el.hidden=true,ms);
}
const panel={
  show(title,{subtitle='',intro='',symbol='book',back=null,wide=false,albumArt='',canteenPage=false,taskPage=false,placeId='',backLabel='返回地点',onLeave=null}={}){
    leavePanel?.();leavePanel=onLeave;
    const opened=dialog.open;
    if(!opened){returnTo=document.activeElement;world?.setPaused(true);dialog.showModal();playFeedback('open',state.near?.id);}
    else if(title!==$('panel-title').textContent && symbol!=='check')playFeedback('click');
    dialog.classList.toggle('atlas',wide);dialog.scrollTop=0;
    dialog.classList.toggle('memory-panel',!!albumArt);
    dialog.classList.toggle('canteen-panel',canteenPage);
    dialog.classList.toggle('place-panel',Boolean(placeId || albumArt));
    const emblem = emblemForPlace(placeId,placesById.get(placeId)?.kind);
    dialog.dataset.placeTheme = emblem;
    dialog.classList.toggle('task-panel',taskPage);
    $('panel-title').textContent=title;$('panel-title').tabIndex=-1;
    $('panel-subtitle').textContent=subtitle;$('panel-subtitle').hidden=!subtitle;
    if(albumArt){const art=node('img');art.src=asset('assets/memories/'+albumArt+'.png');art.alt='';$('panel-symbol').replaceChildren(art);}
    else if(taskPage){const art=node('img');art.src=asset('assets/props/campus-message-board.png');art.alt='';$('panel-symbol').replaceChildren(art);}
    else $('panel-symbol').replaceChildren(placeId ? pixelEmblem(emblem) : icon(symbol));
    backHandler=back;$('panel-back').hidden=!back;$('panel-back').lastChild.textContent=backLabel;
    this.error('');
    const body=node('div');body.id='panel-body';$('panel-body').replaceWith(body);
    if(intro)body.append(node('p','intro',intro));
    $('panel-title').focus({preventScroll:true});
    return body;
  },
  error(message){$('panel-error').textContent=message;$('panel-error').hidden=!message;},
  close(){if(dialog.open){dialog.close();resumeMap();}}
};
function resumeMap(){
  if(dialog.open||!returnTo)return;
  leavePanel?.();leavePanel=null;
  const origin=returnTo;returnTo=null;
  playFeedback('close');world?.setPaused(!!sceneMode);
  if(origin.isConnected&&origin!==document.body&&origin.getClientRects().length)origin.focus({preventScroll:true});
  else canvas.focus({preventScroll:true});
  if (completionPending) openBook();
}
dialog.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.isComposing||!dialog.classList.contains('canteen-panel'))return;
  e.preventDefault();
  if(!e.repeat)backHandler?.();
});
dialog.addEventListener('cancel',e=>{
  e.preventDefault();
  if(dialog.classList.contains('canteen-panel') && backHandler)backHandler();
  else panel.close();
});
dialog.addEventListener('close',resumeMap);
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)panel.close();}});
$('panel-close').onclick=panel.close;$('panel-back').onclick=()=>backHandler?.();
function progress(){const entries=records.all();world?.setPoster(entries.some(r=>r.placeId==='library'&&r.eventId==='welcome'));const seen=new Set(entries.filter(r=>placesById.has(r.placeId)).map(r=>r.placeId));$('stamps').textContent=seen.size+'/'+places.length;return seen;}
const atlasBack=document.createElement('canvas');atlasBack.width=WIDTH/2;atlasBack.height=HEIGHT/2;
drawAtlas(atlasBack.getContext('2d'),atlasBack.width,atlasBack.height);
mini.height=Math.round(mini.width*HEIGHT/WIDTH);
mini.parentElement.style.setProperty('--west-map-share',((westCampusWidth+tongzhouX)/2/WIDTH*100)+'%');
const mapNames={pond:'一勺池',field:'田径场',plaza:'求是广场',gate:'东门','tz-fengyuan':'丰园食堂','tz-learning':'远见学习中心','tz-qiushi-4':'求实四楼'};
function paintMap(map,full=false){
  const g=map.getContext('2d'),w=map.width,h=map.height;
  const sx=w/WIDTH,sy=h/HEIGHT;
  g.clearRect(0,0,w,h);g.drawImage(atlasBack,0,0,w,h);
  if(target && route.length){
    g.save();g.lineJoin='round';g.strokeStyle='#fff1c6';g.lineWidth=full?6:4;g.beginPath();
    route.forEach((p,i)=>i?g.lineTo(p.x*sx,p.y*sy):g.moveTo(p.x*sx,p.y*sy));g.stroke();
    g.strokeStyle='#9c5431';g.lineWidth=full?3:2;g.setLineDash([5,3]);g.stroke();g.restore();
  }
  if(!full){
    g.fillStyle='#395541';
    for(const p of places){const e=entrance(p);g.fillRect(Math.round(e.x*sx)-2,Math.round(e.y*sy)-2,4,4);}
  }
  if(target){
    const q=entrance(target);g.strokeStyle='#fff2cb';g.lineWidth=full?4:2;g.fillStyle='#a3572e';g.beginPath();g.arc(q.x*sx,q.y*sy,full?8:7,0,Math.PI*2);g.fill();g.stroke();
  }
  const x=state.x*sx,y=state.y*sy,r=full?8:7;
  g.save();g.translate(x,y);g.rotate(Math.PI/4);g.fillStyle='#a74031';g.strokeStyle='#fff6d9';g.lineWidth=full?3:2.5;g.fillRect(-r,-r,r*2,r*2);g.strokeRect(-r,-r,r*2,r*2);g.restore();
}
function setTarget(p){
  target=p;route=p?findRoute(state,p):[];routeOrigin={x:state.x,y:state.y};
  world?.setDestination(p?.id||null);
  const trip=$('trip');trip.replaceChildren();trip.hidden=!p;
  if(p){
    const cancel=button('',()=>{setTarget(null);toast('已取消目的地');},'','close');cancel.setAttribute('aria-label','取消目的地');
    trip.append(icon('target'),node('span','','前往'+p.name),cancel);
  }
  paintMap(mini);
}
function openAtlas(){
  let selected=target||state.near||mapSelection||places[0];
  const body=panel.show('校园导览图',{subtitle:'中关村校区 · 通州校区',symbol:'map',wide:true});
  const layout=node('div','atlas-layout'),scroll=node('div','atlas-scroll'),chart=node('div','atlas-chart'),map=node('canvas');
  map.width=atlasBack.width;map.height=atlasBack.height;map.setAttribute('aria-label','中关村与通州校区连续导览图');
  chart.style.aspectRatio=WIDTH+' / '+HEIGHT;chart.append(map);scroll.append(chart);
  const pins=[],chips=[],groups=new Map(),action=node('div','atlas-action');
  const choose=p=>{
    selected=p;mapSelection=p;
    for(const item of [...pins,...chips])item.setAttribute('aria-pressed',String(item.dataset.place===p.id));
    if(chart.clientWidth>scroll.clientWidth)scroll.scrollLeft=entrance(p).x/WIDTH*chart.clientWidth-scroll.clientWidth/2;
    const copy=node('div');copy.append(node('b','',p.name),node('p','',state.near?.id===p.id?'你已在地点附近':'沿地图上的路线步行前往'));
    const pick=button('设为目的地',()=>{setTarget(selected);panel.close();toast('已标记'+selected.name);},'primary','target');pick.dataset.action='set-destination';
    const picture=world.postcard?.(p);action.replaceChildren();
    if(picture){picture.className='atlas-print';picture.setAttribute('aria-label',p.name+'图鉴');action.append(picture);}
    action.append(copy,pick);
  };
  for(const p of places){
    const e=entrance(p),pin=button('',()=>choose(p),'map-pin');
    pin.dataset.place=p.id;pin.title=p.name;pin.setAttribute('aria-label',p.name);pin.style.left=e.x/WIDTH*100+'%';pin.style.top=e.y/HEIGHT*100+'%';chart.append(pin);pins.push(pin);
    const nameplate=node('span','atlas-name',p.id==='bus-stop'?'公交站':mapNames[p.id]||p.name);pin.append(nameplate);
    if(mapNames[p.id])pin.classList.add('landmark-pin');
    if(p.id==='qiushi'||p.id==='gate')pin.classList.add('flip-pin');
    const campus=campusNameAt(p.x);
    if(!groups.has(campus)){
      const section=node('section','atlas-region'),list=node('div','atlas-locations');
      section.append(node('h3','',campus),list);groups.set(campus,{section,list});
    }
    const chip=button(p.name,()=>choose(p),'site-chip');chip.dataset.place=p.id;groups.get(campus).list.append(chip);chips.push(chip);
  }
  const legend=node('div','atlas-legend');
  for(const [name,cls] of [['你的位置','player-dot'],['互动地点','site-dot']]){const item=node('span');item.append(node('i',cls),name);legend.append(item);}
  layout.append(scroll,legend,action,...Array.from(groups.values(),g=>g.section));body.append(layout);paintMap(map,true);choose(selected);
}
function openJournal(){
  const body=panel.show('漫游手册',{subtitle:'个人足迹',symbol:'book'}),entries=records.all(),seen=progress();
  const summary=node('div','journal-summary');summary.append(node('span','','已留足迹的地点'),node('b','',seen.size+' / '+places.length));
  const bar=node('div','journal-progress'),fill=node('i');fill.style.width=seen.size/places.length*100+'%';bar.append(fill);body.append(summary,bar);
  if(!entries.length){body.append(node('p','empty-note','手册还是空白的。在一勺池拍张照片，或到藏书馆选一本书，就能留下第一页足迹。'),button('在地图中查看地点',openAtlas,'secondary','map'));return;}
  for(const e of entries){
    const placeName=placesById.get(e.placeId)?.name ?? '往日足迹';
    const row=node('article','journal-entry');row.append(node('b','',placeName+' · '+e.title),node('small','',recordTime(e.time)),node('p','',e.detail));
    if(e.photo && /^data:image\/(jpeg|png|webp);base64,/.test(e.photo)){const img=node('img');img.src=e.photo;img.alt=placeName+'个人留影';row.append(img);}body.append(row);
  }
}
function openSettings(){
  const body=panel.show('声音与画面',{symbol:'settings'});
  const mute=button('',()=>{
    audio.set('muted',!audio.preferences.muted);mute.querySelector('span').textContent=audio.preferences.muted?'开启声音':'一键静音';mute.setAttribute('aria-pressed',String(audio.preferences.muted));
  },'secondary','sound');
  mute.querySelector('span').textContent=audio.preferences.muted?'开启声音':'一键静音';mute.setAttribute('aria-pressed',String(audio.preferences.muted));body.append(mute);
  for(const [id,name] of [['master','总音量'],['music','背景音乐'],['ambient','校园环境'],['effects','动作与互动']]){
    const label=node('label','sound-row'),input=node('input'),out=node('output');input.type='range';input.min='0';input.max='100';input.value=Math.round(audio.preferences[id]*100);out.textContent=input.value+'%';
    input.addEventListener('input',()=>{audio.set(id,Number(input.value)/100);out.textContent=input.value+'%';});label.append(node('span','',name),input,out);body.append(label);
  }
  const group=node('div','settings-block'),scale=node('span','',Math.round(zoom*100)+'%');
  const change=d=>{zoom=Math.max(.8,Math.min(1.5,Math.round((zoom+d)*10)/10));world.setZoom(zoom);scale.textContent=Math.round(zoom*100)+'%';};
  group.append(node('span','muted','场景缩放　'),scale,button('缩小',()=>change(-.1),'secondary','minus'),button('放大',()=>change(.1),'secondary','plus'));body.append(group);
}
function openHelp(){
  const body=panel.show('操作指南',{intro:'从求是广场出发。走近有名称牌的地点，看见头顶的感叹号后即可互动。',symbol:'compass'});
  for(const [key,what] of [['WASD / 方向键','向四周行走'],['E / 互动按钮','打开附近地点、时光气泡或拾光展板'],['P / 拾光栏','在脚下留下照片或文字，保存在本机相册'],['M / 地图','浏览地图并标记目的地'],['J / 漫游手册','回看照片、收藏和记录'],['Esc / 关闭','离开窗口继续散步']]){
    const row=node('div','guide-row');row.append(node('b','',key),node('span','',what));body.append(row);
  }body.append(node('p','muted','触屏可按住左下方向键移动。食堂、教室和系统活动采用游戏演示内容。'));
}
function scene(name,duration=1000){
  clearTimeout(sceneTimer);world.setAction(name);
  if(duration)sceneTimer=setTimeout(()=>{if(!sceneMode)world.setAction(null);},duration);
}
function endScene(){sceneMode=null;scene(null,0);update(world.getState());}
function stay(name){sceneMode=name;scene(name,0);world.setPaused(true);update(world.getState());
  toast(name==='cat'?'一阵风吹来，跳跳追着落叶跑过草地。':'你在草坪旁坐下，风正从树间穿过。',3300);
}
function leaveScene(){world.setPaused(false);endScene();canvas.focus({preventScroll:true});}
function locationName(s){
  const closest=s.near||places.reduce((best,p)=>{const e=entrance(p),d=Math.hypot(e.x-s.x,e.y-s.y);return d<best.d?{p,d}:best;},{p:null,d:160}).p;
  let here=inShape(plaza,s.x,s.y)?plaza.name:closest?(s.near?closest.name:(closest.id==='pond'?'一勺池畔':closest.name+'附近')):'校园步道';
  if(s.x>=westCampusWidth && s.x<tongzhouX)here='校际草地';
  else if(!s.near && s.x>=baotaRoad.x && s.y>=baotaRoad.y && s.y<=baotaRoad.y+baotaRoad.h)here='宝塔山路';
  return here;
}
function update(s){
  state=s;shell.dataset.action=s.action||'';shell.dataset.x=String(Math.round(s.x));shell.dataset.y=String(Math.round(s.y));shell.dataset.near=s.near?.id||'';shell.dataset.moving=String(!!s.moving);
  const campus=campusNameAt(s.x),here=locationName(s);
  if($('campus-name').textContent!==campus)$('campus-name').textContent=campus;
  if($('here').textContent!==here)$('here').textContent=here;
  const options=nearbyOptions(s);
  const interact=$('interact'),label=sceneMode?(sceneMode==='sit'?'起身继续漫游':'结束观看'):(options.length>1?'选择附近互动':options[0]?.label || '');
  $('memory-open').disabled=identityLocked || !!sceneMode || s.action==='bus';
  interact.hidden=s.action==='bus'||!label;if(label && interact.dataset.label!==label){interact.dataset.label=label;interact.replaceChildren(node('kbd','','E'),node('span','',label));}
  if(target&&routeOrigin&&Math.hypot(s.x-routeOrigin.x,s.y-routeOrigin.y)>52){route=findRoute(s,target);routeOrigin={x:s.x,y:s.y};}
  paintMap(mini);
  if(target && s.near?.id===target.id && s.moving){const name=target.name;setTarget(null);toast('已到达'+name);}
}
const exploration = createExplorationSession();
const walls = createMemoryWall(panel, () => $('player-badge').querySelector('strong').textContent, exploration);
let introduced = false;
let completionPending = false;
function openBook() {
  completionPending = false;
  showExplorationBook(panel, exploration, () => walls.compose('plaza',openBook));
}
function openWall(placeId, back) {
  exploration.readWall(placeId);
  walls.showWall(placeId,back);
}
function awardTask(id,action,body) {
  if (!exploration.stamp(id,action)) return;
  completionPending = exploration.complete;
  if (body?.isConnected) {
    body.append(button('查看探索手册（' + exploration.count + '/3 枚印章）',openBook,'secondary explore-receipt','book'));
  } else if (!dialog.open && completionPending) {
    openBook();
  }
}
function fountainPortrait() {
  const s = world.getState();
  if (!memoryLayer.nearby(s.x,s.y).some(target => target.kind === 'wall')) return;
  album.fountainPortrait({x:s.x,y:s.y,campus:campusNameAt(s.x),place:'校园喷泉'}, world.fountainPortrait);
}
function mapTargetLabel(target){
  if(target.kind!=='bubble')return target.name;
  return target.entries.length>1?'查看 '+target.entries.length+' 则拾光':'查看时光气泡';
}
function openMapTarget(target){
  if(target.kind==='wall')openWall(target.placeId);
  else if(target===taskBoard)openTaskBoard(panel,profileStore,toast);
  else if(target.kind==='board')album.gallery();
  else album.group(target.entries);
}
function visitGarden(plot) {
  const stampFlower = () => awardTask('flower-garden','plant');
  redrawGarden=openGarden({panel,store:garden,initialPlot:plot,
    recordMyFlower:exploration.hasStamp('flower-garden') ? null : () => {
      stampFlower();
      toast('你的花已记入探索手册。');
    },
    onChange(action,id,flower){
    const label=plotLabel(id), name=flowerName(flower);
    const text=action==='remove' ? label+' 的花已铲掉，你可以重新选格种花了。' :
      action==='replace' ? label+' 的花已换成'+name+'。' : '你在 '+label+' 种下了一朵'+name+'。';
    try { records.save('flower-garden','plant','种一朵你的花',text); progress(); } catch { /* The flower is already saved. */ }
    const earned = action==='plant' && !exploration.hasStamp('flower-garden');
    if (earned) stampFlower();
    toast(earned ? text+' 探索手册已盖章。' : text);
  }});
}
function nearbyOptions(s){
  const targets=memoryLayer.nearby(s.x,s.y);
  const options=targets.map(target=>({label:mapTargetLabel(target),open:()=>openMapTarget(target)}));
  if (targets.some(target => target.kind === 'wall')) options.unshift({label:'和喷泉合影',open:fountainPortrait});
  if(s.near?.id==='flower-garden'){
    options.push({label:'种一朵你的花',open:()=>visitGarden(plotAt(s.x,s.y))});
  } else if(s.near){
    const label=s.near.kind==='transit' ? s.near.name+'乘车' : '探索'+s.near.name;
    options.push({label,open:()=>events.openPlace(s.near)});
  }
  return options;
}
function interactNearby(){
  if(identityLocked||dialog.open||sceneMode||world.getState().action==='bus')return;
  const options=nearbyOptions(world.getState());
  if(options.length===1){options[0].open();return;}
  if(options.length>1){
    const body=panel.show('附近的互动',{symbol:'pin',placeId:world.getState().near?.id || 'plaza'}),list=node('div','album-list');
    for(const item of options)list.append(button(item.label,item.open,'choice','right'));
    body.append(list);
  }
}
const album=createAlbum(panel,toast,(entry,removedId)=>{
  memoryLoad++;
  memoryEntries=memoryEntries.filter(row=>row.id!==(entry?.id??removedId));
  if(entry)memoryEntries.push(entry);
  memoryLayer.setEntries(memoryEntries);
  update(world.getState());
});
async function refreshMemories(){
  const ticket=++memoryLoad;
  try{
    const entries=await readEntries(() => {
      if(ticket===memoryLoad)toast('本机相册暂时无法读取，现展示校园演示拾光。');
    });
    if(ticket!==memoryLoad)return;
    memoryEntries=entries;memoryLayer.setEntries(entries);
    if(world)update(world.getState());
  }catch{if(ticket===memoryLoad)toast('本机相册读取失败，请检查浏览器存储权限。');}
}
function editMemory(){
  const s=world.getState();
  if(identityLocked||dialog.open||sceneMode||s.action==='bus')return;
  album.edit({x:s.x,y:s.y,campus:campusNameAt(s.x),place:locationName(s)});
}
events=createEvents({panel,records,scene,openWall,awardTask,postcard:p=>world?.postcard?.(p),tone:i=>playFeedback('note-'+i),feedback:event=>playFeedback(event,state.near?.id),onRecord:progress,stay,
  rideBus(destination,arrived){
    setTarget(null);
    const started=world.rideBus(destination.id,()=>toast(arrived(),3600));
    toast(started?'开往'+destination.name+'的巴士正在进站':'请走近公交站候车');
  },
  capture:()=>{const thumb=document.createElement('canvas');const scale=Math.min(1,800/canvas.width);thumb.width=Math.round(canvas.width*scale);thumb.height=Math.round(canvas.height*scale);thumb.getContext('2d').drawImage(canvas,0,0,thumb.width,thumb.height);return thumb.toDataURL('image/jpeg',.8);}
});
world=createWorld(canvas,{memoryLayer,garden,startScene:startCampusScene,onUpdate:update,onInteract:interactNearby,onStep:foot=>audio.emit('step-'+foot),onRange:p=>{
  if(p)audio.emit('range',p.id);
  if(p?.id==='flower-garden')refreshGarden();
}});
function refreshGarden() {
  if (!identityLocked && !document.hidden) garden.refresh().catch(()=>{});
}
window.addEventListener('focus',refreshGarden);
function lockIdentity(locked) {
  identityLocked=locked;world.setIdentityLocked(locked);
  $('exploration-open').disabled = locked;
  if (!locked) {
    refreshGarden();
    if (!introduced) {
      introduced = true;
      openBook();
    }
  }
  update(world.getState());
}
lockIdentity(true);
const profileStore = makeProfileStore();
try {
  const saved = profileStore.read();
  if (saved) world.useCharacter(saved.characterId);
} catch {
  // The registration dialog handles unavailable browser storage when it opens.
}
world.ready.then(()=>{
  setupIdentity({getImage, useCharacter:id=>world.useCharacter(id), lockIdentity, store:profileStore});
});
progress();
const cameraIcon=node('img');cameraIcon.src=asset('assets/memories/camera.png');cameraIcon.alt='';$('memory-open').prepend(cameraIcon);
$('memory-open').onclick=editMemory;
$('exploration-open').onclick=openBook;
refreshMemories();
window.addEventListener('focus',refreshMemories);
canvas.addEventListener('click',event=>{
  if(identityLocked||dialog.open||sceneMode||world.getState().action==='bus')return;
  const hit=world.hitMemory(event.clientX,event.clientY);
  if(!hit){
    const plot=world.hitFlowerPlot(event.clientX,event.clientY);
    if(plot!==null){
      if(state.near?.id==='flower-garden')visitGarden(plot);
      else toast('走到崇德楼北侧的花园，就可以选格种花。');
    }
    return;
  }
  const {x,y}=world.getState();
  if(memoryLayer.nearby(x,y).includes(hit))openMapTarget(hit);
  else if(hit===taskBoard)toast('走到任务栏前，可以记录和完成自己的任务。');
  else toast(hit.kind==='board'?'走近展板即可翻看演示与本机照片':'走近气泡即可阅读拾光');
});
$('atlas-open').onclick=openAtlas;$('mini-open').onclick=openAtlas;$('journal-open').onclick=openJournal;$('settings-open').onclick=openSettings;$('help-open').onclick=openHelp;
$('interact').onclick=()=>{if(sceneMode)return leaveScene();interactNearby();};
$('full-open').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await shell.requestFullscreen();}catch{toast('此窗口无法进入全屏，请在系统浏览器中打开。');}};
document.addEventListener('fullscreenchange',()=>{const on=!!document.fullscreenElement,btn=$('full-open');btn.replaceChildren(icon(on?'shrink':'expand'));btn.title=on?'退出全屏':'进入全屏';btn.setAttribute('aria-label',btn.title);});
window.addEventListener('keydown',e=>{
  if(identityLocked||e.repeat||e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||dialog.open)return;
  if(sceneMode&&['KeyE','Escape','KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowRight','ArrowDown'].includes(e.code)){e.preventDefault();leaveScene();return;}
  if(e.code==='KeyP'&&!e.isComposing){e.preventDefault();editMemory();return;}
  if(e.code==='KeyM'||e.code==='KeyJ'){e.preventDefault();(e.code==='KeyM'?openAtlas:openJournal)();}
});
for(const b of document.querySelectorAll('[data-dir]')){
  const d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[b.dataset.dir];
  b.addEventListener('pointerdown',e=>{e.preventDefault();if(identityLocked||dialog.open)return;if(sceneMode)leaveScene();b.setPointerCapture(e.pointerId);world.setMove(...d);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>world.setMove(0,0));
}
window.addEventListener('storage',()=>{progress();if(dialog.open&&$('panel-title').textContent==='漫游手册')openJournal();});
