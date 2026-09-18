import {Award,CircuitBoard,ShieldCheck,Code2} from 'lucide-react';

export function Milestones(){
  return <section className="milestones" aria-label="Achievements and learning highlights">
    <div className="milestone-heading"><span>THE THINGS I’M BUILDING ON</span><small>Learning, making, exploring.</small></div>
    <article className="milestone-award"><Award size={36} strokeWidth={1.3}/><div><small>NPTEL · PROGRAMMING IN JAVA</small><h2>Elite + Silver</h2><p>A milestone in my programming journey.</p></div><span className="award-seal">JAVA</span></article>
    <div className="milestone-grid">
      <article><CircuitBoard size={23}/><small>TATHVA ’24 · NIT CALICUT</small><h3>From circuit to board.</h3><p>Designed a simple PCB circuit using EasyEDA during a hands-on workshop.</p></article>
      <article><ShieldCheck size={23}/><small>COLLEGE OF ENGINEERING VADAKARA</small><h3>A security mindset.</h3><p>Explored cybersecurity through a practical workshop.</p></article>
    </div>
    <div className="coding-note"><Code2 size={22}/><p><strong>I like to vibe code.</strong><span>Ideas, AI-assisted experiments, and the curiosity to understand how it all works.</span></p></div>
  </section>;
}
