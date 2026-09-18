import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { buildJungle } from './jungle';
import { buildExpedition, naturalTexture } from './expedition';
import {hubLocations,surfaceHeight,challengeArea} from './landscape.mjs';
import {registerSolidGeometry} from './collisions';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type Movable = { mesh: THREE.Object3D; body: CANNON.Body; start: CANNON.Vec3 };
export function buildPlayground(scene: THREE.Scene, physics: CANNON.World) {
  const textures: THREE.Texture[] = [];
  const materials: THREE.Material[] = [];
  const movables: Movable[] = [];
  const animated: THREE.Object3D[] = [];
  let seed = 927;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const mat = (color: string, roughness = .8) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness, flatShading: false });
    materials.push(m);return m;
  };
  const path = mat('#eddbc0'), cream = mat('#ffedd0'), coral = mat('#d47757'), orange = mat('#ec703c'), charcoal = mat('#343d3e'), wood = mat('#ab7958'), teal = mat('#578b7d'), mint = mat('#91b293'), lilac = mat('#aa99ba'), yellow = mat('#eed289'), pink = mat('#d89989');
  const glass = mat('#577f81', .25), stone = mat('#c5b394');
  const naturalWood=naturalTexture('wood'),naturalStone=naturalTexture('stone'),gravel=naturalTexture('soil');textures.push(naturalWood,naturalStone,gravel);
  gravel.repeat.set(12,12);
  wood.map=naturalWood;wood.bumpMap=naturalWood;wood.bumpScale=.07;wood.color.set('#806445');
  stone.map=naturalStone;stone.bumpMap=naturalStone;stone.bumpScale=.09;stone.color.set('#929081');
  path.color.set('#a49778');path.map=gravel;path.bumpMap=gravel;path.bumpScale=.07;
  const mesh = (geometry:THREE.BufferGeometry, material:THREE.Material, parent:THREE.Object3D=scene) => {
    const o = new THREE.Mesh(geometry,material);o.castShadow=true;o.receiveShadow=true;o.userData.solid=['BoxGeometry','CylinderGeometry','DodecahedronGeometry'].includes(geometry.type);parent.add(o);return o;
  };
  const box = (w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=scene) => {
    const o=mesh(new THREE.BoxGeometry(w,h,d),m,parent);o.position.set(x,y,z);o.userData.solid=true;return o;
  };
  const cyl = (r:number,h:number,m:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=scene,n=24) => {
    const o=mesh(new THREE.CylinderGeometry(r,r,h,n),m,parent);o.position.set(x,y,z);o.userData.solid=true;return o;
  };
  // Box and cylinder visuals are registered after all final transforms are applied.
  const solid = (...args:number[]) => {void args};
  function relocate(start:number,id:keyof typeof hubLocations,oldX:number,oldZ:number){
    const h=hubLocations[id];
    for(const object of scene.children.slice(start)){object.position.x+=h.x-oldX;object.position.y+=h.height;object.position.z+=h.z-oldZ;if(animated.includes(object))object.userData.baseY=object.position.y}
  }
  function label(text:string,w:number,h:number,size=110,color='#3b4942',bg?:string) {
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*h/w);
    const ctx=canvas.getContext('2d')!;
    if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,canvas.width,canvas.height)}
    ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';
    const lines=text.split('\n');ctx.font=`800 ${size}px Arial, sans-serif`;
    lines.forEach((line,i)=>ctx.fillText(line,512,canvas.height/2+(i-(lines.length-1)/2)*size*1.2,960));
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textures.push(t);
    const m=new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,side:THREE.DoubleSide});materials.push(m);
    const o=mesh(new THREE.PlaneGeometry(w,h),m);o.castShadow=false;return o;
  }
  function groundLabel(text:string,x:number,z:number,w:number,h:number,size=110,color='#58735f') {
    const o=label(text,w,h,size,color);o.position.set(x,.095,z);o.rotation.x=-Math.PI/2;return o;
  }
  function sign(text:string,x:number,z:number,width=4.4) {
    const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=.3;scene.add(group);
    box(.13,2.3,.13,wood,-width*.38,1.15,0,group);box(.13,2.3,.13,wood,width*.38,1.15,0,group);
    box(width,1.3,.16,cream,0,2.1,0,group);
    const textMesh=label(text,width-.3,1,105);scene.remove(textMesh);group.add(textMesh);textMesh.position.set(0,2.1,.09);
    solid(width,1.3,.2,x,2.1,z,0,.3);
    return group;
  }
  const expedition=buildExpedition(scene);materials.push(...expedition.materials);textures.push(...expedition.textures);
  const plaza=cyl(13.5,.06,path,0,.03,2,scene,80);
  plaza.receiveShadow=true;
  box(5,.04,42,path,0,.035,-7);box(54,.04,5,path,0,.04,7);
  groundLabel('RAZEEN’S',0,-3,14,2.8,160,'#648871');
  groundLabel('EXPLORE',0,-.15,16,2.2,118,'#648871');
  groundLabel('CODE  /  CREATIVITY  /  CURIOSITY',0,2.1,13,.7,45,'#73896e');
  groundLabel('START HERE',0,12,5,.75,100,'#bd8461');
  // Painted starting grid and the tiny parking space for the rover.
  for(const x of [-1.6,1.6])box(.07,.025,3.8,cream,x,.08,8);
  box(3.25,.025,.07,cream,0,.08,10);
  for(let i=0;i<7;i++){box(.35,.025,.35,i%2?cream:coral,-1.1+i*.35,.09,5.5);box(.35,.025,.35,i%2?coral:cream,-1.1+i*.35,.09,5.85)}

  // Home base: a little studio with a striped awning and roof garden.
  const homeStart=scene.children.length;
  const hx=-12,hz=-7;
  box(8,.3,6.5,stone,hx,.15,hz);box(6,3.8,4.5,cream,hx,2.2,hz);solid(6,3.8,4.5,hx,2.2,hz);
  box(6.5,.3,5,coral,hx,4.2,hz);box(6,.14,4.6,cream,hx,4.4,hz);
  box(1.3,2.7,.08,teal,hx+.7,1.65,hz+2.3);box(.08,2.75,.14,wood,hx+1.4,1.65,hz+2.35);
  box(1.7,1.8,.08,glass,hx-1.4,2.2,hz+2.3);
  box(.07,1.8,.1,cream,hx-1.4,2.2,hz+2.36);box(1.7,.07,.1,cream,hx-1.4,2.2,hz+2.36);
  for(let i=0;i<10;i++){const a=box(.55,.12,1.8,i%2?cream:coral,hx-2.5+i*.55,3.3,hz+3);a.rotation.x=.12}
  for(const x of [hx-2.6,hx+2.5])box(.1,3.2,.1,wood,x,1.65,hz+3.65);
  box(1.8,.3,1.8,teal,hx-1.8,4.62,hz);cyl(.9,.2,cream,hx+1.3,4.62,hz);
  sign('01 / JUNGLE RETREAT',hx-10,hz+4,5.4);
  // Bench and mailbox outside the studio.
  box(2.4,.16,.75,wood,hx+4,.75,hz+2);box(2.4,.65,.12,wood,hx+4,1.12,hz+1.7);
  for(const x of [hx+3.1,hx+4.9]){box(.12,.7,.6,charcoal,x,.4,hz+2)}
  box(.12,1.4,.12,wood,-7,.7,-3);box(.7,.5,.9,coral,-7,1.6,-3);
  const homeText=label('HELLO,\nTRAVELLER.',3.2,1.6,110,'#fff0d5');homeText.position.set(hx,2.5,hz-2.29);homeText.rotation.y=Math.PI;

  relocate(homeStart,'about',hx,hz);

  // Workshop: an open industrial pavilion, circuit board and movable crates.
  const workStart=scene.children.length;
  const wx=21,wz=-12;
  box(9,.25,8,stone,wx,.13,wz);
  for(const x of [wx-3.7,wx+3.7])for(const z of [wz-3,wz+3]){box(.3,4.2,.3,wood,x,2.2,z);solid(.35,4.2,.35,x,2.2,z)}
  box(8.5,.4,7.5,teal,wx,4.45,wz);box(8.9,.12,7.9,mint,wx,4.7,wz);
  box(7.6,3,.2,cream,wx,1.7,wz-3);solid(7.6,3,.2,wx,1.7,wz-3);
  box(4.8,2.6,.15,charcoal,wx,2.2,wz-2.8);box(4.5,2.3,.08,teal,wx,2.2,wz-2.7);
  for(let i=0;i<8;i++){box(.12,.9+i%3*.15,.08,yellow,wx-1.8+i*.5,2.3,wz-2.63);box(.5,.08,.08,yellow,wx-1.6+i*.5,1.5+i%2*.7,wz-2.63)}
  box(1.1,.8,.12,charcoal,wx,2.25,wz-2.55);
  const pcbText=label('BUILD. BREAK. LEARN.',6,.7,82,'#ffedd0');pcbText.position.set(wx,4.45,wz+3.78);
  box(4,.18,1.5,wood,wx,1.4,wz);for(const x of [wx-1.7,wx+1.7])box(.15,1.4,1.2,charcoal,x,.7,wz);
  box(1.3,.65,.8,lilac,wx-.6,1.8,wz);box(.7,.3,.6,yellow,wx+1,1.65,wz);
  sign('02 / RIVERSIDE WORKSHOP',wx-10,wz+4,6.2);
  relocate(workStart,'work',wx,wz);

  // Learning campus: an arch and a monumental stack of books.
  const learningStart=scene.children.length;
  const lx=18,lz=22;
  cyl(7,.1,mint,lx,.05,lz,scene,64);
  for(const x of [lx-4.2,lx+4.2]){box(.7,4.7,.7,cream,x,2.35,lz-3);solid(.7,4.7,.7,x,2.35,lz-3)}
  box(9,1.1,.8,lilac,lx,4.7,lz-3);
  const learnText=label('NPTEL / ELITE + SILVER',8,.7,68,'#fff3dd');learnText.position.set(lx,4.7,lz-2.58);
  for(let i=0;i<4;i++){
    const g=new THREE.Group();scene.add(g);g.position.set(lx,.35+i*.58,lz);g.rotation.y=(i%2?1:-1)*.18;
    box(4,.42,2.7,cream,0,.2,0,g);box(4.15,.1,2.85,[coral,teal,lilac,yellow][i],0,-.06,0,g);box(4.15,.1,2.85,[coral,teal,lilac,yellow][i],0,.46,0,g);box(.2,.6,2.85,[coral,teal,lilac,yellow][i],-2.02,.2,0,g);
  }
  solid(4.2,3,3,lx,1.5,lz);
  const awardMetal=new THREE.MeshStandardMaterial({color:'#c5cdd1',metalness:.8,roughness:.25});materials.push(awardMetal);
  const badge=mesh(new THREE.OctahedronGeometry(1.1),awardMetal);badge.position.set(lx,4.7,lz);animated.push(badge);
  sign('03 / MOUNTAIN CAMPUS',lx-10,lz+4,6);
  groundLabel('JAVA / PYTHON / WHAT’S NEXT?',lx,lz+7,10,.85,67,'#6b846b');
  // A small mountain observatory makes the learning stop distinct on the skyline.
  cyl(2.7,2.3,stone,lx+8,1.15,lz-2);
  const dome=mesh(new THREE.SphereGeometry(2.75,24,16,0,Math.PI*2,0,Math.PI/2),teal);dome.position.set(lx+8,2.3,lz-2);dome.userData.solid=true;
  box(.2,2.5,3,glass,lx+8,2.4,lz-1.4);
  const telescope=cyl(.25,3,charcoal,lx+8,3.5,lz);telescope.rotation.x=.6;

  relocate(learningStart,'learning',lx,lz);

  // Creative garden: a sculptural camera, a pergola and display frames.
  const creativeStart=scene.children.length;
  const cx=-24,cz=20;
  cyl(7.4,.1,mint,cx,.05,cz,scene,64);
  box(4,.55,3,stone,cx,.3,cz);box(3.6,2.4,1.8,cream,cx,1.8,cz);solid(4,3,3,cx,1.5,cz);
  box(1.15,.45,.85,charcoal,cx-.6,3.2,cz);
  const lens=mesh(new THREE.CylinderGeometry(1.1,1.1,.8,32),charcoal);lens.rotation.x=Math.PI/2;lens.position.set(cx,1.8,cz+1.1);
  const lensGlass=mesh(new THREE.CylinderGeometry(.77,.77,.83,32),glass);lensGlass.rotation.x=Math.PI/2;lensGlass.position.set(cx,1.8,cz+1.15);
  const lensRim=mesh(new THREE.TorusGeometry(.93,.06,8,40),wood);lensRim.position.set(cx,1.8,cz+1.54);
  const shutter=cyl(.18,.13,coral,cx+1.2,3.08,cz);
  shutter.rotation.y=.2;
  for(let i=0;i<3;i++){
    const x=cx-5.5+i*4.3,z=cz-4.4;
    box(.15,2.5,.15,wood,x-1,1.25,z);box(.15,2.5,.15,wood,x+1,1.25,z);
    box(2.4,1.9,.14,cream,x,2.2,z);
    const panel=box(2.15,1.65,.08,[pink,lilac,teal][i],x,2.2,z+.1);
    panel.rotation.y=0;
    const circle=mesh(new THREE.CircleGeometry(.42,40),yellow);circle.position.set(x+.45,2.6,z+.15);
    const mountain=mesh(new THREE.ConeGeometry(.9,1.1,3),[coral,teal,mint][i]);mountain.rotation.x=0;mountain.position.set(x-.25,1.98,z+.2);mountain.scale.z=.03;
  }
  sign('04 / COASTAL STUDIO',cx-10,cz+4,5.8);
  relocate(creativeStart,'creative',cx,cz);

  // A little pond on the scenic route.
  const pond=cyl(5.3,.045,glass,-27,.03,0,scene,60);pond.scale.z=.66;pond.receiveShadow=true;
  const waterMat=new THREE.MeshBasicMaterial({color:'#b6d5bd',transparent:true,opacity:.45});materials.push(waterMat);
  for(let i=0;i<5;i++){const ripple=mesh(new THREE.RingGeometry(.8+i*.6,.825+i*.6,64),waterMat);ripple.rotation.x=-Math.PI/2;ripple.scale.y=.62;ripple.position.set(-27,.07,0)}
  for(let i=0;i<8;i++){const pad=cyl(.25+rand()*.2,.04,teal,-30+rand()*6,.08,-1.8+rand()*3.6,scene,12);pad.rotation.y=rand()*6}

  // Physical objects: lightweight crates and traffic cones can be nudged around.
  function movable(w:number,h:number,d:number,x:number,z:number,m:THREE.Material,mass=7) {
    const g=new THREE.Group();g.position.set(x,h/2+.08+surfaceHeight(x,z),z);scene.add(g);
    box(w,h,d,m,0,0,0,g);box(w+.02,.1,d+.02,cream,0,h*.3,0,g);box(.1,h+.02,d+.025,cream,0,0,0,g);
    const body=new CANNON.Body({mass,shape:new CANNON.Box(new CANNON.Vec3(w/2,h/2,d/2)),linearDamping:.12,angularDamping:.18});body.position.set(x,h/2+.08+surfaceHeight(x,z),z);physics.addBody(body);g.traverse(o=>{o.userData.solid=false});movables.push({mesh:g,body,start:body.position.clone()});
  }
  for(let i=0;i<5;i++)movable(.85,.85,.85,106+(i%2),51+Math.floor(i/2),wood);

  for(const [x,z] of [[105,-16],[121,-16],[105,-34],[121,-34]]){
    const g=new THREE.Group();scene.add(g);g.position.set(x,.45+surfaceHeight(x,z),z);box(.65,.08,.65,charcoal,0,-.4,0,g);
    const cone=mesh(new THREE.CylinderGeometry(.06,.28,.75,12),orange,g);cone.position.y=0;
    const stripe=mesh(new THREE.CylinderGeometry(.12,.17,.14,12),cream,g);stripe.position.y=.1;
    const body=new CANNON.Body({mass:3,shape:new CANNON.Box(new CANNON.Vec3(.3,.43,.3))});body.position.set(x,.45+surfaceHeight(x,z),z);physics.addBody(body);g.traverse(o=>{o.userData.solid=false});movables.push({mesh:g,body,start:body.position.clone()});
  }
  // Optional driving challenges live on their own clearing, away from through-roads.
  for(const x of [108,118]){
    for(const side of[-1,1]){box(.2,.14,8,wood,x+side*1.65,challengeArea.height+.07,-26);box(.2,.92,.25,wood,x+side*1.65,challengeArea.height+.46,-29.1)}
    // A matching descent prevents the rear overhang catching a vertical drop at low speed.
    for(const [z,slope] of [[-26,1],[-34,-1]]){
      const group=new THREE.Group();scene.add(group);group.position.set(x,challengeArea.height+.55-.12,z);group.rotation.x=slope*Math.atan2(1.1,8);
      box(4,.24,Math.hypot(8,1.1),wood,0,0,0,group).userData.driveable=true;
      for(const dx of[-1.8,1.8])box(.1,.015,7.8,cream,dx,.128,0,group);
    }
    for(const side of[-1,1])box(.2,.14,8,wood,x+side*1.65,challengeArea.height+.07,-34);
  }
  const challengeSignStart=scene.children.length;sign('OPTIONAL / TRAIL CHALLENGES',122,-12,6.5);
  for(const o of scene.children.slice(challengeSignStart))o.position.y+=challengeArea.height;
  const jungle=buildJungle(scene,physics);
  materials.push(...jungle.materials);textures.push(...jungle.textures);
  // Small wayfinding arrows near junctions.
  groundLabel('JUNGLE ←',-9,7,5,.8,90,'#b38162');groundLabel('RIVER →',12,7,5,.7,85,'#b38162');groundLabel('MOUNTAIN ↑',0,-14,5,.7,70,'#b38162');
  const solidBodies=registerSolidGeometry(scene,physics);
  return { movables, animated, materials, textures, label, solidBodies, ground:expedition.ground, groundMat:expedition.groundMat, wetMaterials:[path,wood,expedition.wood], updateJungle:(t:number,reduced:boolean)=>{jungle.update(t,reduced);expedition.update(t,reduced)} };
}

