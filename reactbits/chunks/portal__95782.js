"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[95782],{56388:(e,t,r)=>{r.d(t,{Gv:()=>s.CodeExample,lT:()=>o.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>d.CopyButton,IH:()=>l.Customize,gI:()=>h,Dn:()=>f,pi:()=>v,W7:()=>n.PreviewColor,Ch:()=>a.PreviewContainer,UD:()=>n.PreviewInput,bg:()=>n.PreviewSelect,yt:()=>n.PreviewSlider,tl:()=>n.PreviewSwitch,Ec:()=>o.PreviewTab,Ub:()=>i.PropTable,VX:()=>o.TabsLayout,bs:()=>m});var o=r(55019);r(27382);var a=r(10236),l=r(69485),n=r(48543),i=r(87552);r(39260);var s=r(52407),u=r(79901);r(24496);var c=r(95155);r(66729);var d=r(28592),p=r(90650);let m="rounded-lg border bg-background";function h({className:e,children:t,...r}){return(0,c.jsx)("div",{className:(0,p.cn)("rounded-xl border bg-muted/50 p-1",e),...r,children:t})}function v({className:e,children:t,...r}){return(0,c.jsx)("div",{className:(0,p.cn)(m,e),...r,children:t})}function f({title:e,description:t,className:r,children:o}){return(0,c.jsxs)("section",{className:r,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:o})]})}},90761:(e,t,r)=>{r.d(t,{I:()=>a});var o=r(12115);function a(){let[e,t]=(0,o.useState)(0),r=(0,o.useCallback)(()=>{t(e=>e+1)},[]);return(0,o.useEffect)(()=>{let e=new MutationObserver(()=>{r()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[r]),[e,r]}},95782:(e,t,r)=>{r.r(t),r.d(t,{default:()=>B});var o=r(95155),a=r(12115),l=r(56388),n=r(90761),i=r(2253),s=r(12246),u=r(90650);let c={streaks:0,tunnel:1,vortex:2},d=(e,t,r)=>Math.min(r,Math.max(t,e)),p=(e,t)=>Number.isFinite(e)?e:t,m=new i.Q1f,h=(e,t)=>{let r=e.trim().toLowerCase();if(!r||"transparent"===r||"none"===r)return[new i.Pq0,0];let o=/^rgba?\(([^)]+)\)$/i.exec(r);if(o){let e=o[1].split(",").map(e=>Number.parseFloat(e));return[new i.Pq0((e[0]??0)/255,(e[1]??0)/255,(e[2]??0)/255),e.length>3&&Number.isFinite(e[3])?d(e[3],0,1):1]}try{m.setStyle(r,i.jf0)}catch{m.setStyle(t,i.jf0)}return[new i.Pq0(m.r,m.g,m.b),1]},v=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},f=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,y=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,g=`
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uPrimaryColor;
uniform vec3 uSecondaryColor;
uniform vec3 uCenterColor;
uniform float uDensity;
uniform float uLayerCount;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uVerticalDistortion;
uniform float uDepthIntensity;
uniform float uBrightness;
uniform float uScale;
uniform vec3 uBallBgColor;
uniform float uBallBgAlpha;
uniform float uMode;
uniform float uFlowAngle;
uniform float uStretch;
uniform float uSize;
uniform float uVariety;
uniform float uRimWidth;
uniform float uRimGlow;
uniform float uBoost;
uniform vec2 uLook;
uniform float uOpen;
uniform float uPixel;

varying vec2 vUv;

const float TAU = 6.28318530718;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

vec2 particles(vec2 coord, float cells, float layer, float drift, float period) {
  coord.x *= cells;
  coord.y *= period > 0.0 ? period : cells;
  coord.x += drift;
  vec2 id = floor(coord);
  vec2 local = fract(coord);
  if (period > 0.0) id.y = mod(id.y, period);
  float light = 0.0;
  float tint = 0.0;
  for (int i = -1; i <= 1; i++) {
    vec2 cell = id + vec2(float(i), 0.0);
    vec2 h = hash2(cell + layer * 17.31);
    vec2 h2 = hash2(cell * 1.7 + layer * 3.1 + 9.2);
    vec2 center = vec2(float(i) + 0.15 + 0.7 * h.x, 0.15 + 0.7 * h.y);
    vec2 offset = local - center;
    float size = uSize * (0.045 + 0.06 * h2.x);
    float spot = exp(-dot(offset, offset) / (size * size));
    float alive = smoothstep(0.08, 0.22, h2.y);
    float energy = spot * alive * (0.45 + 0.55 * h2.y);
    light += energy;
    tint += energy * h.x;
  }
  return vec2(light, tint / max(light, 0.0001));
}

