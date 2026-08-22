// bg.js — fullscreen procedural background (raw WebGL, zero dependencies)
// gate: distant storm behind smoke  ·  show: storm -> trip -> bloom

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;

const FRAG = `
precision highp float;
varying vec2 vUv;

uniform vec2  uRes;
uniform float uTime;
uniform float uShow;
uniform float uFlash;
uniform vec2  uFlashPos;
uniform float uChaos;
uniform float uKaleido;
uniform float uWarm;
uniform float uMelt;
uniform float uZoom;
uniform float uAberr;
uniform float uFade;
uniform float uGrain;
uniform float uExposure;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x),
             mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y);
}

const mat2 R = mat2(0.80, 0.60, -0.60, 0.80);

float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  for(int i=0;i<5;i++){ s += a*noise(p); p = R*p*2.03; a *= 0.5; }
  return s;
}

/* three-stop art direction: storm (electric blue) -> trip (magenta) -> bloom (rose/cream) */
vec3 tone(float v, float warm){
  float w1 = clamp(warm*2.0, 0.0, 1.0);
  float w2 = clamp(warm*2.0-1.0, 0.0, 1.0);

  vec3 sDeep = vec3(0.010,0.014,0.036), sMid = vec3(0.055,0.105,0.330), sHot = vec3(0.42,0.66,1.30);
  vec3 tDeep = vec3(0.075,0.020,0.130), tMid = vec3(0.430,0.090,0.560), tHot = vec3(1.25,0.30,0.72);
  vec3 bDeep = vec3(0.330,0.135,0.190), bMid = vec3(0.960,0.560,0.545), bHot = vec3(1.10,0.93,0.80);

  vec3 deep = mix(mix(sDeep,tDeep,w1), bDeep, w2);
  vec3 mid  = mix(mix(sMid ,tMid ,w1), bMid , w2);
  vec3 hot  = mix(mix(sHot ,tHot ,w1), bHot , w2);

  float body = smoothstep(0.12, 0.68, v);
  float glow = pow(smoothstep(0.52, 1.00, v), 3.0);
  return mix(deep, mid, body) + hot*glow;
}

void main(){
  vec2 uv = vUv;
  vec2 p = uv - 0.5;
  p.x *= uRes.x / uRes.y;
  vec3 col = vec3(0.0);

  /* ---------------- GATE ---------------- */
  if(uShow < 0.999){
    float t = uTime*0.022;
    float f1 = fbm(p*1.15 + vec2(t, -t*0.5));
    float f2 = fbm(p*2.70 + vec2(-t*1.5, t*0.35) + f1*0.9);
    float fog = smoothstep(0.10, 0.98, f1*0.72 + f2*0.46);

    vec3 g = mix(vec3(0.009,0.011,0.021), vec3(0.070,0.088,0.140), fog);
    g += vec3(0.026,0.038,0.070) * smoothstep(0.62,-0.45,p.y);          // horizon haze
    float d = length((p - uFlashPos) * vec2(1.0, 1.25));
    g += uFlash * exp(-d*1.9) * (0.22 + fog*1.9) * vec3(0.40,0.60,1.00) * 1.9;
    g += uFlash*uFlash * exp(-d*7.0) * vec3(0.75,0.86,1.00) * 1.1;
    col = g;
  }

  /* ---------------- SHOW ---------------- */
  if(uShow > 0.001){
    vec2 q = p * uZoom;
    float r = length(q);
    float a = atan(q.y, q.x) + uTime*0.07*uChaos;
    float n = mix(3.0, 9.0, uKaleido);
    float seg = 6.28318/n;
    float fa = abs(mod(a + seg*0.5, seg) - seg*0.5);
    q = mix(q, vec2(cos(fa), sin(fa))*r, uKaleido);

    float t = uTime * mix(0.10, 0.62, uChaos);
    vec2 w1 = vec2(fbm(q*1.35 + t), fbm(q*1.35 + vec2(3.7,1.9) - t*0.7));
    vec2 w2 = vec2(fbm(q*1.35 + 2.2*w1 + t*0.4), fbm(q*1.35 + 2.2*w1 + vec2(2.2,8.4)));
    float f = fbm(q*1.35 + (1.7 + 2.7*uMelt)*w2);
    f += 0.15*uMelt*sin(r*mix(7.0,18.0,uChaos) - uTime*1.3);
    f = clamp(f*1.25 - 0.08, 0.0, 1.4);

    float ab = uAberr*0.055;
    vec3 s = vec3(tone(f+ab, uWarm).r, tone(f, uWarm).g, tone(f-ab, uWarm).b);

    // electric radial rays while the storm rages
    float rays = pow(abs(sin(fa*6.0 + uTime*1.4)), 12.0) * exp(-r*0.9);
    s += rays * uChaos * mix(vec3(0.35,0.55,1.0), vec3(1.0,0.6,0.55), uWarm) * 0.55;

    // warm key light once it blooms
    float sun = exp(-length(p - vec2(-0.30, 0.26))*1.7);
    s += sun * vec3(1.00,0.68,0.52) * 0.55 * uWarm;

    float sc = sin(uv.y*uRes.y*0.7 + uTime*22.0)*0.5+0.5;
    s *= 1.0 - 0.10*sc*uChaos;

    col = mix(col, s, uShow);
  }

  col *= uExposure;

  // vignette: black in the storm, warm in the bloom
  float vig = pow(length(p*vec2(0.94,1.0)), 2.05);
  col = mix(col, col*(1.0-0.62*vig) + vec3(0.11,0.045,0.06)*vig*uWarm, 1.0);

  col += (hash(uv*uRes.xy + fract(uTime)) - 0.5) * uGrain;
  col *= uFade;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, src){
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

export class Background {
  constructor(canvas, opts = {}){
    this.canvas = canvas;
    this.scale = opts.scale || 1;
    this.ok = false;
    try{
      this.gl = canvas.getContext('webgl', { antialias:false, alpha:false, powerPreference:'high-performance' })
             || canvas.getContext('experimental-webgl');
      if(!this.gl) return;
      const gl = this.gl;

      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      this.u = {};
      ['uRes','uTime','uShow','uFlash','uFlashPos','uChaos','uKaleido','uWarm','uMelt',
       'uZoom','uAberr','uFade','uGrain','uExposure']
        .forEach(k => this.u[k] = gl.getUniformLocation(prog, k));

      this.v = { show:0, flash:0, flashPos:[0,-0.15], chaos:0, kaleido:0, warm:0,
                 melt:0, zoom:1.2, aberr:0, fade:1, grain:0.05, exposure:1 };
      this.ok = true;
      this.resize();
    }catch(e){
      console.warn('[bg] webgl unavailable:', e.message);
      document.body.classList.add('no-webgl');
    }
  }

  resize(){
    if(!this.ok) return;
    const w = Math.max(1, Math.floor(innerWidth * this.scale));
    const h = Math.max(1, Math.floor(innerHeight * this.scale));
    this.canvas.width = w; this.canvas.height = h;
    this.gl.viewport(0, 0, w, h);
  }

  render(time){
    if(!this.ok) return;
    const gl = this.gl, u = this.u, v = this.v;
    gl.uniform2f(u.uRes, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uShow, v.show);
    gl.uniform1f(u.uFlash, v.flash);
    gl.uniform2f(u.uFlashPos, v.flashPos[0], v.flashPos[1]);
    gl.uniform1f(u.uChaos, v.chaos);
    gl.uniform1f(u.uKaleido, v.kaleido);
    gl.uniform1f(u.uWarm, v.warm);
    gl.uniform1f(u.uMelt, v.melt);
    gl.uniform1f(u.uZoom, v.zoom);
    gl.uniform1f(u.uAberr, v.aberr);
    gl.uniform1f(u.uFade, v.fade);
    gl.uniform1f(u.uGrain, v.grain);
    gl.uniform1f(u.uExposure, v.exposure);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
