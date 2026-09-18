import * as CANNON from 'cannon-es';
import {SurfaceVehicle} from './wheel-ray.mjs';
import { terrainHeight, TERRAIN_EXTENT, TERRAIN_STEP, bridges, bridgeParts } from './landscape.mjs';

export function addBridgePhysics(world, bridge) {
  return bridgeParts(bridge).map(p=>{
    const body=new CANNON.Body({mass:0,shape:new CANNON.Box(new CANNON.Vec3(p.w/2,p.h/2,p.d/2))});
    body.collisionFilterGroup=(p.kind==='deck'||p.kind==='ramp')?2:1;body.position.set(p.x,p.y,p.z);body.quaternion.setFromEuler(0,0,p.rz);body.aabbNeedsUpdate=true;world.addBody(body);return body;
  });
}

export function createDrivingWorld() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -18, 0), allowSleep: true });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.defaultContactMaterial.friction = .35;
  world.defaultContactMaterial.restitution = .04;
  world.solver.iterations=12;
  const cells=TERRAIN_EXTENT*2/TERRAIN_STEP;
  const data=Array.from({length:cells+1},(_,i)=>Array.from({length:cells+1},(_,j)=>terrainHeight(i*TERRAIN_STEP-TERRAIN_EXTENT,TERRAIN_EXTENT-j*TERRAIN_STEP)));
  const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Heightfield(data,{elementSize:TERRAIN_STEP}) });
  ground.collisionFilterGroup=2;ground.position.set(-TERRAIN_EXTENT,0,TERRAIN_EXTENT);
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  ground.aabbNeedsUpdate = true; world.addBody(ground);
  bridges.forEach(b=>addBridgePhysics(world,b));
  const chassis = new CANNON.Body({ mass: 180, angularDamping: .72, linearDamping: .13 });
  chassis.addShape(new CANNON.Box(new CANNON.Vec3(.8, .24, 1.53)), new CANNON.Vec3(0, .1, 0));
  chassis.addShape(new CANNON.Box(new CANNON.Vec3(.43,.2,.37)),new CANNON.Vec3(0,1.39,.15));
  // The roof, hood and tire sides participate in collisions as well as the lower chassis.
  chassis.addShape(new CANNON.Box(new CANNON.Vec3(.66,.4,.56)),new CANNON.Vec3(0,.78,.14));
  chassis.addShape(new CANNON.Box(new CANNON.Vec3(.68,.19,.45)),new CANNON.Vec3(0,.54,-.82));
  for(const x of[-.85,.85])for(const z of[-.84,.84]){
    // Suspension owns tire/ground contact. A rigid tire proxy dragging against
    // the terrain used to fight it whenever the suspension compressed uphill.
    const tire=new CANNON.Sphere(.42);tire.collisionFilterMask=1|4;
    chassis.addShape(tire,new CANNON.Vec3(x,-.1,z));
  }
  chassis.collisionFilterGroup=4;chassis.position.set(0, 1, 8);
  const vehicle = new SurfaceVehicle({ chassisBody: chassis, indexRightAxis: 0, indexUpAxis: 1, indexForwardAxis: 2 });
  for (const [x,z] of [[-.85,-.84],[.85,-.84],[-.85,.84],[.85,.84]]) {
    vehicle.addWheel({ radius: .45, directionLocal: new CANNON.Vec3(0,-1,0), axleLocal: new CANNON.Vec3(-1,0,0), chassisConnectionPointLocal: new CANNON.Vec3(x,0,z), suspensionStiffness: 38, suspensionRestLength: .34, frictionSlip: 3.1, dampingRelaxation: 4, dampingCompression: 5.5, maxSuspensionForce: 100000, rollInfluence: .04, maxSuspensionTravel: .25, customSlidingRotationalSpeed: -30, useCustomSlidingRotationalSpeed: true });
  }
  vehicle.addToWorld(world);
  function input(throttle, steer, brake = false, boost = false, wetness = 0) {
    vehicle.wheelInfos.forEach(w=>{w.frictionSlip=4.2-wetness*.7});
    const forward=chassis.quaternion.vmult(new CANNON.Vec3(0,0,-1));
    const speed=Math.max(0,chassis.velocity.dot(forward)*Math.sign(throttle)),limit=throttle<0?12:boost?29:22;
    const torque=Math.max(0,1-(speed/limit)**2);
    const contact=vehicle.wheelInfos.filter(w=>w.isInContact);
    const normal=new CANNON.Vec3();for(const w of contact)normal.vadd(w.raycastResult.hitNormalWorld,normal);
    if(contact.length)normal.normalize();
    const climb=forward.clone();climb.vsub(normal.scale(climb.dot(normal)),climb);climb.normalize();
    // Low-range hill torque offsets the component of gravity along the road.
    // It is delivered through contacting wheels, so obstacles remain solid and
    // the car cannot gain thrust in the air. Partial phone input can climb too.
    const hillTorque=contact.length>=2?Math.max(0,climb.y*Math.sign(throttle))*chassis.mass*18*.5*Math.min(1,Math.abs(throttle)*3):0;
    const force = (throttle * (boost ? 2200 : 1700)+Math.sign(throttle)*hillTorque)*torque;
    // Distribute torque to all four wheels so inclines do not lift the front axle.
    for(let i=0;i<4;i++)vehicle.applyEngineForce(force*.5,i);
    // Same low-speed steering lock, gentler response at speed to prevent snap turns.
    const steering=steer*.48/(1+(chassis.velocity.length()/13)**2*.8);
    vehicle.setSteeringValue(steering,0);vehicle.setSteeringValue(steering,1);
    for(let i=0;i<4;i++) vehicle.setBrake(brake ? 65 : throttle === 0 ? (chassis.velocity.length()<.6?18:2) : 0, i);
  }
  function reset(x=0,y=1,z=8,yaw=0) {
    chassis.position.set(x,y,z);chassis.velocity.setZero();chassis.angularVelocity.setZero();chassis.quaternion.setFromEuler(0,yaw,0);
    chassis.aabbNeedsUpdate=true;chassis.wakeUp();input(0,0,true);
  }
  // Anti-roll torque follows the ground normal, preserving pitch on hills and flight on ramps.
  world.addEventListener('preStep',()=>{
    const contact=vehicle.wheelInfos.filter(w=>w.isInContact);if(contact.length<2)return;
    const normal=new CANNON.Vec3();for(const w of contact)normal.vadd(w.raycastResult.hitNormalWorld,normal);normal.normalize();
    const right=chassis.quaternion.vmult(new CANNON.Vec3(1,0,0)),forward=chassis.quaternion.vmult(new CANNON.Vec3(0,0,-1));
    const correction=Math.max(-900,Math.min(900,right.dot(normal)*650-chassis.angularVelocity.dot(forward)*110));
    chassis.torque.vadd(forward.scale(correction),chassis.torque);
  });
  let accumulated=0;
  function step(dt=1/60){
    // Cannon's elapsed-time overload drops steps after an 8 ms CPU budget.
    // A bounded fixed-step accumulator keeps driving speed consistent under load.
    accumulated+=Math.max(0,Math.min(dt,.05));let count=0;
    while(accumulated+1e-9>=1/120&&count<6){world.step(1/120);accumulated-=1/120;count++}
  }
  return { world, chassis, vehicle, input, reset, step };
}


