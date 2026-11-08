"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[70976],{56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>r.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>c.CopyButton,IH:()=>n.Customize,gI:()=>h,Dn:()=>v,pi:()=>f,W7:()=>l.PreviewColor,Ch:()=>i.PreviewContainer,UD:()=>l.PreviewInput,bg:()=>l.PreviewSelect,yt:()=>l.PreviewSlider,tl:()=>l.PreviewSwitch,Ec:()=>r.PreviewTab,Ub:()=>o.PropTable,VX:()=>r.TabsLayout,bs:()=>m});var r=a(55019);a(27382);var i=a(10236),n=a(69485),l=a(48543),o=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var d=a(95155);a(66729);var c=a(28592),p=a(90650);let m="rounded-lg border bg-background";function h({className:e,children:t,...a}){return(0,d.jsx)("div",{className:(0,p.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function f({className:e,children:t,...a}){return(0,d.jsx)("div",{className:(0,p.cn)(m,e),...a,children:t})}function v({title:e,description:t,className:a,children:r}){return(0,d.jsxs)("section",{className:a,children:[(0,d.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,d.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,d.jsx)("div",{className:"mt-6",children:r})]})}},70976:(e,t,a)=>{a.r(t),a.d(t,{default:()=>g});var r=a(95155),i=a(12115),n=a(30701),l=a(56388),o=a(90761),s=a(81712),u=a(3907),d=a(2253),c=a(90650);let p=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,m=`
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2  uRes;
uniform float uSpeed;
uniform float uDensity;
uniform float uLayers;
uniform float uWarp;
uniform float uBand;
uniform float uChromatic;
uniform vec3  uColorA;
uniform vec3  uColorB;
uniform vec3  uBg;
uniform float uAlpha;

const int   MAX_LAYERS    = 8;
const float GOLDEN_ANGLE  = 2.39996323;

float sampleField(vec2 p, float t) {
  vec2 c = p;
  vec2 s = floor(c);
  vec2 pole = vec2(uWarp) / (s - c + 1e-3);

  for (int j = 1; j <= MAX_LAYERS; j++) {
    if (float(j) > uLayers) break;
    float fi = float(j);
    float ang = GOLDEN_ANGLE * fi;
    vec2 dir = vec2(cos(ang), sin(ang));
    float detune = 1.0 + fi * 0.13;
    float phase = dot(c, dir) * detune + pole.x + pole.y + t;
    c += dir * sin(phase) / fi;
  }

  float band = exp(-max(uBand, 0.0001) * abs(sin(c.y)));
  return band;
}

