"use client";
import {useEffect,useRef,useCallback,type RefObject,type PointerEvent} from 'react';
import {Zap,Octagon} from 'lucide-react';

export type StickInput={x:number;y:number;active:boolean};
export function MobileControls({stickRef,controls,disabled,onDrive}:{stickRef:RefObject<StickInput>;controls:RefObject<Set<string>>;disabled:boolean;onDrive:()=>void}){
  const thumb=useRef<HTMLSpanElement>(null),pointer=useRef<number|null>(null);
  const release=useCallback(()=>{pointer.current=null;stickRef.current={x:0,y:0,active:false};if(thumb.current)thumb.current.style.transform='translate(0px,0px)'},[stickRef]);
  function move(e:PointerEvent<HTMLButtonElement>){
    if(e.pointerId!==pointer.current)return;
    const r=e.currentTarget.getBoundingClientRect(),radius=r.width*.32;
    const dx=(e.clientX-r.left-r.width/2)/radius,dy=(e.clientY-r.top-r.height/2)/radius,length=Math.hypot(dx,dy),scale=length>1?1/length:1;
    const x=dx*scale,y=dy*scale,dead=.1;
    stickRef.current={x:Math.abs(x)<dead?0:x,y:Math.abs(y)<dead?0:-y,active:true};
    if(thumb.current)thumb.current.style.transform=`translate(${x*radius}px,${y*radius}px)`;
  }
  useEffect(()=>{if(disabled){release();controls.current.delete('Shift');controls.current.delete(' ')}},[disabled,controls,release]);
  useEffect(()=>{const cancel=()=>{release();controls.current.delete('Shift');controls.current.delete(' ')};window.addEventListener('blur',cancel);return()=>{window.removeEventListener('blur',cancel);cancel()}},[controls,release]);
  return <div className="mobile-cockpit" aria-label="Touch driving controls">
    <div className="joystick-wrap"><button className="drive-joystick" aria-label="Driving joystick: drag up to accelerate, down to reverse, left or right to steer" disabled={disabled}
      onPointerDown={e=>{if(pointer.current!==null)return;e.preventDefault();pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);onDrive();move(e)}}
      onPointerMove={move} onPointerUp={e=>{if(e.pointerId===pointer.current)release()}} onPointerCancel={release} onLostPointerCapture={release}>
      <span className="joystick-axis" aria-hidden="true"/><span className="joystick-thumb" ref={thumb} aria-hidden="true"><span>✦</span></span>
    </button><span className="joystick-caption">DRAG TO DRIVE</span></div>
    <div className="touch-pedals">{[{key:'Shift',label:'Boost',Icon:Zap},{key:' ',label:'Brake',Icon:Octagon}].map(({key,label,Icon})=><button key={label} className={`touch-pedal ${label.toLowerCase()}`} aria-label={`Hold to ${label.toLowerCase()}`} disabled={disabled}
      onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);controls.current.add(key);onDrive()}}
      onPointerUp={()=>controls.current.delete(key)} onPointerCancel={()=>controls.current.delete(key)} onLostPointerCapture={()=>controls.current.delete(key)}><Icon size={22}/><span>{label}</span></button>)}</div>
  </div>;
}
