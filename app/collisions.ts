import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';

/** Collision comes from the final world transform, including hub relocation and terrain height. */
export function registerSolidGeometry(scene:THREE.Scene,world:CANNON.World) {
  scene.updateMatrixWorld(true);
  const tiles=new Map<string,CANNON.Body>();
  const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
  function add(geometry:THREE.BufferGeometry,matrix:THREE.Matrix4,driveable=false){
    geometry.computeBoundingBox();const bounds=geometry.boundingBox!;
    const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()).applyMatrix4(matrix);
    matrix.decompose(position,rotation,scale);size.multiply(scale);size.set(Math.abs(size.x),Math.abs(size.y),Math.abs(size.z));
    if(size.y<.09||Math.max(size.x,size.y,size.z)<.18)return;
    const tx=Math.floor(center.x/12)*12,tz=Math.floor(center.z/12)*12,key=`${tx},${tz},${driveable}`;
    let body=tiles.get(key);if(!body){body=new CANNON.Body({mass:0});body.collisionFilterGroup=driveable?2:1;body.position.set(tx,0,tz);tiles.set(key,body)}
    let shape:CANNON.Shape=new CANNON.Box(new CANNON.Vec3(size.x/2,size.y/2,size.z/2));
    // Rock and tent silhouettes need a convex hull: a rotated bounding box puts
    // invisible corners well outside the visible tent and makes impacts feel wrong.
    if(['ConeGeometry','DodecahedronGeometry','IcosahedronGeometry'].includes(geometry.type)||(geometry.type==='CylinderGeometry'&&size.x>6&&size.z>6)){
      const localCenter=bounds.getCenter(new THREE.Vector3()),points:THREE.Vector3[]=[];
      const positions=geometry.getAttribute('position');
      for(let i=0;i<positions.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(positions,i).sub(localCenter).multiply(scale));
      const hull=new ConvexGeometry(points),vertices:CANNON.Vec3[]=[],faces:number[][]=[],lookup=new Map<string,number>(),attribute=hull.getAttribute('position');
      for(let i=0;i<attribute.count;i+=3){const face:number[]=[];for(let j=0;j<3;j++){
        const p=new THREE.Vector3().fromBufferAttribute(attribute,i+j),key=`${p.x.toFixed(5)},${p.y.toFixed(5)},${p.z.toFixed(5)}`;
        let index=lookup.get(key);if(index===undefined){index=vertices.length;lookup.set(key,index);vertices.push(new CANNON.Vec3(p.x,p.y,p.z))}face.push(index);
      }faces.push(face)}
      shape=new CANNON.ConvexPolyhedron({vertices,faces});hull.dispose();
    }
    body.addShape(shape,new CANNON.Vec3(center.x-tx,center.y,center.z-tz),new CANNON.Quaternion(rotation.x,rotation.y,rotation.z,rotation.w));
  }
  scene.traverse(o=>{
    if(!o.userData.solid)return;
    if(o instanceof THREE.InstancedMesh){const instance=new THREE.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,instance);add(o.geometry,new THREE.Matrix4().multiplyMatrices(o.matrixWorld,instance),!!o.userData.driveable)}}
    else if(o instanceof THREE.Mesh)add(o.geometry,o.matrixWorld,!!o.userData.driveable);
  });
  for(const body of tiles.values()){body.aabbNeedsUpdate=true;world.addBody(body)}
  return [...tiles.values()];
}
