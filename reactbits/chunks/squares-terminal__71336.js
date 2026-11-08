"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[71336],{56388:(e,t,a)=>{a.d(t,{Gv:()=>u.CodeExample,lT:()=>r.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>d.CopyButton,IH:()=>l.Customize,gI:()=>f,Dn:()=>p,pi:()=>v,W7:()=>o.PreviewColor,Ch:()=>n.PreviewContainer,UD:()=>o.PreviewInput,bg:()=>o.PreviewSelect,yt:()=>o.PreviewSlider,tl:()=>o.PreviewSwitch,Ec:()=>r.PreviewTab,Ub:()=>i.PropTable,VX:()=>r.TabsLayout,bs:()=>h});var r=a(55019);a(27382);var n=a(10236),l=a(69485),o=a(48543),i=a(87552);a(39260);var u=a(52407),s=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),m=a(90650);let h="rounded-lg border bg-background";function f({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,m.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function v({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,m.cn)(h,e),...a,children:t})}function p({title:e,description:t,className:a,children:r}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:r})]})}},71336:(e,t,a)=>{a.r(t),a.d(t,{default:()=>x});var r=a(95155),n=a(12115),l=a(30701),o=a(56388),i=a(90761),u=a(81712),s=a(3907),c=a(2253),d=a(90650);let m=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,h=`
precision highp float;

varying vec2 vUv;

uniform float uClock;
uniform vec2 uGrid;
uniform vec3 uColor;
uniform float uSpeed;
uniform float uRowBias;
uniform float uThreshold;
uniform float uHead;
uniform float uTail;
uniform float uRowFloor;
uniform float uAlternate;
uniform vec2 uCurve;
uniform float uGlow;
uniform float uVignette;
uniform float uOpacity;
uniform vec2 uPointer;
uniform float uCursorRadius;
uniform float uCursorIntensity;
uniform float uPointerActive;

float grain(vec2 seed) {
  return fract(sin(seed.x * 21.281 + seed.y * 93.182) * 5821.92);
}

