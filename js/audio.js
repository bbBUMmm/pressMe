// audio.js — fully procedural score. No files, no CDN. Starts only after a user gesture.

export function createAudio(){
  let ctx = null, master = null, verb = null, bed = null, bedGain = null, ready = false;
  let muted = false;

  function noiseBuffer(sec = 2, brown = true){
    const n = Math.floor(ctx.sampleRate*sec);
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for(let i=0;i<n;i++){
      const w = Math.random()*2 - 1;
      if(brown){ last = (last + 0.02*w)/1.02; d[i] = last*3.2; }
      else d[i] = w;
    }
    return b;
  }

  function init(){
    if(ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.0001;
    master.connect(ctx.destination);

    // cheap reverb: feedback delay network
    const d1 = ctx.createDelay(1), d2 = ctx.createDelay(1);
    const f1 = ctx.createGain(), f2 = ctx.createGain(), lp = ctx.createBiquadFilter();
    d1.delayTime.value = 0.23; d2.delayTime.value = 0.37;
    f1.gain.value = 0.42; f2.gain.value = 0.36;
    lp.type = 'lowpass'; lp.frequency.value = 2600;
    verb = ctx.createGain(); verb.gain.value = 1;
    verb.connect(d1); verb.connect(d2);
    d1.connect(f1); f1.connect(lp); lp.connect(d1);
    d2.connect(f2); f2.connect(lp); lp.connect(d2);
    d1.connect(master); d2.connect(master);

    ready = true;
    ramp(0.3, 2.5);
  }

  const now = () => ctx.currentTime;
  function ramp(v, t = 1){
    if(!ready || muted) return;
    master.gain.cancelScheduledValues(now());
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now());
    master.gain.exponentialRampToValueAtTime(Math.max(0.0001, v), now() + t);
  }

  /* ---------- ambience bed (wind / rumble) ---------- */
  function startBed(gain = 0.16){
    if(!ready || bed) return;
    bed = ctx.createBufferSource();
    bed.buffer = noiseBuffer(3, true);
    bed.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 0.6;
    bedGain = ctx.createGain(); bedGain.gain.value = gain;
    bed.connect(lp); lp.connect(bedGain); bedGain.connect(master);
    bed.start();
  }
  function bedLevel(v, t = 1.5){
    if(!bedGain) return;
    bedGain.gain.setTargetAtTime(v, now(), t/3);
  }

  /* ---------- one-shots ---------- */
  function thunder(strength = 1, delay = 1.2){
    if(!ready) return;
    const t0 = now() + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(2.2, true);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(700*strength + 120, t0);
    lp.frequency.exponentialRampToValueAtTime(90, t0 + 1.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.42*strength, t0 + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.9);
    src.connect(lp); lp.connect(g); g.connect(master); g.connect(verb);
    src.start(t0); src.stop(t0 + 2.2);
  }

  function impact(){
    if(!ready) return;
    const t0 = now();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t0);
    o.frequency.exponentialRampToValueAtTime(26, t0 + 0.9);
    g.gain.setValueAtTime(0.6, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.2);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + 1.3);

    const s = ctx.createBufferSource(); s.buffer = noiseBuffer(1, false);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass';
    bp.frequency.setValueAtTime(2400, t0);
    bp.frequency.exponentialRampToValueAtTime(300, t0 + 0.5);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.35, t0);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
    s.connect(bp); bp.connect(g2); g2.connect(master); g2.connect(verb);
    s.start(t0); s.stop(t0 + 0.7);
  }

  function kick(v = 1){
    if(!ready) return;
    const t0 = now();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t0);
    o.frequency.exponentialRampToValueAtTime(38, t0 + 0.18);
    g.gain.setValueAtTime(0.34*v, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + 0.4);
  }

  function tick(v = 1){
    if(!ready) return;
    const t0 = now();
    const s = ctx.createBufferSource(); s.buffer = noiseBuffer(0.4, false);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.10*v, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    s.connect(hp); hp.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + 0.12);
  }

  function riser(dur = 4, v = 0.12){
    if(!ready) return;

    const t0 = now();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();

    o.type = 'sine';
    o.frequency.setValueAtTime(55, t0);
    o.frequency.exponentialRampToValueAtTime(110, t0 + dur);

    lp.type = 'lowpass';
    lp.frequency.value = 500;

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 1);

    o.connect(lp);
    lp.connect(g);
    g.connect(master);
    g.connect(verb);

    o.start(t0);
    o.stop(t0 + dur + 1.1);
  }

  /* ---------- pad ---------- */
  let padNodes = [];
  function pad(freqs, dur = 10, v = 0.10){
    if(!ready) return;
    stopPad(1.6);
    const t0 = now();
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 2.4);
    g.connect(master); g.connect(verb);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(500, t0);
    lp.frequency.exponentialRampToValueAtTime(2400, t0 + dur*0.6);
    lp.connect(g);
    const list = [];
    freqs.forEach(f => {
      [-4, 4].forEach(cents => {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.detune.value = cents;
        const og = ctx.createGain(); og.gain.value = 0.16;
        o.connect(og); og.connect(lp);
        o.start(t0);
        list.push(o);
      });
    });
    padNodes = [{ oscs:list, gain:g }];
  }
  function stopPad(t = 2){
    padNodes.forEach(p => {
      try{
        p.gain.gain.cancelScheduledValues(now());
        p.gain.gain.setValueAtTime(Math.max(0.0001, p.gain.gain.value), now());
        p.gain.gain.exponentialRampToValueAtTime(0.0001, now() + t);
        p.oscs.forEach(o => o.stop(now() + t + 0.1));
      }catch(e){}
    });
    padNodes = [];
  }

  function bell(freq = 880, v = 0.09){
    if(!ready) return;
    const t0 = now();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
    o.connect(g); g.connect(master); g.connect(verb);
    o.start(t0); o.stop(t0 + 2.5);
  }

  function setMuted(m){
    muted = m;
    if(!ready) return;
    master.gain.cancelScheduledValues(now());
    master.gain.setTargetAtTime(m ? 0.0001 : 0.3, now(), 0.25);
  }

  function resume(){ if(ctx && ctx.state === 'suspended') ctx.resume(); }

  return { init, resume, startBed, bedLevel, thunder, impact, kick, tick,
           riser, pad, stopPad, bell, ramp, setMuted, isReady: () => ready };
}
