// main.js — direction & orchestration
import { Background } from './bg.js';
import { createFx }   from './fx2d.js';
import { createType } from './type.js';
import { createAudio } from './audio.js';
import { createScene } from './scene3d.js';

/* ================= CONFIG — все, що варто міняти, тут ================= */
export const CONFIG = {
  code: 'refrmdao',
  hintAfterFails: 1,
  question: 'idk... what is your name?',
  subtitle: '(відповідь напиши у тіндер чаті :) I am waiting I guess)',
  phrase: 'генерую запитання...',   // єдина фраза, яка блимає протягом усього показу
};

/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
const lerp = (a,b,t) => a + (b-a)*t;
const easeInOut = t => t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
const pick = a => a[Math.floor(Math.random()*a.length)];

const el = {
  gate:$('#gate'), inner:$('.gate-inner'), input:$('#code'), hint:$('#hint'),
  press:$('#press'), final:$('#final'), grade:$('#grade'),
  three:$('#three'), fx:$('#fx'), words:$('#words'), cuts:$('#cuts'),
  vignette:$('#vignette'), grain:$('#grain'),
  sound:$('#sound'), replay:$('#replay'),
};

/* ================= quality ================= */
const isMobile = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
const quality = isMobile ? 0.65 : 1;

const bg = new Background($('#bg'), { scale: isMobile ? 0.8 : Math.min(devicePixelRatio||1, 1.5) });
const fx = createFx($('#fx'), quality);
const type = createType(el.words, el.cuts);
const audio = createAudio();
let s3d = null;
createScene(el.three, quality).then(s => { s3d = s; if(s) s.resize(); });

/* respect the system's motion preference: no strobe, no glitch bars */
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
if(REDUCED){ type.flash = () => {}; fx.glitch = () => {}; }

/* film grain, generated once */
(function grain(){
  const n = 128, c = document.createElement('canvas');
  c.width = c.height = n;
  const x = c.getContext('2d'), img = x.createImageData(n, n);
  for(let i=0;i<img.data.length;i+=4){
    const v = 120 + Math.random()*135;
    img.data[i] = img.data[i+1] = img.data[i+2] = v;
    img.data[i+3] = 26 + Math.random()*36;
  }
  x.putImageData(img, 0, 0);
  el.grain.style.backgroundImage = `url(${c.toDataURL()})`;
  el.grain.style.backgroundSize = '150px 150px';
})();

