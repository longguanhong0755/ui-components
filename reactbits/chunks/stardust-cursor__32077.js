"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[32077],{32077:(e,t,a)=>{a.r(t),a.d(t,{default:()=>L});var u=a(95155),l=a(12115),i=a(56388),r=a(86049),n=a(90761),o=a(12246),s=a(2253),c=a(90650);let f=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,v=`
uniform sampler2D uVelocity;
uniform vec2 uSize;
uniform vec4 uSegment;
uniform vec2 uTarget;
uniform float uRadius;
uniform float uMix;
uniform float uWake;
uniform vec4 uPuff;
uniform vec2 uPuffVelocity;
varying vec2 vUv;
void main() {
  vec4 state = texture2D(uVelocity, vUv);
  vec2 velocity = state.xy;
  vec2 q = vUv * uSize;
  vec2 a = uSegment.xy;
  vec2 ab = uSegment.zw - a;
  float h = clamp(dot(q - a, ab) / max(dot(ab, ab), 0.0001), 0.0, 1.0);
  vec2 d = q - a - ab * h;
  float g = exp(-dot(d, d) / (uRadius * uRadius));
  velocity += (uTarget - velocity) * g * uMix;
  vec2 e = q - uPuff.xy;
  float p = exp(-dot(e, e) / (uPuff.z * uPuff.z)) * uPuff.w;
  velocity += uPuffVelocity * p;
  gl_FragColor = vec4(velocity, max(state.z, max(g * uWake, p)), 1.0);
}
`,d=`
uniform sampler2D uVelocity;
uniform vec2 uTexel;
uniform float uCell;
varying vec2 vUv;
void main() {
  float l = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
  float r = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
  float b = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
  gl_FragColor = vec4((r - l - t + b) / (2.0 * uCell), 0.0, 0.0, 1.0);
}
`,m=`
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform vec2 uTexel;
uniform vec2 uSize;
uniform float uCell;
uniform float uStrength;
uniform float uTurbulence;
uniform float uTime;
uniform float uDt;
varying vec2 vUv;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float stream(vec2 p, float t) {
  return noise(p + vec2(t * 0.17, -t * 0.11)) + 0.5 * noise(p * 2.03 + vec2(-t * 0.23, t * 0.19) + 7.1);
}

vec2 swirl(vec2 p, float t) {
  float e = 0.05;
  float n = stream(p + vec2(0.0, e), t) - stream(p - vec2(0.0, e), t);
  float m = stream(p + vec2(e, 0.0), t) - stream(p - vec2(e, 0.0), t);
  return vec2(n, -m) / (2.0 * e);
}

void main() {
  float l = abs(texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x);
  float r = abs(texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x);
  float b = abs(texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x);
  float t = abs(texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x);
  float c = texture2D(uCurl, vUv).x;
  vec2 g = vec2(r - l, t - b);
  vec2 n = g / (length(g) + 0.00001);
  vec4 state = texture2D(uVelocity, vUv);
  vec2 velocity = state.xy + vec2(n.y, -n.x) * c * uStrength * uCell * uDt;
  velocity += swirl(vUv * uSize / 240.0, uTime) * uTurbulence * state.z * uDt;
  gl_FragColor = vec4(clamp(velocity, vec2(-8000.0), vec2(8000.0)), state.z, 1.0);
}
`,p=`
uniform sampler2D uVelocity;
uniform vec2 uTexel;
uniform float uCell;
varying vec2 vUv;
void main() {
  float l = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
  float t = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
  gl_FragColor = vec4((r - l + t - b) / (2.0 * uCell), 0.0, 0.0, 1.0);
}
`,h=`
uniform sampler2D uSource;
uniform float uScale;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(uSource, vUv) * uScale;
}
`,x=`
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexel;
uniform float uCell;
varying vec2 vUv;
void main() {
  float l = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float divergence = texture2D(uDivergence, vUv).x;
  gl_FragColor = vec4((l + r + b + t - divergence * uCell * uCell) * 0.25, 0.0, 0.0, 1.0);
}
`,y=`
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexel;
uniform float uCell;
varying vec2 vUv;
void main() {
  float l = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float r = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float b = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float t = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  vec4 state = texture2D(uVelocity, vUv);
  gl_FragColor = vec4(state.xy - vec2(r - l, t - b) / (2.0 * uCell), state.z, 1.0);
}
`,g=`
uniform sampler2D uVelocity;
uniform vec2 uSize;
uniform float uDt;
uniform float uDissipation;
uniform float uSettle;
varying vec2 vUv;
void main() {
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  vec4 moved = texture2D(uVelocity, vUv - uDt * velocity / uSize);
  gl_FragColor = vec4(moved.xy / (1.0 + uDissipation * uDt), moved.z * exp(-uSettle * uDt), 1.0);
}
`,b=`
uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform vec2 uSize;
uniform vec2 uWind;
uniform float uDt;
uniform float uDecay;
uniform float uCool;
uniform vec4 uSegment;
uniform vec2 uDir;
uniform float uArc;
uniform float uGrain;
uniform float uTone;
uniform float uSpread;
uniform float uPaint;
uniform vec4 uPuff;
varying vec2 vUv;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 velocity = texture2D(uVelocity, vUv).xy + uWind;
  vec4 dye = texture2D(uDye, vUv - uDt * velocity / uSize);
  float density = max(dye.x - uDt * uDecay, 0.0);
  float heat = dye.y * exp(-uDt * uCool);
  vec2 q = vUv * uSize;
  vec2 a = uSegment.xy;
  vec2 ab = uSegment.zw - a;
  float h = clamp(dot(q - a, ab) / max(dot(ab, ab), 0.0001), 0.0, 1.0);
  vec2 d = q - a - ab * h;
  vec2 rel = q - uSegment.zw;
  float along = uArc + dot(rel, uDir);
  float across = dot(rel, vec2(-uDir.y, uDir.x));
  float width = uSpread * (0.8 + 0.4 * noise(vec2(along / 64.0, 3.7)));
  float g = exp(-dot(d, d) / (width * width)) * uPaint;
  float streak = noise(vec2(along / 130.0, across / 7.0)) * 0.65 + noise(vec2(along / 55.0, across / 3.6) + 9.1) * 0.35;
  g *= mix(1.0 - uGrain, 1.0, smoothstep(0.32, 0.68, streak));
  vec2 e = q - uPuff.xy;
  float p = exp(-dot(e, e) / (uPuff.z * uPuff.z)) * uPuff.w;
  float add = min(1.0, 1.6 * max(g, p));
  float tone = mix(dye.z, uTone, clamp((add - density) / max(add, 0.001), 0.0, 1.0));
  density = max(density, add);
  heat = max(heat, add);
  gl_FragColor = vec4(density, heat, tone, 1.0);
}
`,w=`
uniform sampler2D uState;
uniform sampler2D uVelocity;
uniform sampler2D uDye;
uniform vec2 uSize;
uniform vec2 uWind;
uniform float uSpacing;
uniform float uDt;
uniform float uTime;
uniform float uDrift;
uniform float uLifespan;
varying vec2 vUv;

vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

vec2 drift(vec2 q, float t) {
  vec2 k1 = vec2(0.0123, 0.0071);
  vec2 k2 = vec2(-0.0068, 0.0137);
  vec2 k3 = vec2(0.0191, -0.0153);
  vec2 grad = k1 * cos(dot(q, k1) + t * 0.31) + k2 * cos(dot(q, k2) - t * 0.23) * 0.8 + k3 * cos(dot(q, k3) + t * 0.41) * 0.45;
  return vec2(grad.y, -grad.x) * 50.0;
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  vec2 jitter = hash2(cell);
  vec2 home = (cell + 0.5 + (jitter - 0.5) * 0.72) * uSpacing / uSize;
  vec4 state = texture2D(uState, vUv);
  float lifespan = uLifespan * (0.7 + 0.6 * hash2(cell + 19.7).x);
  if (state.w < 0.5 || state.z > lifespan || texture2D(uDye, state.xy).x < 0.003) {
    gl_FragColor = vec4(home, 0.0, 1.0);
    return;
  }
  vec2 v1 = texture2D(uVelocity, state.xy).xy + uWind;
  vec2 mid = state.xy + 0.5 * uDt * v1 / uSize;
  vec2 v2 = texture2D(uVelocity, mid).xy + uWind;
  state.xy += uDt * (v2 + drift(state.xy * uSize, uTime) * uDrift) / uSize;
  state.z += uDt;
  gl_FragColor = state;
}
`,S=`
uniform sampler2D uState;
uniform sampler2D uDye;
uniform float uColumns;
uniform float uLifespan;
uniform vec2 uOffset;
uniform float uSize;
uniform float uVariance;
uniform float uSoftness;
uniform float uHighlight;
uniform float uInk;
uniform float uOpacity;
uniform float uEcho;
uniform vec3 uHead;
uniform vec3 uTail;
varying vec4 vColor;
varying float vSize;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.103, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

