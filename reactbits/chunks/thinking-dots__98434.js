"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[98434],{56388:(e,t,a)=>{a.d(t,{Gv:()=>o.CodeExample,lT:()=>n.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>d.CopyButton,IH:()=>u.Customize,gI:()=>p,Dn:()=>h,pi:()=>v,W7:()=>i.PreviewColor,Ch:()=>l.PreviewContainer,UD:()=>i.PreviewInput,bg:()=>i.PreviewSelect,yt:()=>i.PreviewSlider,tl:()=>i.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>r.PropTable,VX:()=>n.TabsLayout,bs:()=>m});var n=a(55019);a(27382);var l=a(10236),u=a(69485),i=a(48543),r=a(87552);a(39260);var o=a(52407),s=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),f=a(90650);let m="rounded-lg border bg-background";function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,f.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function v({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,f.cn)(m,e),...a,children:t})}function h({title:e,description:t,className:a,children:n}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:n})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>l});var n=a(12115);function l(){let[e,t]=(0,n.useState)(0),a=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}},98434:(e,t,a)=>{a.r(t),a.d(t,{default:()=>S});var n=a(95155),l=a(12115),u=a(30701),i=a(56388),r=a(90761),o=a(81712),s=a(3907),c=a(2253),d=a(90650);let f=`
varying vec2 vPlane;

