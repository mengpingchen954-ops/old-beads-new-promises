import * as THREE from 'three';
import {COLORS} from './model.js';
export let W=1000,H=700;
let compact=false;
export const railPos=(i,j=0)=>({x:(compact?140:145)+j*(compact?93:81),y:(compact?150:168)+i*91});
export const bufferPos=(i,capacity)=>({x:compact?(capacity===3?200+i*100:250+i*110):(capacity===3?143+i*100:170+i*110),y:compact?540:580});
export const orderPos=i=>({x:compact?180+i*300:741,y:compact?747:212+i*264});
export function sourcePos(source,capacity){return source.type==='rail'?railPos(source.index):bufferPos(source.index,capacity);}
export class Board {
  constructor(host){
    this.host=host;this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(0,W,0,H,.1,100);this.camera.position.z=30;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});this.renderer.setClearColor('#e8dcc3');this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.domElement.setAttribute('aria-hidden','true');host.prepend(this.renderer.domElement);
    this.group=new THREE.Group();this.scene.add(this.group);this.textures={};this.geometry=new THREE.PlaneGeometry(1,1);this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.host.dispatchEvent(new Event('board-lost'));});
    this.renderer.domElement.addEventListener('webglcontextrestored',()=>{if(this.last)this.draw(...this.last);this.host.dispatchEvent(new Event('board-restored'));});
  }
  mount(host){this.resizeObserver.disconnect();this.host=host;host.prepend(this.renderer.domElement);this.resizeObserver.observe(host);this.resize();}
  async load(){const loader=new THREE.TextureLoader();await Promise.all(['workbench',...COLORS.map(c=>c.file)].map(async name=>{const t=await loader.loadAsync(`${import.meta.env.BASE_URL}art/${name}.svg`);t.colorSpace=THREE.SRGBColorSpace;this.textures[name]=t;}));}
  resize(){const next=innerWidth<=600,changed=next!==compact;compact=next;W=compact?660:1000;H=compact?910:700;this.host.style.aspectRatio=`${W}/${H}`;this.camera.right=W;this.camera.bottom=H;this.camera.updateProjectionMatrix();const r=this.host.getBoundingClientRect();this.renderer.setSize(r.width,r.height,false);if(changed&&this.last){this.draw(...this.last);this.host.dispatchEvent(new Event('board-layout'));}else this.render();}
  clear(){for(const o of [...this.group.children]){this.group.remove(o);if(o.geometry!==this.geometry)o.geometry?.dispose();if(o.material?.map?.userData?.temporary)o.material.map.dispose();o.material?.dispose();}}
  plane(x,y,w,h,material,z=0){material.side=THREE.DoubleSide;const mesh=new THREE.Mesh(this.geometry,material);mesh.position.set(x,y,z);mesh.scale.set(w,-h,1);this.group.add(mesh);return mesh;}
  rect(x,y,w,h,color,z=0,opacity=1){return this.plane(x,y,w,h,new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false}),z);}
  circle(x,y,r,color,z=0,opacity=1){const m=new THREE.Mesh(new THREE.CircleGeometry(r,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide}));m.position.set(x,y,z);this.group.add(m);return m;}
  ring(x,y,r,color,z=0,opacity=1){const m=new THREE.Mesh(new THREE.RingGeometry(r-1.4,r+1.4,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide}));m.position.set(x,y,z);this.group.add(m);return m;}
  image(name,x,y,w,h,z=1,opacity=1){return this.plane(x,y,w,h,new THREE.MeshBasicMaterial({map:this.textures[name],transparent:true,opacity,depthWrite:false}),z);}
  text(text,x,y,size=16,color='#796d55',align='center'){
    const c=document.createElement('canvas');c.width=Math.max(200,text.length*size*2.4);c.height=size*3;
    const ctx=c.getContext('2d');ctx.font=`${size*2}px "Microsoft YaHei", sans-serif`;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,c.height/2);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.userData.temporary=true;
    this.plane(x,y,c.width/2,c.height/2,new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}),4);
  }
  draw(state,level,selected,hint){
    this.last=[state,level,selected,hint];cancelAnimationFrame(this.raf);this.clear();
    this.image('workbench',W/2,H/2,W,H,-5);
    this.text('料 杆 · 只 能 从 左 端 取 珠',compact?330:287,compact?82:90,17,'#5d6655');
    if(!compact){this.text('定 制 手 链',741,82,17,'#5d6655');this.rect(515,351,1,490,'#c7bba1',-1);}
    state.rails.forEach((rail,i)=>{
      const p=railPos(i);this.text('ABCD'[i],76,p.y,17,'#a08a58');
      this.rect(compact?325:294,p.y,compact?430:365,4,'#ad8d51',-1);this.circle(compact?540:467,p.y,5,'#b6995b',0);
      this.ring(p.x,p.y,34,'#b9a57d',0,.45);
      if(!rail.length)this.text('已取空',285,p.y,15,'#a39881');
      rail.forEach((c,j)=>{const q=railPos(i,j);this.image(COLORS[c].file,q.x,q.y,83,83,1);});
      if(rail.length){this.text('‹',p.x-53,p.y,27,'#8e774c');if(selected?.type==='rail'&&selected.index===i)this.ring(p.x,p.y,40,'#365e4d',3);}
    });
    this.text('暂 存 盘',compact?330:237,compact?485:520,17,'#5d6655');
    state.buffer.forEach((c,i)=>{const p=bufferPos(i,level.capacity);this.circle(p.x+2,p.y+4,41,'#988465',-1,.13);this.circle(p.x,p.y,41,'#e5dcc8');this.ring(p.x,p.y,39,'#b7a482');this.ring(p.x,p.y,32,'#ccbea3',0,.5);if(c!==null)this.image(COLORS[c].file,p.x,p.y,83,83,1);else this.text('＋',p.x,p.y,24,'#b7a98d');if(selected?.type==='buffer'&&selected.index===i)this.ring(p.x,p.y,43,'#365e4d',3);});
    this.text(`${state.buffer.filter(c=>c!==null).length} / ${level.capacity} 格占用 · 用完即可腾空`,compact?330:240,compact?604:642,14,'#8a7e67');
    state.orders.forEach((done,i)=>{
      const p=orderPos(i), goal=level.orders[i];this.circle(p.x+2,p.y+4,105,'#988465',-1,.12);this.circle(p.x,p.y,106,'#f1ead9',0);this.ring(p.x,p.y,102,'#c7b692');this.ring(p.x,p.y,74,'#b79657');
      goal.forEach((c,j)=>{const a=-Math.PI/2+j/goal.length*Math.PI*2,x=p.x+Math.cos(a)*74,y=p.y+Math.sin(a)*74;this.image(COLORS[c].file,x,y,58,58,1,j<done.length?1:.29);if(j===done.length){this.ring(x,y,23,'#48725b',2);this.circle(x+17,y-17,4,'#48725b',3);}});
      this.text(`手链 ${i+1}`,p.x,p.y-12,17,'#6a634f');this.text(`${done.length} / ${goal.length}`,p.x,p.y+15,19,'#47634e');
      const next=goal[done.length];this.text(next===undefined?'已完成 ✓':`下一颗 · ${COLORS[next].name}${COLORS[next].symbol}`,p.x,p.y+136,16,next===undefined?'#3c7255':'#6d735d');
    });
    if(hint){const p=sourcePos(hint.source,level.capacity),q=hint.target.type==='order'?orderPos(hint.target.index):bufferPos(hint.target.index,level.capacity);this.ring(p.x,p.y,45,'#ba9146',4);this.ring(q.x,q.y,hint.target.type==='order'?112:45,'#ba9146',4);}
    this.render();
  }
  animate(color,from,to){
    if(this.reduced)return;
    const mesh=this.image(COLORS[color].file,from.x,from.y,82,82,8),start=performance.now();
    const tick=now=>{const t=Math.min(1,(now-start)/300),e=1-(1-t)**3;mesh.position.set(from.x+(to.x-from.x)*e,from.y+(to.y-from.y)*e-Math.sin(t*Math.PI)*30,8);mesh.rotation.z=Math.sin(t*Math.PI)*.2;const s=82*(1-.3*t);mesh.scale.set(s,-s,1);mesh.material.opacity=1-t*.4;this.render();if(t<1)this.raf=requestAnimationFrame(tick);else{this.group.remove(mesh);mesh.material.dispose();this.render();}};
    this.raf=requestAnimationFrame(tick);
  }
  render(){this.renderer.render(this.scene,this.camera);}
}
