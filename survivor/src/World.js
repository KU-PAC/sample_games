import * as THREE from 'three';
import { createRun, tick, snapshot, chooseUpgrade, terrainHeight } from './model.js';
export class World {
  constructor(container, onChange, onError) {
    this.container = container; this.onChange = onChange; this.state = createRun(); this.keys = new Set(); this.touch = {x:0,z:0}; this.objects = new Map(); this.resources = new Set(); this.uiTimer = 0;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#bccbb8'); this.scene.fog = new THREE.Fog('#bccbb8', 38, 85);
    this.camera = new THREE.PerspectiveCamera(42, 1, .1, 160);
    this.camera.position.set(0,24,23);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.0;
    container.appendChild(this.renderer.domElement); this.renderer.domElement.setAttribute('aria-label','起伏のある3Dフィールド。WASDで移動し、敵を自動攻撃します。');
    this.scene.add(new THREE.HemisphereLight('#f4ffe7','#41564b',1.8));
    this.sun = new THREE.DirectionalLight('#fff2cc',2.2); this.sun.position.set(-14,30,14); this.sun.castShadow=true; this.sun.shadow.mapSize.set(1024,1024); Object.assign(this.sun.shadow.camera,{left:-38,right:38,top:38,bottom:-38,far:100}); this.sun.shadow.bias=-.001; this.scene.add(this.sun);
    this.buildTerrain(); this.player = this.makePlayer(); this.scene.add(this.player);
    this.rangeRing = this.mesh(new THREE.RingGeometry(11.92,12,80), '#f0ffd5'); this.rangeRing.castShadow=false; this.rangeRing.material.transparent=true; this.rangeRing.material.opacity=.13; this.rangeRing.material.side=THREE.DoubleSide; this.rangeRing.rotation.x=-Math.PI/2; this.scene.add(this.rangeRing);
    this.orbits = [];
    this.down = e => { if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Escape','KeyP'].includes(e.code) && !['BUTTON','INPUT'].includes(e.target.tagName)) e.preventDefault(); if (!e.repeat && ['Escape','KeyP'].includes(e.code)) this.pause(); this.keys.add(e.code); };
    this.up = e => this.keys.delete(e.code);
    this.blur = () => { this.keys.clear(); this.touch = {x:0,z:0}; if(this.state.status==='playing')this.pause(); };
    this.contextLost = e => { e.preventDefault(); this.blur(); onError('3D描画が中断されました。ページを再読み込みしてください。'); };
    window.addEventListener('keydown',this.down); window.addEventListener('keyup',this.up); window.addEventListener('blur',this.blur); this.renderer.domElement.addEventListener('webglcontextlost',this.contextLost);
    this.resize = new ResizeObserver(()=>{const {clientWidth:w,clientHeight:h}=container;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}); this.resize.observe(container);
    this.last = performance.now(); this.renderer.setAnimationLoop(now=>this.frame(now)); onChange(snapshot(this.state));
  }
  mesh(geometry, color, extra={}) {
    this.resources.add(geometry); const material=new THREE.MeshStandardMaterial({color,flatShading:true,roughness:.9,...extra}); this.resources.add(material); const m=new THREE.Mesh(geometry,material); m.castShadow=true;m.receiveShadow=true;return m;
  }
  buildTerrain() {
    const geo = new THREE.PlaneGeometry(76,76,48,48); geo.rotateX(-Math.PI/2);
    const pos=geo.attributes.position, colors=[];
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,terrainHeight(x,z));const c=new THREE.Color().setHSL(.22+Math.sin(x*.2)*.018,.21,.39+Math.sin(x*.7+z*.5)*.035);colors.push(c.r,c.g,c.b);}
    const old=geo.index.array, indices=[];for(let i=0;i<old.length;i+=3){if([old[i],old[i+1],old[i+2]].every(j=>Math.hypot(pos.getX(j),pos.getZ(j))<37))indices.push(old[i],old[i+1],old[i+2]);}
    geo.setIndex(indices);geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();this.scene.add(this.mesh(geo,'#ffffff',{vertexColors:true}));
    const base=this.mesh(new THREE.CylinderGeometry(36,31,6,64),'#566456');base.position.y=-4;this.scene.add(base);
    const rim=this.mesh(new THREE.TorusGeometry(29.5,.045,4,100),'#d8e5b3',{emissive:'#7c9a51',emissiveIntensity:.6});rim.rotation.x=Math.PI/2;rim.position.y=1.3;this.scene.add(rim);
    for(let i=0;i<74;i++){
      const a=i*2.39996,r=i<50?30+Math.sin(i*7)*3:9+((i*13)%20);const x=Math.cos(a)*r,z=Math.sin(a)*r;
      if(i>=50&&Math.hypot(x,z)<11)continue;
      const group=new THREE.Group();const height=2.1+(i%4)*.55;
      if(i%4===0){const rock=this.mesh(new THREE.DodecahedronGeometry(1+(i%3)*.4,0),'#91a087');rock.scale.y=.65;group.add(rock);}
      else{const trunk=this.mesh(new THREE.CylinderGeometry(.12,.2,height,5),'#655c44');trunk.position.y=height/2;group.add(trunk);for(let j=0;j<3;j++){const leaves=this.mesh(new THREE.ConeGeometry(1.3-j*.26,1.9,5),i%3===0?'#c7a47b':j%2?'#60785a':'#76916a');leaves.position.y=height-1+j*.6;leaves.rotation.y=i;group.add(leaves);}}
      group.position.set(x,terrainHeight(x,z),z);this.scene.add(group);
    }
    for(let i=0;i<60;i++){const x=Math.sin(i*8.13)*28,z=Math.cos(i*4.78)*28;if(Math.hypot(x,z)>29)continue;const flower=this.mesh(new THREE.ConeGeometry(.16,.5,4),i%2?'#e6dba3':'#dad8b6');flower.castShadow=false;flower.position.set(x,terrainHeight(x,z)+.25,z);this.scene.add(flower);}
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2;const pillar=this.mesh(new THREE.BoxGeometry(.8,2+i%2,.8),'#a3ad94');const x=Math.cos(a)*16,z=Math.sin(a)*16;pillar.position.set(x,terrainHeight(x,z)+1,z);pillar.rotation.z=.1;this.scene.add(pillar);const crystal=this.mesh(new THREE.OctahedronGeometry(.32),'#d7f9be',{emissive:'#bbeb99',emissiveIntensity:.5});crystal.position.set(x,terrainHeight(x,z)+2.6,z);this.scene.add(crystal);}
  }
  makePlayer(){
    const g=new THREE.Group();const body=this.mesh(new THREE.ConeGeometry(.5,1.1,6),'#f0ead1');body.position.y=.75;g.add(body);
    const head=this.mesh(new THREE.IcosahedronGeometry(.35,0),'#2b5351');head.position.y=1.5;g.add(head);
    const hood=this.mesh(new THREE.ConeGeometry(.43,.6,5),'#e7e4c8');hood.position.y=1.85;hood.rotation.z=-.2;g.add(hood);
    const scarf=this.mesh(new THREE.BoxGeometry(.6,.17,.27),'#dc855e');scarf.position.set(0,1.22,.27);g.add(scarf);
    const staff=this.mesh(new THREE.CylinderGeometry(.045,.045,1.7,5),'#795d42');staff.position.set(.6,.85,0);g.add(staff);
    const gem=this.mesh(new THREE.OctahedronGeometry(.19),'#dfffad',{emissive:'#bdff7c',emissiveIntensity:1});gem.position.set(.6,1.8,0);g.add(gem);
    return g;
  }
  enemyMesh(e){const g=new THREE.Group();const color=e.type==='brute'?'#a65f46':e.type==='runner'?'#9e6389':'#b97976';const body=this.mesh(e.type==='runner'?new THREE.OctahedronGeometry(.65):new THREE.IcosahedronGeometry(e.radius,0),color);body.position.y=e.radius+.2;g.add(body);for(const x of [-.22,.22]){const eye=this.mesh(new THREE.BoxGeometry(.12,.12,.1),'#ffecd0',{emissive:'#ffbd81',emissiveIntensity:1});eye.position.set(x,e.radius+.25,.5);g.add(eye);}return g;}
  sync(items,prefix,make,update){const alive=new Set(items.map(i=>prefix+i.id));for(const [key,obj] of this.objects){if(key.startsWith(prefix)&&!alive.has(key)){this.scene.remove(obj);obj.traverse(child=>{if(child.isMesh){child.geometry.dispose();this.resources.delete(child.geometry);child.material.dispose();this.resources.delete(child.material);}});this.objects.delete(key);}}
    for(const item of items){const key=prefix+item.id;let obj=this.objects.get(key);if(!obj){obj=make(item);if(prefix==='shot'||prefix==='particle'||prefix==='item')obj.traverse(child=>{child.castShadow=false;child.receiveShadow=false;});this.objects.set(key,obj);this.scene.add(obj);}update(obj,item);}}
  frame(now){const dt=Math.min((now-this.last)/1000,.05);this.last=now;const s=this.state;
    tick(s,dt,{x:(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0)+this.touch.x,z:(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0)+this.touch.z,dash:this.keys.has('Space')||this.touch.dash});
    const p=s.player,t=s.status==='ready'?now/1000:s.time;
    this.player.position.set(p.x,terrainHeight(p.x,p.z)+Math.sin(t*6)*.045,p.z);this.player.rotation.y=p.angle;this.player.visible=p.invincible<=0||Math.floor(now/65)%2===0;
    this.rangeRing.position.set(p.x,terrainHeight(p.x,p.z)+.05,p.z);this.rangeRing.scale.setScalar(s.stats.range/12);
    const target=new THREE.Vector3(p.x*.84,23+terrainHeight(p.x,p.z),p.z*.84+23);this.camera.position.lerp(target,1-Math.exp(-dt*4));this.camera.lookAt(p.x*.84,0,p.z*.84-1.5);
    this.sync(s.enemies,'enemy',e=>this.enemyMesh(e),(o,e)=>{o.position.set(e.x,terrainHeight(e.x,e.z)+Math.abs(Math.sin(t*7+e.id))*.1,e.z);o.rotation.y=Math.atan2(p.x-e.x,p.z-e.z);o.scale.setScalar(e.hit?1.15:1);});
    this.sync(s.shots,'shot',()=>this.mesh(new THREE.IcosahedronGeometry(.2,0),'#e7ffc3',{emissive:'#b7f87a',emissiveIntensity:1}),(o,b)=>{o.position.set(b.x,terrainHeight(b.x,b.z)+1,b.z);o.scale.set(1,1,1.6);});
    this.sync(s.items,'item',i=>this.mesh(i.kind==='upgrade'?new THREE.OctahedronGeometry(.65):new THREE.OctahedronGeometry(i.kind==='xp'?.18:.35),i.kind==='upgrade'?'#ffcf7d':i.kind==='health'?'#ffa5a1':'#b9ecbb',{emissive:i.kind==='upgrade'?'#df9c42':'#80c591',emissiveIntensity:.4}),(o,i)=>{o.position.set(i.x,terrainHeight(i.x,i.z)+.55+Math.sin(t*3+i.id)*.15,i.z);o.rotation.y=t*1.4;});
    this.sync(s.particles,'particle',pt=>this.mesh(new THREE.BoxGeometry(.13,.13,.13),pt.color),(o,pt)=>{o.position.set(pt.x,terrainHeight(pt.x,pt.z)+Math.max(.05,pt.y),pt.z);o.scale.setScalar(pt.life/.7);});
    while(this.orbits.length<s.stats.orbit){const orb=this.mesh(new THREE.OctahedronGeometry(.36),'#f9e9ab',{emissive:'#f9c55a',emissiveIntensity:.5});this.orbits.push(orb);this.scene.add(orb);}
    this.orbits.forEach((o,i)=>{o.visible=i<s.stats.orbit;const a=s.time*2.6+i*Math.PI*2/s.stats.orbit;o.position.set(p.x+Math.cos(a)*3,terrainHeight(p.x,p.z)+1.1,p.z+Math.sin(a)*3);o.rotation.y=t*4;});
    this.renderer.render(this.scene,this.camera);this.uiTimer+=dt;if(this.uiTimer>.08||s.status!==this.lastStatus){this.uiTimer=0;this.lastStatus=s.status;this.onChange(snapshot(s));}
  }
  start(){this.state=createRun();this.state.status='playing';this.keys.clear();this.touch={x:0,z:0};this.onChange(snapshot(this.state));}
  pause(){if(this.state.status==='playing')this.state.status='paused';else if(this.state.status==='paused')this.state.status='playing';this.keys.clear();this.touch={x:0,z:0};this.onChange(snapshot(this.state));}
  upgrade(id){chooseUpgrade(this.state,id);this.onChange(snapshot(this.state));}
  dispose(){this.renderer.setAnimationLoop(null);this.resize.disconnect();window.removeEventListener('keydown',this.down);window.removeEventListener('keyup',this.up);window.removeEventListener('blur',this.blur);this.renderer.domElement.removeEventListener('webglcontextlost',this.contextLost);for(const r of this.resources)r.dispose();this.renderer.dispose();this.renderer.domElement.remove();}
}
