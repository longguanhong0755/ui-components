"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[86939],{56388:(e,t,a)=>{a.d(t,{Gv:()=>i.CodeExample,lT:()=>n.CodeTab,Bg:()=>o.ComponentHeader,i8:()=>d.CopyButton,IH:()=>u.Customize,gI:()=>m,Dn:()=>h,pi:()=>v,W7:()=>s.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>s.PreviewInput,bg:()=>s.PreviewSelect,yt:()=>s.PreviewSlider,tl:()=>s.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>l.PropTable,VX:()=>n.TabsLayout,bs:()=>p});var n=a(55019);a(27382);var r=a(10236),u=a(69485),s=a(48543),l=a(87552);a(39260);var i=a(52407),o=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),f=a(90650);let p="rounded-lg border bg-background";function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,f.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function v({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,f.cn)(p,e),...a,children:t})}function h({title:e,description:t,className:a,children:n}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:n})]})}},86939:(e,t,a)=>{a.r(t),a.d(t,{default:()=>b});var n=a(95155),r=a(12115),u=a(30701),s=a(56388),l=a(90761),i=a(81712),o=a(3907),c=a(2253),d=a(90650);let f=`
varying vec2 vPlane;

void main() {
  vPlane = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,p=`
precision highp float;

varying vec2 vPlane;

uniform vec2 uCanvas;
uniform float uClock;
uniform float uSpeed;
uniform float uFreq;
uniform float uThickness;
uniform float uSoftness;
uniform float uRadius;
uniform float uFade;
uniform float uDecay;
uniform float uGain;
uniform float uContrast;
uniform float uPulse;
uniform float uPulseRate;
uniform float uGrain;
uniform float uGrainSize;
uniform float uGrainRate;
uniform vec3 uInk;
uniform vec3 uHot;
uniform vec3 uBackdrop;
uniform float uBackdropAlpha;
uniform float uOpacity;
uniform vec2 uFocus;

float scatter(vec3 seed) {
  vec3 wobble = fract(seed * vec3(0.1031, 0.1030, 0.0973));
  wobble += dot(wobble, wobble.yxz + 33.33);
  return fract((wobble.x + wobble.y) * wobble.z);
}

float silver(vec2 cell, float tick) {
  float a = scatter(vec3(cell, tick));
  float b = scatter(vec3(cell.yx + 41.7, tick + 19.3));
  return a + b - 1.0;
}

void main() {
  vec2 pixel = vPlane * uCanvas;
  vec2 field = (pixel - 0.5 * uCanvas) / max(uCanvas.y, 1.0);
  field -= uFocus;

  float span = length(field);
  float wave = sin(span * uFreq - uClock * uSpeed);
  float core = uThickness / (abs(wave) + max(uSoftness, 0.001));

  float reach = max(uRadius, 0.01);
  float mask = smoothstep(reach, reach * clamp(uFade, 0.0, 0.95), span);

  float breath = 1.0 + uPulse * sin(uClock * uPulseRate);
  float level = core * mask * exp(-span * uDecay) * uGain * breath;
  float cover = pow(clamp(level, 0.0, 1.0), max(uContrast, 0.05));

  vec2 cell = floor(pixel / max(uGrainSize, 1.0));
  float tick = floor(uClock * max(uGrainRate, 1.0));
  float speck = silver(cell, tick) + silver(cell * 0.5 + 7.0, tick) * 0.5;
  float response = cover * (1.0 - cover) * 4.0;
  cover = clamp(cover * (1.0 + speck * uGrain * response * 1.6), 0.0, 1.0);

  vec3 tint = mix(uInk, uHot, smoothstep(0.1, 0.85, cover));
  float rest = uBackdropAlpha * (1.0 - cover);

  gl_FragColor = vec4(tint * cover + uBackdrop * rest, cover + rest) * uOpacity;
}
`,m=(e,t,a)=>Math.min(a,Math.max(t,e)),v=e=>{let t=window.matchMedia("(min-resolution: 2dppx)");return t.addEventListener("change",e),window.addEventListener("resize",e),()=>{t.removeEventListener("change",e),window.removeEventListener("resize",e)}},h=()=>window.devicePixelRatio||1,x=({speed:e,frequency:t,thickness:a,softness:u,radius:s,fade:l,decay:o,gain:d,contrast:m,pulse:v,pulseRate:h,grain:x,grainSize:g,grainRate:y,color:b,hotColor:C,backgroundColor:w,opacity:S,cursorInteraction:k,cursorFollow:j,paused:R,adaptiveQuality:P,targetFps:F,readPointer:G})=>{let E=(0,r.useRef)(null),I=(0,r.useRef)(0),M=(0,r.useRef)({x:.5,y:.5}),z=(0,r.useRef)({frames:0,span:0,wins:0}),{gl:N,size:B}=(0,i.C)(),T=(0,r.useMemo)(()=>({uCanvas:{value:new c.I9Y(1,1)},uClock:{value:0},uSpeed:{value:4},uFreq:{value:26},uThickness:{value:.07},uSoftness:{value:.02},uRadius:{value:.95},uFade:{value:.05},uDecay:{value:.8},uGain:{value:1.3},uContrast:{value:1},uPulse:{value:.15},uPulseRate:{value:.6},uGrain:{value:.05},uGrainSize:{value:1},uGrainRate:{value:24},uInk:{value:new c.Q1f("#0e7490")},uHot:{value:new c.Q1f("#a5f3fc")},uBackdrop:{value:new c.Q1f("#0a0a0a")},uBackdropAlpha:{value:1},uOpacity:{value:1},uFocus:{value:new c.I9Y(0,0)}}),[]);return(0,r.useEffect)(()=>{let e=E.current;if(!e)return;e.uniforms.uInk.value.set(b),e.uniforms.uHot.value.set(C);let t="transparent"===w||"none"===w||""===w;e.uniforms.uBackdropAlpha.value=+!t,t||e.uniforms.uBackdrop.value.set(w)},[b,C,w]),(0,i.D)((n,r)=>{let i=E.current;if(!i)return;let c=Math.min(r,.05);R||(I.current+=c);let f=N.getPixelRatio(),p=i.uniforms;if(p.uCanvas.value.set(B.width*f,B.height*f),p.uClock.value=I.current,p.uSpeed.value=e,p.uFreq.value=t,p.uThickness.value=a,p.uSoftness.value=u,p.uRadius.value=s,p.uFade.value=l,p.uDecay.value=o,p.uGain.value=d,p.uContrast.value=m,p.uPulse.value=v,p.uPulseRate.value=h,p.uGrain.value=x,p.uGrainSize.value=Math.max(g,1)*f,p.uGrainRate.value=y,p.uOpacity.value=S,k){let e=G(),t=1-Math.exp(-(5*c));M.current.x+=(e.x-M.current.x)*t,M.current.y+=(e.y-M.current.y)*t;let a=B.width/Math.max(B.height,1);p.uFocus.value.set((M.current.x-.5)*j*a,(M.current.y-.5)*j)}else p.uFocus.value.set(0,0);if(!P)return;let b=z.current;if(b.frames+=1,b.span+=r,b.span<.75)return;let C=b.frames/b.span;b.frames=0,b.span=0;let w=Math.min(window.devicePixelRatio||1,2);C<.85*F&&f>.75?(b.wins=0,N.setPixelRatio(Math.max(.75,.75*f))):C>.98*F&&f<w?(b.wins+=1,b.wins>=3&&(b.wins=0,N.setPixelRatio(Math.min(w,1.25*f)))):b.wins=0}),(0,n.jsxs)("mesh",{frustumCulled:!1,children:[(0,n.jsx)("planeGeometry",{args:[1,1]}),(0,n.jsx)("shaderMaterial",{ref:E,vertexShader:f,fragmentShader:p,uniforms:T,transparent:!0,depthTest:!1,depthWrite:!1,premultipliedAlpha:!0})]})},g=({speed:e=4,frequency:t=26,thickness:a=.07,softness:u=.02,radius:s=.95,fade:l=.05,decay:i=.8,gain:c=1.3,contrast:f=1,pulse:p=.15,pulseRate:g=.6,grain:y=.05,grainSize:b=1,grainRate:C=24,color:w="#0e7490",hotColor:S="#a5f3fc",backgroundColor:k="#0a0a0a",opacity:j=1,cursorInteraction:R=!0,cursorFollow:P=.9,paused:F=!1,adaptiveQuality:G=!0,targetFps:E=60,dpr:I=2,className:M,children:z})=>{let N=(0,r.useRef)(null),B=(0,r.useRef)({x:.5,y:.5}),[T,H]=(0,r.useState)(!0),D=Math.min((0,r.useSyncExternalStore)(v,h,()=>1),Math.max(I,.5)),L=(0,r.useCallback)(()=>B.current,[]);return(0,r.useEffect)(()=>{let e=N.current;if(!e||"undefined"==typeof IntersectionObserver)return;let t=new IntersectionObserver(([e])=>H(e.isIntersecting),{threshold:0});return t.observe(e),()=>t.disconnect()},[]),(0,r.useEffect)(()=>{let e=N.current;if(!e||!R)return;let t=t=>{let a=e.getBoundingClientRect();a.width&&a.height&&(B.current.x=m((t.clientX-a.left)/a.width,0,1),B.current.y=m(1-(t.clientY-a.top)/a.height,0,1))},a=()=>{B.current.x=.5,B.current.y=.5};return e.addEventListener("pointermove",t),e.addEventListener("pointerleave",a),()=>{e.removeEventListener("pointermove",t),e.removeEventListener("pointerleave",a)}},[R]),(0,n.jsxs)("div",{ref:N,className:(0,d.cn)("relative overflow-hidden",M),children:[(0,n.jsx)("div",{className:"absolute inset-0",children:(0,n.jsx)(o.Hl,{orthographic:!0,dpr:D,frameloop:T?"always":"demand",gl:{antialias:!1,alpha:!0,powerPreference:"high-performance"},children:(0,n.jsx)(x,{speed:e,frequency:t,thickness:a,softness:u,radius:s,fade:l,decay:i,gain:c,contrast:f,pulse:p,pulseRate:g,grain:y,grainSize:b,grainRate:C,color:w,hotColor:S,backgroundColor:k,opacity:j,cursorInteraction:R,cursorFollow:P,paused:F,adaptiveQuality:G,targetFps:E,readPointer:L})})}),z?(0,n.jsx)("div",{className:"relative z-10 h-full w-full",children:z}):null]})},y=()=>()=>{},b=()=>{let[e,t]=(0,l.I)(),{resolvedTheme:a}=(0,u.D)(),i=(0,r.useSyncExternalStore)(y,()=>!0,()=>!1)&&"dark"===a,[o,c]=(0,r.useState)(4),[d,f]=(0,r.useState)(26),[p,m]=(0,r.useState)(.07),[v,h]=(0,r.useState)(.02),[x,b]=(0,r.useState)(.95),[C,w]=(0,r.useState)(.05),[S,k]=(0,r.useState)(.8),[j,R]=(0,r.useState)(1.3),[P,F]=(0,r.useState)(1),[G,E]=(0,r.useState)(.15),[I,M]=(0,r.useState)(.6),[z,N]=(0,r.useState)(.05),[B,T]=(0,r.useState)(1),[H,D]=(0,r.useState)(24),[L,q]=(0,r.useState)(1),[O,_]=(0,r.useState)(!0),[A,Q]=(0,r.useState)(.9),[W,U]=(0,r.useState)(!1),[X,Y]=(0,r.useState)(null),[V,J]=(0,r.useState)(null),[K,Z]=(0,r.useState)(null),$=(0,r.useMemo)(()=>null!==X?X:i?"#0a0a0a":"#ffffff",[i,X]),ee=(0,r.useMemo)(()=>null!==V?V:i?"#0e7490":"#a5f3fc",[i,V]),et=(0,r.useMemo)(()=>null!==K?K:i?"#a5f3fc":"#0e7490",[i,K]);return(0,n.jsxs)("div",{children:[(0,n.jsx)(s.Bg,{}),(0,n.jsxs)(s.VX,{children:[(0,n.jsxs)(s.Ec,{children:[(0,n.jsx)(s.Ch,{onRefresh:t,children:(0,n.jsx)("div",{className:"relative h-full w-full",children:(0,n.jsx)(g,{className:"h-full w-full",speed:o,frequency:d,thickness:p,softness:v,radius:x,fade:C,decay:S,gain:j,contrast:P,pulse:G,pulseRate:I,grain:z,grainSize:B,grainRate:H,color:ee,hotColor:et,backgroundColor:$,opacity:L,cursorInteraction:O,cursorFollow:A,paused:W},e)})}),(0,n.jsxs)(s.IH,{children:[(0,n.jsx)(s.yt,{title:"Speed",min:0,max:12,step:.1,value:o,onChange:c}),(0,n.jsx)(s.yt,{title:"Frequency",min:2,max:60,step:.5,value:d,onChange:f}),(0,n.jsx)(s.yt,{title:"Thickness",min:.005,max:.25,step:.005,value:p,onChange:m}),(0,n.jsx)(s.yt,{title:"Softness",min:.005,max:.2,step:.005,value:v,onChange:h}),(0,n.jsx)(s.yt,{title:"Radius",min:.1,max:1.5,step:.01,value:x,onChange:b}),(0,n.jsx)(s.yt,{title:"Fade",min:0,max:.9,step:.01,value:C,onChange:w}),(0,n.jsx)(s.yt,{title:"Decay",min:0,max:5,step:.05,value:S,onChange:k}),(0,n.jsx)(s.yt,{title:"Gain",min:.1,max:3,step:.05,value:j,onChange:R}),(0,n.jsx)(s.yt,{title:"Contrast",min:.2,max:3,step:.05,value:P,onChange:F}),(0,n.jsx)(s.yt,{title:"Pulse",min:0,max:.6,step:.01,value:G,onChange:E}),(0,n.jsx)(s.yt,{title:"Pulse Rate",min:0,max:4,step:.05,value:I,onChange:M}),(0,n.jsx)(s.yt,{title:"Grain",min:0,max:.3,step:.005,value:z,onChange:N}),(0,n.jsx)(s.yt,{title:"Grain Size",min:1,max:6,step:1,value:B,onChange:T}),(0,n.jsx)(s.yt,{title:"Grain Rate",min:1,max:60,step:1,value:H,onChange:D}),(0,n.jsx)(s.yt,{title:"Opacity",min:0,max:1,step:.01,value:L,onChange:q}),(0,n.jsx)(s.W7,{title:"Color",value:ee,onChange:J}),(0,n.jsx)(s.W7,{title:"Hot Color",value:et,onChange:Z}),(0,n.jsx)(s.W7,{title:"Background",value:$,onChange:Y}),(0,n.jsx)(s.tl,{title:"Cursor Interaction",checked:O,onChange:_}),(0,n.jsx)(s.yt,{title:"Cursor Follow",min:0,max:1,step:.01,value:A,onChange:Q}),(0,n.jsx)(s.tl,{title:"Paused",checked:W,onChange:U})]}),(0,n.jsx)(s.Ub,{data:[{name:"speed",type:"number",default:"4",description:"How fast the rings travel outward."},{name:"frequency",type:"number",default:"26",description:"Number of rings packed into the field."},{name:"thickness",type:"number",default:"0.07",description:"Brightness of each ring core."},{name:"softness",type:"number",default:"0.02",description:"Softness of the ring falloff, small values sharpen it."},{name:"radius",type:"number",default:"0.95",description:"Radius at which the rings fade out."},{name:"fade",type:"number",default:"0.05",description:"Inner edge of the fade as a fraction of radius."},{name:"decay",type:"number",default:"0.8",description:"Exponential dimming with distance from the origin."},{name:"gain",type:"number",default:"1.3",description:"Overall brightness."},{name:"contrast",type:"number",default:"1",description:"Tone response curve, above 1 deepens the gaps."},{name:"pulse",type:"number",default:"0.15",description:"Depth of the slow brightness breath, 0 disables it."},{name:"pulseRate",type:"number",default:"0.6",description:"Speed of the brightness breath."},{name:"grain",type:"number",default:"0.05",description:"Film grain strength, 0 to 1."},{name:"grainSize",type:"number",default:"1",description:"Grain cell size in CSS pixels."},{name:"grainRate",type:"number",default:"24",description:"Grain refreshes per second."},{name:"color",type:"string",default:'"#0e7490"',description:"Colour of the dim part of a ring."},{name:"hotColor",type:"string",default:'"#a5f3fc"',description:"Colour reached at the ring core."},{name:"backgroundColor",type:"string",default:'"#0a0a0a"',description:'Panel backdrop, or "transparent" to show the page through.'},{name:"opacity",type:"number",default:"1",description:"Master alpha."},{name:"cursorInteraction",type:"boolean",default:"true",description:"Let the rings radiate from the pointer."},{name:"cursorFollow",type:"number",default:"0.9",description:"How far the origin follows the pointer, 0 to 1."},{name:"paused",type:"boolean",default:"false",description:"Freeze the animation."},{name:"adaptiveQuality",type:"boolean",default:"true",description:"Scale back resolution when the frame budget slips."},{name:"targetFps",type:"number",default:"60",description:"Frame rate the quality meter aims to hold."},{name:"dpr",type:"number",default:"2",description:"Upper device pixel ratio bound."},{name:"className",type:"string",default:"undefined",description:"Extra classes for the panel."},{name:"children",type:"ReactNode",default:"undefined",description:"Content layered above the panel."}]})]}),(0,n.jsx)(s.lT,{children:(0,n.jsx)(s.Gv,{})})]})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>r});var n=a(12115);function r(){let[e,t]=(0,n.useState)(0),a=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);