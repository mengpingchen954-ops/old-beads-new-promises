import * as THREE from 'three';
import {COLORS} from './model.js';
import {flightPoint,rebound} from './feedback.js';
export let W=1000,H=700;
let compact=false;
export const railPos=(i,j=0)=>({x:(compact?140:145)+j*(compact?93:81),y:(compact?150:168)+i*91});
export const bufferPos=(i,capacity)=>({x:compact?(capacity===3?200+i*100:250+i*110):(capacity===3?143+i*100:170+i*110),y:compact?540:580});
export const orderPos=i=>({x:compact?180+i*300:741,y:compact?747:212+i*264});
export function beadPos(i,j,count){const p=orderPos(i),a=-Math.PI/2+j/count*Math.PI*2;return {x:p.x+Math.cos(a)*74,y:p.y+Math.sin(a)*74};}
export function sourcePos(source,capacity){return source.type==='rail'?railPos(source.index):bufferPos(source.index,capacity);}
export class Board {
  constructor(host){
    this.host=host;this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(0,W,0,H,.1,100);this.camera.position.z=30;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});this.renderer.setClearColor('#e8dcc3');this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.domElement.setAttribute('aria-hidden','true');host.prepend(this.renderer.domElement);
    this.group=new THREE.Group();this.fx=new THREE.Group();this.scene.add(this.group,this.fx);this.effects=[];this.beads=new Map();this.rims=new Map();this.textures={};this.geometry=new THREE.PlaneGeometry(1,1);this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.cancelFeedback();this.host.dispatchEvent(new Event('board-lost'));});
    this.renderer.domElement.addEventListener('webglcontextrestored',()=>{if(this.last)this.draw(...this.last);this.host.dispatchEvent(new Event('board-restored'));});
  }
  mount(host){this.cancelFeedback();this.resizeObserver.disconnect();this.host=host;host.prepend(this.renderer.domElement);this.resizeObserver.observe(host);this.resize();}
  async load(){const loader=new THREE.TextureLoader();await Promise.all(['workbench',...COLORS.map(c=>c.file)].map(async name=>{const t=await loader.loadAsync(`${import.meta.env.BASE_URL}art/${name}.svg`);t.colorSpace=THREE.SRGBColorSpace;this.textures[name]=t;}));}
  resize(){const next=innerWidth<=600,changed=next!==compact;if(changed)this.cancelFeedback();compact=next;W=compact?660:1000;H=compact?910:700;this.host.style.aspectRatio=`${W}/${H}`;this.camera.right=W;this.camera.bottom=H;this.camera.updateProjectionMatrix();const r=this.host.getBoundingClientRect();this.renderer.setSize(r.width,r.height,false);if(changed&&this.last){this.draw(...this.last);this.host.dispatchEvent(new Event('board-layout'));}else this.render();}
  clear(){for(const o of [...this.group.children]){this.group.remove(o);if(o.geometry!==this.geometry)o.geometry?.dispose();if(o.material?.map?.userData?.temporary)o.material.map.dispose();o.material?.dispose();}}
  plane(x,y,w,h,material,z=0){material.side=THREE.DoubleSide;const mesh=new THREE.Mesh(this.geometry,material);mesh.position.set(x,y,z);mesh.scale.set(w,-h,1);this.group.add(mesh);return mesh;}
  rect(x,y,w,h,color,z=0,opacity=1){return this.plane(x,y,w,h,new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false}),z);}
  circle(x,y,r,color,z=0,opacity=1){const m=new THREE.Mesh(new THREE.CircleGeometry(r,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide}));m.position.set(x,y,z);this.group.add(m);return m;}
  ring(x,y,r,color,z=0,opacity=1){const m=new THREE.Mesh(new THREE.RingGeometry(r-1.4,r+1.4,64),new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide}));m.position.set(x,y,z);this.group.add(m);return m;}
  image(name,x,y,w,h,z=1,opacity=1){return this.plane(x,y,w,h,new THREE.MeshBasicMaterial({map:this.textures[name],transparent:true,opacity,depthWrite:false}),z);}
  bead(key,color,p,size,opacity=1){const mesh=this.image(COLORS[color].file,p.x,p.y,size,size,2,opacity);mesh.userData={x:p.x,y:p.y,size,opacity,color};this.beads.set(key,mesh);return mesh;}
  text(text,x,y,size=16,color='#796d55',align='center'){
    const c=document.createElement('canvas');c.width=Math.max(200,text.length*size*2.4);c.height=size*3;
    const ctx=c.getContext('2d');ctx.font=`${size*2}px "Microsoft YaHei", sans-serif`;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,c.width/2,c.height/2);
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.userData.temporary=true;
    this.plane(x,y,c.width/2,c.height/2,new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}),4);
  }
  draw(state,level,selected,hint){
    this.last=[state,level,selected,hint];this.clear();this.beads.clear();this.rims.clear();
    this.image('workbench',W/2,H/2,W,H,-5);
    this.text('料 杆 · 只 能 从 左 端 取 珠',compact?330:287,compact?82:90,17,'#5d6655');
    if(!compact){this.text('定 制 手 链',741,82,17,'#5d6655');this.rect(515,351,1,490,'#c7bba1',-1);}
    state.rails.forEach((rail,i)=>{
      const p=railPos(i);this.text('ABCD'[i],76,p.y,17,'#a08a58');
      this.rect(compact?325:294,p.y,compact?430:365,4,'#ad8d51',-1);this.circle(compact?540:467,p.y,5,'#b6995b',0);
      this.ring(p.x,p.y,34,'#b9a57d',0,.45);
      if(!rail.length)this.text('已取空',285,p.y,15,'#a39881');
      rail.forEach((c,j)=>{const q=railPos(i,j);this.bead(`rail-${i}-${j}`,c,q,83);});
      if(rail.length){this.text('‹',p.x-53,p.y,27,'#8e774c');if(selected?.type==='rail'&&selected.index===i)this.ring(p.x,p.y,40,'#365e4d',3);}
    });
    this.text('暂 存 盘',compact?330:237,compact?485:520,17,'#5d6655');
    state.buffer.forEach((c,i)=>{const p=bufferPos(i,level.capacity);this.circle(p.x+2,p.y+4,41,'#988465',-1,.13);this.circle(p.x,p.y,41,'#e5dcc8');this.rims.set(`buffer-${i}`,this.ring(p.x,p.y,39,'#b7a482'));this.ring(p.x,p.y,32,'#ccbea3',0,.5);if(c!==null)this.bead(`buffer-${i}`,c,p,83);else this.text('＋',p.x,p.y,24,'#b7a98d');if(selected?.type==='buffer'&&selected.index===i)this.ring(p.x,p.y,43,'#365e4d',3);});
    this.text(`${state.buffer.filter(c=>c!==null).length} / ${level.capacity} 格占用 · 用完即可腾空`,compact?330:240,compact?604:642,14,'#8a7e67');
    state.orders.forEach((done,i)=>{
      const p=orderPos(i), goal=level.orders[i];this.circle(p.x+2,p.y+4,105,'#988465',-1,.12);this.circle(p.x,p.y,106,'#f1ead9',0);this.ring(p.x,p.y,102,'#c7b692');this.rims.set(`order-${i}`,this.ring(p.x,p.y,74,'#b79657'));
      goal.forEach((c,j)=>{const q=beadPos(i,j,goal.length);this.bead(`order-${i}-${j}`,c,q,58,j<done.length?1:.29);if(j===done.length){this.ring(q.x,q.y,23,'#48725b',3);this.circle(q.x+17,q.y-17,4,'#48725b',4);}});
      this.text(`手链 ${i+1}`,p.x,p.y-12,17,'#6a634f');this.text(`${done.length} / ${goal.length}`,p.x,p.y+15,19,'#47634e');
      const next=goal[done.length];this.text(next===undefined?'已完成 ✓':`下一颗 · ${COLORS[next].name}${COLORS[next].symbol}`,p.x,p.y+136,16,next===undefined?'#3c7255':'#6d735d');
    });
    if(hint){const p=sourcePos(hint.source,level.capacity),q=hint.target.type==='order'?orderPos(hint.target.index):bufferPos(hint.target.index,level.capacity);this.ring(p.x,p.y,45,'#ba9146',4);this.ring(q.x,q.y,hint.target.type==='order'?112:45,'#ba9146',4);}
    this.frame(performance.now());
  }
  sourceKey(source){return source.type==='rail'?`rail-${source.index}-0`:`buffer-${source.index}`;}
  interruptSource(source){const key=this.sourceKey(source),e=this.effects.find(e=>e.type==='flight'&&e.key===key);if(!e)return null;const p={x:e.mesh.position.x,y:e.mesh.position.y};this.removeFx(e.mesh);this.removeFx(e.shadow);this.effects.splice(this.effects.indexOf(e),1);return p;}
  point(clientX,clientY){const r=this.host.getBoundingClientRect();return {x:(clientX-r.left)/r.width*W,y:(clientY-r.top)/r.height*H};}
  floating(color,point,size=83){const mesh=this.image(COLORS[color].file,point.x,point.y,size,size,12);this.fx.add(mesh);return mesh;}
  beginDrag(source,color,point,touch=false){
    this.releaseDrag();this.interruptSource(source);this.drag={key:this.sourceKey(source),source,color,point,contacts:new Set(),origin:sourcePos(source,this.last[1].capacity),touch,mesh:this.floating(color,point),shadow:this.circle(point.x,point.y,28,'#594b36',9,.16)};this.fx.add(this.drag.shadow);this.moveDrag(point);return true;
  }
  moveDrag(point,target=null,valid=false){
    if(!this.drag)return;const d=this.drag;d.point={x:point.x,y:point.y-(d.touch?62:18)};
    d.mesh.position.set(d.point.x,d.point.y,12);d.mesh.scale.set(92,-92,1);d.mesh.rotation.z=Math.max(-.25,Math.min(.25,(d.point.x-d.origin.x)*.0007));
    d.shadow.position.set(d.point.x+6,d.point.y+25,9);d.shadow.scale.set(1.15,.38,1);
    if(!this.reduced){
      const touching=new Set();
      for(const [key,m] of this.beads){if(key===d.key||m.userData.opacity<1||!m.visible)continue;
        const dx=m.position.x-d.point.x,dy=m.position.y-d.point.y,dist=Math.hypot(dx,dy),reach=(m.userData.size+92)*.3;
        if(dist<reach&&dist>1){touching.add(key);if(!d.contacts.has(key)){
          this.effects.push({type:'contact',key,dx:dx/dist*10,dy:dy/dist*10,start:performance.now(),duration:420});
          if(!d.contactTime||performance.now()-d.contactTime>110){d.contactTime=performance.now();this.onContact?.(m.userData.color,m.position.x);}
        }}
      }
      d.contacts=touching;
    }
    this.dragTarget=target?{...target,valid}:null;this.frame(performance.now());
  }
  removeFx(mesh){if(!mesh)return;this.fx.remove(mesh);if(mesh.geometry!==this.geometry)mesh.geometry.dispose();mesh.material.dispose();}
  releaseDrag(){
    if(!this.drag)return null;const d=this.drag;this.removeFx(d.mesh);this.removeFx(d.shadow);this.drag=null;this.dragTarget=null;return d;
  }
  cancelDrag(){const d=this.releaseDrag();if(!d)return;this.animate(d.color,d.point,d.origin,{key:d.key,returning:true});}
  animate(color,from,to,{key,target,source,returning=false,onImpact}={}){
    if(this.reduced){onImpact?.();this.render();return;}
    if(source?.type==='rail')for(const e of this.effects)if(e.source?.type==='rail'&&e.source.index===source.index)e.source=null;
    const mesh=this.floating(color,from),shadow=this.circle(from.x,from.y+18,25,'#594b36',8,.12);this.fx.add(shadow);
    this.effects.push({type:'flight',mesh,shadow,color,from,to,key,target,source,returning,onImpact,start:performance.now(),duration:returning?180:260,landed:false});this.frame(performance.now());
  }
  reject(target){
    const p=target.type==='order'?orderPos(target.index):bufferPos(target.index,this.last[1].capacity),ring=this.ring(p.x,p.y,target.type==='order'?109:43,'#ac6446',7,.8);this.fx.add(ring);
    this.effects.push({type:'reject',mesh:ring,target,start:performance.now(),duration:360});this.frame(performance.now());
  }
  impact(effect,now){
    const ring=this.ring(effect.to.x,effect.to.y,22,'#c7a460',7,.7);this.fx.add(ring);
    this.effects.push({type:'impact',mesh:ring,key:effect.key,target:effect.target,start:now,duration:650});
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2,mesh=this.circle(effect.to.x,effect.to.y,1.5,'#c7a460',9,.75);this.fx.add(mesh);this.effects.push({type:'spark',mesh,origin:effect.to,dx:Math.cos(a)*28,dy:Math.sin(a)*20-9,start:now,duration:400});}
    effect.onImpact?.();
  }
  celebrate(index){if(this.reduced)return;const p=orderPos(index),mesh=this.ring(p.x,p.y,100,'#b7954a',7,.8);this.fx.add(mesh);this.effects.push({type:'thread',mesh,index,start:performance.now(),duration:650});}
  cancelFeedback(){cancelAnimationFrame(this.raf);this.releaseDrag();for(const e of this.effects??[]){this.removeFx(e.mesh);this.removeFx(e.shadow);}this.effects=[];}
  frame(now){
    cancelAnimationFrame(this.raf);
    for(const mesh of this.beads.values()){const b=mesh.userData;mesh.position.set(b.x,b.y,2);mesh.scale.set(b.size,-b.size,1);mesh.rotation.z=0;mesh.material.opacity=b.opacity;mesh.visible=true;}
    for(const rim of this.rims.values()){rim.scale.set(1,1,1);rim.material.color.set('#b79657');}
    const selected=this.last?.[2],key=selected?this.sourceKey(selected):null;
    const picked=this.beads.get(key);if(picked){picked.position.y-=10;picked.scale.multiplyScalar(1.07);picked.rotation.z=-.045;}
    if(this.drag){const original=this.beads.get(this.drag.key);if(original)original.visible=false;}
    if(this.dragTarget){const t=this.dragTarget,rim=this.rims.get(`${t.type}-${t.index}`);if(rim){rim.material.color.set(t.valid?'#46795c':'#ac6446');rim.scale.setScalar(1.035);}}
    for(const e of [...this.effects]){
      const age=now-e.start,t=Math.max(0,Math.min(1,age/e.duration));
      if(e.type==='flight'){
        const dest=this.beads.get(e.key);
        if(age<e.duration){
          if(dest)dest.visible=false;const p=flightPoint(t,e.from,e.to,e.returning?12:35),size=83+(e.target?.type==='order'?58-83:0)*t;
          e.mesh.position.set(p.x,p.y,12);e.mesh.scale.set(size,-size,1);e.mesh.rotation.z=Math.sin(t*Math.PI)*.19;
          e.shadow.position.set(p.x+3,p.y+14+Math.sin(t*Math.PI)*16,8);e.shadow.scale.set(.8,.25,1);e.shadow.material.opacity=.12*(1-.5*Math.sin(t*Math.PI));
          if(e.source?.type==='rail')for(let j=0;j<5;j++){const m=this.beads.get(`rail-${e.source.index}-${j}`);if(m){m.position.x+=(compact?93:81)*(1-t)**3;m.rotation.z=rebound(age/1000, .12);}}
        }else if(!e.landed){e.landed=true;if(e.returning)e.onImpact?.();else this.impact(e,now);}
      }else if(e.type==='impact'){
        const spring=rebound(age/1000),m=this.beads.get(e.key);if(m){m.position.y+=spring*7;m.scale.x*=1+spring*.09;m.scale.y*=1-spring*.07;m.rotation.z=spring*.12;}
        const rim=this.rims.get(`${e.target?.type}-${e.target?.index}`);if(rim)rim.scale.setScalar(1+spring*.018);
        if(e.target?.type==='order')for(const step of [-1,1]){const neighbor=this.beads.get(`order-${e.target.index}-${Number(e.key.split('-')[2])+step}`);if(neighbor&&neighbor.userData.opacity===1){const wave=rebound(age/1000-.035,.65);neighbor.rotation.z=wave*.16;neighbor.position.y+=wave*4;}}
        e.mesh.scale.setScalar(1+t*1.8);e.mesh.material.opacity=.6*(1-t)**2;
      }else if(e.type==='contact'){
        const m=this.beads.get(e.key),s=rebound(age/1000+.02);if(m){m.position.x+=s*e.dx;m.position.y+=s*e.dy;m.rotation.z+=s*.14;}
      }else if(e.type==='thread'){
        e.mesh.scale.setScalar(1+t*.11);e.mesh.material.opacity=.75*(1-t);
        for(const [key,m] of this.beads)if(key.startsWith(`order-${e.index}-`)){const wave=rebound(age/1000);m.scale.multiplyScalar(1+wave*.055);m.rotation.z+=wave*.06;}
      }else if(e.type==='spark'){e.mesh.position.x=e.origin.x+e.dx*t;e.mesh.position.y=e.origin.y+e.dy*t;e.mesh.material.opacity=.75*(1-t)**2;
      }else if(e.type==='reject'){e.mesh.material.opacity=.8*(1-t);e.mesh.position.x+=Math.sin(age*.07)*(1-t)*.8;}
      if(age>=e.duration){this.removeFx(e.mesh);this.removeFx(e.shadow);this.effects.splice(this.effects.indexOf(e),1);}
    }
    this.render();if(this.effects.length)this.raf=requestAnimationFrame(t=>this.frame(t));
  }
  status(){return {dragging:!!this.drag,flights:this.effects.filter(e=>e.type==='flight').length,impacts:this.effects.filter(e=>e.type==='impact').length};
  }
  render(){this.renderer.render(this.scene,this.camera);}
}
