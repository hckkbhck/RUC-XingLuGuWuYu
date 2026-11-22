import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioManager} from '../game/audio.js';

test('短暂加载失败后可重试，静音期间不加载或发声',async t=>{
  t.mock.method(globalThis,'fetch',async()=>{
    if(first){first=false;throw Error('temporarily unavailable');}
    return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};
  });
  const oldDoc=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'document',{configurable:true,value:{hidden:false,addEventListener(){}}});
  t.after(()=>oldDoc?Object.defineProperty(globalThis,'document',oldDoc):delete globalThis.document);
  let first=true,played=0;
  const entry={id:'button',path:'a.wav',group:'effects',event:'click',enabled:true,volume:1,cooldown:10,loop:false};
  const audio=new AudioManager([entry]);
  audio.ctx={state:'running',decodeAudioData:async()=>({}),createGain:()=>({gain:{},connect(){}}),
    createBufferSource:()=>({connect(){},start(){played++;}})};
  await audio.emit('click');
  assert.equal(audio.cache.has(entry.path),false);assert.equal(played,0);
  audio.last.clear();audio.preferences.muted=true;
  await audio.emit('click');assert.equal(globalThis.fetch.mock.callCount(),1);
  audio.preferences.muted=false;await audio.emit('click');assert.equal(played,1);
});
