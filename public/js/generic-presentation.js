import {initTestimonials} from './testimonials.js';

export function initGenericPresentation(config,ui,track=()=>{}){
 document.body.classList.add('stk');document.getElementById('sticky').classList.add('show','in');
 const ids=['s-offre','video','comment','offres','montage','preuves','faq','final'];
 const labels=[...ui.journey];labels[7]=ui.en?'Your project':'Votre projet';
 const journey=document.getElementById('jny'),button=document.getElementById('jb'),list=document.getElementById('jl');
 journey.classList.add('show');
 const close=()=>{journey.classList.remove('open');button.setAttribute('aria-expanded','false')};
 list.replaceChildren(...ids.map((id,i)=>{
  const li=document.createElement('li'),link=document.createElement('button'),name=document.createElement('span'),here=document.createElement('em');
  name.textContent=labels[i];here.textContent=ui.here;link.append(name,here);
  link.onclick=()=>{close();if(i===0)window.scrollTo({top:0,behavior:'smooth'});else document.getElementById(id).scrollIntoView({behavior:'smooth'})};
  li.append(link);return li;
 }));
 const circumference=2*Math.PI*11;
 button.innerHTML=`<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="11" fill="none" stroke="#2b4579" stroke-width="3"/><circle id="jring" cx="14" cy="14" r="11" fill="none" stroke="#6EA8FF" stroke-width="3" stroke-linecap="round" stroke-dasharray="${circumference}" transform="rotate(-90 14 14)"/></svg><span class="t"><small></small><b></b></span>`;
 const update=()=>{
  let current=0;const header=document.querySelector('header.top').offsetHeight;
  ids.forEach((id,i)=>{if(document.getElementById(id).getBoundingClientRect().top<=header+innerHeight*.35)current=i});
  if(innerHeight+scrollY>=document.documentElement.scrollHeight-6)current=ids.length-1;
  const max=document.documentElement.scrollHeight-innerHeight,progress=max>0?Math.min(1,Math.max(0,scrollY/max)):0;
  button.querySelector('#jring').setAttribute('stroke-dashoffset',circumference*(1-progress));
  button.querySelector('small').textContent=`${current+1} ${ui.of} ${ids.length}`;button.querySelector('b').textContent=labels[current];
  [...list.children].forEach((li,i)=>{li.className=i<current?'done':i===current?'now':'';li.querySelector('em').hidden=i!==current});
 };
 button.onclick=()=>button.setAttribute('aria-expanded',String(journey.classList.toggle('open')));
 document.addEventListener('click',e=>{if(!e.target.closest('#jny'))close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
 window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);update();
 const flow=document.getElementById('flow');
 const video=document.getElementById('vsl'),sound=document.getElementById('vslSound');
 const compact=matchMedia('(max-width:600px)'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const setSource=()=>{const source=compact.matches?config.media.mobileVideo:config.media.desktopVideo;if(video.dataset.src!==source){video.src=source+'#t=0.1';video.dataset.src=source}};
 setSource();compact.addEventListener('change',setSource);
 sound.onclick=()=>{video.muted=false;video.volume=1;sound.hidden=true;video.play().catch(()=>{});track('video_unmute')};
 let played=false;const marks=new Set();
 video.addEventListener('play',()=>{if(!played){played=true;track('video_play')}});
 video.addEventListener('timeupdate',()=>{if(!video.duration)return;for(const percent of [25,50,75,100])if(!marks.has(percent)&&video.currentTime/video.duration*100>=percent-.5){marks.add(percent);track('video_progress',{percent})}});
 video.addEventListener('volumechange',()=>sound.hidden=!video.muted);
 if('IntersectionObserver' in window){
  const seen=new Set();new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting&&!seen.has(e.target.id)){seen.add(e.target.id);track('section_view',{section:e.target.id})}}),{threshold:.4}).observe(document.getElementById('s-offre'));
  const sections=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting&&!seen.has(e.target.id)){seen.add(e.target.id);track('section_view',{section:e.target.id})}}),{threshold:.4});
  ids.slice(1).forEach(id=>sections.observe(document.getElementById(id)));
  new IntersectionObserver(entries=>entries.forEach(e=>{flow.classList.toggle('in',e.isIntersecting);flow.classList.toggle('run',e.isIntersecting)}),{threshold:.35}).observe(flow);
  new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting&&!reduced.matches)video.play().catch(()=>{});else video.pause()}),{threshold:.5}).observe(document.getElementById('vslbox'));
 }
 reduced.addEventListener('change',()=>{if(reduced.matches)video.pause()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause()});
 initTestimonials();
 if(ui.en){const note=document.createElement('p');note.className='media-language-note';note.textContent='Presentation and testimonial videos are in French.';document.querySelector('#video .wrap').append(note)}
}
