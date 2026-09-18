import * as CANNON from 'cannon-es';
import {surfaceHeight,bridges,routeLines,WORLD_RADIUS,shorelineZ} from './landscape.mjs';

export const CHECKPOINT_KEY='razeen-expedition-checkpoint-v6';
export function supportHeight(x,z){
  let y=surfaceHeight(x,z);
  for(const b of bridges){
    const dx=Math.abs(x-b.x);
    if(Math.abs(z-b.z)<b.width/2-.9&&dx<b.length/2+b.ramp)
      y=Math.max(y,dx<=b.length/2?b.height+.02:b.height*(1-(dx-b.length/2)/b.ramp));
  }
  if(Math.abs(x+62)<.9&&z>84&&z<109)y=Math.max(y,2.24);
  return y;
}
export function isDryLand(x,z){return Math.max(Math.abs(x),Math.abs(z))<WORLD_RADIUS-2&&supportHeight(x,z)>-.05&&z<shorelineZ(x)+2||Math.abs(x+62)<.9&&z>=84&&z<109}

/** Conservative shape-level clearance, so recovery never places the cabin in a prop. */
export function canRecoverAt(world,chassis,p){
  if(!p||![p.x,p.z,p.yaw].every(Number.isFinite)||!isDryLand(p.x,p.z))return false;
  const y=supportHeight(p.x,p.z),c=Math.abs(Math.cos(p.yaw)),s=Math.abs(Math.sin(p.yaw)),rx=c*1.45+s*1.82,rz=s*1.45+c*1.82;
  const lower=new CANNON.Vec3(p.x-rx,y+.3,p.z-rz),upper=new CANNON.Vec3(p.x+rx,y+2.7,p.z+rz);
  const pos=new CANNON.Vec3(),rot=new CANNON.Quaternion(),min=new CANNON.Vec3(),max=new CANNON.Vec3();
  for(const body of world.bodies){
    if(body===chassis||body.collisionFilterGroup===2)continue;
    if(body.aabbNeedsUpdate)body.updateAABB();
    if(body.aabb.upperBound.x<lower.x||body.aabb.lowerBound.x>upper.x||body.aabb.upperBound.z<lower.z||body.aabb.lowerBound.z>upper.z)continue;
    for(let i=0;i<body.shapes.length;i++){
      body.quaternion.vmult(body.shapeOffsets[i],pos);pos.vadd(body.position,pos);body.quaternion.mult(body.shapeOrientations[i],rot);
      body.shapes[i].calculateWorldAABB(pos,rot,min,max);
      if(min.x<upper.x&&max.x>lower.x&&min.z<upper.z&&max.z>lower.z&&min.y<upper.y&&max.y>lower.y)return false;
    }
  }
  const corners=[[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,z])=>supportHeight(p.x+x,p.z+z));
  return Math.max(...corners)-Math.min(...corners)<1.25;
}
const roadPoints=routeLines.flatMap(line=>line.slice(1).flatMap((b,i)=>{
  const a=line[i],dx=b[0]-a[0],dz=b[1]-a[1],n=Math.ceil(Math.hypot(dx,dz)/3);
  return Array.from({length:n+1},(_,j)=>({x:a[0]+dx*j/n,z:a[1]+dz*j/n,yaw:Math.atan2(-dx,-dz)}));
}));
export function createRecovery(world,chassis){
  let trail=[];
  const valid=p=>canRecoverAt(world,chassis,p);
  function record(vehicle){
    const p=chassis.position,up=chassis.quaternion.vmult(new CANNON.Vec3(0,1,0));
    if(up.y<.92||chassis.angularVelocity.length()>1||vehicle.wheelInfos.filter(w=>w.isInContact).length<3||Math.abs(p.y-supportHeight(p.x,p.z)-.7)>.45)return;
    if(trail.length&&Math.hypot(p.x-trail.at(-1).x,p.z-trail.at(-1).z)<2.5)return;
    const f=chassis.quaternion.vmult(new CANNON.Vec3(0,0,-1)),point={x:p.x,z:p.z,yaw:Math.atan2(-f.x,-f.z)};
    if(valid(point)){trail.push(point);if(trail.length>80)trail.shift()}
  }
  function nearest(){
    const distance=p=>Math.hypot(p.x-chassis.position.x,p.z-chassis.position.z);
    const recent=trail.filter(p=>distance(p)>=3&&distance(p)<24).sort((a,b)=>distance(a)-distance(b));
    return recent.find(valid)||roadPoints.slice().sort((a,b)=>distance(a)-distance(b)).find(valid)||{x:0,z:8,yaw:0};
  }
  function restore(raw){
    // Checkpoints are untrusted device data; ignore oversized and malformed saves.
    if(typeof raw!=='string'||raw.length>256)return null;
    try{const parsed=JSON.parse(raw);if(!parsed||Array.isArray(parsed))return null;
      const p={x:parsed.x,z:parsed.z,yaw:parsed.yaw};
      if(!Number.isFinite(p.yaw)||Math.abs(p.yaw)>Math.PI*2)return null;
      if(valid(p)){trail=[p];return p}
    }catch{}return null;
  }
  return {record,nearest,restore,checkpoint:()=>trail.at(-1)||null,clear:()=>{trail=[]}};
}
