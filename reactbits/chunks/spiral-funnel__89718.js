"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[89718],{56388:(e,t,a)=>{a.d(t,{Gv:()=>u.CodeExample,lT:()=>l.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>d.CopyButton,IH:()=>r.Customize,gI:()=>h,Dn:()=>p,pi:()=>v,W7:()=>n.PreviewColor,Ch:()=>o.PreviewContainer,UD:()=>n.PreviewInput,bg:()=>n.PreviewSelect,yt:()=>n.PreviewSlider,tl:()=>n.PreviewSwitch,Ec:()=>l.PreviewTab,Ub:()=>i.PropTable,VX:()=>l.TabsLayout,bs:()=>f});var l=a(55019);a(27382);var o=a(10236),r=a(69485),n=a(48543),i=a(87552);a(39260);var u=a(52407),s=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),m=a(90650);let f="rounded-lg border bg-background";function h({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,m.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function v({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,m.cn)(f,e),...a,children:t})}function p({title:e,description:t,className:a,children:l}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:l})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>i});var l=a(12115),o=a(30701);let r=()=>()=>{},n=()=>"light";function i(){let{resolvedTheme:e}=(0,o.D)();return(0,l.useSyncExternalStore)(r,()=>"dark"===e?"dark":"light",n)}},89718:(e,t,a)=>{a.r(t),a.d(t,{default:()=>W});var l=a(95155),o=a(12115),r=a(56388),n=a(86049),i=a(90761),u=a(2253),s=a(12246),c=a(90650);let d=2*Math.PI,m=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},f=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,h=(e,t,a)=>Math.min(a,Math.max(t,e)),v=(e,t,a)=>{let l=h((a-e)/(t-e),0,1);return l*l*(3-2*l)},p=(e,t)=>(e%t+t)%t,x=null,g=(e,t)=>{if(x||(x=document.createElement("canvas").getContext("2d")),!x)return t;x.fillStyle="#010203",x.fillStyle=e;let a=String(x.fillStyle);if("#010203"===a&&"#010203"!==e.trim().toLowerCase())return t;if(a.startsWith("#")){let e=a.slice(1);return[parseInt(e.slice(0,2),16)/255,parseInt(e.slice(2,4),16)/255,parseInt(e.slice(4,6),16)/255]}let l=a.match(/[\d.]+/g);return!l||l.length<3?t:[Number(l[0])/255,Number(l[1])/255,Number(l[2])/255]},w=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),b=([e,t,a])=>{let l=w(e),o=w(t),r=w(a),n=Math.cbrt(.4122214708*l+.5363325363*o+.0514459929*r),i=Math.cbrt(.2119034982*l+.6806995451*o+.1073969566*r),u=Math.cbrt(.0883024619*l+.2817188376*o+.6299787005*r);return[.2104542553*n+.793617785*i-.0040720468*u,1.9779984951*n-2.428592205*i+.4505937099*u,.0259040371*n+.7827717662*i-.808675766*u]},y=`
uniform vec2 uResolution;
uniform vec2 uPrincipal;
uniform float uFocal;
uniform vec3 uCamPos;
uniform vec3 uCamUp;
uniform vec3 uCamFwd;
uniform float uSpinPhase;
uniform float uOuter;
uniform float uWaist;
uniform float uTop;
uniform vec3 uLabA;
uniform vec3 uLabB;
uniform vec3 uHover;
uniform vec4 uSwells[6];
uniform float uWaveTime;
uniform float uActive;

vec3 labToLinear(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return max(vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ), 0.0);
}

vec3 toView(vec3 p) {
  vec3 d = p - uCamPos;
  return vec3(d.x, dot(d, uCamUp), dot(d, uCamFwd));
}

vec2 toScreen(vec3 v) {
  return uPrincipal + uFocal * v.xy / max(v.z, 0.05);
}

vec3 disturb(vec3 p, out float agitation, out float scatter) {
  agitation = 0.0;
  scatter = 0.0;
  if (uActive < 0.5) return p;
  float h = p.y;
  float wall = smoothstep(0.02, 0.16, h);
  float g = (h - uHover.x) / uHover.z;
  float swell = uHover.y * exp(-g * g);
  float drift = swell;
  for (int k = 0; k < 6; k++) {
    vec4 pulse = uSwells[k];
    if (pulse.z <= 0.0) continue;
    float age = uWaveTime - pulse.y;
    if (age < 0.0 || age > 7.0) continue;
    float q = (h - pulse.x - 0.3 * age) / 0.2;
    swell += pulse.z * smoothstep(0.0, 0.45, age) * exp(-age / 1.8) * exp(-q * q);
    drift += pulse.z * smoothstep(0.0, 0.6, age) * exp(-age / 2.4) * exp(-q * q * 0.6);
  }
  agitation = swell * wall;
  scatter = drift * wall;
  return vec3(p.x * (1.0 + agitation), p.y, p.z * (1.0 + agitation));
}

float envelope(float r, float h) {
  float ground = 1.0 - smoothstep(0.0, 0.04, h);
  float reachOut = clamp((r - uWaist) / max(uOuter - uWaist, 1e-3), 0.0, 1.0);
  float rim = pow(1.0 - reachOut, 2.2) * 0.75;
  float crown = 1.0 - smoothstep(uTop * 0.72, uTop, h);
  return mix(1.0, rim, ground) * crown;
}
`,S=`
in vec4 aStrand;
in vec2 aSample;
uniform sampler2D uCurve;
uniform sampler2D uLight;
uniform float uPixelRatio;
uniform float uHead;
uniform float uLineWidth;
uniform float uSheath;
uniform float uDefocus;
uniform float uLimb;
uniform float uRim;
uniform float uCorner;
uniform float uBack;
uniform float uEnergy;
uniform float uInk;
${y}
out float vDist;
out float vCore;
out float vHalo;
out vec3 vColor;
out float vGain;

vec4 curveAt(float j) {
  return texelFetch(uCurve, ivec2(int(j), 0), 0);
}

vec3 place(vec4 c) {
  float r = c.x * (1.0 + aStrand.y);
  float th = aStrand.x + uSpinPhase + c.z * (1.0 + aStrand.z);
  return vec3(cos(th) * r, c.y, sin(th) * r);
}

