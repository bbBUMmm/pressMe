// fx2d.js — the 2D graphic layer: lightning, shockwaves, glitch, editorial marks, petals

export function createFx(canvas, quality = 1){
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;

  const bolts = [], rings = [], streaks = [], bars = [], sparks = [], petals = [];
  let phaseLabel = '';

  /* soft petal sprite (pre-rendered once) */
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  {
    const s = sprite.getContext('2d');
    const g = s.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,244,246,.95)');
    g.addColorStop(.5, 'rgba(255,198,214,.5)');
    g.addColorStop(1, 'rgba(255,180,200,0)');
    s.fillStyle = g; s.beginPath(); s.ellipse(32, 32, 15, 28, 0, 0, Math.PI*2); s.fill();
  }

  function resize(){
    dpr = Math.min(devicePixelRatio || 1, quality > 0.8 ? 2 : 1.3);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.floor(W*dpr); canvas.height = Math.floor(H*dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();

  /* ---------------- emitters ---------------- */
  function bolt(x0, y0, x1, y1, life = 0.3){
    x0 = x0 ?? Math.random()*W; y0 = y0 ?? -20;
    x1 = x1 ?? x0 + (Math.random()-0.5)*W*0.5; y1 = y1 ?? H*(0.5 + Math.random()*0.6);
    let pts = [{x:x0,y:y0},{x:x1,y:y1}];
    for(let it=0; it<6; it++){
      const out = [pts[0]];
      const amp = 90/(it+1.2);
      for(let i=1;i<pts.length;i++){
        const a = pts[i-1], b = pts[i];
        out.push({ x:(a.x+b.x)/2 + (Math.random()-0.5)*amp, y:(a.y+b.y)/2 + (Math.random()-0.5)*amp*0.35 });
        out.push(b);
      }
      pts = out;
    }
    const branches = [];
    for(let i=0;i<3;i++){
      const k = 8 + Math.floor(Math.random()*(pts.length-16));
      const seg = [pts[k]];
      let p = pts[k];
      for(let j=0;j<7;j++){
        p = { x:p.x + (Math.random()-0.5)*70, y:p.y + Math.random()*55 };
        seg.push(p);
      }
      branches.push(seg);
    }
    bolts.push({ pts, branches, life, t:0 });
  }

  function ring(x, y, r1 = Math.max(W,H)*0.9, life = 1.1, color = '255,255,255'){
    rings.push({ x:x ?? W/2, y:y ?? H/2, r0:10, r1, life, t:0, color });
  }
  function streak(){
    streaks.push({ y:Math.random()*H, x:-W*0.3, w:W*(0.3+Math.random()*0.6),
                   h:1 + Math.random()*3, sp:(1.6+Math.random()*3)*W, t:0, life:0.5 });
  }
  function glitch(n = 8){
    for(let i=0;i<n;i++){
      bars.push({ y:Math.random()*H, h:2 + Math.random()*40, x:(Math.random()-0.5)*80,
                  t:0, life:0.05 + Math.random()*0.13, a:0.10 + Math.random()*0.32,
                  hue: Math.random() < 0.5 ? '120,180,255' : '255,90,170' });
    }
  }
  function spark(n = 26){
    for(let i=0;i<n;i++){
      const a = Math.random()*Math.PI*2, v = 120 + Math.random()*700;
      sparks.push({ x:W/2, y:H/2, vx:Math.cos(a)*v, vy:Math.sin(a)*v, t:0, life:0.5+Math.random()*0.9 });
    }
  }
  function petal(n = 1){
    for(let i=0;i<n;i++){
      petals.push({ x:Math.random()*W, y:-90 - Math.random()*H*0.3,
                    vy:34 + Math.random()*80, sway:18 + Math.random()*60,
                    ph:Math.random()*7, sc:1.6 + Math.random()*2.6,
                    rot:Math.random()*6, spin:(Math.random()-0.5)*1.2,
                    a:0.10 + Math.random()*0.16 });
    }
  }

  /* ---------------- editorial overlay ---------------- */
  function marks(a, t, s){
    if(a < 0.01) return;
    const m = W < 520 ? 14 : 26, L = W < 520 ? 10 : 16;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255,255,255,.42)';
    ctx.lineWidth = 1;
    // crop marks
    [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([x,y,sx,sy]) => {
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + L*sx, y);
      ctx.moveTo(x, y); ctx.lineTo(x, y + L*sy);
      ctx.stroke();
    });
    // labels
    const fs = W < 520 ? 8 : 10;
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = `500 ${fs}px "Inter", system-ui, sans-serif`;
    ctx.letterSpacing && (ctx.letterSpacing = '2px');
    ctx.fillText(phaseLabel, m + 2, H - m - 12);
    ctx.textAlign = 'right';
    ctx.font = `500 ${fs}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const ff = Math.floor((t*24) % 24);
    ctx.fillText(
      `00:${String(Math.floor(t)).padStart(2,'0')}:${String(ff).padStart(2,'0')}`,
      W - m - 2, H - m - 12
    );
    ctx.restore();
  }

  /* ---------------- frame ---------------- */
  function update(dt, t, s){
    ctx.clearRect(0, 0, W, H);

    // bolts
    for(let i=bolts.length-1;i>=0;i--){
      const b = bolts[i]; b.t += dt;
      const k = 1 - b.t/b.life;
      if(k <= 0){ bolts.splice(i,1); continue; }
      const flick = k * (0.55 + 0.45*Math.random());
      ctx.save();
      ctx.globalAlpha = flick;
      ctx.strokeStyle = 'rgba(170,205,255,.95)';
      ctx.lineWidth = 7; ctx.lineJoin = 'round';
      if(quality > 0.8){ ctx.shadowColor = 'rgba(150,195,255,1)'; ctx.shadowBlur = 44; }
      ctx.beginPath();
      b.pts.forEach((p,j) => j ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,1)'; ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.globalAlpha = flick*0.5; ctx.lineWidth = 1;
      b.branches.forEach(seg => {
        ctx.beginPath();
        seg.forEach((p,j) => j ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y));
        ctx.stroke();
      });
      ctx.restore();
    }

    // rings
    for(let i=rings.length-1;i>=0;i--){
      const r = rings[i]; r.t += dt;
      const k = r.t/r.life;
      if(k >= 1){ rings.splice(i,1); continue; }
      const rad = r.r0 + (r.r1-r.r0)*(1-Math.pow(1-k,3));
      ctx.save();
      ctx.globalAlpha = (1-k)*0.55;
      ctx.strokeStyle = `rgba(${r.color},.9)`;
      ctx.lineWidth = 1 + (1-k)*2.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    // streaks
    for(let i=streaks.length-1;i>=0;i--){
      const st = streaks[i]; st.t += dt; st.x += st.sp*dt;
      if(st.t > st.life || st.x > W*1.3){ streaks.splice(i,1); continue; }
      ctx.save();
      ctx.globalAlpha = (1 - st.t/st.life)*0.55;
      const g = ctx.createLinearGradient(st.x, 0, st.x + st.w, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(.5, 'rgba(220,235,255,.95)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(st.x, st.y, st.w, st.h);
      ctx.restore();
    }

    // glitch bars
    for(let i=bars.length-1;i>=0;i--){
      const b = bars[i]; b.t += dt;
      if(b.t > b.life){ bars.splice(i,1); continue; }
      ctx.save();
      ctx.globalAlpha = b.a * (1 - b.t/b.life);
      ctx.fillStyle = `rgba(${b.hue},.9)`;
      ctx.fillRect(b.x, b.y, W, b.h);
      ctx.restore();
    }

    // sparks
    for(let i=sparks.length-1;i>=0;i--){
      const p = sparks[i]; p.t += dt;
      if(p.t > p.life){ sparks.splice(i,1); continue; }
      p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 260*dt; p.vx *= 0.985; p.vy *= 0.985;
      ctx.save();
      ctx.globalAlpha = (1 - p.t/p.life)*0.9;
      ctx.fillStyle = 'rgba(255,240,225,.95)';
      ctx.fillRect(p.x, p.y, 2, 2);
      ctx.restore();
    }

    // petals
    if(s.petals2d > 0.01 && petals.length < 12 && Math.random() < s.petals2d*dt*3.4) petal(1);
    for(let i=petals.length-1;i>=0;i--){
      const p = petals[i];
      p.y += p.vy*dt; p.rot += p.spin*dt; p.ph += dt;
      if(p.y > H + 60){ petals.splice(i,1); continue; }
      ctx.save();
      ctx.globalAlpha = p.a*s.petals2d;
      ctx.translate(p.x + Math.sin(p.ph*0.7)*p.sway, p.y);
      ctx.rotate(p.rot);
      ctx.scale(p.sc, p.sc);
      ctx.drawImage(sprite, -32, -32);
      ctx.restore();
    }

    // halftone (trip)
    if(s.halftone > 0.01){
      const step = W < 520 ? 26 : 34;
      ctx.save();
      ctx.globalAlpha = s.halftone*0.14;
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      for(let x=step/2; x<W; x+=step){
        for(let y=step/2; y<H; y+=step){
          const d = Math.sin(x*0.012 + t*1.6) * Math.cos(y*0.014 - t*1.1);
          const r = Math.max(0, d)*step*0.18;
          if(r > 0.4){ ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill(); }
        }
      }
      ctx.restore();
    }

    marks(s.marks, t, s);
  }

  return { resize, update, bolt, ring, streak, glitch, spark, petal,
           setPhase: v => phaseLabel = v };
}
