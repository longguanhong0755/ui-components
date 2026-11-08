"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[56838],{56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>n.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>d.CopyButton,IH:()=>l.Customize,gI:()=>p,Dn:()=>v,pi:()=>m,W7:()=>i.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>i.PreviewInput,bg:()=>i.PreviewSelect,yt:()=>i.PreviewSlider,tl:()=>i.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>o.PropTable,VX:()=>n.TabsLayout,bs:()=>f});var n=a(55019);a(27382);var r=a(10236),l=a(69485),i=a(48543),o=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),h=a(90650);let f="rounded-lg border bg-background";function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)(f,e),...a,children:t})}function v({title:e,description:t,className:a,children:n}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:n})]})}},56838:(e,t,a)=>{a.r(t),a.d(t,{default:()=>B});var n=a(95155),r=a(12115),l=a(56388),i=a(86049),o=a(90761),s=a(2253),u=a(12246),c=a(90650);let d=" \xb7+\xd7○◎◉",h='ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',f=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},p=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,m=(e,t,a)=>Math.min(a,Math.max(t,e)),v=null,g=(e,t)=>{if(v||(v=document.createElement("canvas").getContext("2d")),!v)return t;v.fillStyle="#010203",v.fillStyle=e;let a=String(v.fillStyle);if("#010203"===a&&"#010203"!==e.trim().toLowerCase())return t;if(a.startsWith("#")){let e=a.slice(1);return[parseInt(e.slice(0,2),16)/255,parseInt(e.slice(2,4),16)/255,parseInt(e.slice(4,6),16)/255]}let n=a.match(/[\d.]+/g);return!n||n.length<3?t:[Number(n[0])/255,Number(n[1])/255,Number(n[2])/255]},x=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),b=([e,t,a])=>{let n=x(e),r=x(t),l=x(a),i=Math.cbrt(.4122214708*n+.5363325363*r+.0514459929*l),o=Math.cbrt(.2119034982*n+.6806995451*r+.1073969566*l),s=Math.cbrt(.0883024619*n+.2817188376*r+.6299787005*l);return[.2104542553*i+.793617785*o-.0040720468*s,1.9779984951*i-2.428592205*o+.4505937099*s,.0259040371*i+.7827717662*o-.808675766*s]},y=`
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,w=`
precision highp float;
uniform vec2 uCell;
uniform vec2 uResolution;
uniform float uTime;
uniform float uScale;
uniform vec2 uDrift;
uniform float uThreshold;
uniform float uAmbient;
uniform float uReveal;
uniform float uPersistence;
uniform float uWidth;
uniform float uFalloff;
uniform vec4 uPings[16];
uniform vec4 uPingShape[16];
uniform vec4 uObstacle;
out vec4 fragColor;

float hash2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 0.0)), hash3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0.0, 0.0, 1.0)), hash3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash3(i + vec3(0.0, 1.0, 1.0)), hash3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z
  );
}

float fbm(vec3 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    sum += amplitude * noise3(p);
    p = p * 2.03 + vec3(17.1, 3.7, 1.3);
    amplitude *= 0.5;
  }
  return sum / 0.9375;
}

void main() {
  vec2 center = gl_FragCoord.xy * uCell;
  float unit = min(uResolution.x, uResolution.y);
  vec2 q = center / unit * (4.2 / uScale) - uDrift * uTime;
  float z = uTime * 0.03;
  vec2 warp = vec2(fbm(vec3(q * 0.6, z + 3.1)), fbm(vec3(q * 0.6 + 7.3, z + 8.4))) - 0.5;
  float n = fbm(vec3(q + warp * 1.2, z * 1.3));
  float shoal = smoothstep(uThreshold, uThreshold + 0.08, n);
  float core = smoothstep(uThreshold, uThreshold + 0.26, n);
  float hidden = smoothstep(uThreshold - 0.2, uThreshold, n) * (1.0 - shoal);
  float speck = hash2(floor(gl_FragCoord.xy) + 17.0);
  float stipple = hash2(floor(gl_FragCoord.xy) * 1.37 + 71.0);

  float crest = 0.0;
  float tail = 0.0;
  for (int k = 0; k < 16; k++) {
    vec4 ping = uPings[k];
    if (ping.w <= 0.0) continue;
    vec4 shape = uPingShape[k];
    float age = uTime - ping.z;
    if (age < 0.0) continue;
    vec2 rel = center - ping.xy;
    float dist = length(rel);
    if (dist > shape.y) continue;
    float radius = age * shape.x;
    float lag = radius - dist;
    if (lag < -uWidth * 3.0) continue;
    float fade = ping.w * (1.0 - smoothstep(shape.y * 0.5, shape.y, dist)) * inversesqrt(1.0 + dist / uFalloff) * smoothstep(0.0, shape.w, radius);
    float shadow = 1.0;
    if (shape.z < 0.5 && uObstacle.w > 0.001) {
      vec2 toward = uObstacle.xy - ping.xy;
      float reach = length(toward);
      if (reach > uObstacle.z * 2.5 && dist > reach - uObstacle.z) {
        vec2 dir = toward / reach;
        float side = abs(rel.x * dir.y - rel.y * dir.x);
        float beyond = max(dist - reach, 0.0);
        float spread = uObstacle.z * dist / reach;
        float soft = uObstacle.z * 0.3 + 0.35 * sqrt(beyond * uObstacle.z);
        float inside = 1.0 - smoothstep(spread - soft, spread + soft, side);
        float heal = mix(0.25, 1.0, exp(-beyond / (uObstacle.z * 16.0)));
        shadow = 1.0 - inside * heal * uObstacle.w * step(0.0, dot(rel, dir));
      }
    }
    float width = lag < 0.0 ? uWidth * 0.6 : uWidth;
    float x = lag / width;
    float front = exp(-x * x * x * x);
    float after = lag > 0.0 ? exp(-lag / max(shape.x * uPersistence, 1.0)) : 0.0;
    crest += front * fade * shadow;
    tail += after * (1.0 - front) * fade * shadow;
  }
  crest = min(crest, 1.4);
  tail = min(tail, 1.2);

  float shown = step(stipple, 0.22 + 0.6 * core);
  float rest = uAmbient * shoal * shown * (0.45 + 0.55 * core);
  float lit = shoal * (0.65 + 0.35 * core) * (crest * 1.5 + tail * 0.55);
  float ghost = hidden * uReveal * (crest * 0.5 + tail * 0.22);
  float water = (1.0 - shoal) * crest * (0.18 + 0.32 * step(0.72, speck));
  float value = clamp(rest + lit + ghost + water, 0.0, 1.0);
  float heat = clamp(crest * 1.4 + tail * 0.6, 0.0, 1.0);
  float struck = 0.6 + 0.4 * clamp(crest * 1.3, 0.0, 1.0);
  float open = 0.5 + 0.28 * clamp(crest, 0.0, 1.0);
  float tone = mix(0.12 + 0.3 * core, mix(open, struck, max(shoal, hidden * 0.6)), heat);
  fragColor = vec4(value, tone, 0.0, 1.0);
}
`,S=`
precision highp float;
uniform sampler2D uField;
uniform sampler2D uAtlas;
uniform vec2 uAtlasGrid;
uniform float uCount;
uniform vec2 uCell;
uniform float uSpan;
uniform float uGamma;
uniform float uDither;
uniform float uInk;
uniform vec3 uLabA;
uniform vec3 uLabB;
out vec4 fragColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

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

float glyphCoverage(float index, vec2 g) {
  vec2 f = fract(g) - 0.5;
  vec2 texel = vec2(0.5 + f.x * uSpan, 0.5 - f.y * uSpan);
  float inside = step(0.0, texel.x) * step(texel.x, 1.0) * step(0.0, texel.y) * step(texel.y, 1.0);
  vec2 slot = vec2(mod(index, uAtlasGrid.x), floor(index / uAtlasGrid.x));
  vec2 uv = (slot + clamp(texel, 0.0, 1.0)) / uAtlasGrid;
  vec2 scale = vec2(uSpan) / uAtlasGrid;
  return textureGrad(uAtlas, uv, dFdx(g) * scale, dFdy(g) * scale).r * inside;
}

vec3 palette(float t) {
  vec3 deep = vec3(uLabA.x * 0.55, uLabA.yz * 0.85);
  vec3 top = uInk > 0.5
    ? vec3(uLabB.x * 0.72, uLabB.yz * 1.05)
    : vec3(min(uLabB.x * 1.08 + 0.05, 0.99), uLabB.yz * 0.35);
  vec3 lab = t < 0.45 ? mix(deep, uLabA, smoothstep(0.0, 0.45, t))
    : t < 0.85 ? mix(uLabA, uLabB, smoothstep(0.45, 0.85, t))
    : mix(uLabB, top, smoothstep(0.85, 1.0, t));
  return labToLinear(lab);
}

void main() {
  vec2 g = gl_FragCoord.xy / uCell;
  vec2 cellId = floor(g);
  vec4 field = texelFetch(uField, ivec2(cellId), 0);
  float dither = hash(cellId) - 0.5;
  float value = clamp(field.r + dither * uDither * step(0.015, field.r), 0.0, 1.0);
  float level = pow(value, uGamma);
  float index = floor(level * (uCount - 1.0) + 0.5);
  float energy = 0.0;
  vec3 color = vec3(0.0);
  if (index >= 1.0) {
    float cover = glyphCoverage(index, g);
    color = palette(clamp(field.g, 0.0, 1.0));
    energy = cover * (0.16 + 0.95 * level);
  }
  fragColor = vec4(color * energy, energy);
}
`,C=`
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
`,k=`
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
`,F=`
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
    float cover = clamp(1.0 - exp(-energy * uExposure * 1.4), 0.0, 0.95);
    color = mix(uBackground, clamp(hue * 0.85, 0.0, 1.0), cover);
  }
  float grain = hash(gl_FragCoord.xy + uGrain * 311.0) - 0.5;
  fragColor = vec4(encode(color) + grain * (1.2 / 255.0), 1.0);
}
`,M=(0,r.forwardRef)(function({colors:e=["#7C5CFF","#FF9FFC"],backgroundColor:t="#0A0A0A",mode:a="auto",charset:l=d,fontFamily:i=h,glyphSize:o=11,spacing:v=1,glyphWeight:M=1,density:T=.5,scale:A=1,drift:j=1,driftAngle:P=20,ambient:z=.35,autoPing:E=!0,interval:L=3.4,originX:B=.5,originY:I=.5,pingSpeed:G=1,range:R=1,ringWidth:U=1,persistence:D=.6,reveal:W=.5,glow:O=.12,intensity:q=1,speed:Y=1,interactive:_=!0,clickPing:N=!0,echo:X=!0,echoStrength:H=1,paused:$=!1,quality:V=1,className:Q,style:K,children:J},Z){let ee=(0,r.useRef)(null),et=(0,r.useRef)(null),ea=(0,r.useSyncExternalStore)(f,p,()=>!1),en=(0,r.useRef)({colors:e,backgroundColor:t,mode:a,charset:l,fontFamily:i,glyphSize:o,spacing:v,glyphWeight:M,density:T,scale:A,drift:j,driftAngle:P,ambient:z,autoPing:E,interval:L,originX:B,originY:I,pingSpeed:G,range:R,ringWidth:U,persistence:D,reveal:W,glow:O,intensity:q,speed:Y,interactive:_,clickPing:N,echo:X,echoStrength:H,paused:$,quality:V,reduced:ea});return(0,r.useEffect)(()=>{en.current={colors:e,backgroundColor:t,mode:a,charset:l,fontFamily:i,glyphSize:o,spacing:v,glyphWeight:M,density:T,scale:A,drift:j,driftAngle:P,ambient:z,autoPing:E,interval:L,originX:B,originY:I,pingSpeed:G,range:R,ringWidth:U,persistence:D,reveal:W,glow:O,intensity:q,speed:Y,interactive:_,clickPing:N,echo:X,echoStrength:H,paused:$,quality:V,reduced:ea},et.current?.sync()}),(0,r.useEffect)(()=>{let e=ee.current;if(!e)return;let t=((e,t)=>{let a,n=document.createElement("canvas");n.setAttribute("aria-hidden","true"),n.style.position="absolute",n.style.inset="0",n.style.width="100%",n.style.height="100%",n.style.display="block",n.style.pointerEvents="none",e.prepend(n);try{a=new u.WebGLRenderer({canvas:n,alpha:!1,antialias:!1,powerPreference:"high-performance"})}catch{return n.remove(),null}if(!a.capabilities.isWebGL2)return a.dispose(),n.remove(),null;a.autoClear=!1;let r=a.extensions.has("EXT_color_buffer_float")||a.extensions.has("EXT_color_buffer_half_float")?s.ix0:s.OUM,l=new s.qUd(-1,1,1,-1,0,1),i=new s.bdM(2,2),o=Array.from({length:16},()=>new s.IUQ(0,0,0,0)),c=Array.from({length:16},()=>new s.IUQ(1,1,0,0)),f=Array.from({length:16},()=>({active:!1,x:0,y:0,born:0,amplitude:0,speed:.17,range:.75,birth:.08,echo:!1,echoed:!1})),p=(e,t)=>new s.BKk({glslVersion:s.Wdf,uniforms:t,vertexShader:y,fragmentShader:e,depthTest:!1,depthWrite:!1,blending:s.XIg}),v=p(w,{uCell:{value:new s.I9Y(11,11)},uResolution:{value:new s.I9Y(1,1)},uTime:{value:0},uScale:{value:1},uDrift:{value:new s.I9Y},uThreshold:{value:.55},uAmbient:{value:.35},uReveal:{value:.5},uPersistence:{value:1.4},uWidth:{value:8},uFalloff:{value:300},uPings:{value:o},uPingShape:{value:c},uObstacle:{value:new s.IUQ(0,0,22,0)}}),M=p(S,{uField:{value:null},uAtlas:{value:null},uAtlasGrid:{value:new s.I9Y(16,1)},uCount:{value:2},uCell:{value:new s.I9Y(11,11)},uSpan:{value:1},uGamma:{value:1},uDither:{value:.05},uInk:{value:0},uLabA:{value:new s.Pq0},uLabB:{value:new s.Pq0}}),T=p(C,{uSource:{value:null},uTexel:{value:new s.I9Y}}),A=p(k,{uSource:{value:null},uBase:{value:null},uTexel:{value:new s.I9Y}}),j=p(F,{uLines:{value:null},uBloom:{value:null},uBackground:{value:new s.Pq0},uGlow:{value:.3},uExposure:{value:1.2},uMode:{value:0},uGrain:{value:0}}),P=new s.eaF(i,j);P.frustumCulled=!1;let z=new s.Z58;z.add(P);let E=(e,t)=>new s.nWS(Math.max(1,e),Math.max(1,t),{type:r,format:s.GWd,minFilter:s.k6q,magFilter:s.k6q,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1}),L=null,B=[],I=[],G=null,R="",U=null,D="",W=!1,O=0,q=0,Y=!0,_=0,N=0,X=1,H=1,$=1,V=0,Q={x:0,y:0,sx:0,sy:0,presence:0,inside:!1,placed:!1},K=()=>{L?.dispose(),B.forEach(e=>e.dispose()),I.forEach(e=>e.dispose()),L=null,B=[],I=[]},J=(e,t)=>{P.material=e,a.setRenderTarget(t),a.render(z,l)},Z=()=>m(t.current.glyphSize,5,40)*m(Math.min(X,H)/520,.75,1)*$,ee=()=>Z()*m(t.current.spacing,.7,3),et=()=>Math.hypot(X,H)*$,ea=(e,t)=>{var a;let n,r=e.range*et();return(1-(n=m((t-(a=.5*r))/(r-a),0,1))*n*(3-2*n))/Math.sqrt(1+t/(.25*et()))},en=(e,a,n,r,l,i=_)=>{let o=t.current,s=f.findIndex(e=>!e.active);if(s<0){s=0;for(let e=1;e<16;e++)f[e].born<f[s].born&&(s=e)}let u=m(o.range,.1,3)*(r?.34:.75);Object.assign(f[s],{active:!0,x:e,y:a,born:i,amplitude:n,speed:.17*m(o.pingSpeed,.1,4),range:u,birth:l,echo:r,echoed:r})},er=()=>{let e=t.current;return[m(e.originX,-1,2),m(e.originY,-1,2)]},el=()=>{let e,a,n,l,i,u,p,y,w,S,C,k,F,P,z,E,W,O,q,Y;if(!L||!B.length)return;(()=>{let e=t.current,a=String(e.charset??"")||d,n=String(e.fontFamily??"")||h,r=Math.round(m(Z(),8,96)),l=m(e.glyphWeight,.4,3),i=`${a}|${n}|${r}|${l}`;if(i!==D||!U){let e,t,o,u,c,d,h,f,p,m,v,g;D=i,U?.texture.dispose(),(e=Array.from(new Set(Array.from(a))).slice(0,180)).includes(" ")||e.unshift(" "),e.length<2&&e.push("\xb7"),o=.5*((t=Math.max(1,Math.round(.075*r*l)))%2==1),u=`500 ${Math.round(.78*r)}px ${n}`,c=(e,a,n,l)=>{e.fillStyle="#ffffff",e.strokeStyle="#ffffff",((e,t,a,n,r,l)=>{let i=t=>{e.beginPath(),e.arc(a,n,t,0,2*Math.PI),e.stroke()},o=t=>{e.beginPath(),e.arc(a,n,t,0,2*Math.PI),e.fill()},s=t=>{e.beginPath(),e.moveTo(a,n-t),e.lineTo(a+t,n),e.lineTo(a,n+t),e.lineTo(a-t,n),e.closePath()},u=t=>{e.beginPath(),e.moveTo(a,n-t),e.lineTo(a+.92*t,n+.6*t),e.lineTo(a-.92*t,n+.6*t),e.closePath()};switch(e.lineWidth=l,e.lineCap="round",e.lineJoin="round",t){case"\xb7":return o(Math.max(.065*r,.8*l)),!0;case"•":return o(.13*r),!0;case"●":return o(.25*r),!0;case"+":return e.beginPath(),e.moveTo(a-.2*r,n),e.lineTo(a+.2*r,n),e.moveTo(a,n-.2*r),e.lineTo(a,n+.2*r),e.stroke(),!0;case"\xd7":return e.beginPath(),e.moveTo(a-.16*r,n-.16*r),e.lineTo(a+.16*r,n+.16*r),e.moveTo(a+.16*r,n-.16*r),e.lineTo(a-.16*r,n+.16*r),e.stroke(),!0;case"○":return i(.26*r),!0;case"□":return e.beginPath(),e.rect(a-.23*r,n-.23*r,.46*r,.46*r),e.stroke(),!0;case"■":return e.fillRect(a-.21*r,n-.21*r,.42*r,.42*r),!0;case"◇":return s(.3*r),e.stroke(),!0;case"◆":return s(.28*r),e.fill(),!0;case"△":return u(.3*r),e.stroke(),!0;case"▲":return u(.28*r),e.fill(),!0;case"◎":return i(.28*r),o(.085*r),!0;case"◉":return i(.28*r),o(.15*r),!0;default:return!1}})(e,a,n+o,l+o,r,t)||(e.textAlign="center",e.textBaseline="middle",e.font=u,e.fillText(a,n,l+.04*r))},(d=document.createElement("canvas")).width=r,d.height=r,h=d.getContext("2d",{willReadFrequently:!0}),p=Math.ceil((f=e.map(e=>({character:e,ink:(e=>{if(!h||" "===e)return 0;h.fillStyle="#000000",h.fillRect(0,0,r,r),c(h,e,Math.floor(r/2),Math.floor(r/2));let t=h.getImageData(0,0,r,r).data,a=0;for(let e=0;e<t.length;e+=4)a+=t[e];return a})(e)})).sort((e,t)=>e.ink-t.ink).map(e=>e.character)).length/16),(m=document.createElement("canvas")).width=16*r,m.height=p*r,(v=m.getContext("2d"))&&(v.fillStyle="#000000",v.fillRect(0,0,m.width,m.height),f.forEach((e,t)=>{" "===e||c(v,e,t%16*r+Math.floor(r/2),Math.floor(t/16)*r+Math.floor(r/2))})),(g=new s.GOR(m)).minFilter=s.$_I,g.magFilter=s.k6q,g.generateMipmaps=!0,g.colorSpace=s.jf0,g.flipY=!1,g.anisotropy=4,g.needsUpdate=!0,U={texture:g,count:f.length,rows:p},M.uniforms.uAtlas.value=U.texture,M.uniforms.uAtlasGrid.value.set(16,U.rows),M.uniforms.uCount.value=U.count}})(),e=ee(),a=Math.ceil(X*$/e),n=Math.ceil(H*$/e),(l=`${a}|${n}`)===R&&G||(R=l,G?.dispose(),G=new s.nWS(a,n,{type:r,format:s.GWd,minFilter:s.hxR,magFilter:s.hxR,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1})),p=.2126*(u=g((i=t.current).backgroundColor,[.04,.04,.04]))[0]+.7152*u[1]+.0722*u[2],y="ink"===i.mode||"auto"===i.mode&&p>.5,w=b(g(i.colors[0],[.48,.36,1])),S=b(g(i.colors[1],[1,.62,.99])),C=X*$,k=H*$,F=et(),P=ee(),z=m(i.driftAngle,-360,360)*Math.PI/180,E=.03*m(i.drift,0,5),(W=v.uniforms).uCell.value.set(P,P),W.uResolution.value.set(C,k),W.uTime.value=_,W.uScale.value=m(i.scale,.2,5),W.uDrift.value.set(Math.cos(z)*E,-Math.sin(z)*E),W.uThreshold.value=.66-.26*m(i.density,0,1),W.uAmbient.value=m(i.ambient,0,1),W.uReveal.value=m(i.reveal,0,1),W.uPersistence.value=m(i.persistence,.05,10),W.uWidth.value=Math.max(1,.8*P*m(i.ringWidth,.2,5)),W.uFalloff.value=.25*F,f.forEach((e,t)=>{e.active?(o[t].set(e.x*C,(1-e.y)*k,e.born,e.amplitude),c[t].set(e.speed*F,e.range*F,+!!e.echo,Math.max(1,e.birth*F))):o[t].set(0,0,0,0)}),O=i.interactive&&i.echo&&!i.reduced?Q.presence:0,W.uObstacle.value.set(Q.sx,Q.sy,26*$,O*m(i.echoStrength,0,1)),(q=M.uniforms).uField.value=G?G.texture:null,q.uCell.value.set(P,P),q.uSpan.value=P/Math.max(1,Z()),q.uGamma.value=.9,q.uDither.value=.12/Math.sqrt(Math.max((U?.count??8)/8,1)),q.uInk.value=+!!y,q.uLabA.value.set(w[0],w[1],w[2]),q.uLabB.value.set(S[0],S[1],S[2]),(Y=j.uniforms).uBackground.value.set(x(u[0]),x(u[1]),x(u[2])),Y.uGlow.value=m(i.glow,0,3),Y.uExposure.value=(y?4:1.25)*m(i.intensity,0,4),Y.uMode.value=+!!y,Y.uGrain.value=V,G&&J(v,G),J(M,L);let N=L;for(let e of B)T.uniforms.uSource.value=N.texture,T.uniforms.uTexel.value.set(1/N.width,1/N.height),J(T,e),N=e;let K=B[B.length-1];for(let e=B.length-2;e>=0;e--)A.uniforms.uSource.value=K.texture,A.uniforms.uBase.value=B[e].texture,A.uniforms.uTexel.value.set(1/K.width,1/K.height),J(A,I[e]),K=I[e];j.uniforms.uLines.value=L.texture,j.uniforms.uBloom.value=K.texture,J(j,null)},ei=e=>{if(O=0,W)return;let a=Math.min(.05,Math.max(0,(e-q)/1e3));q=e,(e=>{let a=t.current,n=a.interactive&&a.echo&&Q.inside&&!a.reduced?1:0;if(Q.presence+=(n-Q.presence)*(1-Math.exp(-e/(n>Q.presence?.18:.35))),Q.placed){let t=1-Math.exp(-e/.05);Q.sx+=(Q.x-Q.sx)*t,Q.sy+=(Q.y-Q.sy)*t}else Q.sx=Q.x,Q.sy=Q.y,Q.placed=!0;if(a.paused||a.reduced)return;_+=e*m(a.speed,0,4);let r=m(a.interval,.6,30);if(a.autoPing){if(N>_+r&&(N=_+r),_>=N){let[e,t]=er();en(e,t,1,!1,.08,N),N=Math.max(N+r,_+.25*r)}}else N=_+.15*r;let l=et(),i=m(a.persistence,.05,10);for(let e of f)e.active&&(_-e.born)*e.speed*l>e.range*l+e.speed*l*i*4&&(e.active=!1);(()=>{let e=t.current,a=X*$,n=H*$,r=et(),l=26*$,i=e.interactive&&e.echo&&Q.presence>.5;for(let t of f){if(!t.active||t.echoed)continue;let o=(_-t.born)*t.speed*r,s=Math.hypot(Q.sx-t.x*a,Q.sy-(1-t.y)*n);if(s<3*l||o<s||(t.echoed=!0,!i||o-s>t.speed*r*.25))continue;let u=t.amplitude*ea(t,s)*.62*m(e.echoStrength,0,2);u>.04&&en(Q.sx/a,1-Q.sy/n,u,!0,.02)}})(),V=(V+.618034)%1})(a),el();let n=t.current,r=!n.paused&&!n.reduced,l=Math.abs(Q.presence-!!Q.inside)>.002;Y&&!document.hidden&&(r||l)&&(O=requestAnimationFrame(ei))};function eo(){W||O||!Y||(q=performance.now(),O=requestAnimationFrame(ei))}let es=()=>{let n=e.getBoundingClientRect();X=Math.max(1,n.width),H=Math.max(1,n.height),$=Math.min(window.devicePixelRatio||1,2)*m(t.current.quality,.25,1),a.setPixelRatio($),a.setSize(X,H,!1);let r=Math.round(X*$),l=Math.round(H*$);K(),L=E(r,l);let i=m(Math.floor(Math.log2(Math.min(r,l)/8)),3,6);for(let e=1;e<=i;e++)B.push(E(r>>e,l>>e)),I.push(E(r>>e,l>>e));el(),eo()},eu=t=>{let a=e.getBoundingClientRect();return[(t.clientX-a.left)*$,(a.height-(t.clientY-a.top))*$]},ec=e=>{if("touch"===e.pointerType)return;let[t,a]=eu(e);Q.x=t,Q.y=a,Q.inside||(Q.sx=t,Q.sy=a),Q.inside=!0,eo()},ed=e=>{let a=t.current;if(0!==e.button||!a.interactive||!a.clickPing||a.paused||a.reduced)return;let[n,r]=eu(e);en(n/(X*$),1-r/(H*$),1.15,!1,.025),eo()},eh=()=>{Q.inside=!1,eo()};e.addEventListener("pointermove",ec),e.addEventListener("pointerdown",ed),e.addEventListener("pointerleave",eh),e.addEventListener("pointercancel",eh);let ef=new ResizeObserver(es);ef.observe(e);let ep=new IntersectionObserver(e=>{(Y=e.some(e=>e.isIntersecting))&&eo()},{rootMargin:"80px"});ep.observe(e);let em=()=>{document.hidden||eo()};document.addEventListener("visibilitychange",em);let ev=e=>e.preventDefault();return n.addEventListener("webglcontextlost",ev),(()=>{let e=t.current;if(!e.autoPing)return;let a=m(e.interval,.6,30),[n,r]=er();en(n,r,1,!1,.08,_-1.42*a),en(n,r,1,!1,.08,_-.42*a),N=_+.58*a})(),es(),{sync:()=>{Math.abs(Math.min(window.devicePixelRatio||1,2)*m(t.current.quality,.25,1)-$)>.001?es():el(),eo()},destroy:()=>{W=!0,cancelAnimationFrame(O),e.removeEventListener("pointermove",ec),e.removeEventListener("pointerdown",ed),e.removeEventListener("pointerleave",eh),e.removeEventListener("pointercancel",eh),document.removeEventListener("visibilitychange",em),n.removeEventListener("webglcontextlost",ev),ef.disconnect(),ep.disconnect(),K(),G?.dispose(),U?.texture.dispose(),i.dispose(),[v,M,T,A,j].forEach(e=>e.dispose()),a.dispose(),a.forceContextLoss(),n.remove()},ping:(e,a)=>{let n=t.current;n.paused||n.reduced||(en(m(e,-1,2),m(a,-1,2),1.15,!1,.025),eo())}}})(e,en);return et.current=t,()=>{t?.destroy(),et.current=null}},[]),(0,r.useImperativeHandle)(Z,()=>({ping:(e,t)=>et.current?.ping(e??en.current.originX,t??en.current.originY)}),[]),(0,n.jsx)("div",{ref:ee,className:(0,c.cn)("relative isolate h-full min-h-[240px] w-full overflow-hidden",Q),style:{backgroundColor:t,...K},children:J&&(0,n.jsx)("div",{className:"relative z-10 h-full w-full",children:J})})});M.displayName="GlyphSonar";let T={geometric:" \xb7+\xd7○◎◉",dots:" \xb7•●",diamonds:" \xb7◇◆",ascii:" .:-=+*#%@",binary:" 01"},A=[{label:"Geometric",value:"geometric"},{label:"Dots",value:"dots"},{label:"Diamonds",value:"diamonds"},{label:"ASCII",value:"ascii"},{label:"Binary",value:"binary"}],j={dark:["#7C5CFF","#FF9FFC"],light:["#A594F9","#5227FF"],charset:"geometric",glyphSize:11,density:.5,scale:1,ambient:.35,interval:3.4,originX:.5,originY:.5,range:1,persistence:.6},P={aurora:j,horizon:{...j,originY:1.08,range:1.4,interval:3.6,density:.42},phosphor:{...j,dark:["#1F8A55","#C4FFD2"],light:["#9FD8B4","#0F5132"],persistence:1.2,interval:2.8},abyss:{...j,dark:["#2B4BFF","#8FE9FF"],light:["#AFC2FF","#1E3AB8"],density:.36,scale:1.4,ambient:.28,interval:4.6,persistence:1},amber:{...j,dark:["#F08C00","#FFE3B3"],light:["#F5C6A5","#9A3412"],charset:"diamonds"},shoal:{...j,glyphSize:9,density:.72,scale:.75,ambient:.45,interval:2.6},dots:{...j,charset:"dots",glyphSize:10},mono:{...j,dark:["#6B6B6B","#FFFFFF"],light:["#C4C4C4","#111111"]}},z=[{label:"Aurora",value:"aurora"},{label:"Horizon",value:"horizon"},{label:"Phosphor",value:"phosphor"},{label:"Abyss",value:"abyss"},{label:"Amber",value:"amber"},{label:"Shoal",value:"shoal"},{label:"Dots",value:"dots"},{label:"Mono",value:"mono"}],E=[{label:"Auto",value:"auto"},{label:"Glow",value:"glow"},{label:"Ink",value:"ink"}],L=[{name:"colors",type:"[string, string]",default:'["#7C5CFF", "#FF9FFC"]',description:"Colour of the resting shoals and colour of the echo where a ping strikes them, blended in OKLab. The crest of a strike burns toward white."},{name:"backgroundColor",type:"string",default:'"#0A0A0A"',description:"Colour of the open water."},{name:"mode",type:'"auto" | "glow" | "ink"',default:'"auto"',description:"glow adds light for dark backgrounds, ink prints coloured glyphs for light ones. auto picks from the background brightness."},{name:"charset",type:"string",default:'" \xb7+\xd7○◎◉"',description:"Glyphs the field is drawn with, sorted by how much ink each one uses, so any string works as a brightness ramp. \xb7 • ● + \xd7 ○ ◎ ◉ □ ■ ◇ ◆ △ ▲ are drawn as crisp vector shapes; anything else uses fontFamily."},{name:"fontFamily",type:"string",default:"system monospace",description:"Font for characters that are not built-in shapes. Use a font that is already loaded on the page."},{name:"glyphSize",type:"number",default:"11",description:"Size of each glyph in pixels."},{name:"spacing",type:"number",default:"1",description:"Gap between glyphs as a multiple of their size, from 0.7 (packed) to 3 (airy)."},{name:"glyphWeight",type:"number",default:"1",description:"Stroke weight of the built-in shapes, from 0.4 to 3."},{name:"density",type:"number",default:"0.5",description:"How much of the water the shoals cover, from 0 (a few faint contacts) to 1 (crowded)."},{name:"scale",type:"number",default:"1",description:"Size of the shoals. Larger values make fewer, broader shapes."},{name:"drift",type:"number",default:"1",description:"How fast the shoals drift and reshape, from 0 (still) to 5."},{name:"driftAngle",type:"number",default:"20",description:"Direction the shoals drift, in degrees. 0 drifts to the right, 90 upward."},{name:"ambient",type:"number",default:"0.35",description:"How visible the shoals are between pings, from 0 (only pings reveal them) to 1."},{name:"autoPing",type:"boolean",default:"true",description:"Send pings from the origin on a steady rhythm."},{name:"interval",type:"number",default:"3.4",description:"Seconds between automatic pings."},{name:"originX",type:"number",default:"0.5",description:"Horizontal position the automatic pings start from, from 0 (left) to 1 (right). Values outside that range move it off-frame."},{name:"originY",type:"number",default:"0.5",description:"Vertical position the automatic pings start from, from 0 (top) to 1 (bottom). Values above 1 let them rise from below the frame."},{name:"pingSpeed",type:"number",default:"1",description:"How fast each wavefront travels outward."},{name:"range",type:"number",default:"1",description:"How far a ping travels before it fades out."},{name:"ringWidth",type:"number",default:"1",description:"Thickness of the wavefront."},{name:"persistence",type:"number",default:"0.6",description:"Seconds a shoal keeps glowing after a wavefront passes, like phosphor on a sonar screen."},{name:"reveal",type:"number",default:"0.5",description:"How much faint structure around the shoals a ping uncovers as it passes, from 0 to 1."},{name:"glow",type:"number",default:"0.12",description:"Soft bloom around the brightest glyphs, from 0 to 3."},{name:"intensity",type:"number",default:"1",description:"Overall exposure."},{name:"speed",type:"number",default:"1",description:"Time scale for everything: drift, pings and their rhythm."},{name:"interactive",type:"boolean",default:"true",description:"Respond to the pointer."},{name:"clickPing",type:"boolean",default:"true",description:"Clicking sends a ping from that point. Every click adds its own wavefront, so pings overlap freely."},{name:"echo",type:"boolean",default:"true",description:"The pointer becomes an object in the water: wavefronts break around it, leaving a soft shadow behind, and bounce back as a smaller echo."},{name:"echoStrength",type:"number",default:"1",description:"Strength of the pointer's echo and shadow, from 0 to 2."},{name:"paused",type:"boolean",default:"false",description:"Freeze the field. Reduced-motion users always get a still frame."},{name:"quality",type:"number",default:"1",description:"Resolution scale from 0.25 to 1. Lower values are cheaper on large screens."},{name:"ref",type:"{ ping }",default:"—",description:"ping(x, y) sends a ping from a point given as fractions of the width and height. Without arguments it starts from the origin."},{name:"children",type:"ReactNode",default:"—",description:"Content placed over the background."},{name:"className",type:"string",default:"—",description:"Classes for the root element. It fills its parent, with a 240px minimum height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."}],B=()=>{let[e,t]=(0,o.I)(),a="dark"===(0,i.Y)(),[s,u]=(0,r.useState)("aurora"),[c,d]=(0,r.useState)(j),h=e=>t=>d(a=>({...a,[e]:t})),[f,p]=(0,r.useState)(null),m=f??(a?c.dark:c.light),v=e=>t=>{let a=[...m];a[e]=t,p(a)},[g,x]=(0,r.useState)(null),b=g??(a?"#0A0A0A":"#FFFFFF"),[y,w]=(0,r.useState)("auto"),[S,C]=(0,r.useState)(1),[k,F]=(0,r.useState)(1),[B,I]=(0,r.useState)(1),[G,R]=(0,r.useState)(20),[U,D]=(0,r.useState)(1),[W,O]=(0,r.useState)(1),[q,Y]=(0,r.useState)(.5),[_,N]=(0,r.useState)(1),[X,H]=(0,r.useState)(.12),[$,V]=(0,r.useState)(1),[Q,K]=(0,r.useState)(1),[J,Z]=(0,r.useState)(!0),[ee,et]=(0,r.useState)(!0),[ea,en]=(0,r.useState)(!0),[er,el]=(0,r.useState)(!0),[ei,eo]=(0,r.useState)(!1);return(0,n.jsxs)("div",{children:[(0,n.jsx)(l.Bg,{}),(0,n.jsxs)(l.VX,{children:[(0,n.jsxs)(l.Ec,{children:[(0,n.jsx)(l.Ch,{onRefresh:t,minHeight:560,enableResponsive:!0,children:(0,n.jsx)("div",{className:"relative h-full w-full",children:(0,n.jsx)(M,{colors:m,backgroundColor:b,mode:y,charset:T[c.charset]??T.geometric,glyphSize:c.glyphSize,spacing:S,glyphWeight:k,density:c.density,scale:c.scale,drift:B,driftAngle:G,ambient:c.ambient,autoPing:J,interval:c.interval,originX:c.originX,originY:c.originY,pingSpeed:U,range:c.range,ringWidth:W,persistence:c.persistence,reveal:q,glow:X,intensity:$,speed:Q,interactive:er,clickPing:ee,echo:ea,echoStrength:_,paused:ei},e)})}),(0,n.jsxs)(l.IH,{children:[(0,n.jsx)(l.bg,{title:"Preset",value:s,options:z,onChange:e=>{u(e),d(P[e]??j),p(null)}}),(0,n.jsx)(l.bg,{title:"Mode",value:y,options:E,onChange:e=>w(e)}),(0,n.jsx)(l.bg,{title:"Charset",value:c.charset,options:A,onChange:h("charset")}),(0,n.jsx)(l.W7,{title:"Shoals",value:m[0],onChange:v(0)}),(0,n.jsx)(l.W7,{title:"Echo",value:m[1],onChange:v(1)}),(0,n.jsx)(l.W7,{title:"Background",value:b,onChange:x}),(0,n.jsx)(l.yt,{title:"Glyph Size",min:6,max:24,step:1,value:c.glyphSize,valueUnit:"px",onChange:h("glyphSize")}),(0,n.jsx)(l.yt,{title:"Spacing",min:.7,max:3,step:.05,value:S,onChange:C}),(0,n.jsx)(l.yt,{title:"Glyph Weight",min:.4,max:3,step:.05,value:k,onChange:F}),(0,n.jsx)(l.yt,{title:"Density",min:0,max:1,step:.01,value:c.density,onChange:h("density")}),(0,n.jsx)(l.yt,{title:"Scale",min:.3,max:3,step:.05,value:c.scale,onChange:h("scale")}),(0,n.jsx)(l.yt,{title:"Drift",min:0,max:5,step:.05,value:B,onChange:I}),(0,n.jsx)(l.yt,{title:"Drift Angle",min:-180,max:180,step:1,value:G,valueUnit:"\xb0",onChange:R}),(0,n.jsx)(l.yt,{title:"Ambient",min:0,max:1,step:.01,value:c.ambient,onChange:h("ambient")}),(0,n.jsx)(l.yt,{title:"Interval",min:.8,max:10,step:.1,value:c.interval,valueUnit:"s",onChange:h("interval")}),(0,n.jsx)(l.yt,{title:"Origin X",min:-.2,max:1.2,step:.01,value:c.originX,onChange:h("originX")}),(0,n.jsx)(l.yt,{title:"Origin Y",min:-.2,max:1.4,step:.01,value:c.originY,onChange:h("originY")}),(0,n.jsx)(l.yt,{title:"Ping Speed",min:.2,max:3,step:.05,value:U,onChange:D}),(0,n.jsx)(l.yt,{title:"Range",min:.2,max:2.5,step:.05,value:c.range,onChange:h("range")}),(0,n.jsx)(l.yt,{title:"Ring Width",min:.4,max:3,step:.05,value:W,onChange:O}),(0,n.jsx)(l.yt,{title:"Persistence",min:.1,max:4,step:.05,value:c.persistence,valueUnit:"s",onChange:h("persistence")}),(0,n.jsx)(l.yt,{title:"Reveal",min:0,max:1,step:.01,value:q,onChange:Y}),(0,n.jsx)(l.yt,{title:"Echo Strength",min:0,max:2,step:.05,value:_,onChange:N}),(0,n.jsx)(l.yt,{title:"Glow",min:0,max:1,step:.01,value:X,onChange:H}),(0,n.jsx)(l.yt,{title:"Intensity",min:.2,max:3,step:.05,value:$,onChange:V}),(0,n.jsx)(l.yt,{title:"Speed",min:0,max:3,step:.05,value:Q,onChange:K}),(0,n.jsx)(l.tl,{title:"Auto Ping",checked:J,onChange:Z}),(0,n.jsx)(l.tl,{title:"Click Ping",checked:ee,onChange:et}),(0,n.jsx)(l.tl,{title:"Echo",checked:ea,onChange:en}),(0,n.jsx)(l.tl,{title:"Interactive",checked:er,onChange:el}),(0,n.jsx)(l.tl,{title:"Paused",checked:ei,onChange:eo})]}),(0,n.jsx)(l.Ub,{data:L})]}),(0,n.jsx)(l.lT,{children:(0,n.jsx)(l.Gv,{})})]})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>o});var n=a(12115),r=a(30701);let l=()=>()=>{},i=()=>"light";function o(){let{resolvedTheme:e}=(0,r.D)();return(0,n.useSyncExternalStore)(l,()=>"dark"===e?"dark":"light",i)}},90761:(e,t,a)=>{a.d(t,{I:()=>r});var n=a(12115);function r(){let[e,t]=(0,n.useState)(0),a=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);