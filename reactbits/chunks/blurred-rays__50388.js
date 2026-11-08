"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[50388],{50388:(e,t,a)=>{a.r(t),a.d(t,{default:()=>J});var r=a(95155),n=a(12115),o=a(56388),l=a(86049),i=a(90761),s=a(2253),u=a(12246),c=a(90650);let h=2*Math.PI,m=(e,t,a)=>Math.min(a,Math.max(t,e)),d=(e,t)=>Number.isFinite(e)?e:t,f=e=>{let t=m(e,0,1);return t*t*(3-2*t)},p=e=>Math.atan2(Math.sin(e),Math.cos(e)),v=(e,t)=>{let a=.6*t;return e<=a?e:a+(t-a)*Math.tanh((e-a)/(t-a))},g=Math.fround,x=e=>g(e-Math.floor(e)),b=(e,t)=>{let a=x(g(g(e)*g(198.75))),r=x(g(g(t)*g(743.26))),n=g(g(a*g(a+g(67.41)))+g(r*g(r+g(67.41))));return a=g(a+n),r=g(r+n),x(g(a*r))},y=e=>e*b(g(e*g(341.7)),g(e*g(527.3))),S=(e,t)=>{let a=43758.5453*Math.sin(127.1*e+311.7*t);return a-Math.floor(a)},w=Array.from({length:128},(e,t)=>b(2*t,382.91)),M=Array.from({length:128},(e,t)=>y(g(2+g(g(2*t)*g(.02))))),C=[y(4),y(5),y(6)],k=Array.from({length:128},(e,t)=>Math.floor(3*S(t,1))/2),T=Array.from({length:128},(e,t)=>(.6180339887*t+.31)%1),B=Array.from({length:128},(e,t)=>S(t,2)),R=new s.Q1f,j=e=>{if("string"!=typeof e)return null;let t=e.trim().toLowerCase();if(!t||"transparent"===t||"none"===t||"auto"===t)return null;let a=/^rgba?\(([^)]+)\)$/i.exec(t);if(a){let e=a[1].split(/[\s,/]+/).filter(Boolean).map(e=>Number.parseFloat(e));return e.length>3&&Number.isFinite(e[3])&&e[3]<=.05?null:[(e[0]??0)/255,(e[1]??0)/255,(e[2]??0)/255]}try{R.setStyle(t,s.jf0)}catch{return null}return[R.r,R.g,R.b]},L=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),F=([e,t,a])=>{let r=L(e),n=L(t),o=L(a),l=Math.cbrt(.4122214708*r+.5363325363*n+.0514459929*o),i=Math.cbrt(.2119034982*r+.6806995451*n+.1073969566*o),s=Math.cbrt(.0883024619*r+.2817188376*n+.6299787005*o),u=1.9779984951*l-2.428592205*i+.4505937099*s,c=.0259040371*l+.7827717662*i-.808675766*s;return[.2104542553*l+.793617785*i-.0040720468*s,Math.hypot(u,c),Math.atan2(c,u)]},E=(e,t,a)=>{let r=t*Math.cos(a),n=t*Math.sin(a),o=Math.pow(e+.3963377774*r+.2158037573*n,3),l=Math.pow(e-.1055613458*r-.0638541728*n,3),i=Math.pow(e-.0894841775*r-1.291485548*n,3),s=4.0767416621*o-3.3077115913*l+.2309699292*i,u=-1.2684380046*o+2.6097574011*l-.3413193965*i,c=-.0041960863*o-.7034186147*l+1.707614701*i;return s>=-5e-4&&s<=1.0005&&u>=-5e-4&&u<=1.0005&&c>=-5e-4&&c<=1.0005},A=(e,t)=>{let a=0,r=.4;for(let n=0;n<14;n++){let n=(a+r)/2;E(e,n,t)?a=n:r=n}return a},z=new Map,P=(e,t,a)=>{let r,n,o=(Math.round(180*e/Math.PI)%360+360)%360,l=`${+!!t}${+!!a}${o}`,i=z.get(l);if(i)return i;let s=o*Math.PI/180,u=(e=>{let t=.6,a=-1;for(let r=.3;r<=.97;r+=.03){let n=A(r,e);n>a&&(a=n,t=r)}return t})(s),c=Math.exp(-Math.pow(p(s-1.2)/.6,2)),h=Math.exp(-Math.pow(p(s-1.38)/.3,2));n=t?A(r=a?m(u-.08,.4,.58+.12*c+.06*h):m(u,.48,.68+.06*c+.05*h),s)*(a?.94:.86):a?.94*A(r=u+(.94-u)*.18,s):.95*A(r=u,s);let d=[r,n,s];return z.set(l,d),d},I=(e,t)=>{let a=p(e-2.04),r=a<-.1?-1:a>.1?1:t;return r<0?[e-.75*Math.exp(-Math.pow(a/.42,2)),r]:[e+.62*Math.exp(-Math.pow(a/.36,2)),r]},N=e=>{let t=p(e-2.04),a=Math.abs(t)/.12;return e+.32*Math.sign(t)*a*Math.E*Math.exp(-a)},O=([e,t,a],r)=>{if(t<.015&&r[1]<.015)return[m(.6*e,.25,.45),t,a];let n=t<.015?r[2]:a,o=m(.82*e,.38,.64+.08*Math.exp(-Math.pow(p(n-1.2)/.6,2)));return[o,Math.min(Math.max(t,.11),A(o,n)),n]},U=(e,t)=>e[1]<.015&&t[1]>=.015?[e[0],e[1],t[2]]:e,H=(e,t)=>{let a=Math.max(e-t[0],0),r=Math.max(e-t[1],0),n=Math.max(e-t[2],0),o=Math.max(a,r,n);return o<=1e-4?null:[a/o,r/o,n/o]},W=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},D=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,G=`
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,X=`
precision highp float;
precision highp int;
uniform vec2 uRes;
uniform int uCount;
uniform vec4 uBeams[128];
uniform vec4 uLayers[32];
uniform float uScaleX;
uniform float uShiftY;
uniform vec4 uMask;
uniform float uThreshold;
uniform float uGain;
uniform float uKnee;
uniform float uCore;
uniform float uDome;
uniform float uSoften;
uniform float uSpectral;
uniform float uToneTime;
uniform float uWave;
uniform float uNormalize;
uniform vec3 uHeat;
uniform vec3 uLchA;
uniform vec3 uLchB;
in vec2 vUv;
out vec4 fragColor;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

vec3 linearFromLch(vec3 lch) {
  vec3 lab = vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
  vec3 lms = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.291485548) * lab;
  lms = lms * lms * lms;
  return mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * lms;
}

vec3 blend(float t) {
  float turn = uLchB.z - uLchA.z;
  turn -= TAU * floor((turn + PI) / TAU);
  return vec3(mix(uLchA.x, uLchB.x, t), mix(uLchA.y, uLchB.y, t), uLchA.z + turn * t);
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  p.x *= uScaleX;
  p.y += uShiftY;
  float pixel = uScaleX / uRes.y;
  float rays = 0.0;
  float swell = 0.0;
  float tone = 0.0;
  for (int i = 0; i < 128; i++) {
    if (i >= uCount) break;
    vec4 beam = uBeams[i];
    float reach = max(beam.y, pixel * 2.0);
    float d = abs(p.x - beam.x);
    if (beam.z <= 0.0 || d >= reach) continue;
    float z = uLayers[i >> 2][i & 3];
    float u = d / reach;
    float band = 1.0 - smoothstep(min(uCore * (1.0 - uSoften * (1.0 - z)), 0.98), 1.0, u);
    float profile = band * (1.0 - uDome * u * u);
    float shape = profile * beam.z;
    rays += shape;
    swell += profile * beam.w;
    if (uSpectral < 0.5) {
      float index = float(i);
      float seed = fract(sin(index * 127.1 + 935.1) * 43758.5453);
      float pace = fract(sin(index * 269.5 + 1246.4) * 43758.5453);
      tone += shape * (0.5 + 0.5 * sin(TAU * seed + uToneTime * (0.6 + 0.8 * pace)));
    }
  }
  float mask = smoothstep(-uMask.y, 0.0, p.y)
    * (1.0 - smoothstep(-uMask.x, 0.0, p.y))
    * smoothstep(-uMask.z, 1.0, p.x)
    * (1.0 - smoothstep(-1.0, uMask.w, p.x));
  float lift = max(rays - uThreshold, 0.0);
  float signal = lift < 2.0 * uKnee ? lift * lift / (4.0 * uKnee) : lift - uKnee;
  float base = signal * mask * uGain;
  float intensity = pow(base + swell * uWave * mask * uGain / (1.0 + base), 2.2);
  float total = max(rays, 0.0001);
  float m = mix(tone / total, 1.0 - exp(-intensity * 0.6), uSpectral);
  vec3 lch = blend(clamp(m, 0.0, 1.0));
  vec3 color = max(linearFromLch(lch), 0.0);
  float peak = max(max(color.r, color.g), max(color.b, 0.0001));
  color /= mix(1.0, peak, uNormalize);
  color = mix(color, vec3(1.0), smoothstep(uHeat.x, uHeat.y, intensity) * uHeat.z);
  fragColor = vec4(color * intensity, intensity);
}
`,q=`
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;
in vec2 vUv;
out vec4 fragColor;
vec4 tap(vec2 d) { return texture(uSource, vUv + d * uTexel); }
void main() {
  vec4 color = tap(vec2(0.0)) * 0.125
    + (tap(vec2(-2.0, 2.0)) + tap(vec2(2.0, 2.0)) + tap(vec2(-2.0, -2.0)) + tap(vec2(2.0, -2.0))) * 0.03125
    + (tap(vec2(0.0, 2.0)) + tap(vec2(-2.0, 0.0)) + tap(vec2(2.0, 0.0)) + tap(vec2(0.0, -2.0))) * 0.0625
    + (tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0)) + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0))) * 0.125;
  if (uThreshold > 0.0) {
    float peak = color.a;
    float knee = uThreshold * 0.6;
    float soft = clamp(peak - uThreshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 0.00001);
    color *= max(soft, peak - uThreshold) / max(peak, 0.00001);
  }
  fragColor = color;
}
`,_=`
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;
vec4 tap(vec2 d) { return texture(uSource, vUv + d * uTexel); }
void main() {
  vec4 color = tap(vec2(0.0)) * 4.0
    + (tap(vec2(-1.0, 0.0)) + tap(vec2(1.0, 0.0)) + tap(vec2(0.0, -1.0)) + tap(vec2(0.0, 1.0))) * 2.0
    + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0));
  fragColor = color / 16.0;
}
`,Y=`
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uInk;
uniform float uCover;
uniform float uOpacity;
uniform float uExposure;
in vec2 vUv;
out vec4 fragColor;

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 warmFalloff(vec3 rgb) {
  vec3 lms = mat3(0.4122214708, 0.2119034982, 0.0883024619, 0.5363325363, 0.6806995451, 0.2817188376, 0.0514459929, 0.1073969566, 0.6299787005) * rgb;
  lms = pow(max(lms, 0.0), vec3(1.0 / 3.0));
  vec3 lab = mat3(0.2104542553, 1.9779984951, 0.0259040371, 0.793617785, -2.428592205, 0.7827717662, -0.0040720468, 0.4505937099, -0.808675766) * lms;
  float chroma = length(lab.yz);
  float hue = atan(lab.z, lab.y);
  float offset = hue - 1.8;
  offset -= 6.28318530718 * floor((offset + 3.14159265359) / 6.28318530718);
  hue -= 0.6 * exp(-offset * offset / 0.16) * (1.0 - smoothstep(0.3, 1.05, lab.x));
  lab = vec3(lab.x, chroma * cos(hue), chroma * sin(hue));
  vec3 back = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.291485548) * lab;
  back = back * back * back;
  return max(mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * back, 0.0);
}

void main() {
  vec4 emission = max(texture(uScene, vUv) + texture(uBloom, vUv) * uBloomStrength, 0.0);
  float noise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5;
  vec4 color;
  if (uInk > 0.5) {
    vec3 ink = encode(emission.rgb / max(emission.a, 0.0001));
    float cover = 1.0 - exp(-pow(emission.a, 0.4545) * uCover);
    color = vec4(ink, cover * cover * (3.0 - 2.0 * cover));
  } else {
    vec3 light = encode(1.0 - exp(-warmFalloff(emission.rgb) * uExposure));
    float alpha = max(light.r, max(light.g, light.b));
    color = vec4(light / max(alpha, 0.0001), alpha);
  }
  float alive = step(0.004, color.a);
  color.rgb += noise / 255.0;
  color.a = (color.a + noise * alive / 255.0) * uOpacity;
  fragColor = clamp(color, 0.0, 1.0);
}
`,$=(0,n.forwardRef)(function({width:e="100%",height:t="100%",className:a,style:o,children:l,colors:i,backgroundColor:g="transparent",speed:x=.5,flickerRate:b=1,rayCount:y=25,raySpacing:S=.27,rayThickness:R=.35,edgeSoftness:L=.65,widthPulse:E=.1,widthBase:A=.3,horizontalScale:z=4.6,verticalOffset:$=-.5,originX:K=0,colorShiftR:V=1,colorShiftG:Q=1,colorShiftB:Z=1,vignetteTop:J=1.3,vignetteBottom:ee=.95,vignetteLeft:et=3,vignetteRight:ea=3,depth:er=1,bloom:en=4,brightness:eo=2,opacity:el=1,parallax:ei=1,waveStrength:es=1,interactive:eu=!0,cursorInteraction:ec=!1,intro:eh=!0,paused:em=!1,dpr:ed=2},ef){let ep=(0,n.useRef)(null),ev=(0,n.useRef)(null),eg=(0,n.useRef)(null),ex=(0,n.useSyncExternalStore)(W,D,()=>!1),eb={colors:Array.isArray(i)&&i.length>=2?[i[0],i[1]]:null,backgroundColor:g,speed:x,flickerRate:b,rayCount:y,raySpacing:S,rayThickness:R,edgeSoftness:L,widthPulse:E,widthBase:A,horizontalScale:z,verticalOffset:$,originX:K,colorShiftR:V,colorShiftG:Q,colorShiftB:Z,vignetteTop:J,vignetteBottom:ee,vignetteLeft:et,vignetteRight:ea,depth:er,bloom:en,brightness:eo,opacity:el,parallax:ei,waveStrength:es,interactive:eu,cursorInteraction:ec,intro:eh,paused:em,dpr:ed,reduced:ex},ey=(0,n.useRef)(eb);(0,n.useEffect)(()=>{ey.current=eb,eg.current?.sync()}),(0,n.useEffect)(()=>{let e=ep.current,t=ev.current;if(!e||!t)return;let a=function(e,t,a){let r,n=e.ownerDocument,o=n.defaultView??window,l=n.createElement("canvas");l.setAttribute("aria-hidden","true"),l.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block";try{r=new u.WebGLRenderer({canvas:l,alpha:!0,premultipliedAlpha:!1,antialias:!1,powerPreference:"high-performance"})}catch{return null}r.setClearColor(0,0),r.autoClear=!1,t.appendChild(l);let i=r.extensions.has("EXT_color_buffer_float")||r.extensions.has("EXT_color_buffer_half_float")?s.ix0:s.OUM,c=new s.qUd(-1,1,1,-1,-1,1),g=new s.LoY;g.setAttribute("position",new s.qtW([-1,-1,0,3,-1,0,-1,3,0],3));let x=new s.Z58,b=new s.eaF(g);b.frustumCulled=!1,x.add(b);let y=(e,t,a=!1)=>{let r=new s.D$Q({glslVersion:s.Wdf,vertexShader:G,fragmentShader:e,uniforms:t,blending:a?s.bCz:s.XIg,transparent:a,depthTest:!1,depthWrite:!1});return a&&(r.blendEquation=s.gO9,r.blendSrc=s.qad,r.blendDst=s.qad,r.blendSrcAlpha=s.qad,r.blendDstAlpha=s.qad),r},S=Array.from({length:128},()=>new s.IUQ),R=Array.from({length:32},()=>new s.IUQ),L={uRes:{value:new s.I9Y(1,1)},uCount:{value:0},uBeams:{value:S},uLayers:{value:R},uScaleX:{value:4.6},uShiftY:{value:-.5},uMask:{value:new s.IUQ(1.3,.95,3,3)},uThreshold:{value:.2},uGain:{value:24},uKnee:{value:.06},uCore:{value:.35},uDome:{value:.4},uSoften:{value:.55},uSpectral:{value:1},uToneTime:{value:0},uWave:{value:1.2},uNormalize:{value:1},uHeat:{value:new s.Pq0(2.2,10.5,.85)},uLchA:{value:new s.Pq0(.8,.2,2.4)},uLchB:{value:new s.Pq0(.9,.12,1.9)}},E=y(X,L),A=()=>new s.nWS(1,1,{type:i,format:s.GWd,depthBuffer:!1,stencilBuffer:!1,minFilter:s.k6q,magFilter:s.k6q,generateMipmaps:!1}),z=A(),W=Array.from({length:5},A),D=y(q,{uSource:{value:null},uTexel:{value:new s.I9Y},uThreshold:{value:0}}),$=y(_,{uSource:{value:null},uTexel:{value:new s.I9Y}},!0),K=y(Y,{uScene:{value:z.texture},uBloom:{value:W[0].texture},uBloomStrength:{value:.1},uInk:{value:0},uCover:{value:1.5},uOpacity:{value:1},uExposure:{value:1.45}}),V=0,Q=0,Z=1,J=!1,ee="",et=!1,ea=!1,er=-10,en=0,eo=0,el=0,ei=1/60,es=0,eu=0,ec=1,eh=1,em=!1,ed=0,ef=0,ep=0,ev=0,eg=!1,ex=0,eb=0,ey=!1,eS=!1,ew=!1,eM=[],eC=[[.5,.2,4.6],[.8,.15,5.6]],ek=[[.45,.2,4.6],[.6,.15,5.6]],eT=()=>{let t=a.current,r=j(t.backgroundColor)??(()=>{let t=e.parentElement;for(;t;){let e=o.getComputedStyle(t).backgroundColor.match(/rgba?\(([^)]+)\)/);if(e){let t=e[1].split(/[\s,/]+/).filter(Boolean).map(e=>Number.parseFloat(e));if(t.length<4||t[3]>.05)return[t[0]/255,t[1]/255,t[2]/255]}t=t.parentElement}let a=o.getComputedStyle(e).color.match(/rgba?\(([^)]+)\)/);if(a){let e=a[1].split(/[\s,/]+/).filter(Boolean).map(e=>Number.parseFloat(e));return e[0]+e[1]+e[2]>382?[.04,.04,.04]:[1,1,1]}return[.04,.04,.04]})(),n=t.colors?j(t.colors[0]):null,l=t.colors?j(t.colors[1]):null,i=(([e,t,a])=>.2126*e+.7152*t+.0722*a)(r)>.55,s=!!n&&!!l,u=[i,s,t.colors?.[0],t.colors?.[1]].join("|");if(u!==ee){if(ee=u,et=i,ea=s,n&&l){let e=F(n),t=F(l);eC[0]=U(e,t),eC[1]=U(t,e),ek[0]=O(e,t),ek[1]=O(t,e)}K.uniforms.uInk.value=+!!et}},eB=()=>{let t=a.current,n=Math.round(e.clientWidth),l=Math.round(e.clientHeight);if(n<2||l<2)return J=!1,!1;let i=Math.min(o.devicePixelRatio||1,m(d(t.dpr,2),.5,3));return(!J||n!==V||l!==Q||i!==Z)&&(J=!0,V=n,Q=l,Z=i,r.setPixelRatio(Z),r.setSize(V,Q,!1),(()=>{let e=Z>1.4?.5:1,t=Math.max(1,Math.round(V*Z*e)),a=Math.max(1,Math.round(Q*Z*e));z.setSize(t,a),L.uRes.value.set(t,a);let r=t,n=a;for(let e of W)r=Math.max(1,Math.round(r/2)),n=Math.max(1,Math.round(n/2)),e.setSize(r,n)})(),!0)},eR=()=>{let e=a.current;return V/Math.max(Q,1)*m(d(e.horizontalScale,4.6),.1,40)},ej=(e,t,a)=>{let r=0;for(let n of eM){let o=Math.abs(e-n.x),l=n.age-o/t;if(l<=0||l>=1.5)continue;let i=f(l/.18),s=1-f((l-.35)/1.15);r+=n.strength*i*s*Math.exp(-l/.38)*Math.exp(-o/a)}return r},eL=()=>{if(!J)return;let e=a.current;performance.now()-er>1e3&&(er=performance.now(),eT()),(e=>{let t=m(Math.round(d(e.rayCount,25)),1,128),a=eR(),r=d(e.raySpacing,.27),n=Math.max(d(e.rayThickness,.35),0),o=n+Math.max(d(e.edgeSoftness,.65),0),l=d(e.widthPulse,.1),i=d(e.widthBase,.3),s=d(e.originX,0),u=m(d(e.depth,1),0,2),c=e.interactive&&!e.reduced?m(d(e.parallax,1),0,3):0,p=e.cursorInteraction&&!e.reduced?2*ed:0,v=m(d(e.flickerRate,1),0,10),g=e.reduced?2.4:en,x=e.reduced?2.4*v:eo,b=e.reduced?2.4*v*.32:el,y=.55*a,C=Math.min(.055*t,1.6),j=eg&&e.intro&&!e.reduced,F=.5*t;for(let e=0;e<t;e++){let t=k[e],n=Math.sin(g*w[e])*l+i,d=x*M[e],v=m(.5+.5*(.78*Math.sin(d)+.22*Math.sin(1.618*d+h*B[e])),0,1),b=(e-F)*r+s+p-ed*c*.05*a*(1.25*(.5+(t-.5)*Math.min(u,1))-.25),L=1-Math.exp(-ej(b,y,.8*a)),E=j?f((ev-T[e]*C)/.9):1,A=Math.max(1+u*(.1-.18*t),.2),z=Math.max(1+u*(.55*t-.45),.05);S[e].set(b,Math.max(o*n,0)*A*(1+.12*L),v*z*E,L*E),R[e>>2].setComponent(3&e,t)}L.uCount.value=t,L.uToneTime.value=.45*b,L.uCore.value=m(n/Math.max(o,1e-4),.05,1),L.uSoften.value=.55*Math.min(u,1)})(e),(e=>{let t=m(d(e.flickerRate,1),0,10),a=e.reduced?2.4*t*.32:el,r=[m(.5+.5*Math.sin(a*C[0]),0,1)*Math.max(d(e.colorShiftR,1),0),m(.5+.5*Math.sin(a*C[1]),0,1)*Math.max(d(e.colorShiftG,1),0),m(.5+.5*Math.sin(a*C[2]),0,1)*Math.max(d(e.colorShiftB,1),0)],n=Math.min(r[0],r[1],r[2]);if(L.uThreshold.value=.2+.5*Math.min(n,1.5),L.uSpectral.value=+!ea,L.uNormalize.value=+!et,L.uHeat.value.set(2.2,10.5,.85*!et),ea){let[e,t]=et?ek:eC;L.uLchA.value.set(e[0],e[1],e[2]),L.uLchB.value.set(t[0],t[1],t[2]);return}let o=H(n+.1,r),l=H(n+.38,r),i=o?F(o):null,s=l?F(l):null,u=e.reduced||!em,c=u?1:1-Math.exp(-ei/.45),h=u?Math.PI:.9*ei;if(i){let e=u?1:f((i[1]-.015)/.05),[t,a]=I(i[2],ec);ec=a,es+=m(p(t-es)*c*e,-h,h)}if(s){let e=u?1:f((s[1]-.015)/.05),[t]=I(s[2],ec);eu+=m(p(t-eu)*c*e,-h,h)}let v=i?f((i[1]-.01)/.08):0;eh+=(v-eh)*c,em=!0;let g=N(es),x=P(g,et,!1),b=P(et?g:N(eu),et,!0),y=et?Math.max(eh,.15):eh;L.uLchA.value.set(x[0],x[1]*y,x[2]),L.uLchB.value.set(b[0],b[1]*y,b[2])})(e),L.uScaleX.value=m(d(e.horizontalScale,4.6),.1,40),L.uShiftY.value=d(e.verticalOffset,-.5),L.uMask.value.set(Math.max(d(e.vignetteTop,1.3),.001),Math.max(d(e.vignetteBottom,.95),.001),m(d(e.vignetteLeft,3),0,40),m(d(e.vignetteRight,3),0,40)),L.uGain.value=10*m(d(e.brightness,2),0,10),b.material=E,r.setRenderTarget(z),r.render(x,c);let t=m(d(e.bloom,4),0,10)/4*(et?.45:1);if(t>.001){let e=z;for(let t of(b.material=D,W))D.uniforms.uThreshold.value=.7*(e===z),D.uniforms.uSource.value=e.texture,D.uniforms.uTexel.value.set(1/e.width,1/e.height),r.setRenderTarget(t),r.render(x,c),e=t;b.material=$;for(let e=W.length-1;e>0;e--)$.uniforms.uSource.value=W[e].texture,$.uniforms.uTexel.value.set(1/W[e].width,1/W[e].height),r.setRenderTarget(W[e-1]),r.render(x,c)}K.uniforms.uBloomStrength.value=.5*t/W.length,K.uniforms.uOpacity.value=m(d(e.opacity,1),0,1),b.material=K,r.setRenderTarget(null),r.render(x,c)},eF=()=>{eS||ew||!ey||ex||(ex=requestAnimationFrame(eE))},eE=e=>{if(ex=0,eS||ew)return;let t=a.current,r=eb&&e-eb<100?Math.min(Math.max((e-eb)/1e3,0),.05):1/60;eb=e,ei=r;let o=!t.reduced&&!t.paused;if(o){let e=m(d(t.speed,.5),0,5),a=m(d(t.flickerRate,1),0,10);en+=r*e,eo+=r*v(e*a,2),el+=r*v(e*a,1)*.32}let l=m(Math.round(d(t.rayCount,25)),1,128);eg&&t.intro&&!t.reduced?(ev+=r)>Math.min(.055*l,1.6)+.9&&(eg=!1):eg=!1;let i=(t.interactive||t.cursorInteraction)&&!t.reduced?ep:0;t.reduced?(ed=i,ef=0):(ef+=(51.84*(i-ed)-14.4*ef)*r,ed+=ef*r);for(let e=eM.length-1;e>=0;e--)eM[e].age+=r,eM[e].age>1.5+1.8181818181818181&&eM.splice(e,1);eL();let s=Math.abs(i-ed)>5e-4||Math.abs(ef)>5e-4;(o||s||eg||eM.length>0)&&!n.hidden?ex=requestAnimationFrame(eE):eb=0},eA=(e,t)=>{t<=0||(eM.length>=8&&eM.shift(),eM.push({x:e,age:0,strength:t}))},ez=null,eP=e=>{var t;!e.isPrimary||(t=e.target)&&"function"==typeof t.closest&&t.closest("a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]")||("mouse"!==e.pointerType||0===e.button)&&(ez={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()})},eI=t=>{let r=ez;if(ez=null,!r||r.id!==t.pointerId||Math.hypot(t.clientX-r.x,t.clientY-r.y)>10||performance.now()-r.time>600)return;let n=a.current;if(!n.interactive||n.reduced||n.paused)return;let o=e.getBoundingClientRect();o.width<=0||o.height<=0||(eA(((t.clientX-o.left)/o.width-.5)*eR(),m(d(n.waveStrength,1),0,3)),eF())},eN=t=>{if("touch"===t.pointerType)return;let a=e.getBoundingClientRect();a.width<=0||a.height<=0||(ep=m(((t.clientX-a.left)/a.width-.5)*2,-1,1),eF())},eO=e=>{"touch"!==e.pointerType&&(ep=0,eF())},eU=()=>{ez=null},eH=()=>{eb=0,eF()},eW=e=>{e.preventDefault(),ew=!0,cancelAnimationFrame(ex),ex=0},eD=()=>{ew=!1,ee="",eF()},eG=new ResizeObserver(()=>{eB()&&(eL(),eF())}),eX=new IntersectionObserver(([e])=>{ey=e.isIntersecting,eb=0,eF()},{rootMargin:"120px"});e.addEventListener("pointerdown",eP),e.addEventListener("pointerup",eI),e.addEventListener("pointermove",eN),e.addEventListener("pointerleave",eO),e.addEventListener("pointercancel",eU),n.addEventListener("visibilitychange",eH),l.addEventListener("webglcontextlost",eW),l.addEventListener("webglcontextrestored",eD),eG.observe(e),eX.observe(e),eg=a.current.intro&&!a.current.reduced;let eq=m(d(a.current.speed,.5),0,5),e_=m(d(a.current.flickerRate,1),0,10);return en=4.8*eq,eo=4.8*v(eq*e_,2),el=4.8*v(eq*e_,1)*.32,eB(),eT(),{sync:()=>{er=-10,eB(),eb=0,!ex&&ey&&(eL(),eF())},wave:(e,t)=>{let r=a.current;r.reduced||(eA((m(d(e??.5,.5),0,1)-.5)*eR(),m(d(t??r.waveStrength,1),0,3)),eF())},replay:()=>{a.current.reduced||(eg=!0,ev=0,eb=0,eF())},destroy:()=>{for(let t of(eS=!0,cancelAnimationFrame(ex),eG.disconnect(),eX.disconnect(),e.removeEventListener("pointerdown",eP),e.removeEventListener("pointerup",eI),e.removeEventListener("pointermove",eN),e.removeEventListener("pointerleave",eO),e.removeEventListener("pointercancel",eU),n.removeEventListener("visibilitychange",eH),l.removeEventListener("webglcontextlost",eW),l.removeEventListener("webglcontextrestored",eD),g.dispose(),E.dispose(),D.dispose(),$.dispose(),K.dispose(),z.dispose(),W))t.dispose();r.dispose(),l.remove()}}}(e,t,ey);return eg.current=a,()=>{a?.destroy(),eg.current=null}},[]),(0,n.useImperativeHandle)(ef,()=>({wave:(e,t)=>eg.current?.wave(e,t),replay:()=>eg.current?.replay()}),[]);let eS=g.trim().toLowerCase();return(0,r.jsxs)("div",{ref:ep,className:(0,c.cn)("relative overflow-hidden",a),style:{width:e,height:t,backgroundColor:""===eS||"transparent"===eS||"none"===eS||"auto"===eS?void 0:g,...o},children:[(0,r.jsx)("div",{ref:ev,"aria-hidden":"true",className:"pointer-events-none absolute inset-0"}),l?(0,r.jsx)("div",{className:"relative z-10",children:l}):null]})});$.displayName="BlurredRays";let K={spectrum:!0,colors:["#5227FF","#FF9FFC"],rayCount:25,raySpacing:.27,rayThickness:.35,edgeSoftness:.65,widthPulse:.1,widthBase:.3,speed:.5,flickerRate:1,horizontalScale:4.6,verticalOffset:-.5,colorShiftR:1,colorShiftG:1,colorShiftB:1,vignetteTop:1.3,vignetteBottom:.95,vignetteSides:3,depth:1,bloom:4,brightness:2},V={classic:K,violet:{...K,spectrum:!1,colors:["#5227FF","#FF9FFC"],speed:.4},lavender:{...K,spectrum:!1,colors:["#8B5CF6","#B19EEF"],rayCount:16,raySpacing:.42,rayThickness:.45,edgeSoftness:.95,speed:.3,bloom:5},aurora:{...K,spectrum:!1,colors:["#06B6D4","#4ADE80"],rayCount:34,raySpacing:.2,rayThickness:.24,edgeSoftness:.5,speed:.35,depth:1.4},ember:{...K,spectrum:!1,colors:["#FF7A27","#FF3D7F"],rayCount:22,speed:.45,flickerRate:1.4,brightness:2.2},curtain:{...K,rayCount:64,raySpacing:.105,rayThickness:.16,edgeSoftness:.32,speed:.35,depth:1.6},prism:{...K,rayCount:14,raySpacing:.42,rayThickness:.5,edgeSoftness:.9,speed:.3,flickerRate:.8,depth:1.2,bloom:5},ice:{...K,spectrum:!1,colors:["#2563EB","#A5F3FC"],rayCount:28,raySpacing:.24,rayThickness:.3,edgeSoftness:.7,speed:.25,flickerRate:.7}},Q=[{label:"Classic",value:"classic"},{label:"Violet",value:"violet"},{label:"Lavender",value:"lavender"},{label:"Aurora",value:"aurora"},{label:"Ember",value:"ember"},{label:"Curtain",value:"curtain"},{label:"Prism",value:"prism"},{label:"Ice",value:"ice"}],Z=[{name:"colors",type:"[string, string]",default:"undefined",description:"Two colours for the beams, blended in OKLCh. Leave it unset for the classic spectrum, where the light drifts through every hue."},{name:"backgroundColor",type:"string",default:'"transparent"',description:"Fill behind the beams. Transparent shows the page. On a light background the beams are drawn as ink."},{name:"rayCount",type:"number",default:"25",description:"Number of beams, from 1 to 128."},{name:"raySpacing",type:"number",default:"0.27",description:"Gap between neighbouring beams."},{name:"rayThickness",type:"number",default:"0.35",description:"Width of the bright body of each beam."},{name:"edgeSoftness",type:"number",default:"0.65",description:"Width of the soft falloff around each beam."},{name:"widthPulse",type:"number",default:"0.1",description:"How much each beam slowly swells and narrows."},{name:"widthBase",type:"number",default:"0.3",description:"Base width scale for every beam."},{name:"speed",type:"number",default:"0.5",description:"Overall speed of the animation."},{name:"flickerRate",type:"number",default:"1",description:"How fast the beams flicker. Fast settings are smoothed so they never strobe."},{name:"horizontalScale",type:"number",default:"4.6",description:"Horizontal zoom. Higher values pack the beams closer."},{name:"verticalOffset",type:"number",default:"-0.5",description:"Moves the field of light up or down."},{name:"originX",type:"number",default:"0",description:"Moves the whole row of beams sideways."},{name:"colorShiftR",type:"number",default:"1",description:"How strongly red drops out of the light over time. Also shapes the flicker."},{name:"colorShiftG",type:"number",default:"1",description:"How strongly green drops out of the light over time."},{name:"colorShiftB",type:"number",default:"1",description:"How strongly blue drops out of the light over time."},{name:"vignetteTop",type:"number",default:"1.3",description:"Length of the fade at the top of the beams."},{name:"vignetteBottom",type:"number",default:"0.95",description:"Length of the fade at the bottom of the beams."},{name:"vignetteLeft",type:"number",default:"3",description:"Reach of the fade on the left side."},{name:"vignetteRight",type:"number",default:"3",description:"Reach of the fade on the right side."},{name:"depth",type:"number",default:"1",description:"Spreads the beams over three depth layers. Far beams are softer and dimmer. 0 keeps them flat."},{name:"bloom",type:"number",default:"4",description:"Soft glow around the brightest light."},{name:"brightness",type:"number",default:"2",description:"Overall exposure of the light."},{name:"opacity",type:"number",default:"1",description:"Opacity of the beams."},{name:"parallax",type:"number",default:"1",description:"How far the depth layers slide with the pointer. Near beams move more than far ones."},{name:"waveStrength",type:"number",default:"1",description:"Strength of the brightness wave a click sends across the beams."},{name:"interactive",type:"boolean",default:"true",description:"Hover to shift the depth layers. Click to send a wave of light outward from that point. Waves stack."},{name:"intro",type:"boolean",default:"true",description:"The beams fade up one by one when the component mounts."},{name:"paused",type:"boolean",default:"false",description:"Stops the flicker. Reduced-motion users get a still frame."},{name:"dpr",type:"number",default:"2",description:"Maximum device pixel ratio for the canvas."},{name:"width",type:"string | number",default:'"100%"',description:"Width of the root element."},{name:"height",type:"string | number",default:'"100%"',description:"Height of the root element."},{name:"ref",type:"{ wave, replay }",default:"-",description:"wave(x?, strength?) sends a wave from a 0 to 1 position. replay() restarts the intro."},{name:"children",type:"ReactNode",default:"-",description:"Content rendered above the light."},{name:"className",type:"string",default:"-",description:"Classes for the root element."},{name:"style",type:"CSSProperties",default:"-",description:"Inline styles for the root element."}],J=()=>{let[e,t]=(0,i.I)(),a=(0,l.Y)(),[s,u]=(0,n.useState)("classic"),[c,h]=(0,n.useState)(V.classic),[m,d]=(0,n.useState)(null),[f,p]=(0,n.useState)(1),[v,g]=(0,n.useState)(1),[x,b]=(0,n.useState)(0),[y,S]=(0,n.useState)(!0),[w,M]=(0,n.useState)(!0),[C,k]=(0,n.useState)(!1),T=m??("dark"===a?"#0a0a0a":"#ffffff"),B=e=>t=>h(a=>({...a,[e]:t})),R=e=>t=>h(a=>{let r=[a.colors[0],a.colors[1]];return r[e]=t,{...a,colors:r,spectrum:!1}});return(0,r.jsxs)("div",{children:[(0,r.jsx)(o.Bg,{}),(0,r.jsxs)(o.VX,{children:[(0,r.jsxs)(o.Ec,{children:[(0,r.jsx)(o.Ch,{onRefresh:t,children:(0,r.jsx)("div",{className:"relative h-full w-full",children:(0,r.jsx)($,{colors:c.spectrum?void 0:c.colors,backgroundColor:T,rayCount:c.rayCount,raySpacing:c.raySpacing,rayThickness:c.rayThickness,edgeSoftness:c.edgeSoftness,widthPulse:c.widthPulse,widthBase:c.widthBase,speed:c.speed,flickerRate:c.flickerRate,horizontalScale:c.horizontalScale,verticalOffset:c.verticalOffset,originX:x,colorShiftR:c.colorShiftR,colorShiftG:c.colorShiftG,colorShiftB:c.colorShiftB,vignetteTop:c.vignetteTop,vignetteBottom:c.vignetteBottom,vignetteLeft:c.vignetteSides,vignetteRight:c.vignetteSides,depth:c.depth,bloom:c.bloom,brightness:c.brightness,parallax:f,waveStrength:v,interactive:y,intro:w,paused:C},`${e}-${w}`)})}),(0,r.jsxs)(o.IH,{children:[(0,r.jsx)(o.bg,{title:"Preset",value:s,options:Q,onChange:e=>{u(e),h(V[e]??V.classic)}}),(0,r.jsx)(o.tl,{title:"Spectrum",checked:c.spectrum,onChange:B("spectrum")}),(0,r.jsx)(o.W7,{title:"Color A",value:c.colors[0],onChange:R(0)}),(0,r.jsx)(o.W7,{title:"Color B",value:c.colors[1],onChange:R(1)}),(0,r.jsx)(o.W7,{title:"Background",value:T,onChange:d}),(0,r.jsx)(o.yt,{title:"Ray Count",min:1,max:128,step:1,value:c.rayCount,onChange:B("rayCount")}),(0,r.jsx)(o.yt,{title:"Ray Spacing",min:.02,max:1,step:.01,value:c.raySpacing,onChange:B("raySpacing")}),(0,r.jsx)(o.yt,{title:"Ray Thickness",min:.01,max:1,step:.01,value:c.rayThickness,onChange:B("rayThickness")}),(0,r.jsx)(o.yt,{title:"Edge Softness",min:.01,max:2,step:.01,value:c.edgeSoftness,onChange:B("edgeSoftness")}),(0,r.jsx)(o.yt,{title:"Width Pulse",min:0,max:.3,step:.01,value:c.widthPulse,onChange:B("widthPulse")}),(0,r.jsx)(o.yt,{title:"Width Base",min:.05,max:1,step:.01,value:c.widthBase,onChange:B("widthBase")}),(0,r.jsx)(o.yt,{title:"Speed",min:0,max:2,step:.01,value:c.speed,onChange:B("speed")}),(0,r.jsx)(o.yt,{title:"Flicker Rate",min:0,max:4,step:.05,value:c.flickerRate,onChange:B("flickerRate")}),(0,r.jsx)(o.yt,{title:"Horizontal Scale",min:1,max:10,step:.1,value:c.horizontalScale,onChange:B("horizontalScale")}),(0,r.jsx)(o.yt,{title:"Vertical Offset",min:-1.5,max:.5,step:.01,value:c.verticalOffset,onChange:B("verticalOffset")}),(0,r.jsx)(o.yt,{title:"Origin X",min:-3,max:3,step:.05,value:x,onChange:b}),(0,r.jsx)(o.yt,{title:"Red Shift",min:0,max:2,step:.05,value:c.colorShiftR,onChange:B("colorShiftR")}),(0,r.jsx)(o.yt,{title:"Green Shift",min:0,max:2,step:.05,value:c.colorShiftG,onChange:B("colorShiftG")}),(0,r.jsx)(o.yt,{title:"Blue Shift",min:0,max:2,step:.05,value:c.colorShiftB,onChange:B("colorShiftB")}),(0,r.jsx)(o.yt,{title:"Top Fade",min:.2,max:3,step:.05,value:c.vignetteTop,onChange:B("vignetteTop")}),(0,r.jsx)(o.yt,{title:"Bottom Fade",min:.2,max:3,step:.05,value:c.vignetteBottom,onChange:B("vignetteBottom")}),(0,r.jsx)(o.yt,{title:"Side Fade",min:.5,max:8,step:.1,value:c.vignetteSides,onChange:B("vignetteSides")}),(0,r.jsx)(o.yt,{title:"Depth",min:0,max:2,step:.01,value:c.depth,onChange:B("depth")}),(0,r.jsx)(o.yt,{title:"Bloom",min:0,max:10,step:.1,value:c.bloom,onChange:B("bloom")}),(0,r.jsx)(o.yt,{title:"Brightness",min:.5,max:4,step:.05,value:c.brightness,onChange:B("brightness")}),(0,r.jsx)(o.yt,{title:"Parallax",min:0,max:3,step:.05,value:f,onChange:p}),(0,r.jsx)(o.yt,{title:"Wave Strength",min:0,max:3,step:.05,value:v,onChange:g}),(0,r.jsx)(o.tl,{title:"Interactive",checked:y,onChange:S}),(0,r.jsx)(o.tl,{title:"Intro",checked:w,onChange:M}),(0,r.jsx)(o.tl,{title:"Paused",checked:C,onChange:k})]}),(0,r.jsx)(o.Ub,{data:Z})]}),(0,r.jsx)(o.lT,{children:(0,r.jsx)(o.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>r.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>h.CopyButton,IH:()=>o.Customize,gI:()=>f,Dn:()=>v,pi:()=>p,W7:()=>l.PreviewColor,Ch:()=>n.PreviewContainer,UD:()=>l.PreviewInput,bg:()=>l.PreviewSelect,yt:()=>l.PreviewSlider,tl:()=>l.PreviewSwitch,Ec:()=>r.PreviewTab,Ub:()=>i.PropTable,VX:()=>r.TabsLayout,bs:()=>d});var r=a(55019);a(27382);var n=a(10236),o=a(69485),l=a(48543),i=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var c=a(95155);a(66729);var h=a(28592),m=a(90650);let d="rounded-lg border bg-background";function f({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,m.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,m.cn)(d,e),...a,children:t})}function v({title:e,description:t,className:a,children:r}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:r})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>i});var r=a(12115),n=a(30701);let o=()=>()=>{},l=()=>"light";function i(){let{resolvedTheme:e}=(0,n.D)();return(0,r.useSyncExternalStore)(o,()=>"dark"===e?"dark":"light",l)}},90761:(e,t,a)=>{a.d(t,{I:()=>n});var r=a(12115);function n(){let[e,t]=(0,r.useState)(0),a=(0,r.useCallback)(()=>{t(e=>e+1)},[]);return(0,r.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);