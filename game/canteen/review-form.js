import {button,node} from '../dom.js';
import {fitPhoto} from '../photo.js';
import {imageTypes,maxBytes} from '../memories/store.js';
import {localReviews,newReviewId,saveReview} from './reviews.js';

function photoViewer(parent) {
  const dialog = node('dialog','dish-photo-viewer');
  dialog.setAttribute('aria-label','菜品实拍大图');
  const image = node('img');
  const close = button('关闭大图',()=>dialog.close(),'','close');
  dialog.append(image,close); parent.append(dialog);
  dialog.addEventListener('keydown',event=>{ if(event.key==='Escape') event.stopPropagation(); });
  dialog.addEventListener('click',event=>{ if(event.target===dialog) dialog.close(); });
  dialog.addEventListener('close',()=>image.removeAttribute('src'));
  return (url,alt) => { image.src=url; image.alt=alt; dialog.showModal(); close.focus(); };
}

export function mountDishReviews({dish,comments,compose,reviewRow,profileStore,signal}) {
  const list = node('ul','recipe-reviews');
  const empty = node('p','recipe-empty');
  comments.append(list,empty);
  const enlarge = photoViewer(comments);
  function renderRow(row) {
    const el = reviewRow(row);
    if (row.photo) {
      const alt = row.nickname+'上传的'+dish.name+'实拍';
      const view = button('放大'+alt,()=>enlarge(row.photo,alt),'recipe-review-photo');
      const thumb = node('img'); thumb.alt=alt; thumb.src=row.photo; thumb.loading='lazy';
      view.setAttribute('aria-label','放大'+alt); view.replaceChildren(thumb);
      el.querySelector('.review-text').append(view);
    }
    return el;
  }
  const form = node('form','recipe-form');
  const input = node('input'); input.type='text'; input.maxLength=500;
  input.placeholder='写下你的评价…'; input.setAttribute('aria-label','写下你对'+dish.name+'的评价');
  const submit = node('button','','发表'); submit.type='submit';
  form.append(input,submit);

  const picker = node('input'); picker.type='file'; picker.accept=imageTypes.join(','); picker.hidden=true;
  const upload = button('上传菜品实拍',()=>picker.click(),'recipe-upload','camera');
  const scope = node('small','recipe-visibility','本机评价 · 仅此浏览器可见');
  scope.setAttribute('role','status');
  const bar = node('div','recipe-photo-bar'); bar.append(upload,scope);
  const draft = node('div','recipe-photo-draft'); draft.hidden=true;
  const preview = node('img'); preview.alt='即将发表的'+dish.name+'实拍';
  const remove = button('移除照片',()=>clearPhoto(),'recipe-remove');
  draft.append(preview,remove);
  const notice = node('p','recipe-notice'); notice.setAttribute('role','status');
  compose.append(form,picker,bar,draft,notice);

  let photo='', draftId=newReviewId(), reading=false, saving=false, loaded=false, selection=0;
  const controls = () => {
    submit.disabled=!loaded || reading || saving;
    input.disabled=upload.disabled=remove.disabled=saving;
    submit.textContent=saving?'发表中…':'发表';
    upload.querySelector('span').textContent=reading?'正在读取照片…':photo?'更换实拍':'上传菜品实拍';
  };
  function clearPhoto() {
    selection++; reading=false; photo=''; draftId=newReviewId(); picker.value='';
    preview.removeAttribute('src'); draft.hidden=true; notice.textContent=''; controls();
  }
  picker.addEventListener('change',async()=>{
    const file=picker.files[0]; picker.value=''; if(!file) return;
    const ticket=++selection;
    reading=false; controls();
    if(!imageTypes.includes(file.type) || file.size>maxBytes) {
      notice.textContent='请选择 8 MB 以内的 JPG、PNG 或 WebP 实拍。'; return;
    }
    notice.textContent=''; reading=true; controls();
    try {
      const image=await fitPhoto(file);
      if(signal.aborted || ticket!==selection)return;
      photo=image; draftId=newReviewId(); preview.src=image; draft.hidden=false;
    } catch {
      if(!signal.aborted && ticket===selection) notice.textContent='无法打开这张照片，请重新选择。';
    } finally {
      if(!signal.aborted && ticket===selection){ reading=false; controls(); }
    }
  });
  input.addEventListener('input',()=>{draftId=newReviewId(); notice.textContent='';});

  const samples=dish.reviews || [];
  list.append(...samples.map(renderRow));
  empty.hidden=!!samples.length;
  empty.textContent='正在读取评价…';
  controls();
  async function load() {
    try {
      const rows = await localReviews(dish.id);
      if (signal.aborted) return;
      rows.sort((a,b) => b.time-a.time);
      list.replaceChildren(...rows.concat(samples).map(renderRow));
    } catch {
      if (signal.aborted) return;
      notice.textContent='暂时无法读取本机评价，请检查浏览器存储权限。';
    }
    empty.textContent='还没有评价。'; empty.hidden=!!list.childElementCount;
    loaded=true; controls();
  }
  load();
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(submit.disabled)return;
    const text=input.value.trim();
    if(!text && !photo){ notice.textContent='请先写下评价或选择菜品实拍。'; input.focus(); return; }
    saving=true; notice.textContent=''; controls();
    try {
      const saved=await saveReview(dish.id,profileStore.read(),{id:draftId,text,photo});
      if(signal.aborted)return;
      list.prepend(renderRow(saved)); empty.hidden=true; list.scrollTop=0;
      clearPhoto(); input.value='';
      notice.textContent='评价已保存在本机。';
    } catch(error) {
      if(signal.aborted)return;
      notice.textContent=error.name==='QuotaExceededError'?'本机存储空间不足，照片和文字已留在编辑框。':
        '本机保存失败，请检查浏览器存储后重试。';
    } finally { if(!signal.aborted){saving=false; controls();} }
  });
}
