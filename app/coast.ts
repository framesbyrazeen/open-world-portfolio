import * as THREE from 'three';
import {shorelineZ,surfaceHeight} from './landscape.mjs';

export function buildCoast(scene:THREE.Scene,wood:THREE.Material,stone:THREE.Material){
  const materials:THREE.Material[]=[];
  const metal=new THREE.MeshStandardMaterial({color:'#45504a',metalness:.6,roughness:.5});materials.push(metal);
  const box=(w:number,h:number,d:number,material:THREE.Material,x:number,y:number,z:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;m.userData.solid=true;scene.add(m);return m};
  // A separate coastal lookout pier has a solid deck, railings and supporting piles.
  for(let i=0;i<38;i++)box(3.8,.18,.59,wood,-62,2.15,84+i*.6).userData.driveable=true;
  for(const side of[-1,1]){
    box(.12,.14,22.8,wood,-62+side*1.9,3.04,95.1);
    for(let i=0;i<8;i++){const z=84+i*3.2,y=surfaceHeight(-62+side*1.9,z);box(.16,3.2-y,.16,wood,-62+side*1.9,(3.2+y)/2,z)}
  }
  box(4.4,.18,4.4,wood,-62,2.15,108).userData.driveable=true;box(4.4,.14,.12,wood,-62,3.04,110.15);
  for(const x of[-64.1,-59.9]){box(.16,1,.16,wood,x,2.65,110.15);box(.12,.14,4,wood,x,3.04,108.15)}
  // Driftwood and rounded coastal rocks are kept clear of the beach road.
  for(const [x,z] of[[-103,87],[-90,93],[29,100],[64,112],[104,104]]){
    const y=surfaceHeight(x,z);const log=new THREE.Mesh(new THREE.CylinderGeometry(.16,.23,3.5,9),wood);log.position.set(x,Math.max(y,.05)+.22,z);log.rotation.set(.07,.5,Math.PI/2);log.castShadow=true;log.userData.solid=true;scene.add(log);
  }
  for(let i=0;i<18;i++){
    const x=118+Math.sin(i*2.4)*7,z=75+Math.cos(i*2.4)*9,y=surfaceHeight(x,z);
    const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(1,1),stone);rock.position.set(x,y+.35,z);rock.scale.set(1+i%3*.5,.7+i%2*.4,1.1);rock.rotation.set(.1,i,.2);rock.castShadow=rock.receiveShadow=true;rock.userData.solid=true;scene.add(rock);
  }
  const surfMat=new THREE.MeshBasicMaterial({color:'#e4e9d5',transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide});materials.push(surfMat);
  const vertices:number[]=[],indices:number[]=[];
  for(let i=0;i<=180;i++){const x=-204+i*408/180,z=shorelineZ(x)+4;vertices.push(x,.16,z,x,.16,z+1.1);if(i<180){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2)}}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);const surf=new THREE.Mesh(geo,surfMat);scene.add(surf);
  const birds:THREE.Group[]=[];const birdMat=new THREE.MeshBasicMaterial({color:'#e7e9df',side:THREE.DoubleSide});materials.push(birdMat);
  const wing=new THREE.Shape();wing.moveTo(0,0);wing.lineTo(.6,.16);wing.lineTo(1.05,0);wing.lineTo(.4,.03);wing.lineTo(0,0);const wingGeo=new THREE.ShapeGeometry(wing);
  for(let i=0;i<7;i++){const group=new THREE.Group();for(const side of[-1,1]){const mesh=new THREE.Mesh(wingGeo,birdMat);mesh.scale.x=side;group.add(mesh)}scene.add(group);birds.push(group)}
  return {materials,update(t:number,reduced:boolean){const time=reduced?0:t;surf.position.z=Math.sin(time*.55)*1.5;surfMat.opacity=.2+(Math.sin(time*.55)+1)*.16;
    birds.forEach((bird,i)=>{bird.position.set(-67+Math.sin(time*.09+i)*28,11+Math.sin(time*.18+i)*2,103+Math.cos(time*.09+i)*12);bird.rotation.y=-time*.09-i;bird.children.forEach((w,j)=>{w.rotation.y=Math.sin(time*2.8+i)*.3*(j?1:-1)})});
  }};
}