/* ================= timeline ================= */
const K = [
 //  t     chaos kal  warm melt zoom aber grain fade  knot cage shrd ribb ptl  leak brst  mark half p2d  veil expo
 [ 0.0,  1.00,0.10,0.00,0.05,2.80,1.00,0.10,0.00,  0.00,0.00,0.00,0.00,0.00,0.00,1.00,  0.00,0.00,0.00,0.00,0.86],
 [ 0.25,  1.00,0.14,0.00,0.08,2.40,1.00,0.10,1.00,  0.85,0.24,0.85,0.00,0.00,0.00,0.55,  0.00,0.00,0.00,0.00,0.86],
 [ 0.90,  1.00,0.24,0.00,0.14,2.10,0.95,0.09,1.00,  1.00,0.34,0.95,0.00,0.00,0.04,0.12,  0.55,0.00,0.00,0.00,0.88],
 [ 2.95,  0.95,0.50,0.08,0.32,1.75,0.88,0.08,1.00,  1.00,0.42,0.72,0.00,0.00,0.12,0.05,  0.75,0.16,0.00,0.00,0.90],
 [ 4.55,  0.90,0.82,0.20,0.58,1.50,0.82,0.07,1.00,  1.00,0.24,0.62,0.05,0.00,0.20,0.03,  0.80,0.34,0.00,0.00,0.94],
 [ 6.60,  0.78,1.00,0.38,0.90,1.26,0.70,0.06,1.00,  0.92,0.09,0.50,0.22,0.04,0.30,0.02,  0.80,0.30,0.06,0.00,0.98],
 [ 8.20,  0.58,0.86,0.55,1.00,1.10,0.50,0.06,1.00,  0.76,0.05,0.34,0.60,0.20,0.42,0.01,  0.72,0.18,0.16,0.00,1.00],
 [10.00,  0.38,0.62,0.74,0.88,0.98,0.30,0.05,1.00,  0.54,0.00,0.20,0.88,0.55,0.55,0.00,  0.60,0.06,0.34,0.02,1.02],
 [11.35,  0.22,0.44,0.87,0.66,0.90,0.18,0.05,1.00,  0.38,0.00,0.08,1.00,0.80,0.62,0.00,  0.44,0.02,0.52,0.08,1.04],
 [12.30,  0.11,0.28,0.95,0.46,0.83,0.09,0.04,1.00,  0.24,0.00,0.02,0.95,0.95,0.60,0.00,  0.26,0.00,0.64,0.18,1.05],
 [13.30,  0.05,0.15,1.00,0.32,0.76,0.04,0.04,1.00,  0.12,0.00,0.00,0.72,0.90,0.48,0.00,  0.08,0.00,0.60,0.38,1.06],
 [14.80,  0.02,0.08,1.00,0.22,0.71,0.02,0.03,1.00,  0.06,0.00,0.00,0.52,0.78,0.36,0.00,  0.00,0.00,0.50,0.50,1.06],
 [90.0,  0.01,0.05,1.00,0.18,0.66,0.01,0.03,1.00,  0.03,0.00,0.00,0.42,0.70,0.30,0.00,  0.00,0.00,0.45,0.52,1.06],
];
const KEYS = ['chaos','kaleido','warm','melt','zoom','aberr','grain','fade',
              'knot','cage','shards','ribbons','petals','leaks','burst',
              'marks','halftone','petals2d','veil','exposure'];

const state = {};
function sample(t){
  let i = 0;
  while(i < K.length-2 && t > K[i+1][0]) i++;
  const a = K[i], b = K[i+1];
  const k = easeInOut(clamp((t-a[0])/(b[0]-a[0]), 0, 1));
  for(let j=0;j<KEYS.length;j++) state[KEYS[j]] = lerp(a[j+1], b[j+1], k);
  return state;
}

/* ================= the edit (cues) ================= */
const CUES = [
  [0.00, () => { audio.impact(); type.flash('rgba(255,255,255,.95)', 110); fx.spark(40);
                 fx.bolt(); fx.bolt(); fx.ring(null,null,null,1.2);
                 type.runway(CONFIG.phrase); fx.setPhase(''); }],
  [0.15, () => { fx.glitch(12); type.cut('#0a0b12','x',340); }],
  [0.40, () => { type.stack(CONFIG.phrase, 4); fx.bolt(); }],
  [0.95, () => { type.cut('#0e1430','y',420); type.runway(CONFIG.phrase); }],
  [1.45, () => { type.serif(CONFIG.phrase); fx.ring(); }],
  [2.10, () => { type.cut('#5b1bd6','x',440); fx.glitch(16); type.runway(CONFIG.phrase); }],
  [2.90, () => { type.flash('rgba(190,215,255,.85)', 120); audio.riser(1.5); }],
  [3.00, () => { type.cut('#ff2e92','y',460); type.stack(CONFIG.phrase, 4); }],
  [3.70, () => { type.serif(CONFIG.phrase); fx.ring(null,null,null,1.6,'255,120,190'); }],
  [4.55, () => { type.cut('#2a1160','x',480); type.runway(CONFIG.phrase); }],
  [5.45, () => { audio.riser(1.3); type.stack(CONFIG.phrase, 3); }],
  [6.20, () => { type.flash('rgba(255,180,210,.8)', 140); }],
  [6.55, () => { audio.pad([174.61, 261.63, 311.13, 415.30], 6, 0.085);
                 type.serif(CONFIG.phrase); fx.ring(null,null,null,2.0,'255,170,190'); }],
  [7.55, () => { type.runway(CONFIG.phrase); }],
  [8.25, () => { type.soft(CONFIG.phrase); audio.bell(659.25); }],
  [9.25, () => { audio.pad([138.59, 207.65, 261.63, 349.23], 6, 0.09); audio.bell(523.25);
                 type.serif(CONFIG.phrase); }],
  [10.25, () => { type.soft(CONFIG.phrase); audio.bell(783.99); }],
  [11.15, () => { type.soft(CONFIG.phrase); audio.bell(880.00); }],
  [11.90, () => { audio.pad([103.83, 207.65, 261.63, 311.13, 392.00], 20, 0.10); audio.bell(659.25); }],
  [12.40, () => { reveal(); audio.bell(523.25); setTimeout(()=>audio.bell(659.25), 380);
                 setTimeout(()=>audio.bell(783.99), 820); }],
];
let cueIdx = 0;

