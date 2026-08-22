// scene3d.js — the 3D layer (three.js). Loaded lazily; the show survives without it.

// three.js: local copy first, CDNs as backup. If all fail the show still runs.
const THREE_SOURCES = [
  new URL('../vendor/three.module.js', import.meta.url).href,
  'https://unpkg.com/three@0.160.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
];

async function loadThree(){
  for(const src of THREE_SOURCES){
    try { return await import(/* @vite-ignore */ src); }
    catch(e){ /* try next */ }
  }
  throw new Error('three.js unavailable');
}

export function createScene(canvas, quality = 1){
  return loadThree()
    .then(THREE => build(THREE, canvas, quality))
    .catch(err => { console.warn('[3d] disabled:', err.message); return null; });
}

/* ---------- procedural textures ---------- */
function radialTex(THREE, stops, size = 128){
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  stops.forEach(s => g.addColorStop(s[0], s[1]));
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function petalTex(THREE, size = 128){
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  x.translate(size/2, size/2);
  const g = x.createRadialGradient(0, -size*0.12, 2, 0, 0, size*0.5);
  g.addColorStop(0, 'rgba(255,255,255,.95)');
  g.addColorStop(.45, 'rgba(255,214,224,.72)');
  g.addColorStop(1, 'rgba(255,190,205,0)');
  x.fillStyle = g;
  x.beginPath();
  x.ellipse(0, 0, size*0.26, size*0.46, 0, 0, Math.PI*2);
  x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function build(THREE, canvas, quality){
  const renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias: quality > 0.8 });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, quality > 0.8 ? 2 : 1.35));
  renderer.setSize(innerWidth, innerHeight, false);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, innerWidth/innerHeight, 0.1, 120);
  camera.position.set(0, 0, 8.4);

  const group = new THREE.Group();
  scene.add(group);

  /* ---------------- 1. the knot (hero object) ---------------- */
  const knotUni = {
    uTime:{value:0}, uMelt:{value:0}, uWarm:{value:0},
    uOpacity:{value:0}, uChaos:{value:1},
  };
  const knotMat = new THREE.ShaderMaterial({
    uniforms: knotUni,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader:`
      uniform float uTime, uMelt, uChaos;
      varying vec3 vN; varying vec3 vV; varying float vD;
      void main(){
        vec3 pos = position;
        float t = uTime;
        float d = sin(pos.x*2.6 + t*1.3)*sin(pos.y*3.1 - t*0.9)*sin(pos.z*2.2 + t*0.6);
        float d2 = sin(pos.x*7.0 - t*2.4)*sin(pos.z*6.1 + t*1.7);
        pos += normal * (d*(0.28 + 0.55*uMelt) + d2*0.09*uChaos);
        vD = d;
        vec4 mv = modelViewMatrix * vec4(pos,1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader:`
      precision highp float;
      uniform float uTime, uWarm, uOpacity, uChaos;
      varying vec3 vN; varying vec3 vV; varying float vD;
      vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b*cos(6.28318*(c*t+d)); }
      void main(){
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
        float h = fres*1.4 + vD*0.35 + uTime*0.06;
        vec3 cold = pal(h, vec3(0.34,0.30,0.46), vec3(0.42,0.40,0.52), vec3(1.0,1.0,1.0), vec3(0.0,0.22,0.48));
        vec3 warm = pal(h, vec3(0.72,0.58,0.58), vec3(0.30,0.26,0.26), vec3(1.0,0.92,0.84), vec3(0.08,0.20,0.32));
        vec3 col = mix(cold, warm, uWarm);
        col += pow(fres, 4.0) * mix(vec3(0.7,0.85,1.0), vec3(1.0,0.85,0.8), uWarm) * 1.1;
        float a = uOpacity * (0.16 + fres*0.95);
        gl_FragColor = vec4(col*a, a);
      }`,
  });
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.35, 0.42, quality > 0.8 ? 260 : 150, quality > 0.8 ? 26 : 14, 2, 3),
    knotMat
  );
  group.add(knot);

  const cage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.4, 1),
    new THREE.MeshBasicMaterial({ color:0xbcd4ff, wireframe:true, transparent:true,
                                  opacity:0, blending:THREE.AdditiveBlending, depthWrite:false })
  );
  group.add(cage);

  /* ---------------- 2. shards ---------------- */
  const N = Math.round(quality > 0.8 ? 170 : 90);
  const shardGeo = new THREE.TetrahedronGeometry(0.12);
  const shardMat = new THREE.MeshBasicMaterial({
    transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false
  });
  const shards = new THREE.InstancedMesh(shardGeo, shardMat, N);
  shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const S = [];
  for(let i=0;i<N;i++){
    const th = Math.random()*Math.PI*2, ph = Math.acos(2*Math.random()-1);
    S.push({
      dir: new THREE.Vector3(Math.sin(ph)*Math.cos(th), Math.sin(ph)*Math.sin(th), Math.cos(ph)),
      r0: 0.4 + Math.random()*0.7,
      r1: 2.1 + Math.random()*3.4,
      sp: 0.35 + Math.random()*1.5,
      rot: new THREE.Vector3(Math.random()*6, Math.random()*6, Math.random()*6),
      spin: 0.4 + Math.random()*2.6,
      ph0: Math.random()*Math.PI*2,
      sc: 0.45 + Math.random()*1.5,
      hue: Math.random(),
    });
    shards.setColorAt(i, new THREE.Color().setHSL(0.60 + Math.random()*0.10, 0.78, 0.62));
  }
  scene.add(shards);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();

  /* ---------------- 3. silk ribbons ---------------- */
  const ribbons = [];
  const ribbonGeo = new THREE.PlaneGeometry(17, 1.0, quality > 0.8 ? 160 : 80, 4);
  for(let i=0;i<(quality > 0.8 ? 5 : 3);i++){
    const uni = { uTime:{value:0}, uOpacity:{value:0}, uSeed:{value:i*13.7},
                  uWarm:{value:0}, uAmp:{value:1} };
    const mat = new THREE.ShaderMaterial({
      uniforms: uni, transparent:true, depthWrite:false, side:THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader:`
        uniform float uTime, uSeed, uAmp;
        varying vec2 vUv; varying float vW;
        void main(){
          vec3 p = position;
          float t = uTime*0.5 + uSeed;
          float w = sin(p.x*0.42 + t)*1.05 + sin(p.x*0.9 - t*1.4)*0.42;
          p.y += w*uAmp;
          p.z += cos(p.x*0.55 - t*0.8)*1.5*uAmp;
          p.y *= 1.0 + 0.25*sin(p.x*1.2 + t);
          vUv = uv; vW = w;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
        }`,
      fragmentShader:`
        precision highp float;
        uniform float uOpacity, uWarm, uTime, uSeed;
        varying vec2 vUv; varying float vW;
        void main(){
          float edge = smoothstep(0.0,0.34,vUv.y)*smoothstep(1.0,0.66,vUv.y);
          float ends = smoothstep(0.0,0.16,vUv.x)*smoothstep(1.0,0.84,vUv.x);
          float sheen = 0.5 + 0.5*sin(vUv.x*9.0 + vW*1.6 + uTime*0.7 + uSeed);
          vec3 cold = mix(vec3(0.45,0.55,0.95), vec3(0.85,0.65,1.0), sheen);
          vec3 warm = mix(vec3(1.0,0.72,0.78), vec3(1.0,0.90,0.80), sheen);
          vec3 c = mix(cold, warm, uWarm);
          float a = edge*ends*uOpacity*(0.22 + 0.5*sheen);
          gl_FragColor = vec4(c*a, a);
        }`,
    });
    const m = new THREE.Mesh(ribbonGeo, mat);
    m.position.set((Math.random()-0.5)*3, (Math.random()-0.5)*5, -2 - Math.random()*4);
    m.rotation.z = (Math.random()-0.5)*0.9;
    m.rotation.y = (Math.random()-0.5)*0.6;
    ribbons.push({ mesh:m, uni, drift: 0.05 + Math.random()*0.12, rz: m.rotation.z });
    scene.add(m);
  }

  /* ---------------- 4. petals ---------------- */
  const P = Math.round(quality > 0.8 ? 110 : 55);
  const petals = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.30, 0.44),
    new THREE.MeshBasicMaterial({ map: petalTex(THREE), transparent:true, opacity:0,
                                  depthWrite:false, side:THREE.DoubleSide }),
    P
  );
  petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const PD = [];
  for(let i=0;i<P;i++){
    PD.push({
      x:(Math.random()-0.5)*16, y:(Math.random()-0.5)*14, z:(Math.random()-0.5)*8,
      vy: 0.35 + Math.random()*0.8, sway: 0.4 + Math.random()*1.4, ph: Math.random()*7,
      rot: Math.random()*6, spin:(Math.random()-0.5)*1.4,
      sc: Math.random() < 0.16 ? 2.2 + Math.random()*2.2 : 0.45 + Math.random()*0.75,
    });
    const big = PD[i].sc > 2;
    petals.setColorAt(i, new THREE.Color(
      big ? 0.30 : 1.0, big ? 0.19 : 0.86, big ? 0.22 : 0.88));
  }
  scene.add(petals);

  /* ---------------- 5. light leaks ---------------- */
  const leakTex = radialTex(THREE, [[0,'rgba(255,236,214,.8)'],[.32,'rgba(255,178,158,.3)'],[1,'rgba(255,150,170,0)']]);
  const leaks = [];
  for(let i=0;i<3;i++){
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 11),
      new THREE.MeshBasicMaterial({ map:leakTex, transparent:true, opacity:0,
                                    blending:THREE.AdditiveBlending, depthWrite:false })
    );
    m.position.set((Math.random()-0.5)*8, (Math.random()-0.5)*6, -6);
    leaks.push({ mesh:m, ph:Math.random()*7, sp:0.1 + Math.random()*0.2 });
    scene.add(m);
  }

  /* ---------------- update ---------------- */
  const pointer = { x:0, y:0, tx:0, ty:0 };

  function update(dt, t, s){
    // ---- camera ----
    pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt*2.4);
    pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt*2.4);
    const shake = s.chaos * s.chaos * 0.16;
    camera.position.x = Math.sin(t*0.21)*0.9 + pointer.x*1.4 + (Math.random()-0.5)*shake;
    camera.position.y = Math.cos(t*0.17)*0.6 - pointer.y*1.1 + (Math.random()-0.5)*shake;
    camera.position.z = 8.4 - s.warm*2.4 - Math.sin(t*0.12)*0.6;
    camera.rotation.z = Math.sin(t*0.13)*0.06 + s.chaos*Math.sin(t*7.0)*0.008;
    camera.lookAt(0, 0, 0);

    // ---- knot ----
    knotUni.uTime.value = t;
    knotUni.uMelt.value = s.melt;
    knotUni.uWarm.value = s.warm;
    knotUni.uChaos.value = s.chaos;
    knotUni.uOpacity.value = s.knot;
    const sp = 0.25 + s.chaos*1.9;
    knot.rotation.x += dt*sp*0.8;
    knot.rotation.y += dt*sp;
    knot.scale.setScalar(1 + s.warm*0.35 + Math.sin(t*2.2)*0.03*s.chaos);
    cage.material.opacity = s.cage;
    cage.rotation.x -= dt*0.35; cage.rotation.z += dt*0.22;
    cage.scale.setScalar(1.1 + Math.sin(t*0.9)*0.06);

    // ---- shards ----
    shardMat.opacity = s.shards;
    if(s.shards > 0.002){
      for(let i=0;i<N;i++){
        const o = S[i];
        const wob = 0.5 + 0.5*Math.sin(t*0.35*o.sp + o.ph0);
        const r = o.r0 + (o.r1 - o.r0)*(0.45 + 0.55*wob) + s.burst*3.2*o.sp;
        const ang = t*0.16*o.sp;
        const d = o.dir;
        dummy.position.set(
          d.x*r + Math.sin(t*o.sp + i)*0.25,
          d.y*r + Math.cos(t*o.sp*0.8 + i)*0.25,
          d.z*r
        );
        dummy.rotation.set(o.rot.x + t*o.spin*0.4, o.rot.y + t*o.spin*0.5, o.rot.z + ang);
        const sc = o.sc * (0.5 + s.chaos*0.85);
        dummy.scale.set(sc*0.55, sc*(1.0 + s.chaos*1.4), sc*0.55);
        dummy.updateMatrix();
        shards.setMatrixAt(i, dummy.matrix);
        const hue = 0.58 + o.hue*0.10 + s.warm*0.30 + Math.sin(t*0.25 + o.ph0)*0.02;
        col.setHSL(hue % 1, 0.72 - s.warm*0.34, 0.56 + s.warm*0.22);
        shards.setColorAt(i, col);
      }
      shards.instanceMatrix.needsUpdate = true;
      if(shards.instanceColor) shards.instanceColor.needsUpdate = true;
    }

    // ---- ribbons ----
    ribbons.forEach((rb, i) => {
      rb.uni.uTime.value = t;
      rb.uni.uWarm.value = s.warm;
      rb.uni.uOpacity.value = s.ribbons;
      rb.uni.uAmp.value = 0.5 + s.melt*0.9;
      rb.mesh.rotation.z = rb.rz + Math.sin(t*rb.drift + i)*0.25;
      rb.mesh.position.y += dt*rb.drift*(i%2 ? 1 : -1)*0.6;
      if(rb.mesh.position.y > 7) rb.mesh.position.y = -7;
      if(rb.mesh.position.y < -7) rb.mesh.position.y = 7;
    });

    // ---- petals ----
    petals.material.opacity = s.petals;
    if(s.petals > 0.002){
      for(let i=0;i<P;i++){
        const o = PD[i];
        o.y -= dt*o.vy*(0.6 + s.warm*0.9);
        if(o.y < -8){ o.y = 8; o.x = (Math.random()-0.5)*16; }
        dummy.position.set(o.x + Math.sin(t*0.6*o.sway + o.ph)*1.1, o.y, o.z);
        dummy.rotation.set(Math.sin(t*o.spin + o.ph)*0.8, t*o.spin*0.5, o.rot + t*o.spin*0.35);
        dummy.scale.setScalar(o.sc);
        dummy.updateMatrix();
        petals.setMatrixAt(i, dummy.matrix);
      }
      petals.instanceMatrix.needsUpdate = true;
    }

    // ---- leaks ----
    leaks.forEach((lk, i) => {
      lk.mesh.material.opacity = s.leaks * 0.55 * (0.45 + 0.55*Math.sin(t*lk.sp + lk.ph));
      lk.mesh.position.x = Math.sin(t*lk.sp*0.8 + lk.ph)*5.5;
      lk.mesh.position.y = Math.cos(t*lk.sp*0.6 + lk.ph)*3.5;
      lk.mesh.scale.setScalar(1 + s.warm*0.7 + Math.sin(t*0.4 + i)*0.15);
    });

    renderer.render(scene, camera);
  }

  function resize(){
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight, false);
  }

  function setPointer(x, y){ pointer.tx = x; pointer.ty = y; }

  return { update, resize, setPointer };
}
