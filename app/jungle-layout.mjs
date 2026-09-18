// The central clearing, roads and arrivals are kept free of large jungle plants.
import {isOuterTrail,isHubClearing,shorelineZ} from './landscape.mjs';
export function isDriveCorridor(x, z, padding = 1.4) {
  if(isOuterTrail(x,z,padding+1)||isHubClearing(x,z,padding))return true;
  if(Math.abs(z)<3+padding&&x> -40&&x< -16)return true;
  const r = Math.hypot(x,z);
  if (Math.hypot(x,z-2) < 14.1 + padding) return true;
  if (Math.abs(r-23.5) < 3.2 + padding) return true;
  if (Math.abs(x) < 3 + padding && Math.abs(z) < 29) return true;
  if (Math.abs(z-7) < 3 + padding && Math.abs(x) < 30) return true;
  if (Math.abs(x-19) < 3 + padding && z > -8 && z < 23) return true;
  if (Math.abs(z+5) < 2.7 + padding && x < -5 && x > -32) return true;
  return [[-12,-7,7.5],[21,-12,8],[18,22,8.5],[-24,20,9],[-27,0,7],[-6,22,5],[8,-23,5]].some(([cx,cz,radius])=>Math.hypot(x-cx,z-cz)<radius+padding);
}
export function junglePlanting(seed = 914, count = 165) {
  const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const trees=[];
  for(let attempt=0;attempt<count*30&&trees.length<count;attempt++) {
    const angle=random()*Math.PI*2,r=16+random()*40;
    const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    if(isDriveCorridor(x,z,2)||Math.hypot(x+27,z+18)<10)continue;
    if(trees.some(t=>Math.hypot(t.x-x,t.z-z)<2.5))continue;
    trees.push({x,z,scale:.85+random()*.9,kind:trees.length%3,phase:random()*Math.PI*2});
  }
  return trees;
}

export function coastalPlanting(){
  const trees=[];
  for(let i=0;i<80&&trees.length<36;i++){
    const x=-128+i*3,z=shorelineZ(x)-15-Math.sin(i*1.3)*5;
    if(isDriveCorridor(x,z,2))continue;
    trees.push({x,z,scale:1.05+(i%3)*.13,kind:0,phase:i*2.4});
  }
  return trees;
}
