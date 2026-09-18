import * as THREE from 'three';
import {buildCoast} from './coast';
import {waterMaterial} from './water';
import {roadSurface} from './roads';
import {buildBiomes} from './biomes';
import {terrainHeight,surfaceHeight,TERRAIN_EXTENT,TERRAIN_STEP,isOuterTrail,bridges,bridgeParts,isHubClearing,shorelineZ,routeLines,cityWeight,desertWeight} from './landscape.mjs';

/** Small locally generated material maps avoid large downloads on mobile. */
export function naturalTexture(kind:'soil'|'wood'|'stone'|'leaves'|'frond') {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const c=canvas.getContext('2d')!;let seed=623;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  if(kind==='frond') {
    const gradient=c.createLinearGradient(0,0,256,0);gradient.addColorStop(0,'#54783b');gradient.addColorStop(.49,'#819b49');gradient.addColorStop(.52,'#416b34');gradient.addColorStop(1,'#668444');c.fillStyle=gradient;c.fillRect(0,0,256,256);
    c.strokeStyle='#aec17277';c.lineWidth=1.2;
    for(let y=0;y<300;y+=18){c.beginPath();c.moveTo(128,y);c.lineTo(0,y-48);c.moveTo(128,y);c.lineTo(256,y-48);c.stroke()}
    c.strokeStyle='#c1cb8a';c.lineWidth=2;c.beginPath();c.moveTo(128,0);c.lineTo(128,256);c.stroke();
  } else if(kind==='leaves') {
    for(let i=0;i<150;i++){
      const a=random()*Math.PI*2,r=Math.sqrt(random())*104,x=128+Math.cos(a)*r,y=128+Math.sin(a)*r;
      c.save();c.translate(x,y);c.rotate(a);c.fillStyle=['#698d46','#3c602d','#8a9f56','#55783a'][i%4];
      c.beginPath();c.ellipse(0,0,6+random()*7,2+random()*4,0,0,Math.PI*2);c.fill();
      c.strokeStyle='#aec27566';c.lineWidth=.65;c.beginPath();c.moveTo(-6,0);c.lineTo(7,0);c.stroke();c.restore();
    }
  } else {
    c.fillStyle=kind==='wood'?'#ae9a7e':kind==='stone'?'#a1a49a':'#a5a393';c.fillRect(0,0,256,256);
    for(let i=0;i<11000;i++){
      const v=Math.floor(90+random()*150);c.fillStyle=`rgba(${v},${v},${v},${.12+random()*.4})`;
      c.fillRect(random()*256,random()*256,kind==='wood'?.4+random():1+random()*2,kind==='wood'?5+random()*65:1+random()*2);
    }
    if(kind==='wood')for(let i=0;i<8;i++){c.strokeStyle='#59473555';c.lineWidth=.7;c.beginPath();c.ellipse(random()*256,random()*256,3+random()*7,15+random()*28,.02,0,Math.PI*2);c.stroke()}
    if(kind==='soil')for(let i=0;i<180;i++){c.fillStyle=i%2?'#524c3780':'#c7b9a266';c.beginPath();c.ellipse(random()*256,random()*256,random()*4+1,random()*2+1,random()*6,0,Math.PI*2);c.fill()}
  }
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;
}

export const scenicStops:{id:string;label:string;x:number;z:number;yaw?:number}[]=[
  {id:'river',label:'River bridge',x:51,z:7},
  {id:'ridge',label:'Mountain pass',x:6,z:-97},
  {id:'camp',label:'Vibe coding camp',x:-58,z:-48},
  {id:'beach',label:'Beach viewpoint',x:-37,z:80},
  {id:'challenge',label:'Optional trail challenges',x:113,z:-14},
  {id:'summit',label:'Cloud ridge',x:-55,z:-179,yaw:Math.PI},
  {id:'cove',label:'Western cove',x:-173,z:66},
  {id:'overlook',label:'Eastern overlook',x:175,z:-63},
  {id:'city',label:'Copperlight city',x:-142,z:-77},
  {id:'desert',label:'Sandstone desert',x:155,z:-110,yaw:.7},
  {id:'forest',label:'Highland forest',x:-58,z:-90,yaw:-1.1},
];