void main() {
  vPlane = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,m=(e,t)=>{let a=new c.Q1f;try{a.setStyle(e,c.Zr2)}catch{a.setStyle(t,c.Zr2)}return a},p=(e,t)=>{try{e.setStyle(t,c.Zr2)}catch{return}},v=(e,t,a)=>Math.min(a,Math.max(t,e)),h=e=>{let t=window.matchMedia("(min-resolution: 2dppx)");return t.addEventListener("change",e),window.addEventListener("resize",e),()=>{t.removeEventListener("change",e),window.removeEventListener("resize",e)}},g=()=>window.devicePixelRatio||1,x=({speed:e,lobes:t,spacing:a,dotSize:u,dotGain:i,dotSoftness:r,jitter:s,pulse:d,pulseRate:h,pulseGlow:g,drift:x,cloudScale:y,turbulence:b,turbulenceScale:S,ambient:w,intensity:C,accentStart:k,accentEnd:j,color:P,accentColor:G,glow:D,glowFalloff:R,grain:A,grainRate:I,vignette:E,backgroundColor:M,opacity:z,cursorInteraction:N,cursorInfluence:T,paused:L,adaptiveQuality:B,targetFps:F,ceiling:H,readPointer:O})=>{let V=(0,l.useRef)(null),q=(0,l.useRef)(0),_=(0,l.useRef)({x:0,y:0,pull:0}),J=(0,l.useRef)({frames:0,span:0,wins:0,cap:4}),{gl:U,size:W}=(0,o.C)(),Q=Math.round(v(t,1,8)),X=(0,l.useMemo)(()=>`
precision highp float;

varying vec2 vPlane;

uniform vec2 uCanvas;
uniform float uClock;
uniform float uSpeed;
uniform float uSpacing;
uniform float uDotSize;
uniform float uDotGain;
uniform float uDotSoft;
uniform float uJitter;
uniform float uPulse;
uniform float uPulseRate;
uniform float uPulseGlow;
uniform float uDrift;
uniform float uCloudScale;
uniform float uTurbulence;
uniform float uTurbScale;
uniform float uAmbient;
uniform float uIntensity;
uniform float uAccentLow;
uniform float uAccentHigh;
uniform float uGlow;
uniform float uGlowFalloff;
uniform float uGrain;
uniform float uGrainRate;
uniform float uVignette;
uniform vec3 uInk;
uniform vec3 uAccent;
uniform vec3 uBackdrop;
uniform float uBackdropAlpha;
uniform float uOpacity;
uniform vec2 uPointer;
uniform float uPointerPull;

float spark(vec2 seed) {
  vec3 drift = fract(vec3(seed.xyx) * vec3(0.1031, 0.1030, 0.0973));
  drift += dot(drift, drift.yzx + 33.33);
  return fract((drift.x + drift.y) * drift.z);
}

float lattice(vec2 p) {
  vec2 base = floor(p);
  vec2 slide = fract(p);
  slide = slide * slide * (3.0 - 2.0 * slide);
  float a = spark(base);
  float b = spark(base + vec2(1.0, 0.0));
  float c = spark(base + vec2(0.0, 1.0));
  float d = spark(base + vec2(1.0, 1.0));
  return mix(mix(a, b, slide.x), mix(c, d, slide.x), slide.y);
}

float churn(vec2 p) {
  mat2 twist = mat2(0.8, 0.6, -0.6, 0.8);
  float sum = 0.0;
  float weight = 0.5;
  for (int k = 0; k < 3; k++) {
    sum += weight * lattice(p);
    p = twist * p * 2.07 + 9.3;
    weight *= 0.5;
  }
  return sum;
}

float lobe(vec2 p, vec2 seat, vec2 stretch, float tilt) {
  float c = cos(tilt);
  float s = sin(tilt);
  vec2 q = mat2(c, -s, s, c) * (p - seat);
  q /= max(stretch, vec2(0.02));
  return exp(-dot(q, q) * 2.4);
}

float cloud(vec2 p, float t) {
  float sum = 0.0;

  for (int i = 0; i < ${Q}; i++) {
    float k = float(i);
    vec2 seat = uDrift * vec2(
      sin(t * (0.55 - k * 0.09) + k * 1.9),
      cos(t * (0.37 + k * 0.05) + k * 1.1)
    );
    vec2 stretch = uCloudScale * vec2(0.46 - k * 0.06, 0.30 + k * 0.04);
    float tilt = 0.35 * sin(t * 0.32 + k * 2.1) + k * 0.7;
    sum += lobe(p, seat, stretch, tilt) * pow(0.78, k);
  }

  sum += (churn(p * uTurbScale + vec2(t * 0.18, -t * 0.11)) - 0.5) * uTurbulence;
  sum += lobe(p, uPointer, vec2(uCloudScale * 0.52, uCloudScale * 0.40), 0.0) *
    uPointerPull;

  return max(sum, 0.0);
}

void main() {
  vec2 pixel = vPlane * uCanvas;
  vec2 field = (pixel - 0.5 * uCanvas) / max(uCanvas.y, 1.0);

  float t = uClock * uSpeed;
  float pitch = max(uSpacing, 0.004);

  vec2 grid = field / pitch;
  vec2 cell = floor(grid);
  vec2 local = fract(grid) - 0.5;
  vec2 seat = (cell + 0.5) * pitch;

  float density = cloud(seat, t);
  float noise = spark(cell + 0.5);
  float beat = 0.5 + 0.5 * sin(t * uPulseRate + cell.x * 0.7 + cell.y * 0.43);

  float radius = uDotSize + density * uDotGain + noise * uJitter;
  radius *= (1.0 - uPulse) + uPulse * beat;
  radius = max(radius, 1e-4);

  float inner = radius * clamp(1.0 - uDotSoft * 0.9, 0.02, 0.99);
  float ink = smoothstep(radius, inner, length(local));

  float accent = smoothstep(uAccentLow, uAccentHigh, density);
  accent *= (1.0 - uPulseGlow * 0.6) + uPulseGlow * 0.6 * beat;
  vec3 tint = mix(uInk, uAccent, clamp(accent, 0.0, 1.0));

  float level = uAmbient + density * uIntensity;
  level *= (1.0 - uPulseGlow) + uPulseGlow * beat;

  float mass = clamp(ink * max(level, 0.0), 0.0, 1.0);
  vec3 col = tint * mass;
  float cover = mass;

  float halo = smoothstep(uAccentLow * 0.9, uAccentHigh * 1.05, density);
  halo *= exp(-length(local) * uGlowFalloff) * uGlow;
  col += uAccent * halo;
  cover = clamp(cover + halo, 0.0, 1.0);

  float vig = smoothstep(1.1, 0.2, length(field));
  float shade = (1.0 - uVignette) + uVignette * vig;
  col *= shade;
  cover *= shade;

  float tick = floor(uClock * max(uGrainRate, 1.0));
  float speck = spark(pixel + tick * 17.0) - 0.5;
  float dust = 1.0 + speck * uGrain * cover * (1.0 - cover) * 8.0;
  col = clamp(col * dust, 0.0, 1.0);
  cover = clamp(cover * dust, 0.0, 1.0);

  float rest = uBackdropAlpha * (1.0 - cover);
  gl_FragColor = vec4(col + uBackdrop * rest, cover + rest) * uOpacity;
}
`,[Q]),Y=(0,l.useMemo)(()=>({uCanvas:{value:new c.I9Y(1,1)},uClock:{value:0},uSpeed:{value:1},uSpacing:{value:.058},uDotSize:{value:.022},uDotGain:{value:.112},uDotSoft:{value:.48},uJitter:{value:.01},uPulse:{value:.1},uPulseRate:{value:1.6},uPulseGlow:{value:.22},uDrift:{value:.22},uCloudScale:{value:1},uTurbulence:{value:.22},uTurbScale:{value:2.4},uAmbient:{value:.16},uIntensity:{value:.86},uAccentLow:{value:.55},uAccentHigh:{value:1.1},uGlow:{value:.035},uGlowFalloff:{value:4},uGrain:{value:.03},uGrainRate:{value:24},uVignette:{value:.1},uInk:{value:m("#ff44af","#ff44af")},uAccent:{value:m("#ff44af","#ff44af")},uBackdrop:{value:m("#0a0a0a","#0a0a0a")},uBackdropAlpha:{value:1},uOpacity:{value:1},uPointer:{value:new c.I9Y(0,0)},uPointerPull:{value:0}}),[]);return(0,l.useEffect)(()=>{let e=V.current;e&&(e.fragmentShader=X,e.needsUpdate=!0)},[X]),(0,l.useEffect)(()=>{let e=V.current;if(!e)return;p(e.uniforms.uInk.value,P),p(e.uniforms.uAccent.value,G);let t="transparent"===M||"none"===M||""===M;e.uniforms.uBackdropAlpha.value=+!t,t||p(e.uniforms.uBackdrop.value,M)},[P,G,M]),(0,o.D)((t,n)=>{let l=V.current;if(!l)return;let o=Math.min(n,.05);L||(q.current+=o);let c=U.getPixelRatio(),f=l.uniforms;f.uCanvas.value.set(W.width*c,W.height*c),f.uClock.value=q.current,f.uSpeed.value=e,f.uSpacing.value=a,f.uDotSize.value=u,f.uDotGain.value=i,f.uDotSoft.value=r,f.uJitter.value=s,f.uPulse.value=d,f.uPulseRate.value=h,f.uPulseGlow.value=g,f.uDrift.value=x,f.uCloudScale.value=y,f.uTurbulence.value=b,f.uTurbScale.value=S,f.uAmbient.value=w,f.uIntensity.value=C,f.uAccentLow.value=k,f.uAccentHigh.value=Math.max(j,k+.01),f.uGlow.value=D,f.uGlowFalloff.value=R,f.uGrain.value=A,f.uGrainRate.value=I,f.uVignette.value=E,f.uOpacity.value=z;let m=W.height||1,p=(W.width||1)/m,v=O(),P=1-Math.exp(-(5*o)),G=N?(v.x-.5)*p:0,M=N?v.y-.5:0,Q=N&&v.inside?Math.max(T,0):0;if(_.current.x+=(G-_.current.x)*P,_.current.y+=(M-_.current.y)*P,_.current.pull+=(Q-_.current.pull)*P,f.uPointer.value.set(_.current.x,_.current.y),f.uPointerPull.value=_.current.pull,!B)return;let X=J.current;if(X.frames+=1,X.span+=n,X.span<.75)return;let Y=X.frames/X.span;X.frames=0,X.span=0;let Z=Math.min(H,X.cap);Y<.85*F&&c>.6?(X.wins=0,X.cap=Math.max(.6,.9*c),U.setPixelRatio(Math.max(.6,.75*c))):Y>.98*F&&c<Z-.01?(X.wins+=1,X.wins>=3&&(X.wins=0,U.setPixelRatio(Math.min(Z,1.25*c)))):X.wins=0}),(0,n.jsxs)("mesh",{frustumCulled:!1,children:[(0,n.jsx)("planeGeometry",{args:[1,1]}),(0,n.jsx)("shaderMaterial",{ref:V,vertexShader:f,fragmentShader:X,uniforms:Y,transparent:!0,depthTest:!1,depthWrite:!1,premultipliedAlpha:!0})]})},y=({speed:e=1,lobes:t=3,spacing:a=.058,dotSize:u=.022,dotGain:i=.112,dotSoftness:r=.48,jitter:o=.01,pulse:c=.1,pulseRate:f=1.6,pulseGlow:m=.22,drift:p=.22,cloudScale:y=1,turbulence:b=.22,turbulenceScale:S=2.4,ambient:w=.16,intensity:C=.86,accentStart:k=.55,accentEnd:j=1.1,color:P="#ff44af",accentColor:G="#ff44af",glow:D=.035,glowFalloff:R=4,grain:A=.03,grainRate:I=24,vignette:E=.1,backgroundColor:M="#0a0a0a",opacity:z=1,cursorInteraction:N=!0,cursorInfluence:T=.35,paused:L=!1,adaptiveQuality:B=!0,targetFps:F=60,dpr:H=1.75,className:O,children:V})=>{let q=(0,l.useRef)(null),_=(0,l.useRef)({x:.5,y:.5,inside:!1}),[J,U]=(0,l.useState)(!0),W=Math.min((0,l.useSyncExternalStore)(h,g,()=>1),Math.max(H,.5)),Q=(0,l.useCallback)(()=>_.current,[]);return(0,l.useEffect)(()=>{let e=q.current;if(!e||"undefined"==typeof IntersectionObserver)return;let t=new IntersectionObserver(([e])=>U(e.isIntersecting),{threshold:0});return t.observe(e),()=>t.disconnect()},[]),(0,l.useEffect)(()=>{let e=q.current;if(!e||!N)return;let t=t=>{let a=e.getBoundingClientRect();a.width&&a.height&&(_.current.x=v((t.clientX-a.left)/a.width,0,1),_.current.y=v(1-(t.clientY-a.top)/a.height,0,1),_.current.inside=!0)},a=()=>{_.current.inside=!1};return e.addEventListener("pointermove",t),e.addEventListener("pointerleave",a),()=>{e.removeEventListener("pointermove",t),e.removeEventListener("pointerleave",a)}},[N]),(0,n.jsxs)("div",{ref:q,className:(0,d.cn)("relative overflow-hidden",O),children:[(0,n.jsx)("div",{className:"absolute inset-0",children:(0,n.jsx)(s.Hl,{orthographic:!0,dpr:W,frameloop:J?"always":"demand",gl:{antialias:!1,alpha:!0,powerPreference:"high-performance"},children:(0,n.jsx)(x,{speed:e,lobes:t,spacing:a,dotSize:u,dotGain:i,dotSoftness:r,jitter:o,pulse:c,pulseRate:f,pulseGlow:m,drift:p,cloudScale:y,turbulence:b,turbulenceScale:S,ambient:w,intensity:C,accentStart:k,accentEnd:j,color:P,accentColor:G,glow:D,glowFalloff:R,grain:A,grainRate:I,vignette:E,backgroundColor:M,opacity:z,cursorInteraction:N,cursorInfluence:T,paused:L,adaptiveQuality:B,targetFps:F,ceiling:W,readPointer:Q})})}),V?(0,n.jsx)("div",{className:"relative z-10 h-full w-full",children:V}):null]})},b=()=>()=>{},S=()=>{let[e,t]=(0,r.I)(),{resolvedTheme:a}=(0,u.D)(),o=(0,l.useSyncExternalStore)(b,()=>!0,()=>!1)&&"dark"===a,[s,c]=(0,l.useState)(1),[d,f]=(0,l.useState)(3),[m,p]=(0,l.useState)(.058),[v,h]=(0,l.useState)(.022),[g,x]=(0,l.useState)(.112),[S,w]=(0,l.useState)(.48),[C,k]=(0,l.useState)(.01),[j,P]=(0,l.useState)(.1),[G,D]=(0,l.useState)(1.6),[R,A]=(0,l.useState)(.22),[I,E]=(0,l.useState)(.22),[M,z]=(0,l.useState)(1),[N,T]=(0,l.useState)(.22),[L,B]=(0,l.useState)(2.4),[F,H]=(0,l.useState)(.16),[O,V]=(0,l.useState)(.86),[q,_]=(0,l.useState)(.55),[J,U]=(0,l.useState)(1.1),[W,Q]=(0,l.useState)(.035),[X,Y]=(0,l.useState)(4),[Z,$]=(0,l.useState)(.03),[K,ee]=(0,l.useState)(.1),[et,ea]=(0,l.useState)(1),[en,el]=(0,l.useState)(!0),[eu,ei]=(0,l.useState)(.35),[er,eo]=(0,l.useState)(!1),[es,ec]=(0,l.useState)(null),[ed,ef]=(0,l.useState)(null),[em,ep]=(0,l.useState)(null),ev=(0,l.useMemo)(()=>null!==ed?ed:"#ff44af",[ed]),eh=(0,l.useMemo)(()=>null!==es?es:"#ff44af",[es]),eg=(0,l.useMemo)(()=>null!==em?em:o?"#0a0a0a":"#ffffff",[o,em]);return(0,n.jsxs)("div",{children:[(0,n.jsx)(i.Bg,{}),(0,n.jsxs)(i.VX,{children:[(0,n.jsxs)(i.Ec,{children:[(0,n.jsx)(i.Ch,{onRefresh:t,minHeight:520,children:(0,n.jsx)("div",{className:"relative h-full w-full",children:(0,n.jsx)(y,{className:"h-full w-full",speed:s,lobes:d,spacing:m,dotSize:v,dotGain:g,dotSoftness:S,jitter:C,pulse:j,pulseRate:G,pulseGlow:R,drift:I,cloudScale:M,turbulence:N,turbulenceScale:L,ambient:F,intensity:O,accentStart:q,accentEnd:J,color:ev,accentColor:eh,glow:W,glowFalloff:X,grain:Z,vignette:K,backgroundColor:eg,opacity:et,cursorInteraction:en,cursorInfluence:eu,paused:er},e)})}),(0,n.jsxs)(i.IH,{children:[(0,n.jsx)(i.yt,{title:"Speed",min:0,max:4,step:.05,value:s,onChange:c}),(0,n.jsx)(i.yt,{title:"Lobes",min:1,max:6,step:1,value:d,onChange:f}),(0,n.jsx)(i.yt,{title:"Spacing",min:.015,max:.15,step:.001,value:m,onChange:p}),(0,n.jsx)(i.yt,{title:"Dot Size",min:0,max:.2,step:.002,value:v,onChange:h}),(0,n.jsx)(i.yt,{title:"Dot Gain",min:0,max:.4,step:.004,value:g,onChange:x}),(0,n.jsx)(i.yt,{title:"Dot Softness",min:0,max:1,step:.02,value:S,onChange:w}),(0,n.jsx)(i.yt,{title:"Jitter",min:0,max:.06,step:.002,value:C,onChange:k}),(0,n.jsx)(i.yt,{title:"Pulse",min:0,max:.6,step:.02,value:j,onChange:P}),(0,n.jsx)(i.yt,{title:"Pulse Rate",min:0,max:6,step:.1,value:G,onChange:D}),(0,n.jsx)(i.yt,{title:"Pulse Glow",min:0,max:.8,step:.02,value:R,onChange:A}),(0,n.jsx)(i.yt,{title:"Drift",min:0,max:1,step:.02,value:I,onChange:E}),(0,n.jsx)(i.yt,{title:"Cloud Scale",min:.2,max:2.5,step:.05,value:M,onChange:z}),(0,n.jsx)(i.yt,{title:"Turbulence",min:0,max:.8,step:.02,value:N,onChange:T}),(0,n.jsx)(i.yt,{title:"Turbulence Scale",min:.2,max:8,step:.1,value:L,onChange:B}),(0,n.jsx)(i.yt,{title:"Ambient",min:0,max:1,step:.02,value:F,onChange:H}),(0,n.jsx)(i.yt,{title:"Intensity",min:0,max:2,step:.02,value:O,onChange:V}),(0,n.jsx)(i.yt,{title:"Accent Start",min:0,max:1.5,step:.02,value:q,onChange:_}),(0,n.jsx)(i.yt,{title:"Accent End",min:.1,max:2.5,step:.02,value:J,onChange:U}),(0,n.jsx)(i.yt,{title:"Glow",min:0,max:.3,step:.005,value:W,onChange:Q}),(0,n.jsx)(i.yt,{title:"Glow Falloff",min:.5,max:12,step:.1,value:X,onChange:Y}),(0,n.jsx)(i.yt,{title:"Grain",min:0,max:.3,step:.005,value:Z,onChange:$}),(0,n.jsx)(i.yt,{title:"Vignette",min:0,max:1,step:.02,value:K,onChange:ee}),(0,n.jsx)(i.yt,{title:"Cursor Influence",min:0,max:2,step:.05,value:eu,onChange:ei}),(0,n.jsx)(i.yt,{title:"Opacity",min:0,max:1,step:.01,value:et,onChange:ea}),(0,n.jsx)(i.W7,{title:"Color",value:ev,onChange:ef}),(0,n.jsx)(i.W7,{title:"Accent Color",value:eh,onChange:ec}),(0,n.jsx)(i.W7,{title:"Background",value:eg,onChange:ep}),(0,n.jsx)(i.tl,{title:"Cursor Interaction",checked:en,onChange:el}),(0,n.jsx)(i.tl,{title:"Paused",checked:er,onChange:eo})]}),(0,n.jsx)(i.Ub,{data:[{name:"speed",type:"number",default:"1",description:"How fast the cloud drifts."},{name:"lobes",type:"number",default:"3",description:"Number of gaussian lobes making up the cloud."},{name:"spacing",type:"number",default:"0.058",description:"Distance between dot centres, in screen heights."},{name:"dotSize",type:"number",default:"0.022",description:"Radius of a dot outside the cloud, as a fraction of a cell."},{name:"dotGain",type:"number",default:"0.112",description:"Extra radius a dot gains at full cloud density."},{name:"dotSoftness",type:"number",default:"0.48",description:"Edge softness of a dot, 0 is hard and 1 is fully feathered."},{name:"jitter",type:"number",default:"0.01",description:"Random per-cell variation in dot radius."},{name:"pulse",type:"number",default:"0.1",description:"Depth of the size ripple travelling across the grid."},{name:"pulseRate",type:"number",default:"1.6",description:"Speed of that ripple."},{name:"pulseGlow",type:"number",default:"0.22",description:"Depth of the matching brightness ripple."},{name:"drift",type:"number",default:"0.22",description:"How far the lobes wander from the centre."},{name:"cloudScale",type:"number",default:"1",description:"Overall size of the cloud."},{name:"turbulence",type:"number",default:"0.22",description:"Strength of the noise that breaks up the cloud edge."},{name:"turbulenceScale",type:"number",default:"2.4",description:"Spatial frequency of that noise."},{name:"ambient",type:"number",default:"0.16",description:"Brightness of dots outside the cloud."},{name:"intensity",type:"number",default:"0.86",description:"Brightness a dot gains at full cloud density."},{name:"accentStart",type:"number",default:"0.55",description:"Density at which the accent colour starts appearing."},{name:"accentEnd",type:"number",default:"1.1",description:"Density at which the accent colour takes over."},{name:"color",type:"string",default:'"#ff44af"',description:"Colour of the resting dots."},{name:"accentColor",type:"string",default:'"#ff44af"',description:"Colour of the dots at the heart of the cloud."},{name:"glow",type:"number",default:"0.035",description:"Strength of the halo around the densest dots."},{name:"glowFalloff",type:"number",default:"4",description:"How quickly that halo falls off inside a cell."},{name:"grain",type:"number",default:"0.03",description:"Film grain strength, 0 to 1."},{name:"grainRate",type:"number",default:"24",description:"Grain refreshes per second."},{name:"vignette",type:"number",default:"0.1",description:"Corner darkening, 0 to 1."},{name:"backgroundColor",type:"string",default:'"#0a0a0a"',description:'Panel backdrop, or "transparent" to show the page through.'},{name:"opacity",type:"number",default:"1",description:"Master alpha."},{name:"cursorInteraction",type:"boolean",default:"true",description:"Let the pointer draw the cloud toward it."},{name:"cursorInfluence",type:"number",default:"0.35",description:"How strongly the pointer swells the cloud."},{name:"paused",type:"boolean",default:"false",description:"Freeze the animation."},{name:"adaptiveQuality",type:"boolean",default:"true",description:"Scale back resolution when the frame budget slips."},{name:"targetFps",type:"number",default:"60",description:"Frame rate the quality meter aims to hold."},{name:"dpr",type:"number",default:"1.75",description:"Upper device pixel ratio bound."},{name:"className",type:"string",default:"-",description:"Optional className applied to the root."},{name:"children",type:"ReactNode",default:"-",description:"Content layered above the dot field."}]})]}),(0,n.jsx)(i.lT,{children:(0,n.jsx)(i.Gv,{})})]})]})}}}]);