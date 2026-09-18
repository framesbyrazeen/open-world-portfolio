import * as THREE from 'three';
import {waterMaterial,waterfallCurtain} from './water';
import * as CANNON from 'cannon-es';
import { junglePlanting, isDriveCorridor, coastalPlanting } from './jungle-layout.mjs';
import { naturalTexture } from './expedition';
import {surfaceHeight,hubLocations,shorelineZ,isHubClearing} from './landscape.mjs';

/** Tropical set dressing is instanced wherever possible to keep the driving responsive. */
export function buildJungle(scene: THREE.Scene, physics: CANNON.World) {
  const materials: THREE.Material[] = [], textures: THREE.Texture[] = [];
  const colliders: CANNON.Body[] = [];
  const dummy=new THREE.Object3D();
  let seed=1972;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  function mat(color:string,options:Partial<THREE.MeshStandardMaterialParameters>={}) {
    const material=new THREE.MeshStandardMaterial({color,roughness:.9,flatShading:false,...options});materials.push(material);return material;
  }
  const bark=mat('#785739'),barkLight=mat('#987143'),deep=mat('#326447'),jade=mat('#4b8453'),moss=mat('#729653'),limestone=mat('#778565'),amber=mat('#ebbc68'),wood=mat('#976c43'),cream=mat('#eeddb5');
  const barkMap=naturalTexture('wood'),stoneMap=naturalTexture('stone'),canopyMap=naturalTexture('leaves');textures.push(barkMap,stoneMap,canopyMap);
  for(const m of[bark,barkLight,wood]){m.map=barkMap;m.bumpMap=barkMap;m.bumpScale=.1}
  limestone.map=stoneMap;limestone.bumpMap=stoneMap;limestone.bumpScale=.14;
  const mesh=(geometry:THREE.BufferGeometry,material:THREE.Material,parent:THREE.Object3D=scene)=>{const m=new THREE.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;m.userData.solid=['BoxGeometry','CylinderGeometry','DodecahedronGeometry'].includes(geometry.type);parent.add(m);return m};
  function box(w:number,h:number,d:number,material:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=scene){const m=mesh(new THREE.BoxGeometry(w,h,d),material,parent);m.position.set(x,y,z);return m}
  function cylinder(r:number,h:number,material:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=scene){const m=mesh(new THREE.CylinderGeometry(r,r,h,10),material,parent);m.position.set(x,y,z);return m}
  function collider(x:number,y:number,z:number,w:number,h:number,d:number){const b=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(w/2,h/2,d/2))});b.position.set(x,y+surfaceHeight(x,z),z);b.aabbNeedsUpdate=true;physics.addBody(b);colliders.push(b);return b}
  function batch(geo:THREE.BufferGeometry,material:THREE.Material,count:number,shadow=true){const b=new THREE.InstancedMesh(geo,material,count);b.castShadow=shadow;b.receiveShadow=true;scene.add(b);return b}
  function place(batch:THREE.InstancedMesh,index:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,rx=0,ry=0,rz=0,color?:string){dummy.position.set(x,y+surfaceHeight(x,z),z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();batch.setMatrixAt(index,dummy.matrix);if(color)batch.setColorAt(index,new THREE.Color(color))}
  function tube(points:THREE.Vector3[],radius:number,material:THREE.Material,parent:THREE.Object3D=scene){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),14,radius,5,false),material,parent)}

  // A folded leaf catches light along its central rib; all fronds reuse this geometry.
  const leafGeometry=new THREE.BufferGeometry(),vertices:number[]=[],uvs:number[]=[],indices:number[]=[];
  for(let i=0;i<=10;i++){
    const t=i/10,width=Math.pow(Math.sin(Math.PI*t),.8)*.28;
    for(let side=-1;side<=1;side++){vertices.push(side*width,Math.sin(t*Math.PI)*.19-Math.abs(side)*.06,t);uvs.push((side+1)/2,t)}
    if(i<10){const k=i*3;indices.push(k,k+3,k+1,k+1,k+3,k+4,k+1,k+4,k+2,k+2,k+4,k+5)}
  }
  leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));leafGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));leafGeometry.setIndex(indices);leafGeometry.computeVertexNormals();
  const leafMap=naturalTexture('frond');textures.push(leafMap);
  const leafMaterial=mat('#ffffff',{side:THREE.DoubleSide,map:leafMap,roughness:.7});
  const windTime={value:0},windStrength={value:1};
  leafMaterial.onBeforeCompile=shader=>{
    shader.uniforms.uJungleTime=windTime;shader.uniforms.uWindStrength=windStrength;
    shader.vertexShader='uniform float uJungleTime; uniform float uWindStrength;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
      transformed.x += sin(uJungleTime * 1.1 + instanceMatrix[3].x * .27 + instanceMatrix[3].z * .21) * uv.y * .06 * uWindStrength;
      #endif`);
  };
  const trees=[...junglePlanting(),...coastalPlanting()];
  const trunks=batch(new THREE.CylinderGeometry(.24,.43,1,7),bark,trees.length);trunks.userData.solid=true;
  const crowns=batch(new THREE.PlaneGeometry(1,1),mat('#ffffff',{map:canopyMap,alphaTest:.4,side:THREE.DoubleSide}),trees.length*9);
  const fronds=batch(leafGeometry,leafMaterial,trees.length*9);
  const leafletGeo=new THREE.BufferGeometry();leafletGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.11,-.02,.45,0,.04,.65,.11,-.02,.45,0,-.06,1],3));leafletGeo.setAttribute('uv',new THREE.Float32BufferAttribute([.5,0,0,.45,.5,.65,1,.45,.5,1],2));leafletGeo.setIndex([0,1,2,0,2,3,1,4,2,2,4,3]);leafletGeo.computeVertexNormals();
  const palmLeaflets=batch(leafletGeo,leafMaterial,trees.length*9*14);let leafletIndex=0;
  const rings=batch(new THREE.CylinderGeometry(.29,.32,.065,8),barkLight,trees.length*5);
  let crownIndex=0,frondIndex=0,ringIndex=0;
  trees.forEach((t,i)=>{
    const height=(t.kind===0?6.3:4.6)*t.scale;
    place(trunks,i,t.x,height/2,t.z,t.scale,height,t.scale,0,t.phase,t.kind===0?.08:0);
    if(t.kind===0){
      for(let j=0;j<9;j++){
        const a=t.phase+j*Math.PI*2/9;
        place(fronds,frondIndex++,t.x,height-.1,t.z,t.scale*.18,t.scale,t.scale*(j%2?3.8:4.2),.1,a,.08,'#708d48');
        for(let k=1;k<=7;k++)for(const side of[-1,1]){
          const u=k/8,length=t.scale*4,px=t.x+Math.sin(a)*length*u,pz=t.z+Math.cos(a)*length*u;
          place(palmLeaflets,leafletIndex++,px,height-.1+Math.sin(u*Math.PI)*.5-u*.4,pz,t.scale*.9,t.scale,t.scale*(.65+Math.sin(u*Math.PI)*.65),.12,a+side*1.05,side*.15,'#809854');
        }
      }
      for(let j=0;j<5;j++)place(rings,ringIndex++,t.x,height*(.18+j*.14),t.z,t.scale,1,t.scale,0,0,.08);
    }else{
      for(let j=0;j<9;j++){
        const a=j*Math.PI*2/3+t.phase;
        place(crowns,crownIndex++,t.x+Math.sin(a+j)*t.scale,height+(j%3)*.45,t.z+Math.cos(a+j)*t.scale,t.scale*3.8,t.scale*3.6,1,j%3===0?-Math.PI/2:.2,a+j,.1);
      }
    }
  });
  crowns.count=crownIndex;fronds.count=frondIndex;rings.count=ringIndex;palmLeaflets.count=leafletIndex;

  // Low plants fill the edges of clearings instead of obstructing the driving lanes.
  const undergrowth:{x:number;z:number;size:number}[]=[];
  for(let i=0;i<9000&&undergrowth.length<1100;i++){
    const span=i<900?105:286,x=(random()-.5)*span,z=(random()-.5)*span;
    if(Math.hypot(x,z)>151||z>shorelineZ(x)-16||isHubClearing(x,z,2)||isDriveCorridor(x,z,.2)||Math.abs(x-72)<8&&Math.abs(z-7)<35)continue;
    undergrowth.push({x,z,size:.45+random()*.7});
  }
  const ferns=batch(leafGeometry,leafMaterial,undergrowth.length*7,false);
  undergrowth.forEach((p,i)=>{for(let j=0;j<7;j++)place(ferns,i*7+j,p.x,.13,p.z,p.size*.9,p.size,p.size*(1.2+random()*.5),-.45,Math.PI*2*j/7+i,0,['#518951','#87a957','#3e754b'][j%3])});
  const grass=batch(new THREE.ConeGeometry(.12,.55,3),jade,3600,false);
  for(let i=0;i<3600;i++){
    const p=undergrowth[i%undergrowth.length];place(grass,i,p.x+(random()-.5)*1.7,.18,p.z+(random()-.5)*1.7,.5+random(),.5+random(),.5+random(),0,random()*6,random()*.3,['#6d954f','#87a756','#507947'][i%3]);
  }
  // Orchids, red ginger flowers, and mushrooms tucked between roots.
  const blossoms=batch(new THREE.IcosahedronGeometry(.16,0),cream,180,false);
  for(let i=0;i<180;i++){
    const p=undergrowth[(i*7)%undergrowth.length],h=.25+random()*.5;
    place(blossoms,i,p.x+(random()-.5),h,p.z+(random()-.5),.65,1.4,.65,0,i,0,['#e69078','#eccb83','#d5afca','#f0e0a5'][i%4]);
  }
  for(const [x,z]of[[-17,-12],[13,-15],[29,10],[-15,18],[-34,5]]){
    for(let j=0;j<3;j++){const h=.25+j*.1; cylinder(.07,h,cream,x+j*.3,h/2,z+j%2*.3);const cap=mesh(new THREE.SphereGeometry(.26+j*.05,10,6,0,Math.PI*2,0,Math.PI/2),j%2?amber:mat('#b97551'));cap.position.set(x+j*.3,h,z+j%2*.3)}
  }

  // Bamboo groves beside the workshop and around the outer trail.
  const bambooRoots=[[30,-17],[-19,-17],[32,14],[-13,29],[-35,-4]];
  const bamboo=batch(new THREE.CylinderGeometry(.11,.16,1,7),jade,45),nodes=batch(new THREE.CylinderGeometry(.17,.17,.045,7),moss,270);
  bamboo.userData.solid=true;
  const bambooLeaves=batch(leafGeometry,leafMaterial,135);
  bambooRoots.forEach(([x,z],i)=>{for(let j=0;j<9;j++){
    const index=i*9+j,px=x+(j%3-1)*.62,pz=z+(Math.floor(j/3)-1)*.62,h=3.8+random()*2.8;
    place(bamboo,index,px,h/2,pz,1,h,1,0,0,(j-4)*.015);
    for(let k=0;k<6;k++)place(nodes,index*6+k,px,h*(.12+k*.14),pz,1,1,1);
    for(let k=0;k<3;k++)place(bambooLeaves,index*3+k,px,h*.75,pz,.5,.5,1.1,-.4,j+k*2,0,'#629458');
  }});

  // Moss-covered hills and roots add depth around the outer forest.
  const hills=batch(new THREE.IcosahedronGeometry(1,2),mat('#ffffff'),24);
  for(let i=0;i<24;i++){
    const a=i/24*Math.PI*2,r=225+(i%3)*3.5;
    place(hills,i,Math.cos(a)*r,-1,Math.sin(a)*r,5+random()*3,3+random()*3,4+random()*3,0,a,.15,['#6c8a53','#7d935b','#5f804f'][i%3]);
  }
  const boulders=batch(new THREE.DodecahedronGeometry(1,0),limestone,100);boulders.userData.solid=true;
  for(let i=0;i<100;i++){
    const p=undergrowth[i%undergrowth.length];place(boulders,i,p.x,.15,p.z,.4+random()*.7,.3+random()*.4,.5+random()*.5,random(),i,random(),['#899277','#7d8b67','#9b9d7e'][i%3]);
  }
  // Buttress roots and trailing vines on selected trees in sight of the road.
  trees.filter(t=>Math.hypot(t.x,t.z)<37).slice(0,14).forEach(t=>{
    for(let j=0;j<3;j++){
      const a=j*Math.PI*2/3+t.phase;
      tube([new THREE.Vector3(t.x,.9,t.z),new THREE.Vector3(t.x+Math.sin(a)*.6,.3,t.z+Math.cos(a)*.6),new THREE.Vector3(t.x+Math.sin(a)*1.6,.06,t.z+Math.cos(a)*1.6)],.12,bark);
    }
  });

  // Waterfall: a two-level rock face overlooking the home base and river bend.
  const waterfallX=-26,waterfallZ=-18;
  const cliff=mat('#636b61',{map:stoneMap,bumpMap:stoneMap,bumpScale:.22}),wetRock=mat('#344c43',{map:stoneMap,bumpMap:stoneMap,bumpScale:.18,roughness:.38});
  const cliffBlocks=[[-4,3,-1,4,6,4],[-1,4,-1,3.5,8,4],[2,3.5,-1,3.5,7,4],[4.5,2,-.5,3,4,3],[-1,1.4,2.4,8,2.8,3]];
  cliffBlocks.forEach(([x,y,z,w,h,d],i)=>{
    const rock=mesh(new THREE.IcosahedronGeometry(1,2),i%2?wetRock:cliff);rock.userData.solid=true;const rp=rock.geometry.attributes.position;for(let v=0;v<rp.count;v++){const k=1+.10*Math.sin(rp.getX(v)*13+rp.getY(v)*7+rp.getZ(v)*11);rp.setXYZ(v,rp.getX(v)*k,rp.getY(v)*k,rp.getZ(v)*k)}rock.geometry.computeVertexNormals();rock.position.set(waterfallX+x,y,waterfallZ+z);rock.scale.set(w*.7,h*.65,d*.7);rock.rotation.y=(i-2)*.16;

    const green=mesh(new THREE.IcosahedronGeometry(1,1),moss);green.position.set(waterfallX+x,y+h/2,waterfallZ+z);green.scale.set(w*.42,.14,d*.36);
  });
  const fallTime={value:0},water=waterMaterial('pool',fallTime);materials.push(water);
  const pool=mesh(new THREE.CircleGeometry(6.2,60),water);pool.rotation.x=-Math.PI/2;pool.scale.y=.8;pool.position.set(waterfallX,.1,waterfallZ+5);pool.castShadow=false;
  const waterTop=box(2,.05,3,water,waterfallX-.4,8.04,waterfallZ-1.2);waterTop.castShadow=false;waterTop.userData.solid=false;
  const upperFall=waterfallCurtain(2.2,5.3,fallTime),lowerFall=waterfallCurtain(3.5,2.5,fallTime);
  upperFall.mesh.position.set(waterfallX-.4,5.4,waterfallZ+2.15);lowerFall.mesh.position.set(waterfallX-.4,1.4,waterfallZ+4.86);
  scene.add(upperFall.mesh,lowerFall.mesh);materials.push(upperFall.material,lowerFall.material);
  const foamMat=new THREE.MeshBasicMaterial({color:'#dbf1cb',transparent:true,opacity:.24,depthWrite:false});materials.push(foamMat);
  const streams=batch(new THREE.BoxGeometry(.045,1,.03),foamMat,27,false);streams.visible=false;
  const droplets=batch(new THREE.SphereGeometry(.075,5,4),foamMat,45,false);
  const flowSeeds=Array.from({length:27},()=>random()),spraySeeds=Array.from({length:45},()=>random());
  const ripples:THREE.Mesh[]=[];
  for(let i=0;i<5;i++){
    const ring=mesh(new THREE.RingGeometry(.94,1,48),foamMat);ring.rotation.x=-Math.PI/2;ring.position.set(waterfallX,.14+i*.002,waterfallZ+5);ring.castShadow=false;ripples.push(ring);
  }
  // A continuous shallow stream joins the existing pond under the plank bridge.
  const centre=new THREE.CatmullRomCurve3([new THREE.Vector3(-26,.1,-13),new THREE.Vector3(-29,.1,-9),new THREE.Vector3(-28,.1,-4),new THREE.Vector3(-27,.1,0)]);
  const streamVertices:number[]=[],streamIndices:number[]=[];
  for(let i=0;i<=50;i++){
    const t=i/50,p=centre.getPoint(t),tangent=centre.getTangent(t),normal=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
    for(const side of[-1,1]){const q=p.clone().addScaledVector(normal,side*(1.2+Math.sin(t*6)*.15));streamVertices.push(q.x,q.y,q.z)}
    if(i<50){const a=i*2;streamIndices.push(a,a+1,a+2,a+1,a+3,a+2)}
  }
  const streamGeo=new THREE.BufferGeometry();streamGeo.setAttribute('position',new THREE.Float32BufferAttribute(streamVertices,3));streamGeo.setIndex(streamIndices);streamGeo.computeVertexNormals();
  const stream=mesh(streamGeo,water);stream.castShadow=false;
  // Pebbles, reeds, and tiny frogs around the pool reward a closer look.
  for(let i=0;i<20;i++){
    const a=i/20*Math.PI*2;
    const rock=mesh(new THREE.DodecahedronGeometry(.3+random()*.35,0),limestone);
    rock.position.set(waterfallX+Math.cos(a)*5.8,.15,waterfallZ+5+Math.sin(a)*4.3);rock.scale.y=.55;
  }
  for(const [x,z] of [[-30,-12],[-22,-12]]){
    const frog=new THREE.Group();frog.position.set(x,.18,z);scene.add(frog);
    const body=mesh(new THREE.SphereGeometry(.19,8,6),jade,frog);body.scale.set(1,.6,1.2);
    for(const side of[-1,1]){
      const leg=mesh(new THREE.SphereGeometry(.11,7,5),deep,frog);leg.position.set(side*.2,-.03,.1);leg.scale.set(1,.5,1.7);
      const eye=mesh(new THREE.SphereGeometry(.055,7,5),amber,frog);eye.position.set(side*.1,.11,-.1);
    }
  }
  const reeds=batch(new THREE.CylinderGeometry(.018,.024,.9,4),jade,90,false);
  for(let i=0;i<90;i++){
    const a=i/90*Math.PI*2,r=5.7+random()*.5;
    place(reeds,i,waterfallX+Math.cos(a)*r,.3,waterfallZ+5+Math.sin(a)*r*.77,1,.6+random(),1,0,0,(random()-.5)*.3);
  }

  // Entrance arches, hanging vines, lanterns and supplies around each destination.
  const vines:THREE.Object3D[]=[];
  for(const [x,z,h] of[[-6,-9,5.8],[14,-17,5.5],[-18,25,5.8],[25,15,5.4]]){
    const vine=tube([new THREE.Vector3(x-2,h,z),new THREE.Vector3(x,h-2.3,z+.1),new THREE.Vector3(x+2,h,z)],.055,deep);vines.push(vine);
    for(const dx of[-2,2]){const post=cylinder(.16,h,bark,x+dx,h/2,z);post.rotation.z=dx*.025;collider(x+dx,h/2,z,.38,h,.38)}
    for(let i=0;i<7;i++){const leaf=mesh(leafGeometry,jade);leaf.position.set(x-1.7+i*.55,h-.6-Math.sin(i/6*Math.PI)*1.6,z);leaf.scale.set(.5,.5,.85);leaf.rotation.set(-.6,i*1.1,.3)}
  }
  // Roof vines and flower pots visually tie the built landmarks to their setting.
  for(const [x,z,y,width]of[[hubLocations.about.x,hubLocations.about.z,hubLocations.about.height+4.45,6],[hubLocations.work.x,hubLocations.work.z,hubLocations.work.height+4.8,8.4]]){
    for(let i=0;i<4;i++){
      const vx=x-width/2+.5+i*(width-1)/3;
      tube([new THREE.Vector3(vx,y,z+2.45),new THREE.Vector3(vx+.3,y-.7,z+2.6),new THREE.Vector3(vx+.15,y-1.5-i%2*.4,z+2.55)],.035,deep);
      for(let k=0;k<3;k++){const leaf=mesh(leafGeometry,jade);leaf.position.set(vx+.2,y-.4-k*.4,z+2.58);leaf.rotation.set(.2,k*2,.6);leaf.scale.set(.35,.4,.65)}
    }
  }
  const darkMetal=mat('#535d44');
  const lanternGlow=mat('#f6d388',{emissive:'#e7ac56',emissiveIntensity:.7});
  for(const [x,z]of[[-5.2,5],[5.2,13],[13,-4],[24,16],[-17,10],[-22,-10]]){
    cylinder(.08,1.8,wood,x,.9,z);box(.55,.5,.55,darkMetal,x,1.8,z);
    box(.43,.35,.43,lanternGlow,x,1.8,z);const roof=mesh(new THREE.ConeGeometry(.46,.28,4),wood);roof.rotation.y=Math.PI/4;roof.position.set(x,2.18,z);
  }

  function trailBoard(x:number,z:number,text:string){
    box(.12,1.5,.12,wood,x,.75,z);box(3.5,.72,.15,wood,x,1.6,z);
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#f5e6bb';ctx.font='bold 46px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,80,725);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);const m=new THREE.MeshBasicMaterial({map:texture,transparent:true});materials.push(m);const plane=mesh(new THREE.PlaneGeometry(3.3,.65),m);plane.position.set(x,1.6,z+.081);plane.castShadow=false;
  }
  trailBoard(-20,-10,'← WATERFALL');trailBoard(8,15,'THE SCENIC ROUTE');
  // Campsite objects reward a closer look without creating a new portfolio section.
  box(1,.6,.8,wood,-6,.3,-10);box(1,.12,.8,cream,-6,.62,-10);cylinder(.23,.5,amber,-6,.95,-10);
  for(let j=0;j<3;j++){const log=cylinder(.19,2,bark,-16+j*.35,.2+j*.25,-3);log.rotation.z=Math.PI/2;}

  // Butterflies stay close to plant beds; wing flaps and flight stop with reduced motion.
  const butterflies:{root:THREE.Group;left:THREE.Mesh;right:THREE.Mesh;x:number;z:number;phase:number}[]=[];
  const wingGeo=new THREE.CircleGeometry(.21,5);wingGeo.translate(.18,0,0);
  const butterflyMaterials=[mat('#eeb85b',{side:THREE.DoubleSide}),mat('#9acfd0',{side:THREE.DoubleSide}),mat('#eaa68f',{side:THREE.DoubleSide})];
  for(let i=0;i<12;i++){
    const p=[[-16,-10],[13,-15],[25,25],[-26,24]][i%4],g=new THREE.Group();scene.add(g);
    const left=mesh(wingGeo,butterflyMaterials[i%3],g),right=mesh(wingGeo,butterflyMaterials[i%3],g);left.rotation.x=-Math.PI/2;right.rotation.x=-Math.PI/2;right.rotation.z=Math.PI;
    const body=mesh(new THREE.CylinderGeometry(.027,.027,.25,5),bark,g);body.rotation.x=Math.PI/2;
    butterflies.push({root:g,left,right,x:p[0],z:p[1],phase:random()*Math.PI*2});
  }
  const moteGeo=new THREE.BufferGeometry(),motePositions=new Float32Array(55*3);
  for(let i=0;i<55;i++){motePositions[i*3]=(random()-.5)*65;motePositions[i*3+1]=.7+random()*5;motePositions[i*3+2]=(random()-.5)*65}
  moteGeo.setAttribute('position',new THREE.BufferAttribute(motePositions,3));const moteMat=new THREE.PointsMaterial({color:'#f3e4a4',size:.07,transparent:true,opacity:.5,depthWrite:false});materials.push(moteMat);const motes=new THREE.Points(moteGeo,moteMat);scene.add(motes);
  const moteBases=motePositions.slice();
  function update(time:number,reduced:boolean){
    const t=reduced?0:time;fallTime.value=t;windTime.value=t;windStrength.value=reduced?0:1;
    for(let i=0;i<27;i++){
      const upper=i<18,phase=(t*(upper?.36:.7)+flowSeeds[i])%1;
      place(streams,i,waterfallX-.4+(flowSeeds[(i+7)%27]-.5)*(upper?1.9:3.2),upper?7.8-phase*5:2.5-phase*2.4,waterfallZ+(upper?2.15:4.86),1,upper?.5+flowSeeds[i]:.4,1);
    }
    streams.instanceMatrix.needsUpdate=true;
    for(let i=0;i<45;i++){
      const phase=(t*.5+spraySeeds[i])%1,a=spraySeeds[(i+9)%45]*Math.PI*2;
      place(droplets,i,waterfallX+Math.cos(a)*phase*2.8,.12+Math.sin(phase*Math.PI)*.85,waterfallZ+4.7+Math.sin(a)*phase*1.7,1-phase*.6,1-phase*.6,1-phase*.6);
    }
    droplets.instanceMatrix.needsUpdate=true;
    ripples.forEach((r,i)=>{const s=.5+((t*.25+i/5)%1)*4;r.scale.set(s,s*.67,1)});
    butterflies.forEach(b=>{b.root.position.set(b.x+Math.sin(t*.45+b.phase)*2.2,1.4+Math.sin(t*.8+b.phase)*.4,b.z+Math.cos(t*.4+b.phase)*1.6);b.root.rotation.y=t*.2+b.phase;const flap=Math.sin(t*13+b.phase)*.8;b.left.rotation.y=flap;b.right.rotation.y=-flap});
    for(let i=0;i<55;i++){motePositions[i*3]=moteBases[i*3]+Math.sin(t*.2+i)*.8;motePositions[i*3+1]=moteBases[i*3+1]+Math.sin(t*.3+i)*.35}moteGeo.attributes.position.needsUpdate=true;
  }
  update(0,true);
  return {materials,textures,colliders,update};
}




