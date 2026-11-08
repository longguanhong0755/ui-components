"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[35898],{35898:(e,t,a)=>{a.r(t),a.d(t,{default:()=>A});var r=a(95155),n=a(12115),o=a(86049),i=a(56388),l=a(90761),s=a(81712),u=a(3907),c=a(2253),d=a(90650);let h=["#5227FF","#B84DFF","#FF9FFC","#FFE6FA"],m=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,f=`
precision highp float;

#define MAX_COLORS 4
#define MAX_RAYS 40
#define MAX_BURSTS 6

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uLab[MAX_COLORS];
uniform int uColorCount;
uniform vec3 uBackground;
uniform float uTransparent;
uniform float uInk;
uniform vec2 uNode;
uniform int uRays;
uniform vec4 uRay[MAX_RAYS];
uniform vec4 uRayPulse[MAX_RAYS];
uniform float uReach;
uniform float uGlow;
uniform float uHaze;
uniform float uCore;
uniform float uIntensity;
uniform float uGrain;
uniform float uSeed;
uniform float uBurstRadius[MAX_BURSTS];
uniform float uBurstLevel[MAX_BURSTS];
uniform float uFlash;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

float gradientNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash22(i) * 2.0 - 1.0, f);
  float b = dot(hash22(i + vec2(1.0, 0.0)) * 2.0 - 1.0, f - vec2(1.0, 0.0));
  float c = dot(hash22(i + vec2(0.0, 1.0)) * 2.0 - 1.0, f - vec2(0.0, 1.0));
  float d = dot(hash22(i + vec2(1.0, 1.0)) * 2.0 - 1.0, f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec3 oklabToLinear(vec3 c) {
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

vec3 palette(float t) {
  t = clamp(t, 0.0, 1.0) * mix(1.0, 0.62, uInk);
  vec3 lab = uLab[0];
  if (uColorCount > 1) {
    float scaled = t * float(uColorCount - 1);
    for (int i = 1; i < MAX_COLORS; i++) {
      if (i >= uColorCount) break;
      lab = mix(lab, uLab[i], smoothstep(0.0, 1.0, clamp(scaled - float(i - 1), 0.0, 1.0)));
    }
  }
  return max(oklabToLinear(lab), 0.0);
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  float pixel = 1.0 / max(uResolution.y, 1.0);
  float t = uTime;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  vec2 d = p - uNode;
  float r = length(d);
  float soft = mix(1.0, 0.28, uInk);

  float flash = 0.0;
  for (int k = 0; k < MAX_BURSTS; k++) {
    float wave = r - uBurstRadius[k];
    flash += exp(-wave * wave / 0.0025) * uBurstLevel[k];
  }

  float beams = 0.0;
  for (int i = 0; i < MAX_RAYS; i++) {
    if (i >= uRays) break;
    vec4 ray = uRay[i];
    vec4 extra = uRayPulse[i];
    float along = dot(d, ray.xy);
    float across = abs(dot(d, vec2(-ray.y, ray.x)));
    float width = max(ray.z * (1.0 + max(along, 0.0) * 0.8), pixel * 0.85);
    float front = smoothstep(-0.01, 0.02, along);
    float core = exp(-across * across / (width * width));
    float wing = exp(-across / (width * 7.0 * extra.z));
    float fall = exp(-max(along, 0.0) / uReach);
    float travel = along - extra.x;
    float pulse = exp(-travel * travel / 0.0035) * extra.y;
    beams += ((core + wing * 0.32 * uGlow * soft) * (1.0 + pulse) + core * flash * 3.0) * fall * front * ray.w;
  }

  float haze = clamp(uHaze, 0.0, 2.0);
  vec2 q = d * 2.4 + vec2(uSeed * 1.7, -t * 0.035);
  float swirl = 1.0 + 0.22 * gradientNoise(q + gradientNoise(q * 0.6 + t * 0.025) * 0.9);
  float hot = exp(-r * r / 0.0009);
  float halo = exp(-r / 0.11);
  float mist = exp(-r / 0.2);
  float node = (hot * mix(1.5, 0.8, uInk) + halo * 0.85 * soft) * uCore * (1.0 + uFlash * 0.6);
  node += mist * 0.26 * haze * swirl * soft;

  float light = (beams + node) * uIntensity;
  float tone = 1.0 - exp(-light * 0.35);
  vec3 hdr = palette(tone) * light * 1.3;

  vec3 color;
  float alpha = 1.0;
  if (uInk < 0.5) {
    vec3 glow = 1.0 - exp(-hdr);
    if (uTransparent > 0.5) {
      color = glow;
      alpha = clamp(max(glow.r, max(glow.g, glow.b)), 0.0, 1.0);
    } else {
      color = 1.0 - (1.0 - uBackground) * (1.0 - glow);
    }
  } else {
    float amount = max(hdr.r, max(hdr.g, hdr.b));
    float coverage = smoothstep(0.02, 0.95, 1.0 - exp(-amount * 1.4));
    vec3 hue = amount > 0.0001 ? hdr / amount : vec3(1.0);
    float grey = dot(hue, vec3(0.299, 0.587, 0.114));
    vec3 pigment = clamp(mix(vec3(grey), hue, 1.12), 0.0, 1.0) * mix(1.0, 0.8, coverage);
    if (uTransparent > 0.5) {
      color = pigment * coverage;
      alpha = coverage;
    } else {
      color = uBackground * mix(vec3(1.0), pigment, coverage);
    }
  }

  gl_FragColor = linearToOutputTexel(vec4(color, alpha));
  float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  gl_FragColor.rgb += (dither - 0.5) / 255.0;
  if (uGrain > 0.0) {
    float noise = hash21(gl_FragCoord.xy + fract(uTime * 7.13) * 91.7) - 0.5;
    gl_FragColor.rgb += noise * uGrain * 0.05 * alpha;
  }
}
`,p=(e,t,a)=>Math.min(a,Math.max(t,e)),v=(e,t,a)=>{let r=p((a-e)/(t-e),0,1);return r*r*(3-2*r)},g=e=>{let t=43758.5453*Math.sin(127.1*e+311.7);return t-Math.floor(t)},x=e=>{let t=Math.floor(e),a=e-t,r=(2*g(t)-1)*a;return(r+((2*g(t+1)-1)*(a-1)-r)*(a*a*a*(a*(6*a-15)+10)))*2},y=e=>{let t=e.trim().toLowerCase();return"transparent"===t||(/^#[0-9a-f]{8}$/.test(t)?t.endsWith("00"):/^#[0-9a-f]{4}$/.test(t)?t.endsWith("0"):null!==t.match(/^(?:rgba?|hsla?)\(.*[,/]\s*(0|0?\.0+|0%)\s*\)$/))},b=(e,t)=>{let a=Math.cbrt(.4122214708*e.r+.5363325363*e.g+.0514459929*e.b),r=Math.cbrt(.2119034982*e.r+.6806995451*e.g+.1073969566*e.b),n=Math.cbrt(.0883024619*e.r+.2817188376*e.g+.6299787005*e.b);return t.set(.2104542553*a+.793617785*r-.0040720468*n,1.9779984951*a-2.428592205*r+.4505937099*n,.0259040371*a+.7827717662*r-.808675766*n)},w=(e,t,a)=>{let r=t.trim();try{e.set(/^#[0-9a-f]{8}$/i.test(r)?r.slice(0,7):r)}catch{e.set(a)}return e},C=e=>{let t=window.matchMedia("(min-resolution: 2dppx)");return t.addEventListener("change",e),window.addEventListener("resize",e),()=>{t.removeEventListener("change",e),window.removeEventListener("resize",e)}},F=()=>window.devicePixelRatio||1,k=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},R=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,j=({settings:e,pointerRef:t,wakeRef:a})=>{let{size:o,invalidate:i}=(0,s.C)(),l=(0,n.useRef)(null),u=(0,n.useRef)({time:12.5,excite:new Float32Array(40),bursts:new Float32Array(6).fill(10),nextBurst:0,presses:0}),d=(0,n.useMemo)(()=>({uResolution:{value:new c.I9Y(1,1)},uTime:{value:0},uLab:{value:Array.from({length:4},()=>new c.Pq0)},uColorCount:{value:4},uBackground:{value:new c.Q1f},uTransparent:{value:0},uInk:{value:0},uNode:{value:new c.I9Y(0,0)},uRays:{value:22},uRay:{value:Array.from({length:40},()=>new c.IUQ)},uRayPulse:{value:Array.from({length:40},()=>new c.IUQ)},uReach:{value:.9},uGlow:{value:1},uHaze:{value:1},uCore:{value:1},uIntensity:{value:1},uGrain:{value:0},uSeed:{value:0},uBurstRadius:{value:new Float32Array(6)},uBurstLevel:{value:new Float32Array(6)},uFlash:{value:0}}),[]),C=e.colors.join("|"),{backgroundColor:F}=e;return(0,n.useEffect)(()=>(a.current=i,()=>{a.current=null}),[i,a]),(0,n.useEffect)(()=>{let e=l.current;if(!e)return;let t=e.uniforms,a=C?C.split("|"):h,r=Math.min(a.length,4),n=new c.Q1f;for(let e=0;e<4;e++)w(n,a[Math.min(e,r-1)],h[Math.min(e,h.length-1)]),b(n,t.uLab.value[e]);t.uColorCount.value=r;let o=y(F);w(t.uBackground.value,o?"#000000":F,"#000000"),t.uTransparent.value=+!!o,i()},[C,F,i]),(0,n.useEffect)(()=>{i()},[e,o,i]),(0,s.D)((a,r)=>{let n=l.current;if(!n)return;let s=n.uniforms,c=u.current,d=t.current,h=Math.min(Math.max(r,0),.05),m=!e.paused&&!e.reduced&&e.speed>0,f=m?h*e.speed:0;c.time+=f;let y=c.time,b=o.width/Math.max(o.height,1),w=p(e.swing,0,3),C=(e.originX-.5)*b+.012*x(.09*y+3.1)*w,F=e.originY-.5+.012*x(.08*y+7.7)*w;s.uNode.value.set(C,F);let k=e.interactive&&!e.reduced&&d.inside,R=(d.x-.5)*b-C,j=d.y-.5-F,M=Math.max(p(e.cursorRadius,.005,.5),.005),B=v(.6*M,3*M,Math.hypot(R,j)),S=p(e.cursorBoost,0,3),E=!1;if(d.presses!==c.presses){let t=Math.min(d.presses-c.presses,6);if(c.presses=d.presses,e.clickPulse&&!e.reduced)for(let e=0;e<t;e++)c.bursts[c.nextBurst]=0,c.nextBurst=(c.nextBurst+1)%6}let A=0,z=!1;for(let e=0;e<6;e++){let t=Math.min(c.bursts[e]+h,10);c.bursts[e]=t;let a=t<3?Math.exp(-(1.6*t)):0;s.uBurstRadius.value[e]=1.4*t,s.uBurstLevel.value[e]=a,A+=a*Math.exp(-(4*t)),a>0&&(z=!0)}let L=Math.round(p(e.rays,1,40)),I=p(e.rayWidth,.2,5),X=p(e.pulse,0,2),P=p(e.flicker,0,1);for(let t=0;t<L;t++){let a=7.31*t+13*e.seed+1.7,r=g(a),n=g(a+.37),o=g(a+.71),i=g(a+1.13),l=g(a+1.51),u=2*Math.PI/L,d=1.37*e.seed,m=t>0&&.32>g(a+2.41),f=d+(m?t-1+.5:t+.5)*u+(m?(.12+.18*r)*u:(g(7.31*t+13*e.seed+3.9)-.5)*.8*u)+x(y*(.06+.05*n)+61*o)*w*.06,p=+(i>.82),b=(.0016+.0022*Math.pow(i,3))*I,C=(.4+.45*o+.7*p)*(1-P+P*(.25+.75*v(-.7,.8,x(y*(.22+.18*r)+97*n)))),F=Math.cos(f),A=Math.sin(f),z=R*F+j*A,T=Math.abs(j*F-R*A),N=z>0?T:Math.hypot(R,j),W=k?Math.exp(-(N*N)/(M*M))*B:0,Y=c.excite[t],_=W>Y?10:2.4;c.excite[t]=Y+(W-Y)*(1-Math.exp(-h*_)),Math.abs(W-c.excite[t])>.002&&(E=!0);let G=c.excite[t]*S,H=(y/(2.6+3.4*l)+7.1*r)%1,U=1.6*H-.1,O=X*(.5+n)*v(0,.1,H)*(1-H);s.uRay.value[t].set(F,A,b*(1+.45*G),C*(1+2.4*G)),s.uRayPulse.value[t].set(U,O+.9*G,(.8+.7*o)*(1+.9*p)*(1+.5*G),0)}s.uResolution.value.set(o.width*a.viewport.dpr,o.height*a.viewport.dpr),s.uTime.value=y,s.uInk.value=+("ink"===e.blend),s.uRays.value=L,s.uReach.value=.9*p(e.reach,.05,5),s.uGlow.value=p(e.glow,0,3),s.uHaze.value=p(e.haze,0,2),s.uCore.value=p(e.core,0,3),s.uIntensity.value=p(e.intensity,0,4),s.uGrain.value=p(e.grain,0,1),s.uSeed.value=e.seed,s.uFlash.value=Math.min(A,2),z&&(E=!0),!m&&(E||k)&&i()}),(0,r.jsxs)("mesh",{frustumCulled:!1,children:[(0,r.jsx)("planeGeometry",{args:[1,1]}),(0,r.jsx)("shaderMaterial",{ref:l,vertexShader:m,fragmentShader:f,uniforms:d,depthTest:!1,depthWrite:!1,blending:c.XIg})]})},M=({colors:e=h,backgroundColor:t="#05030c",blend:a="add",originX:o=.5,originY:i=.5,rays:l=22,rayWidth:s=1,glow:c=1,reach:m=1,swing:f=1,pulse:p=.6,flicker:v=.5,haze:g=1,core:x=1,intensity:b=1,speed:w=1,interactive:M=!0,cursorBoost:B=1,cursorRadius:S=.05,clickPulse:E=!0,grain:A=0,seed:z=0,paused:L=!1,dpr:I=1.5,className:X,style:P,children:T})=>{let N=(0,n.useRef)(null),W=(0,n.useRef)({x:.5,y:.5,inside:!1,presses:0}),Y=(0,n.useRef)(null),[_,G]=(0,n.useState)(!0),H=(0,n.useSyncExternalStore)(k,R,()=>!1),U=Math.min((0,n.useSyncExternalStore)(C,F,()=>1),Math.max(I,.5)),O=!L&&!H&&w>0,D=y(t);return(0,n.useEffect)(()=>{let e=N.current;if(!e||"undefined"==typeof IntersectionObserver)return;let t=new IntersectionObserver(([e])=>G(e.isIntersecting),{rootMargin:"80px"});return t.observe(e),()=>t.disconnect()},[]),(0,n.useEffect)(()=>{let e=N.current;if(!e)return;let t=t=>{let a=e.getBoundingClientRect(),r=W.current;r.x=(t.clientX-a.left)/Math.max(a.width,1),r.y=1-(t.clientY-a.top)/Math.max(a.height,1),r.inside=!0},a=e=>{t(e),Y.current?.()},r=e=>{t(e),W.current.presses+=1,Y.current?.()},n=e=>{("pointerup"!==e.type||"mouse"!==e.pointerType)&&(W.current.inside=!1,Y.current?.())};return e.addEventListener("pointermove",a,{passive:!0}),e.addEventListener("pointerdown",r,{passive:!0}),e.addEventListener("pointerleave",n,{passive:!0}),e.addEventListener("pointercancel",n,{passive:!0}),e.addEventListener("pointerup",n,{passive:!0}),()=>{e.removeEventListener("pointermove",a),e.removeEventListener("pointerdown",r),e.removeEventListener("pointerleave",n),e.removeEventListener("pointercancel",n),e.removeEventListener("pointerup",n)}},[]),(0,r.jsxs)("div",{ref:N,className:(0,d.cn)("relative isolate overflow-hidden",X),style:{backgroundColor:D?void 0:t,...P},children:[(0,r.jsx)("div",{className:"absolute inset-0","aria-hidden":"true",children:(0,r.jsx)(u.Hl,{orthographic:!0,dpr:U,frameloop:_&&O?"always":"demand",gl:{antialias:!1,alpha:!0,premultipliedAlpha:!0,powerPreference:"high-performance"},style:{pointerEvents:"none"},children:(0,r.jsx)(j,{settings:{colors:e,backgroundColor:t,blend:a,originX:o,originY:i,rays:l,rayWidth:s,glow:c,reach:m,swing:f,pulse:p,flicker:v,haze:g,core:x,intensity:b,speed:w,interactive:M,cursorBoost:B,cursorRadius:S,clickPulse:E,grain:A,seed:z,paused:L,reduced:H},pointerRef:W,wakeRef:Y})})}),T?(0,r.jsx)("div",{className:"relative z-10 h-full w-full",children:T}):null]})},B={violet:{colors:["#5227FF","#B84DFF","#FF9FFC","#FFE6FA"],background:"#05030c",originX:.5,originY:.5,rays:22,rayWidth:1,glow:1,reach:1,swing:1,pulse:.6,flicker:.5,haze:1,core:1,intensity:1,speed:1,cursorBoost:1,cursorRadius:.05},laser:{colors:["#0A5BFF","#1E90FF","#6FE7FF","#E8FFFF"],background:"#01040c",originX:.5,originY:.5,rays:22,rayWidth:1,glow:1.1,reach:1.1,swing:1,pulse:.6,flicker:.5,haze:1.1,core:1.1,intensity:1,speed:1,cursorBoost:1,cursorRadius:.05},emerald:{colors:["#0B7A3B","#16C45A","#8CF5B0","#EFFFF4"],background:"#010805",originX:.5,originY:.5,rays:20,rayWidth:1,glow:1,reach:1,swing:.8,pulse:.7,flicker:.5,haze:1,core:1,intensity:1,speed:.9,cursorBoost:1,cursorRadius:.05},corner:{colors:["#5227FF","#B84DFF","#FF9FFC","#FFE6FA"],background:"#05030c",originX:.12,originY:.86,rays:18,rayWidth:1.1,glow:1,reach:1.4,swing:1,pulse:.6,flicker:.5,haze:1,core:1,intensity:1,speed:1,cursorBoost:1,cursorRadius:.05},mono:{colors:["#3A3A48","#9A9AB8","#E0E0F0","#FFFFFF"],background:"#050507",originX:.5,originY:.5,rays:22,rayWidth:.9,glow:.9,reach:1,swing:.8,pulse:.5,flicker:.4,haze:.8,core:1,intensity:1,speed:.8,cursorBoost:1,cursorRadius:.05}},S=[{label:"Violet",value:"violet"},{label:"Laser",value:"laser"},{label:"Emerald",value:"emerald"},{label:"Corner",value:"corner"},{label:"Mono",value:"mono"}],E=[{name:"colors",type:"string[]",default:'["#5227FF", "#B84DFF", "#FF9FFC", "#FFE6FA"]',description:"Up to four colours, from the glow around the beams to the hottest core of the junction."},{name:"backgroundColor",type:"string",default:'"#05030c"',description:'Colour behind the light. Pass "transparent" to composite over the page.'},{name:"blend",type:'"add" | "ink"',default:'"add"',description:'"add" emits light on dark backgrounds, "ink" draws the beams on light ones.'},{name:"originX",type:"number",default:"0.5",description:"Horizontal position of the junction, 0 left to 1 right."},{name:"originY",type:"number",default:"0.5",description:"Vertical position of the junction, 0 bottom to 1 top."},{name:"rays",type:"number",default:"22",description:"Number of beams leaving the junction, 1 to 40."},{name:"rayWidth",type:"number",default:"1",description:"Multiplier for the thickness of every beam."},{name:"glow",type:"number",default:"1",description:"Strength of the soft bloom around each beam."},{name:"reach",type:"number",default:"1",description:"How far the beams stay bright before fading, in frame heights."},{name:"swing",type:"number",default:"1",description:"How far the beams and the junction drift over time. 0 holds them still."},{name:"pulse",type:"number",default:"0.6",description:"Strength of the light pulses that travel out along the beams."},{name:"flicker",type:"number",default:"0.5",description:"How strongly the beams brighten and dim over time, 0 to 1."},{name:"haze",type:"number",default:"1",description:"Drifting atmosphere lit by the junction."},{name:"core",type:"number",default:"1",description:"Brightness of the junction and its halo."},{name:"intensity",type:"number",default:"1",description:"Overall brightness."},{name:"speed",type:"number",default:"1",description:"Animation speed. 0 holds the current frame."},{name:"interactive",type:"boolean",default:"true",description:"Beams flare brighter when the pointer touches or sweeps across them."},{name:"cursorBoost",type:"number",default:"1",description:"How brightly a touched beam flares. 0 disables it."},{name:"cursorRadius",type:"number",default:"0.05",description:"How close the pointer must come to a beam to light it up, as a fraction of the height."},{name:"clickPulse",type:"boolean",default:"true",description:"Sends a flash racing out along every beam on click."},{name:"grain",type:"number",default:"0",description:"Optional film grain. Gradients are already dithered, so 0 stays free of banding."},{name:"seed",type:"number",default:"0",description:"Changes the arrangement and timing of the beams."},{name:"paused",type:"boolean",default:"false",description:"Freezes the animation."},{name:"dpr",type:"number",default:"1.5",description:"Upper bound for the device pixel ratio."},{name:"className",type:"string",default:"—",description:"Classes for the root element. Give it a height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."},{name:"children",type:"ReactNode",default:"—",description:"Content layered above the light."}],A=()=>{let[e,t]=(0,l.I)(),a=(0,o.Y)(),[s,u]=(0,n.useState)("violet"),[c,d]=(0,n.useState)(B.violet),[h,m]=(0,n.useState)(null),[f,p]=(0,n.useState)(null),[v,g]=(0,n.useState)(!0),[x,y]=(0,n.useState)(!0),[b,w]=(0,n.useState)(!1),[C,F]=(0,n.useState)(0),[k,R]=(0,n.useState)(0),j=f??("dark"===a?"add":"ink"),A=h??("ink"===j?"#ffffff":c.background),z=e=>t=>d(a=>({...a,[e]:t})),L=e=>t=>d(a=>{let r=[...a.colors];return r[e]=t,{...a,colors:r}});return(0,r.jsxs)("div",{children:[(0,r.jsx)(i.Bg,{}),(0,r.jsxs)(i.VX,{children:[(0,r.jsxs)(i.Ec,{children:[(0,r.jsx)(i.Ch,{onRefresh:t,minHeight:600,children:(0,r.jsx)("div",{className:"relative h-full w-full",children:(0,r.jsx)(M,{className:"h-full w-full",colors:c.colors,backgroundColor:A,blend:j,originX:c.originX,originY:c.originY,rays:c.rays,rayWidth:c.rayWidth,glow:c.glow,reach:c.reach,swing:c.swing,pulse:c.pulse,flicker:c.flicker,haze:c.haze,core:c.core,intensity:c.intensity,speed:c.speed,interactive:v,cursorBoost:c.cursorBoost,cursorRadius:c.cursorRadius,clickPulse:x,grain:C,seed:k,paused:b},e)})}),(0,r.jsxs)(i.IH,{children:[(0,r.jsx)(i.bg,{title:"Preset",value:s,options:S,onChange:e=>{u(e),d(B[e]??B.violet),m(null)}}),(0,r.jsx)(i.bg,{title:"Blend",value:j,options:[{label:"Add",value:"add"},{label:"Ink",value:"ink"}],onChange:e=>p(e)}),(0,r.jsx)(i.W7,{title:"Background",value:A,onChange:m}),(0,r.jsx)(i.W7,{title:"Glow",value:c.colors[0],onChange:L(0)}),(0,r.jsx)(i.W7,{title:"Beam",value:c.colors[1],onChange:L(1)}),(0,r.jsx)(i.W7,{title:"Bright",value:c.colors[2],onChange:L(2)}),(0,r.jsx)(i.W7,{title:"Core",value:c.colors[3],onChange:L(3)}),(0,r.jsx)(i.yt,{title:"Origin X",min:-.2,max:1.2,step:.01,value:c.originX,onChange:z("originX")}),(0,r.jsx)(i.yt,{title:"Origin Y",min:-.2,max:1.2,step:.01,value:c.originY,onChange:z("originY")}),(0,r.jsx)(i.yt,{title:"Rays",min:1,max:40,step:1,value:c.rays,onChange:z("rays")}),(0,r.jsx)(i.yt,{title:"Ray Width",min:.3,max:4,step:.05,value:c.rayWidth,onChange:z("rayWidth")}),(0,r.jsx)(i.yt,{title:"Glow",min:0,max:3,step:.05,value:c.glow,onChange:z("glow")}),(0,r.jsx)(i.yt,{title:"Reach",min:.2,max:3,step:.05,value:c.reach,onChange:z("reach")}),(0,r.jsx)(i.yt,{title:"Swing",min:0,max:3,step:.05,value:c.swing,onChange:z("swing")}),(0,r.jsx)(i.yt,{title:"Pulse",min:0,max:2,step:.05,value:c.pulse,onChange:z("pulse")}),(0,r.jsx)(i.yt,{title:"Flicker",min:0,max:1,step:.01,value:c.flicker,onChange:z("flicker")}),(0,r.jsx)(i.yt,{title:"Haze",min:0,max:2,step:.05,value:c.haze,onChange:z("haze")}),(0,r.jsx)(i.yt,{title:"Core",min:0,max:3,step:.05,value:c.core,onChange:z("core")}),(0,r.jsx)(i.yt,{title:"Intensity",min:.1,max:3,step:.05,value:c.intensity,onChange:z("intensity")}),(0,r.jsx)(i.yt,{title:"Speed",min:0,max:3,step:.05,value:c.speed,onChange:z("speed")}),(0,r.jsx)(i.yt,{title:"Cursor Boost",min:0,max:3,step:.05,value:c.cursorBoost,onChange:z("cursorBoost")}),(0,r.jsx)(i.yt,{title:"Cursor Radius",min:.01,max:.2,step:.005,value:c.cursorRadius,onChange:z("cursorRadius")}),(0,r.jsx)(i.yt,{title:"Grain",min:0,max:1,step:.01,value:C,onChange:F}),(0,r.jsx)(i.yt,{title:"Seed",min:0,max:20,step:1,value:k,onChange:R}),(0,r.jsx)(i.tl,{title:"Interactive",checked:v,onChange:g}),(0,r.jsx)(i.tl,{title:"Click Pulse",checked:x,onChange:y}),(0,r.jsx)(i.tl,{title:"Paused",checked:b,onChange:w})]}),(0,r.jsx)(i.Ub,{data:E})]}),(0,r.jsx)(i.lT,{children:(0,r.jsx)(i.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>r.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>d.CopyButton,IH:()=>o.Customize,gI:()=>f,Dn:()=>v,pi:()=>p,W7:()=>i.PreviewColor,Ch:()=>n.PreviewContainer,UD:()=>i.PreviewInput,bg:()=>i.PreviewSelect,yt:()=>i.PreviewSlider,tl:()=>i.PreviewSwitch,Ec:()=>r.PreviewTab,Ub:()=>l.PropTable,VX:()=>r.TabsLayout,bs:()=>m});var r=a(55019);a(27382);var n=a(10236),o=a(69485),i=a(48543),l=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),h=a(90650);let m="rounded-lg border bg-background";function f({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)(m,e),...a,children:t})}function v({title:e,description:t,className:a,children:r}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:r})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>l});var r=a(12115),n=a(30701);let o=()=>()=>{},i=()=>"light";function l(){let{resolvedTheme:e}=(0,n.D)();return(0,r.useSyncExternalStore)(o,()=>"dark"===e?"dark":"light",i)}},90761:(e,t,a)=>{a.d(t,{I:()=>n});var r=a(12115);function n(){let[e,t]=(0,r.useState)(0),a=(0,r.useCallback)(()=>{t(e=>e+1)},[]);return(0,r.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);