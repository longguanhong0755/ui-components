"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[79304],{56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>r.CodeTab,Bg:()=>l.ComponentHeader,i8:()=>d.CopyButton,IH:()=>u.Customize,gI:()=>p,Dn:()=>h,pi:()=>v,W7:()=>i.PreviewColor,Ch:()=>n.PreviewContainer,UD:()=>i.PreviewInput,bg:()=>i.PreviewSelect,yt:()=>i.PreviewSlider,tl:()=>i.PreviewSwitch,Ec:()=>r.PreviewTab,Ub:()=>o.PropTable,VX:()=>r.TabsLayout,bs:()=>f});var r=a(55019);a(27382);var n=a(10236),u=a(69485),i=a(48543),o=a(87552);a(39260);var s=a(52407),l=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),m=a(90650);let f="rounded-lg border bg-background";function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,m.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function v({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,m.cn)(f,e),...a,children:t})}function h({title:e,description:t,className:a,children:r}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:r})]})}},79304:(e,t,a)=>{a.r(t),a.d(t,{default:()=>h});var r=a(95155),n=a(12115),u=a(56388),i=a(90761),o=a(81712),s=a(3907),l=a(2253),c=a(90650);let d=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,m=`
precision highp float;

uniform float uTime;
uniform vec2 uRes;
uniform float uSpeed;
uniform float uScale;
uniform int uOctaves;
uniform float uPersist;
uniform float uLacun;
uniform float uDrift;
uniform float uWarp;
uniform vec3 uCol1;
uniform vec3 uCol2;
uniform float uGain;
uniform float uSat;
uniform float uBright;
uniform float uAlpha;
uniform vec2 uPointer;
uniform float uCursorActive;
uniform float uCursorIntensity;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.713, 83.457))) * 35718.549);
}

float vnoise(vec2 p) {
  vec2 g = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);

  float tl = hash(g);
  float tr = hash(g + vec2(1.0, 0.0));
  float bl = hash(g + vec2(0.0, 1.0));
  float br = hash(g + vec2(1.0, 1.0));

  return mix(mix(tl, tr, w.x), mix(bl, br, w.x), w.y);
}

float layers(vec2 p) {
  float total = 0.0;
  float amp = 0.5;
  float angle = 0.47;
  float ca = cos(angle), sa = sin(angle);
  mat2 bend = mat2(ca, -sa, sa, ca);

  for (int k = 0; k < 8; k++) {
    if (k >= uOctaves) break;
    total += amp * vnoise(p);
    p = bend * p * uLacun + 193.7;
    amp *= uPersist;
  }

  return total;
}

