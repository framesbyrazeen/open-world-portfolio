"use client";
import { useEffect, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';
import { createDrivingWorld } from './driving.mjs';
import {createRecovery,supportHeight,CHECKPOINT_KEY} from './recovery.mjs';
import { buildPlayground, buildRover } from './scene';
import { chapters } from './content';
import type {StickInput} from './joystick';
import {WORLD_RADIUS,surfaceHeight} from './landscape.mjs';
import {scenicStops} from './expedition';
import {buildWeather,type WeatherMode,type CameraMode} from './weather';

export type Telemetry = { x:number; z:number; speed:number; near:string|null };
export type Travel = { id:string; serial:number } | null;
export default function World({onSelect,onTelemetry,controls,stickRef,paused,reset,travel,sound,weather,cameraMode}:{
  onSelect:(id:string)=>void; onTelemetry:(value:Telemetry)=>void; controls:RefObject<Set<string>>;stickRef:RefObject<StickInput>;
  paused:boolean; reset:number; travel:Travel; sound:boolean;weather:WeatherMode;cameraMode:CameraMode;
}) {
  const host=useRef<HTMLDivElement>(null),labels=useRef<(HTMLButtonElement|null)[]>([]);
  const live=useRef({paused,reset,travel,sound,weather,cameraMode});
  const [recoveryMessage,setRecoveryMessage]=useState('');
  const [status,setStatus]=useState<'loading'|'ready'|'failed'>('loading');
  useEffect(()=>{live.current={paused,reset,travel,sound,weather,cameraMode};if(paused){controls.current.clear();stickRef.current={x:0,y:0,active:false}}},[paused,reset,travel,sound,weather,cameraMode,controls,stickRef]);
  useEffect(()=>{
    const el=host.current;if(!el)return;
    const pressed=controls.current;
    let renderer:THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); }
    catch { const timer=setTimeout(()=>setStatus('failed'),0);return()=>clearTimeout(timer); }
    const compactScreen=window.matchMedia('(max-width:700px), (pointer:coarse)').matches;
    const maxRatio=Math.min(window.devicePixelRatio,compactScreen?1.25:1.7);let ratio=maxRatio,frameAverage=20,qualityTimer=0;
    renderer.setPixelRatio(ratio);
    renderer.setClearColor('#b1bea0');renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
    renderer.domElement.id='world-canvas';renderer.domElement.tabIndex=0;
    renderer.domElement.setAttribute('aria-label','Drive through Razeen’s portfolio with WASD or arrow keys. Enter opens a nearby destination. Shift boosts; Space brakes; R recovers nearby. Drag to orbit, scroll to zoom, or click the ground to drive.');
    el.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color('#b1bea0');scene.fog=new THREE.Fog('#b1bea0',65,118);
    const camera=new THREE.PerspectiveCamera(48,1,.1,520);
    camera.position.set(25,28,33);
    const ambient=new THREE.HemisphereLight('#e7efcf','#546b41',2.3);scene.add(ambient);
    const sun=new THREE.DirectionalLight('#fff0c7',3.3);sun.castShadow=true;const shadowSize=compactScreen?1024:2048;sun.shadow.mapSize.set(shadowSize,shadowSize);
    Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,near:.5,far:130});sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.05;sun.shadow.bias=-.0001;scene.add(sun,sun.target);
    const simulation=createDrivingWorld();const environment=buildPlayground(scene,simulation.world);const car=buildRover(scene);
    const recovery=createRecovery(simulation.world,simulation.chassis);let checkpointClock=0,recoveryUntil=0;
    const atmosphere=buildWeather(scene,sun,ambient,compactScreen);
    const follow=new THREE.Vector3(0,0,2);let orbit=Math.PI/4,zoom=20,last=performance.now(),frame=0,elapsed=0,lastReport=0,steer=0;
    let resetSeen=live.current.reset,travelSeen=0,nearest:string|null=null,target:THREE.Vector3|null=null;
    let width=1,height=1,drag:{x:number;y:number;angle:number;moved:boolean}|null=null;
    const raycaster=new THREE.Raycaster();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let audio:AudioContext|null=null,osc:OscillatorNode|null=null,gain:GainNode|null=null;
    let forestNoise:AudioBufferSourceNode|null=null,forestGain:GainNode|null=null;
    let soundSeen=false;
    const setAudio=(enabled:boolean)=>{
      if(enabled&&!audio){try{
        audio=new AudioContext();osc=audio.createOscillator();gain=audio.createGain();osc.type='triangle';osc.frequency.value=40;gain.gain.value=0;osc.connect(gain);gain.connect(audio.destination);osc.start();
        const buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),samples=buffer.getChannelData(0);
        for(let i=0;i<samples.length;i++)samples[i]=(Math.random()*2-1)*.5;
        forestNoise=audio.createBufferSource();forestNoise.buffer=buffer;forestNoise.loop=true;
        const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1100;
        forestGain=audio.createGain();forestGain.gain.value=0;forestNoise.connect(filter);filter.connect(forestGain);forestGain.connect(audio.destination);forestNoise.start();
      }catch{return}}
      if(audio&&gain){if(enabled)void audio.resume();gain.gain.setTargetAtTime(enabled?.022:0,audio.currentTime,.2)}
    };
    function resize(){if(!el)return;width=el.clientWidth;height=el.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.fov=width<700?60:48;camera.updateProjectionMatrix()}
    const observer=new ResizeObserver(resize);observer.observe(el);resize();
    function respawn(x:number,y=1,z:number,yaw=0){simulation.reset(x,supportHeight(x,z)+y,z,yaw);target=null;pressed.clear();stickRef.current={x:0,y:0,active:false};steer=0;follow.set(x,supportHeight(x,z),z-3);camera.position.set(x+20,supportHeight(x,z)+23,z+25)}
    function recover(){const p=recovery.nearest();respawn(p.x,1,p.z,p.yaw);setRecoveryMessage('Back on safe ground, close to where you stopped.');recoveryUntil=elapsed+5}
    function saveCheckpoint(){const p=recovery.checkpoint();if(p)try{localStorage.setItem(CHECKPOINT_KEY,JSON.stringify(p))}catch{}}
    try{const saved=recovery.restore(localStorage.getItem(CHECKPOINT_KEY));if(saved)respawn(saved.x,1,saved.z,saved.yaw)}catch{}
    window.addEventListener('pagehide',saveCheckpoint);
    function keyDown(e:KeyboardEvent){
      if(live.current.paused||e.metaKey||e.ctrlKey||e.altKey)return;
      if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement)return;
      const key=e.key.length===1?e.key.toLowerCase():e.key;
      if(!['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift',' ','Enter','r'].includes(key))return;
      if((e.target instanceof HTMLButtonElement||e.target instanceof HTMLAnchorElement)&&(key==='Enter'||key===' '))return;
      e.preventDefault();if(key==='r'){recover();return}if(key==='Enter'){if(nearest)onSelect(nearest);return}pressed.add(key);target=null;
    }
    const keyUp=(e:KeyboardEvent)=>pressed.delete(e.key.length===1?e.key.toLowerCase():e.key);
    const blur=()=>{pressed.clear();stickRef.current={x:0,y:0,active:false};simulation.input(0,0,true)};
    window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',blur);
    const pointerDown=(e:PointerEvent)=>{if(live.current.paused)return;renderer.domElement.focus({preventScroll:true});renderer.domElement.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,angle:orbit,moved:false}};
    const pointerMove=(e:PointerEvent)=>{if(!drag)return;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6)drag.moved=true;if(drag.moved)orbit=drag.angle-(e.clientX-drag.x)*.006};
    const pointerUp=(e:PointerEvent)=>{if(!drag)return;if(!drag.moved){const r=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=raycaster.intersectObject(environment.ground,false)[0]?.point;if(hit&&Math.max(Math.abs(hit.x),Math.abs(hit.z))<WORLD_RADIUS-1)target=hit}drag=null};
    const cancel=()=>{drag=null};const wheel=(e:WheelEvent)=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom+e.deltaY*.012,11,31);resize()};
    renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('pointercancel',cancel);renderer.domElement.addEventListener('wheel',wheel,{passive:false});
    // Reusable dust particles soften movement without adding more scene objects.
    const count=65,positions=new Float32Array(count*3),lifetimes=new Float32Array(count);positions.fill(-100);
    const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const dustMat=new THREE.PointsMaterial({color:'#d4ac84',size:.16,transparent:true,opacity:.4,depthWrite:false});const dust=new THREE.Points(dustGeo,dustMat);scene.add(dust);let dustIndex=0;
    const marker=new THREE.Mesh(new THREE.RingGeometry(.42,.5,36),new THREE.MeshBasicMaterial({color:'#fff6dc',transparent:true,opacity:.8,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.position.y=.11;marker.visible=false;scene.add(marker);
    function animate(now:number){
      frame=requestAnimationFrame(animate);const rawDt=(now-last)/1000,dt=Math.min(rawDt,.05);last=now;elapsed+=dt;
      frameAverage=frameAverage*.98+Math.min(rawDt*1000,80)*.02;qualityTimer+=dt;
      if(qualityTimer>4){qualityTimer=0;const next=frameAverage>32?Math.max(.75,ratio-.15):frameAverage<20?Math.min(maxRatio,ratio+.1):ratio;if(next!==ratio){ratio=next;renderer.setPixelRatio(ratio);resize()}}
      const liveState=live.current;
      if(liveState.reset!==resetSeen){recover();resetSeen=liveState.reset}
      if(liveState.travel&&liveState.travel.serial!==travelSeen){const destination=chapters.find(c=>c.id===liveState.travel?.id),scenic=scenicStops.find(s=>s.id===liveState.travel?.id);if(destination)respawn(...destination.arrival as [number,number,number]);else if(scenic){respawn(scenic.x,1,scenic.z,scenic.yaw??0);if(scenic.id==='river'){simulation.chassis.quaternion.setFromEuler(0,-Math.PI/2,0);simulation.chassis.aabbNeedsUpdate=true}}else if(liveState.travel.id==='waterfall')respawn(-20,1,-10);else if(liveState.travel.id==='creek'){respawn(-42,1,0);simulation.chassis.quaternion.setFromEuler(0,-Math.PI/2,0);simulation.chassis.aabbNeedsUpdate=true}recovery.clear();travelSeen=liveState.travel.serial;}
      if(liveState.sound!==soundSeen){setAudio(liveState.sound);soundSeen=liveState.sound}
      const body=simulation.chassis;
      if(!liveState.paused){
        const forward=pressed.has('ArrowUp')||pressed.has('w'),back=pressed.has('ArrowDown')||pressed.has('s'),left=pressed.has('ArrowLeft')||pressed.has('a'),right=pressed.has('ArrowRight')||pressed.has('d');
        if(forward||back||left||right||stickRef.current.active)target=null;
        let throttle=stickRef.current.active?stickRef.current.y:Number(forward)-Number(back),direction=stickRef.current.active?-stickRef.current.x:Number(left)-Number(right);
        if(target){
          const dx=target.x-body.position.x,dz=target.z-body.position.z,forwardVector=body.quaternion.vmult({x:0,y:0,z:-1} as never);
          const heading=Math.atan2(-forwardVector.x,-forwardVector.z),desired=Math.atan2(-dx,-dz),delta=Math.atan2(Math.sin(desired-heading),Math.cos(desired-heading));
          if(Math.hypot(dx,dz)<1.2){target=null;throttle=0}else{direction=THREE.MathUtils.clamp(delta*2,-1,1);throttle=Math.abs(delta)>1?.28:.7;}
        }
        steer=THREE.MathUtils.lerp(steer,direction,1-Math.exp(-dt*9));
        simulation.input(throttle,steer,pressed.has(' '),pressed.has('Shift'),atmosphere.wetness);body.wakeUp();simulation.step(dt);
        if(Math.max(Math.abs(body.position.x),Math.abs(body.position.z))>WORLD_RADIUS||body.position.y<-.6)recover();
        checkpointClock+=dt;if(checkpointClock>.5){checkpointClock=0;recovery.record(simulation.vehicle);saveCheckpoint()}
        if(recoveryUntil&&elapsed>recoveryUntil){setRecoveryMessage('');recoveryUntil=0}
        if(!reduced)environment.animated.forEach((o,i)=>{o.rotation.y+=dt*.5;o.position.y=(o.userData.baseY??4.7)+Math.sin(elapsed*1.5+i)*.18});
        environment.updateJungle(elapsed,reduced);
      }else simulation.input(0,0,true);
      car.rover.position.copy(body.position as unknown as THREE.Vector3);car.rover.quaternion.copy(body.quaternion as unknown as THREE.Quaternion);
      car.update(reduced?0:elapsed,liveState.weather==='rain'&&!liveState.paused,pressed.has(' ')||liveState.paused);
      car.wheels.forEach((g,i)=>{simulation.vehicle.updateWheelTransform(i);const tr=simulation.vehicle.wheelInfos[i].worldTransform;g.position.copy(tr.position as unknown as THREE.Vector3);g.quaternion.copy(tr.quaternion as unknown as THREE.Quaternion)});
      environment.movables.forEach(p=>{p.mesh.position.copy(p.body.position as unknown as THREE.Vector3);p.mesh.quaternion.copy(p.body.quaternion as unknown as THREE.Quaternion)});
      const speed=Math.sqrt(body.velocity.x**2+body.velocity.z**2);
      const heading=new THREE.Vector3(0,0,-1).applyQuaternion(car.rover.quaternion);heading.y=0;heading.normalize();
      const driveView=liveState.cameraMode==='drive';
      follow.lerp(new THREE.Vector3(body.position.x,body.position.y+.4,body.position.z).addScaledVector(heading,driveView?4:0),reduced?1:1-Math.exp(-dt*4));
      const cameraTarget=driveView?new THREE.Vector3(body.position.x,body.position.y+8,body.position.z).addScaledVector(heading,-(12+zoom*.25)):new THREE.Vector3(follow.x+Math.sin(orbit)*zoom*1.6,follow.y+zoom*1.4,follow.z+Math.cos(orbit)*zoom*1.6);
      cameraTarget.y=Math.max(cameraTarget.y,surfaceHeight(cameraTarget.x,cameraTarget.z)+4);
      camera.position.lerp(cameraTarget,reduced?1:1-Math.exp(-dt*3));camera.lookAt(follow);
      atmosphere.update(liveState.weather,elapsed,dt,car.rover.position,reduced);environment.groundMat.roughness=1-atmosphere.wetness*.48;environment.wetMaterials.forEach(m=>{m.roughness=.83-atmosphere.wetness*.5});
      nearest=null;let nearestDist=Infinity;
      chapters.forEach((c,i)=>{
        const distance=Math.hypot(body.position.x-c.x,body.position.z-c.z);
        if(distance<11&&distance<nearestDist){nearest=c.id;nearestDist=distance}
        const point=new THREE.Vector3(c.x,surfaceHeight(c.x,c.z)+6.3,c.z).project(camera),button=labels.current[i];
        if(button){button.style.transform=`translate(-50%,-50%) translate(${(point.x*.5+.5)*width}px,${(-point.y*.5+.5)*height}px)`;button.style.visibility=point.z>1||distance>65||Math.abs(point.x)>.9||(-point.y*.5+.5)*height<(width<700?200:110)||(-point.y*.5+.5)*height>height-(width<700?170:120)?'hidden':'visible';button.dataset.near=String(distance<11)}
      });
      if(now-lastReport>130){onTelemetry({x:body.position.x,z:body.position.z,speed:Math.round(speed*3.6),near:nearest});lastReport=now}
      if(audio&&osc){osc.frequency.setTargetAtTime(36+speed*7,audio.currentTime,.1);if(gain&&liveState.sound)gain.gain.setTargetAtTime(liveState.paused?.007:.02+speed*.0006,audio.currentTime,.1)}
      if(audio&&forestGain){const waterfallDistance=Math.min(Math.hypot(body.position.x+26,body.position.z+13),Math.abs(body.position.z-93)*1.4);forestGain.gain.setTargetAtTime(liveState.sound? .012+Math.max(0,1-waterfallDistance/25)*.055:0,audio.currentTime,.5)}
      dustMat.color.set(atmosphere.wetness>.5?'#b1c7c0':'#ac9f83');dustMat.opacity=atmosphere.wetness>.5?.24:.35;
      if(!liveState.paused&&!reduced&&speed>2){const i=dustIndex++%count;positions[i*3]=body.position.x+(Math.random()-.5);positions[i*3+1]=body.position.y-.4;positions[i*3+2]=body.position.z+.6;lifetimes[i]=.8}
      for(let i=0;i<count;i++){if(lifetimes[i]>0){lifetimes[i]-=dt;positions[i*3+1]+=dt*.4}else positions[i*3+1]=-100}dustGeo.attributes.position.needsUpdate=true;
      marker.visible=!!target;if(target){marker.position.set(target.x,surfaceHeight(target.x,target.z)+.11,target.z);marker.scale.setScalar(1+Math.sin(elapsed*5)*.12)}
      renderer.render(scene,camera);
    }
    frame=requestAnimationFrame(animate);const readyTimer=setTimeout(()=>setStatus('ready'),100);
    return()=>{
      saveCheckpoint();window.removeEventListener('pagehide',saveCheckpoint);clearTimeout(readyTimer);cancelAnimationFrame(frame);observer.disconnect();pressed.clear();
      window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur);
      renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('pointercancel',cancel);renderer.domElement.removeEventListener('wheel',wheel);
      osc?.stop();forestNoise?.stop();if(audio)void audio.close();simulation.vehicle.removeFromWorld(simulation.world);
      const geometries=new Set<THREE.BufferGeometry>();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points||o instanceof THREE.LineSegments)geometries.add(o.geometry)});geometries.forEach(g=>g.dispose());
      [...environment.materials,...car.materials,...atmosphere.materials,dustMat,marker.material].forEach(m=>m.dispose());[...environment.textures,...atmosphere.textures].forEach(t=>t.dispose());renderer.dispose();renderer.domElement.remove();
    };
  },[controls,stickRef,onSelect,onTelemetry]);
  return <div className="world" ref={host}>
    {recoveryMessage&&<div className="recovery-notice" role="status">{recoveryMessage}</div>}
    {status==='loading'&&<div className="world-loading" role="status"><span className="loading-monogram">r.</span><p>Growing a little world…</p></div>}
    {status==='failed'?<div className="world-error"><h2>A different route.</h2><p>Your browser couldn’t start the 3D world. You can still explore every chapter here.</p>{chapters.map(c=><button key={c.id} onClick={()=>onSelect(c.id)}>{c.number} / {c.label} ↗</button>)}</div>:chapters.map((c,i)=><button key={c.id} ref={e=>{labels.current[i]=e}} className="world-pin" onClick={()=>onSelect(c.id)} aria-label={`Read ${c.label}`}><span>{c.number}</span><strong>{c.label}</strong><span>↗</span></button>)}
  </div>;
}



