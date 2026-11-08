"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[7512],{7512:(e,t,r)=>{r.r(t),r.d(t,{default:()=>g});var a=r(95155),n=r(12115),o=r(30701),l=r(56388),u=r(90761),i=r(81712),s=r(3907),c=r(90650),p=r(2253);let f=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,m=`
precision highp float;

uniform float uTime;
uniform vec2  uRes;
uniform float uSpeed;
uniform float uScale;
uniform float uWarpStrength;
uniform float uWarpCurvature;
uniform float uWarpFalloff;
uniform float uScrollSpeed;
uniform float uNoiseAmount;
uniform float uColorIntensity;
uniform float uColorSeparation;
uniform float uRotation;
uniform vec3  uTint;
uniform vec3  uBg;
uniform float uAlpha;
uniform vec2  uPointer;
uniform float uCursorActive;
uniform float uCursorIntensity;

varying vec2 vUv;

vec3 safeTanh(vec3 x) {
  vec3 e = exp(-2.0 * x);
  return (1.0 - e) / (1.0 + e);
}

void main() {
  float t = uTime * uSpeed;

  vec2 p = (gl_FragCoord.xy * 2.0 - uRes) / uRes.y * uScale;

  float cr = cos(uRotation);
  float sr = sin(uRotation);
  p = mat2(cr, -sr, sr, cr) * p;

  vec2 pointerPos = (uPointer * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0) * uScale;
  pointerPos = mat2(cr, -sr, sr, cr) * pointerPos;
  float cursorDist = length(p - pointerPos);
  float cursorInfluence = smoothstep(3.0, 0.0, cursorDist) * uCursorActive * uCursorIntensity;

  float localWarpStrength = uWarpStrength + cursorInfluence * 0.35;
  float localFalloff = uWarpFalloff - cursorInfluence * 0.6;

  float a = 9.0 * localWarpStrength;
  float b = 8.0 * localWarpStrength;
  mat2 warpMatrix = mat2(a, -b, -b, a);

  float inversiveScale = uWarpCurvature / (max(localFalloff, 0.5) + dot(p, p));

  float dither = fract(dot(gl_FragCoord, sin(gl_FragCoord.yxyx + t))) * uNoiseAmount;

  float scroll = t * uScrollSpeed;

  p = p * warpMatrix * inversiveScale + dither + scroll;

  float phase = sin(t + p.x + p.y);
  float brightness = exp(phase);

  vec2 freqA = cos(p + p.x / 7.0);
  vec2 freqB = sin(p.yx * 0.61);
  float interference = dot(freqA, freqB);

  float colorMod = cos(p.x * 0.1) + 1.0;
  vec3 channelOffset = colorMod * vec3(0.0, 0.1, 0.2) * uColorSeparation;

  vec3 denom = sin(interference + channelOffset) + 1.0;
  vec3 rawColor = uColorIntensity * brightness / denom;
  vec3 color = safeTanh(rawColor);

  color += cursorInfluence * 0.025;

  color *= uTint;

  float effectAlpha = max(color.r, max(color.g, color.b));
  vec3 composited = color + uBg * (1.0 - effectAlpha);

  gl_FragColor = vec4(composited, uAlpha);
}
`;function d(e){let t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t?[parseInt(t[1],16)/255,parseInt(t[2],16)/255,parseInt(t[3],16)/255]:[0,0,0]}let v=({speed:e,scale:t,warpStrength:r,warpCurvature:o,warpFalloff:l,scrollSpeed:u,noiseAmount:s,colorIntensity:c,colorSeparation:d,rotation:v,tintRgb:h,bgRgb:g,opacity:x,pointer:C,cursorInteraction:S,cursorIntensity:y})=>{let b=(0,n.useRef)(null),{size:w,viewport:j}=(0,i.C)(),I=(0,n.useRef)(new p.I9Y(.5,.5)),F=(0,n.useMemo)(()=>({uTime:{value:0},uRes:{value:new p.I9Y(1,1)},uSpeed:{value:e},uScale:{value:t},uWarpStrength:{value:r},uWarpCurvature:{value:o},uWarpFalloff:{value:l},uScrollSpeed:{value:u},uNoiseAmount:{value:s},uColorIntensity:{value:c},uColorSeparation:{value:d},uRotation:{value:v*Math.PI/180},uTint:{value:new p.Pq0(...h)},uBg:{value:new p.Pq0(...g)},uAlpha:{value:x},uPointer:{value:new p.I9Y(.5,.5)},uCursorActive:{value:0},uCursorIntensity:{value:1}}),[]);return(0,i.D)((a,n)=>{if(!b.current)return;let i=b.current.material;i.uniforms.uTime.value=a.clock.elapsedTime,i.uniforms.uRes.value.set(w.width*j.dpr,w.height*j.dpr),i.uniforms.uSpeed.value=e,i.uniforms.uScale.value=t,i.uniforms.uWarpStrength.value=r,i.uniforms.uWarpCurvature.value=o,i.uniforms.uWarpFalloff.value=l,i.uniforms.uScrollSpeed.value=u,i.uniforms.uNoiseAmount.value=s,i.uniforms.uColorIntensity.value=c,i.uniforms.uColorSeparation.value=d,i.uniforms.uRotation.value=v*Math.PI/180,i.uniforms.uTint.value.set(...h),i.uniforms.uBg.value.set(...g),i.uniforms.uAlpha.value=x,i.uniforms.uCursorActive.value=+!!S,i.uniforms.uCursorIntensity.value=y;let p=1-Math.exp(-n/.15);I.current.x+=(C[0]-I.current.x)*p,I.current.y+=(C[1]-I.current.y)*p,i.uniforms.uPointer.value.set(I.current.x,I.current.y)}),(0,a.jsxs)("mesh",{ref:b,children:[(0,a.jsx)("planeGeometry",{args:[2,2]}),(0,a.jsx)("shaderMaterial",{vertexShader:f,fragmentShader:m,uniforms:F,transparent:!0})]})},h=({width:e="100%",height:t="100%",className:r,children:o,speed:l=.2,scale:u=1.5,warpStrength:i=1.5,warpCurvature:p=6,warpFalloff:f=4,scrollSpeed:m=6,noiseAmount:h=.5,colorIntensity:g=.1,colorSeparation:x=0,rotation:C=-45,color:S="#FF9FFC",backgroundColor:y="#000000",opacity:b=1,cursorInteraction:w=!1,cursorIntensity:j=1})=>{let I=(0,n.useMemo)(()=>d(S),[S]),F=(0,n.useMemo)(()=>d(y),[y]),P=(0,n.useRef)(null),[R,A]=(0,n.useState)([.5,.5]),W=(0,n.useCallback)(e=>{if(!w)return;let t=P.current?.getBoundingClientRect();t&&A([(e.clientX-t.left)/t.width,1-(e.clientY-t.top)/t.height])},[w]);return(0,a.jsxs)("div",{ref:P,className:(0,c.cn)("relative overflow-hidden",r),style:{width:e,height:t,backgroundColor:y},onPointerMove:W,children:[(0,a.jsx)(s.Hl,{className:"absolute inset-0 h-full w-full",orthographic:!0,camera:{position:[0,0,1],zoom:1,left:-1,right:1,top:1,bottom:-1},gl:{antialias:!0,alpha:!0},children:(0,a.jsx)(v,{speed:l,scale:u,warpStrength:i,warpCurvature:p,warpFalloff:f,scrollSpeed:m,noiseAmount:h,colorIntensity:g,colorSeparation:x,rotation:C,tintRgb:I,bgRgb:F,opacity:b,pointer:R,cursorInteraction:w,cursorIntensity:j})}),o&&(0,a.jsx)("div",{className:"pointer-events-none relative z-10",children:o})]})};h.displayName="StarSwipe";let g=()=>{let[e,t]=(0,u.I)(),{resolvedTheme:r}=(0,o.D)(),[i,s]=(0,n.useState)(!1),[c,p]=(0,n.useState)(1),[f,m]=(0,n.useState)(.2),[d,v]=(0,n.useState)(1.5),[g,x]=(0,n.useState)(1.5),[C,S]=(0,n.useState)(6),[y,b]=(0,n.useState)(4),[w,j]=(0,n.useState)(6),[I,F]=(0,n.useState)(.5),[P,R]=(0,n.useState)(.1),[A,W]=(0,n.useState)(0),[N,M]=(0,n.useState)(-45),[T,k]=(0,n.useState)(1),[B,_]=(0,n.useState)("#FF9FFC"),[E,q]=(0,n.useState)(null),D=(0,n.useMemo)(()=>null!==E?E:"dark"===r?"#0a0a0a":"#FFFFFF",[r,E]);return(0,a.jsxs)("div",{children:[(0,a.jsx)(l.Bg,{}),(0,a.jsxs)(l.VX,{children:[(0,a.jsxs)(l.Ec,{children:[(0,a.jsx)(l.Ch,{onRefresh:t,children:(0,a.jsx)("div",{className:"relative h-full w-full",children:(0,a.jsx)(h,{width:"100%",height:"100%",speed:f,scale:d,warpStrength:g,warpCurvature:C,warpFalloff:y,scrollSpeed:w,noiseAmount:I,colorIntensity:P,colorSeparation:A,rotation:N,color:B,backgroundColor:D,opacity:T,cursorInteraction:i,cursorIntensity:c},e)})}),(0,a.jsxs)(l.IH,{children:[(0,a.jsx)(l.yt,{title:"Speed",value:f,onChange:m,min:.01,max:2,step:.01}),(0,a.jsx)(l.yt,{title:"Scroll Speed",value:w,onChange:j,min:0,max:20,step:.1}),(0,a.jsx)(l.yt,{title:"Rotation",value:N,onChange:M,min:-180,max:180,step:1}),(0,a.jsx)(l.yt,{title:"Scale",value:d,onChange:v,min:.1,max:5,step:.1}),(0,a.jsx)(l.yt,{title:"Opacity",value:T,onChange:k,min:0,max:1,step:.05}),(0,a.jsx)(l.yt,{title:"Warp Strength",value:g,onChange:x,min:0,max:5,step:.1}),(0,a.jsx)(l.yt,{title:"Warp Curvature",value:C,onChange:S,min:.1,max:20,step:.1}),(0,a.jsx)(l.yt,{title:"Warp Falloff",value:y,onChange:b,min:.1,max:20,step:.1}),(0,a.jsx)(l.yt,{title:"Noise Amount",value:I,onChange:F,min:0,max:2,step:.01}),(0,a.jsx)(l.yt,{title:"Color Intensity",value:P,onChange:R,min:.01,max:2,step:.01}),(0,a.jsx)(l.yt,{title:"Color Separation",value:A,onChange:W,min:0,max:5,step:.1}),(0,a.jsx)(l.W7,{title:"Color",value:B,onChange:_}),(0,a.jsx)(l.W7,{title:"Background",value:D,onChange:e=>q(e)}),(0,a.jsx)(l.tl,{title:"Cursor Interaction",checked:i,onChange:s}),(0,a.jsx)(l.yt,{title:"Cursor Intensity",value:c,onChange:p,min:0,max:3,step:.1})]}),(0,a.jsx)(l.Ub,{data:[{name:"width",type:"string | number",default:'"100%"',description:"Container width"},{name:"height",type:"string | number",default:'"100%"',description:"Container height"},{name:"className",type:"string",default:'""',description:"Additional CSS classes"},{name:"children",type:"ReactNode",default:"undefined",description:"Content rendered above the effect"},{name:"speed",type:"number",default:"0.2",description:"Animation speed multiplier (0.01–2.0)"},{name:"scale",type:"number",default:"1.5",description:"Pattern zoom scale, higher = zoomed in (0.1–5.0)"},{name:"warpStrength",type:"number",default:"1.5",description:"Intensity of the conformal star warp (0–5)"},{name:"warpCurvature",type:"number",default:"6.0",description:"M\xf6bius projection curvature numerator (0.1–20)"},{name:"warpFalloff",type:"number",default:"4.0",description:"M\xf6bius denominator offset: higher values soften center warp (0.1–20)"},{name:"scrollSpeed",type:"number",default:"6.0",description:"How fast the pattern sweeps across the screen (0–20)"},{name:"noiseAmount",type:"number",default:"0.5",description:"Screen-space dither noise amount (0–2)"},{name:"colorIntensity",type:"number",default:"0.1",description:"Overall color brightness factor (0.01–2.0)"},{name:"colorSeparation",type:"number",default:"0",description:"RGB channel separation for rainbow-like splits (0–5)"},{name:"rotation",type:"number",default:"-45",description:"Rotation angle in degrees (-180–180)"},{name:"color",type:"string",default:'"#FF9FFC"',description:"Tint color (hex)"},{name:"backgroundColor",type:"string",default:'"#000000"',description:"Background color (hex)"},{name:"opacity",type:"number",default:"1",description:"Master opacity (0–1)"},{name:"cursorInteraction",type:"boolean",default:"false",description:"Enable cursor interaction to bend the warp field near pointer"},{name:"cursorIntensity",type:"number",default:"1",description:"Cursor effect strength multiplier (0–3)"}]})]}),(0,a.jsx)(l.lT,{children:(0,a.jsx)(l.Gv,{})})]})]})}},56388:(e,t,r)=>{r.d(t,{Gv:()=>i.CodeExample,lT:()=>a.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>p.CopyButton,IH:()=>o.Customize,gI:()=>d,Dn:()=>h,pi:()=>v,W7:()=>l.PreviewColor,Ch:()=>n.PreviewContainer,UD:()=>l.PreviewInput,bg:()=>l.PreviewSelect,yt:()=>l.PreviewSlider,tl:()=>l.PreviewSwitch,Ec:()=>a.PreviewTab,Ub:()=>u.PropTable,VX:()=>a.TabsLayout,bs:()=>m});var a=r(55019);r(27382);var n=r(10236),o=r(69485),l=r(48543),u=r(87552);r(39260);var i=r(52407),s=r(79901);r(24496);var c=r(95155);r(66729);var p=r(28592),f=r(90650);let m="rounded-lg border bg-background";function d({className:e,children:t,...r}){return(0,c.jsx)("div",{className:(0,f.cn)("rounded-xl border bg-muted/50 p-1",e),...r,children:t})}function v({className:e,children:t,...r}){return(0,c.jsx)("div",{className:(0,f.cn)(m,e),...r,children:t})}function h({title:e,description:t,className:r,children:a}){return(0,c.jsxs)("section",{className:r,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:a})]})}},90761:(e,t,r)=>{r.d(t,{I:()=>n});var a=r(12115);function n(){let[e,t]=(0,a.useState)(0),r=(0,a.useCallback)(()=>{t(e=>e+1)},[]);return(0,a.useEffect)(()=>{let e=new MutationObserver(()=>{r()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[r]),[e,r]}}}]);