void main() {
  vec2 coord = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y;
  coord *= uScale;

  float t = uTime * uSpeed;

  vec2 pointerCoord = (uPointer * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0) * uScale;
  float cursorDist = length(coord - pointerCoord);
  float cursorInfluence = smoothstep(0.8, 0.0, cursorDist) * uCursorActive * uCursorIntensity;

  vec2 cursorDir = normalize(coord - pointerCoord + 0.001);
  vec2 warpedCoord = coord + cursorDir * cursorInfluence * 0.12;

  float q = layers(warpedCoord + t * uDrift);
  float r = layers(warpedCoord + q * (1.0 + cursorInfluence * 0.08) + t * uWarp);

  float blend = r * uGain;
  vec3 raw = mix(uCol1, uCol2, smoothstep(0.3, 0.7, blend));

  float luma = dot(raw, vec3(0.299, 0.587, 0.114));
  vec3 col = mix(vec3(luma), raw, uSat) + uBright;
  col = clamp(col, 0.0, 1.0);

  gl_FragColor = vec4(col, uAlpha);
}
`;function f(e){let t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t?[parseInt(t[1],16)/255,parseInt(t[2],16)/255,parseInt(t[3],16)/255]:[0,0,0]}let p=({speed:e,scale:t,octaves:a,persistence:u,lacunarity:i,driftSpeed:s,warpSpeed:c,col1Rgb:f,col2Rgb:p,colorGain:v,saturation:h,brightness:x,opacity:g,pointer:y,cursorInteraction:C,cursorIntensity:b})=>{let S=(0,n.useRef)(null),{size:j,viewport:w}=(0,o.C)(),I=(0,n.useRef)(new l.I9Y(.5,.5)),P=(0,n.useMemo)(()=>({uTime:{value:0},uRes:{value:new l.I9Y(1,1)},uSpeed:{value:1},uScale:{value:1},uOctaves:{value:6},uPersist:{value:.6},uLacun:{value:2},uDrift:{value:.1},uWarp:{value:.3},uCol1:{value:new l.Pq0(.1,.1,.1)},uCol2:{value:new l.Pq0(.9,.9,.9)},uGain:{value:.95},uSat:{value:.7},uBright:{value:.1},uAlpha:{value:1},uPointer:{value:new l.I9Y(.5,.5)},uCursorActive:{value:0},uCursorIntensity:{value:1}}),[]);return(0,o.D)((r,n)=>{if(!S.current)return;let o=S.current.material;o.uniforms.uTime.value=r.clock.elapsedTime,o.uniforms.uRes.value.set(j.width*w.dpr,j.height*w.dpr),o.uniforms.uSpeed.value=e,o.uniforms.uScale.value=t,o.uniforms.uOctaves.value=a,o.uniforms.uPersist.value=u,o.uniforms.uLacun.value=i,o.uniforms.uDrift.value=s,o.uniforms.uWarp.value=c,o.uniforms.uCol1.value.set(...f),o.uniforms.uCol2.value.set(...p),o.uniforms.uGain.value=v,o.uniforms.uSat.value=h,o.uniforms.uBright.value=x,o.uniforms.uAlpha.value=g,o.uniforms.uCursorActive.value=+!!C,o.uniforms.uCursorIntensity.value=b;let l=1-Math.exp(-n/.15);I.current.x+=(y[0]-I.current.x)*l,I.current.y+=(y[1]-I.current.y)*l,o.uniforms.uPointer.value.set(I.current.x,I.current.y)}),(0,r.jsxs)("mesh",{ref:S,children:[(0,r.jsx)("planeGeometry",{args:[2,2]}),(0,r.jsx)("shaderMaterial",{vertexShader:d,fragmentShader:m,uniforms:P,transparent:!0})]})},v=({width:e="100%",height:t="100%",className:a,children:u,speed:i=.6,scale:o=.6,octaves:l=6,persistence:d=.6,lacunarity:m=2.4,driftSpeed:v=.04,warpSpeed:h=.08,color1:x="#0a0a0a",color2:g="#e0e0e0",colorGain:y=1,saturation:C=0,brightness:b=.15,opacity:S=1,cursorInteraction:j=!1,cursorIntensity:w=1})=>{let I=(0,n.useMemo)(()=>f(x),[x]),P=(0,n.useMemo)(()=>f(g),[g]),N=(0,n.useRef)(null),[k,R]=(0,n.useState)([.5,.5]),D=(0,n.useCallback)(e=>{if(!j)return;let t=N.current?.getBoundingClientRect();t&&R([(e.clientX-t.left)/t.width,1-(e.clientY-t.top)/t.height])},[j]);return(0,r.jsxs)("div",{ref:N,className:(0,c.cn)("relative overflow-hidden",a),style:{width:e,height:t},onPointerMove:D,children:[(0,r.jsx)(s.Hl,{className:"absolute inset-0 h-full w-full",orthographic:!0,camera:{position:[0,0,1],zoom:1,left:-1,right:1,top:1,bottom:-1},gl:{antialias:!0,alpha:!0},children:(0,r.jsx)(p,{speed:i,scale:o,octaves:l,persistence:d,lacunarity:m,driftSpeed:v,warpSpeed:h,col1Rgb:I,col2Rgb:P,colorGain:y,saturation:C,brightness:b,opacity:S,pointer:k,cursorInteraction:j,cursorIntensity:w})}),u&&(0,r.jsx)("div",{className:"pointer-events-none relative z-10",children:u})]})};v.displayName="Watercolor";let h=()=>{let[e,t]=(0,i.I)(),[a,o]=(0,n.useState)(!1),[s,l]=(0,n.useState)(1),[c,d]=(0,n.useState)(.6),[m,f]=(0,n.useState)(.6),[p,h]=(0,n.useState)(6),[x,g]=(0,n.useState)(.6),[y,C]=(0,n.useState)(2.4),[b,S]=(0,n.useState)(.04),[j,w]=(0,n.useState)(.08),[I,P]=(0,n.useState)("#0a0a0a"),[N,k]=(0,n.useState)("#e0e0e0"),[R,D]=(0,n.useState)(1),[A,G]=(0,n.useState)(0),[T,B]=(0,n.useState)(.15),[M,W]=(0,n.useState)(1);return(0,r.jsxs)("div",{children:[(0,r.jsx)(u.Bg,{}),(0,r.jsxs)(u.VX,{children:[(0,r.jsxs)(u.Ec,{children:[(0,r.jsx)(u.Ch,{onRefresh:t,children:(0,r.jsx)("div",{className:"relative h-full w-full",children:(0,r.jsx)(v,{width:"100%",height:"100%",speed:c,scale:m,octaves:p,persistence:x,lacunarity:y,driftSpeed:b,warpSpeed:j,color1:I,color2:N,colorGain:R,saturation:A,brightness:T,opacity:M,cursorInteraction:a,cursorIntensity:s},e)})}),(0,r.jsxs)(u.IH,{children:[(0,r.jsx)(u.yt,{title:"Speed",value:c,onChange:d,min:.01,max:3,step:.01}),(0,r.jsx)(u.yt,{title:"Scale",value:m,onChange:f,min:.5,max:5,step:.1}),(0,r.jsx)(u.yt,{title:"Drift Speed",value:b,onChange:S,min:0,max:.5,step:.01}),(0,r.jsx)(u.yt,{title:"Warp Speed",value:j,onChange:w,min:0,max:.5,step:.01}),(0,r.jsx)(u.yt,{title:"Opacity",value:M,onChange:W,min:0,max:1,step:.05}),(0,r.jsx)(u.tl,{title:"Cursor Interaction",checked:a,onChange:o}),(0,r.jsx)(u.yt,{title:"Cursor Intensity",value:s,onChange:l,min:0,max:3,step:.1}),(0,r.jsx)(u.yt,{title:"Octaves",value:p,onChange:h,min:1,max:8,step:1}),(0,r.jsx)(u.yt,{title:"Persistence",value:x,onChange:g,min:.1,max:1,step:.05}),(0,r.jsx)(u.yt,{title:"Lacunarity",value:y,onChange:C,min:1,max:4,step:.1}),(0,r.jsx)(u.yt,{title:"Color Gain",value:R,onChange:D,min:.1,max:3,step:.05}),(0,r.jsx)(u.W7,{title:"Color 1",value:I,onChange:P}),(0,r.jsx)(u.W7,{title:"Color 2",value:N,onChange:k}),(0,r.jsx)(u.yt,{title:"Saturation",value:A,onChange:G,min:0,max:2,step:.05}),(0,r.jsx)(u.yt,{title:"Brightness",value:T,onChange:B,min:-.5,max:.5,step:.01})]}),(0,r.jsx)(u.Ub,{data:[{name:"width",type:"string | number",default:'"100%"',description:"Container width"},{name:"height",type:"string | number",default:'"100%"',description:"Container height"},{name:"className",type:"string",default:"undefined",description:"Additional CSS classes"},{name:"children",type:"ReactNode",default:"undefined",description:"Content rendered above the effect"},{name:"speed",type:"number",default:"0.6",description:"Animation speed multiplier (0.01–3.0)"},{name:"scale",type:"number",default:"0.6",description:"Pattern scale / zoom (0.5–5.0)"},{name:"octaves",type:"number",default:"6",description:"Number of noise octaves (1–8)"},{name:"persistence",type:"number",default:"0.6",description:"Amplitude decay per octave (0.1–1.0)"},{name:"lacunarity",type:"number",default:"2.4",description:"Frequency multiplier per octave (1.0–4.0)"},{name:"driftSpeed",type:"number",default:"0.04",description:"Primary flow drift speed (0–0.5)"},{name:"warpSpeed",type:"number",default:"0.08",description:"Secondary warp drift speed (0–0.5)"},{name:"color1",type:"string",default:'"#0a0a0a"',description:"First color hex"},{name:"color2",type:"string",default:'"#e0e0e0"',description:"Second color hex"},{name:"colorGain",type:"number",default:"1",description:"Color intensity multiplier (0.1–3.0)"},{name:"saturation",type:"number",default:"0",description:"Saturation adjustment (0–2.0)"},{name:"brightness",type:"number",default:"0.15",description:"Brightness offset (-0.5–0.5)"},{name:"opacity",type:"number",default:"1",description:"Master opacity (0–1)"},{name:"cursorInteraction",type:"boolean",default:"false",description:"Enable cursor interaction to intensify warp and contrast near pointer"},{name:"cursorIntensity",type:"number",default:"1",description:"Cursor effect strength multiplier (0–3)"}]})]}),(0,r.jsx)(u.lT,{children:(0,r.jsx)(u.Gv,{})})]})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>n});var r=a(12115);function n(){let[e,t]=(0,r.useState)(0),a=(0,r.useCallback)(()=>{t(e=>e+1)},[]);return(0,r.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);