vec4 lightAt(float tau, float row) {
  float k = min(uHead - tau * 240.0, floor(uHead));
  float k0 = floor(k);
  float f = k - k0;
  int y = int(row + 0.5);
  vec4 a = texelFetch(uLight, ivec2(int(mod(k0, 248.0)), y), 0);
  vec4 b = texelFetch(uLight, ivec2(int(mod(k0 + 1.0, 248.0)), y), 0);
  return mix(a, b, f);
}

void main() {
  float j = aSample.x;
  vec4 c1 = curveAt(j);
  float agitation;
  float scatter;
  float spare;
  vec3 w1 = disturb(place(c1), agitation, scatter);
  vec3 v1 = toView(w1);
  vec2 s0 = toScreen(toView(disturb(place(curveAt(max(j - 1.0, 0.0))), spare, spare)));
  vec2 s1 = toScreen(v1);
  vec2 s2 = toScreen(toView(disturb(place(curveAt(min(j + 1.0, 640.0))), spare, spare)));
  vec2 tangent = normalize(s2 - s0 + vec2(1e-5, 0.0));
  vec2 normal = vec2(-tangent.y, tangent.x);
  float radial = length(w1.xz);
  float facing = clamp(0.5 + 0.5 * w1.z / max(radial, 1e-3), 0.0, 1.0);
  float blur = 1.0 + uDefocus * 3.0 * (1.0 - facing) * (1.0 - facing);
  float core = uLineWidth * uPixelRatio * mix(0.5, 1.0, facing) * 0.5 * blur;
  float halo = uSheath * 4.0 * uPixelRatio * mix(0.6, 1.0, facing) * sqrt(blur);
  float reach = max(core * 2.4, halo * 2.2) + 1.5;
  vec2 position2 = s1 + normal * aSample.y * reach;
  float sideways = 1.0 - abs(w1.z) / max(radial, 1e-3);
  float wall = smoothstep(0.02, 0.1, c1.y);
  float limb = 1.0 + uLimb * wall * pow(sideways, 3.0);
  float collar = (c1.y - uCorner * 0.45) / (uCorner * 0.75);
  limb += uRim * exp(-collar * collar);
  vDist = aSample.y * reach;
  vCore = core;
  vHalo = halo;

  vec4 light = lightAt(c1.w, aStrand.w);
  float amount = max(light.x, 0.0);
  float hue = clamp(light.y / max(amount, 1e-3), 0.0, 1.0);
  float heat = clamp(light.z / max(amount, 1e-3), 0.0, 1.0);
  float rise = smoothstep(0.0, uTop * 0.85, c1.y);
  float tone = clamp(rise * 0.85 + (hue - 0.5) * 0.4 + 0.08, 0.0, 1.0);
  vec3 base = labToLinear(mix(uLabA, uLabB, smoothstep(0.0, 1.0, tone)));
  vec3 glowTint = mix(base, vec3(1.0, 0.96, 1.0), heat * 0.6);
  vec3 inkTint = mix(base, labToLinear(vec3(uLabA.x * 0.6, uLabA.yz * 1.15)), heat * 0.6);
  vColor = mix(glowTint, inkTint, uInk);
  float strain = 1.0 + 1.4 * agitation;
  vGain = (0.12 + amount) * envelope(c1.x, c1.y) * mix(uBack, 1.0, facing) * limb * strain * (1.0 + uEnergy * 0.15) / blur;
  gl_Position = vec4(position2 / uResolution * 2.0 - 1.0, 0.0, 1.0);
}
`,C=`
precision highp float;
uniform float uCore;
uniform float uSheathGain;
in float vDist;
in float vCore;
in float vHalo;
in vec3 vColor;
in float vGain;
out vec4 fragColor;

void main() {
  float sigma = max(vCore, 0.55);
  float d = vDist / sigma;
  float core = exp(-d * d) * min(vCore / 0.55, 1.0);
  float h = vDist / max(vHalo, 0.5);
  float sheath = exp(-h * h) * uSheathGain;
  float energy = (core + sheath) * vGain * uCore;
  fragColor = vec4(vColor * energy, energy);
}
`,F=`
in vec4 aDust;
uniform sampler2D uTable;
uniform float uPixelRatio;
uniform float uFlow;
uniform float uTime;
uniform float uSize;
uniform float uBack;
uniform float uEnergy;
uniform float uInk;
${y}
out vec3 vColor;
out float vGain;

void main() {
  float tau = fract(aDust.y + uFlow * (0.25 + 0.2 * aDust.z));
  float x = tau * 1023.0;
  float i0 = floor(x);
  float f = x - i0;
  vec4 a = texelFetch(uTable, ivec2(int(i0), 0), 0);
  vec4 b = texelFetch(uTable, ivec2(int(min(i0 + 1.0, 1023.0)), 0), 0);
  vec3 c = mix(a.xyz, b.xyz, f);
  float lift = (fract(aDust.w * 13.71) - 0.5) * 0.1;
  float r = c.x * (1.0 + lift);
  float th = aDust.x + uSpinPhase + c.z;
  float agitation;
  float scatter;
  vec3 w = disturb(vec3(cos(th) * r, c.y + abs(lift) * 0.05, sin(th) * r), agitation, scatter);
  float drift = scatter * (0.6 + 1.6 * fract(aDust.w * 29.7));
  w.xz *= 1.0 + drift * 1.4;
  w.y += drift * 0.08 * (fract(aDust.w * 5.3) - 0.35);
  vec3 v = toView(w);
  vec2 s = toScreen(v);
  float facing = clamp(0.5 + 0.5 * w.z / max(length(w.xz), 1e-3), 0.0, 1.0);
  float twinkle = 0.3 + 0.7 * pow(0.5 + 0.5 * sin(uTime * (1.2 + 2.4 * aDust.z) + aDust.w * 71.0), 3.0);
  float fade = envelope(c.x, c.y) * smoothstep(0.0, 0.03, tau) * (1.0 - smoothstep(0.96, 1.0, tau));
  float rise = smoothstep(0.0, uTop * 0.85, c.y);
  vec3 base = labToLinear(mix(uLabA, uLabB, rise));
  vColor = mix(mix(base, vec3(1.0), 0.55), base, uInk);
  vGain = twinkle * fade * mix(uBack, 1.0, facing) * (1.0 + uEnergy * 0.2) * (1.0 + drift * 3.0);
  gl_PointSize = max(uSize * uPixelRatio * mix(0.7, 1.3, fract(aDust.w * 7.3)) * 3.0, 1.0);
  gl_Position = vec4(s / uResolution * 2.0 - 1.0, 0.0, 1.0);
}
`,k=`
precision highp float;
uniform float uDustGain;
in vec3 vColor;
in float vGain;
out vec4 fragColor;