void main() {
  vec2 fragPx = vUv * uRes;
  vec2 base = fragPx / max(uRes.y, 1.0) * uDensity + uRes / max(uRes.y, 1.0);

  float t = uTime * uSpeed;

  float spread = uChromatic * 0.35;
  float r = sampleField(base + vec2( spread, 0.0), t);
  float g = sampleField(base,                      t);
  float b = sampleField(base + vec2(-spread, 0.0), t);

  vec3 col = vec3(
    mix(uColorA.r, uColorB.r, r),
    mix(uColorA.g, uColorB.g, g),
    mix(uColorA.b, uColorB.b, b)
  );

  float fieldMix = clamp(max(max(r, g), b), 0.0, 1.0);
  vec3 final = mix(uBg, col, fieldMix);

  gl_FragColor = vec4(final, uAlpha);
}
`;function h(e){let t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t?[parseInt(t[1],16)/255,parseInt(t[2],16)/255,parseInt(t[3],16)/255]:[0,0,0]}let f=e=>{let t=(0,i.useRef)(null),{size:a}=(0,s.C)();(0,s.D)(r=>{if(!t.current)return;let i=t.current.material.uniforms;i.uTime.value=r.clock.elapsedTime,i.uRes.value.set(a.width,a.height),i.uSpeed.value=e.speed,i.uDensity.value=e.tileDensity,i.uLayers.value=Math.max(1,Math.min(8,Math.round(e.rippleLayers))),i.uWarp.value=e.warpStrength,i.uBand.value=e.bandSharpness,i.uChromatic.value=e.chromaticSpread,i.uAlpha.value=e.opacity;let n=h(e.colorA);i.uColorA.value.set(n[0],n[1],n[2]);let l=h(e.colorB);i.uColorB.value.set(l[0],l[1],l[2]);let o=h(e.backgroundColor);i.uBg.value.set(o[0],o[1],o[2])});let n=(0,i.useMemo)(()=>({uTime:{value:0},uRes:{value:new d.I9Y(1,1)},uSpeed:{value:1},uDensity:{value:4},uLayers:{value:5},uWarp:{value:.1},uBand:{value:3},uChromatic:{value:.25},uColorA:{value:new d.Pq0(.05,.02,.1)},uColorB:{value:new d.Pq0(.4,.5,.9)},uBg:{value:new d.Pq0(0,0,0)},uAlpha:{value:1}}),[]);return(0,r.jsxs)("mesh",{ref:t,children:[(0,r.jsx)("planeGeometry",{args:[2,2]}),(0,r.jsx)("shaderMaterial",{vertexShader:p,fragmentShader:m,uniforms:n,transparent:!0})]})},v=({width:e="100%",height:t="100%",className:a,children:i,speed:n=1,tileDensity:l=4,rippleLayers:o=6,warpStrength:s=.33,bandSharpness:d=3,chromaticSpread:p=0,colorA:m="#1E00FF",colorB:h="#D765E6",backgroundColor:v="#FFFFFF",opacity:g=1,dpr:x=1.5})=>(0,r.jsxs)("div",{className:(0,c.cn)("relative overflow-hidden",a),style:{width:e,height:t},children:[(0,r.jsx)(u.Hl,{className:"absolute inset-0",dpr:[1,x],gl:{antialias:!1,alpha:!0,powerPreference:"high-performance"},orthographic:!0,camera:{position:[0,0,1],zoom:1,left:-1,right:1,top:1,bottom:-1},children:(0,r.jsx)(f,{speed:n,tileDensity:l,rippleLayers:o,warpStrength:s,bandSharpness:d,chromaticSpread:p,colorA:m,colorB:h,backgroundColor:v,opacity:g})}),i&&(0,r.jsx)("div",{className:"relative z-10",children:i})]});v.displayName="GlassTiles";let g=()=>{let[e,t]=(0,o.I)(),{resolvedTheme:a}=(0,n.D)(),[s,u]=(0,i.useState)(1),[d,c]=(0,i.useState)(1),[p,m]=(0,i.useState)(4),[h,f]=(0,i.useState)(6),[g,x]=(0,i.useState)(.33),[y,b]=(0,i.useState)(3),[C,S]=(0,i.useState)(0),[j,F]=(0,i.useState)("#1E00FF"),[w,B]=(0,i.useState)("#D765E6"),[A,k]=(0,i.useState)(null),N=(0,i.useMemo)(()=>null!==A?A:"dark"===a?"#000000":"#FFFFFF",[a,A]);return(0,r.jsxs)("div",{children:[(0,r.jsx)(l.Bg,{}),(0,r.jsxs)(l.VX,{children:[(0,r.jsxs)(l.Ec,{children:[(0,r.jsx)(l.Ch,{onRefresh:t,children:(0,r.jsx)("div",{className:"relative h-full w-full",children:(0,r.jsx)(v,{width:"100%",height:"100%",speed:s,tileDensity:p,rippleLayers:h,warpStrength:g,bandSharpness:y,chromaticSpread:C,colorA:j,colorB:w,backgroundColor:N,opacity:d},e)})}),(0,r.jsxs)(l.IH,{children:[(0,r.jsx)(l.yt,{title:"Speed",value:s,onChange:u,min:0,max:3,step:.05}),(0,r.jsx)(l.yt,{title:"Opacity",value:d,onChange:c,min:0,max:1,step:.05}),(0,r.jsx)(l.yt,{title:"Chromatic Spread",value:C,onChange:S,min:0,max:1,step:.01}),(0,r.jsx)(l.yt,{title:"Tile Density",value:p,onChange:m,min:1,max:16,step:.1}),(0,r.jsx)(l.yt,{title:"Ripple Layers",value:h,onChange:f,min:1,max:8,step:1}),(0,r.jsx)(l.yt,{title:"Warp Strength",value:g,onChange:x,min:0,max:.6,step:.005}),(0,r.jsx)(l.yt,{title:"Band Sharpness",value:y,onChange:b,min:.5,max:10,step:.1}),(0,r.jsx)(l.W7,{title:"Color A",value:j,onChange:F}),(0,r.jsx)(l.W7,{title:"Color B",value:w,onChange:B}),(0,r.jsx)(l.W7,{title:"Background",value:N,onChange:k})]}),(0,r.jsx)(l.Ub,{data:[{name:"width",type:"string | number",default:'"100%"',description:"Container width"},{name:"height",type:"string | number",default:'"100%"',description:"Container height"},{name:"className",type:"string",default:'""',description:"Additional CSS classes for styling"},{name:"children",type:"ReactNode",default:"undefined",description:"Content rendered above the effect"},{name:"speed",type:"number",default:"1",description:"Animation speed multiplier (0–3)"},{name:"tileDensity",type:"number",default:"4",description:"Tile lattice density across the surface (1–16)"},{name:"rippleLayers",type:"number",default:"6",description:"Number of directional ripple layers stacked through the tile pole (1–8)"},{name:"warpStrength",type:"number",default:"0.33",description:"Per-tile inverse-distance warp strength (0–0.6)"},{name:"bandSharpness",type:"number",default:"3",description:"Sharpness of the bright band peaks; higher is thinner, hotter ribbons (0.5–10)"},{name:"chromaticSpread",type:"number",default:"0",description:"Per-channel chromatic separation along the gradient axis (0–1)"},{name:"colorA",type:"string",default:'"#1E00FF"',description:"First gradient stop in hex format (the deeper color)"},{name:"colorB",type:"string",default:'"#D765E6"',description:"Second gradient stop in hex format (the brighter color)"},{name:"backgroundColor",type:"string",default:'"#FFFFFF"',description:"Background fill where the field is fully dark in hex format"},{name:"opacity",type:"number",default:"1",description:"Master alpha (0–1)"},{name:"dpr",type:"number",default:"1.5",description:"Maximum device pixel ratio (caps GPU work) (1–3)"}]})]}),(0,r.jsx)(l.lT,{children:(0,r.jsx)(l.Gv,{})})]})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>i});var r=a(12115);function i(){let[e,t]=(0,r.useState)(0),a=(0,r.useCallback)(()=>{t(e=>e+1)},[]);return(0,r.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);