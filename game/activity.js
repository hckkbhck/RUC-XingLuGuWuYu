import {drawPerson} from './scenery.js';
import {selections} from './content.js';

const captions={run:'沿跑道冲线',photo:'举起相机取景',music:'轻敲草坪风铃',menu:'在食堂窗口取餐',heat:'查看食堂座位',classes:'翻看课程安排',free:'在教室翻开笔记'};
const activities={gym:'舒展身体',library:'翻开书页',art:'调色与试笔',student:'取下体验卡',gate:'盖下纪念章'};

export function activityDemo(id,mode,detail=''){
    const canvas=document.createElement('canvas');
    canvas.width=240;canvas.height=66;canvas.className='activity-demo';
    const label=mode==='welcome'?'记录迎新海报任务':captions[mode]||activities[id]||'翻开漫游手册';
    canvas.setAttribute('role','img');canvas.setAttribute('aria-label',label);
    const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
    const rect=(color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
    function stroke(color,x,y,u,v,width=2){
        c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(u,v);c.stroke();
    }
    const start=performance.now();
    function paint(now){
        const t=(now-start)/1000,a=(1-Math.cos(t*4))*.5;
        rect('#e7e2c7',0,0,240,66);rect('#b4c297',0,22,240,16);rect('#dbc79f',0,38,240,28);
        if(mode==='run'){
            rect('#b16f52',0,37,240,29);for(const y of [41,54,64])rect('#f4dfb4',0,y,240,1);
            for(let i=0;i<6;i++)rect(i%2?'#e9dfc6':'#555242',207,37+i*5,4,5);
            drawPerson(c,21+((t%3)/3)*202,53,'right',true,Math.floor(t*9)%4);
        }else{
            const gym=id==='gym', lift=gym?(detail.includes('踮脚')?5:2)*a:0;
            drawPerson(c,98,53-lift,'right',false,0);
            if(gym){
                const height=detail.includes('肩颈')?6:16;
                stroke('#ad7154',98,35-lift,106+3*a,39-height*a-lift,3);
                stroke('#b17451',96,35-lift,89-4*a,39-height*a-lift,3);
            }else if(mode==='photo'){
                rect('#333e39',99,35-8*a,12,8);rect('#a8b9a2',105,36-8*a,4,4);
                if(a>.97){stroke('#fff6d8',113,27,121,24);stroke('#fff6d8',113,30,122,32);}
            }else if(mode==='music'){
                rect('#785d46',127,10,43,3);
                for(let i=0;i<3;i++){let x=133+13*i+Math.sin(t*7-i)*3;stroke('#76553b',133+13*i,13,x,27+i*2,1);rect(['#aa6c37','#b4913d','#649689'][i],x-3,26+i*2,7,11);}
                stroke('#9c6648',101,39,131+3*a,32);
            }else{
                rect('#826343',110,45,59,4);for(const x of [114,162])rect('#a5825c',x,49,3,10);
                if(mode==='menu'||mode==='heat'){
                    rect('#8b6844',132,13,38,3);rect('#e4b06e',132,16,38,7);
                    for(let i=0;i<3;i++){rect('#9c7860',133+i*12,33,9,5);rect('#608b60',133+i*12,31,7,3);}
                    rect('#f2eee0',136-25*a,40,15,4);rect('#b97542',139-25*a,38,9,3);
                }else if(id==='gate'){
                    rect('#f8e9c8',119,40,27,5);rect('#9a503c',127,21+13*a,10,5);rect('#78503d',129,16+13*a,6,6);if(a>.75)rect('#b8644c',128,40,9,2);
                }else if(id==='student'){
                    rect('#795b42',128,12,41,26);rect('#bd9869',130,14,37,22);
                    for(let i=0;i<3;i++)rect(['#c2d3ab','#efc98f','#e6ad8e'][i],133+10*i-(i===0?20*a:0),18+(i===0?14*a:0),8,13);
                }else{
                    rect('#84654b',116,36,31,9);rect('#faf0cf',117,33,28,10);
                    if(id==='art'){
                        const idx=Math.max(0,selections.art.options.indexOf(detail));
                        selections.art.swatches[idx].forEach((color,i)=>rect(color,119+i*8,36,Math.max(1,Math.round(6*a)),5));
                        stroke('#8c5e3f',118+22*a,38,124+22*a,26);
                    }else if(id.startsWith('red-')){
                        stroke('#9e654a',120,40,120,34);stroke('#9e654a',120,34,120+21*a,34);stroke('#705840',120+21*a,34,127+21*a,22);
                    }else{
                        rect('#dfd0a9',130-10*a,31,Math.max(2,Math.round(12*a)),11);
                        for(const y of [36,39])rect('#ab9976',132,y,9,1);
                    }
                }
            }
        }
        if(canvas.isConnected&&!matchMedia('(prefers-reduced-motion: reduce)').matches)requestAnimationFrame(paint);
    }
    requestAnimationFrame(paint);return canvas;
}
