// The rendered surface, vegetation and wheel raycasts share this terrain definition.
export const WORLD_RADIUS = 196;
export const TERRAIN_EXTENT = 204;
export const TERRAIN_STEP = 2;
export const TRAIL_RADIUS = 98;
export const hubLocations={
  about:{x:-74,z:-58,height:8,biome:'Jungle retreat'},
  work:{x:97,z:45,height:3,biome:'Riverside workshop'},
  learning:{x:6,z:-109,height:20,biome:'Mountain observatory'},
  creative:{x:-62,z:68,height:2.2,biome:'Coastal studio'},
};
export const challengeArea={x:113,z:-26,height:2};
export const shorelineZ=x=>91+9*Math.sin(x*.023);
const distanceToSegment=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)};
// Curved western/eastern trails join a mountain pass and a coastal road. Branches stop in hub forecourts.
export const routeLines=[
  [[0,7],[30,7],[51,7],[72,7],[93,7],[102,24],[112,35],[112,54],[97,57]],
  [[0,7],[-18,7],[-39,7],[-55,-12],[-70,-35],[-74,-46]],
  [[0,7],[0,-28],[-12,-47],[-23,-67],[-17,-84],[6,-97]],
  [[-74,-46],[-93,-37],[-104,-12],[-97,17],[-80,42],[-82,63],[-82,79],[-62,80]],
  [[-74,-46],[-91,-51],[-92,-70],[-58,-90],[-32,-101],[6,-97]],
  [[6,-97],[35,-94],[60,-76],[78,-49],[95,-20],[93,7]],
  [[97,57],[78,68],[51,72],[23,76],[-7,78],[-35,79],[-62,80]],
  [[0,7],[3,30],[-10,51],[-35,65],[-62,80]],
  [[95,-20],[104,-16],[113,-14]],
  [[-74,-46],[-58,-46]],
  [[6,-97],[35,-94],[44,-119],[26,-143],[-12,-155],[-38,-162],[-55,-179]],
  [[-104,-12],[-129,-6],[-151,12],[-169,37],[-173,66]],
  [[95,-20],[96,-43],[123,-58],[150,-65],[175,-63]],
  [[-104,-12],[-126,-35],[-142,-54],[-142,-77],[-142,-101]],
  [[-142,-77],[-164,-77],[-181,-77]],
  [[175,-63],[171,-89],[155,-110],[133,-132],[101,-146]],
];
export const cityWeight=(x,z)=>smooth(106,132,-x)*(1-smooth(106,130,-z))*smooth(17,43,-z);
export const desertWeight=(x,z)=>smooth(88,123,x)*smooth(52,85,-z);
export function isHubClearing(x,z,padding=0){return Object.values(hubLocations).some(h=>Math.hypot(x-h.x,z-h.z)<15+padding)||Math.hypot(x-challengeArea.x,z-challengeArea.z)<15+padding||Math.hypot(x+58,z+60)<8+padding}
const smooth = (a,b,v) => {const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
function rawTerrainHeight(x,z) {
  const r=Math.hypot(x,z), rise=smooth(38,86,r);
  let h=rise*(3+2*Math.sin(x*.036)*Math.cos(z*.043)+Math.sin(z*.07+x*.018));
  // The river occupies a real recessed channel; its crossing is supplied by a bridge.
  const riverBank=(1-smooth(28,48,Math.abs(z-7)))*(1-smooth(30,48,Math.abs(x-72)));
  h*=1-riverBank;
  h-=2*(1-smooth(3.7,6,Math.abs(x-72)))*(1-smooth(25,34,Math.abs(z-7)));
  const plungePool=Math.hypot((x+26)/6.2,(z+13)/4.9);h-=1.4*(1-smooth(.6,1,plungePool));
  const pond=Math.hypot((x+27)/5.1,z/3.2);
  h-=1.2*(1-smooth(.6,1,pond));
  // The mountain pass climbs gradually; taller, rocky peaks sit beyond its drivable shoulders.
  h+=smooth(42,111,-z)*17;
  h+=smooth(114,163,-z)*(24+16*Math.sin(x*.042)**2+12*Math.cos(x*.069)**2);
  // A sandy coast slopes into an actual sea bed, with a broad dry coastal road above it.
  const coast=smooth(56,shorelineZ(x),z);h=h*(1-coast)+(.45-(z-shorelineZ(x))*.16)*coast;
  h+=smooth(134,164,Math.abs(x))*24*(1-smooth(45,90,z));
  const city=cityWeight(x,z);h=h*(1-city)+7*city;
  const desert=desertWeight(x,z),dunes=17+3.5*Math.sin(x*.047+z*.03)+2.8*Math.sin(z*.065)+5*smooth(115,175,-z);
  h=h*(1-desert)+dunes*desert;
  for(const hub of [...Object.values(hubLocations),challengeArea]){const flatten=1-smooth(16,38,Math.hypot(x-hub.x,z-hub.z));h=h*(1-flatten)+hub.height*flatten}
  const lookout=1-smooth(18,42,Math.hypot(x+55,z+179));h=h*(1-lookout)+43*lookout;
  return h;
}
const summitGrades=new Map([['44,-119',21.5],['26,-143',28],['-12,-155',34],['-38,-162',39],['-55,-179',43],['133,-132',21],['101,-146',24]]);
const roadHeight=p=>summitGrades.get(p.join(','))??rawTerrainHeight(...p);
const gradedSegments=routeLines.flatMap(line=>line.slice(1).map((b,i)=>{const a=line[i],dx=b[0]-a[0],dz=b[1]-a[1];return {a,b,dx,dz,length2:dx*dx+dz*dz,ha:roadHeight(a),hb:roadHeight(b)}}));
function evaluateTerrainHeight(x,z){
  const natural=rawTerrainHeight(x,z);
  if(Math.abs(x-72)<8&&Math.abs(z-7)<25||Math.abs(x+27)<6&&Math.abs(z)<4)return natural;
  let nearest=14,weightedHeight=0,totalWeight=0;
  for(const s of gradedSegments){
    if(x<Math.min(s.a[0],s.b[0])-14||x>Math.max(s.a[0],s.b[0])+14||z<Math.min(s.a[1],s.b[1])-14||z>Math.max(s.a[1],s.b[1])+14)continue;
    const t=Math.max(0,Math.min(1,((x-s.a[0])*s.dx+(z-s.a[1])*s.dz)/s.length2)),distance=Math.hypot(x-s.a[0]-t*s.dx,z-s.a[1]-t*s.dz);
    if(distance<nearest)nearest=distance;
    // Blend overlapping road grades at bends instead of switching abruptly
    // between nearest segments, which created diagonal ridges under the tires.
    const weight=Math.max(0,1-distance/14)**4;
    weightedHeight+=(s.ha+(s.hb-s.ha)*t)*weight;totalWeight+=weight;
  }
  const road=totalWeight?weightedHeight/totalWeight:natural;
  const cut=1-smooth(5.5,14,nearest),graded=natural*(1-cut)+road*cut;
  // Bridge bearings and both approach lanes remain level before the road turns uphill.
  const bridgeApproach=(1-smooth(28,36,Math.abs(x-72)))*(1-smooth(4,10,Math.abs(z-7)));
  return graded*(1-bridgeApproach);
}
// Grid heights are immutable; vegetation animation and recovery reuse them every frame.
const heightCache=new Map();
export function terrainHeight(x,z){
  if(Number.isInteger(x/TERRAIN_STEP)&&Number.isInteger(z/TERRAIN_STEP)){
    const key=`${x},${z}`;if(heightCache.has(key))return heightCache.get(key);
    const y=evaluateTerrainHeight(x,z);heightCache.set(key,y);return y;
  }
  return evaluateTerrainHeight(x,z);
}
// Heightfield triangle interpolation, matching Cannon's diagonal exactly.
export function surfaceHeight(x,z) {
  const gx=(x+TERRAIN_EXTENT)/TERRAIN_STEP,gz=(TERRAIN_EXTENT-z)/TERRAIN_STEP;
  const ix=Math.floor(gx),iz=Math.floor(gz),u=gx-ix,v=gz-iz;
  const wx=ix*TERRAIN_STEP-TERRAIN_EXTENT,wz=TERRAIN_EXTENT-iz*TERRAIN_STEP;
  const a=terrainHeight(wx,wz),b=terrainHeight(wx+TERRAIN_STEP,wz),c=terrainHeight(wx,wz-TERRAIN_STEP),d=terrainHeight(wx+TERRAIN_STEP,wz-TERRAIN_STEP);
  return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
}
export function isOuterTrail(x,z,padding=0) {
  return routeLines.some(line=>line.some((p,i)=>i>0&&distanceToSegment(x,z,line[i-1],p)<4.5+padding));
}
export const bridges = [
  {id:'creek',x:-27,z:0,length:12,width:4.6,height:1.05,ramp:6},
  {id:'river',x:72,z:7,length:22,width:6.2,height:1.8,ramp:10},
];
// A single descriptor list is used for both visible planks/ramps/rails and collision bodies.
export function bridgeParts(b) {
  const parts=[], plank=.55, count=Math.ceil(b.length/plank), step=b.length/count;
  for(let i=0;i<count;i++)parts.push({kind:'deck',x:b.x-b.length/2+(i+.5)*step,y:b.height-.12+(i%4===0?.018:0),z:b.z,w:step-.008,h:.24,d:b.width,rz:0});
  for(const side of [-1,1]) {
    const angle=Math.atan2(b.height-.06,b.ramp);
    parts.push({kind:'ramp',x:b.x+side*(b.length/2+b.ramp/2),y:(b.height+.06)/2-.12*Math.cos(angle),z:b.z,w:Math.hypot(b.ramp,b.height-.06),h:.24,d:b.width,rz:-side*angle});
    parts.push({kind:'rail',x:b.x,y:b.height+.65,z:b.z+side*(b.width/2+.02),w:b.length+.25,h:.16,d:.16,rz:0});
    for(let i=0;i<=Math.floor(b.length/2);i++)parts.push({kind:'post',x:b.x-b.length/2+i*b.length/Math.floor(b.length/2),y:b.height+.5,z:b.z+side*(b.width/2+.02),w:.18,h:1.25,d:.18,rz:0});
  }
  return parts;
}
