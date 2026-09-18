import * as CANNON from 'cannon-es';

// Cannon's suspension calculation, with rays restricted to driveable surfaces.
// Props still collide with the chassis and tire shapes, but cannot lift the car
// onto a tabletop or the top of a railing through suspension impulses.
export class SurfaceVehicle extends CANNON.RaycastVehicle {
  castRay(wheel) {
    this.updateWheelTransformWorld(wheel);
    const target=wheel.chassisConnectionPointWorld.vadd(wheel.directionWorld.scale(wheel.suspensionRestLength+wheel.maxSuspensionTravel+wheel.radius));
    const hit=wheel.raycastResult;hit.reset();
    this.world.raycastClosest(wheel.chassisConnectionPointWorld,target,{collisionFilterMask:2,skipBackfaces:true},hit);
    hit.groundObject=0;
    if(hit.body){
      wheel.isInContact=true;
      wheel.suspensionLength=Math.max(wheel.suspensionRestLength-wheel.maxSuspensionTravel,Math.min(wheel.suspensionRestLength+wheel.maxSuspensionTravel,hit.distance-wheel.radius));
      const denominator=hit.hitNormalWorld.dot(wheel.directionWorld),velocity=new CANNON.Vec3();
      this.chassisBody.getVelocityAtWorldPoint(hit.hitPointWorld,velocity);
      wheel.clippedInvContactDotSuspension=denominator>=-.1?10:-1/denominator;
      wheel.suspensionRelativeVelocity=denominator>=-.1?0:hit.hitNormalWorld.dot(velocity)*wheel.clippedInvContactDotSuspension;
      return hit.distance;
    }
    wheel.isInContact=false;wheel.suspensionLength=wheel.suspensionRestLength;
    wheel.suspensionRelativeVelocity=0;wheel.directionWorld.scale(-1,hit.hitNormalWorld);wheel.clippedInvContactDotSuspension=1;
    return -1;
  }
}