/* ================= beat engine ================= */
let beatT = 0, beatN = 0;
function beats(dt, t){
  if(t > 10.2) return;
  const iv = t < 2.9 ? 0.46 : t < 6.55 ? 0.40 : 0.60;
  beatT -= dt;
  if(beatT > 0) return;
  beatT = iv;
  beatN++;
  const heat = state.chaos;
  if(beatN % 2 === 1) audio.kick(0.5 + heat*0.6);
  audio.tick(0.35 + heat*0.5);
  if(t < 6.55){
    if(beatN % 4 === 0) fx.ring(null, null, null, 0.9);
    if(Math.random() < 0.55*heat) fx.streak();
    if(Math.random() < 0.35*heat) fx.glitch(4 + Math.random()*6);
    if(t < 2.9 && Math.random() < 0.4) fx.bolt();
    if(Math.random() < 0.34){
      Math.random() < 0.55 ? type.edge(CONFIG.phrase) : type.runway(CONFIG.phrase);
    }
  } else if(t < 10.2){
    if(Math.random() < 0.3) type.edge(CONFIG.phrase);
    if(Math.random() < 0.25) fx.ring(null, null, null, 1.8, '255,190,200');
  }
}

/* ================= reveal ================= */
function reveal(){
  const q = el.final.querySelector('.q');
  q.innerHTML = '';
  let i = 0;
  CONFIG.question.split(' ').forEach((word, wi, arr) => {
    const w = document.createElement('span');
    w.className = 'word';
    [...word].forEach(ch => {
      const sp = document.createElement('span');
      sp.textContent = ch;
      sp.style.animationDelay = (i*0.028 + 0.1) + 's';
      i++;
      w.appendChild(sp);
    });
    q.appendChild(w);
    if(wi < arr.length - 1){
      const gap = document.createElement('span');
      gap.className = 'word';
      gap.innerHTML = '<span style="animation-delay:' + (i*0.028 + 0.1) + 's">\u00A0</span>';
      i++;
      q.appendChild(gap);
    }
  });
  el.final.querySelector('.sub').textContent = CONFIG.subtitle;
  el.final.classList.add('on');
  document.body.classList.add('done');
  el.replay.hidden = false;
  requestAnimationFrame(() => el.replay.classList.add('on'));
}

/* ================= gate lightning ================= */
let flash = 0, nextBolt = 0.9;
function gateStorm(dt){
  flash *= Math.pow(0.0004, dt);
  nextBolt -= dt;
  if(nextBolt <= 0){
    nextBolt = 2.2 + Math.random()*3.4;
    bg.v.flashPos = [(Math.random()-0.5)*1.5, -0.02 - Math.random()*0.4];
    const strength = 0.3 + Math.random()*0.7;
    flash = strength;
    audio.thunder(strength, 0.7 + Math.random()*1.8);
    if(Math.random() < 0.45) setTimeout(() => { flash = strength*0.75; }, 90 + Math.random()*140);
  }
  bg.v.flash = flash;
}

/* ================= loop ================= */
let phase = 'gate', showT0 = 0, last = performance.now()/1000;
let frames = 0, acc = 0, degraded = false;

