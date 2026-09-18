import test from 'node:test';
import assert from 'node:assert/strict';
import * as CANNON from 'cannon-es';
import {createDrivingWorld} from '../app/driving.mjs';
import {createRecovery,canRecoverAt,supportHeight} from '../app/recovery.mjs';

test('recovery remembers a nearby safe road and preserves the heading',()=>{
  const d=createDrivingWorld(),r=createRecovery(d.world,d.chassis);
  assert.ok(r.restore(JSON.stringify({x:97,z:57,yaw:1.2})));
  d.reset(100,3,59);const point=r.nearest();
  assert.ok(Math.hypot(point.x-100,point.z-59)<6);assert.equal(point.yaw,1.2);
  d.reset(point.x,supportHeight(point.x,point.z)+1,point.z,point.yaw);
  assert.equal(d.chassis.velocity.length(),0);
});
test('invalid, underwater and outside-map saved locations are rejected',()=>{
  const d=createDrivingWorld(),r=createRecovery(d.world,d.chassis);
  for(const value of ['bad','null','{}','{"x":0,"z":130,"yaw":0}','{"x":900,"z":0,"yaw":0}'])assert.equal(r.restore(value),null);
});
test('recovery never places the vehicle inside a newly moved obstacle',()=>{
  const d=createDrivingWorld(),r=createRecovery(d.world,d.chassis),point={x:0,z:8,yaw:0};
  assert.ok(r.restore(JSON.stringify(point)));
  const box=new CANNON.Body({mass:7,shape:new CANNON.Box(new CANNON.Vec3(2,2,2))});box.position.set(0,2,8);box.aabbNeedsUpdate=true;d.world.addBody(box);
  assert.equal(canRecoverAt(d.world,d.chassis,point),false);
  const next=r.nearest();assert.ok(Math.hypot(next.x,next.z-8)>3);assert.ok(canRecoverAt(d.world,d.chassis,next));
});
test('ocean recovery remains in the coastal area, not at the starting plaza',()=>{
  const d=createDrivingWorld(),r=createRecovery(d.world,d.chassis);
  r.restore(JSON.stringify({x:-35,z:79,yaw:1}));d.reset(-35,-1,92);
  const next=r.nearest();assert.ok(Math.hypot(next.x+35,next.z-92)<16);assert.ok(next.z>70);
});
test('bridge recovery uses the deck height rather than the river bed',()=>{
  assert.ok(supportHeight(72,7)>1.79);
  const d=createDrivingWorld();assert.ok(canRecoverAt(d.world,d.chassis,{x:72,z:7,yaw:Math.PI/2}));
});
test('engine force increases without changing front steering angle',()=>{
  const d=createDrivingWorld();d.input(1,1);
  assert.equal(d.vehicle.wheelInfos[0].steering,.48);assert.equal(d.vehicle.wheelInfos[1].steering,.48);
  assert.equal(d.vehicle.wheelInfos[2].steering,0);assert.equal(d.vehicle.wheelInfos[0].engineForce,850);
  d.input(1,0,false,true);assert.equal(d.vehicle.wheelInfos[0].engineForce,1100);
});
for(const wet of [0,1])test(`thin barrier resists a boosted high-speed impact, wetness ${wet}`,()=>{
  const d=createDrivingWorld();d.reset(0,1,7);for(let i=0;i<90;i++)d.step();
  const wall=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(6,3,.08))});wall.position.set(0,3,0);wall.aabbNeedsUpdate=true;d.world.addBody(wall);
  d.chassis.velocity.set(0,0,-24);
  for(let i=0;i<240;i++){d.input(1,0,false,true,wet);d.step()}
  assert.ok(d.chassis.position.z>1,'the car must not tunnel through the thin barrier');
});
test('wheel rays do not treat tabletops or railings as a road',()=>{
  const d=createDrivingWorld(),table=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(2,.1,2))});
  table.position.set(0,.3,8);table.aabbNeedsUpdate=true;d.world.addBody(table);d.reset(0,.9,8);
  for(const wheel of d.vehicle.wheelInfos){d.vehicle.castRay(wheel);assert.notEqual(wheel.raycastResult.body,table)}
});
