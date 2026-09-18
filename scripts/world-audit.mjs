import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import assert from 'node:assert/strict';

// Run the actual scene construction and Cannon simulation without a browser renderer.
// Canvas is used only for texture artwork, irrelevant to the geometry/collision checks.
const reportDir=path.resolve('outputs/world-audit'),output=path.join(reportDir,`runtime-${process.pid}`);await fs.mkdir(output,{recursive:true});
for(const name of ['scene','jungle','expedition','collisions','coast','water','roads','biomes']){
  const source=await fs.readFile(`app/${name}.ts`,'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from '(\.\/[^']+)'/g,(_,p)=>`from '${p.endsWith('.mjs')?p:p+'.mjs'}'`);
  await fs.writeFile(path.join(output,`${name}.mjs`),code);
}
for(const name of ['driving','landscape','jungle-layout','wheel-ray','recovery'])await fs.copyFile(`app/${name}.mjs`,path.join(output,`${name}.mjs`));
const gradient={addColorStop(){}};
const context=new Proxy({createLinearGradient:()=>gradient},{get:(target,key)=>key in target?target[key]:()=>{},set:()=>true});
globalThis.document={createElement:()=>({width:256,height:256,getContext:()=>context})};
const {buildPlayground}=await import(pathToFileURL(path.join(output,'scene.mjs')));
const {createDrivingWorld}=await import(pathToFileURL(path.join(output,'driving.mjs')));
const {routeLines,surfaceHeight,hubLocations}=await import(pathToFileURL(path.join(output,'landscape.mjs')));
const simulation=createDrivingWorld(),scene=new THREE.Scene();const environment=buildPlayground(scene,simulation.world);
scene.traverse(o=>{if(o instanceof THREE.InstancedMesh)assert.ok(o.count<=o.instanceMatrix.count,'Instance buffers must fit every scenery item')});
const rampsOnly=process.argv.includes('--ramps');
const impactsOnly=process.argv.includes('--impacts');
const reverse=process.argv.includes('--reverse'),wet=process.argv.includes('--wet'),selected=process.argv.slice(2).filter(a=>/^\d+$/.test(a)).map(Number);
const report={reverse,wet,staticBodies:environment.solidBodies.length,routeObstructions:[],drives:[],props:[],impacts:[],ramps:[]};
// Sweep the full vehicle width along every through-road and branch.
routeLines.forEach((line,route)=>line.forEach((end,index)=>{
  if(!index)return;const start=line[index-1],dx=end[0]-start[0],dz=end[1]-start[1],length=Math.hypot(dx,dz);
  for(let distance=1;distance<length-1;distance+=1.5)for(const side of[-1,0,1]){
    const x=start[0]+dx*distance/length-dz/length*side,z=start[1]+dz*distance/length+dx/length*side;
    // The river deck intentionally rises above the terrain; its route is covered by crossing tests.
    if(x>49&&x<95&&Math.abs(z-7)<3)continue;
    const from=new CANNON.Vec3(x,surfaceHeight(x,z)+.7,z),to=new CANNON.Vec3(x+dx/length*1.5,surfaceHeight(x+dx/length*1.5,z+dz/length*1.5)+.7,z+dz/length*1.5);
    simulation.world.raycastAll(from,to,{skipBackfaces:true},hit=>{
      if(hit.body===simulation.chassis||hit.body===simulation.world.bodies[0])return;
      report.routeObstructions.push({route,x:+x.toFixed(1),z:+z.toFixed(1),body:hit.body.id});
    });
  }
}));
// A speed-controlled driver follows the actual connected route, steering at every bend.
for(const route of (impactsOnly||rampsOnly?[]:selected.length?selected:routeLines.map((_,i)=>i))){
  const points=reverse?routeLines[route].slice().reverse():routeLines[route],start=points[0],end=points.at(-1);simulation.reset(start[0],surfaceHeight(...start)+1,start[1]);
  simulation.chassis.quaternion.setFromEuler(0,Math.atan2(-(points[1][0]-start[0]),-(points[1][1]-start[1])),0);simulation.chassis.aabbNeedsUpdate=true;
  for(let i=0;i<80;i++)simulation.step(1/60);
  let waypoint=1,stalled=0,previous=Infinity;
  for(let frame=0;frame<18000&&waypoint<points.length;frame++){
    const p=simulation.chassis.position,target=points[waypoint],dx=target[0]-p.x,dz=target[1]-p.z,distance=Math.hypot(dx,dz);
    if(distance<2.7){waypoint++;previous=Infinity;stalled=0;continue}
    const forward=simulation.chassis.quaternion.vmult(new CANNON.Vec3(0,0,-1)),heading=Math.atan2(-forward.x,-forward.z),desired=Math.atan2(-dx,-dz),delta=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading));
    const speed=simulation.chassis.velocity.length(),desiredSpeed=Math.abs(delta)>.45?2.4:4.5;
    simulation.input(Math.min(1,Math.max(0,(desiredSpeed-speed)*.8)),Math.max(-1,Math.min(1,delta*2)),speed>desiredSpeed+1.1,false,wet?1:0);
    simulation.chassis.wakeUp();simulation.step(1/60);
    if(distance>previous-.002)stalled++;else stalled=0;previous=distance;if(stalled>600)break;
  }
  console.log(`Finished route ${route+1}/${routeLines.length}`);
  const p=simulation.chassis.position;report.drives.push({route,reached:waypoint===points.length,distanceToEnd:+Math.hypot(p.x-end[0],p.z-end[1]).toFixed(1),x:+p.x.toFixed(1),z:+p.z.toFixed(1)});
}
if(impactsOnly){
  const cases=[
    ['coding desk',-58,-51,-58,-60],['tent',-64,-51,-64,-60],
    ['home front',-74,-47,-74,-56],['workshop table',97,54,97,45],
    ['learning books',6,-100,6,-109],['camera sculpture',-62,78,-62,68],
    ['bamboo',32,22,32,14],['lantern',13,2,13,-4],
    ['river rail',72,7,72,10.12],['creek rail',-27,0,-27,2.32],
    ['city facade',-142,-66,-124,-66],['sandstone formation',140,-95,140,-107],
  ];
  for(const [name,sx,sz,tx,tz] of cases){
    const dx=tx-sx,dz=tz-sz,length=Math.hypot(dx,dz),nx=dx/length,nz=dz/length;
    const {supportHeight}=await import(pathToFileURL(path.join(output,'recovery.mjs')));
    simulation.reset(sx,supportHeight(sx,sz)+1,sz,Math.atan2(-dx,-dz));
    for(let i=0;i<90;i++)simulation.step();
    let closest=Infinity,contacts=0;
    const collision=e=>{if(e.body.mass===0&&e.body.collisionFilterGroup!==2)contacts++};simulation.chassis.addEventListener('collide',collision);
    for(let i=0;i<240;i++){
      simulation.input(1,0,false,true);simulation.step();
      const p=simulation.chassis.position,lateral=Math.abs((p.x-sx)*nz-(p.z-sz)*nx);
      if(lateral<1.5)closest=Math.min(closest,length-((p.x-sx)*nx+(p.z-sz)*nz));
    }
    simulation.chassis.removeEventListener('collide',collision);
    const blocked=closest>.4&&contacts>0;report.impacts.push({name,blocked,clearance:+closest.toFixed(2),contacts});
  }
}
if(rampsOnly){
  for(const x of [108,118]){
    simulation.reset(x,surfaceHeight(x,-19)+1,-19);for(let i=0;i<90;i++)simulation.step();let highest=0;
    for(let i=0;i<550&&simulation.chassis.position.z>-41;i++){
      const speed=simulation.chassis.velocity.length();simulation.input(Math.min(.7,Math.max(0,(4-speed)*.8)),0,speed>5);simulation.step();highest=Math.max(highest,simulation.chassis.position.y);
    }
    report.ramps.push({x,crossed:simulation.chassis.position.z<-40,highest:+highest.toFixed(2),position:simulation.chassis.position.toString()});
  }
  simulation.reset(-62,surfaceHeight(-62,81)+1,81,Math.PI);for(let i=0;i<90;i++)simulation.step();let supported=0;
  for(let i=0;i<700&&simulation.chassis.position.z<107;i++){
    const speed=simulation.chassis.velocity.length();simulation.input(Math.min(.7,Math.max(0,(4-speed)*.8)),0,speed>5);simulation.step();
    if(simulation.chassis.position.z>86&&simulation.vehicle.wheelInfos.filter(w=>w.isInContact).length>=3)supported++;
  }
  report.ramps.push({name:'pier',crossed:simulation.chassis.position.z>106&&simulation.chassis.position.y>2.6,supported,position:simulation.chassis.position.toString()});
  const {canRecoverAt}=await import(pathToFileURL(path.join(output,'recovery.mjs')));
  assert.ok(canRecoverAt(simulation.world,simulation.chassis,{x:-62,z:105,yaw:Math.PI}),'The pier must provide a safe nearby recovery point');
  console.log(JSON.stringify(report.ramps));
  assert.ok(report.ramps.every(r=>r.crossed),'Both challenge ramps and the full pier must support the car');
}
// Roof-height collisions must stop the car under a tabletop rather than letting it clip through.
for(const [name,x,z] of [['coding desk',-58,-60],...Object.entries(hubLocations).map(([id,h])=>[id,h.x,h.z])]){
  const hits=[];simulation.world.raycastAll(new CANNON.Vec3(x,surfaceHeight(x,z)+6,z),new CANNON.Vec3(x,surfaceHeight(x,z)+.08,z),{skipBackfaces:true},hit=>{if(hit.body!==simulation.chassis&&hit.body!==simulation.world.bodies[0])hits.push(hit.hitPointWorld.y)});
  report.props.push({name,solid:hits.length>0});
}
await fs.writeFile(path.join(reportDir,`report-${rampsOnly?'ramps':impactsOnly?'impacts':reverse?'reverse':'forward'}-${wet?'wet':'dry'}${selected.length?'-'+selected.join('-'):''}.json`),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
assert.equal(report.routeObstructions.length,0,'Through-roads must remain clear');
assert.ok(report.drives.every(d=>d.reached),'Every connecting road must be driveable');
assert.ok(report.props.every(p=>p.solid),'Furniture and hubs must have solid geometry');

assert.ok(report.impacts.every(p=>p.blocked),'Full-scene solid objects must stop direct impacts');