function frame(now){
  now /= 1000;
  const dt = Math.min(0.05, now - last); last = now;

  if(phase === 'gate'){
    gateStorm(dt);
    bg.v.show = 0;
    bg.render(now);
  } else {
    const t = (now - showT0) * 0.8;
    window.__t = t;
    const s = sample(t);
    Object.assign(bg.v, s);
    bg.v.show = clamp(t/0.3, 0, 1);
    bg.v.flash = 0;

    while(cueIdx < CUES.length && CUES[cueIdx][0] <= t){ CUES[cueIdx][1](); cueIdx++; }
    beats(dt, t);

    bg.render(now);
    fx.update(dt, t, s);
    if(s3d) s3d.update(dt, t, s);

    const fade = clamp(t/0.4, 0, 1);
    el.three.style.opacity = String(fade * (0.9 - s.warm*0.26));
    el.fx.style.opacity    = String(fade * (0.85 - s.warm*0.32));
    el.grade.style.opacity = String(s.veil);
    el.vignette.style.opacity = String(1 - s.warm*0.55);

    if(!degraded){
      frames++; acc += dt;
      if(frames === 90){
        window.__fps = Math.round(frames/acc);
        if(frames/acc < 38){ degraded = true; bg.scale = 0.6; bg.resize(); }
      }
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('resize', () => { bg.resize(); fx.resize(); if(s3d) s3d.resize(); });

addEventListener('pointermove', e => {
  if(s3d) s3d.setPointer((e.clientX/innerWidth - .5)*2, (e.clientY/innerHeight - .5)*2);
});
addEventListener('deviceorientation', e => {
  if(s3d && e.gamma != null) s3d.setPointer(clamp(e.gamma/45, -1, 1), clamp((e.beta-45)/45, -1, 1));
});

/* ================= gate interaction ================= */
let fails = 0, armed = false;
function armAudio(){
  if(armed) return; armed = true;
  audio.init(); audio.resume(); audio.startBed(0.14);
}
addEventListener('pointerdown', armAudio);
addEventListener('keydown', armAudio);

el.inner.addEventListener('click', () => el.input.focus());

function wrong(){
  fails++;
  el.inner.classList.remove('wrong'); void el.inner.offsetWidth;
  el.inner.classList.add('wrong');
  el.input.value = '';
  if(fails >= CONFIG.hintAfterFails){
    el.hint.textContent = 'підказка: ' + CONFIG.code;
    el.hint.classList.add('on');
  }
}

let unlocked = false;
function unlock(){
  if(unlocked) return; unlocked = true;
  el.input.blur(); el.input.disabled = true;
  el.inner.classList.add('dissolve');
  audio.bell(880, 0.06);
  setTimeout(() => { el.press.hidden = false; requestAnimationFrame(() => el.press.classList.add('on')); }, 560);
}

el.input.addEventListener('keydown', e => {
  if(e.key === 'Enter'){
    e.preventDefault();
    (el.input.value.trim().toLowerCase() === CONFIG.code) ? unlock() : wrong();
  }
});
el.input.addEventListener('input', () => {
  if(el.input.value.trim().toLowerCase() === CONFIG.code) unlock();
});

function startShow(){
  cueIdx = 0; beatN = 0; beatT = 0;
  type.clear();
  el.final.classList.remove('on');
  el.replay.classList.remove('on');
  document.body.classList.remove('done');
  phase = 'show';
  showT0 = performance.now()/1000;
  audio.bedLevel(0.05, 3);
  audio.ramp(0.20, 2.5);
}

/* ---- controls ---- */
let muted = false;
el.sound.addEventListener('click', () => {
  muted = !muted;
  audio.setMuted(muted);
  el.sound.classList.toggle('off', muted);
  el.sound.textContent = muted ? '♪̸' : '♪';
  el.sound.setAttribute('aria-label', muted ? 'увімкнути звук' : 'вимкнути звук');
});
el.replay.addEventListener('click', () => { audio.stopPad(1); startShow(); });

el.press.addEventListener('click', () => {
  armAudio();
  el.gate.classList.add('gone');
  startShow();
});

setTimeout(() => { try{ el.input.focus({ preventScroll:true }); }catch(e){} }, 500);
