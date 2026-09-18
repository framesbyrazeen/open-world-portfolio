import {createDrivingWorld} from '../app/driving.mjs';
import {routeLines,surfaceHeight} from '../app/landscape.mjs';
import assert from 'node:assert/strict';

// Start from rest throughout climbs, including both shoulders and junctions.
const d=createDrivingWorld(),results=[],wet=process.argv.includes('--wet');
for(const route of [1,2,4,5,10,12,13,15]){
 const line=routeLines[route];
 for(let i=1;i<line.length;i++){
  let a=line[i-1],b=line[i];if(surfaceHeight(...a)>surfaceHeight(...b))[a,b]=[b,a];
  const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=dx/len,nz=dz/len;
  if((surfaceHeight(...b)-surfaceHeight(...a))/len<.08)continue;
  for(const fraction of [.12,.5,.85])for(const side of [-2.8,0,2.8]){
   const x=a[0]+dx*fraction-nz*side,z=a[1]+dz*fraction+nx*side;
   d.reset(x,surfaceHeight(x,z)+1,z,Math.atan2(-nx,-nz));
   for(let frame=0;frame<90;frame++)d.step();
   const start=d.chassis.position.clone();let groundContacts=0;
   for(let frame=0;frame<120;frame++){d.input(.55,0,false,false,wet?1:0);d.step();groundContacts+=d.world.contacts.filter(c=>(c.bi===d.chassis||c.bj===d.chassis)&&(c.bi===d.world.bodies[0]||c.bj===d.world.bodies[0])).length}
   const advance=(d.chassis.position.x-start.x)*nx+(d.chassis.position.z-start.z)*nz;
   results.push({route,x:+x.toFixed(2),z:+z.toFixed(2),advance:+advance.toFixed(2),groundContacts});
  }
 }
}
const failures=results.filter(r=>r.advance<3);
console.log(JSON.stringify({tested:results.length,wet,failures,slowest:results.sort((a,b)=>a.advance-b.advance).slice(0,6)},null,2));
assert.equal(failures.length,0,'Moderate throttle must restart the car on every sampled climb');
