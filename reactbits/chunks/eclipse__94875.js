"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[94875],{56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>n.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>f.CopyButton,IH:()=>r.Customize,gI:()=>m,Dn:()=>v,pi:()=>p,W7:()=>l.PreviewColor,Ch:()=>o.PreviewContainer,UD:()=>l.PreviewInput,bg:()=>l.PreviewSelect,yt:()=>l.PreviewSlider,tl:()=>l.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>i.PropTable,VX:()=>n.TabsLayout,bs:()=>d});var n=a(55019);a(27382);var o=a(10236),r=a(69485),l=a(48543),i=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var c=a(95155);a(66729);var f=a(28592),h=a(90650);let d="rounded-lg border bg-background";function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)(d,e),...a,children:t})}function v({title:e,description:t,className:a,children:n}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:n})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>i});var n=a(12115),o=a(30701);let r=()=>()=>{},l=()=>"light";function i(){let{resolvedTheme:e}=(0,o.D)();return(0,n.useSyncExternalStore)(r,()=>"dark"===e?"dark":"light",l)}},90761:(e,t,a)=>{a.d(t,{I:()=>o});var n=a(12115);function o(){let[e,t]=(0,n.useState)(0),a=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}},94875:(e,t,a)=>{a.r(t),a.d(t,{default:()=>E});var n=a(95155),o=a(12115),r=a(56388),l=a(86049),i=a(90761),s=a(2253),u=a(12246),c=a(90650);let f={circle:[0,0,0],blob:[1,0,0],triangle:[2,3,90],diamond:[2,4,45],pentagon:[2,5,90],hexagon:[2,6,90]},h=Object.keys(f),d=(e,t,a)=>Math.min(a,Math.max(t,e)),m=(e,t)=>Number.isFinite(e)?e:t,p=e=>e*Math.PI/180,v=new s.Q1f,g=e=>{let t=e.trim().toLowerCase();if(!t||"transparent"===t||"none"===t||"auto"===t)return null;try{v.setStyle(t,s.jf0)}catch{return null}return[v.r,v.g,v.b]},b=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),x=([e,t,a])=>{let n=b(e),o=b(t),r=b(a),l=Math.cbrt(.4122214708*n+.5363325363*o+.0514459929*r),i=Math.cbrt(.2119034982*n+.6806995451*o+.1073969566*r),s=Math.cbrt(.0883024619*n+.2817188376*o+.6299787005*r);return[.2104542553*l+.793617785*i-.0040720468*s,1.9779984951*l-2.428592205*i+.4505937099*s,.0259040371*l+.7827717662*i-.808675766*s]},y=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},w=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,C=`
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,S=`
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uCenter;
uniform vec2 uLight;
uniform float uSize;
uniform float uShape;
uniform float uSides;
uniform float uRound;
uniform float uRotation;
uniform float uWobble;
uniform float uLightAngle;
uniform float uLightScale;
uniform float uContrast;
uniform float uIntensity;
uniform float uReach;
uniform float uRim;
uniform float uSoft;
uniform float uInterior;
uniform float uStreaks;
uniform float uAmbient;
uniform float uColorAngle;
uniform float uBloomIn;
uniform float uHeat;
uniform vec3 uLabA;
uniform vec3 uLabB;
uniform vec3 uDeep;
uniform vec4 uFlares[6];
in vec2 vUv;
out vec4 fragColor;

const float TAU = 6.28318530718;
const float PI = 3.14159265359;

vec3 fromLab(vec3 lab) {
  vec3 lms = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.291485548) * lab;
  lms = lms * lms * lms;
  return max(mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * lms, 0.0);
}

vec2 gradient(vec2 cell) {
  float angle = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453) * TAU;
  return vec2(cos(angle), sin(angle));
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(gradient(i), f);
  float b = dot(gradient(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(gradient(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(gradient(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.4;
}

float around(float angle, float scale, float t) {
  return noise(vec2(cos(angle), sin(angle)) * scale + vec2(t, -t * 0.7));
}

float polygon(vec2 p, float apothem, float sides) {
  float w = TAU / sides;
  float a = atan(p.y, p.x);
  float k = floor((a + 0.5 * w) / w);
  float c = cos(k * w);
  float s = sin(k * w);
  vec2 q = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
  float half_ = apothem * tan(PI / sides);
  return length(q - vec2(apothem, clamp(q.y, -half_, half_))) * sign(q.x - apothem);
}

float outline(float angle) {
  float r = 1.0;
  if (uShape > 0.5 && uShape < 1.5) {
    vec2 direction = vec2(cos(angle - uRotation), sin(angle - uRotation));
    float drift = 0.04 * sin(uTime * 0.11);
    vec2 first = vec2(-0.2 - drift, 0.06);
    vec2 second = vec2(0.46 + drift, -0.14);
    float t = 0.9;
    for (int i = 0; i < 6; i++) {
      vec2 q = direction * t;
      float a = length(q - first) - 0.74;
      float b = length(q - second) - 0.5;
      float h = clamp(0.5 + 0.5 * (b - a) / 0.3, 0.0, 1.0);
      t -= mix(b, a, h) - 0.3 * h * (1.0 - h);
    }
    r = t;
  } else if (uShape > 1.5) {
    float corner = uRound * 0.45;
    float apothem = cos(PI / uSides);
    vec2 direction = vec2(cos(angle - uRotation), sin(angle - uRotation));
    float t = 1.0;
    for (int i = 0; i < 5; i++) t -= polygon(direction * t, apothem - corner, uSides) - corner;
    r = t;
  }
  float sway = uShape > 1.5 ? 0.25 : 1.0;
  return r * (1.0 + uWobble * sway * around(angle, 1.2, uTime * 0.05));
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime;
  vec2 fromCenter = p - uCenter;
  float angle = atan(fromCenter.y, fromCenter.x);
  float radius = outline(angle) * uSize;
  float edge = (length(fromCenter) - radius) / uSize;
  vec2 fromLight = p - (uCenter + uLight * uSize);
  float lightAngle = atan(fromLight.y, fromLight.x);
  float beyond = (length(fromLight) - outline(lightAngle) * uSize * uLightScale) / uSize;
  float reach = max(uReach * uBloomIn, 0.05);
  float outside = max(beyond, 0.0);
  float spread = outside / (0.5 * reach);
  float corona = exp(-spread * spread) * 0.82 + exp(-outside / (0.9 * reach)) * 0.18;
  float facing = pow(max(0.5 + 0.5 * cos(angle - uLightAngle), 0.0), 1.5);
  float patches = mix(1.0 - uContrast, 1.0, facing) * (0.8 + 0.4 * (0.5 + 0.5 * around(angle, 1.4, t * 0.05)));
  float fine = around(lightAngle, 6.0, t * 0.03) * 0.7 + around(lightAngle, 13.0, t * 0.02) * 0.3;
  float streak = max(1.0 + uStreaks * fine * smoothstep(0.0, 0.3, beyond), 0.0);
  float visible = smoothstep(-0.5 * uSoft, uSoft, edge);
  float blend = 0.5 + 0.5 * cos(angle - uColorAngle + 0.4 * around(angle, 1.1, t * 0.04));
  vec3 lab = mix(uLabA, uLabB, blend);
  vec3 tint = fromLab(lab);
  vec3 hot = fromLab(vec3(max(lab.x, 0.93), lab.yz * 0.45));
  vec3 color = mix(tint, hot, uHeat * exp(-outside / (0.09 * reach)) * facing);
  color = mix(color, uDeep * 3.0, smoothstep(0.1, 1.0, outside / reach));
  float flare = 0.0;
  for (int i = 0; i < 6; i++) {
    vec4 f = uFlares[i];
    if (f.z <= 0.0) continue;
    float turn = atan(sin(angle - f.x), cos(angle - f.x));
    float grow = 1.0 - exp(-f.y / 0.6);
    float width = 0.22 + grow * 0.16;
    float plume = 0.06 + grow * 0.26;
    float envelope = f.z * smoothstep(0.0, 0.12, f.y) * exp(-f.y / 1.2);
    float arc = exp(-turn * turn / (width * width));
    flare += envelope * arc * exp(-max(edge, 0.0) / plume);
  }
  vec3 light = color * corona * patches * streak * visible * uIntensity * uBloomIn;
  light += mix(tint, hot, 0.5) * flare * visible * uIntensity * 2.2;
  light += tint * exp(min(edge, 0.0) / max(0.08 * uRim, 0.002)) * (1.0 - visible) * patches * uIntensity * uBloomIn * 0.6 * smoothstep(-0.6, 0.0, beyond);
  float core = clamp(length(fromCenter) / max(radius, 0.0001), 0.0, 1.0);
  vec3 conic = fromLab(mix(uLabA, uLabB, 0.5 + 0.5 * cos(angle - uColorAngle * 0.7 + 1.0)));
  light += conic * uInterior * pow(core, 1.6) * (0.35 + 0.65 * (0.5 + 0.5 * around(angle, 0.9, t * 0.05))) * (1.0 - visible) * 0.6 * uBloomIn;
  float field = exp(-outside / (1.4 * max(uReach, 0.05)));
  float wide = exp(-outside / (2.6 * max(uReach, 0.05)));
  light += uDeep * uAmbient * mix(0.03, mix(0.08 * wide, 1.0, field), visible) * uBloomIn;
  fragColor = vec4(light, 1.0);
}
`,k=`
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;
in vec2 vUv;
out vec4 fragColor;
vec3 tap(vec2 d) { return texture(uSource, vUv + d * uTexel).rgb; }
void main() {
  vec3 a = tap(vec2(-2.0, 2.0));
  vec3 b = tap(vec2(0.0, 2.0));
  vec3 c = tap(vec2(2.0, 2.0));
  vec3 d = tap(vec2(-2.0, 0.0));
  vec3 e = tap(vec2(0.0, 0.0));
  vec3 f = tap(vec2(2.0, 0.0));
  vec3 g = tap(vec2(-2.0, -2.0));
  vec3 h = tap(vec2(0.0, -2.0));
  vec3 i = tap(vec2(2.0, -2.0));
  vec3 j = tap(vec2(-1.0, 1.0));
  vec3 k = tap(vec2(1.0, 1.0));
  vec3 l = tap(vec2(-1.0, -1.0));
  vec3 m = tap(vec2(1.0, -1.0));
  vec3 color = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  if (uThreshold > 0.0) {
    float peak = max(color.r, max(color.g, color.b));
    float knee = 0.6;
    float soft = clamp(peak - uThreshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 0.00001);
    color *= max(soft, peak - uThreshold) / max(peak, 0.00001);
  }
  fragColor = vec4(color, 1.0);
}
`,L=`
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;
vec3 tap(vec2 d) { return texture(uSource, vUv + d * uTexel).rgb; }
void main() {
  vec3 color = tap(vec2(0.0)) * 4.0
    + (tap(vec2(-1.0, 0.0)) + tap(vec2(1.0, 0.0)) + tap(vec2(0.0, -1.0)) + tap(vec2(0.0, 1.0))) * 2.0
    + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0));
  fragColor = vec4(color / 16.0, 1.0);
}
`,j=`
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform float uBloomStrength;
uniform float uGrain;
uniform float uTime;
uniform float uInk;
in vec2 vUv;
out vec4 fragColor;

vec3 neutral(vec3 color) {
  const float start = 0.76;
  const float desaturation = 0.15;
  float x = min(color.r, min(color.g, color.b));
  float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
  color -= offset;
  float peak = max(color.r, max(color.g, color.b));
  if (peak < start) return color;
  const float d = 1.0 - start;
  float next = 1.0 - d * d / (peak + d - start);
  color *= next / peak;
  float g = 1.0 - 1.0 / (desaturation * (peak - next) + 1.0);
  return mix(color, vec3(next), g);
}

vec3 encode(vec3 c) {
  c = max(c, 0.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec3 emission = texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uBloomStrength;
  float n = hash(gl_FragCoord.xy + fract(uTime * 13.0) * 911.0) - 0.5;
  float dither = (hash(gl_FragCoord.xy * 1.7 + 0.5) - 0.5) / 255.0;
  if (uInk > 0.5) {
    float peak = max(emission.r, max(emission.g, emission.b));
    vec3 hue = emission / max(peak, 0.0001);
    float cover = 1.0 - exp(-peak * 1.4);
    vec3 color = mix(uBackground, encode(hue * 0.62), cover);
    color += (n * uGrain * 0.05 + dither) * smoothstep(0.0, 0.05, cover);
    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    return;
  }
  vec3 light = encode(neutral(max(emission, 0.0))) * 0.88;
  vec3 color = 1.0 - (1.0 - uBackground) * (1.0 - light);
  float mask = smoothstep(0.0, 0.03, max(light.r, max(light.g, light.b)));
  color += (n * uGrain * 0.07 + dither) * mask;
  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`,A=(0,o.forwardRef)(function({colors:e=["#5227FF","#FF9FFC"],backgroundColor:t="transparent",shape:a="circle",size:r=.36,offsetX:l=0,offsetY:i=0,rotation:v=0,spin:b=2,roundness:A=.2,wobble:F=.03,lightAngle:I=-35,lightOffset:T=.12,corona:M=1,intensity:R=1,rim:E=1,softness:B=.2,contrast:z=.35,interior:P=0,streaks:Y=0,ambient:U=.35,speed:D=1,parallax:X=.5,interactive:_=!0,flareStrength:q=1,bloom:O=.5,grain:W=.3,intro:N=!0,paused:H=!1,dpr:G=2,children:V,className:Q,style:Z},$){let J=(0,o.useRef)(null),K=(0,o.useRef)(null),ee=(0,o.useRef)(null),et={colors:e,backgroundColor:t,shape:a,size:r,offsetX:l,offsetY:i,rotation:v,spin:b,roundness:A,wobble:F,lightAngle:I,lightOffset:T,corona:M,intensity:R,rim:E,softness:B,contrast:z,interior:P,streaks:Y,ambient:U,speed:D,parallax:X,interactive:_,flareStrength:q,bloom:O,grain:W,intro:N,paused:H,dpr:G,reduced:(0,o.useSyncExternalStore)(y,w,()=>!1)},ea=(0,o.useRef)(et);(0,o.useEffect)(()=>{ea.current=et,ee.current?.sync()}),(0,o.useEffect)(()=>{let e=J.current,t=K.current;if(!e||!t)return;let a=function(e,t,a){let n,o=e.ownerDocument,r=o.defaultView??window,l=o.createElement("canvas");l.setAttribute("aria-hidden","true"),l.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block";try{n=new u.WebGLRenderer({canvas:l,alpha:!1,antialias:!1,powerPreference:"high-performance"})}catch{return null}t.appendChild(l),n.autoClear=!1;let i=n.extensions.has("EXT_color_buffer_float")||n.extensions.has("EXT_color_buffer_half_float")?s.ix0:s.OUM,c=new s.qUd(-1,1,1,-1,-1,1),v=new s.LoY;v.setAttribute("position",new s.qtW([-1,-1,0,3,-1,0,-1,3,0],3));let b=new s.Z58,y=new s.eaF(v);y.frustumCulled=!1,b.add(y);let w=Array.from({length:6},()=>new s.IUQ(0,0,0,0)),A=(e,t,a=!1)=>new s.D$Q({glslVersion:s.Wdf,vertexShader:C,fragmentShader:e,uniforms:t,blending:a?s.EZo:s.XIg,transparent:a,depthTest:!1,depthWrite:!1}),F={uRes:{value:new s.I9Y(1,1)},uTime:{value:0},uCenter:{value:new s.I9Y},uLight:{value:new s.I9Y},uSize:{value:.36},uShape:{value:0},uSides:{value:6},uRound:{value:.2},uRotation:{value:0},uWobble:{value:.03},uLightAngle:{value:0},uLightScale:{value:1.08},uContrast:{value:.35},uIntensity:{value:1.8},uReach:{value:.8},uRim:{value:1},uSoft:{value:.035},uInterior:{value:0},uStreaks:{value:0},uAmbient:{value:.6},uColorAngle:{value:0},uBloomIn:{value:1},uHeat:{value:.6},uLabA:{value:new s.Pq0},uLabB:{value:new s.Pq0},uDeep:{value:new s.Pq0},uFlares:{value:w}},I=A(S,F),T=()=>new s.nWS(1,1,{type:i,format:s.GWd,depthBuffer:!1,stencilBuffer:!1,minFilter:s.k6q,magFilter:s.k6q,generateMipmaps:!1}),M=T(),R=Array.from({length:5},T),E=new s.Pq0(.04,.04,.04),B=A(k,{uSource:{value:null},uTexel:{value:new s.I9Y},uThreshold:{value:0}}),z=A(L,{uSource:{value:null},uTexel:{value:new s.I9Y}},!0),P=A(j,{uScene:{value:M.texture},uBloom:{value:R[0].texture},uBackground:{value:E},uBloomStrength:{value:.1},uGrain:{value:.3},uTime:{value:0},uInk:{value:0}}),Y=0,U=0,D=1,X=!1,_="",q=!1,O=-10,W=0,N=0,H=0,G=0,V=0,Q=0,Z=0,$=-1,J=1,K=0,ee=0,et=!1,ea=!1,en=!1,eo=[],er=()=>{let t=a.current,n=g(t.backgroundColor)??(()=>{let t=e.parentElement;for(;t;){let e=r.getComputedStyle(t).backgroundColor.match(/rgba?\(([^)]+)\)/);if(e){let t=e[1].split(",").map(e=>Number.parseFloat(e));if(t.length<4||t[3]>.05)return[t[0]/255,t[1]/255,t[2]/255]}t=t.parentElement}let a=r.getComputedStyle(e).color.match(/rgba?\(([^)]+)\)/);if(a){let e=a[1].split(",").map(e=>Number.parseFloat(e));return e[0]+e[1]+e[2]>382?[.04,.04,.04]:[1,1,1]}return[.04,.04,.04]})(),o=[n.join(","),t.colors[0],t.colors[1]].join("|");if(o===_)return;_=o,q=.2126*n[0]+.7152*n[1]+.0722*n[2]>.55,E.set(n[0],n[1],n[2]);let l=x(g(t.colors[0])??[.32,.15,1]),i=x(g(t.colors[1])??[1,.62,.99]);F.uLabA.value.set(l[0],l[1],l[2]),F.uLabB.value.set(i[0],i[1],i[2]);let s=(([e,t,a])=>{let n=Math.pow(e+.3963377774*t+.2158037573*a,3),o=Math.pow(e-.1055613458*t-.0638541728*a,3),r=Math.pow(e-.0894841775*t-1.291485548*a,3);return[Math.max(0,4.0767416621*n-3.3077115913*o+.2309699292*r),Math.max(0,-1.2684380046*n+2.6097574011*o-.3413193965*r),Math.max(0,-.0041960863*n-.7034186147*o+1.707614701*r)]})([.2,.85*l[1],.85*l[2]]);F.uDeep.value.set(s[0],s[1],s[2]),P.uniforms.uInk.value=+!!q},el=()=>{let t=a.current,o=Math.round(e.clientWidth),l=Math.round(e.clientHeight);if(o<2||l<2)return X=!1,!1;let i=Math.min(r.devicePixelRatio||1,d(m(t.dpr,2),.5,3));if(X&&o===Y&&l===U&&i===D)return!1;X=!0,Y=o,U=l,D=i,n.setPixelRatio(D),n.setSize(Y,U,!1);let s=Math.max(1,Math.round(Y*D*.5)),u=Math.max(1,Math.round(U*D*.5));M.setSize(s,u),F.uRes.value.set(s,u);let c=s,f=u;for(let e of R)c=Math.max(1,Math.round(c/2)),f=Math.max(1,Math.round(f/2)),e.setSize(c,f);return!0},ei=()=>{let e=a.current,t=Y/Math.max(U,1);return{x:d(m(e.offsetX,0),-1,1)*t,y:-d(m(e.offsetY,0),-1,1)}},es=()=>{if(!X)return;let e=a.current;performance.now()-O>1e3&&(O=performance.now(),er()),(()=>{let e=a.current,[t,n,o]=f[h.includes(e.shape)?e.shape:"circle"],r=ei(),l=d(m(e.size,.36),.05,2)*Math.min(1,Y/Math.max(U,1)),i=.03*d(m(e.parallax,.5),0,2);F.uCenter.value.set(r.x-G*i,r.y-V*i);let s=p(m(e.lightAngle,-35))+.3*Math.sin(.07*W),u=d(m(e.lightOffset,.12),0,.6),c=.36*d(m(e.parallax,.5),0,2);F.uLight.value.set(Math.cos(s)*u+G*c,Math.sin(s)*u+V*c),F.uLightAngle.value=Math.atan2(F.uLight.value.y,F.uLight.value.x),F.uSize.value=l,F.uShape.value=t,F.uSides.value=Math.max(n,3),F.uRound.value=d(m(e.roundness,.2),0,1),F.uRotation.value=p(o+m(e.rotation,0))+N,F.uWobble.value=d(m(e.wobble,.03),0,.3),F.uLightScale.value=1.04+.35*u,F.uContrast.value=d(m(e.contrast,.35),0,1),F.uIntensity.value=1.8*d(m(e.intensity,1),0,4),F.uReach.value=.8*d(m(e.corona,1),.1,3),F.uRim.value=d(m(e.rim,1),0,3),F.uSoft.value=.008+.08*d(m(e.softness,.2),0,1),F.uInterior.value=d(m(e.interior,0),0,1),F.uStreaks.value=d(m(e.streaks,0),0,1),F.uAmbient.value=d(m(e.ambient,.35),0,2)*(q?.3:1),F.uHeat.value=.65,F.uColorAngle.value=s-.4+H,F.uTime.value=W,F.uBloomIn.value=J;for(let e=0;e<6;e++){let t=eo[e];t?w[e].set(t.angle,W-t.born,t.strength,0):w[e].set(0,0,0,0)}P.uniforms.uGrain.value=d(m(e.grain,.3),0,1),P.uniforms.uTime.value=W})(),y.material=I,n.setRenderTarget(M),n.render(b,c);let t=d(m(e.bloom,.5),0,3)*(q?.5:1);if(t>.001){let e=M;for(let t of(y.material=B,R))B.uniforms.uThreshold.value=.85*(e===M),B.uniforms.uSource.value=e.texture,B.uniforms.uTexel.value.set(1/e.width,1/e.height),n.setRenderTarget(t),n.render(b,c),e=t;y.material=z;for(let e=R.length-1;e>0;e--)z.uniforms.uSource.value=R[e].texture,z.uniforms.uTexel.value.set(1/R[e].width,1/R[e].height),n.setRenderTarget(R[e-1]),n.render(b,c)}P.uniforms.uBloomStrength.value=t/R.length,y.material=P,n.setRenderTarget(null),n.render(b,c)},eu=(e,t)=>{if(eo.length>=6){let e=0;for(let t=1;t<eo.length;t++)eo[t].born<eo[e].born&&(e=t);if(W-eo[e].born<.8)return;eo.splice(e,1)}eo.push({angle:e,born:W,strength:t})},ec=()=>{ea||en||!et||K||(K=requestAnimationFrame(ef))},ef=e=>{if(K=0,ea||en)return;let t=a.current,n=ee&&e-ee<100?Math.min(Math.max((e-ee)/1e3,0),.05):1/60;ee=e;let r=!t.reduced&&!t.paused;if(r){let e=d(m(t.speed,1),0,4);W+=n*e,N+=n*p(d(m(t.spin,2),-90,90))*e,H+=.04*n*e}t.intro&&!t.reduced?($<0&&($=e),J=1-Math.pow(1-d((e-$)/1e3/3,0,1),3)):J=1;let l=t.reduced?1:1-Math.exp(-n/.45);G+=(Q-G)*l,V+=(Z-V)*l;for(let e=eo.length-1;e>=0;e--)W-eo[e].born>4&&eo.splice(e,1);es();let i=Math.abs(Q-G)>5e-4||Math.abs(Z-V)>5e-4;(r||i||J<1)&&!o.hidden?K=requestAnimationFrame(ef):ee=0},eh=null,ed=e=>{var t;!e.isPrimary||(t=e.target)&&"function"==typeof t.closest&&t.closest("a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]")||("mouse"!==e.pointerType||0===e.button)&&(eh={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()})},em=t=>{let n=eh;if(eh=null,!n||n.id!==t.pointerId||Math.hypot(t.clientX-n.x,t.clientY-n.y)>10||performance.now()-n.time>600)return;let o=a.current;if(!o.interactive||o.reduced||o.paused)return;let r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)return;let l=ei(),i=(t.clientX-r.left-r.width/2)/r.height-l.x;eu(Math.atan2((r.top+r.height/2-t.clientY)/r.height-l.y,i),d(m(o.flareStrength,1),0,2)),ec()},ep=t=>{if("touch"===t.pointerType)return;let a=e.getBoundingClientRect();a.width<=0||a.height<=0||(Q=d(((t.clientX-a.left)/a.width-.5)*2,-1,1),Z=d((.5-(t.clientY-a.top)/a.height)*2,-1,1),ec())},ev=e=>{"touch"!==e.pointerType&&(Q=0,Z=0,ec())},eg=()=>{eh=null},eb=()=>{ee=0,ec()},ex=e=>{e.preventDefault(),en=!0,cancelAnimationFrame(K),K=0},ey=()=>{en=!1,_="",ec()},ew=new ResizeObserver(()=>{el()&&(es(),ec())}),eC=new IntersectionObserver(([e])=>{et=e.isIntersecting,ee=0,ec()},{rootMargin:"120px"});return e.addEventListener("pointerdown",ed),e.addEventListener("pointerup",em),e.addEventListener("pointermove",ep),e.addEventListener("pointerleave",ev),e.addEventListener("pointercancel",eg),o.addEventListener("visibilitychange",eb),l.addEventListener("webglcontextlost",ex),l.addEventListener("webglcontextrestored",ey),ew.observe(e),eC.observe(e),a.current.intro&&!a.current.reduced&&(J=0),el(),er(),{sync:()=>{O=-10,el(),ee=0,!K&&et&&(es(),ec())},flare:(e,t)=>{let n=a.current;n.reduced||(eu(void 0===e?Math.random()*Math.PI*2:p(m(e,0)),d(m(t??n.flareStrength,1),0,2)),ec())},replay:()=>{a.current.reduced||($=-1,J=0,ee=0,ec())},destroy:()=>{for(let t of(ea=!0,cancelAnimationFrame(K),ew.disconnect(),eC.disconnect(),e.removeEventListener("pointerdown",ed),e.removeEventListener("pointerup",em),e.removeEventListener("pointermove",ep),e.removeEventListener("pointerleave",ev),e.removeEventListener("pointercancel",eg),o.removeEventListener("visibilitychange",eb),l.removeEventListener("webglcontextlost",ex),l.removeEventListener("webglcontextrestored",ey),v.dispose(),I.dispose(),B.dispose(),z.dispose(),P.dispose(),M.dispose(),R))t.dispose();n.dispose(),l.remove()}}}(e,t,ea);return ee.current=a,()=>{a?.destroy(),ee.current=null}},[]),(0,o.useImperativeHandle)($,()=>({flare:(e,t)=>ee.current?.flare(e,t),replay:()=>ee.current?.replay()}),[]);let en=t.trim().toLowerCase();return(0,n.jsxs)("div",{ref:J,className:(0,c.cn)("relative isolate h-full min-h-[320px] w-full overflow-hidden",Q),style:{backgroundColor:"transparent"===en||""===en?void 0:t,touchAction:"pan-y",...Z},children:[(0,n.jsx)("div",{ref:K,"aria-hidden":"true",style:{position:"absolute",inset:0,pointerEvents:"none"}}),V?(0,n.jsx)("div",{style:{position:"relative",zIndex:1,height:"100%"},children:V}):null]})});A.displayName="Eclipse";let F={colors:["#5227FF","#FF9FFC"],shape:"circle",size:.36,offsetX:0,offsetY:0,rotation:0,roundness:.2,wobble:.03,lightAngle:-35,lightOffset:.12,corona:1,intensity:1,softness:.2,contrast:.35,interior:0,streaks:0,ambient:.35},I={totality:F,lagoon:{...F,colors:["#3D86E0","#9BE8B8"],size:.48,offsetX:-.24,offsetY:-.05,contrast:.3,ambient:1},gilded:{...F,colors:["#5B7FE0","#E8B24A"],size:.53,offsetX:.2,offsetY:.03,lightAngle:200,lightOffset:.1,contrast:.25,interior:.7,streaks:.25,ambient:.5},twin:{...F,colors:["#7FD8F0","#E040E0"],shape:"blob",size:.4,offsetX:-.03,offsetY:.04,rotation:20,lightAngle:140,contrast:.2,intensity:1.3,softness:.12,ambient:0},verdant:{...F,colors:["#3A6BD8","#C8E84A"],shape:"hexagon",size:.55,offsetX:.05,offsetY:.03,rotation:10,roundness:.3,wobble:.12,lightAngle:200,contrast:.4,ambient:.2},ember:{...F,colors:["#3070E0","#F06A28"],shape:"hexagon",size:.42,roundness:.22,lightAngle:100,lightOffset:.06,corona:.8,intensity:1.3,softness:.12,contrast:.15,ambient:0},prism:{...F,colors:["#7B4CF0","#F26DB5"],shape:"diamond",size:.6,roundness:.06,lightAngle:175,lightOffset:.08,corona:.7,intensity:1.3,softness:.06,contrast:.5,streaks:.2,ambient:0},shard:{...F,colors:["#5227FF","#B19EEF"],shape:"triangle",size:.5,offsetX:.12,offsetY:.06,roundness:.25,lightAngle:90,ambient:.4}},T=[{label:"Totality",value:"totality"},{label:"Lagoon",value:"lagoon"},{label:"Gilded",value:"gilded"},{label:"Twin",value:"twin"},{label:"Verdant",value:"verdant"},{label:"Ember",value:"ember"},{label:"Prism",value:"prism"},{label:"Shard",value:"shard"}],M=[{label:"Circle",value:"circle"},{label:"Blob",value:"blob"},{label:"Triangle",value:"triangle"},{label:"Diamond",value:"diamond"},{label:"Pentagon",value:"pentagon"},{label:"Hexagon",value:"hexagon"}],R=[{name:"colors",type:"[string, string]",default:'["#5227FF", "#FF9FFC"]',description:"The two colours of the light, blended around the eclipse. The deep field colour is derived from the first. On light backgrounds they become matching inks."},{name:"backgroundColor",type:"string",default:'"transparent"',description:"Background of the component. Transparent reads the colour behind the component."},{name:"shape",type:'"circle" | "blob" | "triangle" | "diamond" | "pentagon" | "hexagon"',default:'"circle"',description:"The dark shape in front of the light."},{name:"size",type:"number",default:"0.36",description:"Radius of the shape as a share of the frame height. Larger values crop it."},{name:"offsetX",type:"number",default:"0",description:"Moves the eclipse sideways, as a share of the frame width."},{name:"offsetY",type:"number",default:"0",description:"Moves the eclipse down (positive) or up (negative), as a share of the frame height."},{name:"rotation",type:"number",default:"0",description:"Rotation of the shape, in degrees."},{name:"spin",type:"number",default:"2",description:"Slow rotation of the shape, in degrees per second."},{name:"roundness",type:"number",default:"0.2",description:"Rounds the corners of the polygon shapes."},{name:"wobble",type:"number",default:"0.03",description:"Slow organic breathing of the outline."},{name:"lightAngle",type:"number",default:"-35",description:"Direction the light leaks from, in degrees (0 is right, 90 is up)."},{name:"lightOffset",type:"number",default:"0.12",description:"How far the light sits behind the shape off-centre, which thickens the crescent on that side."},{name:"corona",type:"number",default:"1",description:"How far the glow spreads out from the shape."},{name:"intensity",type:"number",default:"1",description:"Brightness of the light."},{name:"rim",type:"number",default:"1",description:"Width of the coloured band of light just inside the shape's edge."},{name:"softness",type:"number",default:"0.2",description:"Blur of the shape's silhouette."},{name:"contrast",type:"number",default:"0.35",description:"How much brighter the lit side is than the far side."},{name:"interior",type:"number",default:"0",description:"Lets a sweep of colour show through the shape, like light behind smoked glass."},{name:"streaks",type:"number",default:"0",description:"Soft radial streaks running through the glow."},{name:"ambient",type:"number",default:"0.35",description:"Strength of the deep colour washing the space around the eclipse."},{name:"speed",type:"number",default:"1",description:"Speed of the drifting light, colour and outline."},{name:"parallax",type:"number",default:"0.5",description:"How far the light peeks around the shape toward the pointer."},{name:"interactive",type:"boolean",default:"true",description:"Click or tap to make the light flare out from that side of the shape."},{name:"flareStrength",type:"number",default:"1",description:"Brightness of the flare a click sends out, from 0 to 2."},{name:"bloom",type:"number",default:"0.5",description:"Soft glow around the brightest light."},{name:"grain",type:"number",default:"0.3",description:"Fine film grain over the lit areas."},{name:"intro",type:"boolean",default:"true",description:"The corona brightens and spreads out from the shape when the component appears."},{name:"paused",type:"boolean",default:"false",description:"Stops the motion. Reduced-motion users get a still eclipse."},{name:"dpr",type:"number",default:"2",description:"Maximum device pixel ratio for the canvas."},{name:"children",type:"ReactNode",default:"—",description:"Content laid over the scene. Clicks on its links and buttons never trigger flares."},{name:"ref",type:"{ flare, replay }",default:"—",description:"flare(angle?, strength?) sends a flare from an angle in degrees, replay() plays the intro again."},{name:"className",type:"string",default:"—",description:"Classes for the root element. It fills its parent, with a 320px minimum height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."}],E=()=>{let[e,t]=(0,i.I)(),a=(0,l.Y)(),[s,u]=(0,o.useState)("totality"),[c,f]=(0,o.useState)(I.totality),h=e=>t=>f(a=>({...a,[e]:t})),[d,m]=(0,o.useState)(null),p=d??("dark"===a?"#0A0A0A":"#FFFFFF"),[v,g]=(0,o.useState)(2),[b,x]=(0,o.useState)(1),[y,w]=(0,o.useState)(1),[C,S]=(0,o.useState)(.5),[k,L]=(0,o.useState)(1),[j,F]=(0,o.useState)(.5),[E,B]=(0,o.useState)(.3),[z,P]=(0,o.useState)(!0),[Y,U]=(0,o.useState)(!0),[D,X]=(0,o.useState)(!1);return(0,n.jsxs)("div",{children:[(0,n.jsx)(r.Bg,{}),(0,n.jsxs)(r.VX,{children:[(0,n.jsxs)(r.Ec,{children:[(0,n.jsx)(r.Ch,{onRefresh:t,minHeight:560,enableResponsive:!0,children:(0,n.jsx)("div",{className:"relative h-full w-full",children:(0,n.jsx)(A,{...c,backgroundColor:p,spin:v,rim:b,speed:y,parallax:C,flareStrength:k,bloom:j,grain:E,interactive:z,intro:Y,paused:D},e)})}),(0,n.jsxs)(r.IH,{children:[(0,n.jsx)(r.bg,{title:"Preset",value:s,options:T,onChange:e=>{u(e),f(I[e]??I.totality)}}),(0,n.jsx)(r.bg,{title:"Shape",value:c.shape,options:M,onChange:e=>h("shape")(e)}),(0,n.jsx)(r.W7,{title:"First Color",value:c.colors[0],onChange:e=>f(t=>({...t,colors:[e,t.colors[1]]}))}),(0,n.jsx)(r.W7,{title:"Second Color",value:c.colors[1],onChange:e=>f(t=>({...t,colors:[t.colors[0],e]}))}),(0,n.jsx)(r.W7,{title:"Background",value:p,onChange:m}),(0,n.jsx)(r.yt,{title:"Size",min:.15,max:.8,step:.01,value:c.size,onChange:h("size")}),(0,n.jsx)(r.yt,{title:"Offset X",min:-.5,max:.5,step:.01,value:c.offsetX,onChange:h("offsetX")}),(0,n.jsx)(r.yt,{title:"Offset Y",min:-.5,max:.5,step:.01,value:c.offsetY,onChange:h("offsetY")}),(0,n.jsx)(r.yt,{title:"Rotation",min:-180,max:180,step:1,value:c.rotation,valueUnit:"\xb0",onChange:h("rotation")}),(0,n.jsx)(r.yt,{title:"Spin",min:-20,max:20,step:.5,value:v,valueUnit:"\xb0/s",onChange:g}),(0,n.jsx)(r.yt,{title:"Roundness",min:0,max:1,step:.01,value:c.roundness,onChange:h("roundness")}),(0,n.jsx)(r.yt,{title:"Wobble",min:0,max:.2,step:.005,value:c.wobble,onChange:h("wobble")}),(0,n.jsx)(r.yt,{title:"Light Angle",min:-180,max:180,step:1,value:c.lightAngle,valueUnit:"\xb0",onChange:h("lightAngle")}),(0,n.jsx)(r.yt,{title:"Light Offset",min:0,max:.5,step:.01,value:c.lightOffset,onChange:h("lightOffset")}),(0,n.jsx)(r.yt,{title:"Corona",min:.2,max:2.5,step:.01,value:c.corona,onChange:h("corona")}),(0,n.jsx)(r.yt,{title:"Intensity",min:0,max:2.5,step:.01,value:c.intensity,onChange:h("intensity")}),(0,n.jsx)(r.yt,{title:"Rim",min:0,max:2.5,step:.01,value:b,onChange:x}),(0,n.jsx)(r.yt,{title:"Softness",min:0,max:1,step:.01,value:c.softness,onChange:h("softness")}),(0,n.jsx)(r.yt,{title:"Contrast",min:0,max:1,step:.01,value:c.contrast,onChange:h("contrast")}),(0,n.jsx)(r.yt,{title:"Interior",min:0,max:1,step:.01,value:c.interior,onChange:h("interior")}),(0,n.jsx)(r.yt,{title:"Streaks",min:0,max:1,step:.01,value:c.streaks,onChange:h("streaks")}),(0,n.jsx)(r.yt,{title:"Ambient",min:0,max:1.5,step:.01,value:c.ambient,onChange:h("ambient")}),(0,n.jsx)(r.yt,{title:"Speed",min:0,max:3,step:.01,value:y,onChange:w}),(0,n.jsx)(r.yt,{title:"Parallax",min:0,max:2,step:.01,value:C,onChange:S}),(0,n.jsx)(r.yt,{title:"Flare",min:0,max:2,step:.01,value:k,onChange:L}),(0,n.jsx)(r.yt,{title:"Bloom",min:0,max:2,step:.01,value:j,onChange:F}),(0,n.jsx)(r.yt,{title:"Grain",min:0,max:1,step:.01,value:E,onChange:B}),(0,n.jsx)(r.tl,{title:"Interactive",checked:z,onChange:P}),(0,n.jsx)(r.tl,{title:"Intro",checked:Y,onChange:U}),(0,n.jsx)(r.tl,{title:"Paused",checked:D,onChange:X})]}),(0,n.jsx)(r.Ub,{data:R})]}),(0,n.jsx)(r.lT,{children:(0,n.jsx)(r.Gv,{})})]})]})}}}]);