import {deflateSync} from 'node:zlib';

// Original, deterministic sphere shading. No reference photographs are embedded.
export const crystalProfiles=[
 {name:'coral',absorb:[.02,.14,.12],cloud:[255,190,202],rough:.28,kind:'rose'},
 {name:'jade',absorb:[.12,.045,.10],cloud:[99,176,145],rough:.20,kind:'moss'},
 {name:'amber',absorb:[.01,.06,.22],cloud:[238,184,72],rough:.08,kind:'rutile'},
 {name:'pearl',absorb:[.015,.015,.015],cloud:[240,244,248],rough:.28,kind:'moon'},
 {name:'blue',absorb:[.15,.045,.012],cloud:[111,199,235],rough:.10,kind:'aqua'},
 {name:'lilac',absorb:[.07,.20,.025],cloud:[183,122,206],rough:.11,kind:'amethyst'}
];
function crc(data){let c=0xffffffff;for(const byte of data){c^=byte;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length);name.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([name,data])),8+data.length);return out;}
function png(pixels,size){const header=Buffer.alloc(13);header.writeUInt32BE(size,0);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;const rows=Buffer.alloc((size*4+1)*size);for(let y=0;y<size;y++)pixels.copy(rows,y*(size*4+1)+1,y*size*4,(y+1)*size*4);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);}
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mix=(a,b,t)=>a*(1-t)+b*t;
const hash=(x,y,z)=>{const n=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return n-Math.floor(n);};
function noise(x,y,z){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),smooth=t=>t*t*(3-2*t),u=smooth(x-ix),v=smooth(y-iy),w=smooth(z-iz);
 const layer=k=>mix(mix(hash(ix,iy,k),hash(ix+1,iy,k),u),mix(hash(ix,iy+1,k),hash(ix+1,iy+1,k),u),v);
 return mix(layer(iz),layer(iz+1),w);
}
const cloudNoise=(x,y,z)=>noise(x*3,y*3,z*3)*.55+noise(x*9,y*9,z*9)*.28+noise(x*27,y*27,z*27)*.12+noise(x*75,y*75,z*75)*.05;
const cache=new Map();
export function crystalData(name){
 if(cache.has(name))return cache.get(name);
 const profile=crystalProfiles.find(p=>p.name===name),size=256,radius=103,pixels=Buffer.alloc(size*size*4);
 const fibers=Array.from({length:profile.kind==='rutile'?32:16},(_,i)=>{
   const a=hash(i,8,2)*6.28,b=profile.kind==='rutile'?a+1.7+hash(i,9,2)*1.4:hash(i,9,2)*6.28;
   return {ax:Math.cos(a)*.88,ay:Math.sin(a)*.88,bx:Math.cos(b)*.92,by:Math.sin(b)*.92};
 });
 for(let py=0;py<size;py++)for(let px=0;px<size;px++){
   const x=(px-125)/radius,y=(py-121)/radius,rr=x*x+y*y,offset=(py*size+px)*4;
   let rgb=[62,49,33],alpha=.22*Math.exp(-(((px-132)/105)**2+((py-136)/101)**2)*3.6);
   if(rr<1){
     const z=Math.sqrt(1-rr),n=cloudNoise(x,y,z),light=clamp(-.47*x-.57*y+.68*z),fresnel=(1-z)**3;
     rgb=profile.absorb.map((a,i)=>[242,239,227][i]*Math.exp(-a*(.4+1.7*z))*(.78+.16*light)+12*z);
     let cloud=clamp((n-.38)*1.7)*profile.rough;
     if(profile.kind==='moss')cloud=clamp((cloudNoise(x*1.4,y*1.3,z)-.42)*6)*.85;
     if(profile.kind==='amethyst')cloud=clamp((cloudNoise(x*1.5,y,z)-.35)*1.5)*.4;
     rgb=rgb.map((v,i)=>mix(v,profile.cloud[i],cloud));
     // Internal fractures catch light behind the surface, rather than forming painted outlines.
     let lines=0;
     for(const f of fibers){
       const dx=f.bx-f.ax,dy=f.by-f.ay,t=clamp(((x-f.ax)*dx+(y-f.ay)*dy)/(dx*dx+dy*dy));
       const bend=profile.kind==='rutile'?0:(n-.5)*.055;
       const distance=Math.hypot(x-f.ax-dx*t,y-f.ay-dy*t+bend);
       lines+=Math.exp(-((distance/.004)**2))*(.22+n*.4)*clamp(z*3);
     }
     rgb=rgb.map((v,i)=>mix(v,profile.kind==='rutile'?[158,113,41][i]:[252,251,244][i],clamp(lines)*(profile.kind==='moon'?.15:.65)));
     if(profile.kind==='moon'){
       const blueGlow=Math.exp(-((x-.24)**2/.14+(y+.06)**2/.3))*.26;
       rgb=rgb.map((v,i)=>mix(v,[112,178,245][i],blueGlow));
     }
     const cord=Math.exp(-(((y-.09-.035*Math.sin(x*3))/.009)**2))*clamp((.85-Math.abs(x))*8)*.16;
     rgb=rgb.map(v=>mix(v,242,cord));
     const reflection=clamp((-.31*x-.41*y+.857*z));
     const spec=Math.pow(reflection,180)*.82+Math.pow(reflection,30)*.11;
     const window=Math.exp(-(((x+.41)/.10)**8+((y+.46)/.045)**8))*.8;
     const lower=Math.exp(-(((Math.sqrt(rr)-.85)/.028)**2))*clamp(y+.3)*clamp(x+.55)*.42;
     rgb=rgb.map((v,i)=>mix(mix(v,[75,70,59][i],fresnel*.7),[255,255,252][i],clamp(spec+window+lower)));
     // Tiny side openings preserve the real through-drilled appearance.
     const hole=Math.exp(-(((Math.abs(x)-.942)/.027)**2+((y-.09)/.024)**2))*.65;
     rgb=rgb.map(v=>mix(v,64,hole));alpha=clamp((1-Math.sqrt(rr))*radius);
   }
   for(let c=0;c<3;c++)pixels[offset+c]=clamp(rgb[c]/255)*255;
   pixels[offset+3]=alpha*255;
 }
 const data=`data:image/png;base64,${png(pixels,size).toString('base64')}`;cache.set(name,data);return data;
}
export const crystalBody=name=>`<image width="256" height="256" href="${crystalData(name)}"/>`;
