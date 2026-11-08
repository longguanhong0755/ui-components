"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[29595],{29595:(e,t,a)=>{a.r(t),a.d(t,{default:()=>W});var r=a(95155),i=a(12115),n=a(86049),o=a(56388),l=a(90761),s=a(81712),u=a(3907),d=a(2253),c=a(90650);let h=["#5227FF","#B84DFF","#FF9FFC","#FFE6FA"],f=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,p=`
precision highp float;

#define MAX_COLORS 4
#define MAX_RAYS 16

varying vec2 vUv;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uLab[MAX_COLORS];
uniform int uColorCount;
uniform vec3 uBackground;
uniform float uTransparent;
uniform float uInk;
uniform vec2 uOrigin;
uniform vec2 uAxis;
uniform vec2 uHinge;
uniform vec3 uTilt;
uniform float uNear;
uniform float uSpread;
uniform int uRays;
uniform vec4 uRay[MAX_RAYS];
uniform float uReach;
uniform float uHaze;
uniform float uIntensity;
uniform float uGrain;
uniform float uSeed;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

float gradientNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash22(i), f);
  float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
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
  float t = uTime;
  vec2 point = (vUv - 0.5) * vec2(aspect, 1.0);
  vec2 side = vec2(uAxis.y, -uAxis.x);

  float visible = 1.0;
  float near = 1.0;
  if (abs(uTilt.x) > 0.0001) {
    vec2 rel = point - uHinge;
    float x = dot(rel, side);
    float y = dot(rel, uAxis);
    float xc = dot(-uHinge, side);
    float yc = dot(-uHinge, uAxis);
    float den = (y - yc) * uTilt.x + uTilt.z * uTilt.y;
    float k = (uTilt.z * uTilt.y - yc * uTilt.x) / max(den, 0.02);
    visible = smoothstep(0.0, 0.12, den);
    point = uHinge + (xc + k * (x - xc)) * side + ((yc + k * (y - yc)) / uTilt.y) * uAxis;
    near = clamp(1.0 / max(k, 0.05), 0.3, 3.0);
  }

  vec2 d = point - uOrigin;
  float r = length(d);
  float theta = atan(dot(d, side), dot(d, uAxis));
  float past = max(r - uNear, 0.0);
  float blur = 0.02 / max(r, 0.001);

  float rays = 0.0;
  for (int i = 0; i < MAX_RAYS; i++) {
    if (i >= uRays) break;
    vec4 ray = uRay[i];
    float width = sqrt(ray.y * ray.y + blur * blur);
    float offset = theta - ray.x;
    rays += exp(-offset * offset / (width * width)) * (ray.y / width) * ray.z * exp(-past / ray.w);
  }

  float haze = clamp(uHaze, 0.0, 2.0);
  float streaks = 1.0 + 0.22 * gradientNoise(vec2(theta * 18.0 + uSeed * 7.0, t * 0.1));
  float drift = gradientNoise(vec2(theta * 5.0 - uSeed * 3.0, past * 2.6 - t * 0.32));
  float body = 1.0 + 0.2 * min(haze, 1.5) * drift;
  float fanWidth = max(uSpread * 0.8, 0.02);
  float fan = exp(-theta * theta / (fanWidth * fanWidth));
  float fill = fan * exp(-past / max(uReach * 1.35, 0.02));
  float ambient = exp(-past / max(uReach * 3.0, 0.02)) * mix(0.1, 1.0, fan);

  float light = rays * streaks * body * 2.0;
  light += fill * body * 0.4 * haze;
  light += ambient * 0.02 * haze;
  light *= uIntensity * visible * sqrt(near);

  float tone = 1.0 - exp(-light * 0.3);
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
`,m=(e,t,a)=>Math.min(a,Math.max(t,e)),v=e=>e*Math.PI/180,g=(e,t,a)=>{let r=m((a-e)/(t-e),0,1);return r*r*(3-2*r)},y=e=>{let t=43758.5453*Math.sin(127.1*e+311.7);return t-Math.floor(t)},x=e=>{let t=Math.floor(e),a=e-t,r=(2*y(t)-1)*a;return(r+((2*y(t+1)-1)*(a-1)-r)*(a*a*a*(a*(6*a-15)+10)))*2},b=e=>{let t=e.trim().toLowerCase();return"transparent"===t||(/^#[0-9a-f]{8}$/.test(t)?t.endsWith("00"):/^#[0-9a-f]{4}$/.test(t)?t.endsWith("0"):null!==t.match(/^(?:rgba?|hsla?)\(.*[,/]\s*(0|0?\.0+|0%)\s*\)$/))},w=(e,t)=>{let a=Math.cbrt(.4122214708*e.r+.5363325363*e.g+.0514459929*e.b),r=Math.cbrt(.2119034982*e.r+.6806995451*e.g+.1073969566*e.b),i=Math.cbrt(.0883024619*e.r+.2817188376*e.g+.6299787005*e.b);return t.set(.2104542553*a+.793617785*r-.0040720468*i,1.9779984951*a-2.428592205*r+.4505937099*i,.0259040371*a+.7827717662*r-.808675766*i)},C=(e,t,a)=>{let r=t.trim();try{e.set(/^#[0-9a-f]{8}$/i.test(r)?r.slice(0,7):r)}catch{e.set(a)}return e},F=e=>{let t=window.matchMedia("(min-resolution: 2dppx)");return t.addEventListener("change",e),window.addEventListener("resize",e),()=>{t.removeEventListener("change",e),window.removeEventListener("resize",e)}},k=()=>window.devicePixelRatio||1,M=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},j=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,S=({settings:e,pointerRef:t,wakeRef:a})=>{let{size:n,invalidate:o}=(0,s.C)(),l=(0,i.useRef)(null),u=(0,i.useRef)({time:12.5,glow:new Float32Array(16)}),c=(0,i.useMemo)(()=>({uResolution:{value:new d.I9Y(1,1)},uTime:{value:0},uLab:{value:Array.from({length:4},()=>new d.Pq0)},uColorCount:{value:4},uBackground:{value:new d.Q1f},uTransparent:{value:0},uInk:{value:0},uOrigin:{value:new d.I9Y(0,-1.2)},uAxis:{value:new d.I9Y(0,1)},uHinge:{value:new d.I9Y(0,-.5)},uTilt:{value:new d.Pq0(0,1,1.2)},uNear:{value:.7},uSpread:{value:v(36)},uRays:{value:9},uRay:{value:Array.from({length:16},()=>new d.IUQ)},uReach:{value:.3},uHaze:{value:1},uIntensity:{value:1},uGrain:{value:0},uSeed:{value:0}}),[]),F=e.colors.join("|"),{backgroundColor:k}=e;return(0,i.useEffect)(()=>(a.current=o,()=>{a.current=null}),[o,a]),(0,i.useEffect)(()=>{let e=l.current;if(!e)return;let t=e.uniforms,a=F?F.split("|"):h,r=Math.min(a.length,4),i=new d.Q1f;for(let e=0;e<4;e++)C(i,a[Math.min(e,r-1)],h[Math.min(e,h.length-1)]),w(i,t.uLab.value[e]);t.uColorCount.value=r;let n=b(k);C(t.uBackground.value,n?"#000000":k,"#000000"),t.uTransparent.value=+!!n,o()},[F,k,o]),(0,i.useEffect)(()=>{o()},[e,n,o]),(0,s.D)((a,r)=>{let i=l.current;if(!i)return;let s=i.uniforms,d=u.current,c=t.current,h=Math.min(Math.max(r,0),.05),f=!e.paused&&!e.reduced&&e.speed>0;f&&(d.time+=h*e.speed);let p=d.time,b=n.width/Math.max(n.height,1),w=v(e.angle),C=v(m(e.tilt,-60,60)),F=(e.originX-.5)*b,k=e.originY-.5,M=Math.sin(w),j=Math.cos(w),[S,E]=((e,t,a,r,i)=>{let n=[i/2,.5],o=[e,t],l=[a,r],s=0,u=1/0;for(let a=0;a<2;a++){if(1e-6>Math.abs(l[a])){if(o[a]<-n[a]||o[a]>n[a])return[e,t];continue}let r=(-n[a]-o[a])/l[a],i=(n[a]-o[a])/l[a];s=Math.max(s,Math.min(r,i)),u=Math.min(u,Math.max(r,i))}return s>u?[e,t]:[e+a*s,t+r*s]})(F,k,M,j,b),A={aspect:b,originX:F,originY:k,axisX:M,axisY:j,hingeX:S,hingeY:E,sin:Math.sin(C),cos:Math.cos(C)},R=e.interactive&&!e.reduced&&c.inside,z=0;if(R){let[e,t]=((e,t,a)=>{let{axisX:r,axisY:i,hingeX:n,hingeY:o,sin:l,cos:s}=a;if(1e-4>Math.abs(l))return[e,t];let u=-r,d=e-n,c=t-o,h=d*r+c*i,f=-n*i-o*u,p=-n*r-o*i,m=Math.max((h-p)*l+1.2*s,.02),v=(1.2*s-p*l)/m,g=f+v*(d*i+c*u-f),y=(p+v*(h-p))/s;return[n+g*i+y*r,o+g*u+y*i]})((c.x-.5)*b,c.y-.5,A),a=e-F,r=t-k;z=Math.atan2(a*j-r*M,a*M+r*j)}let W=v(m(e.spread,2,85)),T=Math.round(m(e.rays,1,16)),B=m(e.swing,0,3),L=m(e.flicker,0,1),I=m(e.reach,.05,4)/3,H=m(e.rayWidth,.2,4),N=v(m(e.cursorWidth,1,60)),X=m(e.cursorBoost,0,3),Y=!1;for(let t=0;t<T;t++){let a=7.31*t+13*e.seed+1.7,r=y(a),i=y(a+.37),n=y(a+.71),o=y(a+1.13),l=W*(T>1?(t+.5+(r-.5)*.6)/T*2-1:0)*.92+x(p*(.07+.05*i)+61*n)*B*W*.1,u=(.024+.07*Math.pow(o,1.3))*H*(.85+.15*x(.05*p+23*r)),c=(.45+.75*Math.pow(n,1.2))*(1-L+L*(.15+.85*g(-.7,.8,x(p*(.18+.12*r)+97*i)))),f=l-z,m=R?Math.exp(-(f*f)/(N*N)):0,v=d.glow[t],b=m>v?9:2.2;d.glow[t]=v+(m-v)*(1-Math.exp(-h*b)),Math.abs(m-d.glow[t])>.002&&(Y=!0),s.uRay.value[t].set(l,u,c*(1+d.glow[t]*X*2.6),I*(.7+.6*i))}s.uResolution.value.set(n.width*a.viewport.dpr,n.height*a.viewport.dpr),s.uTime.value=p,s.uInk.value=+("ink"===e.blend),s.uOrigin.value.set(F,k),s.uAxis.value.set(M,j),s.uHinge.value.set(S,E),s.uTilt.value.set(A.sin,A.cos,1.2),s.uNear.value=Math.hypot(S-F,E-k),s.uSpread.value=W,s.uRays.value=T,s.uReach.value=I,s.uHaze.value=m(e.haze,0,2),s.uIntensity.value=m(e.intensity,0,4),s.uGrain.value=m(e.grain,0,1),s.uSeed.value=e.seed,!f&&(Y||R)&&o()}),(0,r.jsxs)("mesh",{frustumCulled:!1,children:[(0,r.jsx)("planeGeometry",{args:[1,1]}),(0,r.jsx)("shaderMaterial",{ref:l,vertexShader:f,fragmentShader:p,uniforms:c,depthTest:!1,depthWrite:!1,blending:d.XIg})]})},E=({colors:e=h,backgroundColor:t="#06040d",blend:a="add",originX:n=.5,originY:o=-.7,angle:l=0,tilt:s=20,spread:d=34,rays:f=10,rayWidth:p=1,reach:m=1.1,swing:v=1,flicker:g=.6,haze:y=1,intensity:x=1,speed:w=1,interactive:C=!0,cursorBoost:E=1,cursorWidth:A=5,grain:R=0,seed:z=0,paused:W=!1,dpr:T=1.5,className:B,style:L,children:I})=>{let H=(0,i.useRef)(null),N=(0,i.useRef)({x:.5,y:.5,inside:!1}),X=(0,i.useRef)(null),[Y,O]=(0,i.useState)(!0),P=(0,i.useSyncExternalStore)(M,j,()=>!1),_=Math.min((0,i.useSyncExternalStore)(F,k,()=>1),Math.max(T,.5)),U=!W&&!P&&w>0,G=b(t);return(0,i.useEffect)(()=>{let e=H.current;if(!e||"undefined"==typeof IntersectionObserver)return;let t=new IntersectionObserver(([e])=>O(e.isIntersecting),{rootMargin:"80px"});return t.observe(e),()=>t.disconnect()},[]),(0,i.useEffect)(()=>{let e=H.current;if(!e)return;let t=t=>{let a=e.getBoundingClientRect(),r=N.current;r.x=(t.clientX-a.left)/Math.max(a.width,1),r.y=1-(t.clientY-a.top)/Math.max(a.height,1),r.inside=!0,X.current?.()},a=e=>{("pointerup"!==e.type||"mouse"!==e.pointerType)&&(N.current.inside=!1,X.current?.())};return e.addEventListener("pointermove",t,{passive:!0}),e.addEventListener("pointerdown",t,{passive:!0}),e.addEventListener("pointerleave",a,{passive:!0}),e.addEventListener("pointercancel",a,{passive:!0}),e.addEventListener("pointerup",a,{passive:!0}),()=>{e.removeEventListener("pointermove",t),e.removeEventListener("pointerdown",t),e.removeEventListener("pointerleave",a),e.removeEventListener("pointercancel",a),e.removeEventListener("pointerup",a)}},[]),(0,r.jsxs)("div",{ref:H,className:(0,c.cn)("relative isolate overflow-hidden",B),style:{backgroundColor:G?void 0:t,...L},children:[(0,r.jsx)("div",{className:"absolute inset-0","aria-hidden":"true",children:(0,r.jsx)(u.Hl,{orthographic:!0,dpr:_,frameloop:Y&&U?"always":"demand",gl:{antialias:!1,alpha:!0,premultipliedAlpha:!0,powerPreference:"high-performance"},style:{pointerEvents:"none"},children:(0,r.jsx)(S,{settings:{colors:e,backgroundColor:t,blend:a,originX:n,originY:o,angle:l,tilt:s,spread:d,rays:f,rayWidth:p,reach:m,swing:v,flicker:g,haze:y,intensity:x,speed:w,interactive:C,cursorBoost:E,cursorWidth:A,grain:R,seed:z,paused:W,reduced:P},pointerRef:N,wakeRef:X})})}),I?(0,r.jsx)("div",{className:"relative z-10 h-full w-full",children:I}):null]})},A={violet:{colors:["#5227FF","#B84DFF","#FF9FFC","#FFE6FA"],background:"#06040d",originX:.5,originY:-.7,angle:0,tilt:20,spread:34,rays:10,rayWidth:1,reach:1.1,swing:1,flicker:.6,haze:1,intensity:1,speed:1,cursorBoost:1,cursorWidth:5},moonlight:{colors:["#1B3A8C","#4F7BFF","#A9C6FF","#F2F7FF"],background:"#03050d",originX:.5,originY:1.7,angle:180,tilt:15,spread:30,rays:10,rayWidth:1,reach:1.1,swing:.8,flicker:.5,haze:1,intensity:1,speed:.8,cursorBoost:1,cursorWidth:5},sunrise:{colors:["#7A1238","#E0445E","#FF9A5C","#FFE7C2"],background:"#0d0406",originX:.5,originY:-.5,angle:0,tilt:25,spread:44,rays:11,rayWidth:1,reach:1.2,swing:.8,flicker:.5,haze:1.1,intensity:1,speed:.8,cursorBoost:1,cursorWidth:5},spotlight:{colors:["#3A3A55","#9A9AC0","#E2E2F5","#FFFFFF"],background:"#050507",originX:.12,originY:1.6,angle:150,tilt:10,spread:16,rays:6,rayWidth:1,reach:1.4,swing:.6,flicker:.4,haze:.9,intensity:1,speed:.7,cursorBoost:1,cursorWidth:4},aurora:{colors:["#0B5D63","#12B5A6","#6FF2CF","#E8FFF7"],background:"#02080a",originX:.5,originY:-.7,angle:0,tilt:30,spread:34,rays:10,rayWidth:1.1,reach:1.1,swing:1.2,flicker:.7,haze:1,intensity:1,speed:1,cursorBoost:1,cursorWidth:5}},R=[{label:"Violet",value:"violet"},{label:"Moonlight",value:"moonlight"},{label:"Sunrise",value:"sunrise"},{label:"Spotlight",value:"spotlight"},{label:"Aurora",value:"aurora"}],z=[{name:"colors",type:"string[]",default:'["#5227FF", "#B84DFF", "#FF9FFC", "#FFE6FA"]',description:"Up to four colours, from the body of the rays to their hottest core."},{name:"backgroundColor",type:"string",default:'"#06040d"',description:'Colour behind the light. Pass "transparent" to composite over the page.'},{name:"blend",type:'"add" | "ink"',default:'"add"',description:'"add" emits light on dark backgrounds, "ink" shades light ones.'},{name:"originX",type:"number",default:"0.5",description:"Horizontal position of the light source, 0 left to 1 right."},{name:"originY",type:"number",default:"-0.7",description:"Vertical position of the light source, 0 bottom to 1 top. Values beyond the frame give long, nearly parallel rays."},{name:"angle",type:"number",default:"0",description:"Direction the rays travel, in degrees. 0 points up, 180 down."},{name:"tilt",type:"number",default:"20",description:"Leans the rays towards the viewer in perspective, in degrees. 0 keeps them flat, negative values send them into the distance."},{name:"spread",type:"number",default:"34",description:"Half-width of the fan of rays, in degrees."},{name:"rays",type:"number",default:"10",description:"Number of rays in the fan, 1 to 16."},{name:"rayWidth",type:"number",default:"1",description:"Multiplier for the width of every ray."},{name:"reach",type:"number",default:"1.1",description:"How far the light travels into the frame before fading, in frame heights."},{name:"swing",type:"number",default:"1",description:"How far the rays drift from their resting angles. 0 holds them still."},{name:"flicker",type:"number",default:"0.6",description:"How strongly the rays fade in and out over time, 0 to 1."},{name:"haze",type:"number",default:"1",description:"Soft light scattered between the rays and drifting along them. 0 gives clean rays."},{name:"intensity",type:"number",default:"1",description:"Overall brightness."},{name:"speed",type:"number",default:"1",description:"Animation speed. 0 holds the current frame."},{name:"interactive",type:"boolean",default:"true",description:"Lights up the rays the pointer passes over."},{name:"cursorBoost",type:"number",default:"1",description:"How brightly a ray flares when the pointer lines up with it. 0 disables it."},{name:"cursorWidth",type:"number",default:"5",description:"Angular reach of the pointer, in degrees. Wider values light up neighbouring rays too."},{name:"grain",type:"number",default:"0",description:"Optional film grain. Gradients are already dithered, so 0 stays free of banding."},{name:"seed",type:"number",default:"0",description:"Changes the arrangement and timing of the rays."},{name:"paused",type:"boolean",default:"false",description:"Freezes the drifting rays."},{name:"dpr",type:"number",default:"1.5",description:"Upper bound for the device pixel ratio."},{name:"className",type:"string",default:"—",description:"Classes for the root element. Give it a height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."},{name:"children",type:"ReactNode",default:"—",description:"Content layered above the light."}],W=()=>{let[e,t]=(0,l.I)(),a=(0,n.Y)(),[s,u]=(0,i.useState)("violet"),[d,c]=(0,i.useState)(A.violet),[h,f]=(0,i.useState)(null),[p,m]=(0,i.useState)(null),[v,g]=(0,i.useState)(!0),[y,x]=(0,i.useState)(!1),[b,w]=(0,i.useState)(0),[C,F]=(0,i.useState)(0),k=p??("dark"===a?"add":"ink"),M=h??("ink"===k?"#ffffff":d.background),j=e=>t=>c(a=>({...a,[e]:t})),S=e=>t=>c(a=>{let r=[...a.colors];return r[e]=t,{...a,colors:r}});return(0,r.jsxs)("div",{children:[(0,r.jsx)(o.Bg,{}),(0,r.jsxs)(o.VX,{children:[(0,r.jsxs)(o.Ec,{children:[(0,r.jsx)(o.Ch,{onRefresh:t,minHeight:600,children:(0,r.jsx)("div",{className:"relative h-full w-full",children:(0,r.jsx)(E,{className:"h-full w-full",colors:d.colors,backgroundColor:M,blend:k,originX:d.originX,originY:d.originY,angle:d.angle,tilt:d.tilt,spread:d.spread,rays:d.rays,rayWidth:d.rayWidth,reach:d.reach,swing:d.swing,flicker:d.flicker,haze:d.haze,intensity:d.intensity,speed:d.speed,interactive:v,cursorBoost:d.cursorBoost,cursorWidth:d.cursorWidth,grain:b,seed:C,paused:y},e)})}),(0,r.jsxs)(o.IH,{children:[(0,r.jsx)(o.bg,{title:"Preset",value:s,options:R,onChange:e=>{u(e),c(A[e]??A.violet),f(null)}}),(0,r.jsx)(o.bg,{title:"Blend",value:k,options:[{label:"Add",value:"add"},{label:"Ink",value:"ink"}],onChange:e=>m(e)}),(0,r.jsx)(o.W7,{title:"Background",value:M,onChange:f}),(0,r.jsx)(o.W7,{title:"Body",value:d.colors[0],onChange:S(0)}),(0,r.jsx)(o.W7,{title:"Glow",value:d.colors[1],onChange:S(1)}),(0,r.jsx)(o.W7,{title:"Bright",value:d.colors[2],onChange:S(2)}),(0,r.jsx)(o.W7,{title:"Core",value:d.colors[3],onChange:S(3)}),(0,r.jsx)(o.yt,{title:"Origin X",min:-.5,max:1.5,step:.01,value:d.originX,onChange:j("originX")}),(0,r.jsx)(o.yt,{title:"Origin Y",min:-1.5,max:2.5,step:.01,value:d.originY,onChange:j("originY")}),(0,r.jsx)(o.yt,{title:"Angle",min:-180,max:180,step:1,value:d.angle,valueUnit:"\xb0",onChange:j("angle")}),(0,r.jsx)(o.yt,{title:"Tilt",min:-60,max:60,step:1,value:d.tilt,valueUnit:"\xb0",onChange:j("tilt")}),(0,r.jsx)(o.yt,{title:"Spread",min:4,max:80,step:1,value:d.spread,valueUnit:"\xb0",onChange:j("spread")}),(0,r.jsx)(o.yt,{title:"Rays",min:1,max:16,step:1,value:d.rays,onChange:j("rays")}),(0,r.jsx)(o.yt,{title:"Ray Width",min:.3,max:3,step:.05,value:d.rayWidth,onChange:j("rayWidth")}),(0,r.jsx)(o.yt,{title:"Reach",min:.2,max:3,step:.05,value:d.reach,onChange:j("reach")}),(0,r.jsx)(o.yt,{title:"Swing",min:0,max:2.5,step:.05,value:d.swing,onChange:j("swing")}),(0,r.jsx)(o.yt,{title:"Flicker",min:0,max:1,step:.01,value:d.flicker,onChange:j("flicker")}),(0,r.jsx)(o.yt,{title:"Haze",min:0,max:2,step:.05,value:d.haze,onChange:j("haze")}),(0,r.jsx)(o.yt,{title:"Intensity",min:.1,max:3,step:.05,value:d.intensity,onChange:j("intensity")}),(0,r.jsx)(o.yt,{title:"Speed",min:0,max:3,step:.05,value:d.speed,onChange:j("speed")}),(0,r.jsx)(o.yt,{title:"Cursor Boost",min:0,max:3,step:.05,value:d.cursorBoost,onChange:j("cursorBoost")}),(0,r.jsx)(o.yt,{title:"Cursor Width",min:1,max:30,step:.5,value:d.cursorWidth,valueUnit:"\xb0",onChange:j("cursorWidth")}),(0,r.jsx)(o.yt,{title:"Grain",min:0,max:1,step:.01,value:b,onChange:w}),(0,r.jsx)(o.yt,{title:"Seed",min:0,max:20,step:1,value:C,onChange:F}),(0,r.jsx)(o.tl,{title:"Interactive",checked:v,onChange:g}),(0,r.jsx)(o.tl,{title:"Paused",checked:y,onChange:x})]}),(0,r.jsx)(o.Ub,{data:z})]}),(0,r.jsx)(o.lT,{children:(0,r.jsx)(o.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>r.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>c.CopyButton,IH:()=>n.Customize,gI:()=>p,Dn:()=>v,pi:()=>m,W7:()=>o.PreviewColor,Ch:()=>i.PreviewContainer,UD:()=>o.PreviewInput,bg:()=>o.PreviewSelect,yt:()=>o.PreviewSlider,tl:()=>o.PreviewSwitch,Ec:()=>r.PreviewTab,Ub:()=>l.PropTable,VX:()=>r.TabsLayout,bs:()=>f});var r=a(55019);a(27382);var i=a(10236),n=a(69485),o=a(48543),l=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var d=a(95155);a(66729);var c=a(28592),h=a(90650);let f="rounded-lg border bg-background";function p({className:e,children:t,...a}){return(0,d.jsx)("div",{className:(0,h.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function m({className:e,children:t,...a}){return(0,d.jsx)("div",{className:(0,h.cn)(f,e),...a,children:t})}function v({title:e,description:t,className:a,children:r}){return(0,d.jsxs)("section",{className:a,children:[(0,d.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,d.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,d.jsx)("div",{className:"mt-6",children:r})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>l});var r=a(12115),i=a(30701);let n=()=>()=>{},o=()=>"light";function l(){let{resolvedTheme:e}=(0,i.D)();return(0,r.useSyncExternalStore)(n,()=>"dark"===e?"dark":"light",o)}},90761:(e,t,a)=>{a.d(t,{I:()=>i});var r=a(12115);function i(){let[e,t]=(0,r.useState)(0),a=(0,r.useCallback)(()=>{t(e=>e+1)},[]);return(0,r.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);