void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float e = exp(-dot(q, q) * 4.5) * vGain * uDustGain;
  fragColor = vec4(vColor * e, e);
}
`,M=`
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,A=`
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 a = texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  vec4 b = texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  vec4 c = texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  vec4 d = texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = (a + b + c + d) * 0.125 + texture(uSource, vUv) * 0.5;
}
`,T=`
precision highp float;
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 sum = texture(uSource, vUv) * 4.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, -1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, 1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = texture(uBase, vUv) + sum / 16.0;
}
`,j=`
precision highp float;
uniform sampler2D uLines;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform float uGlow;
uniform float uExposure;
uniform float uMode;
uniform float uGrain;
in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void main() {
  vec4 lines = texture(uLines, vUv);
  vec4 bloom = texture(uBloom, vUv);
  vec3 color;
  if (uMode < 0.5) {
    vec3 light = (lines.rgb + bloom.rgb * uGlow) * uExposure;
    vec3 exposed = 1.0 - exp(-light);
    float peak = max(exposed.r, max(exposed.g, exposed.b));
    exposed = mix(exposed, vec3(peak), smoothstep(0.75, 1.0, peak) * 0.35);
    color = uBackground + (1.0 - uBackground) * exposed;
  } else {
    float energy = lines.a + bloom.a * uGlow * 0.2;
    vec3 hue = (lines.rgb + bloom.rgb * uGlow * 0.2) / max(energy, 1e-4);
    float cover = clamp(1.0 - exp(-energy * uExposure * 1.4), 0.0, 0.94);
    color = mix(uBackground, clamp(hue * 0.8, 0.0, 1.0), cover);
  }
  float grain = hash(gl_FragCoord.xy + uGrain * 311.0) - 0.5;
  fragColor = vec4(encode(color) + grain * (1.2 / 255.0), 1.0);
}
`,L=e=>{let t=e;return()=>(t=16807*t%0x7fffffff)/0x7fffffff},B=(0,o.forwardRef)(function({colors:e=["#8B5CF6","#FF9FFC"],backgroundColor:t="#0A0A0A",mode:a="auto",strands:r=56,lineWidth:n=1,sheath:i=.25,dust:x=1e3,dustSize:y=1.2,waist:B=.14,flare:P=.8,spread:R=1.3,swirl:D=1,twist:E=1,scale:z=1,centerX:W=.5,baseY:U=.78,tilt:G=3,spin:H=.12,flowSpeed:I=1,pulses:q=1,pulseRate:N=.35,stagger:Y=.5,depth:_=.6,defocus:O=.6,glow:V=.3,intensity:X=1,speed:K=1,interactive:Q=!0,hoverSwell:$=!0,clickSwell:Z=!0,swellStrength:J=1,hoverBoost:ee=.5,paused:et=!1,quality:ea=1,className:el,style:eo,children:er},en){let ei=(0,o.useRef)(null),eu=(0,o.useRef)(null),es=(0,o.useSyncExternalStore)(m,f,()=>!1),ec=(0,o.useRef)({colors:e,backgroundColor:t,mode:a,strands:r,lineWidth:n,sheath:i,dust:x,dustSize:y,waist:B,flare:P,spread:R,swirl:D,twist:E,scale:z,centerX:W,baseY:U,tilt:G,spin:H,flowSpeed:I,pulses:q,pulseRate:N,stagger:Y,depth:_,defocus:O,glow:V,intensity:X,speed:K,interactive:Q,hoverSwell:$,clickSwell:Z,swellStrength:J,hoverBoost:ee,paused:et,quality:ea,reduced:es});return(0,o.useEffect)(()=>{ec.current={colors:e,backgroundColor:t,mode:a,strands:r,lineWidth:n,sheath:i,dust:x,dustSize:y,waist:B,flare:P,spread:R,swirl:D,twist:E,scale:z,centerX:W,baseY:U,tilt:G,spin:H,flowSpeed:I,pulses:q,pulseRate:N,stagger:Y,depth:_,defocus:O,glow:V,intensity:X,speed:K,interactive:Q,hoverSwell:$,clickSwell:Z,swellStrength:J,hoverBoost:ee,paused:et,quality:ea,reduced:es},eu.current?.sync()}),(0,o.useEffect)(()=>{let e=ei.current;if(!e)return;let t=((e,t)=>{let a,l=document.createElement("canvas");l.setAttribute("aria-hidden","true"),l.style.position="absolute",l.style.inset="0",l.style.width="100%",l.style.height="100%",l.style.display="block",l.style.pointerEvents="none",e.prepend(l);try{a=new s.WebGLRenderer({canvas:l,alpha:!1,antialias:!1,powerPreference:"high-performance"})}catch{return l.remove(),null}if(!a.capabilities.isWebGL2)return a.dispose(),l.remove(),null;a.autoClear=!1;let o=a.extensions.has("EXT_color_buffer_float")||a.extensions.has("EXT_color_buffer_half_float")?u.ix0:u.OUM,r=new u.qUd(-1,1,1,-1,0,1),n=new u.bdM(2,2),i=new u.GYF(new Float32Array(2564),641,1,u.GWd,u.RQf);i.minFilter=u.hxR,i.magFilter=u.hxR;let c=new u.GYF(new Float32Array(4096),1024,1,u.GWd,u.RQf);c.minFilter=u.hxR,c.magFilter=u.hxR;let m=Array.from({length:6},()=>new u.IUQ(0,-100,0,0)),f={uResolution:{value:new u.I9Y(1,1)},uPrincipal:{value:new u.I9Y},uFocal:{value:1},uCamPos:{value:new u.Pq0},uCamUp:{value:new u.Pq0},uCamFwd:{value:new u.Pq0},uSpinPhase:{value:0},uOuter:{value:1.6},uWaist:{value:.14},uTop:{value:1},uLabA:{value:new u.Pq0},uLabB:{value:new u.Pq0},uHover:{value:new u.Pq0(.4,0,.17)},uSwells:{value:m},uWaveTime:{value:0},uActive:{value:0},uPixelRatio:{value:1},uBack:{value:.4},uEnergy:{value:0},uInk:{value:0}},x={depthTest:!1,depthWrite:!1,transparent:!0,blending:u.bCz,blendEquation:u.gO9,blendSrc:u.qad,blendDst:u.qad,blendSrcAlpha:u.qad,blendDstAlpha:u.qad},y=new u.BKk({glslVersion:u.Wdf,uniforms:{...f,uCurve:{value:i},uLight:{value:null},uHead:{value:0},uLineWidth:{value:1.2},uSheath:{value:.5},uDefocus:{value:.6},uLimb:{value:1.6},uRim:{value:1.4},uCorner:{value:.08},uCore:{value:.55},uSheathGain:{value:.1}},vertexShader:S,fragmentShader:C,side:u.$EB,...x}),B=new u.BKk({glslVersion:u.Wdf,uniforms:{...f,uTable:{value:c},uFlow:{value:0},uTime:{value:0},uSize:{value:1.6},uDustGain:{value:.9}},vertexShader:F,fragmentShader:k,...x}),P=(e,t)=>new u.BKk({glslVersion:u.Wdf,uniforms:t,vertexShader:M,fragmentShader:e,depthTest:!1,depthWrite:!1,blending:u.XIg}),R=P(A,{uSource:{value:null},uTexel:{value:new u.I9Y}}),D=P(T,{uSource:{value:null},uBase:{value:null},uTexel:{value:new u.I9Y}}),E=P(j,{uLines:{value:null},uBloom:{value:null},uBackground:{value:new u.Pq0},uGlow:{value:.5},uExposure:{value:1.5},uMode:{value:0},uGrain:{value:0}}),z=null,W=-1,U=null,G="",H=new u.eaF(new u.LoY,y);H.frustumCulled=!1;let I=new u.ONl(new u.LoY,B);I.frustumCulled=!1;let q=new u.Z58;q.add(H),q.add(I);let N=new u.eaF(n,E);N.frustumCulled=!1;let Y=new u.Z58;Y.add(N);let _=(e,t)=>new u.nWS(Math.max(1,e),Math.max(1,t),{type:o,format:u.GWd,minFilter:u.k6q,magFilter:u.k6q,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1}),O=null,V=[],X=[],K=!1,Q=0,$=0,Z=!0,J=20,ee=0,et=0,ea=0,el=0,eo=0,er=0,en=1,ei=1,eu=1,es=0,ec={inside:!1,x:0,y:0},ed={height:.4,velocity:0,goal:.4,amount:0},em=0,ef=0,eh={position:[0,0,0],up:[0,1,0],forward:[0,0,-1],focal:1,principal:[0,0]},ev=()=>{O?.dispose(),V.forEach(e=>e.dispose()),X.forEach(e=>e.dispose()),O=null,V=[],X=[]},ep=(e,t)=>{N.material=e,a.setRenderTarget(t),a.render(Y,r)},ex=()=>{let e=t.current,a=h(e.waist,.02,.5),l=h(e.flare,0,3),o=h(e.spread,.2,4),r=h(e.swirl,0,4),n=h(e.twist,0,4),u=[a,l,o,r,n].join("|");u===G&&U||(G=u,U=((e,t,a,l,o)=>{let r=.6*e,n=Math.max(a,1.3*e+r+.1),i=a=>e*(1+.16*Math.exp(-Math.max(0,a-r)/.07))+.55*t*1*Math.pow(Math.max(0,(a-.12)/.88),2.45),u=i(r),s=[],c=[],d=[];for(let e=0;e<3e3;e++)s.push(n+e/3e3*(u+r-n)),c.push(0),d.push(0);for(let e=0;e<600;e++){let t=-Math.PI/2-Math.PI/2*(e/600);s.push(u+r+r*Math.cos(t)),c.push(r+r*Math.sin(t)),d.push(e/600)}for(let e=0;e<=4400;e++){let t=r+e/4400*(1-r);s.push(i(t)),c.push(t),d.push(1)}let m=s.length,f=new Float64Array(m),v=new Float64Array(m),p=new Float64Array(m),x=0;for(let t=1;t<m;t++){let a=Math.hypot(s[t]-s[t-1],c[t]-c[t-1]),n=.5*(s[t]+s[t-1]),i=.5*(d[t]+d[t-1]),m=1+2.4*Math.exp(-Math.max(0,n-u-r)/(.6*r)),h=4*l*a/n*Math.pow(e/n,.3)*m*(1-i)+o*a/e*Math.pow(e/n,.3)*i;f[t]=f[t-1]+h;let g=(1-i)*Math.pow(e/n,.6)+.5*i;v[t]=v[t-1]+a/g,p[t]=p[t-1]+Math.hypot(a,n*h),d[t]>=.5&&d[t-1]<.5&&(x=v[t])}let g=v[m-1],w=new Float32Array(2564),b=1;for(let e=0;e<=640;e++){let t=p[m-1]*e/640;for(;b<m-1&&p[b]<t;)b++;let a=p[b]-p[b-1],l=a>0?h((t-p[b-1])/a,0,1):0,o=4*e;w[o]=s[b-1]+(s[b]-s[b-1])*l,w[o+1]=c[b-1]+(c[b]-c[b-1])*l,w[o+2]=f[b-1]+(f[b]-f[b-1])*l,w[o+3]=(v[b-1]+(v[b]-v[b-1])*l)/g}let y=new Float32Array(4096);b=1;for(let e=0;e<1024;e++){let t=g*e/1023;for(;b<m-1&&v[b]<t;)b++;let a=v[b]-v[b-1],l=a>0?h((t-v[b-1])/a,0,1):0,o=4*e;y[o]=s[b-1]+(s[b]-s[b-1])*l,y[o+1]=c[b-1]+(c[b]-c[b-1])*l,y[o+2]=f[b-1]+(f[b]-f[b-1])*l,y[o+3]=t/g}return{points:w,table:y,corner:x/g,top:1,outer:n}})(a,l,o,r,n),i.image.data.set(U.points),i.needsUpdate=!0,c.image.data.set(U.table),c.needsUpdate=!0)},eg=()=>{let e=t.current;return .055*h(e.flowSpeed,0,4)*h(e.speed,0,4)*(1+.25*el+eo)},ew=(e,a)=>{let l=t.current,o=z;if(!o)return[0,0];let r=h(l.stagger,0,2)*(.35*Math.sin(2*o.phi[a]+.4)+.65*(o.seed[a]-.5)),n=e*h(l.pulseRate,0,4)+r,i=l.reduced?.6:.5+.5*Math.cos(d*n),u=.8+.2*Math.sin(.29*e+5*o.seed[a]);return[.28+.95*h(l.pulses,0,2)*i*i*i*u,.5+.5*Math.sin(.35*e+2*o.phi[a]+.8*o.seed[a])]},eb=(e,t)=>{let a=z;if(a)for(let l=0;l<a.count;l++){let[o,r]=ew(t,l),n=(248*l+e)*4;a.ring[n]=o,a.ring[n+1]=o*r,a.ring[n+2]=0,a.ring[n+3]=0}},ey=()=>{let e=z;if(!e)return;let t=240*Math.max(eg(),.01),a=Math.floor(et);for(let e=0;e<248;e++)eb(p(a-e,248),J-e/t);e.texture.needsUpdate=!0},eS=()=>{let e=Math.round(h(t.current.strands,8,400));z&&z.count===e||(z&&(z.geometry.dispose(),z.texture.dispose()),H.geometry=(z=(e=>{let t=new Float32Array(641*e*12),a=new Uint32Array(640*e*6),l=new Float32Array(e),o=new Float32Array(e),r=new Float32Array(e),n=new Float32Array(e),i=L(11),s=0,c=0;for(let u=0;u<e;u++){l[u]=u/e*d+(i()-.5)*(d/e)*.8,o[u]=(i()-.5)*.06,r[u]=(i()-.5)*.08,n[u]=i();let m=s/6;for(let e=0;e<=640;e++)t.set([l[u],o[u],r[u],u,e,-1,l[u],o[u],r[u],u,e,1],s),s+=12;for(let e=0;e<640;e++){let t=m+2*e;a.set([t,t+1,t+2,t+1,t+3,t+2],c),c+=6}}let m=new u.LoY,f=new u.eB$(t,6);m.setAttribute("aStrand",new u.eHs(f,4,0)),m.setAttribute("aSample",new u.eHs(f,2,4)),m.setAttribute("position",new u.eHs(f,3,0)),m.setIndex(new u.THS(a,1));let h=new Float32Array(248*e*4),v=new u.GYF(h,248,e,u.GWd,u.RQf);return v.minFilter=u.hxR,v.magFilter=u.hxR,v.generateMipmaps=!1,v.needsUpdate=!0,{count:e,phi:l,radius:o,pitch:r,seed:n,ring:h,texture:v,geometry:m}})(e)).geometry,y.uniforms.uLight.value=z.texture,ey())},eC=()=>{let e=t.current;if(e.reduced||e.paused)return;let a=h(e.swellStrength,0,3);er+=2.5*a,m[ef=(ef+1)%6].set(.06,em,.13*a,0),eT()},eF=()=>ed.amount>.001||m.some(e=>e.z>0&&em-e.y<7),ek=()=>{let e;if(!O||!V.length)return;ex(),eS(),(e=Math.round(h(t.current.dust,0,8e3)))!==W&&(W=e,I.geometry.dispose(),I.geometry=(e=>{let t=L(29),a=new Float32Array(4*Math.max(e,1));for(let l=0;l<e;l++)a.set([t()*d,t(),t(),t()],4*l);let l=new u.LoY;return l.setAttribute("aDust",new u.THS(a,4)),l.setAttribute("position",new u.THS(new Float32Array(3*Math.max(e,1)),3)),l.setDrawRange(0,e),l})(e),I.visible=e>0),(()=>{let e,a,l,o,r,n,i,u,s,c,d,m,v,x=t.current,S=U;if(!S)return;let C=en*eu,F=ei*eu;a=h((e=t.current).tilt,-10,60)*Math.PI/180,l=en*eu,o=ei*eu,r=[0,.42+3.2*Math.sin(a),3.2*Math.cos(a)],n=[0,Math.cos(a),-Math.sin(a)],i=[0,-Math.sin(a),-Math.cos(a)],u=.82*h(e.scale,.2,4)*o*3.2,s=-r[1],c=-r[2],d=s*n[1]+c*n[2],m=s*i[1]+c*i[2],v=[h(e.centerX,-.5,1.5)*l,(1-h(e.baseY,-.5,1.5))*o-u*d/m],eh={position:r,up:n,forward:i,focal:u,principal:v};let k=g(x.backgroundColor,[.04,.04,.04]),M=.2126*k[0]+.7152*k[1]+.0722*k[2],A="ink"===x.mode||"auto"===x.mode&&M>.5,T=b(g(x.colors[0],[.55,.36,.96])),j=b(g(x.colors[1],[1,.62,.99]));f.uResolution.value.set(C,F),f.uPrincipal.value.set(eh.principal[0],eh.principal[1]),f.uFocal.value=eh.focal,f.uCamPos.value.set(...eh.position),f.uCamUp.value.set(...eh.up),f.uCamFwd.value.set(...eh.forward),f.uSpinPhase.value=ee,f.uOuter.value=S.outer,f.uWaist.value=h(x.waist,.02,.5),f.uTop.value=S.top,f.uLabA.value.set(T[0],T[1],T[2]),f.uLabB.value.set(j[0],j[1],j[2]),f.uPixelRatio.value=eu,f.uBack.value=1-h(x.depth,0,1),f.uEnergy.value=el,f.uInk.value=+!!A,f.uWaveTime.value=em,f.uActive.value=+!!eF(),f.uHover.value.set(ed.height,ed.amount,.17);let L=y.uniforms;L.uHead.value=p(et,248),L.uLineWidth.value=h(x.lineWidth,.3,6),L.uSheath.value=h(x.sheath,0,3),L.uDefocus.value=h(x.defocus,0,2),L.uCorner.value=.6*h(x.waist,.02,.5);let P=B.uniforms;P.uFlow.value=ea,P.uTime.value=J,P.uSize.value=h(x.dustSize,.3,6);let R=E.uniforms;R.uBackground.value.set(w(k[0]),w(k[1]),w(k[2])),R.uGlow.value=h(x.glow,0,3),R.uExposure.value=(A?1.35:.525)*h(x.intensity,0,4)*(1+.1*el+.12*eo),R.uMode.value=+!!A,R.uGrain.value=es})(),a.setRenderTarget(O),a.setClearColor(0,0),a.clear(),a.render(q,r);let l=O;for(let e of V)R.uniforms.uSource.value=l.texture,R.uniforms.uTexel.value.set(1/l.width,1/l.height),ep(R,e),l=e;let o=V[V.length-1];for(let e=V.length-2;e>=0;e--)D.uniforms.uSource.value=o.texture,D.uniforms.uBase.value=V[e].texture,D.uniforms.uTexel.value.set(1/o.width,1/o.height),ep(D,X[e]),o=X[e];E.uniforms.uLines.value=O.texture,E.uniforms.uBloom.value=o.texture,ep(E,null)},eM=()=>{let e=t.current;return ec.inside&&e.interactive&&!e.reduced?h(e.hoverBoost,0,2):0},eA=a=>{if(Q=0,K)return;let l=Math.min(.05,Math.max(0,(a-$)/1e3));$=a,(a=>{let l=t.current;if(ex(),eS(),el+=(eM()-el)*(1-Math.exp(-a/.45)),er+=(-(18*eo)-6.5*er)*a,eo=Math.max(-.5,eo+er*a),(a=>{let l=t.current,o=0;if(ec.inside&&l.interactive&&l.hoverSwell&&!l.paused&&!l.reduced){let a=((t,a)=>{let l=e.getBoundingClientRect(),o=(t-l.left)*eu,r=(l.height-(a-l.top))*eu,n=(o-eh.principal[0])/eh.focal,i=(r-eh.principal[1])/eh.focal,u=eh.up[1]*i+eh.forward[1],s=eh.up[2]*i+eh.forward[2];if(s>-1e-4)return null;let c=-eh.position[2]/s;return{x:eh.position[0]+c*n,y:eh.position[1]+c*u}})(ec.x,ec.y);if(a){var r;let e,n,i=1.2*(r=h(a.y,.05,1),n=h((e=t.current).waist,.02,.5),n*(1+.16*Math.exp(-Math.max(0,r-.6*n)/.07))+.55*h(e.flare,0,3)*1*Math.pow(Math.max(0,(r-.12)/.88),2.45))+.05,u=1-v(i,i+.3,Math.abs(a.x)),s=v(-.02,.1,a.y)*(1-v(1,1.2,a.y));o=.15*h(l.swellStrength,0,3)*u*s,ed.goal=h(a.y,.1,.95)}}ed.amount<.004&&o>0&&(ed.height=ed.goal,ed.velocity=0),ed.velocity+=(20.25*(ed.goal-ed.height)-9*ed.velocity)*a,ed.height+=ed.velocity*a,ed.amount+=(o-ed.amount)*(1-Math.exp(-a/.5))})(a),l.paused||l.reduced)return;em+=a;let o=h(l.speed,0,4),r=J,n=et;J+=a*o,ee+=a*o*h(l.spin,-4,4)*(1+.6*eo);let i=eg();et+=240*i*a,ea+=i*a;let u=z;if(u){for(let e=Math.floor(n)+1;e<=Math.floor(et);e++){let t=r+(e-n)/Math.max(et-n,1e-6)*(J-r);eb(p(e,248),t)}u.texture.needsUpdate=!0}es=(es+.618034)%1})(l),ek();let o=t.current,r=!o.paused&&!o.reduced,n=Math.abs(el-eM())>.002||Math.abs(eo)>.002||r&&eF();Z&&!document.hidden&&(r||n)&&(Q=requestAnimationFrame(eA))};function eT(){K||Q||!Z||($=performance.now(),Q=requestAnimationFrame(eA))}let ej=()=>{let l=e.getBoundingClientRect();en=Math.max(1,l.width),ei=Math.max(1,l.height),eu=Math.min(window.devicePixelRatio||1,2)*h(t.current.quality,.25,1),a.setPixelRatio(eu),a.setSize(en,ei,!1);let o=Math.round(en*eu),r=Math.round(ei*eu);ev(),O=_(o,r);let n=h(Math.floor(Math.log2(Math.min(o,r)/8)),3,7);for(let e=1;e<=n;e++)V.push(_(Math.max(1,o>>e),Math.max(1,r>>e))),X.push(_(Math.max(1,o>>e),Math.max(1,r>>e)));ek(),eT()},eL=e=>{"touch"!==e.pointerType&&t.current.interactive&&(ec.x=e.clientX,ec.y=e.clientY,ec.inside||(ec.inside=!0,eT()))},eB=()=>{ec.inside=!1,eT()},eP=e=>{let a=t.current;0===e.button&&a.interactive&&a.clickSwell&&eC()};e.addEventListener("pointermove",eL),e.addEventListener("pointerleave",eB),e.addEventListener("pointercancel",eB),e.addEventListener("pointerdown",eP);let eR=new ResizeObserver(ej);eR.observe(e);let eD=new IntersectionObserver(e=>{(Z=e.some(e=>e.isIntersecting))&&eT()},{rootMargin:"80px"});eD.observe(e);let eE=()=>{document.hidden||eT()};document.addEventListener("visibilitychange",eE);let ez=e=>e.preventDefault();l.addEventListener("webglcontextlost",ez),ej();let eW="";return{sync:()=>{let e=t.current,a=[e.pulses,e.pulseRate,e.stagger,e.reduced].join("|");a!==eW&&(eW=a,ey()),Math.abs(Math.min(window.devicePixelRatio||1,2)*h(e.quality,.25,1)-eu)>.001?ej():ek(),eT()},destroy:()=>{K=!0,cancelAnimationFrame(Q),e.removeEventListener("pointermove",eL),e.removeEventListener("pointerleave",eB),e.removeEventListener("pointercancel",eB),e.removeEventListener("pointerdown",eP),document.removeEventListener("visibilitychange",eE),l.removeEventListener("webglcontextlost",ez),eR.disconnect(),eD.disconnect(),ev(),z?.geometry.dispose(),z?.texture.dispose(),I.geometry.dispose(),i.dispose(),c.dispose(),n.dispose(),[y,B,R,D,E].forEach(e=>e.dispose()),a.dispose(),a.forceContextLoss(),l.remove()},swell:eC}})(e,ec);return eu.current=t,()=>{t?.destroy(),eu.current=null}},[]),(0,o.useImperativeHandle)(en,()=>({swell:()=>eu.current?.swell()}),[]),(0,l.jsx)("div",{ref:ei,className:(0,c.cn)("relative isolate h-full min-h-[240px] w-full overflow-hidden",el),style:{backgroundColor:t,...eo},children:er&&(0,l.jsx)("div",{className:"relative z-10 h-full w-full",children:er})})});B.displayName="SpiralFunnel";let P={dark:["#8B5CF6","#FF9FFC"],light:["#5B2BFF","#D13DB8"],strands:56,lineWidth:1,sheath:.25,dust:1e3,waist:.14,flare:.8,spread:1.3,swirl:1,twist:1,tilt:3},R={aurora:P,mono:{...P,dark:["#D9D4FF","#FFFFFF"],light:["#1A1A1A","#5A5A5A"],strands:72,dust:2600},ember:{...P,dark:["#FF6A2A","#FFC46B"],light:["#C2410C","#D97706"],strands:64,waist:.1,flare:.6,twist:1.5},glacier:{...P,dark:["#3B82F6","#8FF6FF"],light:["#1D4ED8","#0891B2"],strands:60},veil:{...P,strands:120,lineWidth:.8,sheath:.2,dust:2200,twist:.7},cyclone:{...P,strands:44,flare:1.1,spread:1.8,swirl:1.6,twist:1.3,tilt:6}},D=[{label:"Aurora",value:"aurora"},{label:"Mono",value:"mono"},{label:"Ember",value:"ember"},{label:"Glacier",value:"glacier"},{label:"Veil",value:"veil"},{label:"Cyclone",value:"cyclone"}],E=[{label:"Auto",value:"auto"},{label:"Glow",value:"glow"},{label:"Ink",value:"ink"}],z=[{name:"colors",type:"[string, string]",default:'["#8B5CF6", "#FF9FFC"]',description:"Colour at the base of the vortex and colour at its crown, blended in OKLab along the height."},{name:"backgroundColor",type:"string",default:'"#0A0A0A"',description:"Colour behind the vortex."},{name:"mode",type:'"auto" | "glow" | "ink"',default:'"auto"',description:"glow adds light for dark backgrounds, ink draws fine coloured strands for light ones. auto picks from the background brightness."},{name:"strands",type:"number",default:"56",description:"Number of streamlines. Each one spirals in across the ground, wraps the base and rises up the funnel, from 8 to 400."},{name:"lineWidth",type:"number",default:"1",description:"Width of the strands nearest the viewer, in pixels."},{name:"sheath",type:"number",default:"0.25",description:"Soft glow around each strand. 0 draws bare hairlines."},{name:"dust",type:"number",default:"1000",description:"Number of dust specks drifting along the flow, from 0 to 8000."},{name:"dustSize",type:"number",default:"1.2",description:"Size of the dust specks."},{name:"waist",type:"number",default:"0.14",description:"Radius of the funnel at its narrowest point, as a fraction of its height."},{name:"flare",type:"number",default:"0.8",description:"How wide the funnel opens toward the top."},{name:"spread",type:"number",default:"1.3",description:"Radius of the swirl across the ground, as a fraction of the funnel height."},{name:"swirl",type:"number",default:"1",description:"How many times the flow circles on its way in across the ground."},{name:"twist",type:"number",default:"1",description:"How tightly the strands wind as they rise. Higher values give a tighter lattice."},{name:"scale",type:"number",default:"1",description:"Size of the vortex relative to the frame."},{name:"centerX",type:"number",default:"0.5",description:"Horizontal position of the vortex, from 0 (left) to 1 (right)."},{name:"baseY",type:"number",default:"0.78",description:"Vertical position of the base, from 0 (top) to 1 (bottom)."},{name:"tilt",type:"number",default:"3",description:"Camera angle above the ground, in degrees. Higher values show more of the swirl."},{name:"spin",type:"number",default:"0.12",description:"Speed at which the whole vortex turns. Negative values turn it the other way."},{name:"flowSpeed",type:"number",default:"1",description:"Speed at which light and dust travel along the flow."},{name:"pulses",type:"number",default:"1",description:"Strength of the pulses of light carried in from the edge of the swirl, from 0 (a steady glow) to 2."},{name:"pulseRate",type:"number",default:"0.35",description:"Number of pulses released per second."},{name:"stagger",type:"number",default:"0.5",description:"How far pulses are offset from strand to strand. 0 sends them in as clean rings."},{name:"depth",type:"number",default:"0.6",description:"How much strands on the far side of the funnel dim and thin, from 0 (flat) to 1."},{name:"defocus",type:"number",default:"0.6",description:"Depth of field: strands on the far side soften out of focus, from 0 to 2."},{name:"glow",type:"number",default:"0.3",description:"Bloom around the strands and the bright rim at the base, from 0 to 3."},{name:"intensity",type:"number",default:"1",description:"Overall exposure."},{name:"speed",type:"number",default:"1",description:"Overall animation speed."},{name:"interactive",type:"boolean",default:"true",description:"Respond to the pointer."},{name:"hoverSwell",type:"boolean",default:"true",description:"The funnel swells gently at the pointer's height and follows it softly up and down, while the dust nearby drifts outward and settles back when the pointer leaves."},{name:"clickSwell",type:"boolean",default:"true",description:"Clicking sends a slow swell rising up the funnel, drawing the dust out with it."},{name:"swellStrength",type:"number",default:"1",description:"How far the funnel swells and the dust drifts, for both hover and click, from 0 to 3."},{name:"hoverBoost",type:"number",default:"0.5",description:"How much the flow quickens and brightens while the pointer is over the component, from 0 to 2."},{name:"paused",type:"boolean",default:"false",description:"Freeze the motion. Reduced-motion users always get a still frame."},{name:"quality",type:"number",default:"1",description:"Resolution scale from 0.25 to 1. Lower values are cheaper on large screens."},{name:"ref",type:"{ swell }",default:"—",description:"swell() sends a swell up the funnel from code, for example when a form is submitted."},{name:"children",type:"ReactNode",default:"—",description:"Content placed over the background."},{name:"className",type:"string",default:"—",description:"Classes for the root element. It fills its parent, with a 240px minimum height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."}],W=()=>{let[e,t]=(0,i.I)(),a="dark"===(0,n.Y)(),[u,s]=(0,o.useState)("aurora"),[c,d]=(0,o.useState)(P),m=e=>t=>d(a=>({...a,[e]:t})),[f,h]=(0,o.useState)(null),v=f??(a?c.dark:c.light),p=e=>t=>{let a=[...v];a[e]=t,h(a)},[x,g]=(0,o.useState)(null),w=x??(a?"#0A0A0A":"#FFFFFF"),[b,y]=(0,o.useState)("auto"),[S,C]=(0,o.useState)(1.2),[F,k]=(0,o.useState)(1),[M,A]=(0,o.useState)(.5),[T,j]=(0,o.useState)(.78),[L,W]=(0,o.useState)(.12),[U,G]=(0,o.useState)(1),[H,I]=(0,o.useState)(1),[q,N]=(0,o.useState)(.35),[Y,_]=(0,o.useState)(.5),[O,V]=(0,o.useState)(.6),[X,K]=(0,o.useState)(.6),[Q,$]=(0,o.useState)(.3),[Z,J]=(0,o.useState)(1),[ee,et]=(0,o.useState)(1),[ea,el]=(0,o.useState)(1),[eo,er]=(0,o.useState)(.5),[en,ei]=(0,o.useState)(!0),[eu,es]=(0,o.useState)(!0),[ec,ed]=(0,o.useState)(!0),[em,ef]=(0,o.useState)(!1);return(0,l.jsxs)("div",{children:[(0,l.jsx)(r.Bg,{}),(0,l.jsxs)(r.VX,{children:[(0,l.jsxs)(r.Ec,{children:[(0,l.jsx)(r.Ch,{onRefresh:t,minHeight:560,enableResponsive:!0,children:(0,l.jsx)("div",{className:"relative h-full w-full",children:(0,l.jsx)(B,{colors:v,backgroundColor:w,mode:b,strands:c.strands,lineWidth:c.lineWidth,sheath:c.sheath,dust:c.dust,dustSize:S,waist:c.waist,flare:c.flare,spread:c.spread,swirl:c.swirl,twist:c.twist,scale:F,centerX:M,baseY:T,tilt:c.tilt,spin:L,flowSpeed:U,pulses:H,pulseRate:q,stagger:Y,depth:O,defocus:X,glow:Q,intensity:Z,speed:ee,interactive:ec,hoverSwell:en,clickSwell:eu,swellStrength:ea,hoverBoost:eo,paused:em},e)})}),(0,l.jsxs)(r.IH,{children:[(0,l.jsx)(r.bg,{title:"Preset",value:u,options:D,onChange:e=>{s(e),d(R[e]??P),h(null)}}),(0,l.jsx)(r.bg,{title:"Mode",value:b,options:E,onChange:e=>y(e)}),(0,l.jsx)(r.W7,{title:"Base",value:v[0],onChange:p(0)}),(0,l.jsx)(r.W7,{title:"Crown",value:v[1],onChange:p(1)}),(0,l.jsx)(r.W7,{title:"Background",value:w,onChange:g}),(0,l.jsx)(r.yt,{title:"Strands",min:8,max:400,step:1,value:c.strands,onChange:m("strands")}),(0,l.jsx)(r.yt,{title:"Line Width",min:.3,max:4,step:.05,value:c.lineWidth,valueUnit:"px",onChange:m("lineWidth")}),(0,l.jsx)(r.yt,{title:"Sheath",min:0,max:2,step:.05,value:c.sheath,onChange:m("sheath")}),(0,l.jsx)(r.yt,{title:"Dust",min:0,max:6e3,step:50,value:c.dust,onChange:m("dust")}),(0,l.jsx)(r.yt,{title:"Dust Size",min:.3,max:4,step:.05,value:S,onChange:C}),(0,l.jsx)(r.yt,{title:"Waist",min:.04,max:.4,step:.005,value:c.waist,onChange:m("waist")}),(0,l.jsx)(r.yt,{title:"Flare",min:0,max:2,step:.05,value:c.flare,onChange:m("flare")}),(0,l.jsx)(r.yt,{title:"Spread",min:.4,max:3,step:.05,value:c.spread,onChange:m("spread")}),(0,l.jsx)(r.yt,{title:"Swirl",min:0,max:3,step:.05,value:c.swirl,onChange:m("swirl")}),(0,l.jsx)(r.yt,{title:"Twist",min:0,max:3,step:.05,value:c.twist,onChange:m("twist")}),(0,l.jsx)(r.yt,{title:"Scale",min:.4,max:2,step:.01,value:F,onChange:k}),(0,l.jsx)(r.yt,{title:"Center X",min:0,max:1,step:.01,value:M,onChange:A}),(0,l.jsx)(r.yt,{title:"Base Y",min:.3,max:1.1,step:.01,value:T,onChange:j}),(0,l.jsx)(r.yt,{title:"Tilt",min:0,max:40,step:.5,value:c.tilt,valueUnit:"\xb0",onChange:m("tilt")}),(0,l.jsx)(r.yt,{title:"Spin",min:-1,max:1,step:.01,value:L,onChange:W}),(0,l.jsx)(r.yt,{title:"Flow Speed",min:0,max:3,step:.05,value:U,onChange:G}),(0,l.jsx)(r.yt,{title:"Pulses",min:0,max:2,step:.05,value:H,onChange:I}),(0,l.jsx)(r.yt,{title:"Pulse Rate",min:0,max:2,step:.01,value:q,onChange:N}),(0,l.jsx)(r.yt,{title:"Stagger",min:0,max:2,step:.05,value:Y,onChange:_}),(0,l.jsx)(r.yt,{title:"Depth",min:0,max:1,step:.01,value:O,onChange:V}),(0,l.jsx)(r.yt,{title:"Defocus",min:0,max:2,step:.05,value:X,onChange:K}),(0,l.jsx)(r.yt,{title:"Glow",min:0,max:2,step:.05,value:Q,onChange:$}),(0,l.jsx)(r.yt,{title:"Intensity",min:.2,max:3,step:.05,value:Z,onChange:J}),(0,l.jsx)(r.yt,{title:"Speed",min:0,max:3,step:.05,value:ee,onChange:et}),(0,l.jsx)(r.yt,{title:"Swell Strength",min:0,max:3,step:.05,value:ea,onChange:el}),(0,l.jsx)(r.yt,{title:"Hover Boost",min:0,max:2,step:.05,value:eo,onChange:er}),(0,l.jsx)(r.tl,{title:"Hover Swell",checked:en,onChange:ei}),(0,l.jsx)(r.tl,{title:"Click Swell",checked:eu,onChange:es}),(0,l.jsx)(r.tl,{title:"Interactive",checked:ec,onChange:ed}),(0,l.jsx)(r.tl,{title:"Paused",checked:em,onChange:ef})]}),(0,l.jsx)(r.Ub,{data:z})]}),(0,l.jsx)(r.lT,{children:(0,l.jsx)(r.Gv,{})})]})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>o});var l=a(12115);function o(){let[e,t]=(0,l.useState)(0),a=(0,l.useCallback)(()=>{t(e=>e+1)},[]);return(0,l.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);