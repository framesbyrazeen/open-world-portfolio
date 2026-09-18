import test from 'node:test';
import assert from 'node:assert/strict';
import * as CANNON from 'cannon-es';
import {createDrivingWorld} from '../app/driving.mjs';
import {surfaceHeight} from '../app/landscape.mjs';
for(const wetness of [0,1])test(`full-throttle mountain climb has traction and stays upright, wetness ${wetness}`,()=>{
 const d=createDrivingWorld(),x=44,z=-119,dx=-18,dz=-24,y=surfaceHeight(x,z);
 d.reset(x,y+1,z,Math.atan2(-dx,-dz));for(let i=0;i<90;i++)d.step();
 let minUp=1;
 for(let i=0;i<220;i++){d.input(1,0,false,false,wetness);d.step();minUp=Math.min(minUp,d.chassis.quaternion.vmult(new CANNON.Vec3(0,1,0)).y)}
 assert.ok(d.chassis.position.y>y+4,'normal engine torque must climb the graded pass');
 assert.ok(Math.hypot(d.chassis.position.x-x,d.chassis.position.z-z)>16,'car must make useful uphill progress');
 assert.ok(minUp>.65,'car should not roll over');
});
test('high-speed steering softens response while keeping the original maximum lock',()=>{
 const d=createDrivingWorld();d.input(1,1);assert.equal(d.vehicle.wheelInfos[0].steering,.48);
 d.chassis.velocity.set(0,0,-20);d.input(1,1);assert.ok(d.vehicle.wheelInfos[0].steering<.23);
});
test('alternating steering at speed stays upright on the flat test area',()=>{
 const d=createDrivingWorld();for(let i=0;i<90;i++)d.step();let minUp=1;
 for(let i=0;i<270;i++){d.input(.65,Math.sin(i/28)*.85,false,false,0);d.step();minUp=Math.min(minUp,d.chassis.quaternion.vmult(new CANNON.Vec3(0,1,0)).y)}
 assert.ok(minUp>.65,'vehicle must stay upright through repeated changes of steering');
});

test('fixed stepping preserves simulation time across mixed frame rates',()=>{
 const d=createDrivingWorld();let elapsed=0;
 for(let i=0;i<120;i++){const dt=i%2?1/30:1/60;elapsed+=dt;d.step(dt)}
 assert.ok(Math.abs(d.world.time-elapsed)<1e-6);assert.equal(d.world.stepnumber,360);
});