export function buildExpedition(scene:THREE.Scene) {
  const materials:THREE.Material[]=[],textures:THREE.Texture[]=[];
  const soil=naturalTexture('soil'),woodMap=naturalTexture('wood'),rockMap=naturalTexture('stone');textures.push(soil,woodMap,rockMap);
  const groundMat=new THREE.MeshStandardMaterial({map:soil,bumpMap:soil,bumpScale:.18,vertexColors:true,roughness:1});materials.push(groundMat);textures.push(roadSurface(groundMat));
  const wood=new THREE.MeshStandardMaterial({color:'#706045',map:woodMap,bumpMap:woodMap,bumpScale:.065,roughness:.83});
  const metal=new THREE.MeshStandardMaterial({color:'#4d5750',metalness:.65,roughness:.6});
  const stone=new THREE.MeshStandardMaterial({color:'#747a6b',map:rockMap,bumpMap:rockMap,bumpScale:.12,roughness:.95});materials.push(wood,metal,stone);
  const g=new THREE.BufferGeometry(),p:number[]=[],uv:number[]=[],colors:number[]=[],indices:number[]=[];
  const n=TERRAIN_EXTENT*2/TERRAIN_STEP,green=new THREE.Color();
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){
    const x=i*TERRAIN_STEP-TERRAIN_EXTENT,z=TERRAIN_EXTENT-j*TERRAIN_STEP,y=terrainHeight(x,z);
    p.push(x,y,z);uv.push(x/5,z/5);
    green.setHSL(.23+Math.sin(x*.1)*.012,.23,.21+(Math.sin(x*.12)*Math.cos(z*.11)+1)*.034);
    const beach=THREE.MathUtils.smoothstep(z,shorelineZ(x)-25,shorelineZ(x)-5);green.lerp(new THREE.Color('#c9b58c'),beach);
    const slope=Math.hypot(terrainHeight(x+1,z)-terrainHeight(x-1,z),terrainHeight(x,z+1)-terrainHeight(x,z-1))/2;
    if(z< -62)green.lerp(new THREE.Color('#797e77'),Math.min(.9,Math.max(0,(slope-.23)*1.2)+(y>30?.45:0)));
    green.lerp(new THREE.Color('#b99d75'),cityWeight(x,z));
    green.lerp(new THREE.Color('#dda366'),desertWeight(x,z));

    colors.push(green.r,green.g,green.b);
    if(i<n&&j<n){const a=i*(n+1)+j,b=(i+1)*(n+1)+j;indices.push(a,b,a+1,b,b+1,a+1)}
  }
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
  const ground=new THREE.Mesh(g,groundMat);ground.receiveShadow=true;scene.add(ground);
  const box=(w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number,rz=0)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.rotation.z=rz;mesh.castShadow=mesh.receiveShadow=true;mesh.userData.solid=true;scene.add(mesh);return mesh;
  };
  const screwGeometry=new THREE.CylinderGeometry(.045,.045,.028,6);
  const screws=new THREE.InstancedMesh(screwGeometry,metal,500),dummy=new THREE.Object3D();let si=0;scene.add(screws);
  bridges.forEach(b=>{
    bridgeParts(b).forEach(p=>{
      box(p.w,p.h,p.d,wood,p.x,p.y,p.z,p.rz).userData.solid=false;
      if(p.kind==='deck')for(const side of[-1,1]){dummy.position.set(p.x,p.y+p.h/2+.014,p.z+side*(p.d/2-.3));dummy.updateMatrix();screws.setMatrixAt(si++,dummy.matrix)}
    });
    for(const side of[-1,1]){
      box(b.length,.3,.25,wood,b.x,b.height-.5,b.z+side*(b.width/2-.4));
      for(let x=b.x-b.length/2+1;x<b.x+b.length/2;x+=4){
        const y=surfaceHeight(x,b.z+side*(b.width/2-.4));box(.3,b.height-y,.3,wood,x,(b.height+y)/2,b.z+side*(b.width/2-.4));
      }
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(b.x-b.length/2,b.height+1.12,b.z+side*b.width/2),new THREE.Vector3(b.x,b.height+.9,b.z+side*b.width/2),new THREE.Vector3(b.x+b.length/2,b.height+1.12,b.z+side*b.width/2)]);
      const rope=new THREE.Mesh(new THREE.TubeGeometry(curve,30,.028,5,false),wood);scene.add(rope);
    }
  });screws.count=si;

  // Dense outer vegetation uses shared geometry and a few draw calls.
  const leafMap=naturalTexture('leaves');textures.push(leafMap);
  const leafMat=new THREE.MeshStandardMaterial({map:leafMap,alphaTest:.4,side:THREE.DoubleSide,roughness:1});materials.push(leafMat);
  const bark=new THREE.MeshStandardMaterial({color:'#675944',map:woodMap,bumpMap:woodMap,bumpScale:.14,roughness:1});materials.push(bark);
  const treeCount=650,trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.19,.45,1,7),bark,treeCount),leaves=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),leafMat,treeCount*9);
  trunks.userData.solid=true;trunks.castShadow=trunks.receiveShadow=leaves.castShadow=leaves.receiveShadow=true;scene.add(trunks,leaves);
  let seed=22497;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};let ti=0,li=0;
  for(let attempt=0;attempt<20000&&ti<treeCount;attempt++){
    const a=rand()*Math.PI*2,r=53+rand()*139,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(cityWeight(x,z)>.08||desertWeight(x,z)>.12||isOuterTrail(x,z,3)||isHubClearing(x,z,3)||z>shorelineZ(x)-12||surfaceHeight(x,z)>30||Math.abs(x-72)<10&&Math.abs(z-7)<36||scenicStops.some(s=>Math.hypot(s.x-x,s.z-z)<10))continue;
    const y=surfaceHeight(x,z),h=6+rand()*6,s=1+rand()*.5;
    dummy.position.set(x,y+h/2,z);dummy.scale.set(s,h,s);dummy.rotation.set(0,a,.02);dummy.updateMatrix();trunks.setMatrixAt(ti,dummy.matrix);
    for(let j=0;j<9;j++){
      dummy.position.set(x+Math.sin(j*2.4)*(z< -65?.5:1.7),y+(z< -65?h*.46+j*.52:h-.7+Math.cos(j)*1.2),z+Math.cos(j*2.4)*(z< -65?.5:1.7));dummy.scale.setScalar(z< -65?4.8-j*.32:4+rand()*2);dummy.rotation.set(j%3===0?-Math.PI/2:.25,j*2.4,a*.1);dummy.updateMatrix();leaves.setMatrixAt(li++,dummy.matrix);
    }
    ti++;
  }trunks.count=ti;leaves.count=li;
  // Markers follow the branching roads; the old circular roadside ring is gone.
  const stones=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),stone,1200);stones.receiveShadow=true;scene.add(stones);let stoneIndex=0;
  const reflector=new THREE.MeshStandardMaterial({color:'#b9b08e',roughness:.8});materials.push(reflector);
  routeLines.forEach(line=>line.forEach((point,index)=>{if(index===0)return;const previous=line[index-1],dx=point[0]-previous[0],dz=point[1]-previous[1],length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
    for(let distance=0;distance<length;distance+=2.6)for(const side of[-1,1]){const x=previous[0]+dx*distance/length+nx*side*5.6,z=previous[1]+dz*distance/length+nz*side*5.6;
      if(isOuterTrail(x,z,.6)||isHubClearing(x,z))continue;
      dummy.position.set(x,surfaceHeight(x,z)+.06,z);dummy.scale.set(.12+rand()*.13,.06+rand()*.09,.15+rand()*.2);dummy.rotation.set(rand(),distance,rand());dummy.updateMatrix();if(stoneIndex<1200)stones.setMatrixAt(stoneIndex++,dummy.matrix);
    }
  }));stones.count=stoneIndex;
  function board(text:string,x:number,z:number){
    const y=surfaceHeight(x,z);box(.15,2.3,.15,wood,x,y+1.15,z);box(4.4,.85,.16,wood,x,y+2.25,z);
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#eadfc5';ctx.font='500 52px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,96,965);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;textures.push(t);const m=new THREE.MeshBasicMaterial({map:t,transparent:true});materials.push(m);const face=new THREE.Mesh(new THREE.PlaneGeometry(4.2,.79),m);face.position.set(x,y+2.25,z+.085);scene.add(face);
  }
  board('RIVER CROSSING →',42,12);board('FOREST TRAIL',7,-43);board('MOUNTAIN CAMPUS ↑',-9,-85);board('VIBE CODING →',-53,-44);board('BEACH & PHOTOGRAPHY',-34,72);
  // A small open-air coding desk is personal content, not a fabricated work project.
  const campsiteStart=scene.children.length;
  const campY=surfaceHeight(-96,16);box(4,.15,1.8,wood,-96,campY+1.1,16);
  for(const x of[-97.7,-94.3])box(.15,1.1,1.5,metal,x,campY+.55,16);
  const screenMat=new THREE.MeshStandardMaterial({color:'#101c1c',roughness:.24,metalness:.4});materials.push(screenMat);
  box(1.2,.06,.8,screenMat,-96,campY+1.21,16);box(1.2,.8,.06,screenMat,-96,campY+1.6,15.64);
  const codeMat=new THREE.MeshBasicMaterial({color:'#91c6a1'});materials.push(codeMat);
  for(let i=0;i<6;i++)box(.3+(i%3)*.2,.022,.01,codeMat,-96.12,campY+1.83-i*.085,15.68);
  box(2.6,.15,.7,wood,-96,campY+.55,17.6);for(const x of[-97,-95])box(.13,.55,.65,metal,x,campY+.27,17.6);
  const tentGeo=new THREE.ConeGeometry(2.9,2.4,4),tentMat=new THREE.MeshStandardMaterial({color:'#9d7545',roughness:1});materials.push(tentMat);const tent=new THREE.Mesh(tentGeo,tentMat);tent.position.set(-102,surfaceHeight(-102,16)+1.2,16);tent.rotation.y=Math.PI/4;tent.castShadow=true;scene.add(tent);
  for(const object of scene.children.slice(campsiteStart)){object.position.x+=38;object.position.z-=76;object.position.y+=surfaceHeight(-58,-60)-campY;object.userData.solid=true}
  const time={value:0};const water=waterMaterial('river',time);materials.push(water);
  const river=new THREE.Mesh(new THREE.PlaneGeometry(8,58,1,1),water);river.rotation.x=-Math.PI/2;river.position.set(72,-.16,7);river.receiveShadow=true;scene.add(river);
  const seaWater=waterMaterial('sea',time);materials.push(seaWater);
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(700,360,100,60),seaWater);sea.rotation.x=-Math.PI/2;sea.position.set(0,.05,260);sea.receiveShadow=true;scene.add(sea);
  const seaBase=sea.geometry.attributes.position.array.slice();
  const mistMat=new THREE.MeshBasicMaterial({color:'#d5e4d4',transparent:true,opacity:.24,depthWrite:false});materials.push(mistMat);
  const foam=new THREE.InstancedMesh(new THREE.RingGeometry(.3,.32,16),mistMat,45);scene.add(foam);
  // Timber safety rails frame the ridge turnout, clear of the access road.
  for(const x of[-65,-55,-45])box(.22,1.4,.22,wood,x,surfaceHeight(x,-189)+.7,-189);
  box(20,.18,.18,wood,-55,surfaceHeight(-55,-189)+1.1,-189);
  board('CLOUD RIDGE',-49,-178);board('WESTERN COVE',-180,66);board('EASTERN OVERLOOK',178,-70);
  board('COPPERLIGHT / CITY DISTRICT',-114,-43);board('SANDSTONE / DESERT TRAIL',183,-78);board('HIGHLAND FOREST',-64,-98);
  const biomes=buildBiomes(scene,rockMap,woodMap,leafMap);materials.push(...biomes.materials);
  const coast=buildCoast(scene,wood,stone);materials.push(...coast.materials);
  return {materials,textures,ground,groundMat,wood,update(t:number,reduced:boolean){time.value=reduced?0:t;
    coast.update(t,reduced);
    const vertices=sea.geometry.attributes.position;
    for(let i=0;i<vertices.count;i++){const x=seaBase[i*3],z=seaBase[i*3+1];vertices.setZ(i,Math.sin(x*.075+time.value*.8)*.1+Math.sin(z*.1+time.value*1.2)*.07)}vertices.needsUpdate=true;
    for(let i=0;i<45;i++){dummy.position.set(69+(i%7)*.86,-.145,-18+((i*1.7+(reduced?0:t*.9))%49));dummy.scale.set(1,.4,1);dummy.rotation.set(-Math.PI/2,0,0);dummy.updateMatrix();foam.setMatrixAt(i,dummy.matrix)}foam.instanceMatrix.needsUpdate=true;
  }};
}
