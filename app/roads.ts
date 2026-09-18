import * as THREE from 'three';
import {routeLines,TERRAIN_EXTENT} from './landscape.mjs';

/** A continuous road mask avoids the old two-metre vertex-colour stair steps. */
export function roadSurface(material:THREE.MeshStandardMaterial){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const c=canvas.getContext('2d')!,scale=1024/(TERRAIN_EXTENT*2);
  c.fillStyle='#000';c.fillRect(0,0,1024,1024);c.lineCap='round';c.lineJoin='round';
  const line=(width:number,color:string,offset=0)=>{
    c.strokeStyle=color;c.lineWidth=width*scale;
    for(const points of routeLines){c.beginPath();points.forEach(([x,z],i)=>{
      const next=points[Math.min(i+1,points.length-1)],prev=points[Math.max(0,i-1)],dx=next[0]-prev[0],dz=next[1]-prev[1],length=Math.hypot(dx,dz)||1;
      const px=(x-dz/length*offset+TERRAIN_EXTENT)*scale,py=(z+dx/length*offset+TERRAIN_EXTENT)*scale;
      if(i)c.lineTo(px,py);else c.moveTo(px,py);
    });c.stroke()}
  };
  line(11,'#360000');line(9.6,'#900000');line(8.4,'#ff0000');line(.65,'#ffb000',-.85);line(.65,'#ffb000',.85);
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
  material.onBeforeCompile=s=>{
    s.uniforms.uRoadMask={value:texture};
    s.vertexShader='varying vec3 vRoadWorld;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRoadWorld=(modelMatrix*vec4(position,1.)).xyz;');
    s.fragmentShader=`uniform sampler2D uRoadMask; varying vec3 vRoadWorld;
      float gravel(vec2 p){return fract(sin(dot(floor(p),vec2(127.1,311.7)))*43758.5453);}
      `+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 roadUv=(vRoadWorld.xz+${TERRAIN_EXTENT.toFixed(1)})/${(TERRAIN_EXTENT*2).toFixed(1)};roadUv.y=1.-roadUv.y;
      vec3 mask=texture2D(uRoadMask,roadUv).rgb;
      float grit=gravel(vRoadWorld.xz*34.)*.08+gravel(vRoadWorld.xz*8.)*.035;
      vec3 roadColor=vec3(.13,.105,.073)+grit;
      roadColor*=1.-mask.g*.23;
      float city=smoothstep(106.,132.,-vRoadWorld.x)*(1.-smoothstep(106.,130.,-vRoadWorld.z))*smoothstep(17.,43.,-vRoadWorld.z);
      float desert=smoothstep(88.,123.,vRoadWorld.x)*smoothstep(52.,85.,-vRoadWorld.z);
      float windRipple=sin(vRoadWorld.x*5.+sin(vRoadWorld.z*.65)*2.3)*.028;
      diffuseColor.rgb*=1.+windRipple*desert;
      roadColor=mix(roadColor,vec3(.47,.27,.12)+grit,desert);
      roadColor=mix(roadColor,vec3(.045,.06,.07)+grit*.35,city);
      float centre=(1.-smoothstep(.10,.18,abs(vRoadWorld.x+142.)))*(1.-step(3.,mod(vRoadWorld.z,7.)));
      float edge=1.-smoothstep(.07,.15,abs(abs(vRoadWorld.x+142.)-4.));
      float crossStreet=1.-smoothstep(5.,7.,abs(vRoadWorld.z+77.));
      roadColor=mix(roadColor,vec3(.68,.58,.32),max(centre,edge*.75)*city*(1.-crossStreet));
      diffuseColor.rgb=mix(diffuseColor.rgb,roadColor,smoothstep(.08,.98,mask.r));`);
  };
  material.customProgramCacheKey=()=>`biome-roads-v7`;
  return texture;
}
