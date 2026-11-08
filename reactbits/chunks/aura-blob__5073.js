"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[5073],{5073:(e,t,a)=>{a.r(t),a.d(t,{default:()=>C});var n=a(95155),r=a(12115),l=a(30701),u=a(56388),s=a(90761),i=a(81712),o=a(3907),c=a(2253),p=a(90650);let d=`
varying vec2 vPlane;

void main() {
  vPlane = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,f=(e,t)=>{let a=new c.Q1f;try{a.setStyle(e,c.Zr2)}catch{a.setStyle(t,c.Zr2)}return a},m=(e,t)=>{try{e.setStyle(t,c.Zr2)}catch{return}},v=(e,t,a)=>Math.min(a,Math.max(t,e)),h=e=>{let t=window.matchMedia("(min-resolution: 2dppx)");return t.addEventListener("change",e),window.addEventListener("resize",e),()=>{t.removeEventListener("change",e),window.removeEventListener("resize",e)}},x=()=>window.devicePixelRatio||1,g=({speed:e,layers:t,stagger:a,radius:l,density:u,softness:s,warp:o,warpScale:p,gain:h,exposure:x,contrast:g,cameraDistance:y,focal:b,color:C,midColor:w,deepColor:S,hueDrift:j,pulse:k,pulseRate:R,grain:T,grainSize:P,grainRate:E,backgroundColor:D,opacity:G,cursorInteraction:M,cursorTilt:z,paused:B,adaptiveQuality:N,targetFps:L,ceiling:W,readPointer:I})=>{let H=(0,r.useRef)(null),A=(0,r.useRef)(0),F=(0,r.useRef)({x:.5,y:.5}),O=(0,r.useRef)({frames:0,span:0,wins:0,cap:4}),{gl:_,size:U}=(0,i.C)(),Q=Math.round(v(t,2,24)),X=(0,r.useMemo)(()=>`
precision highp float;

varying vec2 vPlane;

uniform vec2 uCanvas;
uniform float uClock;
uniform float uSpin;
uniform float uStagger;
uniform float uRadius;
uniform float uDensity;
uniform float uSoftness;
uniform float uWarp;
uniform float uWarpScale;
uniform float uGain;
uniform float uExposure;
uniform float uContrast;
uniform float uReach;
uniform float uLens;
uniform float uHueDrift;
uniform float uPulse;
uniform float uPulseRate;
uniform float uGrain;
uniform float uGrainSize;
uniform float uGrainRate;
uniform vec3 uTintA;
uniform vec3 uTintB;
uniform vec3 uTintC;
uniform vec3 uBackdrop;
uniform float uBackdropAlpha;
uniform float uOpacity;
uniform vec2 uTilt;

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

vec3 swivel(vec3 p, vec3 axis, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return p * c + cross(axis, p) * s + axis * dot(axis, p) * (1.0 - c);
}

vec3 precess(float angle) {
  return normalize(vec3(
    sin(angle * 0.41) * 0.9,
    0.85 + 0.3 * cos(angle * 0.29),
    cos(angle * 0.57) * 0.9
  ));
}

vec3 softClip(vec3 x) {
  vec3 fall = exp(-2.0 * max(x, 0.0));
  return (1.0 - fall) / (1.0 + fall);
}

float ridges(vec3 p) {
  float sum = 0.0;
  float weight = 0.5;
  for (int k = 0; k < 3; k++) {
    vec3 folded = cos(p);
    sum += weight * abs(folded.x + folded.y + folded.z) * 0.3333;
    p = p * 1.87 + vec3(1.7, -2.3, 0.9);
    weight *= 0.55;
  }
  return sum;
}

vec3 palette(float phase) {
  vec3 lobes = 0.52 + 0.78 * sin(phase + vec3(0.0, 2.0944, 4.1888));
  lobes = max(lobes, vec3(0.0));
  return uTintA * lobes.x + uTintB * lobes.y + uTintC * lobes.z;
}

void main() {
  vec2 pixel = vPlane * uCanvas;
  vec2 field = (pixel - 0.5 * uCanvas) / max(uCanvas.y, 1.0);

  vec3 eye = vec3(0.0, 0.0, -uReach);
  vec3 ray = normalize(vec3(field + uTilt * 0.35, uLens));
  ray = swivel(ray, vec3(0.0, 1.0, 0.0), uTilt.x * 0.9);

  float travel = 0.1;
  vec3 glow = vec3(0.0);

  for (int i = 0; i < ${Q}; i++) {
    vec3 probe = eye + ray * travel;
    float turn = uClock * uSpin + float(i) * uStagger;
    vec3 spun = swivel(probe, precess(turn), turn);

    float hull = abs(length(spun) - uRadius) * uDensity + uSoftness;
    hull += ridges(spun * uWarpScale) * uWarp;

    float phase = dot(spun, vec3(0.58)) + uClock * uHueDrift;
    glow += palette(phase) / hull;

    travel += hull;
    if (travel > 60.0) break;
  }

  float breath = 1.0 + uPulse * sin(uClock * uPulseRate);
  vec3 raw = glow * (uGain * breath) / max(uExposure, 1.0);
  vec3 col = softClip(raw);
  col = pow(clamp(col, 0.0, 1.0), vec3(max(uContrast, 0.05)));

  float cover = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);

  vec2 cell = floor(pixel / max(uGrainSize, 1.0));
  float tick = floor(uClock * max(uGrainRate, 1.0));
  float speck = silver(cell, tick) + silver(cell * 0.5 + 7.0, tick) * 0.5;
  float response = cover * (1.0 - cover) * 4.0;
  float lift = 1.0 + speck * uGrain * response * 1.6;
  col = clamp(col * lift, 0.0, 1.0);
  cover = clamp(cover * lift, 0.0, 1.0);

  float rest = uBackdropAlpha * (1.0 - cover);
  gl_FragColor = vec4(col + uBackdrop * rest, cover + rest) * uOpacity;
}
`,[Q]),Y=(0,r.useMemo)(()=>({uCanvas:{value:new c.I9Y(1,1)},uClock:{value:0},uSpin:{value:1},uStagger:{value:2.3},uRadius:{value:4},uDensity:{value:.9},uSoftness:{value:.01},uWarp:{value:.2},uWarpScale:{value:1.8},uGain:{value:2.3},uExposure:{value:130},uContrast:{value:1},uReach:{value:13},uLens:{value:1},uHueDrift:{value:1},uPulse:{value:.12},uPulseRate:{value:.5},uGrain:{value:.05},uGrainSize:{value:1},uGrainRate:{value:24},uTintA:{value:f("#f472b6","#f472b6")},uTintB:{value:f("#a855f7","#a855f7")},uTintC:{value:f("#4338ca","#4338ca")},uBackdrop:{value:f("#0a0a0a","#0a0a0a")},uBackdropAlpha:{value:1},uOpacity:{value:1},uTilt:{value:new c.I9Y(0,0)}}),[]);return(0,r.useEffect)(()=>{let e=H.current;e&&(e.fragmentShader=X,e.needsUpdate=!0)},[X]),(0,r.useEffect)(()=>{let e=H.current;if(!e)return;m(e.uniforms.uTintA.value,C),m(e.uniforms.uTintB.value,w),m(e.uniforms.uTintC.value,S);let t="transparent"===D||"none"===D||""===D;e.uniforms.uBackdropAlpha.value=+!t,t||m(e.uniforms.uBackdrop.value,D)},[C,w,S,D]),(0,i.D)((t,n)=>{let r=H.current;if(!r)return;let i=Math.min(n,.05);B||(A.current+=i);let c=_.getPixelRatio(),d=r.uniforms;if(d.uCanvas.value.set(U.width*c,U.height*c),d.uClock.value=A.current,d.uSpin.value=e,d.uStagger.value=a,d.uRadius.value=l,d.uDensity.value=u,d.uSoftness.value=Math.max(s,.002),d.uWarp.value=o,d.uWarpScale.value=p,d.uGain.value=h,d.uExposure.value=x,d.uContrast.value=g,d.uReach.value=y,d.uLens.value=b,d.uHueDrift.value=j,d.uPulse.value=k,d.uPulseRate.value=R,d.uGrain.value=T,d.uGrainSize.value=Math.max(P,1)*c,d.uGrainRate.value=E,d.uOpacity.value=G,M){let e=I(),t=1-Math.exp(-(4*i));F.current.x+=(e.x-F.current.x)*t,F.current.y+=(e.y-F.current.y)*t,d.uTilt.value.set((F.current.x-.5)*z,(F.current.y-.5)*z)}else d.uTilt.value.set(0,0);if(!N)return;let f=O.current;if(f.frames+=1,f.span+=n,f.span<.75)return;let m=f.frames/f.span;f.frames=0,f.span=0;let v=Math.min(W,f.cap);m<.85*L&&c>.6?(f.wins=0,f.cap=Math.max(.6,.9*c),_.setPixelRatio(Math.max(.6,.75*c))):m>.98*L&&c<v-.01?(f.wins+=1,f.wins>=3&&(f.wins=0,_.setPixelRatio(Math.min(v,1.25*c)))):f.wins=0}),(0,n.jsxs)("mesh",{frustumCulled:!1,children:[(0,n.jsx)("planeGeometry",{args:[1,1]}),(0,n.jsx)("shaderMaterial",{ref:H,vertexShader:d,fragmentShader:X,uniforms:Y,transparent:!0,depthTest:!1,depthWrite:!1,premultipliedAlpha:!0})]})},y=({speed:e=.5,layers:t=10,stagger:a=2.3,radius:l=4,density:u=.9,softness:s=.01,warp:i=.25,warpScale:c=1.8,gain:d=2.6,exposure:f=130,contrast:m=1,cameraDistance:y=13,focal:b=1,color:C="#f472b6",midColor:w="#a855f7",deepColor:S="#4338ca",hueDrift:j=1,pulse:k=.12,pulseRate:R=.5,grain:T=.05,grainSize:P=1,grainRate:E=24,backgroundColor:D="#0a0a0a",opacity:G=1,cursorInteraction:M=!0,cursorTilt:z=.6,paused:B=!1,adaptiveQuality:N=!0,targetFps:L=60,dpr:W=1.75,className:I,children:H})=>{let A=(0,r.useRef)(null),F=(0,r.useRef)({x:.5,y:.5}),[O,_]=(0,r.useState)(!0),U=Math.min((0,r.useSyncExternalStore)(h,x,()=>1),Math.max(W,.5)),Q=(0,r.useCallback)(()=>F.current,[]);return(0,r.useEffect)(()=>{let e=A.current;if(!e||"undefined"==typeof IntersectionObserver)return;let t=new IntersectionObserver(([e])=>_(e.isIntersecting),{threshold:0});return t.observe(e),()=>t.disconnect()},[]),(0,r.useEffect)(()=>{let e=A.current;if(!e||!M)return;let t=t=>{let a=e.getBoundingClientRect();a.width&&a.height&&(F.current.x=v((t.clientX-a.left)/a.width,0,1),F.current.y=v(1-(t.clientY-a.top)/a.height,0,1))},a=()=>{F.current.x=.5,F.current.y=.5};return e.addEventListener("pointermove",t),e.addEventListener("pointerleave",a),()=>{e.removeEventListener("pointermove",t),e.removeEventListener("pointerleave",a)}},[M]),(0,n.jsxs)("div",{ref:A,className:(0,p.cn)("relative overflow-hidden",I),children:[(0,n.jsx)("div",{className:"absolute inset-0",children:(0,n.jsx)(o.Hl,{orthographic:!0,dpr:U,frameloop:O?"always":"demand",gl:{antialias:!1,alpha:!0,powerPreference:"high-performance"},children:(0,n.jsx)(g,{speed:e,layers:t,stagger:a,radius:l,density:u,softness:s,warp:i,warpScale:c,gain:d,exposure:f,contrast:m,cameraDistance:y,focal:b,color:C,midColor:w,deepColor:S,hueDrift:j,pulse:k,pulseRate:R,grain:T,grainSize:P,grainRate:E,backgroundColor:D,opacity:G,cursorInteraction:M,cursorTilt:z,paused:B,adaptiveQuality:N,targetFps:L,ceiling:U,readPointer:Q})})}),H?(0,n.jsx)("div",{className:"relative z-10 h-full w-full",children:H}):null]})},b=()=>()=>{},C=()=>{let[e,t]=(0,s.I)(),{resolvedTheme:a}=(0,l.D)(),i=(0,r.useSyncExternalStore)(b,()=>!0,()=>!1)&&"dark"===a,[o,c]=(0,r.useState)(.5),[p,d]=(0,r.useState)(10),[f,m]=(0,r.useState)(2.3),[v,h]=(0,r.useState)(4),[x,g]=(0,r.useState)(.9),[C,w]=(0,r.useState)(.01),[S,j]=(0,r.useState)(.25),[k,R]=(0,r.useState)(1.8),[T,P]=(0,r.useState)(2.6),[E,D]=(0,r.useState)(130),[G,M]=(0,r.useState)(1),[z,B]=(0,r.useState)(13),[N,L]=(0,r.useState)(1),[W,I]=(0,r.useState)(1),[H,A]=(0,r.useState)(.12),[F,O]=(0,r.useState)(.5),[_,U]=(0,r.useState)(.05),[Q,X]=(0,r.useState)(1),[Y,Z]=(0,r.useState)(!0),[q,V]=(0,r.useState)(.6),[$,J]=(0,r.useState)(!1),[K,ee]=(0,r.useState)("#f472b6"),[et,ea]=(0,r.useState)("#a855f7"),[en,er]=(0,r.useState)("#4338ca"),[el,eu]=(0,r.useState)(null),es=(0,r.useMemo)(()=>null!==el?el:i?"#0a0a0a":"#ffffff",[i,el]);return(0,n.jsxs)("div",{children:[(0,n.jsx)(u.Bg,{}),(0,n.jsxs)(u.VX,{children:[(0,n.jsxs)(u.Ec,{children:[(0,n.jsx)(u.Ch,{onRefresh:t,minHeight:520,children:(0,n.jsx)("div",{className:"relative h-full w-full",children:(0,n.jsx)(y,{className:"h-full w-full",speed:o,layers:p,stagger:f,radius:v,density:x,softness:C,warp:S,warpScale:k,gain:T,exposure:E,contrast:G,cameraDistance:z,focal:N,color:K,midColor:et,deepColor:en,hueDrift:W,pulse:H,pulseRate:F,grain:_,backgroundColor:es,opacity:Q,cursorInteraction:Y,cursorTilt:q,paused:$},e)})}),(0,n.jsxs)(u.IH,{children:[(0,n.jsx)(u.yt,{title:"Speed",min:0,max:2,step:.05,value:o,onChange:c}),(0,n.jsx)(u.yt,{title:"Layers",min:2,max:20,step:1,value:p,onChange:d}),(0,n.jsx)(u.yt,{title:"Stagger",min:0,max:4,step:.05,value:f,onChange:m}),(0,n.jsx)(u.yt,{title:"Radius",min:1,max:8,step:.1,value:v,onChange:h}),(0,n.jsx)(u.yt,{title:"Density",min:.2,max:2,step:.05,value:x,onChange:g}),(0,n.jsx)(u.yt,{title:"Softness",min:.002,max:.2,step:.002,value:C,onChange:w}),(0,n.jsx)(u.yt,{title:"Warp",min:0,max:1,step:.02,value:S,onChange:j}),(0,n.jsx)(u.yt,{title:"Warp Scale",min:.2,max:5,step:.1,value:k,onChange:R}),(0,n.jsx)(u.yt,{title:"Gain",min:.2,max:8,step:.1,value:T,onChange:P}),(0,n.jsx)(u.yt,{title:"Exposure",min:20,max:600,step:10,value:E,onChange:D}),(0,n.jsx)(u.yt,{title:"Contrast",min:.4,max:3,step:.05,value:G,onChange:M}),(0,n.jsx)(u.yt,{title:"Camera Distance",min:3,max:24,step:.2,value:z,onChange:B}),(0,n.jsx)(u.yt,{title:"Focal",min:.4,max:3,step:.05,value:N,onChange:L}),(0,n.jsx)(u.yt,{title:"Hue Drift",min:0,max:4,step:.05,value:W,onChange:I}),(0,n.jsx)(u.yt,{title:"Pulse",min:0,max:.6,step:.01,value:H,onChange:A}),(0,n.jsx)(u.yt,{title:"Pulse Rate",min:0,max:3,step:.05,value:F,onChange:O}),(0,n.jsx)(u.yt,{title:"Grain",min:0,max:.4,step:.01,value:_,onChange:U}),(0,n.jsx)(u.yt,{title:"Cursor Tilt",min:0,max:1.5,step:.05,value:q,onChange:V}),(0,n.jsx)(u.yt,{title:"Opacity",min:0,max:1,step:.01,value:Q,onChange:X}),(0,n.jsx)(u.W7,{title:"Color",value:K,onChange:ee}),(0,n.jsx)(u.W7,{title:"Mid Color",value:et,onChange:ea}),(0,n.jsx)(u.W7,{title:"Deep Color",value:en,onChange:er}),(0,n.jsx)(u.W7,{title:"Background",value:es,onChange:eu}),(0,n.jsx)(u.tl,{title:"Cursor Interaction",checked:Y,onChange:Z}),(0,n.jsx)(u.tl,{title:"Paused",checked:$,onChange:J})]}),(0,n.jsx)(u.Ub,{data:[{name:"speed",type:"number",default:"0.5",description:"How fast the shells tumble."},{name:"layers",type:"number",default:"10",description:"Number of nested shells accumulated along each ray. The main cost knob."},{name:"stagger",type:"number",default:"2.3",description:"Rotation offset applied between consecutive shells, in radians."},{name:"radius",type:"number",default:"4",description:"Radius of the shell the aura wraps around."},{name:"density",type:"number",default:"0.9",description:"Thickness response of the shell. Lower spreads the glow wider."},{name:"softness",type:"number",default:"0.01",description:"Smallest distance the accumulator will divide by."},{name:"warp",type:"number",default:"0.25",description:"Strength of the ridged distortion breaking up the shells."},{name:"warpScale",type:"number",default:"1.8",description:"Spatial frequency of the distortion."},{name:"gain",type:"number",default:"2.6",description:"Overall brightness before tone mapping."},{name:"exposure",type:"number",default:"130",description:"Tone mapping headroom. Higher keeps more of the falloff."},{name:"contrast",type:"number",default:"1",description:"Tone response curve. Above 1 deepens the shadows."},{name:"cameraDistance",type:"number",default:"13",description:"Distance of the eye from the shell."},{name:"focal",type:"number",default:"1",description:"Focal length of the virtual lens."},{name:"color",type:"string",default:'"#f472b6"',description:"First palette colour."},{name:"midColor",type:"string",default:'"#a855f7"',description:"Second palette colour."},{name:"deepColor",type:"string",default:'"#4338ca"',description:"Third palette colour."},{name:"hueDrift",type:"number",default:"1",description:"How fast the palette cycles through the shells."},{name:"pulse",type:"number",default:"0.12",description:"Depth of the slow brightness breath. 0 disables it."},{name:"pulseRate",type:"number",default:"0.5",description:"Speed of the brightness breath."},{name:"grain",type:"number",default:"0.05",description:"Film grain strength, 0 to 1."},{name:"grainSize",type:"number",default:"1",description:"Grain cell size in CSS pixels."},{name:"grainRate",type:"number",default:"24",description:"Grain refreshes per second."},{name:"backgroundColor",type:"string",default:'"#0a0a0a"',description:'Panel backdrop, or "transparent" to show the page through.'},{name:"opacity",type:"number",default:"1",description:"Master alpha."},{name:"cursorInteraction",type:"boolean",default:"true",description:"Let the pointer swing the shells around."},{name:"cursorTilt",type:"number",default:"0.6",description:"How far the pointer tilts the view, 0 to 1."},{name:"paused",type:"boolean",default:"false",description:"Freeze the animation."},{name:"adaptiveQuality",type:"boolean",default:"true",description:"Scale back resolution when the frame budget slips."},{name:"targetFps",type:"number",default:"60",description:"Frame rate the quality meter aims to hold."},{name:"dpr",type:"number",default:"1.75",description:"Upper device pixel ratio bound."},{name:"className",type:"string",default:"-",description:"Optional className applied to the root."},{name:"children",type:"ReactNode",default:"-",description:"Content layered above the aura."}]})]}),(0,n.jsx)(u.lT,{children:(0,n.jsx)(u.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>i.CodeExample,lT:()=>n.CodeTab,Bg:()=>o.ComponentHeader,i8:()=>p.CopyButton,IH:()=>l.Customize,gI:()=>m,Dn:()=>h,pi:()=>v,W7:()=>u.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>u.PreviewInput,bg:()=>u.PreviewSelect,yt:()=>u.PreviewSlider,tl:()=>u.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>s.PropTable,VX:()=>n.TabsLayout,bs:()=>f});var n=a(55019);a(27382);var r=a(10236),l=a(69485),u=a(48543),s=a(87552);a(39260);var i=a(52407),o=a(79901);a(24496);var c=a(95155);a(66729);var p=a(28592),d=a(90650);let f="rounded-lg border bg-background";function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,d.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function v({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,d.cn)(f,e),...a,children:t})}function h({title:e,description:t,className:a,children:n}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:n})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>r});var n=a(12115);function r(){let[e,t]=(0,n.useState)(0),a=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);