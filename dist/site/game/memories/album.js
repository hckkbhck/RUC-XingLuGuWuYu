import {button, node} from '../dom.js';
import {asset, paintPortrait} from '../../src/characters.js';
import {getImage} from '../scenery.js';
import {makeProfileStore} from '../../src/profile.js';
import {readEntries, readPhoto, saveEntry, deleteEntry, imageTypes, maxBytes} from './store.js';

const profile = makeProfileStore();
const dateOptions = {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'};
const personalTime = new Intl.DateTimeFormat('zh-CN',dateOptions);
const campusTime = new Intl.DateTimeFormat('zh-CN',{...dateOptions,timeZone:'Asia/Shanghai'});
const displayTime = entry => (entry.demo ? campusTime : personalTime).format(entry.createdAt);
const newest = (a,b) => b.createdAt-a.createdAt || b.id-a.id;

function storageMessage(error) {
  if (error.name === 'QuotaExceededError') return '本机存储空间不足，请释放空间后重试。';
  return error.name === 'Error' ? error.message : '无法读写本机相册，请检查浏览器存储权限后重试。';
}

async function preparePhoto(file, url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  const scale = Math.min(1, 520 / Math.max(image.naturalWidth,image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1,Math.round(image.naturalWidth*scale));
  canvas.height = Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff8e8';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const thumbnail = await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.83));
  if (!thumbnail) throw new Error('照片预览生成失败，请重新选择。');
  const photo = new Blob([await file.arrayBuffer()], {type:file.type});
  return {photo,thumbnail};
}

export function createAlbum(panel, toast, onChange) {
  function page(title, subtitle, artName, back, backLabel) {
    const urls = new Set();
    let active = true;
    const body = panel.show(title,{subtitle,albumArt:artName,back,backLabel,onLeave(){
      active = false;
      urls.forEach(url=>URL.revokeObjectURL(url));
      urls.clear();
    }});
    const objectURL = blob => {const url=URL.createObjectURL(blob);urls.add(url);return url;};
    async function displayPhoto(img,entry,thumbnail=false) {
      if (entry.demo) {
        img.alt=entry.alt;
        img.src=asset(entry.photoPath);
        return;
      }
      try {
        const blob = await readPhoto(entry.id,thumbnail);
        if (!active || !img.isConnected) return;
        if (!blob) throw new Error('找不到这张本机照片。');
        img.src=objectURL(blob);
      } catch(error) {if(active)panel.error(storageMessage(error));}
    }
    return {body,active:()=>active,displayPhoto,objectURL,
      release(url){if(urls.delete(url))URL.revokeObjectURL(url);}};
  }

  function edit(location) {
    const view = page('留下校园拾光',location.campus+' · '+location.place,'camera');
    const form=node('form','album-form'), columns=node('div','album-columns');
    const picture=node('div'), writing=node('div');
    const file=node('input');file.type='file';file.accept=imageTypes.join(',');file.hidden=true;
    const preview=node('img','album-preview');preview.alt='已选择的照片';preview.hidden=true;
    const select=button('选择一张照片',()=>file.click(),'album-upload');
    const art=node('img');art.src=asset('assets/memories/camera.png');art.alt='';select.prepend(art);
    const remove=button('移除照片',()=>clearPhoto(),'secondary');remove.hidden=true;
    const photoHead=node('div','album-label','地点照片');photoHead.append(node('small','','选填 · 1 张以内'));
    picture.append(photoHead,file,select,preview,remove,node('small','album-hint','JPG、PNG 或 WebP，最多 8 MB'));
    const label=node('label','album-label','故事或感悟');label.htmlFor='memory-story';label.append(node('small','','选填'));
    const story=node('textarea');story.id='memory-story';story.placeholder='在这里发生过什么？';
    const meter=node('small','album-hint');
    writing.append(label,story,meter);columns.append(picture,writing);
    const actions=node('div','album-actions');
    const cancel=button('取消',()=>panel.close(),'secondary');
    const submit=node('button','primary','留下拾光');submit.type='submit';
    actions.append(node('small','album-hint','保存在此浏览器'),cancel,submit);
    form.append(columns,actions);view.body.append(form);
    let image=null, url='',version=0,loading=false,saving=false;
    function update() {
      const count=Array.from(story.value.trim()).length;
      meter.textContent='照片、文字至少一项　·　'+count+' / 500 字';
      submit.disabled=saving || loading || count>500 || (!image && !count);
      submit.textContent=saving?'正在保存…':'留下拾光';
    }
    function clearPhoto() {
      version++; loading=false;image=null;
      if(url)view.release(url);
      url='';preview.removeAttribute('src');preview.hidden=true;
      file.value='';select.hidden=false;remove.hidden=true;select.querySelector('span').textContent='选择一张照片';
      panel.error('');update();
    }
    file.addEventListener('change',async()=>{
      const chosen=file.files[0];if(!chosen)return;
      clearPhoto();
      if (!imageTypes.includes(chosen.type) || chosen.size>maxBytes) {
        panel.error('请选择 8 MB 以内的 JPG、PNG 或 WebP 照片。');return;
      }
      const ticket=version;
      url=view.objectURL(chosen);loading=true;select.querySelector('span').textContent='正在读取…';update();
      try {
        const prepared=await preparePhoto(chosen,url);
        if(!view.active() || ticket!==version)return;
        image=prepared;preview.src=url;preview.hidden=false;select.hidden=true;remove.hidden=false;
        loading=false;update();
      } catch {
        if(view.active() && ticket===version){clearPhoto();panel.error('无法读取这张照片，请换一张再试。');}
      }
    });
    story.addEventListener('input',update);update();
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(submit.disabled)return;
      saving=true;story.disabled=select.disabled=remove.disabled=cancel.disabled=true;update();panel.error('');
      try {
        const entry=await saveEntry({...location,author:profile.read(),text:story.value,image});
        onChange(entry);
        if(view.active())panel.close();
        toast('拾光已保存在这里');
      } catch(error) {
        if(!view.active())return;
        panel.error(storageMessage(error));saving=false;
        story.disabled=select.disabled=remove.disabled=cancel.disabled=false;update();
      }
    });
  }

  function detail(entry, back, backLabel) {
    const view=page('时光气泡',entry.demo?'校园拾光 · 演示拾光':'校园拾光 · 本机相册','bubble',back,backLabel);
    const layout=node('article',entry.hasPhoto?'album-columns album-detail':'album-detail');
    if(entry.hasPhoto){
      const print=node('figure','album-print'),img=node('img');img.alt=entry.place+'的拾光照片';
      print.append(img,node('figcaption','',entry.place));layout.append(print);
      view.body.append(layout);view.displayPhoto(img,entry);
    }
    const copy=node('div'),author=node('div','album-author'),portrait=node('canvas');
    portrait.width=portrait.height=64;portrait.setAttribute('aria-label','发布者头像');
    paintPortrait(portrait,getImage,entry.avatarId);
    const byline = (entry.demo && entry.authorCampus ? entry.authorCampus+' · ' : '') + displayTime(entry);
    const signature=node('div');signature.append(node('b','',entry.nickname),node('small','album-hint',byline));
    author.append(portrait,signature);
    copy.append(author,node('h3','',entry.place),node('small','album-hint',entry.campus+'　·　('+Math.round(entry.x)+', '+Math.round(entry.y)+')'));
    if(entry.text)copy.append(node('p','album-story',entry.text));
    layout.append(copy);view.body.append(layout);
    if(!entry.demo && profile.read()?.id===entry.authorId){
      const actions=node('div','album-delete');
      const ask=button('删除这则拾光',()=>{
        const keep=button('保留',()=>actions.replaceChildren(ask),'secondary');
        const yes=button('确认删除',async()=>{
          yes.disabled=keep.disabled=true;
          try {
            await deleteEntry(entry.id,profile.read()?.id);
            onChange(null,entry.id);
            if(view.active()){if(backLabel==='返回照片墙')back();else panel.close();}
            toast('已从本机相册删除');
          }catch(error){if(view.active()){panel.error(storageMessage(error));yes.disabled=keep.disabled=false;}}
        },'secondary');
        actions.replaceChildren(node('small','album-hint','同时移除地图气泡中的这条记录和展板照片？'),keep,yes);
      },'album-text-button');
      actions.append(ask);view.body.append(actions);
    }
  }

  function group(entries) {
    if(entries.length===1){detail(entries[0]);return;}
    const view=page('此处的拾光',entries.length+' 则拾光','bubble');
    const list=node('div','album-list');
    for(const entry of [...entries].sort(newest)){
      list.append(button(entry.nickname+' · '+displayTime(entry)+'　'+(entry.text.slice(0,30)||'一张照片'),
        ()=>detail(entry,()=>group(entries),'返回此处拾光'),'choice',entry.hasPhoto?'camera':'book'));
    }
    view.body.append(list);
  }

  async function gallery(campus='',pageIndex=0) {
    const view=page('校园拾光展板','求是广场 · 演示与本机照片','exhibit-board');
    view.body.append(node('p','album-hint','正在翻开相册…'));
    let entries;
    try {entries=(await readEntries(() => {
      if(view.active())panel.error('本机相册暂时无法读取，现展示演示照片。');
    })).filter(e=>e.hasPhoto).sort(newest);}
    catch(error){if(view.active()){view.body.replaceChildren();panel.error(storageMessage(error));}return;}
    if(!view.active())return;
    const filter=node('select');filter.setAttribute('aria-label','展出校区');
    const campuses=[...new Set(entries.map(e=>e.campus))];
    for(const value of ['',...campuses])filter.add(new Option(value||'全部校区',value));
    filter.value=campuses.includes(campus)?campus:'';
    filter.onchange=()=>gallery(filter.value,0);
    const filtered=entries.filter(e=>!filter.value || e.campus===filter.value);
    const pageSize=3;
    const pages=Math.ceil(filtered.length/pageSize);
    const current=Math.max(0,Math.min(pageIndex,pages-1));
    const toolbar=node('div','album-toolbar'),label=node('label','','展出范围 ');label.append(filter);
    toolbar.append(label,node('small','album-hint','共 '+filtered.length+' 张照片'));
    const wall=node('div','album-wall');view.body.replaceChildren(toolbar,wall);
    if(!filtered.length){wall.append(node('p','album-empty','展板等着第一张照片。打开拾光栏，在校园里留下一张吧。'));return;}
    for(const entry of filtered.slice(current*pageSize,(current+1)*pageSize)){
      const card=node('button','album-print album-card');card.type='button';
      const img=node('img');img.alt=entry.place+'的照片';
      const caption=node('span','album-caption');
      caption.append(node('small','album-hint',entry.campus),node('strong','',entry.place),node('span','',entry.nickname));
      card.append(img,caption);
      card.onclick=()=>detail(entry,()=>gallery(filter.value,current),'返回照片墙');
      wall.append(card);view.displayPhoto(img,entry,true);
    }
    if(pages>1){
      const pager=node('div','album-actions');
      const prev=button('上一页',()=>gallery(filter.value,current-1),'secondary');
      const next=button('下一页',()=>gallery(filter.value,current+1),'secondary');
      prev.disabled=current===0;next.disabled=current+1===pages;
      pager.append(prev,node('small','album-hint',(current+1)+' / '+pages),next);view.body.append(pager);
    }
  }
  function fountainPortrait(location, capture) {
    const view = page('和喷泉合影','求是广场 · 校园相册','camera');
    const stage = node('div','photo-stage');
    stage.append(node('p','muted','站在池边拍下你和喷泉，预览后再上传。'));
    const controls = node('div','album-actions');
    let image = null, url = '';
    const shoot = button('拍摄合影',async () => {
      shoot.disabled = upload.disabled = true;
      panel.error('');
      try {
        const frame = capture();
        const blob = await new Promise(resolve => frame.toBlob(resolve,'image/jpeg',0.85));
        if (!view.active()) return;
        if (!blob) throw new Error('无法拍摄当前画面，请重试。');
        const nextURL = view.objectURL(blob);
        const next = await preparePhoto(blob,nextURL);
        if (!view.active()) return;
        if (url) view.release(url);
        url = nextURL; image = next;
        const preview = node('img','photo-preview');
        preview.alt = '角色与求是广场喷泉的合影'; preview.src = url;
        stage.replaceChildren(preview);
        shoot.querySelector('span').textContent = '重拍合影';
      } catch {
        if (view.active()) panel.error('未能拍下合影，请重试。');
      } finally { shoot.disabled = false; upload.disabled = !image; }
    },'secondary','camera');
    const upload = button('上传到校园相册',async () => {
      if (upload.disabled || !image) return;
      shoot.disabled = upload.disabled = true;
      panel.error('');
      let entry;
      try {
        entry = await saveEntry({...location,author:profile.read(),text:'我和求是广场的喷泉合影。',image});
      } catch(error) {
        if (view.active()) {
          panel.error(storageMessage(error));
          shoot.disabled = upload.disabled = false;
        }
        return;
      }
      onChange(entry);
      if (view.active()) {
        controls.replaceChildren(button('查看相册里的合影',()=>detail(entry),'secondary','camera'));
        view.body.append(node('p','trace-success','合影已收入本机校园相册，也能在广场拾光展板找到。'));
      }
    },'primary','mark');
    upload.disabled = true;
    controls.append(shoot,upload);
    view.body.append(stage,controls,node('small','album-hint','照片保存在这个浏览器的校园相册。'));
  }
  return {edit,gallery,group,fountainPortrait};
}
