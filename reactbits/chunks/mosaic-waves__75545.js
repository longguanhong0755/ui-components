"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[48050,75545],{48050:(e,t,a)=>{a.r(t),a.d(t,{default:()=>v});var l=a(95155),r=a(12115),n=a(81712),u=a(3907),i=a(2253),o=a(90650);let s=`
varying vec2 vPlane;

void main() {
  vPlane = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,c=`
precision highp float;

varying vec2 vPlane;

uniform vec2 uCanvas;
uniform float uClock;
uniform float uPitch;
uniform float uFill;
uniform float uRound;
uniform float uFeather;
uniform float uWarp;
uniform float uWarpScale;
uniform float uDetailScale;
uniform float uWaveScale;
uniform float uFalloff;
uniform float uGain;
uniform float uAmbient;
uniform vec3 uInk;
uniform vec3 uHot;
uniform float uGamma;
uniform float uVignette;
uniform float uOpacity;
uniform vec3 uBackdrop;
uniform float uBackdropAlpha;
uniform vec3 uPointer;
uniform float uCursorPull;
uniform float uCursorGlow;
uniform float uCursorReach;

float chip(vec2 cell) {
  return fract(sin(dot(cell, vec2(12.543, 514.123))) * 4732.12);
}

float swell(vec2 spot) {
  vec2 cell = floor(spot);
  vec2 lean = fract(spot);
  lean = lean * lean * (3.0 - 2.0 * lean);

  float lo = mix(chip(cell), chip(cell + vec2(1.0, 0.0)), lean.x);
  float hi = mix(chip(cell + vec2(0.0, 1.0)), chip(cell + vec2(1.0, 1.0)), lean.x);
  return mix(lo, hi, lean.y);
}

void main() {
  vec2 pixel = vPlane * uCanvas;
  float pitch = max(uPitch, 2.0);

  vec2 grid = pixel / pitch;
  vec2 local = abs(fract(grid) - 0.5) * 2.0;
  float boxy = max(local.x, local.y);
  float orb = length(local);
  float bite = mix(boxy, orb, uRound);

  float aa = 2.0 / pitch;
  float soft = aa + uFeather * uFill;
  float tile = 1.0 - smoothstep(uFill - soft, uFill + soft, bite);

  vec2 field = pixel / max(uCanvas.y, 1.0);

  vec2 toward = uPointer.xy - field;
  float span = max(uCursorReach, 0.001);
  float near = exp(-dot(toward, toward) / (span * span)) * uPointer.z;
  field += toward * near * uCursorPull;

  float t = uClock;
  float inner = swell(field * uDetailScale - t * 0.66);
  vec2 folded = field + uWarp * swell(field * uWarpScale + t + inner * 0.5);
  float wave = swell(folded * uWaveScale - vec2(0.0, t));

  float ridge = pow(max(1.0 - wave, 0.0), uFalloff) * uGain;
  ridge += near * uCursorGlow;

  float level = clamp(uAmbient + ridge, 0.0, 1.0);
  level = pow(level, 1.0 / max(uGamma, 0.05));

  vec2 off = vPlane - 0.5;
  float edge = 1.0 - uVignette * smoothstep(0.2, 0.75, length(off));

  vec3 tint = mix(uInk, uHot, smoothstep(0.6, 1.0, level));
  float cover = clamp(level * tile * edge, 0.0, 1.0);
  float rest = uBackdropAlpha * (1.0 - cover);
  gl_FragColor = vec4(tint * cover + uBackdrop * rest, cover + rest) * uOpacity;
}
`,f=(e,t,a)=>Math.min(Math.max(e,t),a),d=()=>()=>{},m=()=>window.devicePixelRatio||1,p=e=>{let t=e.trim().toLowerCase();return"transparent"===t||"none"===t||""===t},h=({ceiling:e,readPointer:t,pitch:a,fill:u,shape:o,feather:d,speed:m,warp:h,warpScale:v,detailScale:x,waveScale:g,falloff:b,brightness:C,ambient:w,color:y,hotColor:S,backgroundColor:j,gamma:P,vignette:k,opacity:R,cursorInteraction:F,cursorPull:M,cursorGlow:G,cursorReach:W,adaptiveQuality:I,targetFps:B,paused:A})=>{let{gl:D,invalidate:E,setDpr:H}=(0,n.C)(),N=(0,r.useRef)(null),O=(0,r.useRef)(0),T=(0,r.useRef)(0),q=(0,r.useRef)({scale:e,frames:0,span:0,wins:0,roof:1/0}),[L,Q]=(0,r.useState)(!1);(0,r.useEffect)(()=>{let e=window.matchMedia("(prefers-reduced-motion: reduce)"),t=()=>Q(e.matches);return t(),e.addEventListener("change",t),()=>e.removeEventListener("change",t)},[]),(0,r.useEffect)(()=>{let t=q.current;t.scale=e,t.roof=1/0,t.wins=0,H(e)},[e,H]);let V=(0,r.useMemo)(()=>({uCanvas:{value:new i.I9Y(1,1)},uClock:{value:0},uPitch:{value:4},uFill:{value:.5},uRound:{value:0},uFeather:{value:.15},uWarp:{value:.375},uWarpScale:{value:3},uDetailScale:{value:7},uWaveScale:{value:4},uFalloff:{value:5},uGain:{value:5},uAmbient:{value:0},uInk:{value:new i.Q1f("#3366ff")},uHot:{value:new i.Q1f("#bfd4ff")},uGamma:{value:2.2},uVignette:{value:0},uOpacity:{value:1},uBackdrop:{value:new i.Q1f("#0a0a0a")},uBackdropAlpha:{value:1},uPointer:{value:new i.Pq0(.5,.5,0)},uCursorPull:{value:.35},uCursorGlow:{value:.25},uCursorReach:{value:.28}}),[]);return(0,n.D)((l,r)=>{let n=N.current;if(!n)return;let s=n.uniforms,c=Math.min(r,.05);O.current+=c,A||L||(T.current+=c*m*.5);let Q=D.getDrawingBufferSize(new i.I9Y),V=D.getPixelRatio();s.uCanvas.value.set(Q.x,Q.y),s.uClock.value=T.current,s.uPitch.value=Math.max(a,2)*V,s.uFill.value=f(u,.05,1),s.uRound.value=+("dot"===o),s.uFeather.value=f(d,0,1),s.uWarp.value=h,s.uWarpScale.value=v,s.uDetailScale.value=x,s.uWaveScale.value=g,s.uFalloff.value=Math.max(b,.1),s.uGain.value=C,s.uAmbient.value=w,s.uInk.value.set(y),s.uHot.value.set(S),s.uGamma.value=Math.max(P,.05),s.uVignette.value=k,s.uOpacity.value=R,p(j)?s.uBackdropAlpha.value=0:(s.uBackdrop.value.set(j),s.uBackdropAlpha.value=1);let _=t();_.reach+=(_.toReach-_.reach)*Math.min(5*c,1);let z=Q.x/Math.max(Q.y,1);s.uPointer.value.set(_.x*z,1-_.y,F?_.reach:0),s.uCursorPull.value=M,s.uCursorGlow.value=G,s.uCursorReach.value=W;let U=q.current;if(U.frames+=1,U.span+=r,U.span>=.75){let t=U.frames/U.span;if(U.frames=0,U.span=0,I&&O.current>.5)if(t<.85*B&&U.scale>.5)U.roof=U.scale,U.scale=Math.max(.5,.75*U.scale),U.wins=0,H(U.scale);else if(t>=.95*B&&U.scale<e){U.wins+=1;let t=Math.min(e,1.25*U.scale);U.wins>=3&&t<.98*U.roof&&(U.scale=t,U.wins=0,H(t))}else U.wins=0}E()}),(0,l.jsxs)("mesh",{frustumCulled:!1,children:[(0,l.jsx)("planeGeometry",{args:[2,2]}),(0,l.jsx)("shaderMaterial",{ref:N,uniforms:V,vertexShader:s,fragmentShader:c,transparent:!0,premultipliedAlpha:!0,depthTest:!1,depthWrite:!1})]})},v=({width:e="100%",height:t="100%",className:a,children:n,pitch:i=4,fill:s=.5,shape:c="square",feather:v=.15,speed:x=1,warp:g=.375,warpScale:b=3,detailScale:C=7,waveScale:w=4,falloff:y=5,brightness:S=5,ambient:j=0,color:P="#3366ff",hotColor:k="#bfd4ff",backgroundColor:R="#0a0a0a",gamma:F=2.2,vignette:M=0,opacity:G=1,cursorInteraction:W=!0,cursorPull:I=.35,cursorGlow:B=.25,cursorReach:A=.28,adaptiveQuality:D=!0,targetFps:E=60,dpr:H=2,paused:N=!1})=>{let O=(0,r.useRef)(null),T=(0,r.useRef)({x:.5,y:.5,reach:0,toReach:0}),[q,L]=(0,r.useState)(!1),Q=(0,r.useSyncExternalStore)(d,m,()=>1);(0,r.useEffect)(()=>{let e=O.current;if(!e)return;let t=new IntersectionObserver(([e])=>L(e.isIntersecting),{rootMargin:"120px"});return t.observe(e),()=>t.disconnect()},[]);let V=(0,r.useCallback)(()=>T.current,[]),_=(0,r.useCallback)(e=>{let t=O.current;if(!t)return;let a=t.getBoundingClientRect();a.width&&a.height&&(T.current.x=(e.clientX-a.left)/a.width,T.current.y=(e.clientY-a.top)/a.height,T.current.toReach=1)},[]),z=(0,r.useCallback)(()=>{T.current.toReach=0},[]),U=(0,r.useMemo)(()=>f(Math.min(Q,H),.5,2),[Q,H]);return(0,l.jsxs)("div",{ref:O,className:(0,o.cn)("relative overflow-hidden",a),style:{width:e,height:t,backgroundColor:p(R)?void 0:R},onPointerMove:W?_:void 0,onPointerLeave:W?z:void 0,children:[(0,l.jsx)(u.Hl,{className:"absolute inset-0",dpr:U,frameloop:q?"always":"demand",gl:{antialias:!1,alpha:!0,powerPreference:"high-performance"},orthographic:!0,children:(0,l.jsx)(h,{ceiling:U,readPointer:V,pitch:i,fill:s,shape:c,feather:v,speed:x,warp:g,warpScale:b,detailScale:C,waveScale:w,falloff:y,brightness:S,ambient:j,color:P,hotColor:k,backgroundColor:R,gamma:F,vignette:M,opacity:G,cursorInteraction:W,cursorPull:I,cursorGlow:B,cursorReach:A,adaptiveQuality:D,targetFps:E,paused:N})}),n?(0,l.jsx)("div",{className:"relative z-10 h-full w-full",children:n}):null]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>o.CodeExample,lT:()=>l.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>f.CopyButton,IH:()=>n.Customize,gI:()=>p,Dn:()=>v,pi:()=>h,W7:()=>u.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>u.PreviewInput,bg:()=>u.PreviewSelect,yt:()=>u.PreviewSlider,tl:()=>u.PreviewSwitch,Ec:()=>l.PreviewTab,Ub:()=>i.PropTable,VX:()=>l.TabsLayout,bs:()=>m});var l=a(55019);a(27382);var r=a(10236),n=a(69485),u=a(48543),i=a(87552);a(39260);var o=a(52407),s=a(79901);a(24496);var c=a(95155);a(66729);var f=a(28592),d=a(90650);let m="rounded-lg border bg-background";function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,d.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function h({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,d.cn)(m,e),...a,children:t})}function v({title:e,description:t,className:a,children:l}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:l})]})}},75545:(e,t,a)=>{a.r(t),a.d(t,{default:()=>c});var l=a(95155),r=a(12115),n=a(30701),u=a(56388),i=a(90761),o=a(48050);let s=()=>()=>{},c=()=>{let[e,t]=(0,i.I)(),{resolvedTheme:a}=(0,n.D)(),c=(0,r.useSyncExternalStore)(s,()=>!0,()=>!1)&&"dark"===a,[f,d]=(0,r.useState)(null),[m,p]=(0,r.useState)(null),[h,v]=(0,r.useState)(null),x=(0,r.useMemo)(()=>null!==f?f:c?"#0a0a0a":"#ffffff",[c,f]),g=(0,r.useMemo)(()=>null!==m?m:c?"#3366ff":"#7f9cf5",[c,m]),b=(0,r.useMemo)(()=>null!==h?h:c?"#bfd4ff":"#2b52d8",[c,h]),[C,w]=(0,r.useState)(4),[y,S]=(0,r.useState)(.5),[j,P]=(0,r.useState)("square"),[k,R]=(0,r.useState)(.15),[F,M]=(0,r.useState)(1),[G,W]=(0,r.useState)(.375),[I,B]=(0,r.useState)(3),[A,D]=(0,r.useState)(7),[E,H]=(0,r.useState)(4),[N,O]=(0,r.useState)(5),[T,q]=(0,r.useState)(5),[L,Q]=(0,r.useState)(0),[V,_]=(0,r.useState)(2.2),[z,U]=(0,r.useState)(0),[X,Y]=(0,r.useState)(1),[J,K]=(0,r.useState)(!0),[Z,$]=(0,r.useState)(.35),[ee,et]=(0,r.useState)(.25),[ea,el]=(0,r.useState)(.28),[er,en]=(0,r.useState)(!0),[eu,ei]=(0,r.useState)(!1);return(0,l.jsxs)("div",{children:[(0,l.jsx)(u.Bg,{}),(0,l.jsxs)(u.VX,{children:[(0,l.jsxs)(u.Ec,{children:[(0,l.jsx)(u.Ch,{onRefresh:t,children:(0,l.jsx)("div",{className:"relative h-full w-full",children:(0,l.jsx)(o.default,{pitch:C,fill:y,shape:j,feather:k,speed:F,warp:G,warpScale:I,detailScale:A,waveScale:E,falloff:N,brightness:T,ambient:L,color:g,hotColor:b,backgroundColor:x,gamma:V,vignette:z,opacity:X,cursorInteraction:J,cursorPull:Z,cursorGlow:ee,cursorReach:ea,adaptiveQuality:er,paused:eu},e)})}),(0,l.jsxs)(u.IH,{children:[(0,l.jsx)(u.yt,{title:"Pitch",min:2,max:24,step:1,value:C,onChange:w}),(0,l.jsx)(u.yt,{title:"Fill",min:.1,max:1,step:.01,value:y,onChange:S}),(0,l.jsx)(u.bg,{title:"Shape",value:j,onChange:e=>P(e),options:[{value:"square",label:"Square"},{value:"dot",label:"Dot"}]}),(0,l.jsx)(u.yt,{title:"Feather",min:0,max:1,step:.01,value:k,onChange:R}),(0,l.jsx)(u.yt,{title:"Speed",min:0,max:3,step:.05,value:F,onChange:M}),(0,l.jsx)(u.yt,{title:"Warp",min:0,max:1.5,step:.01,value:G,onChange:W}),(0,l.jsx)(u.yt,{title:"Warp Scale",min:.5,max:10,step:.1,value:I,onChange:B}),(0,l.jsx)(u.yt,{title:"Detail Scale",min:1,max:20,step:.5,value:A,onChange:D}),(0,l.jsx)(u.yt,{title:"Wave Scale",min:1,max:12,step:.1,value:E,onChange:H}),(0,l.jsx)(u.yt,{title:"Falloff",min:1,max:12,step:.1,value:N,onChange:O}),(0,l.jsx)(u.yt,{title:"Brightness",min:.5,max:12,step:.1,value:T,onChange:q}),(0,l.jsx)(u.yt,{title:"Ambient",min:0,max:.6,step:.01,value:L,onChange:Q}),(0,l.jsx)(u.yt,{title:"Gamma",min:.5,max:4,step:.05,value:V,onChange:_}),(0,l.jsx)(u.yt,{title:"Vignette",min:0,max:1,step:.01,value:z,onChange:U}),(0,l.jsx)(u.yt,{title:"Opacity",min:0,max:1,step:.01,value:X,onChange:Y}),(0,l.jsx)(u.W7,{title:"Color",value:g,onChange:p}),(0,l.jsx)(u.W7,{title:"Hot Color",value:b,onChange:v}),(0,l.jsx)(u.W7,{title:"Background",value:x,onChange:d}),(0,l.jsx)(u.tl,{title:"Cursor Interaction",checked:J,onChange:K}),(0,l.jsx)(u.yt,{title:"Cursor Pull",min:0,max:1,step:.01,value:Z,onChange:$}),(0,l.jsx)(u.yt,{title:"Cursor Glow",min:0,max:1,step:.01,value:ee,onChange:et}),(0,l.jsx)(u.yt,{title:"Cursor Reach",min:.05,max:1,step:.01,value:ea,onChange:el}),(0,l.jsx)(u.tl,{title:"Adaptive Quality",checked:er,onChange:en}),(0,l.jsx)(u.tl,{title:"Paused",checked:eu,onChange:ei})]}),(0,l.jsx)(u.Ub,{data:[{name:"width",type:"string | number",default:'"100%"',description:"Container width."},{name:"height",type:"string | number",default:'"100%"',description:"Container height."},{name:"className",type:"string",default:"undefined",description:"Additional CSS classes."},{name:"children",type:"ReactNode",default:"undefined",description:"Content rendered above the effect."},{name:"pitch",type:"number",default:"4",description:"Distance between tile centres in CSS pixels."},{name:"fill",type:"number",default:"0.5",description:"Portion of each cell the tile fills, from 0 to 1."},{name:"shape",type:'"square" | "dot"',default:'"square"',description:"Tile silhouette."},{name:"feather",type:"number",default:"0.15",description:"Softness of the tile edge, from 0 to 1."},{name:"speed",type:"number",default:"1",description:"How fast the field drifts."},{name:"warp",type:"number",default:"0.375",description:"Strength of the domain warp that folds the field."},{name:"warpScale",type:"number",default:"3",description:"Scale of the warp field."},{name:"detailScale",type:"number",default:"7",description:"Scale of the finer warp riding inside the first."},{name:"waveScale",type:"number",default:"4",description:"Scale of the wave field being lit."},{name:"falloff",type:"number",default:"5",description:"Falloff exponent. Higher values tighten the bright ridges."},{name:"brightness",type:"number",default:"5",description:"Overall gain applied to the wave."},{name:"ambient",type:"number",default:"0",description:"Level the darkest tiles settle at."},{name:"color",type:"string",default:'"#3366ff"',description:"Colour of the wave."},{name:"hotColor",type:"string",default:'"#bfd4ff"',description:"Colour the brightest ridges shift toward."},{name:"backgroundColor",type:"string",default:'"#0a0a0a"',description:'Background fill colour. Accepts "transparent".'},{name:"gamma",type:"number",default:"2.2",description:"Contrast curve applied at the end."},{name:"vignette",type:"number",default:"0",description:"Darkening toward the edges, from 0 to 1."},{name:"opacity",type:"number",default:"1",description:"Master alpha, from 0 to 1."},{name:"cursorInteraction",type:"boolean",default:"true",description:"Let the pointer bend and light the field."},{name:"cursorPull",type:"number",default:"0.35",description:"How far the pointer pulls the field."},{name:"cursorGlow",type:"number",default:"0.25",description:"How much the pointer lights nearby tiles."},{name:"cursorReach",type:"number",default:"0.28",description:"Reach of the pointer, from 0 to 1."},{name:"adaptiveQuality",type:"boolean",default:"true",description:"Drop resolution when the frame rate falls short."},{name:"targetFps",type:"number",default:"60",description:"Frame rate the adaptive pass aims for."},{name:"dpr",type:"number",default:"2",description:"Upper bound on device pixel ratio."},{name:"paused",type:"boolean",default:"false",description:"Hold the animation still."}]})]}),(0,l.jsx)(u.lT,{children:(0,l.jsx)(u.Gv,{})})]})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>r});var l=a(12115);function r(){let[e,t]=(0,l.useState)(0),a=(0,l.useCallback)(()=>{t(e=>e+1)},[]);return(0,l.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);