// type.js — typographic bursts + hard cuts (the "edit" of the film)

export function createType(wordsEl, cutsEl){
  const rnd = (a,b) => a + Math.random()*(b-a);
  const pick = a => a[Math.floor(Math.random()*a.length)];

  function make(cls, html, style, ms){
    const d = document.createElement('div');
    d.className = 'w ' + cls;
    d.innerHTML = html;
    Object.assign(d.style, style);
    wordsEl.appendChild(d);
    setTimeout(() => d.remove(), ms);
    return d;
  }

  /* ---- runway: huge condensed caps, center-ish, hard in/out ---- */
  function runway(text){
    const cls = 'w-runway' + (Math.random() < 0.45 ? ' w-outline' : '');
    return make(cls, text, {
      top: rnd(18, 68) + '%',
      left: '50%',
      fontSize: 'clamp(40px,' + rnd(8, 15).toFixed(1) + 'vw, 190px)',
      '--rot': rnd(-3, 3).toFixed(2) + 'deg',
      animationDuration: rnd(.5, .9).toFixed(2) + 's',
    }, 1100);
  }

  /* ---- edge: small tracked caps pinned to an edge ---- */
  function edge(text){
    const left = Math.random() < .5;
    return make('w-edge', text, {
      top: rnd(8, 88) + '%',
      [left ? 'left' : 'right']: rnd(3, 14) + '%',
      fontSize: 'clamp(10px,1.7vw,17px)',
      '--dx': (left ? -1 : 1) * rnd(20, 60) + 'px',
    }, 1400);
  }

  /* ---- stack: one word repeated, ticker-like ---- */
  function stack(text, n = 5){
    let html = '';
    for(let i=0;i<n;i++) html += `<span style="--i:${i}">${text}</span>`;
    return make('w-stack' + (Math.random() < 0.5 ? ' w-outline' : ''), html, {
      top: rnd(6, 58) + '%', left: '0', width: '100%',
      fontSize: 'clamp(20px,' + rnd(4, 7).toFixed(1) + 'vw, 78px)',
    }, 1500);
  }

  /* ---- serif: elegant display line, blur reveal ---- */
  function serif(text){
    return make('w-serif', text, {
      top: rnd(28, 62) + '%', left: '50%',
      fontSize: 'clamp(30px,' + rnd(6, 12).toFixed(1) + 'vw, 150px)',
    }, 2600);
  }

  /* ---- soft: pastel lowercase whisper ---- */
  function soft(text){
    return make('w-soft', text, {
      top: rnd(30, 58) + '%', left: '50%',
      fontSize: 'clamp(30px,' + rnd(7, 11).toFixed(1) + 'vw, 130px)',
    }, 3400);
  }

  /* ---- cuts ---- */
  function cut(color = '#ffffff', dir = 'x', ms = 620){
    const d = document.createElement('div');
    d.className = 'cut cut-' + dir;
    d.style.background = color;
    d.style.animationDuration = ms + 'ms';
    cutsEl.appendChild(d);
    setTimeout(() => d.remove(), ms + 40);
  }

  function flash(color = 'rgba(255,255,255,.9)', ms = 90){
    const d = document.createElement('div');
    d.className = 'flashpanel';
    d.style.background = color;
    d.style.animationDuration = ms + 'ms';
    cutsEl.appendChild(d);
    setTimeout(() => d.remove(), ms + 40);
  }

  function clear(){ wordsEl.innerHTML = ''; cutsEl.innerHTML = ''; }

  return { runway, edge, stack, serif, soft, cut, flash, clear, pick };
}
