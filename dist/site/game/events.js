import {node,button,icon} from './dom.js';
import {descriptions,selections,classrooms,menus} from './content.js';
import {activityDemo} from './activity.js';
import {recordTime} from './records.js';
import {stationDestinations, stationName} from './transit.js';
import {openCanteenHome} from './canteen/menu.js';
import {schoolServiceLink} from './school-services.js';
import {fitPhoto} from './photo.js';

function option(label, symbol, fn, note) {
  const b = button(label,fn,'option-row',symbol);
  if (note) b.append(node('small','option-note',note));
  b.append(icon('right'));
  return b;
}
export function createEvents({panel,records,scene,capture,postcard,tone,feedback,onRecord,stay,rideBus,openWall,awardTask}) {
  function openPlace(place) {
    const id = place.id;
    const visitWall = () => openWall(id, () => openPlace(place));
    const menu = () => {
      const body=panel.show(place.name,{symbol:'pin',placeId:id}),intro=node('div','place-intro');
      const picture=postcard(place);if(picture){picture.className='place-print';picture.setAttribute('aria-label',place.name+'图鉴');intro.append(picture);}
      intro.append(node('p','intro',descriptions[id]));body.append(intro);return body;
    };
    const view = (title,intro,symbol = 'book') => panel.show(title,{subtitle:place.name,intro,symbol,placeId:id,back:() => openPlace(place)});
    function success(eventId,title,detail,photo = '') {
      let row;
      try { row = records.save(id,eventId,title,detail,photo); }
      catch {
        panel.error('浏览器未能保存。请检查本地存储空间或浏览器权限，然后重试。');
        feedback('error'); return false;
      }
      feedback('success'); onRecord();
      const body = view(title,null,'check');
      const stamp = node('div','result-stamp'); stamp.append(icon('check'),node('strong','','已记入漫游手册'));
      body.append(activityDemo(id,eventId,detail),stamp,node('p','result-detail',detail));
      if (photo) { const img = node('img','photo-preview'); img.src=photo; img.alt=place.name+'的留影'; body.append(img); }
      body.append(node('p','record-time',recordTime(row.time)),button('回到校园',panel.close,'primary','right'));
      return true;
    }
    const photoView = () => {
      const body = view('拍照打卡','拍摄游戏画面，或选择本机照片，直接收入这台设备的漫游手册。','camera');
      const prev = records.last(id,'photo');
      const picker = node('input','visually-hidden'); picker.type='file'; picker.accept='image/*'; picker.tabIndex=-1;
      const preview = node('div','photo-stage');
      let token=0;
      const savePhoto=data=>success('photo','打卡成功',place.name+' · 个人留影',data);
      picker.addEventListener('change',async () => {
        const file = picker.files[0]; if (!file) return;
        const request = ++token; picker.value=''; 
        preview.replaceChildren(node('p','muted','正在读取照片…'));
        try { const data=await fitPhoto(file); if(request===token && body.isConnected) savePhoto(data); }
        catch { if(request===token && body.isConnected){ preview.replaceChildren(); panel.error('这张图片无法打开，请重新选择 JPG、PNG 或 WebP 图片。'); } }
      });
      if (prev?.photo) { const img=node('img','photo-preview'); img.alt='上一次打卡照片'; img.src=prev.photo; preview.append(img,node('small','record-time','上次打卡 · '+recordTime(prev.time))); }
      else preview.append(icon('camera'),node('span','','照片预览'));
      const controls=node('div','button-pair');
      controls.append(button('选择本机照片',()=>picker.click(),'secondary','camera'),button('拍摄游戏画面',()=>{
        ++token;
        try { savePhoto(capture()); }
        catch { panel.error('无法拍摄当前画面，请选择本机照片。'); }
      },'secondary','sun'));
      body.append(preview,picker,controls);
    };
    function choices(body,def) {
      body.append(node('p','intro',def.prompt));
      const group=node('div','choice-list'); group.setAttribute('aria-label',def.name);
      def.options.forEach((label,i)=>{
        const b=button(label,()=>success('choice',def.result,label),'choice');
        if(def.swatches){const colors=node('div','swatches');for(const color of def.swatches[i]){const s=node('i');s.style.background=color;colors.append(s);}b.prepend(colors);}
        group.append(b);
      });
      body.append(group);
    }
    function info(mode) {
      const names={free:'模拟自习时段',classes:'查看课表',menu:'当日菜谱'};
      const body=view(names[mode],null,mode==='menu'?'food':'grid');
      const date=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(new Date());
      body.append(node('p','data-note',date+'　·　校园模拟数据'));
      body.prepend(activityDemo(id,mode));
      if (mode==='menu') {
        const items=menus[new Date().getDay()];
        ['时蔬窗口','热菜窗口','汤粥窗口'].forEach((s,i)=>{const row=node('div','data-row');row.append(node('span','muted',s),node('strong','',items[i]));body.append(row);});
        body.append(button('记下今日菜单',()=>success(mode,'菜单已收录',items.join('、')),'primary','mark'));
      } else {
        for(const [room,free,time,course] of classrooms[id]) {
          const row=node('div','data-row');row.append(node('strong','',room),node('span','',mode==='free'?free+' 可自习':course+'　'+time));body.append(row);
        }
        if(mode==='free')body.append(button('收藏自习信息',()=>success('free','自习信息已收藏',classrooms[id].map(r=>r[0]+' '+r[1]).join('、')),'primary','mark'));
        if(mode==='classes')body.append(button('查看模拟自习时段',()=>info('free'),'secondary','grid'));
      }
    }
    function field() {
      const body=view('跑道节奏挑战','按下起跑，默数三秒后按下冲线。可以随时离开或重玩。','clock');
      const timer=node('strong','clock-face','3.00 s'); const label=node('p','muted','目标用时');
      let started=0,detail='';
      const btn=button('起跑',()=>{
        if(!started){started=performance.now();body.prepend(activityDemo(id,'run'));timer.textContent='计时中';label.textContent='凭自己的节奏冲线';btn.querySelector('span').textContent='冲线';return;}
        if(!detail){
          const seconds=(performance.now()-started)/1000;
          detail='本次用时 '+seconds.toFixed(2)+' 秒，距目标相差 '+Math.abs(seconds-3).toFixed(2)+' 秒。';
          timer.textContent=seconds.toFixed(2)+' s';label.textContent='本次成绩';
        }
        if(!success('run','冲线完成',detail))btn.querySelector('span').textContent='重试保存成绩';
      },'primary','flag');body.append(timer,label,btn);
    }
    function music(){
      const body=view('草坪风铃','轻敲三枚风铃，写下自己的六音短句。每次轻敲都能看见音阶反馈。','music');
      const keysDemo=node('div');body.append(keysDemo);let notes=[]; const melody=node('div','melody','等待第一个音');const keys=node('div','music-keys');
      const save=button('收藏这段旋律',()=>notes.length && success('music','草坪旋律已收藏',notes.join(' · ')),'primary','mark');save.disabled=true;
      ['宫','角','徵'].forEach((n,i)=>{keys.append(button(n,()=>{
        tone(i);scene('music');keysDemo.replaceChildren(activityDemo(id,'music',n));notes=notes.concat(n).slice(-6);melody.textContent=notes.join('　');save.disabled=false;
        melody.animate?.([{transform:'translateY(-3px)'},{transform:'translateY(0)'}],{duration:210});
      },'music-key'));}); body.append(keys,melody,save);
    }
    function lawnAction(action){
      const sit=action==='sit';
      try{records.save(id,action,sit?'草坪小憩':'跳跳追叶',sit?'在教二草坪旁的长椅上坐了一会。':'在教二草坪看到了追叶子的跳跳。');}
      catch{panel.error('记录未能保存，请重试。');return;}
      onRecord();panel.close();stay(action);
    }
    if(id==='canteen'){
      const last=records.all().find(r=>r.placeId===id);
      openCanteenHome(panel,{
        visitWall,
        onReadMenu:body=>awardTask(id,'read-menu',body),
        collect:names=>success('menu','菜单已收录',names.join('、')),
        last:last ? last.title+' · '+recordTime(last.time) : ''
      });
      return;
    }
    const body=menu();
    const options=node('div','option-list');
    if(id==='lide') options.append(option('找空教室自习','book',()=>{
      const rooms=view('找空教室自习','立德楼自习开放时段 · 游戏演示','book');
      for (const [room,time] of [['201','14:00–15:40'],['305','16:00–17:40']]) {
        rooms.append(option('去 '+room+' 教室自习','seat',()=>{
          const seat=view('在 '+room+' 教室自习','你在窗边坐下，摊开了笔记本。','book');
          seat.append(node('p','record-time','立德楼 · '+room+' 教室 · '+time),button('查看校园拾光',visitWall,'secondary','camera'));
          awardTask(id,'start-study',seat);
        },time+' 空闲'));
      }
    }));
    if(id==='lide'||id==='plaza') options.append(option('查看校园拾光','camera',visitWall));
    const welcome = [
      ['gate','接下迎新海报任务','东门志愿者请你到求是广场喷泉北侧，查看最右边的迎新公告栏。'],
      ['plaza','查看迎新公告栏','留言上写着：去藏书馆服务台领取迎新海报。'],
      ['library','领取迎新海报','志愿者已把迎新海报贴到求是广场公告栏。'],
    ];
    const next = welcome.find(([site]) => !records.last(site,'welcome'));
    if (next?.[0] === id)
      options.append(option(next[1],'flag',()=>success('welcome',next[1],next[2])));
    else if (id === 'plaza') {
      const boardText = {gate:'迎新海报留着空位。到东门找志愿者接任务。', library:'去藏书馆服务台领取海报。'};
      body.append(node('p','intro',next ? boardText[next[0]] : '公告栏上贴着迎新海报。'));
    }
    if(place.kind==='transit')options.append(option('查看站牌','map',()=>{
      const board=view('乘坐校园巴士','选择下车地点，留在站台等车。车到后会自动上车。','map');
      const routes=node('div','option-list');
      for(const destination of stationDestinations(id)){
        const name=stationName(destination);
        routes.append(option(name,'target',()=>{
          panel.close();
          rideBus(destination,()=>{
            try { records.save(id,'ride','校园巴士乘车记',stationName(place)+' → '+name);onRecord(); }
            catch { return '已到达'+name+'，本次乘车记录未能保存'; }
            return '已到达'+name+'，乘车记录已收入手册';
          });
        }));
      }
      board.append(routes);
    }));
    if(id==='pond'||id==='lawn'||id==='plaza'||id==='lide'||id.startsWith('tz-'))options.append(option('拍照打卡','camera',photoView));
    if(selections[id])choices(body,selections[id]);
    if(id==='field')options.append(option('跑道节奏挑战','clock',field));
    if(id==='gate')options.append(schoolServiceLink('portal'));
    if(id==='gym')options.append(schoolServiceLink('gym'));
    if(classrooms[id] || id==='lide')options.append(schoolServiceLink('classrooms'));
    if(classrooms[id])options.append(option('查看课表','clock',()=>info('classes')));
    if(id==='tz-fengyuan')options.append(option('当日菜谱','food',()=>info('menu')),schoolServiceLink('canteen'));
    if(id==='lawn')options.append(option('在长椅坐坐','seat',()=>lawnAction('sit')),option('敲响草坪风铃','music',music),option('跳跳追叶','cat',()=>lawnAction('cat'),'系统事件'));
    body.append(options);
    const last=records.all().find(r=>r.placeId===id);
    if(last)body.append(node('p','last-record','上次足迹　'+last.title+' · '+recordTime(last.time)));
  }
  return {openPlace};
}
