"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[27133],{27133:(e,t,a)=>{a.r(t),a.d(t,{default:()=>g});var i=a(95155),l=a(12115),n=a(30701),r=a(56388),s=a(90761),u=a(81712),o=a(3907),d=a(2253),c=a(90650);let f=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,m=`
precision highp float;

varying vec2 vUv;

uniform vec2  uRes;
uniform float uTime;
uniform float uGrid;
uniform vec2  uDir;
uniform float uFalloff;
uniform float uFadeStart;
uniform float uFadeEnd;
uniform float uSquareSize;
uniform float uMinBright;
uniform float uTwinkleSpeed;
uniform float uTwinkleStrength;
uniform float uIntensity;
uniform float uAlpha;
uniform vec3  uSquare;
uniform vec3  uBg;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 cellsXY = vec2(uGrid * aspect, uGrid);
  if (aspect < 1.0) cellsXY = vec2(uGrid, uGrid / max(aspect, 0.0001));

  vec2 gridUv = vUv * cellsXY;
  vec2 cellId = floor(gridUv);
  vec2 cellUv = fract(gridUv) - 0.5;

  vec2 cellCenter = (cellId + 0.5) / cellsXY;
  vec2 centered = cellCenter * 2.0 - 1.0;
  float t = clamp(dot(centered, uDir) * 0.5 + 0.5, 0.0, 1.0);

  float fs = clamp(uFadeStart, 0.0, 0.999);
  float fe = clamp(uFadeEnd, fs + 0.001, 1.0);
  float remap = clamp((t - fs) / (fe - fs), 0.0, 1.0);
  float density = pow(remap, max(uFalloff, 0.0001));

  float gate = hash21(cellId + 11.7);
  float bRnd = hash21(cellId + 47.3);
  float pRnd = hash21(cellId + 91.1);

  float lit = step(gate, density);

  float half_ = clamp(uSquareSize, 0.05, 0.98) * 0.5;
  float inside = step(abs(cellUv.x), half_) * step(abs(cellUv.y), half_);

  float baseBright = mix(clamp(uMinBright, 0.0, 1.0), 1.0, bRnd);

  float phase = pRnd * 6.2831853;
  float speed = uTwinkleSpeed * (0.6 + 0.8 * bRnd);
  float pulse = 0.5 + 0.5 * sin(uTime * speed + phase);
  float twinkle = mix(1.0 - uTwinkleStrength, 1.0, pulse);

  float mask = inside * lit * baseBright * twinkle * uIntensity;

  vec3 col = mix(uBg, uSquare, clamp(mask, 0.0, 1.0));
  gl_FragColor = vec4(col, uAlpha);
}
`;function h(e){let t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t?[parseInt(t[1],16)/255,parseInt(t[2],16)/255,parseInt(t[3],16)/255]:[0,0,0]}let p=e=>{let t=(0,l.useRef)(null),{size:a}=(0,u.C)();(0,u.D)(i=>{if(!t.current)return;let l=t.current.material.uniforms;l.uTime.value=i.clock.elapsedTime,l.uRes.value.set(a.width,a.height),l.uGrid.value=Math.max(4,Math.min(400,e.gridSize));let[n,r]=function(e){switch(e){case"left":return[-1,0];case"top":return[0,1];case"bottom":return[0,-1];default:return[1,0]}}(e.direction);l.uDir.value.set(n,r),l.uFalloff.value=e.falloff,l.uFadeStart.value=e.fadeStart,l.uFadeEnd.value=e.fadeEnd,l.uSquareSize.value=e.squareSize,l.uMinBright.value=e.minBrightness,l.uTwinkleSpeed.value=e.twinkleSpeed,l.uTwinkleStrength.value=e.twinkleStrength,l.uIntensity.value=e.intensity,l.uAlpha.value=e.opacity;let s=h(e.squareColor);l.uSquare.value.set(s[0],s[1],s[2]);let u=h(e.backgroundColor);l.uBg.value.set(u[0],u[1],u[2])});let n=(0,l.useMemo)(()=>({uTime:{value:0},uRes:{value:new d.I9Y(1,1)},uGrid:{value:80},uDir:{value:new d.I9Y(1,0)},uFalloff:{value:1.6},uFadeStart:{value:.05},uFadeEnd:{value:1},uSquareSize:{value:.7},uMinBright:{value:.25},uTwinkleSpeed:{value:1.4},uTwinkleStrength:{value:.7},uIntensity:{value:1},uAlpha:{value:1},uSquare:{value:new d.Pq0(.32,.05,.85)},uBg:{value:new d.Pq0(.04,.02,.06)}}),[]);return(0,i.jsxs)("mesh",{ref:t,children:[(0,i.jsx)("planeGeometry",{args:[2,2]}),(0,i.jsx)("shaderMaterial",{vertexShader:f,fragmentShader:m,uniforms:n,transparent:!0})]})},v=({width:e="100%",height:t="100%",className:a,children:l,direction:n="right",gridSize:r=52,squareColor:s="#BB29FF",backgroundColor:u="#000000",falloff:d=1.25,fadeStart:f=.65,fadeEnd:m=1,squareSize:h=.57,minBrightness:v=.55,twinkleSpeed:g=1.4,twinkleStrength:S=.94,intensity:x=1,opacity:b=1,dpr:y=1.5})=>(0,i.jsxs)("div",{className:(0,c.cn)("relative overflow-hidden",a),style:{width:e,height:t},children:[(0,i.jsx)(o.Hl,{className:"absolute inset-0",dpr:[1,y],gl:{antialias:!1,alpha:!0,powerPreference:"high-performance"},orthographic:!0,camera:{position:[0,0,1],zoom:1,left:-1,right:1,top:1,bottom:-1},children:(0,i.jsx)(p,{direction:n,gridSize:r,squareColor:s,backgroundColor:u,falloff:d,fadeStart:f,fadeEnd:m,squareSize:h,minBrightness:v,twinkleSpeed:g,twinkleStrength:S,intensity:x,opacity:b})}),l&&(0,i.jsx)("div",{className:"relative z-10",children:l})]});v.displayName="BlinkingSquares";let g=()=>{let[e,t]=(0,s.I)(),{resolvedTheme:a}=(0,n.D)(),[u,o]=(0,l.useState)("right"),[d,c]=(0,l.useState)(52),[f,m]=(0,l.useState)(.57),[h,p]=(0,l.useState)(.33),[g,S]=(0,l.useState)(1),[x,b]=(0,l.useState)(1.25),[y,w]=(0,l.useState)(.55),[k,C]=(0,l.useState)(1.4),[j,F]=(0,l.useState)(.94),[B,q]=(0,l.useState)(1),[T,I]=(0,l.useState)(1),[z,E]=(0,l.useState)("#BB29FF"),[M,N]=(0,l.useState)(null),P=(0,l.useMemo)(()=>null!==M?M:"dark"===a?"#000000":"#FFFFFF",[a,M]);return(0,i.jsxs)("div",{children:[(0,i.jsx)(r.Bg,{}),(0,i.jsxs)(r.VX,{children:[(0,i.jsxs)(r.Ec,{children:[(0,i.jsx)(r.Ch,{onRefresh:t,minHeight:520,children:(0,i.jsx)("div",{className:"relative h-full w-full",children:(0,i.jsx)(v,{width:"100%",height:"100%",direction:u,gridSize:d,falloff:x,fadeStart:h,fadeEnd:g,squareSize:f,minBrightness:y,twinkleSpeed:k,twinkleStrength:j,intensity:B,opacity:T,squareColor:z,backgroundColor:P},e)})}),(0,i.jsxs)(r.IH,{children:[(0,i.jsx)(r.bg,{title:"Direction",value:u,onChange:e=>o(e),options:[{label:"Right",value:"right"},{label:"Left",value:"left"},{label:"Top",value:"top"},{label:"Bottom",value:"bottom"}]}),(0,i.jsx)(r.yt,{title:"Grid Size",value:d,onChange:c,min:8,max:200,step:1}),(0,i.jsx)(r.yt,{title:"Square Size",value:f,onChange:m,min:.1,max:.98,step:.01}),(0,i.jsx)(r.yt,{title:"Fade Start",value:h,onChange:p,min:0,max:1,step:.01}),(0,i.jsx)(r.yt,{title:"Fade End",value:g,onChange:S,min:0,max:1,step:.01}),(0,i.jsx)(r.yt,{title:"Falloff",value:x,onChange:b,min:.3,max:6,step:.05}),(0,i.jsx)(r.yt,{title:"Min Brightness",value:y,onChange:w,min:0,max:1,step:.01}),(0,i.jsx)(r.yt,{title:"Twinkle Speed",value:k,onChange:C,min:0,max:4,step:.05}),(0,i.jsx)(r.yt,{title:"Twinkle Strength",value:j,onChange:F,min:0,max:1,step:.01}),(0,i.jsx)(r.yt,{title:"Intensity",value:B,onChange:q,min:0,max:2,step:.05}),(0,i.jsx)(r.yt,{title:"Opacity",value:T,onChange:I,min:0,max:1,step:.01}),(0,i.jsx)(r.W7,{title:"Square Color",value:z,onChange:E}),(0,i.jsx)(r.W7,{title:"Background",value:P,onChange:N})]}),(0,i.jsx)(r.Ub,{data:[{name:"direction",type:'"right" | "left" | "top" | "bottom"',default:'"right"',description:"Edge the dense squares are anchored to. The grid fades to empty in the opposite direction"},{name:"gridSize",type:"number",default:"52",description:"Number of grid cells along the long axis (8–200). Higher = finer grain"},{name:"squareSize",type:"number",default:"0.57",description:"Constant square fill % within each cell (0.05–0.98). All squares are uniform size; density is what varies"},{name:"fadeStart",type:"number",default:"0.65",description:"Where the field first becomes non-empty along `direction` (0–1). Anything before this is pure background"},{name:"fadeEnd",type:"number",default:"1",description:"Where the field reaches full density along `direction` (0–1). Must be greater than fadeStart"},{name:"falloff",type:"number",default:"1.25",description:"Curve sharpness between fadeStart and fadeEnd. 1 = linear, higher = stays empty longer then ramps fast (0.3–6)"},{name:"minBrightness",type:"number",default:"0.55",description:"Minimum brightness of a lit cell (0–1). Lit cells get a random brightness between this and 1.0"},{name:"twinkleSpeed",type:"number",default:"1.4",description:"Per-cell twinkle rate in cycles per second (0–4). 0 freezes the field"},{name:"twinkleStrength",type:"number",default:"0.94",description:"Strength of the per-cell brightness oscillation (0–1). 0 = no blinking"},{name:"intensity",type:"number",default:"1",description:"Master brightness multiplier (0–2)"},{name:"opacity",type:"number",default:"1",description:"Master alpha (0–1)"},{name:"squareColor",type:"string",default:'"#BB29FF"',description:"Square color in hex"},{name:"backgroundColor",type:"string",default:'"#000000"',description:"Background fill where the field is empty, in hex"},{name:"dpr",type:"number",default:"1.5",description:"Maximum device pixel ratio cap (1–3)"}]})]}),(0,i.jsx)(r.lT,{children:(0,i.jsx)(r.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>u.CodeExample,lT:()=>i.CodeTab,Bg:()=>o.ComponentHeader,i8:()=>c.CopyButton,IH:()=>n.Customize,gI:()=>h,Dn:()=>v,pi:()=>p,W7:()=>r.PreviewColor,Ch:()=>l.PreviewContainer,UD:()=>r.PreviewInput,bg:()=>r.PreviewSelect,yt:()=>r.PreviewSlider,tl:()=>r.PreviewSwitch,Ec:()=>i.PreviewTab,Ub:()=>s.PropTable,VX:()=>i.TabsLayout,bs:()=>m});var i=a(55019);a(27382);var l=a(10236),n=a(69485),r=a(48543),s=a(87552);a(39260);var u=a(52407),o=a(79901);a(24496);var d=a(95155);a(66729);var c=a(28592),f=a(90650);let m="rounded-lg border bg-background";function h({className:e,children:t,...a}){return(0,d.jsx)("div",{className:(0,f.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function p({className:e,children:t,...a}){return(0,d.jsx)("div",{className:(0,f.cn)(m,e),...a,children:t})}function v({title:e,description:t,className:a,children:i}){return(0,d.jsxs)("section",{className:a,children:[(0,d.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,d.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,d.jsx)("div",{className:"mt-6",children:i})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>l});var i=a(12115);function l(){let[e,t]=(0,i.useState)(0),a=(0,i.useCallback)(()=>{t(e=>e+1)},[]);return(0,i.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);