export function buildRover(scene:THREE.Scene) {
  const rover=new THREE.Group();scene.add(rover);
  const mats=[new THREE.MeshStandardMaterial({color:'#c9672d',roughness:.29,metalness:.55}),new THREE.MeshStandardMaterial({color:'#202723',roughness:.88}),new THREE.MeshStandardMaterial({color:'#d4ceb7',roughness:.4,metalness:.4}),new THREE.MeshStandardMaterial({color:'#496c6c',roughness:.08,metalness:.7})];
  function part(w:number,h:number,d:number,m:number,x:number,y:number,z:number,p=rover) {const o=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.15),mats[m]);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;p.add(o);return o}
  part(1.5,.48,2.7,0,0,.2,0);part(1.65,.16,2.85,1,0,-.02,0);part(1.38,.38,.86,0,0,.57,-.83);
  part(1.3,.7,1.02,0,0,.75,.14);part(1.42,.12,1.17,2,0,1.15,.14);
  part(1.12,.45,.06,3,0,.85,-.405);part(1.12,.4,.06,3,0,.85,.685);
  part(.06,.43,.84,3,-.665,.85,.14);part(.06,.43,.84,3,.665,.85,.14);
  part(1.6,.17,.18,2,0,.15,-1.5);part(1.6,.17,.18,1,0,.15,1.5);
  for(const x of [-.48,.48]){part(.32,.22,.09,2,x,.45,-1.38);part(.2,.12,.07,0,x,.32,1.4);part(.18,.12,.24,1,x*1.62,.85,-.3);}
  // Roof rack, luggage and a small whip antenna.
  for(const x of [-.55,.55])part(.06,.13,1.05,1,x,1.3,.14);
  for(const z of [-.3,.6])part(1.2,.07,.06,1,0,1.4,z);
  part(.76,.27,.64,0,0,1.41,.15);part(.06,.29,.65,2,-.22,1.43,.15);part(.06,.29,.65,2,.22,1.43,.15);
  part(.025,1.3,.025,1,.65,1.28,1.1);
  // Door seams, handles, steps, grille slots and a spare wheel reward a closer camera.
  for(const side of[-1,1]){
    part(.035,.38,.023,1,side*.754,.45,.68);part(.035,.055,.17,2,side*.766,.59,.48);
    part(.24,.09,1.35,1,side*.81,-.04,.13);
    for(const z of[-.84,.84])part(.16,.12,.92,0,side*.81,.35,z);
  }
  for(let i=0;i<7;i++)part(.065,.22,.025,1,-.3+i*.1,.44,-1.393);
  const spare=new THREE.Mesh(new THREE.TorusGeometry(.3,.13,10,24),mats[1]);spare.position.set(0,.55,1.48);rover.add(spare);
  const spareRim=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.18,16),mats[2]);spareRim.rotation.x=Math.PI/2;spareRim.position.copy(spare.position);rover.add(spareRim);
  const headMat=new THREE.MeshStandardMaterial({color:'#fff4d7',emissive:'#fff0c5',emissiveIntensity:1.5,roughness:.12});
  const brakeMat=new THREE.MeshStandardMaterial({color:'#922919',emissive:'#ff3217',emissiveIntensity:.35});
  for(const side of[-1,1]){
    const light=new THREE.Mesh(new RoundedBoxGeometry(.28,.16,.03,2,.02),headMat);light.position.set(side*.48,.45,-1.435);rover.add(light);
    const rear=new THREE.Mesh(new THREE.BoxGeometry(.18,.12,.03),brakeMat);rear.position.set(side*.55,.35,1.44);rover.add(rear);
  }
  const headlight=new THREE.SpotLight('#fff0c4',20,32,.48,.6,1.3);headlight.position.set(0,.6,-1.4);headlight.target.position.set(0,-.4,-20);rover.add(headlight,headlight.target);
  const wipers=[part(.035,.37,.025,1,-.3,.83,-.445),part(.035,.37,.025,1,.3,.83,-.445)];
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(.45,.26),new THREE.MeshStandardMaterial({color:'#fcdf90',side:THREE.DoubleSide}));flag.position.set(.87,1.8,1.1);rover.add(flag);
  const wheels:THREE.Group[]=[];
  for(let i=0;i<4;i++){
    const g=new THREE.Group();scene.add(g);wheels.push(g);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.33,20),mats[1]);tire.rotation.z=Math.PI/2;tire.castShadow=true;g.add(tire);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.345,12),mats[2]);rim.rotation.z=Math.PI/2;g.add(rim);
    for(let j=0;j<12;j++){const tread=part(.37,.07,.14,1,0,Math.sin(j/12*Math.PI*2)*.44,Math.cos(j/12*Math.PI*2)*.44,g);tread.rotation.x=-j/12*Math.PI*2;}
  }
  return {rover,wheels,materials:[...mats,flag.material,headMat,brakeMat],update(t:number,rain:boolean,brake:boolean){wipers.forEach(w=>{w.rotation.z=rain?Math.sin(t*6)*.85:.7});brakeMat.emissiveIntensity=brake?3:.35;headlight.intensity=rain?45:12}};
}



