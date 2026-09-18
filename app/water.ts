import * as THREE from 'three';

/** Animated surface normals keep reflections responsive without a second scene render. */
export function waterMaterial(kind:'sea'|'river'|'pool',time:{value:number}){
  const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.19,metalness:.28,transparent:true,opacity:.94,side:THREE.DoubleSide});
  material.onBeforeCompile=s=>{
    s.uniforms.uWaterTime=time;
    s.vertexShader='varying vec3 vWaterWorld;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWaterWorld=(modelMatrix*vec4(position,1.)).xyz;');
    s.fragmentShader=`uniform float uWaterTime; varying vec3 vWaterWorld;
      float waterWave(vec2 p){return sin(p.x*.63+p.y*.27+uWaterTime*1.3)*.10+sin(p.y*1.13-p.x*.31+uWaterTime*1.7)*.048+sin(p.x*3.7+p.y*2.1-uWaterTime*2.3)*.012;}
      `+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 wp=vWaterWorld.xz;
      float shore=91.+9.*sin(wp.x*.023);
      float depth=${kind==='sea'?'smoothstep(shore,shore+34.,wp.y)':kind==='river'?'smoothstep(0.,3.,4.-abs(wp.x-72.))':'clamp(1.-length((wp-vec2(-26.,-13.))/vec2(6.2,4.9)),0.,1.)'};
      vec3 shallow=vec3(.075,.34,.28), deep=vec3(.018,.105,.15);
      diffuseColor.rgb=mix(shallow,deep,depth);
      float caustic=pow(max(0.,sin(wp.x*2.1+sin(wp.y*1.8+uWaterTime)) * sin(wp.y*2.7-uWaterTime*.7)),10.);
      diffuseColor.rgb+=vec3(.16,.22,.13)*caustic*(1.-depth);
      ${kind==='sea'?`float waveFront=wp.y-shore-1.8-sin(wp.x*.11+uWaterTime*.35)*.7;
      float foam=pow(.5+.5*sin(waveFront*2.-uWaterTime*1.2),9.)*(1.-smoothstep(1.,7.,abs(waveFront)));
      foam*=smoothstep(-.7,.8,sin(wp.x*3.2+sin(wp.y*5.1))+sin(wp.y*7.3-uWaterTime));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.79,.85,.75),foam*.85);`:''}
      diffuseColor.a=mix(.80,.98,depth);`);
    s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      float wx=waterWave(vWaterWorld.xz+vec2(.08,0.))-waterWave(vWaterWorld.xz-vec2(.08,0.));
      float wz=waterWave(vWaterWorld.xz+vec2(0.,.08))-waterWave(vWaterWorld.xz-vec2(0.,.08));
      vec3 waterNormal=normalize(vec3(-wx*3.,1.,-wz*3.));
      normal=normalize(mat3(viewMatrix)*waterNormal);`);
  };
  material.customProgramCacheKey=()=>`water-v6-${kind}`;
  return material;
}

export function waterfallCurtain(width:number,height:number,time:{value:number}){
  const material=new THREE.MeshStandardMaterial({color:'#b5d4cf',roughness:.22,metalness:.1,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false});
  material.onBeforeCompile=s=>{
    s.uniforms.uFallTime=time;
    s.vertexShader='uniform float uFallTime; varying vec2 vFallUv;\n'+s.vertexShader;
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vFallUv=uv;transformed.z+=sin(uv.y*12.+uv.x*8.-uFallTime*5.)*.045;
      transformed.x+=sin(uv.y*7.+uFallTime*1.7)*.045*(1.-uv.y);`);
    s.fragmentShader='uniform float uFallTime; varying vec2 vFallUv;\n'+s.fragmentShader;
    s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec2 f=vFallUv;float stream=sin(f.x*67.+sin(f.y*9.+uFallTime*6.)*1.2);
      float breakup=sin(f.x*147.+f.y*18.+uFallTime*8.)*.5+.5;
      float edge=smoothstep(0.,.08,f.x)*smoothstep(0.,.08,1.-f.x);
      float foam=pow(1.-f.y,5.)*.8+pow(f.y,15.)*.4;
      diffuseColor.rgb=mix(vec3(.19,.43,.40),vec3(.86,.94,.90),clamp(.45+stream*.18+breakup*.2+foam,0.,1.));
      diffuseColor.a=edge*clamp(.48+stream*.15+foam,.1,.94);`);
  };
  material.customProgramCacheKey=()=>`waterfall-v6`;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height,18,42),material);mesh.receiveShadow=true;
  return {mesh,material};
}