vec2 field(vec2 p) {
  if (uMode < 0.5) {
    float c = cos(uFlowAngle);
    float s = sin(uFlowAngle);
    p = vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
    p.x += sin(uTime * uWaveFrequency) * uWaveAmplitude;
    p.y += sin(p.x * 1.4) * uVerticalDistortion;
    p.x *= 0.1 / uStretch;
    return p;
  }
  float r = max(length(p), 0.0001);
  float a = atan(p.y, p.x);
  float depth = -log(r) * 0.12 / uStretch;
  if (uMode > 1.5) a += log(r) * 1.4 + uTime * 0.1;
  a += sin(uTime * uWaveFrequency) * uWaveAmplitude * 0.15;
  depth += sin(a * 3.0) * uVerticalDistortion * 0.02;
  return vec2(depth, fract(a / TAU));
}

vec3 portal(vec2 coord, float radius, out float tintMix) {
  float depthGradient = max(radius - length(coord), 0.0);
  vec2 p = field(coord);
  float flow = uTime * 2.3;
  float sum = 0.0;
  float tint = 0.0;
  float scales[7];
  scales[0] = 30.0;
  scales[1] = 20.0;
  scales[2] = 15.0;
  scales[3] = 10.0;
  scales[4] = 8.0;
  scales[5] = 6.0;
  scales[6] = 5.0;
  float weights[7];
  weights[0] = 0.3;
  weights[1] = 0.5;
  weights[2] = 0.8;
  weights[3] = 1.0;
  weights[4] = 1.0;
  weights[5] = 1.0;
  weights[6] = 1.0;
  for (int i = 0; i < 7; i++) {
    if (float(i) >= uLayerCount) break;
    float cells = scales[i] * uDensity;
    float period = uMode < 0.5 ? 0.0 : floor(cells * 2.0 + 0.5);
    vec2 part = particles(p, cells, float(i), flow, period);
    sum += part.x * weights[i];
    tint += part.y * part.x * weights[i];
  }
  tintMix = tint / max(sum, 0.0001);
  sum *= uDepthIntensity / max(depthGradient, 0.012 * uRimWidth);
  vec3 streak = mix(uPrimaryColor, uSecondaryColor, mix(0.5, tintMix, uVariety));
  return streak * sum * 0.9 * uBrightness * (1.0 + uBoost * 0.6);
}

