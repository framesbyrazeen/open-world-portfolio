import * as THREE from 'three';
import {surfaceHeight,isOuterTrail,cityWeight,desertWeight} from './landscape.mjs';

/** Shared meshes keep the detailed districts affordable on a phone. */
export function buildBiomes(scene:THREE.Scene,rockMap:THREE.Texture,woodMap:THREE.Texture,leafMap:THREE.Texture){
  const materials:THREE.Material[]=[];
  const material=(color:string,roughness=.8,metalness=0)=>{const m=new THREE.MeshStandardMaterial({color,roughness,metalness});materials.push(m);return m};
  const concrete=material('#a9adb0'),darkConcrete=material('#454f57'),copper=material('#b76842',.4,.65),metal=material('#263740',.35,.7),glass=material('#36657a',.16,.7),sandstone=material('#b97848'),paleStone=material('#dda879'),cactusMat=material('#657746');
  concrete.map=rockMap;concrete.bumpMap=rockMap;concrete.bumpScale=.025;
  sandstone.map=paleStone.map=rockMap;sandstone.bumpMap=paleStone.bumpMap=rockMap;sandstone.bumpScale=paleStone.bumpScale=.15;
  cactusMat.map=woodMap;cactusMat.bumpMap=woodMap;cactusMat.bumpScale=.1;
  const glow=material('#ffc880',.35);glow.emissive.set('#ffc880');glow.emissiveIntensity=.65;
  const boxGeo=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material,solid=true)=>{
    const o=new THREE.Mesh(boxGeo,m);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=o.receiveShadow=true;o.userData.solid=solid;scene.add(o);return o;
  };
  const windows=new THREE.InstancedMesh(boxGeo,glass,1600),litWindows=new THREE.InstancedMesh(boxGeo,glow,500),frames=new THREE.InstancedMesh(boxGeo,metal,2200);let wi=0,li=0,fi=0;
  for(const mesh of [windows,litWindows,frames]){scene.add(mesh);mesh.receiveShadow=true}
  function instance(mesh:THREE.InstancedMesh,index:number,x:number,y:number,z:number,w:number,h:number,d:number){dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix)}
  // An inhabited-looking avenue: stepped towers, recessed storefront glazing,
  // rooftop equipment, cornices and separate raised pedestrian pavements.
  const buildings=[[-158,-49,9,13,10],[-122,-56,9,19,10],[-160,-64,11,25,10],[-124,-66,10,10,9],[-158,-92,10,16,11],[-126,-91,11,28,12],[-159,-109,12,10,11],[-124,-108,10,16,10],[-178,-96,10,21,12],[-180,-58,11,12,13]];
  buildings.forEach(([x,z,w,h,d],index)=>{
    const y=surfaceHeight(x,z),base=Math.max(y,surfaceHeight(x-w/2,z),surfaceHeight(x+w/2,z),surfaceHeight(x,z-d/2),surfaceHeight(x,z+d/2));
    box(x,(base+y)/2,z,w+2,base-y+.35,d+2,darkConcrete);
    box(x,base+h/2,z,w,h,d,index%3?concrete:darkConcrete);
    box(x,base+h+.22,z,w+.5,.44,d+.5,metal);
    box(x,base+h+1,z,w*.42,1.6,d*.4,index%2?copper:darkConcrete);
    for(const side of [-1,1]){
      for(let floor=0;floor<Math.floor(h/2.7);floor++)for(let col=0;col<Math.floor(w/2);col++){
        const px=x-w/2+1.1+col*2,py=base+1.4+floor*2.7,pz=z+side*(d/2+.025);
        instance(frames,fi++,px,py,pz,1.5,2.05,.12);
        if((floor*7+col+index)%6===0)instance(litWindows,li++,px,py,pz+side*.08,1.32,1.87,.055);
        else instance(windows,wi++,px,py,pz+side*.08,1.32,1.87,.055);
      }
      for(let floor=0;floor<Math.floor(h/2.7);floor++)for(let col=0;col<Math.floor(d/2.3);col++){
        const px=x+side*(w/2+.035),py=base+1.4+floor*2.7,pz=z-d/2+1.2+col*2.3;
        instance(frames,fi++,px,py,pz,.12,2.05,1.6);instance(windows,wi++,px+side*.08,py,pz,.055,1.87,1.42);
      }
    }
    // Shop canopy, entry portal and rooftop vent boxes.
    const side=x< -142?1:-1;
    box(x+side*(w/2+.9),base+3,z,1.8,.22,d*.72,copper);
    box(x+side*(w/2+.05),base+1.3,z,.15,2.6,2.1,glass);
    for(let vent=0;vent<3;vent++)box(x-w*.25+vent*w*.23,base+h+.5,z+d*.25,.85,.8,1.1,darkConcrete);
  });windows.count=wi;litWindows.count=li;frames.count=fi;
  // Sidewalk panels and planted pockets stay outside the drivable road.
  for(const side of [-1,1])for(let z=-113;z< -40;z+=3){
    if(Math.abs(z+77)<7)continue;
    const x=-142+side*6.8,y=surfaceHeight(x,z);
    if(isOuterTrail(x,z,1.5))continue;
    box(x,y+.09,z,2.8,.18,2.95,concrete);
    if(Math.round((z+113)/3)%5===0){box(x,y+.4,z,1.3,.7,1.3,darkConcrete);const shrub=new THREE.Mesh(new THREE.IcosahedronGeometry(.9,1),cactusMat);shrub.position.set(x,y+1.1,z);shrub.scale.y=.65;scene.add(shrub)}
  }
  for(const side of [-1,1])for(let z=-105;z<=-44;z+=15){
    if(Math.abs(z+77)<9)continue;const x=-142+side*5.8,y=surfaceHeight(x,z);
    if(isOuterTrail(x,z,.8))continue;
    box(x,y+2.7,z,.12,5.4,.12,metal);box(x-side*.8,y+5.4,z,1.7,.12,.15,metal);box(x-side*1.5,y+5.3,z,.7,.08,.35,glow,false);
  }
  // Layered sandstone buttes, separated from the roads and their shoulders.
  const mesaPositions=[[119,-104,7,8,5],[140,-107,4,8,5],[176,-106,5,11,5],[148,-153,10,13,8],[184,-124,7,15,8],[107,-181,10,13,7],[183,-174,10,18,10],[130,-172,6,7,5]];
  for(const [x,z,w,h,d] of mesaPositions){
    const y=surfaceHeight(x,z);
    for(let layer=0;layer<4;layer++){
      const geo=new THREE.CylinderGeometry(1-layer*.13,1.12-layer*.13,h/4,9);geo.rotateY(.2);
      const vertices=geo.getAttribute('position');
      for(let i=0;i<vertices.count;i++){const vx=vertices.getX(i),vz=vertices.getZ(i),angle=Math.atan2(vz,vx),erosion=1+.14*Math.sin(angle*3+x)+.06*Math.cos(angle*5+layer);vertices.setXYZ(i,vx*erosion,vertices.getY(i),vz*erosion)}geo.computeVertexNormals();
      const o=new THREE.Mesh(geo,layer%2?paleStone:sandstone);o.position.set(x,y+(layer+.5)*h/4-1,z);o.scale.set(w,1,d);o.userData.solid=true;o.castShadow=o.receiveShadow=true;scene.add(o);
    }
  }
  const cactus=new THREE.InstancedMesh(new THREE.CylinderGeometry(.2,.27,1,9),cactusMat,300),arms=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),cactusMat,150);cactus.userData.solid=true;arms.userData.solid=true;cactus.castShadow=arms.castShadow=true;scene.add(cactus,arms);let ci=0,ai=0;
  for(let i=0;i<95;i++){
    const x=104+(i*37.71)%85,z=-73-(i*21.13)%115;
    if(desertWeight(x,z)<.7||isOuterTrail(x,z,4)||mesaPositions.some(([mx,mz,w,,d])=>Math.hypot((x-mx)/w,(z-mz)/d)<1.5))continue;
    const y=surfaceHeight(x,z),h=1.5+(i%4)*.55;
    instance(cactus,ci++,x,y+h/2,z,1,h,1);
    for(const side of [-1,1]){
      instance(arms,ai++,x+side*.45,y+h*.55,z,.55,.2,.22);
      instance(cactus,ci++,x+side*.85,y+h*.67,z,.72,h*.38,.72);
    }
  }cactus.count=ci;arms.count=ai;
  // Forest transition: tall conifers with layered canopies and solid trunks.
  const forest=material('#ffffff'),bark=material('#544634');bark.map=woodMap;
  forest.map=leafMap;forest.alphaTest=.36;forest.side=THREE.DoubleSide;
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.18,.36,1,8),bark,70),canopies=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),forest,840);trunks.userData.solid=true;trunks.castShadow=canopies.castShadow=canopies.receiveShadow=true;scene.add(trunks,canopies);let ti=0,pi=0;
  for(let i=0;i<150&&ti<70;i++){
    const x=-112+(i*19.71)%84,z=-110-(i*13.13)%59;
    if(cityWeight(x,z)>.1||isOuterTrail(x,z,5)||surfaceHeight(x,z)>44)continue;
    const y=surfaceHeight(x,z),h=8+i%5;
    instance(trunks,ti++,x,y+h*.4,z,1,h*.8,1);
    for(let j=0;j<3;j++)for(let k=0;k<4;k++){
      instance(canopies,pi,x,y+h*.44+j*h*.2,z,6.6-j*1.45,h*.55,1);
      dummy.rotation.set(k===3?-Math.PI/2:.12,j*.7+k*Math.PI/3,0);dummy.updateMatrix();canopies.setMatrixAt(pi,dummy.matrix);
      canopies.setColorAt(pi++,new THREE.Color(j===2?'#a0b38b':'#829f77'));
    }
  }trunks.count=ti;canopies.count=pi;
  return {materials};
}