void main() {
  vec2 signed = vUv * 2.0 - 1.0;
  vec2 warp = abs(signed.yx) * uCurve;
  vec2 bent = (signed + signed * warp * warp) * 0.5 + 0.5;

  vec2 scaled = bent * uGrid;
  vec2 local = fract(scaled);
  vec2 cell = floor(scaled);

  float rowSeed = grain(vec2(0.0, cell.y));
  float heading = (rowSeed * 2.0 - 1.0) + uRowBias;

  float reach = length((bent - uPointer) * vec2(uGrid.x / max(uGrid.y, 1.0), 1.0));
  float field = (1.0 - smoothstep(0.0, max(uCursorRadius, 0.001), reach)) * uPointerActive;

  cell.x += floor(uClock * heading * uSpeed);

  float lit = step(uThreshold, grain(cell));
  float parity = 1.0 - step(1.0, mod(abs(cell.y), 2.0));
  float band = mix(1.0, parity, uAlternate);

  float feather = fwidth(scaled.x);
  float rise = smoothstep(0.0, max(uHead, feather), local.x);
  float fall = smoothstep(0.0, max(uTail, feather * 2.0), local.x);
  float dash = clamp(rise - fall, 0.0, 1.0);

  float rowLevel = fract(sin(cell.y)) + uRowFloor;
  float warmth = field * field * uCursorIntensity;
  float mask = clamp(dash * lit * band * (rowLevel + warmth), 0.0, 1.0);

  vec3 tint = uColor * mask;
  tint += vec3(1.0) * pow(mask, 3.0) * uGlow * 0.35;

  float falloff = 1.0 - smoothstep(0.35, 1.4, length(signed));
  float shade = mix(1.0, falloff, clamp(uVignette, 0.0, 1.0));

  gl_FragColor = vec4(tint * shade, mask * shade) * uOpacity;
}
`,f=({awake:e,readPointer:t,columns:a,rows:l,color:o,speed:i,rowBias:s,fillThreshold:d,dashHead:f,dashTail:v,rowFloor:p,alternateRows:x,curvature:g,glow:y,vignette:w,opacity:C,cursorInteraction:b,cursorRadius:j,cursorIntensity:S,paused:M})=>{let{invalidate:R}=(0,u.C)(),k=(0,n.useRef)(0),P=(0,n.useRef)(null),[I,T]=(0,n.useState)(!1);(0,n.useEffect)(()=>{let e=window.matchMedia("(prefers-reduced-motion: reduce)"),t=()=>T(e.matches);return t(),e.addEventListener("change",t),()=>e.removeEventListener("change",t)},[]);let B=(0,n.useMemo)(()=>({uClock:{value:0},uGrid:{value:new c.I9Y(128,128)},uColor:{value:new c.Q1f("#ff7cf9")},uSpeed:{value:15},uRowBias:{value:0},uThreshold:{value:.3},uHead:{value:.1},uTail:{value:1},uRowFloor:{value:.3},uAlternate:{value:1},uCurve:{value:new c.I9Y(1/30,1/5.2)},uGlow:{value:.25},uVignette:{value:.5},uOpacity:{value:1},uPointer:{value:new c.I9Y(.5,.5)},uCursorRadius:{value:.5},uCursorIntensity:{value:1},uPointerActive:{value:0}}),[]),E=(0,n.useMemo)(()=>{let e,t,a;return new c.Q1f((e=o.trim().replace(/^#/,""),a=3===(t=/^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(e)?e:"#39FE8E".replace(/^#/,"")).length?t.split("").map(e=>e+e).join(""):t,`#${a}`))},[o]);return(0,u.D)((r,n)=>{let o=P.current;if(!o||!e)return;let u=t();M||I||(k.current+=Math.min(n,.05)),u.x+=(u.targetX-u.x)*.14,u.y+=(u.targetY-u.y)*.14,u.decay=Math.max(0,u.decay-1.6*n);let c=o.uniforms;c.uClock.value=k.current,c.uGrid.value.set(Math.max(2,Math.round(a)),Math.max(2,Math.round(l))),c.uColor.value.copy(E),c.uSpeed.value=i,c.uRowBias.value=s,c.uThreshold.value=Math.min(Math.max(d,0),.999),c.uHead.value=Math.min(Math.max(f,.002),1),c.uTail.value=Math.min(Math.max(v,.01),2),c.uRowFloor.value=Math.max(p,0),c.uAlternate.value=+!!x,c.uCurve.value.set(g/30,g/5.2),c.uGlow.value=Math.max(y,0),c.uVignette.value=Math.min(Math.max(w,0),1),c.uOpacity.value=Math.min(Math.max(C,0),1),c.uCursorRadius.value=Math.max(j,.001),c.uCursorIntensity.value=b?Math.max(S,0):0,c.uPointerActive.value=b?Math.max(u.active,u.decay):0,c.uPointer.value.set(u.x,u.y),R()}),(0,r.jsxs)("mesh",{frustumCulled:!1,children:[(0,r.jsx)("planeGeometry",{args:[2,2]}),(0,r.jsx)("shaderMaterial",{ref:P,uniforms:B,vertexShader:m,fragmentShader:h,transparent:!0,premultipliedAlpha:!0,depthTest:!1,depthWrite:!1})]})},v=({width:e="100%",height:t="100%",className:a,children:l,columns:o=128,rows:i=128,color:u="#ff7cf9",backgroundColor:c="#0a0a0a",speed:m=15,rowBias:h=0,fillThreshold:v=.3,dashHead:p=.1,dashTail:x=1,rowFloor:g=.3,alternateRows:y=!0,curvature:w=1,glow:C=.25,vignette:b=.5,opacity:j=1,cursorInteraction:S=!0,cursorRadius:M=.5,cursorIntensity:R=1,paused:k=!1,dpr:P=1.5})=>{let I=(0,n.useRef)(null),[T,B]=(0,n.useState)(!0),E=(0,n.useRef)({x:.5,y:.5,targetX:.5,targetY:.5,active:0,decay:0}),F=(0,n.useCallback)(()=>E.current,[]);(0,n.useEffect)(()=>{let e=I.current;if(!e||"undefined"==typeof IntersectionObserver)return;let t=new IntersectionObserver(([e])=>{e&&B(e.isIntersecting)});return t.observe(e),()=>t.disconnect()},[]);let A=(0,n.useCallback)(e=>{let t=I.current;if(!t)return;let a=t.getBoundingClientRect();E.current.targetX=(e.clientX-a.left)/Math.max(a.width,1),E.current.targetY=1-(e.clientY-a.top)/Math.max(a.height,1),E.current.active=1},[]),G=(0,n.useCallback)(()=>{E.current.active=0},[]),H=(0,n.useCallback)(e=>{A(e),E.current.decay=1},[A]),N=(0,n.useMemo)(()=>[1,Math.min(Math.max(P,1),2)],[P]);return(0,r.jsxs)("div",{ref:I,className:(0,d.cn)("relative overflow-hidden",a),style:{width:e,height:t,backgroundColor:c},onPointerMove:S?A:void 0,onPointerEnter:S?A:void 0,onPointerLeave:S?G:void 0,onPointerDown:S?H:void 0,children:[(0,r.jsx)(s.Hl,{className:"absolute inset-0",dpr:N,frameloop:T?"always":"demand",gl:{antialias:!1,alpha:!0,powerPreference:"high-performance"},orthographic:!0,children:(0,r.jsx)(f,{awake:T,readPointer:F,columns:o,rows:i,color:u,speed:m,rowBias:h,fillThreshold:v,dashHead:p,dashTail:x,rowFloor:g,alternateRows:y,curvature:w,glow:C,vignette:b,opacity:j,cursorInteraction:S,cursorRadius:M,cursorIntensity:R,paused:k})}),l?(0,r.jsx)("div",{className:"relative z-10 h-full w-full",children:l}):null]})},p=()=>()=>{},x=()=>{let[e,t]=(0,i.I)(),[a,u]=(0,n.useState)(128),[s,c]=(0,n.useState)(128),[d,m]=(0,n.useState)("#ff7cf9"),{resolvedTheme:h}=(0,l.D)(),f=(0,n.useSyncExternalStore)(p,()=>!0,()=>!1),[x,g]=(0,n.useState)(null),y=(0,n.useMemo)(()=>null!==x?x:f&&"dark"===h?"#0a0a0a":"#ffffff",[f,h,x]),[w,C]=(0,n.useState)(15),[b,j]=(0,n.useState)(0),[S,M]=(0,n.useState)(.3),[R,k]=(0,n.useState)(.1),[P,I]=(0,n.useState)(1),[T,B]=(0,n.useState)(.3),[E,F]=(0,n.useState)(1),[A,G]=(0,n.useState)(.25),[H,N]=(0,n.useState)(.5),[D,O]=(0,n.useState)(1),[L,U]=(0,n.useState)(.5),[V,Y]=(0,n.useState)(1),[X,_]=(0,n.useState)(!0),[W,z]=(0,n.useState)(!0),[Q,$]=(0,n.useState)(!1);return(0,r.jsxs)("div",{children:[(0,r.jsx)(o.Bg,{}),(0,r.jsxs)(o.VX,{children:[(0,r.jsxs)(o.Ec,{children:[(0,r.jsx)(o.Ch,{onRefresh:t,minHeight:500,children:(0,r.jsx)("div",{className:"relative h-full w-full",children:(0,r.jsx)(v,{columns:a,rows:s,color:d,backgroundColor:y,speed:w,rowBias:b,fillThreshold:S,dashHead:R,dashTail:P,rowFloor:T,alternateRows:X,curvature:E,glow:A,vignette:H,opacity:D,cursorInteraction:W,cursorRadius:L,cursorIntensity:V,paused:Q},e)})}),(0,r.jsxs)(o.IH,{children:[(0,r.jsx)(o.yt,{title:"Columns",min:16,max:256,step:1,value:a,onChange:u}),(0,r.jsx)(o.yt,{title:"Rows",min:10,max:180,step:1,value:s,onChange:c}),(0,r.jsx)(o.yt,{title:"Speed",min:0,max:80,step:1,value:w,onChange:C}),(0,r.jsx)(o.yt,{title:"Row Bias",min:-1,max:1,step:.05,value:b,onChange:j}),(0,r.jsx)(o.yt,{title:"Fill Threshold",min:0,max:.95,step:.01,value:S,onChange:M}),(0,r.jsx)(o.yt,{title:"Dash Head",min:.005,max:.5,step:.005,value:R,onChange:k}),(0,r.jsx)(o.yt,{title:"Dash Tail",min:.1,max:1.5,step:.01,value:P,onChange:I}),(0,r.jsx)(o.yt,{title:"Row Floor",min:0,max:1,step:.02,value:T,onChange:B}),(0,r.jsx)(o.yt,{title:"Curvature",min:0,max:4,step:.05,value:E,onChange:F}),(0,r.jsx)(o.yt,{title:"Glow",min:0,max:2,step:.05,value:A,onChange:G}),(0,r.jsx)(o.yt,{title:"Vignette",min:0,max:1,step:.05,value:H,onChange:N}),(0,r.jsx)(o.yt,{title:"Opacity",min:.05,max:1,step:.05,value:D,onChange:O}),(0,r.jsx)(o.yt,{title:"Cursor Radius",min:.02,max:.8,step:.02,value:L,onChange:U}),(0,r.jsx)(o.yt,{title:"Cursor Intensity",min:0,max:1.5,step:.05,value:V,onChange:Y}),(0,r.jsx)(o.W7,{title:"Color",value:d,onChange:m}),(0,r.jsx)(o.W7,{title:"Background",value:y,onChange:g}),(0,r.jsx)(o.tl,{title:"Alternate Rows",checked:X,onChange:_}),(0,r.jsx)(o.tl,{title:"Cursor Interaction",checked:W,onChange:z}),(0,r.jsx)(o.tl,{title:"Paused",checked:Q,onChange:$})]}),(0,r.jsx)(o.Ub,{data:[{name:"columns",type:"number",default:"128",description:"Cells across the horizontal axis."},{name:"rows",type:"number",default:"128",description:"Cells across the vertical axis."},{name:"color",type:"string",default:'"#ff7cf9"',description:"Phosphor color in hex."},{name:"backgroundColor",type:"string",default:'"#0a0a0a"',description:"Screen fill color in hex."},{name:"speed",type:"number",default:"15",description:"Cells a row travels each second."},{name:"rowBias",type:"number",default:"0",description:"Push that biases rows toward one direction."},{name:"fillThreshold",type:"number",default:"0.3",description:"Cutoff above which a cell lights up, from 0 to 1."},{name:"dashHead",type:"number",default:"0.1",description:"Width of the lit edge of a cell, from 0 to 1."},{name:"dashTail",type:"number",default:"1",description:"Point at which a cell has faded out, from 0 to 1."},{name:"rowFloor",type:"number",default:"0.3",description:"Dimmest a row is allowed to be."},{name:"alternateRows",type:"boolean",default:"true",description:"Blank every other row."},{name:"curvature",type:"number",default:"1",description:"Amount of tube bend across the screen."},{name:"glow",type:"number",default:"0.25",description:"Bloom on the hottest cells."},{name:"vignette",type:"number",default:"0.5",description:"Darkening toward the screen corners."},{name:"opacity",type:"number",default:"1",description:"Master alpha from 0 to 1."},{name:"cursorInteraction",type:"boolean",default:"true",description:"Let the cursor disturb nearby rows."},{name:"cursorRadius",type:"number",default:"0.5",description:"Cursor influence radius in screen units."},{name:"cursorIntensity",type:"number",default:"1",description:"How far the cursor lifts nearby cells toward full brightness."},{name:"paused",type:"boolean",default:"false",description:"Freeze all motion."},{name:"dpr",type:"number",default:"1.5",description:"Maximum device pixel ratio."},{name:"children",type:"ReactNode",default:"undefined",description:"Content rendered above the field."},{name:"width",type:"number | string",default:'"100%"',description:"Container width."},{name:"height",type:"number | string",default:'"100%"',description:"Container height."},{name:"className",type:"string",default:'""',description:"Additional CSS classes."}]})]}),(0,r.jsx)(o.lT,{children:(0,r.jsx)(o.Gv,{})})]})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>n});var r=a(12115);function n(){let[e,t]=(0,r.useState)(0),a=(0,r.useCallback)(()=>{t(e=>e+1)},[]);return(0,r.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);