void main() {
  vec2 coord = (vUv - 0.5) * 2.0;
  coord.x *= uResolution.x / uResolution.y;
  coord /= uScale;
  float radius = 0.5 * uOpen;
  vec2 lens = coord - uLook * 0.06 * smoothstep(radius, 0.0, length(coord));
  float r = length(coord);
  float tintMix;
  vec3 color = portal(lens, max(radius, 0.001), tintMix);
  float depthGradient = max(radius - r, 0.0);
  vec3 rim = uCenterColor * 0.02 / max(depthGradient + 0.008 * uRimWidth, 0.0005) * uRimGlow;
  color += rim;
  color = 1.0 - exp(-color * 1.15);

  float edge = max(uPixel * 1.5, 0.0015);
  float ball = smoothstep(radius + edge, radius - edge, r);
  float light = max(color.r, max(color.g, color.b));
  float show = smoothstep(0.08, 0.6, light) * ball;

  float outside = max(r - radius, 0.0);
  float halo = exp(-outside / max(0.035 * uRimGlow, 0.002)) * (1.0 - ball) * min(uRimGlow, 2.0) * (radius > 0.002 ? 1.0 : 0.0);
  vec3 haloColor = mix(uCenterColor, mix(uPrimaryColor, uSecondaryColor, 0.5), 0.35);

  vec3 inner;
  float innerAlpha;
  if (uBallBgAlpha > 0.0) {
    inner = mix(uBallBgColor, color, show);
    innerAlpha = ball * max(uBallBgAlpha, show);
  } else {
    inner = color;
    innerAlpha = show;
  }
  float haloAlpha = clamp(halo * 0.55, 0.0, 1.0);
  float total = innerAlpha + haloAlpha * (1.0 - innerAlpha);
  vec3 mixed = (inner * innerAlpha + haloColor * haloAlpha * (1.0 - innerAlpha)) / max(total, 0.0001);
  gl_FragColor = vec4(mixed, clamp(total, 0.0, 1.0));
}
`,C=(0,a.forwardRef)(function({className:e,style:t,primaryColor:r="#C084FC",secondaryColor:l="#E879F9",centerColor:n="#F0ABFC",ballBgColor:m="auto",mode:C="streaks",speed:x=.25,density:w=1,layerCount:b=7,particleSize:F=1,streakLength:S=1,flowAngle:B=0,colorVariety:A=.6,waveAmplitude:k=1,waveFrequency:E=.75,verticalDistortion:j=.5,depthIntensity:L=.75,brightness:M=1,scale:P=1.5,rimWidth:W=1,rimGlow:D=1,hoverTilt:R=1,interactive:I=!0,boostStrength:T=1,intro:z=!0,paused:V=!1,dpr:G=2},q){let N=(0,a.useRef)(null),H=(0,a.useRef)(null),U={primaryColor:r,secondaryColor:l,centerColor:n,ballBgColor:m,mode:C,speed:x,density:w,layerCount:b,particleSize:F,streakLength:S,flowAngle:B,colorVariety:A,waveAmplitude:k,waveFrequency:E,verticalDistortion:j,depthIntensity:L,brightness:M,scale:P,rimWidth:W,rimGlow:D,hoverTilt:R,interactive:I,boostStrength:T,intro:z,paused:V,dpr:G,reduced:(0,a.useSyncExternalStore)(v,f,()=>!1)},O=(0,a.useRef)(U);return(0,a.useEffect)(()=>{O.current=U,H.current?.sync()}),(0,a.useEffect)(()=>{let e=N.current;if(!e)return;let t=function(e,t){let r,o=e.ownerDocument,a=o.defaultView??window;try{r=new s.WebGLRenderer({antialias:!0,alpha:!0,premultipliedAlpha:!1,powerPreference:"high-performance"})}catch{return null}r.setClearColor(0,0);let l=r.domElement;l.setAttribute("aria-hidden","true"),l.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block",e.appendChild(l);let n={uTime:{value:0},uResolution:{value:new i.I9Y(1,1)},uPrimaryColor:{value:new i.Pq0},uSecondaryColor:{value:new i.Pq0},uCenterColor:{value:new i.Pq0},uDensity:{value:1},uLayerCount:{value:7},uWaveAmplitude:{value:1},uWaveFrequency:{value:.75},uVerticalDistortion:{value:.5},uDepthIntensity:{value:.75},uBrightness:{value:1},uScale:{value:1.5},uBallBgColor:{value:new i.Pq0},uBallBgAlpha:{value:0},uMode:{value:0},uFlowAngle:{value:0},uStretch:{value:1},uSize:{value:1},uVariety:{value:.6},uRimWidth:{value:1},uRimGlow:{value:1},uBoost:{value:0},uLook:{value:new i.I9Y},uOpen:{value:1},uPixel:{value:.002}},u=new i.BKk({vertexShader:y,fragmentShader:g,uniforms:n,transparent:!1,blending:i.XIg,depthTest:!1,depthWrite:!1}),m=new i.bdM(2,2),v=new i.eaF(m,u);v.frustumCulled=!1;let f=new i.Z58;f.add(v);let C=new i.qUd(-1,1,1,-1,0,1),x=0,w=0,b=!1,F="",S=-10,B=0,A=0,k=0,E=0,j=0,L=0,M=-1,P=1,W=0,D=0,R=0,I=!1,T=!1,z=!1,V=null,G=()=>{let o=t.current,l=Math.round(e.clientWidth),i=Math.round(e.clientHeight);if(l<2||i<2)return b=!1,!1;let s=Math.min(a.devicePixelRatio||1,d(p(o.dpr,2),.5,3));return(!b||l!==x||i!==w||r.getPixelRatio()!==s)&&(b=!0,x=l,w=i,r.setPixelRatio(s),r.setSize(x,w,!1),n.uResolution.value.set(x,w),!0)},q=()=>{if(!b)return;let o=t.current;performance.now()-S>1e3&&(S=performance.now(),(()=>{let r=t.current,o="auto"===r.ballBgColor.trim().toLowerCase()&&(()=>{let t=e.parentElement;for(;t;){let e=a.getComputedStyle(t).backgroundColor.match(/rgba?\(([^)]+)\)/);if(e){let t=e[1].split(",").map(e=>Number.parseFloat(e));if(t.length<4||t[3]>.05)return .2126*t[0]+.7152*t[1]+.0722*t[2]>140}t=t.parentElement}return!a.matchMedia("(prefers-color-scheme: dark)").matches})(),l=[r.primaryColor,r.secondaryColor,r.centerColor,r.ballBgColor,o].join("|");if(l===F)return;F=l;let[i]=h(r.primaryColor,"#C084FC"),[s]=h(r.secondaryColor,"#E879F9"),[u]=h(r.centerColor,"#F0ABFC");if(n.uPrimaryColor.value.copy(i),n.uSecondaryColor.value.copy(s),n.uCenterColor.value.copy(u),"auto"===r.ballBgColor.trim().toLowerCase())o?(n.uBallBgColor.value.set(.035+.04*i.x,.03+.03*i.y,.06+.06*i.z),n.uBallBgAlpha.value=1):n.uBallBgAlpha.value=0;else{let[e,t]=h(r.ballBgColor,"#000000");n.uBallBgColor.value.copy(e),n.uBallBgAlpha.value=t}})());let l=d(p(o.scale,1.5),.2,5);n.uTime.value=B,n.uDensity.value=d(p(o.density,1),.2,4),n.uLayerCount.value=d(Math.round(p(o.layerCount,7)),1,7),n.uWaveAmplitude.value=d(p(o.waveAmplitude,1),0,4),n.uWaveFrequency.value=d(p(o.waveFrequency,.75),0,4),n.uVerticalDistortion.value=d(p(o.verticalDistortion,.5),0,3),n.uDepthIntensity.value=d(p(o.depthIntensity,.75),0,3),n.uBrightness.value=d(p(o.brightness,1),0,4),n.uScale.value=l,n.uMode.value=c[o.mode]??0,n.uFlowAngle.value=p(o.flowAngle,0)*Math.PI/180+.35*E,n.uStretch.value=d(p(o.streakLength,1),.2,4)*(1+.8*A),n.uSize.value=d(p(o.particleSize,1),.2,4),n.uVariety.value=d(p(o.colorVariety,.6),0,1),n.uRimWidth.value=d(p(o.rimWidth,1),.2,6),n.uRimGlow.value=d(p(o.rimGlow,1),0,4),n.uBoost.value=A,n.uLook.value.set(k,E),n.uOpen.value=P,n.uPixel.value=2/Math.max(w*l,1),r.render(f,C)},N=()=>{T||z||!I||D||(D=requestAnimationFrame(H))},H=e=>{if(D=0,T||z)return;let r=t.current,a=R&&e-R<100?Math.min(Math.max((e-R)/1e3,0),.05):1/60;R=e;let l=!r.reduced&&!r.paused;l&&(B+=a*d(p(r.speed,.25),0,5)*(1+4*A),(A*=Math.exp(-a/.9))<.001&&(A=0));let n=r.reduced?1:1-Math.exp(-a/.4);k+=(j-k)*n,E+=(L-E)*n,r.intro&&!r.reduced?(M<0&&(M=e),W+=(-55*(P-1)-8.5*W)*a,P+=W*a):(P=1,W=0),q();let i=Math.abs(j-k)+Math.abs(L-E)>5e-4||Math.abs(P-1)+Math.abs(W)>5e-4||A>0;(l||i)&&!o.hidden?D=requestAnimationFrame(H):R=0},U=e=>{A=Math.min(A+e,3)},O=e=>{e.isPrimary&&("mouse"!==e.pointerType||0===e.button)&&(V={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()})},X=e=>{let r=V;if(V=null,!r||r.id!==e.pointerId||Math.hypot(e.clientX-r.x,e.clientY-r.y)>10||performance.now()-r.time>600)return;let o=t.current;!o.interactive||o.reduced||o.paused||(U(d(p(o.boostStrength,1),0,3)),N())},_=r=>{if("touch"===r.pointerType)return;let o=t.current,a=e.getBoundingClientRect();if(a.width<=0||a.height<=0)return;let l=d(p(o.hoverTilt,1),0,3);j=d(((r.clientX-a.left)/a.width-.5)*2,-1,1)*l,L=d((.5-(r.clientY-a.top)/a.height)*2,-1,1)*l,N()},Y=e=>{"touch"!==e.pointerType&&(j=0,L=0,N())},K=()=>{V=null},Q=()=>{R=0,N()},Z=e=>{e.preventDefault(),z=!0,cancelAnimationFrame(D),D=0},$=()=>{z=!1,F="",N()},J=new ResizeObserver(()=>{G()&&(q(),N())}),ee=new IntersectionObserver(([e])=>{I=e.isIntersecting,R=0,N()},{rootMargin:"120px"});return e.addEventListener("pointerdown",O),e.addEventListener("pointerup",X),e.addEventListener("pointermove",_),e.addEventListener("pointerleave",Y),e.addEventListener("pointercancel",K),o.addEventListener("visibilitychange",Q),l.addEventListener("webglcontextlost",Z),l.addEventListener("webglcontextrestored",$),J.observe(e),ee.observe(e),t.current.intro&&!t.current.reduced&&(P=.02),B=4*!!t.current.reduced,G(),{sync:()=>{S=-10,G(),R=0,!D&&I&&(q(),N())},boost:e=>{let r=t.current;r.reduced||(U(d(p(e??r.boostStrength,1),0,3)),N())},destroy:()=>{T=!0,cancelAnimationFrame(D),J.disconnect(),ee.disconnect(),e.removeEventListener("pointerdown",O),e.removeEventListener("pointerup",X),e.removeEventListener("pointermove",_),e.removeEventListener("pointerleave",Y),e.removeEventListener("pointercancel",K),o.removeEventListener("visibilitychange",Q),l.removeEventListener("webglcontextlost",Z),l.removeEventListener("webglcontextrestored",$),f.remove(v),m.dispose(),u.dispose(),r.dispose(),l.remove()}}}(e,O);return H.current=t,()=>{t?.destroy(),H.current=null}},[]),(0,a.useImperativeHandle)(q,()=>({boost:e=>H.current?.boost(e)}),[]),(0,o.jsx)("div",{ref:N,className:(0,u.cn)("absolute inset-0",e),style:t})});C.displayName="Portal";let x={primaryColor:"#C084FC",secondaryColor:"#E879F9",centerColor:"#F0ABFC",mode:"streaks",speed:.25,density:1,layerCount:7,particleSize:1,streakLength:1,colorVariety:.6,waveAmplitude:1,verticalDistortion:.5,depthIntensity:.75,rimWidth:1,rimGlow:1},w={classic:x,hyperspace:{...x,primaryColor:"#7DD3FC",secondaryColor:"#A5B4FC",centerColor:"#E0F2FE",mode:"tunnel",speed:.6,streakLength:1.4,depthIntensity:.6},vortex:{...x,primaryColor:"#5227FF",secondaryColor:"#FF9FFC",centerColor:"#B19EEF",mode:"vortex",speed:.35,colorVariety:1,rimGlow:1.4},nebula:{...x,primaryColor:"#FF5F9E",secondaryColor:"#7C5CFF",centerColor:"#FFC2E2",particleSize:1.8,density:.7,colorVariety:1,waveAmplitude:1.6},emerald:{...x,primaryColor:"#34D399",secondaryColor:"#22D3EE",centerColor:"#D1FAE5",mode:"tunnel",speed:.3,particleSize:.8,rimWidth:2},solar:{...x,primaryColor:"#FB923C",secondaryColor:"#FACC15",centerColor:"#FFF1D6",mode:"vortex",speed:.45,streakLength:1.8,rimGlow:1.6},frost:{...x,primaryColor:"#E0E7FF",secondaryColor:"#93C5FD",centerColor:"#FFFFFF",speed:.15,layerCount:5,particleSize:.7,streakLength:2.2,verticalDistortion:.2,rimWidth:.6},ember:{...x,primaryColor:"#F43F5E",secondaryColor:"#FB7185",centerColor:"#FFE4E6",speed:.5,density:1.4,particleSize:.8,depthIntensity:1}},b=[{label:"Classic",value:"classic"},{label:"Hyperspace",value:"hyperspace"},{label:"Vortex",value:"vortex"},{label:"Nebula",value:"nebula"},{label:"Emerald",value:"emerald"},{label:"Solar",value:"solar"},{label:"Frost",value:"frost"},{label:"Ember",value:"ember"}],F=[{label:"Streaks",value:"streaks"},{label:"Tunnel",value:"tunnel"},{label:"Vortex",value:"vortex"}],S=[{name:"primaryColor",type:"string",default:'"#C084FC"',description:"First colour of the light streaks."},{name:"secondaryColor",type:"string",default:'"#E879F9"',description:"Second colour of the light streaks."},{name:"centerColor",type:"string",default:'"#F0ABFC"',description:"Colour of the glowing rim and halo."},{name:"ballBgColor",type:"string",default:'"auto"',description:"Fill behind the streaks inside the portal. Auto is transparent on dark pages and a dark window on light pages. Accepts any colour or transparent."},{name:"mode",type:'"streaks" | "tunnel" | "vortex"',default:'"streaks"',description:"How the light travels: sideways streaks, a warp tunnel flying out of the centre, or a spiral vortex."},{name:"speed",type:"number",default:"0.25",description:"Speed of the streaks."},{name:"density",type:"number",default:"1",description:"How many particles each layer holds."},{name:"layerCount",type:"number",default:"7",description:"Number of particle layers, from 1 to 7."},{name:"particleSize",type:"number",default:"1",description:"Size of each particle of light."},{name:"streakLength",type:"number",default:"1",description:"How long the light streaks are stretched."},{name:"flowAngle",type:"number",default:"0",description:"Direction of the streaks in degrees (streaks mode)."},{name:"colorVariety",type:"number",default:"0.6",description:"How much each particle varies between the two colours."},{name:"waveAmplitude",type:"number",default:"1",description:"Strength of the slow sway."},{name:"waveFrequency",type:"number",default:"0.75",description:"Speed of the slow sway."},{name:"verticalDistortion",type:"number",default:"0.5",description:"Waviness across the streaks."},{name:"depthIntensity",type:"number",default:"0.75",description:"How strongly light gathers toward the rim, giving depth."},{name:"brightness",type:"number",default:"1",description:"Overall brightness."},{name:"scale",type:"number",default:"1.5",description:"Size of the portal in the frame."},{name:"rimWidth",type:"number",default:"1",description:"Width of the glowing rim."},{name:"rimGlow",type:"number",default:"1",description:"Brightness of the rim and the halo around it."},{name:"hoverTilt",type:"number",default:"1",description:"How far the flow leans toward the pointer."},{name:"interactive",type:"boolean",default:"true",description:"Click to jump into hyperspace: the streaks stretch and race, then settle."},{name:"boostStrength",type:"number",default:"1",description:"Strength of the click boost."},{name:"intro",type:"boolean",default:"true",description:"Springs the portal open when it appears."},{name:"paused",type:"boolean",default:"false",description:"Stops the motion. Reduced-motion users get a still portal."},{name:"dpr",type:"number",default:"2",description:"Maximum device pixel ratio for the canvas."},{name:"ref",type:"{ boost }",default:"—",description:"boost(strength?) triggers the hyperspace jump from code."},{name:"className",type:"string",default:"—",description:"Classes for the root, which fills its positioned parent."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."}],B=()=>{let[e,t]=(0,n.I)(),[r,i]=(0,a.useState)("classic"),[s,u]=(0,a.useState)(w.classic),c=e=>t=>u(r=>({...r,[e]:t})),[d,p]=(0,a.useState)("auto"),[m,h]=(0,a.useState)(0),[v,f]=(0,a.useState)(.75),[y,g]=(0,a.useState)(1),[x,B]=(0,a.useState)(1.5),[A,k]=(0,a.useState)(1),[E,j]=(0,a.useState)(1),[L,M]=(0,a.useState)(!0),[P,W]=(0,a.useState)(!0),[D,R]=(0,a.useState)(!1);return(0,o.jsxs)("div",{children:[(0,o.jsx)(l.Bg,{}),(0,o.jsxs)(l.VX,{children:[(0,o.jsxs)(l.Ec,{children:[(0,o.jsx)(l.Ch,{onRefresh:t,children:(0,o.jsx)(C,{...s,ballBgColor:d,flowAngle:m,waveFrequency:v,brightness:y,scale:x,hoverTilt:A,boostStrength:E,interactive:L,intro:P,paused:D},e)}),(0,o.jsxs)(l.IH,{children:[(0,o.jsx)(l.bg,{title:"Preset",value:r,options:b,onChange:e=>{i(e),u(w[e]??w.classic)}}),(0,o.jsx)(l.bg,{title:"Mode",value:s.mode,options:F,onChange:e=>c("mode")(e)}),(0,o.jsx)(l.W7,{title:"Primary Color",value:s.primaryColor,onChange:c("primaryColor")}),(0,o.jsx)(l.W7,{title:"Secondary Color",value:s.secondaryColor,onChange:c("secondaryColor")}),(0,o.jsx)(l.W7,{title:"Rim Color",value:s.centerColor,onChange:c("centerColor")}),(0,o.jsx)(l.W7,{title:"Ball Background",value:"auto"===d?"#0a0a0a":d,onChange:p}),(0,o.jsx)(l.yt,{title:"Speed",min:0,max:2,step:.01,value:s.speed,onChange:c("speed")}),(0,o.jsx)(l.yt,{title:"Density",min:.3,max:2.5,step:.01,value:s.density,onChange:c("density")}),(0,o.jsx)(l.yt,{title:"Layers",min:1,max:7,step:1,value:s.layerCount,onChange:c("layerCount")}),(0,o.jsx)(l.yt,{title:"Particle Size",min:.3,max:3,step:.01,value:s.particleSize,onChange:c("particleSize")}),(0,o.jsx)(l.yt,{title:"Streak Length",min:.3,max:3,step:.01,value:s.streakLength,onChange:c("streakLength")}),(0,o.jsx)(l.yt,{title:"Flow Angle",min:-90,max:90,step:1,value:m,valueUnit:"\xb0",onChange:h}),(0,o.jsx)(l.yt,{title:"Color Variety",min:0,max:1,step:.01,value:s.colorVariety,onChange:c("colorVariety")}),(0,o.jsx)(l.yt,{title:"Wave Amplitude",min:0,max:3,step:.01,value:s.waveAmplitude,onChange:c("waveAmplitude")}),(0,o.jsx)(l.yt,{title:"Wave Frequency",min:0,max:2,step:.01,value:v,onChange:f}),(0,o.jsx)(l.yt,{title:"Vertical Distortion",min:0,max:2,step:.01,value:s.verticalDistortion,onChange:c("verticalDistortion")}),(0,o.jsx)(l.yt,{title:"Depth",min:.1,max:2,step:.01,value:s.depthIntensity,onChange:c("depthIntensity")}),(0,o.jsx)(l.yt,{title:"Brightness",min:.2,max:2.5,step:.01,value:y,onChange:g}),(0,o.jsx)(l.yt,{title:"Scale",min:.6,max:3,step:.01,value:x,onChange:B}),(0,o.jsx)(l.yt,{title:"Rim Width",min:.2,max:4,step:.01,value:s.rimWidth,onChange:c("rimWidth")}),(0,o.jsx)(l.yt,{title:"Rim Glow",min:0,max:3,step:.01,value:s.rimGlow,onChange:c("rimGlow")}),(0,o.jsx)(l.yt,{title:"Hover Tilt",min:0,max:2,step:.01,value:A,onChange:k}),(0,o.jsx)(l.yt,{title:"Boost",min:0,max:3,step:.01,value:E,onChange:j}),(0,o.jsx)(l.tl,{title:"Interactive",checked:L,onChange:M}),(0,o.jsx)(l.tl,{title:"Intro",checked:P,onChange:W}),(0,o.jsx)(l.tl,{title:"Paused",checked:D,onChange:R})]}),(0,o.jsx)(l.Ub,{data:S})]}),(0,o.jsx)(l.lT,{children:(0,o.jsx)(l.Gv,{})})]})]})}}}]);