vec3 labToLinear(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  int columns = int(uColumns);
  ivec2 cell = ivec2(gl_VertexID % columns, gl_VertexID / columns);
  vec4 state = texelFetch(uState, cell, 0);
  vec4 dye = texture2D(uDye, state.xy);
  vec2 seed = vec2(cell);
  float threshold = 0.02 + 0.9 * pow(hash(seed), 1.4);
  float lifespan = uLifespan * (0.7 + 0.6 * hash2(seed + 19.7).x);
  float visible = smoothstep(threshold, threshold + uSoftness, dye.x) * smoothstep(0.0, 0.2, state.z) * (1.0 - smoothstep(lifespan - 0.35, lifespan, state.z));
  if (state.w < 0.5 || visible < 0.004) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    vColor = vec4(0.0);
    vSize = 0.0;
    return;
  }
  gl_Position = vec4(state.xy * 2.0 - 1.0 + uOffset, 0.0, 1.0);
  float size = uSize * (1.0 + uVariance * (hash(seed + 17.31) - 0.5)) * (0.55 + 0.45 * smoothstep(0.0, 0.85, dye.x));
  gl_PointSize = max(size, 1.0);
  vSize = size;
  vec3 lab = mix(uHead, uTail, clamp(dye.z, 0.0, 1.0));
  float fresh = clamp(dye.y, 0.0, 1.0) * uHighlight;
  float lift = uInk > 0.5 ? min(lab.x, 0.3) : max(lab.x, 0.92);
  lab = vec3(mix(lab.x, lift, fresh), lab.yz * (1.0 - fresh * 0.4));
  if (uEcho > 0.0) lab = vec3(uInk > 0.5 ? mix(lab.x, 1.0, 0.45) : lab.x * 0.62, lab.yz * (uInk > 0.5 ? 0.7 : 1.15));
  float shade = 0.78 + 0.22 * hash(seed + 41.7);
  vColor = vec4(encode(labToLinear(lab)), visible * shade * uOpacity * (uEcho > 0.0 ? uEcho : 1.0));
}
`,C=`
uniform float uRound;
varying vec4 vColor;
varying float vSize;
void main() {
  float a = vColor.a;
  if (uRound > 0.5) {
    float r = length(gl_PointCoord * 2.0 - 1.0);
    a *= 1.0 - smoothstep(1.0 - min(2.0 / max(vSize, 1.0), 0.5), 1.0, r);
  }
  if (a <= 0.002) discard;
  gl_FragColor = vec4(vColor.rgb * a, a);
}
`,D=(e,t,a)=>Math.min(a,Math.max(t,e)),z=(e,t)=>Number.isFinite(e)?e:t,k=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),T=(e,t,a)=>{let u=k(e),l=k(t),i=k(a),r=Math.cbrt(.4122214708*u+.5363325363*l+.0514459929*i),n=Math.cbrt(.2119034982*u+.6806995451*l+.1073969566*i),o=Math.cbrt(.0883024619*u+.2817188376*l+.6299787005*i);return{l:.2104542553*r+.793617785*n-.0040720468*o,a:1.9779984951*r-2.428592205*n+.4505937099*o,b:.0259040371*r+.7827717662*n-.808675766*o}},M=null,P=(e,t)=>{if("undefined"==typeof document||!e||"undefined"!=typeof CSS&&"function"==typeof CSS.supports&&!CSS.supports("color",e))return t;if(!M){let e=document.createElement("canvas");e.width=1,e.height=1,M=e.getContext("2d",{willReadFrequently:!0})}if(!M)return t;M.clearRect(0,0,1,1),M.fillStyle="#000",M.fillStyle=e,M.fillRect(0,0,1,1);let a=M.getImageData(0,0,1,1).data;return T(a[0]/255,a[1]/255,a[2]/255)},F=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},U=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,V=(0,l.forwardRef)(function({colors:e=["#FF9FFC","#8B5CF6"],blend:t="light",shape:a="round",dotSize:i=2.4,sizeVariance:r=.4,density:n=1.4,spread:k=64,grain:M=.7,cycle:V=900,life:j=2.4,softness:E=.16,highlight:A=.3,echo:I=.45,echoOffset:R=1.5,force:q=1,radius:L=80,swirl:O=.5,turbulence:_=.6,momentum:H=1,drift:W=1,wind:B=0,windAngle:N=-90,opacity:Y=1,puff:G=!0,puffSize:X=1,puffForce:Q=1,maxParticles:$=16e4,autoplay:K=!1,autoplaySpeed:Z=1,idleDelay:J=1.5,intro:ee=!0,interactive:et=!0,disabled:ea=!1,quality:eu=1,className:el,style:ei,children:er},en){let eo=(0,l.useRef)(null),es=(0,l.useRef)(null),ec={colors:e,blend:t,shape:a,dotSize:i,sizeVariance:r,density:n,spread:k,grain:M,cycle:V,life:j,softness:E,highlight:A,echo:I,echoOffset:R,force:q,radius:L,swirl:O,turbulence:_,momentum:H,drift:W,wind:B,windAngle:N,opacity:Y,puff:G,puffSize:X,puffForce:Q,maxParticles:$,autoplay:K,autoplaySpeed:Z,idleDelay:J,intro:ee,interactive:et,disabled:ea,quality:eu,reduced:(0,l.useSyncExternalStore)(F,U,()=>!1)},ef=(0,l.useRef)(ec);return(0,l.useEffect)(()=>{ef.current=ec,es.current?.sync()}),(0,l.useEffect)(()=>{let e=eo.current;if(!e)return;let t=((e,t)=>{let a,u,l=e.ownerDocument,i=l.defaultView??window,r=l.createElement("canvas");r.setAttribute("aria-hidden","true"),r.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:20",e.appendChild(r);try{a=new o.WebGLRenderer({canvas:r,alpha:!0,premultipliedAlpha:!0,antialias:!1})}catch{return r.remove(),null}a.setClearColor(0,0),a.autoClear=!1,a.sortObjects=!1;let n=a.extensions.has("EXT_color_buffer_float")?s.RQf:s.ix0,c=i.matchMedia("(pointer: fine)"),k=(u=5352253,()=>{let e=u=u+0x6d2b79f5>>>0;return e=Math.imul(e^e>>>15,1|e),(((e^=e+Math.imul(e^e>>>7,61|e))^e>>>14)>>>0)/0x100000000}),M=new s.qUd(-1,1,1,-1,0,1),F=new s.bdM(2,2),U=new s.Z58,V=new s.eaF(F);V.frustumCulled=!1,U.add(V);let j=(e,t,a,u)=>new s.nWS(e,t,{type:a,format:s.GWd,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1,minFilter:u,magFilter:u,wrapS:s.ghU,wrapT:s.ghU}),E=(e,t,a,u)=>({read:j(e,t,a,u),write:j(e,t,a,u)}),A=e=>{let t=e.read;e.read=e.write,e.write=t},I=E(16,16,s.ix0,s.k6q),R=E(16,16,s.ix0,s.hxR),q=E(16,16,s.ix0,s.k6q),L=j(16,16,s.ix0,s.hxR),O=j(16,16,s.ix0,s.hxR),_=E(1,1,n,s.hxR),H=(e,t)=>new s.BKk({vertexShader:f,fragmentShader:e,uniforms:t,blending:s.XIg,depthTest:!1,depthWrite:!1}),W=new s.I9Y(1/16,1/16),B=new s.I9Y(1,1),N=new s.I9Y,Y={value:8},G={value:1/60},X={value:0},Q=H(v,{uVelocity:{value:null},uSize:{value:B},uSegment:{value:new s.IUQ},uTarget:{value:new s.I9Y},uRadius:{value:80},uMix:{value:0},uWake:{value:0},uPuff:{value:new s.IUQ(0,0,1,0)},uPuffVelocity:{value:new s.I9Y}}),$=H(d,{uVelocity:{value:null},uTexel:{value:W},uCell:Y}),K=H(m,{uVelocity:{value:null},uCurl:{value:O.texture},uTexel:{value:W},uSize:{value:B},uCell:Y,uStrength:{value:30},uTurbulence:{value:260},uTime:X,uDt:G}),Z=H(p,{uVelocity:{value:null},uTexel:{value:W},uCell:Y}),J=H(h,{uSource:{value:null},uScale:{value:.8}}),ee=H(x,{uPressure:{value:null},uDivergence:{value:L.texture},uTexel:{value:W},uCell:Y}),et=H(y,{uPressure:{value:null},uVelocity:{value:null},uTexel:{value:W},uCell:Y}),ea=H(g,{uVelocity:{value:null},uSize:{value:B},uDt:G,uDissipation:{value:1.3},uSettle:{value:.7}}),eu=H(b,{uDye:{value:null},uVelocity:{value:null},uSize:{value:B},uWind:{value:N},uDt:G,uDecay:{value:1.2},uCool:{value:1.6},uSegment:{value:new s.IUQ},uDir:{value:new s.I9Y(1,0)},uArc:{value:0},uGrain:{value:.7},uTone:{value:0},uSpread:{value:60},uPaint:{value:0},uPuff:{value:new s.IUQ(0,0,1,0)}}),el=H(w,{uState:{value:null},uVelocity:{value:null},uDye:{value:null},uSize:{value:B},uWind:{value:N},uSpacing:{value:4.6},uDt:G,uTime:X,uDrift:{value:.1},uLifespan:{value:2}}),ei=new s.BKk({vertexShader:S,fragmentShader:C,uniforms:{uState:{value:null},uDye:{value:null},uColumns:{value:1},uLifespan:{value:2.1},uOffset:{value:new s.I9Y},uSize:{value:4},uVariance:{value:.4},uSoftness:{value:.16},uHighlight:{value:.3},uInk:{value:0},uOpacity:{value:1},uEcho:{value:0},uHead:{value:new s.Pq0(1,0,0)},uTail:{value:new s.Pq0(.5,.05,-.2)},uRound:{value:1}},transparent:!0,depthTest:!1,depthWrite:!1}),er=new s.LoY,en=new s.ONl(er,ei);en.frustumCulled=!1;let eo=new s.Z58;eo.add(en);let es=0,ec=0,ef=4.6,ev=0,ed=0,em=0,ep=!1,eh=!0,ex=!1,ey=1,eg=1,eb=1,ew=0,eS=0,eC=0,eD=0,ez="none",ek="",eT="",eM=0,eP=0,eF=0,eU=!1,eV=[],ej=null,eE={x:0,y:0,inside:!1,seen:!1,leftAt:-1e9},eA={x:0,y:0,vx:0,vy:0,on:!1},eI={x:0,y:0,at:0,live:!1},eR={clock:0,phase:40*k(),ox:0,oy:0,nextPuff:0},eq={on:!1,t0:0,duration:1.9,ax:0,ay:0,bx:0,by:0,cx:0,cy:0,ex:0,ey:0},eL=()=>{let e=t.current;return e.interactive&&!e.disabled&&!e.reduced&&c.matches},eO=e=>{a.setRenderTarget(e),a.clear()},e_=()=>{for(let e of[I.read,I.write,R.read,R.write,q.read,q.write,L,O,_.read,_.write])eO(e);a.setRenderTarget(null)},eH=()=>{a.setRenderTarget(null),a.clear(),eU=!1},eW=()=>{let u=t.current,l=e.getBoundingClientRect(),r=Math.max(1,l.width),o=Math.max(1,l.height),c=D(z(u.quality,1),.5,1),f=Math.min(i.devicePixelRatio||1,2)*c,v=9/c,d=D(Math.round(r/v),16,320),m=D(Math.round(o/v),16,320),p=D(Math.round(r/(v/2)),16,640),h=D(Math.round(o/(v/2)),16,640),x=D(z(u.maxParticles,16e4),4e3,4e5),y=Math.max(4.6/Math.sqrt(D(z(u.density,1.4),.1,4)),Math.sqrt(r*o/x)),g=Math.max(1,Math.ceil(r/y)),b=Math.max(1,Math.ceil(o/y));if(!(.5>Math.abs(r-ey)&&.5>Math.abs(o-eg)&&f===eb&&d===ew&&m===eS&&g===es&&b===ec&&.01>Math.abs(y-ef))){if(ey=r,eg=o,eb=f,ef=y,a.setPixelRatio(eb),a.setSize(ey,eg,!1),B.set(ey,eg),d!==ew||m!==eS){for(let e of(ew=d,eS=m,[I.read,I.write,R.read,R.write,L,O]))e.setSize(ew,eS);W.set(1/ew,1/eS)}(p!==eC||h!==eD)&&(eC=p,eD=h,q.read.setSize(eC,eD),q.write.setSize(eC,eD)),(g!==es||b!==ec)&&(es=g,ec=b,_.read.dispose(),_.write.dispose(),_=E(es,ec,n,s.hxR),er.dispose(),er.setAttribute("position",new s.THS(new Float32Array(es*ec),1)),er.boundingSphere=new s.iyt(new s.Pq0,2),ei.uniforms.uColumns.value=es),el.uniforms.uSpacing.value=ef,Y.value=(ey/ew+eg/eS)/2,e_(),eH()}},eB=()=>{let a=t.current,u="",l=t=>{let a=(t??"").trim();return a&&"currentcolor"!==a.toLowerCase()?a:(u||(u=i.getComputedStyle(e).color),u)},r=Array.isArray(a.colors)?a.colors:[],n=l(r[0]),o=l(r[1]??r[0]),c=`${n}|${o}`;if(c!==eT){eT=c;let e=P(n,T(1,.62,.99)),t=P(o,T(.32,.15,1));ei.uniforms.uHead.value.set(e.l,e.a,e.b),ei.uniforms.uTail.value.set(t.l,t.a,t.b)}let f="ink"===a.blend?"ink":"light";f!==ek&&(ek=f,ei.blending=s.bCz,ei.blendEquation="ink"===f?s.gO9:s.$ei,ei.blendEquationAlpha="ink"===f?s.gO9:s.$ei,ei.blendSrc=s.qad,ei.blendSrcAlpha=s.qad,ei.blendDst=s.OuU,ei.blendDstAlpha=s.OuU,ei.needsUpdate=!0)},eN=e=>{let a=t.current,u=.34*ey,l=.28*eg,i=1.5*e*D(640/Math.max(1,Math.hypot(1.24*u,.88*l)),.6,4)*D(z(a.autoplaySpeed,1),.1,4)+eR.phase,r=Math.exp(-e/.8);return{x:ey/2+u*(.62*Math.sin(.83*i+.3)+.38*Math.sin(1.97*i+1.7))+eR.ox*r,y:eg/2+l*(.58*Math.sin(1.13*i+2.1)+.42*Math.sin(.51*i+.4))+eR.oy*r}},eY=(e,t)=>{let a=Math.hypot(eA.vx,eA.vy),u=a>90?eA.vx/a:0,l=a>90?eA.vy/a:-1;return(e<.22*ey&&u<0||e>.78*ey&&u>0)&&(u*=-.6),(t<.22*eg&&l<0||t>.78*eg&&l>0)&&(l*=-.6),Math.atan2(l,u)},eG=(e,a,u)=>{let l=t.current;!l.puff||l.disabled||l.reduced||(eV.length>3&&eV.shift(),eV.push({x:e,y:a,angle:u,age:0}))},eX=(e,t)=>{V.material=e,a.setRenderTarget(t),a.render(U,M)},eQ=()=>{ep||!eh||ev||(ev=i.requestAnimationFrame(e$))};function e$(e){let u;if(ev=0,ep)return;let l=t.current,r=em?D((e-em)/1e3,1/240,1/24):1/60;em=e;let n=performance.now()/1e3,o=(u=t.current).disabled||u.reduced?"none":eL()&&eE.inside?"pointer":eq.on?"script":!u.autoplay||!ex||eL()&&eE.seen&&n-eE.leftAt<Math.max(0,z(u.idleDelay,1.5))?"none":"ghost";o!==ez&&(e=>{let t=ez;if(ez=e,"none"===e){eA.on=!1;return}if("pointer"===e){eq.on=!1,"none"!==t&&eA.on||(eA.x=eE.x,eA.y=eE.y,eA.vx=0,eA.vy=0),eA.on=!0;return}if("script"===e){eA.x=eq.ax,eA.y=eq.ay,eA.vx=0,eA.vy=0,eA.on=!0;return}eR.clock=0,eR.ox=0,eR.oy=0;let a=eN(0),u=eA.on?eA.x:-40,l=eA.on?eA.y:a.y;eR.ox=u-a.x,eR.oy=l-a.y,eR.nextPuff=3.4+1.4*k(),eA.on||(eA.x=u,eA.y=l,eA.vx=0,eA.vy=0),eA.on=!0})(o),"ghost"===ez&&(eR.clock+=r,l.puff&&eR.clock>=eR.nextPuff&&(eR.nextPuff=eR.clock+4.6+1.8*k(),eG(eA.x,eA.y,eY(eA.x,eA.y)))),G.value=r;let s=((e,u)=>{var l;let i,r,n,o,s,c,f=t.current,v=(e=>{if("pointer"===ez)return{x:eE.x,y:eE.y};if("script"===ez){let t,a=(t=D((e-eq.t0)/eq.duration,0,1))<.5?4*t*t*t:1-Math.pow(2-2*t,3)/2,u=1-a;return{x:u*u*u*eq.ax+3*u*u*a*eq.bx+3*u*a*a*eq.cx+a*a*a*eq.ex,y:u*u*u*eq.ay+3*u*u*a*eq.by+3*u*a*a*eq.cy+a*a*a*eq.ey}}return"ghost"===ez?eN(eR.clock):null})(u),d=eA.x,m=eA.y,p=0;if(v&&eA.on){let t="pointer"===ez?1:1-Math.exp(-(26*e));eA.x+=(v.x-eA.x)*t,eA.y+=(v.y-eA.y)*t;let a=1-Math.exp(-e/.05);eA.vx+=((eA.x-d)/e-eA.vx)*a,eA.vy+=((eA.y-m)/e-eA.vy)*a,p=D((Math.hypot(eA.vx,eA.vy)-10)/60,0,1)}!ej&&eV.length>0&&(ej=eV.shift()??null);let h=ej;ej&&(ej.age+=e,ej.age>=.22&&(ej=null));let x=D(z(f.life,2.4),.2,12);if((p>0||h)&&(eF=eP=Math.max(eP,u+1.15*x+.3)),u>=eP&&u>=eF)return!1;let y=40*z(f.wind,0),g=z(f.windAngle,-90)*Math.PI/180;N.set(Math.cos(g)*y,-Math.sin(g)*y),X.value=u%4096,((e,a,u,l,i)=>{let r=t.current,n=D(z(r.force,1),0,3),o=.3*Math.min(n,2600/Math.max(Math.hypot(eA.vx,eA.vy),1)*n),s=Q.uniforms;if(s.uVelocity.value=I.read.texture,s.uSegment.value.set(a,eg-u,eA.x,eg-eA.y),s.uTarget.value.set(eA.vx*o,-eA.vy*o),s.uRadius.value=Math.max(4,z(r.radius,80)),s.uMix.value=n>0?l*(1-Math.exp(-(28*e))):0,s.uWake.value=l,i){let t=1500*D(z(r.puffForce,1),0,4),a=2*Math.min(1,e/.22)*Math.max(0,1-i.age/.22);s.uPuff.value.set(i.x,eg-i.y,80*D(z(r.puffSize,1),.2,4),a),s.uPuffVelocity.value.set(Math.cos(i.angle)*t,-Math.sin(i.angle)*t)}else s.uPuff.value.set(0,0,1,0);eX(Q,I.write),A(I),$.uniforms.uVelocity.value=I.read.texture,eX($,O),K.uniforms.uVelocity.value=I.read.texture,K.uniforms.uStrength.value=30*D(z(r.swirl,.5),0,4),K.uniforms.uTurbulence.value=260*D(z(r.turbulence,.6),0,5),eX(K,I.write),A(I),Z.uniforms.uVelocity.value=I.read.texture,eX(Z,L),J.uniforms.uSource.value=R.read.texture,eX(J,R.write),A(R);let c=r.quality<.75?14:22;for(let e=0;e<c;e++)ee.uniforms.uPressure.value=R.read.texture,eX(ee,R.write),A(R);et.uniforms.uPressure.value=R.read.texture,et.uniforms.uVelocity.value=I.read.texture,eX(et,I.write),A(I);let f=D(z(r.momentum,1),.1,5);ea.uniforms.uVelocity.value=I.read.texture,ea.uniforms.uDissipation.value=1.3/f,ea.uniforms.uSettle.value=.7/f,eX(ea,I.write),A(I)})(e,d,m,p,h),l=p,r=D(z((i=t.current).life,2.4),.2,12),(n=eu.uniforms).uDye.value=q.read.texture,n.uVelocity.value=I.read.texture,n.uDecay.value=1/r,n.uCool.value=2.5/r,n.uSegment.value.set(d,eg-m,eA.x,eg-eA.y),n.uSpread.value=Math.max(2,z(i.spread,64)),(o=Math.hypot(eA.vx,eA.vy))>1&&n.uDir.value.set(eA.vx/o,-eA.vy/o),eM=(eM+Math.hypot(eA.x-d,eA.y-m))%2e4,n.uArc.value=eM,n.uGrain.value=D(z(i.grain,.7),0,1),n.uTone.value=.5-.5*Math.cos(eM/Math.max(40,z(i.cycle,900))*Math.PI),n.uPaint.value=l,h?n.uPuff.value.set(h.x,eg-h.y,44*D(z(i.puffSize,1),.2,4),Math.max(0,1-h.age/.22)):n.uPuff.value.set(0,0,1,0),eX(eu,q.write),A(q),s=t.current,(c=el.uniforms).uState.value=_.read.texture,c.uVelocity.value=I.read.texture,c.uDye.value=q.read.texture,c.uDrift.value=6*D(z(s.drift,1),0,6),c.uLifespan.value=2.1,eX(el,_.write),A(_);let b=t.current;a.setRenderTarget(null),a.clear();let w=ei.uniforms;w.uState.value=_.read.texture,w.uDye.value=q.read.texture,w.uSize.value=D(z(b.dotSize,2.4),.5,12)*eb,w.uVariance.value=D(z(b.sizeVariance,.4),0,1.6),w.uSoftness.value=D(z(b.softness,.16),.01,1),w.uHighlight.value=D(z(b.highlight,.3),0,1),w.uInk.value=+("ink"===b.blend),w.uOpacity.value=D(z(b.opacity,1),0,1),w.uRound.value=+("square"!==b.shape);let S=D(z(b.echo,.45),0,1);if(S>0){let e=z(b.echoOffset,1.5);w.uOffset.value.set(-(2*e)/ey,-(2*e)/eg),w.uEcho.value=S,a.render(eo,M)}return w.uOffset.value.set(0,0),w.uEcho.value=0,a.render(eo,M),eU=!0,!0})(r,n);if("script"===ez&&n-eq.t0>=eq.duration&&(eq.on=!1,eG(eA.x,eA.y,eY(eA.x,eA.y))),!s&&eU&&(e_(),eH()),"none"!==ez||s||eV.length>0||ej)return void eQ();em=0;let c=eE.leftAt+Math.max(0,z(l.idleDelay,1.5));l.autoplay&&!l.reduced&&!l.disabled&&ex&&eE.seen&&!eE.inside&&c>n&&(ed&&i.clearTimeout(ed),ed=i.setTimeout(()=>{ed=0,eQ()},(c-n)*1e3+20))}let eK=(t,a)=>{let u=e.getBoundingClientRect();eE.x=t-u.left,eE.y=a-u.top},eZ=e=>{"touch"!==e.pointerType&&eL()&&(eK(e.clientX,e.clientY),eE.inside=!0,eE.seen=!0,eQ())},eJ=e=>{"touch"!==e.pointerType&&eE.inside&&(eE.inside=!1,eE.leftAt=performance.now()/1e3,eQ())},e0=e=>{let a=t.current;if(a.puff&&!a.disabled&&!a.reduced&&a.interactive){if("touch"===e.pointerType){eI.x=e.clientX,eI.y=e.clientY,eI.at=performance.now()/1e3,eI.live=!0;return}eL()&&0===e.button&&(eK(e.clientX,e.clientY),eG(eE.x,eE.y,eY(eE.x,eE.y)),eQ())}},e1=t=>{if("touch"!==t.pointerType||!eI.live||(eI.live=!1,Math.hypot(t.clientX-eI.x,t.clientY-eI.y)>10||performance.now()/1e3-eI.at>.35))return;let a=e.getBoundingClientRect(),u=t.clientX-a.left,l=t.clientY-a.top;eG(u,l,l<.22*eg?Math.PI/2:-Math.PI/2),eQ()},e2=()=>{eE.inside&&(eE.inside=!1,eE.leftAt=performance.now()/1e3),eI.live=!1,eQ()};e.addEventListener("pointermove",eZ,{passive:!0}),e.addEventListener("pointerover",eZ,{passive:!0}),e.addEventListener("pointerleave",eJ),e.addEventListener("pointercancel",eJ),e.addEventListener("pointerdown",e0,{passive:!0}),i.addEventListener("pointerup",e1,{passive:!0}),i.addEventListener("blur",e2),c.addEventListener("change",e2);let e3=new ResizeObserver(()=>{eW(),eQ()});e3.observe(e);let e5=new IntersectionObserver(([e])=>{if(eh=e.isIntersecting){if(em=0,eW(),!ex){var a;ex=!0;let e=t.current;!e.intro||e.autoplay||e.reduced||e.disabled||(a=performance.now()/1e3,eq.on=!0,eq.t0=a,eq.duration=1.9,eq.ax=-40,eq.ay=.7*eg,eq.bx=.3*ey,eq.by=.08*eg,eq.cx=.56*ey,eq.cy=.96*eg,eq.ex=.8*ey,eq.ey=.4*eg)}eQ()}else ev&&(i.cancelAnimationFrame(ev),ev=0)});return e5.observe(e),eW(),eB(),{sync:()=>{eB(),eW(),eQ()},puff:(e,t,a)=>{let u="number"==typeof e&&Number.isFinite(e)?e:eA.on?eA.x:ey/2,l="number"==typeof t&&Number.isFinite(t)?t:eA.on?eA.y:eg/2,i="number"==typeof a&&Number.isFinite(a)?a*Math.PI/180:eY(u,l);eG(u,l,i),eQ()},clear:()=>{eV.length=0,ej=null,eP=0,eF=0,e_(),eH(),eQ()},destroy:()=>{for(let t of(ep=!0,ev&&i.cancelAnimationFrame(ev),ed&&i.clearTimeout(ed),e3.disconnect(),e5.disconnect(),e.removeEventListener("pointermove",eZ),e.removeEventListener("pointerover",eZ),e.removeEventListener("pointerleave",eJ),e.removeEventListener("pointercancel",eJ),e.removeEventListener("pointerdown",e0),i.removeEventListener("pointerup",e1),i.removeEventListener("blur",e2),c.removeEventListener("change",e2),[Q,$,K,Z,J,ee,et,ea,eu,el,ei]))t.dispose();for(let e of[I.read,I.write,R.read,R.write,q.read,q.write,L,O,_.read,_.write])e.dispose();F.dispose(),er.dispose(),a.dispose(),a.forceContextLoss(),r.remove()}}})(e,ef);return es.current=t,()=>{t?.destroy(),es.current=null}},[]),(0,l.useImperativeHandle)(en,()=>({puff:(e,t,a)=>es.current?.puff(e,t,a),clear:()=>es.current?.clear()}),[]),(0,u.jsx)("div",{ref:eo,className:(0,c.cn)("relative isolate h-full min-h-[240px] w-full overflow-hidden",el),style:ei,children:er&&(0,u.jsx)("div",{className:"relative z-10 h-full w-full",children:er})})});V.displayName="StardustCursor";let j={dark:["#FF9FFC","#8B5CF6"],light:["#5227FF","#C33AB8"],shape:"round",dotSize:2.4,sizeVariance:.4,density:1.4,spread:64,grain:.7,cycle:900,life:2.4,softness:.16,highlight:.3,echo:.45,echoOffset:1.5,force:1,radius:80,swirl:.5,turbulence:.6,momentum:1,drift:1,puffSize:1,puffForce:1},E={stardust:j,graphite:{...j,dark:["#F5F5F5","#8A8A8A"],light:["#0A0A0A","#6B6B6B"],dotSize:2.2,sizeVariance:.3,grain:.85,cycle:1400,highlight:.2,echo:.3},ember:{...j,dark:["#FF7A27","#FF4D8D"],light:["#E2560E","#C2264E"],spread:72,grain:.5,cycle:700,life:2.8,swirl:.8,turbulence:1.1,momentum:1.3,drift:1.6},pixel:{...j,dark:["#B19EEF","#5227FF"],light:["#5227FF","#2A1A8F"],shape:"square",dotSize:2.6,sizeVariance:0,density:1.1,grain:.9,softness:.04,echo:.6,echoOffset:2,swirl:.35,turbulence:.3},nebula:{...j,dark:["#B19EEF","#5227FF"],light:["#7C3AED","#5227FF"],dotSize:1.8,sizeVariance:.6,density:2.2,spread:96,grain:.3,cycle:1200,life:3.4,softness:.4,highlight:.4,force:.8,radius:120,swirl:.7,turbulence:.9,momentum:1.4,puffSize:1.4}},A=[{label:"Stardust",value:"stardust"},{label:"Graphite",value:"graphite"},{label:"Ember",value:"ember"},{label:"Pixel",value:"pixel"},{label:"Nebula",value:"nebula"}],I=[{label:"Auto",value:"auto"},{label:"Light",value:"light"},{label:"Ink",value:"ink"}],R=[{label:"Round",value:"round"},{label:"Square",value:"square"}],q=[{name:"colors",type:"[string, string]",default:'["#FF9FFC", "#8B5CF6"]',description:"The two colours the dust drifts between along each stroke, blended in OKLab. Accepts any CSS colour, including currentColor."},{name:"blend",type:'"light" | "ink"',default:'"light"',description:"light draws bright dust for dark pages. ink draws dark dust with normal transparency for light pages."},{name:"shape",type:'"round" | "square"',default:'"round"',description:"Shape of each grain of dust."},{name:"dotSize",type:"number",default:"2.4",description:"Diameter of a grain in pixels where the cloud is dense. Thin parts of the cloud use smaller grains."},{name:"sizeVariance",type:"number",default:"0.4",description:"Random variation in grain size, from 0 (all the same) to 1."},{name:"density",type:"number",default:"1.4",description:"How tightly the grains are packed. Higher values use more, closer grains."},{name:"spread",type:"number",default:"64",description:"Radius of a fresh stroke in pixels. The cloud billows wider as it flows."},{name:"grain",type:"number",default:"0.7",description:"Streaks brushed into fresh dust along the stroke, from 0 (an even cloud) to 1."},{name:"cycle",type:"number",default:"900",description:"Pixels of pointer travel for the dust to drift from the first colour to the second. It then drifts back."},{name:"life",type:"number",default:"2.4",description:"Seconds until a stroke has dissolved completely."},{name:"softness",type:"number",default:"0.16",description:"How gradually each grain fades as the dust thins out, from 0.01 (grains switch off) to 1 (a slow, soft dissolve)."},{name:"highlight",type:"number",default:"0.3",description:"How much fresh dust is lifted toward white before it settles. In ink mode it deepens toward ink instead."},{name:"echo",type:"number",default:"0.45",description:"Strength of the offset shadow behind each grain, which gives the cloud depth. 0 turns it off."},{name:"echoOffset",type:"number",default:"1.5",description:"Offset of that shadow in pixels."},{name:"force",type:"number",default:"1",description:"How hard the pointer pushes the air. Higher values fling the dust further along the stroke."},{name:"radius",type:"number",default:"80",description:"Radius in pixels of the air the pointer moves."},{name:"swirl",type:"number",default:"0.5",description:"How strongly the wake curls into eddies."},{name:"turbulence",type:"number",default:"0.6",description:"Slow, broad turbulence in the wake that makes the dust billow."},{name:"momentum",type:"number",default:"1",description:"How long the air keeps moving after the pointer stops."},{name:"drift",type:"number",default:"1",description:"A slow wander of the grains inside the cloud."},{name:"wind",type:"number",default:"0",description:"A steady breeze that carries the dust away, in steps of 40px per second."},{name:"windAngle",type:"number",default:"-90",description:"Direction of the breeze in degrees. 0 blows to the right, -90 blows up."},{name:"opacity",type:"number",default:"1",description:"Overall opacity of the dust, from 0 to 1."},{name:"puff",type:"boolean",default:"true",description:"Click or tap to fire a puff of dust that rolls up into a mushroom cloud. It follows the stroke direction and turns inward near an edge."},{name:"puffSize",type:"number",default:"1",description:"Size of the puff."},{name:"puffForce",type:"number",default:"1",description:"How far and fast the puff travels."},{name:"maxParticles",type:"number",default:"160000",description:"Upper limit on the number of grains. On very large screens the grains spread out to stay under it."},{name:"autoplay",type:"boolean",default:"false",description:"Sweep strokes across the component on its own while the pointer is away, with the odd puff. The pointer takes over the moment it enters."},{name:"autoplaySpeed",type:"number",default:"1",description:"Speed multiplier for autoplay."},{name:"idleDelay",type:"number",default:"1.5",description:"Seconds after the pointer leaves before autoplay resumes."},{name:"intro",type:"boolean",default:"true",description:"Sweep one stroke across, ending in a puff, the first time the component scrolls into view. With autoplay on, strokes flow in from the edge instead."},{name:"interactive",type:"boolean",default:"true",description:"Follow the visitor's pointer. Turn it off to show only autoplay and scripted puffs."},{name:"disabled",type:"boolean",default:"false",description:"Stop painting and ignore input. Dust already on screen dissolves."},{name:"quality",type:"number",default:"1",description:"Render scale from 0.5 to 1. Lower values reduce the canvas and fluid resolution for slower devices."},{name:"ref",type:"{ puff, clear }",default:"—",description:"puff(x?, y?, angle?) fires a puff at a point in pixels, with an optional angle in degrees (it defaults to the stroke direction). clear() removes all dust."},{name:"children",type:"ReactNode",default:"—",description:"Content the dust drifts over."},{name:"className",type:"string",default:"—",description:"Classes for the root element. It fills its parent and is at least 240px tall."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."}],L=()=>{let[e,t]=(0,n.I)(),a="dark"===(0,r.Y)(),[o,s]=(0,l.useState)("stardust"),[c,f]=(0,l.useState)(j),v=e=>t=>f(a=>({...a,[e]:t})),[d,m]=(0,l.useState)(null),p=d??(a?c.dark:c.light),[h,x]=(0,l.useState)("auto"),y="auto"===h?a?"light":"ink":h,[g,b]=(0,l.useState)(0),[w,S]=(0,l.useState)(-90),[C,D]=(0,l.useState)(1),[z,k]=(0,l.useState)(!0),[T,M]=(0,l.useState)(!0),[P,F]=(0,l.useState)(1),[U,L]=(0,l.useState)(1.5),[O,_]=(0,l.useState)(!0),[H,W]=(0,l.useState)(!0),[B,N]=(0,l.useState)(!1),[Y,G]=(0,l.useState)(1),X=e=>t=>{let a=[p[0],p[1]];a[e]=t,m(a)};return(0,u.jsxs)("div",{children:[(0,u.jsx)(i.Bg,{}),(0,u.jsxs)(i.VX,{children:[(0,u.jsxs)(i.Ec,{children:[(0,u.jsx)(i.Ch,{onRefresh:t,minHeight:560,enableResponsive:!0,children:(0,u.jsx)("div",{className:`relative h-full w-full ${a?"bg-[#0A0A0A]":"bg-white"}`,children:(0,u.jsx)(V,{colors:p,blend:y,shape:c.shape,dotSize:c.dotSize,sizeVariance:c.sizeVariance,density:c.density,spread:c.spread,grain:c.grain,cycle:c.cycle,life:c.life,softness:c.softness,highlight:c.highlight,echo:c.echo,echoOffset:c.echoOffset,force:c.force,radius:c.radius,swirl:c.swirl,turbulence:c.turbulence,momentum:c.momentum,drift:c.drift,wind:g,windAngle:w,opacity:C,puff:z,puffSize:c.puffSize,puffForce:c.puffForce,autoplay:T,autoplaySpeed:P,idleDelay:U,intro:O,interactive:H,disabled:B,quality:Y},e)})}),(0,u.jsxs)(i.IH,{children:[(0,u.jsx)(i.bg,{title:"Preset",value:o,options:A,onChange:e=>{s(e),f(E[e]??j),m(null)}}),(0,u.jsx)(i.W7,{title:"First Colour",value:p[0],onChange:X(0)}),(0,u.jsx)(i.W7,{title:"Second Colour",value:p[1],onChange:X(1)}),(0,u.jsx)(i.bg,{title:"Blend",value:h,options:I,onChange:x}),(0,u.jsx)(i.bg,{title:"Shape",value:c.shape,options:R,onChange:e=>v("shape")(e)}),(0,u.jsx)(i.yt,{title:"Dot Size",min:.8,max:5,step:.1,value:c.dotSize,valueUnit:"px",onChange:v("dotSize")}),(0,u.jsx)(i.yt,{title:"Size Variance",min:0,max:1,step:.05,value:c.sizeVariance,onChange:v("sizeVariance")}),(0,u.jsx)(i.yt,{title:"Density",min:.4,max:3,step:.05,value:c.density,onChange:v("density")}),(0,u.jsx)(i.yt,{title:"Spread",min:16,max:160,step:1,value:c.spread,valueUnit:"px",onChange:v("spread")}),(0,u.jsx)(i.yt,{title:"Grain",min:0,max:1,step:.05,value:c.grain,onChange:v("grain")}),(0,u.jsx)(i.yt,{title:"Colour Cycle",min:200,max:3e3,step:50,value:c.cycle,valueUnit:"px",onChange:v("cycle")}),(0,u.jsx)(i.yt,{title:"Life",min:.6,max:6,step:.1,value:c.life,valueUnit:"s",onChange:v("life")}),(0,u.jsx)(i.yt,{title:"Softness",min:.01,max:1,step:.01,value:c.softness,onChange:v("softness")}),(0,u.jsx)(i.yt,{title:"Highlight",min:0,max:1,step:.05,value:c.highlight,onChange:v("highlight")}),(0,u.jsx)(i.yt,{title:"Echo",min:0,max:1,step:.05,value:c.echo,onChange:v("echo")}),(0,u.jsx)(i.yt,{title:"Echo Offset",min:0,max:6,step:.25,value:c.echoOffset,valueUnit:"px",onChange:v("echoOffset")}),(0,u.jsx)(i.yt,{title:"Force",min:0,max:3,step:.05,value:c.force,onChange:v("force")}),(0,u.jsx)(i.yt,{title:"Radius",min:20,max:240,step:5,value:c.radius,valueUnit:"px",onChange:v("radius")}),(0,u.jsx)(i.yt,{title:"Swirl",min:0,max:2,step:.05,value:c.swirl,onChange:v("swirl")}),(0,u.jsx)(i.yt,{title:"Turbulence",min:0,max:3,step:.05,value:c.turbulence,onChange:v("turbulence")}),(0,u.jsx)(i.yt,{title:"Momentum",min:.2,max:3,step:.05,value:c.momentum,onChange:v("momentum")}),(0,u.jsx)(i.yt,{title:"Drift",min:0,max:4,step:.1,value:c.drift,onChange:v("drift")}),(0,u.jsx)(i.yt,{title:"Wind",min:-4,max:4,step:.1,value:g,onChange:b}),(0,u.jsx)(i.yt,{title:"Wind Angle",min:-180,max:180,step:5,value:w,valueUnit:"\xb0",onChange:S}),(0,u.jsx)(i.yt,{title:"Opacity",min:0,max:1,step:.05,value:C,onChange:D}),(0,u.jsx)(i.yt,{title:"Puff Size",min:.3,max:3,step:.05,value:c.puffSize,onChange:v("puffSize")}),(0,u.jsx)(i.yt,{title:"Puff Force",min:0,max:3,step:.05,value:c.puffForce,onChange:v("puffForce")}),(0,u.jsx)(i.yt,{title:"Autoplay Speed",min:.2,max:3,step:.05,value:P,onChange:F}),(0,u.jsx)(i.yt,{title:"Idle Delay",min:0,max:6,step:.25,value:U,valueUnit:"s",onChange:L}),(0,u.jsx)(i.yt,{title:"Quality",min:.5,max:1,step:.05,value:Y,onChange:G}),(0,u.jsx)(i.tl,{title:"Puff",checked:z,onChange:k}),(0,u.jsx)(i.tl,{title:"Autoplay",checked:T,onChange:M}),(0,u.jsx)(i.tl,{title:"Intro",checked:O,onChange:_}),(0,u.jsx)(i.tl,{title:"Interactive",checked:H,onChange:W}),(0,u.jsx)(i.tl,{title:"Disabled",checked:B,onChange:N})]}),(0,u.jsx)(i.Ub,{data:q})]}),(0,u.jsx)(i.lT,{children:(0,u.jsx)(i.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>o.CodeExample,lT:()=>u.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>f.CopyButton,IH:()=>i.Customize,gI:()=>m,Dn:()=>h,pi:()=>p,W7:()=>r.PreviewColor,Ch:()=>l.PreviewContainer,UD:()=>r.PreviewInput,bg:()=>r.PreviewSelect,yt:()=>r.PreviewSlider,tl:()=>r.PreviewSwitch,Ec:()=>u.PreviewTab,Ub:()=>n.PropTable,VX:()=>u.TabsLayout,bs:()=>d});var u=a(55019);a(27382);var l=a(10236),i=a(69485),r=a(48543),n=a(87552);a(39260);var o=a(52407),s=a(79901);a(24496);var c=a(95155);a(66729);var f=a(28592),v=a(90650);let d="rounded-lg border bg-background";function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,v.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,v.cn)(d,e),...a,children:t})}function h({title:e,description:t,className:a,children:u}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:u})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>n});var u=a(12115),l=a(30701);let i=()=>()=>{},r=()=>"light";function n(){let{resolvedTheme:e}=(0,l.D)();return(0,u.useSyncExternalStore)(i,()=>"dark"===e?"dark":"light",r)}},90761:(e,t,a)=>{a.d(t,{I:()=>l});var u=a(12115);function l(){let[e,t]=(0,u.useState)(0),a=(0,u.useCallback)(()=>{t(e=>e+1)},[]);return(0,u.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);