import test from 'node:test';
import assert from 'node:assert/strict';
import * as CANNON from 'cannon-es';
import { createDrivingWorld } from '../app/driving.mjs';
import {bridges,surfaceHeight} from '../app/landscape.mjs';
const steps=(d,n)=>{for(let i=0;i<n;i++)d.world.step(1/60)};
function settled(){const d=createDrivingWorld();steps(d,90);return d}
test('suspension holds chassis above the ground and throttle drives forward',()=>{
 const d=settled();assert.ok(d.chassis.position.y>.5&&d.chassis.position.y<.9);
 d.input(1,0);steps(d,120);assert.ok(d.chassis.position.z<0);assert.ok(Math.abs(d.chassis.position.x)<.1);
});
test('steering turns left and right in the expected directions',()=>{
 const left=settled();left.input(1,1);steps(left,90);assert.ok(left.chassis.position.x< -2);
 const right=settled();right.input(1,-1);steps(right,90);assert.ok(right.chassis.position.x>2);
});
test('braking reduces speed and reset restores an upright stopped car',()=>{
 const d=settled();d.input(1,0);steps(d,100);const before=d.chassis.velocity.length();
 d.input(0,0,true);steps(d,90);assert.ok(d.chassis.velocity.length()<before*.2);
 d.reset(18,1,15);assert.equal(d.chassis.position.x,18);assert.equal(d.chassis.position.z,15);assert.equal(d.chassis.velocity.length(),0);assert.equal(d.chassis.quaternion.w,1);
});
test('the car transfers momentum to physical objects',()=>{
 const d=settled();const crate=new CANNON.Body({mass:7,shape:new CANNON.Box(new CANNON.Vec3(.5,.5,.5))});crate.position.set(0,.5,1);crate.aabbNeedsUpdate=true;d.world.addBody(crate);
 d.input(1,0);steps(d,140);assert.ok(crate.position.z<0,'crate should move when hit');
});
test('solid barriers prevent driving through buildings',()=>{
 const d=settled();const wall=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(6,3,.5))});wall.position.set(0,3,-3);wall.aabbNeedsUpdate=true;d.world.addBody(wall);
 d.input(1,0);steps(d,220);assert.ok(d.chassis.position.z> -2);
});

for(const bridge of bridges)for(const direction of [-1,1])test(`${bridge.id} bridge supports the wheels for a complete crossing, direction ${direction}`,()=>{
 const d=createDrivingWorld(),start=bridge.x-direction*(bridge.length/2+bridge.ramp+3);
 d.reset(start,surfaceHeight(start,bridge.z)+1,bridge.z);d.chassis.quaternion.setFromEuler(0,-direction*Math.PI/2,0);d.chassis.aabbNeedsUpdate=true;steps(d,80);
 let supported=0,highest=-Infinity,crossed=false;
 for(let i=0;i<1400;i++){
   const speed=d.chassis.velocity.length();d.input(Math.min(.75,Math.max(0,(5-speed)*.6)),0,speed>6);d.world.step(1/60);const p=d.chassis.position;
   if(Math.abs(p.x-bridge.x)<bridge.length/2-2){highest=Math.max(highest,p.y);if(d.vehicle.wheelInfos.filter(w=>w.isInContact).length>=3)supported++;assert.ok(p.y>bridge.height+.35,`chassis sank into deck at ${p.x}, ${p.y}`)}
   if(direction*(p.x-bridge.x)>bridge.length/2+bridge.ramp+1){crossed=true;break}
 }
 assert.ok(crossed,'vehicle should exit the far approach');assert.ok(supported>20,'suspension must contact the deck throughout the crossing');assert.ok(highest>bridge.height+.5);assert.ok(Math.abs(d.chassis.position.z-bridge.z)<bridge.width/2-1,'vehicle must remain safely inside the rails');
});

test('rolling terrain supports the vehicle at its visible height',()=>{
 const d=createDrivingWorld();d.reset(0,surfaceHeight(0,-98)+1,-98);steps(d,150);
 assert.ok(d.chassis.position.y>surfaceHeight(d.chassis.position.x,d.chassis.position.z)+.45);
 assert.ok(d.chassis.position.y<surfaceHeight(d.chassis.position.x,d.chassis.position.z)+1);
 assert.equal(d.vehicle.wheelInfos.filter(w=>w.isInContact).length,4);
});

test('the solid cabin stops the car from clipping through a tabletop',()=>{
 const d=settled(),table=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(2,.08,.8))});
 table.position.set(0,1.6,0);table.aabbNeedsUpdate=true;d.world.addBody(table);d.input(1,0);steps(d,280);
 assert.ok(d.chassis.position.z>1,'cabin should meet the tabletop rather than pass underneath it');
});
