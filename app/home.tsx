"use client";
export const dynamic = "force-static";
import {useState,useRef,useCallback,useEffect} from 'react';
import {ArrowUpRight,Download,Map,RotateCcw,Volume2,VolumeX,HelpCircle,BookOpen,Compass,Mail,Link,Code2,X} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import World,{type Telemetry,type Travel} from './world';
import {chapters} from './content';
import {Milestones} from './milestones';
import {MobileControls,type StickInput} from './joystick';
import {weatherNames,type WeatherMode,type CameraMode} from './weather';
import {scenicStops} from './expedition';
import {routeLines,shorelineZ} from './landscape.mjs';

const shouldShowResume =
  typeof document === "undefined" ||
  document.documentElement.dataset.resume !== "hidden";

export default function Home(){
  const [active,setActive]=useState<string|null>(null),[welcome,setWelcome]=useState(true),[sound,setSound]=useState(false),[reset,setReset]=useState(0),[travel,setTravel]=useState<Travel>(null);
  const [telemetry,setTelemetry]=useState<Telemetry>({x:0,z:8,speed:0,near:null});
  const [weather,setWeather]=useState<WeatherMode>('sun'),[cameraMode,setCameraMode]=useState<CameraMode>('explore');
  const controls=useRef(new Set<string>()),stickRef=useRef<StickInput>({x:0,y:0,active:false});
  const onSelect=useCallback((id:string)=>setActive(id),[]),onTelemetry=useCallback((value:Telemetry)=>setTelemetry(value),[]);
  const chapter=chapters.find(c=>c.id===active),nearby=chapters.find(c=>c.id===telemetry.near);
  useEffect(()=>{const start=(e:KeyboardEvent)=>{if(['ArrowUp','ArrowDown','w','s'].includes(e.key)&&!active)setWelcome(false)};window.addEventListener('keydown',start);return()=>window.removeEventListener('keydown',start)},[active]);
  function drive(){setWelcome(false);setActive(null);setTimeout(()=>document.getElementById('world-canvas')?.focus({preventScroll:true}),80)}
  function visit(id:string){setTravel({id,serial:Date.now()});drive()}
  return <main className="playground">
    <World onSelect={onSelect} onTelemetry={onTelemetry} controls={controls} stickRef={stickRef} paused={!!active} reset={reset} travel={travel} sound={sound} weather={weather} cameraMode={cameraMode}/>
    <div className="scene-settings"><label><span>ATMOSPHERE</span><select aria-label="Weather conditions" value={weather} onChange={e=>setWeather(e.target.value as WeatherMode)}>{Object.entries(weatherNames).map(([id,name])=><option value={id} key={id}>{name}</option>)}</select></label><button onClick={()=>setCameraMode(v=>v==='drive'?'explore':'drive')} aria-label={cameraMode==='drive'?'Switch to orbit camera':'Switch to driving camera'}>{cameraMode==='drive'?'Orbit view':'Driving view'} <Compass size={15}/></button></div>
    <div className="screen-grain" aria-hidden="true"/>
    <header className="hud-header">
      <a className="wordmark" href="#" onClick={e=>{e.preventDefault();setWelcome(true)}} aria-label="Show Razeen’s welcome"><span>razeen<span className="wordmark-dot">.</span></span><small>FROM THE MOUNTAINS TO THE SEA</small></a>
      <div className="header-centre"><span>MOHAMMED RAZEEN P</span><small>Computer science & a curious mind</small></div>
      <nav aria-label="Portfolio navigation" className="header-actions"><button className="text-action" onClick={()=>setActive('journal')}>The portfolio <ArrowUpRight size={16}/></button>{shouldShowResume&&<a className="resume-button" href="/Mohammed-Razeen-P-Resume.pdf" download><Download size={15}/><span>Résumé</span></a>}</nav>
    </header>
    <div className="world-coordinate"><span className="live-dot"/> KOZHIKODE, KERALA <span className="coordinate-divider">/</span> MADE TO WANDER</div>
    {welcome?<aside className="welcome-card"><button className="dismiss" aria-label="Dismiss welcome" onClick={()=>setWelcome(false)}><X size={15}/></button><span className="card-eyebrow">YOU MADE IT. WELCOME!</span><h1>Hello, traveller<span>✳</span></h1><p>I’m Razeen—a developer in the making<br className="wide-only"/> with a creative soul. Take the little orange<br className="wide-only"/> car for a spin and get to know me.</p><div className="welcome-actions"><button className="drive-button" onClick={drive}>Let’s drive <ArrowUpRight size={18}/></button><button className="quiet-button" onClick={()=>setActive('about')}>Or, say hello</button></div><div className="welcome-note"><span>↑</span><span>←</span><span>↓</span><span>→</span> or W A S D to wander</div><div className="touch-welcome">Drag the joystick to explore. Hold Boost for more power.</div></aside>:<div className="journey-note"><span className="star">✳</span><div>Enjoy the scenic route.<small>There’s a little of me around every corner.</small></div></div>}
    <aside className="map-widget" aria-label="Live minimap"><div className="map-heading"><span>YOU ARE HERE</span><Compass size={14}/></div><MiniMap telemetry={telemetry}/><button onClick={()=>setActive('map')}>Explore the map <ArrowUpRight size={14}/></button></aside>
    {!welcome&&nearby&&<button className="nearby-prompt" onClick={()=>setActive(nearby.id)}><span className="enter-key">↵</span><span><small>YOU’RE NEAR</small>{nearby.label}</span><ArrowUpRight size={19}/></button>}
    <MobileControls stickRef={stickRef} controls={controls} disabled={!!active} onDrive={()=>setWelcome(false)}/>
    <footer className="hud-footer"><div className="footer-left"><span className="chapter-count">04</span><span>PLACES TO DISCOVER<small>No rush. Look around.</small></span></div><div className="control-legend"><span><kbd>W A S D</kbd> drive</span><span><kbd>SHIFT</kbd> boost</span><span><kbd>SPACE</kbd> brake</span><span>Drag to orbit · Scroll to zoom</span></div><div className="utility-controls"><button aria-label="Open world map" title="Map" onClick={()=>setActive('map')}><Map size={18}/></button><button aria-label={sound?'Mute jungle and engine sound':'Enable jungle and engine sound'} aria-pressed={sound} title={sound?'Mute':'Sound'} onClick={()=>setSound(v=>!v)}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button><button aria-label="Recover car nearby" title="Recover nearby" onClick={()=>{setReset(r=>r+1);setWelcome(false)}}><RotateCcw size={17}/></button><button aria-label="Driving instructions" title="Controls" onClick={()=>setActive('help')}><HelpCircle size={18}/></button></div></footer>
    <div className="speed-readout" aria-label={`Speed ${telemetry.speed} kilometres per hour`}><strong>{telemetry.speed.toString().padStart(2,'0')}</strong><span>KM/H</span></div>
    <Dialog open={!!active} onOpenChange={open=>{if(!open)setActive(null)}}><DialogContent className={`portfolio-dialog ${active==='map'?'map-dialog':''} ${active==='journal'?'journal-dialog':''}`}>
      {chapter&&<><div className="journal-eyebrow"><span style={{background:chapter.color}}/>{chapter.number} / {chapter.label}</div><DialogTitle className="chapter-title">{chapter.title}</DialogTitle><DialogDescription className="chapter-lead">{chapter.text}</DialogDescription><p className="chapter-detail">{chapter.detail}</p><div className="chapter-tags">{chapter.tags.map(t=><span key={t}>{t}</span>)}</div>{chapter.id==='learning'&&<Milestones/>}<div className="chapter-links">{shouldShowResume&&<a href="/Mohammed-Razeen-P-Resume.pdf" download>Résumé <Download size={16}/></a>}<a href="https://www.linkedin.com/in/mohammed-razeen-p-933a3b326" target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={16}/></a><button onClick={()=>visit(chapter.id)}>Visit this place <Compass size={16}/></button></div></>}
      {active==='map'&&<><div className="journal-eyebrow">THE WORLD ATLAS</div><DialogTitle className="chapter-title">Take the long way home.</DialogTitle><DialogDescription className="chapter-lead">City avenues, deep forest, sandstone desert, mountain passes and a quiet coast. Follow the connecting roads or choose a destination.</DialogDescription><div className="large-map"><MiniMap telemetry={telemetry} onVisit={visit}/></div><div className="scenic-grid">{[{id:"waterfall",label:"Waterfall lookout"},{id:"creek",label:"Creek bridge"},...scenicStops].map(s=><button key={s.id} className="scenic-stop" onClick={()=>visit(s.id)}>{s.label}<ArrowUpRight size={16}/></button>)}</div><div className="map-list">{chapters.map(c=><button key={c.id} onClick={()=>visit(c.id)}><small>{c.number}</small><span>{c.label}<em className="biome-label">{c.biome}</em></span><ArrowUpRight size={16}/></button>)}</div></>}
      {active==='help'&&<><div className="journal-eyebrow">A QUICK FIELD GUIDE</div><DialogTitle className="chapter-title">Take the wheel.</DialogTitle><DialogDescription className="chapter-lead">Wander through the world, bump into a few cones, and stop by any destination to learn more about me.</DialogDescription><div className="help-grid"><span><kbd>W A S D / ↑ ← ↓ →</kbd>Drive & steer</span><span><kbd>SHIFT</kbd>A little extra speed</span><span><kbd>SPACE</kbd>Brake</span><span><kbd>ENTER</kbd>Open a nearby chapter</span><span><kbd>R</kbd>Recover nearby</span><span><kbd>DRAG / SCROLL</kbd>Orbit / zoom the camera</span></div><p className="help-tip">You can also click the ground to drive toward a spot. If something is in the way, steer around it. Recovery puts you on safe ground nearby. Your last safe location is remembered when you reload. On a phone, drag the joystick to drive and steer. The separate Boost and Brake buttons work while you hold the joystick. The map takes you straight to a destination.</p><button className="drive-button" onClick={drive}>Got it. Let’s go <ArrowUpRight size={18}/></button></>}
      {active==='journal'&&<><div className="journal-eyebrow">THE SHORTER ROUTE</div><DialogTitle className="chapter-title">Mohammed Razeen P<span className="orange-dot">.</span></DialogTitle><DialogDescription className="chapter-lead">Computer Science student, aspiring developer, and creative from Kozhikode, Kerala.</DialogDescription><Milestones/><div className="journal-chapters">{chapters.map(c=><article key={c.id}><small>{c.number} / {c.kicker}</small><h2>{c.title}</h2><p>{c.text}</p><p>{c.detail}</p><div className="chapter-tags">{c.tags.map(t=><span key={t}>{t}</span>)}</div></article>)}</div><section className="journal-contact"><small>HAVE SOMETHING IN MIND?</small><h2>Let’s make something happen.</h2><a href="mailto:razeenp2005@gmail.com"><Mail size={18}/>razeenp2005@gmail.com <ArrowUpRight size={18}/></a><p>Interested in internships in development, cybersecurity, and software testing.</p><div className="chapter-links"><a href="https://github.com/framesbyrazeen" target="_blank" rel="noreferrer"><Code2 size={16}/>GitHub</a><a href="https://www.linkedin.com/in/mohammed-razeen-p-933a3b326" target="_blank" rel="noreferrer"><Link size={16}/>LinkedIn</a>{shouldShowResume&&<a href="/Mohammed-Razeen-P-Resume.pdf" download><Download size={16}/>Résumé</a>}</div></section></>}
    </DialogContent></Dialog>
    <a className="skip-link" href="#" onClick={e=>{e.preventDefault();setActive('journal')}}><BookOpen size={16}/> Read the accessible portfolio</a>
  </main>;
}
function MiniMap({telemetry,onVisit}:{telemetry:Telemetry;onVisit?:(id:string)=>void}){
  return <svg viewBox="-204 -204 408 408" preserveAspectRatio="xMidYMid meet" className="minimap" role={onVisit?"group":"img"} aria-label="Map of connected city, forest, desert, mountains and coast, with your live car position">
    <rect x="-204" y="-204" width="408" height="408" fill="#628e97"/>
    <path d={`M-204 -204H204V${shorelineZ(204).toFixed(2)} ${Array.from({length:42},(_,i)=>{const x=204-i*408/41;return `L${x} ${shorelineZ(x).toFixed(2)}`}).join(' ')}Z`} fill="#375646"/>
    <path d="M-204 -97L-134 -139L-95 -115L-66 -155L-32 -125L0 -147L29 -123L61 -154L97 -121L130 -151L204 -105V-204H-204Z" fill="#889185"/>
    <path d={`M${Array.from({length:42},(_,i)=>{const x=-204+i*408/41;return `${x} ${shorelineZ(x).toFixed(2)}`}).join(' L')}`} stroke="#cbbb90" strokeWidth="8" fill="none"/>
    <path d="M110 -204H204V-64L170 -65L130 -83L103 -122Z" fill="#c39360"/>
    <rect x="-190" y="-119" width="72" height="86" rx="9" fill="#727e7c"/>
    <path d="M72 -22V35M-26 -18Q-31 -10 -27 0" fill="none" stroke="#719a9c" strokeWidth="7"/>
    {routeLines.map((line,i)=><polyline key={i} points={line.map(p=>p.join(',')).join(' ')} fill="none" stroke="#c6b89a" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>)}
    <path d="M61 7H83M-33 0H-21" stroke="#f0d59b" strokeWidth="5"/>
    {scenicStops.map(s=><circle key={s.id} cx={s.x} cy={s.z} r="2.5" fill="#dccb97"/>)}
    {chapters.map(c=><g key={c.id} role={onVisit?"button":undefined} tabIndex={onVisit?0:undefined} aria-label={`Visit ${c.label} in ${c.biome}`} onClick={()=>onVisit?.(c.id)} onKeyDown={e=>{if(onVisit&&(e.key==="Enter"||e.key===" ")){e.preventDefault();onVisit(c.id)}}}><circle cx={c.x} cy={c.z} r="7" fill={c.color}/><text x={c.x} y={c.z+2.6} textAnchor="middle" fontSize="7.5" fontFamily="monospace" fill="#23372f">{c.number}</text></g>)}
    <circle cx={telemetry.x} cy={telemetry.z} r="7" fill="#ffb778" opacity=".3"/><circle cx={telemetry.x} cy={telemetry.z} r="3.2" fill="#f8914e" stroke="#fff3dc" strokeWidth="1.3"/>
    <text x="-184" y="-178" fill="#c6d5bb" fontSize="13" fontFamily="monospace">N ↑</text>
  </svg>;
}
