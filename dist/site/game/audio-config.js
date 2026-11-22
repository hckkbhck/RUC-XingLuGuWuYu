const entry = (id,path,group,event,volume,loop=false,cooldown=90) =>
  ({id,path:'assets/audio/'+path+'.wav',group,event,volume,loop,enabled:true,cooldown});
const footstepVolume = .29 * 10 ** (-8 / 20);
export const soundConfig = [
  entry('shoe-left','step','effects','step-left',footstepVolume,false,150),
  entry('shoe-right','step-right','effects','step-right',footstepVolume,false,150),
  entry('button','tap','effects','click',.63),
  entry('approach','tap','effects','range',.38,false,600),
  entry('turn-page','open','effects','open',.58),
  entry('close-page','tap','effects','close',.46),
  entry('stamp','success','effects','success',.62),
  entry('retry','tap','effects','error',.36),
  ...['gong','jue','zhi'].map((n,i)=>entry('chime-'+n,n,'effects','note-'+i,.85)),
  entry('walk-theme','campus','music','background',.52,true),
  entry('garden','birds','ambient','environment',.7,true)
];
