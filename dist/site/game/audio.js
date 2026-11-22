import {soundConfig} from './audio-config.js';
const key='ruc.zhongguancun.audio.v1';
const defaults={master:.55,music:.48,ambient:.65,effects:.8,muted:false};
const clamp = x => Math.min(1,Math.max(0,x));
export class AudioManager {
  constructor(config = soundConfig) {
    this.config=config; this.preferences={...defaults}; this.cache=new Map();
    this.last=new Map(); this.playing=new Map(); this.pending=new Set(); this.channels={};
    this.visible=!document.hidden;
    try {
      const saved=JSON.parse(localStorage.getItem(key));
      if(saved){for(const group of ['master','music','ambient','effects'])if(Number.isFinite(saved[group]))this.preferences[group]=clamp(saved[group]);this.preferences.muted=saved.muted===true;}
    } catch {}
    document.addEventListener('visibilitychange',()=>{
      this.visible=!document.hidden;
      if(!this.visible)this.ctx?.suspend().catch(()=>{});
      else if(this.started)this.unlock();
    });
  }
  apply() {
    if(!this.ctx)return;
    for(const [channel,gain] of Object.entries(this.channels)) {
      const volume = channel==='master' && this.preferences.muted ? 0 : this.preferences[channel];
      gain.gain.setTargetAtTime(volume,this.ctx.currentTime,.025);
    }
  }
  set(group,value) {
    if(!(group in defaults))return;
    this.preferences[group]=group==='muted'?!!value:clamp(Number(value));this.apply();
    try{localStorage.setItem(key,JSON.stringify(this.preferences));}catch{}
    if(this.started && !this.preferences.muted)this.loops();
  }
  async unlock() {
    if(!this.visible)return;
    try {
      if(!this.ctx){
        const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
        this.ctx=new Audio();
        for(const group of ['master','music','ambient','effects']) {
          const gain=this.ctx.createGain(); gain.connect(group==='master'?this.ctx.destination:this.channels.master); this.channels[group]=gain;
        }
        this.apply();
      }
      if(this.ctx.state!=='running')await this.ctx.resume();
      this.started=true;this.loops();
    } catch {}
  }
  loops(){ this.emit('background');this.emit('environment'); }
  async emit(event,placeId) {
    if(!this.ctx||this.ctx.state!=='running'||this.preferences.muted||!this.visible)return;
    const matches=this.config.filter(c=>c.enabled && c.event===event);
    const c=matches.find(c=>c.placeId && c.placeId===placeId)||matches.find(c=>!c.placeId);
    if(!c||!c.path||this.pending.has(c.id)||(c.loop&&this.playing.has(c.id)))return;
    const now=performance.now();
    if(now-(this.last.get(c.id)??-Infinity)<c.cooldown)return;
    this.last.set(c.id,now);this.pending.add(c.id);
    try {
      if(!this.cache.has(c.path)) {
        const request=fetch(globalThis.CAMPUS_ASSETS?.[c.path] || c.path)
          .then(r=>{if(!r.ok)throw Error('audio');return r.arrayBuffer();})
          .then(b=>this.ctx.decodeAudioData(b))
          .catch(error=>{if(this.cache.get(c.path)===request)this.cache.delete(c.path);throw error;});
        this.cache.set(c.path,request);
      }
      const buffer=await this.cache.get(c.path);
      if(!this.visible||this.preferences.muted||this.ctx.state!=='running')return;
      if(this.playing.has(c.id) && !c.loop)this.playing.get(c.id).stop();
      const source=this.ctx.createBufferSource(), gain=this.ctx.createGain();
      source.buffer=buffer;source.loop=c.loop;gain.gain.value=c.volume;
      source.connect(gain);gain.connect(this.channels[c.group]);this.playing.set(c.id,source);
      source.onended=()=>{if(this.playing.get(c.id)===source)this.playing.delete(c.id);source.disconnect();gain.disconnect();};
      source.start();
    } catch {this.last.set(c.id,performance.now()+1700);} finally {this.pending.delete(c.id);}
  }
  stop(id) {try{this.playing.get(id)?.stop();}catch{}}
}
