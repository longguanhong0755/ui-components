"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[19811],{19811:(e,t,a)=>{a.r(t),a.d(t,{default:()=>y});var n=a(95155),r=a(12115),i=a(30701),l=a(56388),u=a(90761),o=a(81712),s=a(3907),c=a(2253),d=a(90650);let f=`
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
uniform float uBand;
uniform float uDrift;
uniform float uWarp;
uniform float uTilt;
uniform float uGain;
uniform float uContrast;
uniform float uVignette;
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
  float aspect = uCanvas.x / max(uCanvas.y, 1.0);
  vec2 field = (pixel - 0.5 * uCanvas) / max(uCanvas.y, 1.0);
  field -= uFocus * vec2(aspect, 1.0);

  float weave = field.x + field.x * field.y * uWarp + uClock * uDrift;
  float rung = mod(weave, max(uBand, 0.002));
  float ridge = length(field + rung);

  float tone = (1.0 - ridge + field.y * uTilt) * uGain;
  tone = pow(clamp(tone, 0.0, 1.0), max(uContrast, 0.05));

  vec2 edge = vPlane - 0.5;
  tone *= 1.0 - uVignette * dot(edge, edge) * 2.0;
  tone = clamp(tone, 0.0, 1.0);

  vec2 cell = floor(pixel / max(uGrainSize, 1.0));
  float tick = floor(uClock * max(uGrainRate, 1.0));
  float speck = silver(cell, tick) + silver(cell * 0.5 + 7.0, tick) * 0.5;
  float response = tone * (1.0 - tone) * 4.0;
  tone = clamp(tone * (1.0 + speck * uGrain * response * 1.6), 0.0, 1.0);

  vec3 tint = mix(uInk, uHot, smoothstep(0.3, 1.0, tone));
  float rest = uBackdropAlpha * (1.0 - tone);

  gl_FragColor = vec4(tint * tone + uBackdrop * rest, tone + rest) * uOpacity;
}
`,m=(e,t,a)=>Math.min(a,Math.max(t,e)),v=e=>{let t=window.matchMedia("(min-resolution: 2dppx)");return t.addEventListener("change",e),window.addEventListener("resize",e),()=>{t.removeEventListener("change",e),window.removeEventListener("resize",e)}},h=()=>window.devicePixelRatio||1,x=({bandWidth:e,drift:t,warp:a,tilt:i,gain:l,contrast:u,vignette:s,grain:d,grainSize:m,grainRate:v,color:h,hotColor:x,backgroundColor:g,opacity:b,cursorInteraction:y,cursorShift:C,paused:w,adaptiveQuality:k,targetFps:S,readPointer:j})=>{let G=(0,r.useRef)(null),P=(0,r.useRef)(0),R=(0,r.useRef)({x:.5,y:.5}),E=(0,r.useRef)({frames:0,span:0,wins:0}),{gl:B,size:I}=(0,o.C)(),M=(0,r.useMemo)(()=>({uCanvas:{value:new c.I9Y(1,1)},uClock:{value:0},uBand:{value:.1},uDrift:{value:.2},uWarp:{value:1},uTilt:{value:.5},uGain:{value:1},uContrast:{value:1.1},uVignette:{value:.35},uGrain:{value:.05},uGrainSize:{value:1},uGrainRate:{value:24},uInk:{value:new c.Q1f("#334155")},uHot:{value:new c.Q1f("#e2e8f0")},uBackdrop:{value:new c.Q1f("#0a0a0a")},uBackdropAlpha:{value:1},uOpacity:{value:1},uFocus:{value:new c.I9Y(0,0)}}),[]);return(0,r.useEffect)(()=>{let e=G.current;if(!e)return;e.uniforms.uInk.value.set(h),e.uniforms.uHot.value.set(x);let t="transparent"===g||"none"===g||""===g;e.uniforms.uBackdropAlpha.value=+!t,t||e.uniforms.uBackdrop.value.set(g)},[h,x,g]),(0,o.D)((n,r)=>{let o=G.current;if(!o)return;let c=Math.min(r,.05);w||(P.current+=c);let f=B.getPixelRatio(),p=o.uniforms;if(p.uCanvas.value.set(I.width*f,I.height*f),p.uClock.value=P.current,p.uBand.value=e,p.uDrift.value=t,p.uWarp.value=a,p.uTilt.value=i,p.uGain.value=l,p.uContrast.value=u,p.uVignette.value=s,p.uGrain.value=d,p.uGrainSize.value=Math.max(m,1)*f,p.uGrainRate.value=v,p.uOpacity.value=b,y){let e=j(),t=1-Math.exp(-(6*c));R.current.x+=(e.x-R.current.x)*t,R.current.y+=(e.y-R.current.y)*t,p.uFocus.value.set((R.current.x-.5)*C,(R.current.y-.5)*C)}else p.uFocus.value.set(0,0);if(!k)return;let h=E.current;if(h.frames+=1,h.span+=r,h.span<.75)return;let x=h.frames/h.span;h.frames=0,h.span=0;let g=Math.min(window.devicePixelRatio||1,2);x<.85*S&&f>.75?(h.wins=0,B.setPixelRatio(Math.max(.75,.75*f))):x>.98*S&&f<g?(h.wins+=1,h.wins>=3&&(h.wins=0,B.setPixelRatio(Math.min(g,1.25*f)))):h.wins=0}),(0,n.jsxs)("mesh",{frustumCulled:!1,children:[(0,n.jsx)("planeGeometry",{args:[1,1]}),(0,n.jsx)("shaderMaterial",{ref:G,vertexShader:f,fragmentShader:p,uniforms:M,transparent:!0,depthTest:!1,depthWrite:!1,premultipliedAlpha:!0})]})},g=({bandWidth:e=.1,drift:t=.2,warp:a=1,tilt:i=.5,gain:l=1,contrast:u=1.1,vignette:o=.35,grain:c=.05,grainSize:f=1,grainRate:p=24,color:g="#334155",hotColor:b="#e2e8f0",backgroundColor:y="#0a0a0a",opacity:C=1,cursorInteraction:w=!0,cursorShift:k=.6,paused:S=!1,adaptiveQuality:j=!0,targetFps:G=60,dpr:P=2,className:R,children:E})=>{let B=(0,r.useRef)(null),I=(0,r.useRef)({x:.5,y:.5}),[M,z]=(0,r.useState)(!0),N=Math.min((0,r.useSyncExternalStore)(v,h,()=>1),Math.max(P,.5)),W=(0,r.useCallback)(()=>I.current,[]);return(0,r.useEffect)(()=>{let e=B.current;if(!e||"undefined"==typeof IntersectionObserver)return;let t=new IntersectionObserver(([e])=>z(e.isIntersecting),{threshold:0});return t.observe(e),()=>t.disconnect()},[]),(0,r.useEffect)(()=>{let e=B.current;if(!e||!w)return;let t=t=>{let a=e.getBoundingClientRect();a.width&&a.height&&(I.current.x=m((t.clientX-a.left)/a.width,0,1),I.current.y=m(1-(t.clientY-a.top)/a.height,0,1))},a=()=>{I.current.x=.5,I.current.y=.5};return e.addEventListener("pointermove",t),e.addEventListener("pointerleave",a),()=>{e.removeEventListener("pointermove",t),e.removeEventListener("pointerleave",a)}},[w]),(0,n.jsxs)("div",{ref:B,className:(0,d.cn)("relative overflow-hidden",R),children:[(0,n.jsx)("div",{className:"absolute inset-0",children:(0,n.jsx)(s.Hl,{orthographic:!0,dpr:N,frameloop:M?"always":"demand",gl:{antialias:!1,alpha:!0,powerPreference:"high-performance"},children:(0,n.jsx)(x,{bandWidth:e,drift:t,warp:a,tilt:i,gain:l,contrast:u,vignette:o,grain:c,grainSize:f,grainRate:p,color:g,hotColor:b,backgroundColor:y,opacity:C,cursorInteraction:w,cursorShift:k,paused:S,adaptiveQuality:j,targetFps:G,readPointer:W})})}),E?(0,n.jsx)("div",{className:"relative z-10 h-full w-full",children:E}):null]})},b=()=>()=>{},y=()=>{let[e,t]=(0,u.I)(),{resolvedTheme:a}=(0,i.D)(),o=(0,r.useSyncExternalStore)(b,()=>!0,()=>!1)&&"dark"===a,[s,c]=(0,r.useState)(.1),[d,f]=(0,r.useState)(.2),[p,m]=(0,r.useState)(.5),[v,h]=(0,r.useState)(1),[x,y]=(0,r.useState)(1.1),[C,w]=(0,r.useState)(.35),[k,S]=(0,r.useState)(.05),[j,G]=(0,r.useState)(1),[P,R]=(0,r.useState)(24),[E,B]=(0,r.useState)(1),[I,M]=(0,r.useState)(.6),[z,N]=(0,r.useState)(1),[W,F]=(0,r.useState)(!0),[T,H]=(0,r.useState)(!1),[L,D]=(0,r.useState)(null),[O,V]=(0,r.useState)(null),[_,A]=(0,r.useState)(null),Q=(0,r.useMemo)(()=>null!==L?L:o?"#0a0a0a":"#ffffff",[o,L]),U=(0,r.useMemo)(()=>null!==O?O:o?"#334155":"#cbd5e1",[o,O]),X=(0,r.useMemo)(()=>null!==_?_:o?"#e2e8f0":"#1e293b",[o,_]);return(0,n.jsxs)("div",{children:[(0,n.jsx)(l.Bg,{}),(0,n.jsxs)(l.VX,{children:[(0,n.jsxs)(l.Ec,{children:[(0,n.jsx)(l.Ch,{onRefresh:t,children:(0,n.jsx)("div",{className:"relative h-full w-full",children:(0,n.jsx)(g,{className:"h-full w-full",warp:E,bandWidth:s,drift:d,tilt:p,gain:v,contrast:x,vignette:C,grain:k,grainSize:j,grainRate:P,color:U,hotColor:X,backgroundColor:Q,opacity:z,cursorInteraction:W,cursorShift:I,paused:T},e)})}),(0,n.jsxs)(l.IH,{children:[(0,n.jsx)(l.yt,{title:"Warp",min:-3,max:3,step:.05,value:E,onChange:B}),(0,n.jsx)(l.yt,{title:"Band Width",min:.02,max:.4,step:.005,value:s,onChange:c}),(0,n.jsx)(l.yt,{title:"Drift",min:-1,max:1,step:.01,value:d,onChange:f}),(0,n.jsx)(l.yt,{title:"Tilt",min:-2,max:2,step:.05,value:p,onChange:m}),(0,n.jsx)(l.yt,{title:"Gain",min:.2,max:2.5,step:.05,value:v,onChange:h}),(0,n.jsx)(l.yt,{title:"Contrast",min:.2,max:3,step:.05,value:x,onChange:y}),(0,n.jsx)(l.yt,{title:"Vignette",min:0,max:1,step:.01,value:C,onChange:w}),(0,n.jsx)(l.yt,{title:"Grain",min:0,max:.5,step:.005,value:k,onChange:S}),(0,n.jsx)(l.yt,{title:"Grain Size",min:1,max:6,step:1,value:j,onChange:G}),(0,n.jsx)(l.yt,{title:"Grain Rate",min:1,max:60,step:1,value:P,onChange:R}),(0,n.jsx)(l.yt,{title:"Opacity",min:0,max:1,step:.01,value:z,onChange:N}),(0,n.jsx)(l.W7,{title:"Color",value:U,onChange:V}),(0,n.jsx)(l.W7,{title:"Hot Color",value:X,onChange:A}),(0,n.jsx)(l.W7,{title:"Background",value:Q,onChange:D}),(0,n.jsx)(l.tl,{title:"Cursor Interaction",checked:W,onChange:F}),(0,n.jsx)(l.yt,{title:"Cursor Shift",min:0,max:1.5,step:.01,value:I,onChange:M}),(0,n.jsx)(l.tl,{title:"Paused",checked:T,onChange:H})]}),(0,n.jsx)(l.Ub,{data:[{name:"warp",type:"number",default:"1",description:"Fan of the blinds, 0 keeps them straight."},{name:"bandWidth",type:"number",default:"0.1",description:"Spacing between the vertical blinds."},{name:"drift",type:"number",default:"0.2",description:"How fast the blinds roll across the panel."},{name:"tilt",type:"number",default:"0.5",description:"Vertical lean of the light ramp."},{name:"gain",type:"number",default:"1",description:"Overall brightness."},{name:"contrast",type:"number",default:"1.1",description:"Tone response curve, above 1 deepens the shadows."},{name:"vignette",type:"number",default:"0.35",description:"Corner falloff, 0 to 1."},{name:"grain",type:"number",default:"0.05",description:"Film grain strength, 0 to 1."},{name:"grainSize",type:"number",default:"1",description:"Grain cell size in CSS pixels."},{name:"grainRate",type:"number",default:"24",description:"Grain refreshes per second."},{name:"color",type:"string",default:'"#334155"',description:"Base colour of the panel."},{name:"hotColor",type:"string",default:'"#e2e8f0"',description:"Colour reached at the brightest point."},{name:"backgroundColor",type:"string",default:'"#0a0a0a"',description:'Panel backdrop, or "transparent" to show the page through.'},{name:"opacity",type:"number",default:"1",description:"Master alpha."},{name:"cursorInteraction",type:"boolean",default:"true",description:"Let the light source track the pointer."},{name:"cursorShift",type:"number",default:"0.6",description:"How far the light source follows the pointer, 0 to 1."},{name:"paused",type:"boolean",default:"false",description:"Freeze the animation."},{name:"adaptiveQuality",type:"boolean",default:"true",description:"Scale back resolution when the frame budget slips."},{name:"targetFps",type:"number",default:"60",description:"Frame rate the quality meter aims to hold."},{name:"dpr",type:"number",default:"2",description:"Upper device pixel ratio bound."},{name:"className",type:"string",default:"undefined",description:"Extra classes for the panel."},{name:"children",type:"ReactNode",default:"undefined",description:"Content layered above the panel."}]})]}),(0,n.jsx)(l.lT,{children:(0,n.jsx)(l.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>o.CodeExample,lT:()=>n.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>d.CopyButton,IH:()=>i.Customize,gI:()=>m,Dn:()=>h,pi:()=>v,W7:()=>l.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>l.PreviewInput,bg:()=>l.PreviewSelect,yt:()=>l.PreviewSlider,tl:()=>l.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>u.PropTable,VX:()=>n.TabsLayout,bs:()=>p});var n=a(55019);a(27382);var r=a(10236),i=a(69485),l=a(48543),u=a(87552);a(39260);var o=a(52407),s=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),f=a(90650);let p="rounded-lg border bg-background";function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,f.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function v({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,f.cn)(p,e),...a,children:t})}function h({title:e,description:t,className:a,children:n}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:n})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>r});var n=a(12115);function r(){let[e,t]=(0,n.useState)(0),a=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);