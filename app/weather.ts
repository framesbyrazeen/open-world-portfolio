import * as THREE from 'three';
import {surfaceHeight,routeLines} from './landscape.mjs';
export type WeatherMode='sun'|'rain'|'mist'|'sunset';
export type CameraMode='explore'|'drive';
export const weatherNames:Record<WeatherMode,string>={sun:'Clear morning',rain:'Monsoon rain',mist:'Forest mist',sunset:'Golden hour'};
const presets={
  sun:{sky:'#a7c6cf',ground:'#46563a',light:'#fff2d9',sun:2.6,ambient:1.2,near:65,far:240,wet:0},
  rain:{sky:'#748a8f',ground:'#293e35',light:'#d5e3e4',sun:.6,ambient:1.25,near:22,far:125,wet:1},
  mist:{sky:'#b7c5b6',ground:'#53664d',light:'#f0edda',sun:1.2,ambient:1.6,near:9,far:92,wet:.25},
  sunset:{sky:'#b9a593',ground:'#435140',light:'#ffc585',sun:2.9,ambient:.95,near:45,far:205,wet:0},
};
export function buildWeather(scene:THREE.Scene,sun:THREE.DirectionalLight,ambient:THREE.HemisphereLight,compact:boolean) {
  const materials:THREE.Material[]=[],textures:THREE.Texture[]=[];
  const skyColor=new THREE.Color(presets.sun.sky),lightColor=new THREE.Color(),groundColor=new THREE.Color();
  const fog=new THREE.Fog(skyColor,65,240);scene.fog=fog;
  // A continuous sky gradient and slowly drifting cloud layer, visible from the driving camera.
  const uniforms={uTime:{value:0},uSky:{value:skyColor},uStorm:{value:0},uSunset:{value:0}};
  const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms,
    vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vDirection; uniform float uTime; uniform vec3 uSky; uniform float uStorm; uniform float uSunset;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    void main(){vec3 d=normalize(vDirection);float horizon=pow(1.-max(0.,d.y),3.);vec3 col=mix(uSky*.7,uSky,horizon);
    vec2 p=d.xz/max(.18,d.y+.18)*2.+vec2(uTime*.008,0.);float n=noise(p)*.58+noise(p*2.1)*.27+noise(p*4.3)*.15;
    float cloud=smoothstep(.49-uStorm*.18,.72,n)*smoothstep(-.02,.22,d.y);col=mix(col,mix(vec3(.91,.93,.88),uSky*.8,uStorm),cloud*.7);
    float disc=pow(max(0.,dot(d,normalize(vec3(-.5,mix(.62,.2,uSunset),.36)))),400.);col+=disc*vec3(1.,.8,.48)*(1.-uStorm*.85);
    gl_FragColor=vec4(col,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
  materials.push(skyMat);const sky=new THREE.Mesh(new THREE.SphereGeometry(430,24,16),skyMat);sky.frustumCulled=false;sky.renderOrder=-2;scene.add(sky);
  const envCanvas=document.createElement('canvas');envCanvas.width=256;envCanvas.height=128;const ctx=envCanvas.getContext('2d')!;
  const gradient=ctx.createLinearGradient(0,0,0,128);gradient.addColorStop(0,'#91b2c2');gradient.addColorStop(.48,'#c2d1cc');gradient.addColorStop(.54,'#526149');gradient.addColorStop(1,'#293c2b');ctx.fillStyle=gradient;ctx.fillRect(0,0,256,128);
  const env=new THREE.CanvasTexture(envCanvas);env.mapping=THREE.EquirectangularReflectionMapping;env.colorSpace=THREE.SRGBColorSpace;textures.push(env);scene.environment=env;scene.environmentIntensity=.5;
  const count=compact?450:950,positions=new Float32Array(count*6),seeds=Array.from({length:count},(_,i)=>({x:((i*47.17)%48)-24,z:((i*23.41)%48)-24,y:(i*13.57)%28}));
  const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const rainMat=new THREE.LineBasicMaterial({color:'#c6d9dc',transparent:true,opacity:0,depthWrite:false});materials.push(rainMat);
  const rain=new THREE.LineSegments(rainGeo,rainMat);rain.frustumCulled=false;scene.add(rain);
  const splashMat=new THREE.MeshBasicMaterial({color:'#c9dbd2',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});materials.push(splashMat);
  const splashes=new THREE.InstancedMesh(new THREE.RingGeometry(.08,.095,12),splashMat,compact?45:90);splashes.frustumCulled=false;scene.add(splashes);
  const puddleMat=new THREE.MeshStandardMaterial({color:'#3f534b',roughness:.13,metalness:.6,transparent:true,opacity:0,depthWrite:false});materials.push(puddleMat);
  const puddles=new THREE.InstancedMesh(new THREE.CircleGeometry(1,18),puddleMat,110);scene.add(puddles);const dummy=new THREE.Object3D();
  let puddleIndex=0;
  routeLines.forEach(line=>line.forEach((point,index)=>{if(!index)return;const start=line[index-1],dx=point[0]-start[0],dz=point[1]-start[1],length=Math.hypot(dx,dz);
    for(let step=4;step<length;step+=10){if(puddleIndex>=110)break;const side=puddleIndex%2?1:-1,x=start[0]+dx*step/length-dz/length*side,z=start[1]+dz*step/length+dx/length*side;if(x>50&&x<95&&Math.abs(z-7)<4)continue;
      dummy.position.set(x,surfaceHeight(x,z)+.03,z);dummy.rotation.set(-Math.PI/2,0,step);dummy.scale.set(.4+(puddleIndex%4)*.24,.2+(puddleIndex%3)*.12,1);dummy.updateMatrix();puddles.setMatrixAt(puddleIndex++,dummy.matrix);
    }
  }));puddles.count=puddleIndex;
  let wetness=0,sunset=0;
  return {materials,textures,get wetness(){return wetness},update(mode:WeatherMode,time:number,dt:number,position:THREE.Vector3,reduced:boolean){
    const p=presets[mode],blend=1-Math.exp(-dt*1.2);wetness=THREE.MathUtils.lerp(wetness,p.wet,blend);sunset=THREE.MathUtils.lerp(sunset,mode==='sunset'?1:0,blend);
    skyColor.lerp(new THREE.Color(p.sky),blend);fog.color.copy(skyColor);fog.near=THREE.MathUtils.lerp(fog.near,p.near,blend);fog.far=THREE.MathUtils.lerp(fog.far,p.far,blend);
    sun.color.lerp(lightColor.set(p.light),blend);sun.intensity=THREE.MathUtils.lerp(sun.intensity,p.sun,blend);ambient.intensity=THREE.MathUtils.lerp(ambient.intensity,p.ambient,blend);ambient.groundColor.lerp(groundColor.set(p.ground),blend);ambient.color.lerp(skyColor,blend);
    sun.position.set(position.x-38,position.y+48-sunset*28,position.z+26);sun.target.position.copy(position);
    sky.position.copy(position);uniforms.uTime.value=reduced?0:time;uniforms.uStorm.value=wetness;uniforms.uSunset.value=sunset;
    rainMat.opacity=mode==='rain'&&!reduced?wetness*.37:0;splashMat.opacity=rainMat.opacity*.7;puddleMat.opacity=wetness*.65;
    rain.visible=splashes.visible=rainMat.opacity>.01;puddles.visible=wetness>.03;
    if(rain.visible){
      const cx=Math.floor(position.x/4)*4,cz=Math.floor(position.z/4)*4;
      seeds.forEach((s,i)=>{const x=cx+s.x+(time*2%4),z=cz+s.z,y=position.y+28-((time*21+s.y)%28),k=i*6;positions.set([x,y,z,x-.09,y+.65,z+.04],k)});rainGeo.attributes.position.needsUpdate=true;
      for(let i=0;i<splashes.count;i++){const x=cx+seeds[i].x,z=cz+seeds[i].z,phase=(time*1.7+i*.17)%1;dummy.position.set(x,surfaceHeight(x,z)+.025,z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(phase*3);dummy.updateMatrix();splashes.setMatrixAt(i,dummy.matrix)}splashes.instanceMatrix.needsUpdate=true;
    }
  }};
}
