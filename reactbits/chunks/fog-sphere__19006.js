"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[19006],{19006:(e,t,r)=>{r.r(t),r.d(t,{default:()=>y});var a=r(95155),u=r(12115),n=r(30701),l=r(56388),i=r(90761),o=r(81712),s=r(3907),c=r(2253),d=r(90650);let p=`
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
uniform float uRotSpeed;
uniform float uSteps;
uniform float uTurbN;
uniform float uTurbAmp;
uniform float uTurbFreq;
uniform float uTurbExp;

uniform float uRadius;
uniform float uPassthrough;
uniform float uBrightness;

uniform vec3  uCore;
uniform vec3  uGlow;
uniform float uColorMix;

uniform vec3  uBg;
uniform float uInvert;
uniform float uAlpha;

const int MAX_STEPS = 32;
const int MAX_TURB  = 10;

mat2 rot2(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

float hash(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

vec3 warpField(vec3 p, float t) {
  float freq  = uTurbFreq;
  float amp   = uTurbAmp;
  float phase = uSpeed * t;

  for (int i = 0; i < MAX_TURB; i++) {
    if (float(i) >= uTurbN) break;

    if (i >= 2 && i <= 4) {
      freq *= uTurbExp;
      continue;
    }

    float a = freq * p.y + phase;
    float s = sin(a) * amp / freq;

    vec3 dir;
    int m = i - (i / 3) * 3;
    if (m == 0)      dir = vec3(0.8, 0.0, 0.6);
    else if (m == 1) dir = vec3(0.0, 0.6, 0.8);
    else             dir = vec3(0.6, 0.8, 0.0);

    p += dir * s;
    p.xz = rot2(0.6) * p.xz;
    p.xy = rot2(0.4) * p.xy;

    freq *= uTurbExp;
  }

  return p;
}

float densityShell(vec3 p) {
  float d = length(p) - uRadius;
  if (d < 0.0) return -d * 0.7 + uPassthrough;
  return d * 0.7 + uPassthrough * 2.0;
}

void main() {
  vec2 uv = (vUv - 0.5);
  uv.x *= uRes.x / uRes.y;

  vec3 dir = normalize(vec3(uv * 2.0, 1.0));
  vec3 pos = vec3(0.0, 0.0, -5.0);

  float jitter = hash(gl_FragCoord.xy) - 0.5;
  pos += dir * jitter * 0.4;

  float orbit = uTime * uRotSpeed * uSpeed;
  pos.xz = rot2(orbit) * pos.xz;
  dir.xz = rot2(orbit) * dir.xz;

  vec3 accum = vec3(0.0);
  vec3 tint  = mix(uCore, uGlow, clamp(uColorMix, 0.0, 1.0));

  for (int i = 0; i < MAX_STEPS; i++) {
    if (float(i) >= uSteps) break;
    float vol = densityShell(warpField(pos, uTime));
    pos += dir * (vol / 2.5);
    accum += tint / vol;
  }

  vec3 col = tanh(uBrightness * sqrt(accum * accum * accum));

  if (uInvert > 0.5) {
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(uBg, tint * 0.85, lum);
  } else {
    col = mix(uBg, col + uBg * (1.0 - clamp(dot(col, vec3(1.0)), 0.0, 1.0)), 1.0);
  }

  gl_FragColor = vec4(col, uAlpha);
}
`,v=`
precision highp float;

varying vec2 vUv;

uniform sampler2D uTex;
uniform vec2  uDir;
uniform float uRadiusPx;

void main() {
  const float w0 = 0.2270270270;
  const float w1 = 0.1945945946;
  const float w2 = 0.1216216216;
  const float w3 = 0.0540540541;
  const float w4 = 0.0162162162;

  vec2 o1 = uDir * uRadiusPx * 1.0;
  vec2 o2 = uDir * uRadiusPx * 2.0;
  vec2 o3 = uDir * uRadiusPx * 3.0;
  vec2 o4 = uDir * uRadiusPx * 4.0;

  vec4 c = texture2D(uTex, vUv) * w0;
  c += texture2D(uTex, vUv + o1) * w1;
  c += texture2D(uTex, vUv - o1) * w1;
  c += texture2D(uTex, vUv + o2) * w2;
  c += texture2D(uTex, vUv - o2) * w2;
  c += texture2D(uTex, vUv + o3) * w3;
  c += texture2D(uTex, vUv - o3) * w3;
  c += texture2D(uTex, vUv + o4) * w4;
  c += texture2D(uTex, vUv - o4) * w4;

  gl_FragColor = c;
}
`,f=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
void main() { gl_FragColor = texture2D(uTex, vUv); }
`,h=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;function x(e){let t=h.exec(e);return t?[parseInt(t[1],16)/255,parseInt(t[2],16)/255,parseInt(t[3],16)/255]:[0,0,0]}let g=e=>{let t,r,a,n,l,i,s,{gl:d,size:h}=(0,o.C)(),g=(0,u.useRef)(null);return null===g.current&&(t=new c.bdM(2,2),r=new c.BKk({vertexShader:p,fragmentShader:m,transparent:!0,uniforms:{uTime:{value:0},uRes:{value:new c.I9Y(1,1)},uSpeed:{value:1},uRotSpeed:{value:.1},uSteps:{value:22},uTurbN:{value:8},uTurbAmp:{value:1.4},uTurbFreq:{value:4},uTurbExp:{value:2},uRadius:{value:3},uPassthrough:{value:.11},uBrightness:{value:5e-4},uCore:{value:new c.Pq0(.85,.32,1)},uGlow:{value:new c.Pq0(1,.45,.85)},uColorMix:{value:.5},uBg:{value:new c.Pq0(0,0,0)},uInvert:{value:0},uAlpha:{value:1}}}),a=new c.BKk({vertexShader:p,fragmentShader:v,uniforms:{uTex:{value:null},uDir:{value:new c.I9Y(1,0)},uRadiusPx:{value:1}}}),n=new c.BKk({vertexShader:p,fragmentShader:f,transparent:!0,uniforms:{uTex:{value:null}}}),l=new c.Z58,i=new c.eaF(t,r),l.add(i),(s=new c.qUd(-1,1,1,-1,0,1)).position.z=1,g.current={fogMat:r,blurMat:a,copyMat:n,screenGeom:t,passScene:l,passMesh:i,passCam:s,drawSize:new c.I9Y,targets:null}),(0,u.useEffect)(()=>()=>{let e=g.current;e&&(e.fogMat.dispose(),e.blurMat.dispose(),e.copyMat.dispose(),e.screenGeom.dispose(),e.targets&&(e.targets.a.dispose(),e.targets.b.dispose(),e.targets=null))},[]),(0,o.D)(t=>{let r=g.current;if(!r)return;let a=r.fogMat.uniforms;a.uTime.value=t.clock.elapsedTime,d.getDrawingBufferSize(r.drawSize);let u=Math.max(1,Math.floor(r.drawSize.x)),n=Math.max(1,Math.floor(r.drawSize.y));a.uRes.value.set(h.width,h.height),a.uSpeed.value=e.speed,a.uRotSpeed.value=e.rotationSpeed,a.uSteps.value=e.rayMarchSteps,a.uTurbN.value=e.turbulenceIters,a.uTurbAmp.value=e.turbulenceAmplitude,a.uTurbFreq.value=e.turbulenceFrequency,a.uTurbExp.value=e.turbulenceExponent,a.uRadius.value=e.sphereRadius,a.uPassthrough.value=e.passthrough,a.uBrightness.value=e.brightness,a.uColorMix.value=e.colorMix,a.uAlpha.value=e.opacity,a.uInvert.value=+!!e.invertForLight;let l=x(e.coreColor);a.uCore.value.set(l[0],l[1],l[2]);let i=x(e.glowColor);a.uGlow.value.set(i[0],i[1],i[2]);let o=x(e.backgroundColor);if(a.uBg.value.set(o[0],o[1],o[2]),e.blur<=0){r.passMesh.material=r.fogMat,d.setRenderTarget(null),d.render(r.passScene,r.passCam);return}let s=Math.min(1,Math.max(.25,e.blurResolution)),p=Math.max(1,Math.floor(u*s)),m=Math.max(1,Math.floor(n*s)),v=function(e,t,r){let a=e.targets;if(a&&a.width===t&&a.height===r)return a;a&&(a.a.dispose(),a.b.dispose());let u={minFilter:c.k6q,magFilter:c.k6q,wrapS:c.ghU,wrapT:c.ghU,type:c.OUM,depthBuffer:!1,stencilBuffer:!1},n={a:new c.nWS(t,r,u),b:new c.nWS(t,r,u),width:t,height:r};return e.targets=n,n}(r,p,m);r.passMesh.material=r.fogMat,d.setRenderTarget(v.a),d.render(r.passScene,r.passCam),r.passMesh.material=r.blurMat,r.blurMat.uniforms.uTex.value=v.a.texture,r.blurMat.uniforms.uDir.value.set(1/p,0),r.blurMat.uniforms.uRadiusPx.value=e.blur,d.setRenderTarget(v.b),d.render(r.passScene,r.passCam),r.blurMat.uniforms.uTex.value=v.b.texture,r.blurMat.uniforms.uDir.value.set(0,1/m),d.setRenderTarget(v.a),d.render(r.passScene,r.passCam),r.passMesh.material=r.copyMat,r.copyMat.uniforms.uTex.value=v.a.texture,d.setRenderTarget(null),d.render(r.passScene,r.passCam)},1),null},b=({width:e="100%",height:t="100%",className:r,children:u,speed:n=1,rotationSpeed:l=.1,rayMarchSteps:i=20,turbulenceIters:o=10,turbulenceAmplitude:c=2.5,turbulenceFrequency:p=7.5,turbulenceExponent:m=2.1,sphereRadius:v=2.9,passthrough:f=.05,brightness:h=5e-4,coreColor:x="#D946EF",glowColor:b="#F472B6",backgroundColor:y="#0A0A0A",colorMix:S=.5,invertForLight:w=!1,opacity:C=1,dpr:T=1.5,blur:M=1,blurResolution:R=1})=>(0,a.jsxs)("div",{className:(0,d.cn)("relative overflow-hidden",r),style:{width:e,height:t},children:[(0,a.jsx)(s.Hl,{className:"absolute inset-0",dpr:[1,T],gl:{antialias:!1,alpha:!0,powerPreference:"high-performance"},orthographic:!0,camera:{position:[0,0,1],zoom:1,left:-1,right:1,top:1,bottom:-1},children:(0,a.jsx)(g,{speed:n,rotationSpeed:l,rayMarchSteps:i,turbulenceIters:o,turbulenceAmplitude:c,turbulenceFrequency:p,turbulenceExponent:m,sphereRadius:v,passthrough:f,brightness:h,coreColor:x,glowColor:b,backgroundColor:y,colorMix:S,invertForLight:w,opacity:C,blur:M,blurResolution:R})}),u&&(0,a.jsx)("div",{className:"relative z-10",children:u})]});b.displayName="FogSphere";let y=()=>{let[e,t]=(0,i.I)(),{resolvedTheme:r}=(0,n.D)(),[o,s]=(0,u.useState)(1),[c,d]=(0,u.useState)(.1),[p,m]=(0,u.useState)(20),[v,f]=(0,u.useState)(10),[h,x]=(0,u.useState)(2.5),[g,y]=(0,u.useState)(7.5),[S,w]=(0,u.useState)(2.1),[C,T]=(0,u.useState)(2.9),[M,R]=(0,u.useState)(.05),[j,F]=(0,u.useState)(5e-4),[P,B]=(0,u.useState)(1),[A,D]=(0,u.useState)("#D946EF"),[k,U]=(0,u.useState)("#F472B6"),[I,E]=(0,u.useState)(.5),[q,N]=(0,u.useState)(1),[z,_]=(0,u.useState)(1),[G,L]=(0,u.useState)(null),[W,X]=(0,u.useState)(null),O=(0,u.useMemo)(()=>null!==G?G:"dark"===r?"#0A0A0A":"#FFFFFF",[r,G]),H=(0,u.useMemo)(()=>null!==W?W:"dark"!==r,[r,W]);return(0,a.jsxs)("div",{children:[(0,a.jsx)(l.Bg,{}),(0,a.jsxs)(l.VX,{children:[(0,a.jsxs)(l.Ec,{children:[(0,a.jsx)(l.Ch,{onRefresh:t,children:(0,a.jsx)("div",{className:"relative h-full w-full",children:(0,a.jsx)(b,{width:"100%",height:"100%",speed:o,rotationSpeed:c,rayMarchSteps:p,turbulenceIters:v,turbulenceAmplitude:h,turbulenceFrequency:g,turbulenceExponent:S,sphereRadius:C,passthrough:M,brightness:j,coreColor:A,glowColor:k,colorMix:I,backgroundColor:O,invertForLight:H,opacity:P,blur:q,blurResolution:z},e)})}),(0,a.jsxs)(l.IH,{children:[(0,a.jsx)(l.yt,{title:"Speed",value:o,onChange:s,min:.1,max:3,step:.1}),(0,a.jsx)(l.yt,{title:"Rotation Speed",value:c,onChange:d,min:0,max:1,step:.01}),(0,a.jsx)(l.yt,{title:"Ray-March Steps",value:p,onChange:m,min:8,max:32,step:1}),(0,a.jsx)(l.yt,{title:"Opacity",value:P,onChange:B,min:0,max:1,step:.05}),(0,a.jsx)(l.yt,{title:"Turbulence Iters",value:v,onChange:f,min:2,max:10,step:1}),(0,a.jsx)(l.yt,{title:"Turbulence Amp",value:h,onChange:x,min:0,max:3,step:.05}),(0,a.jsx)(l.yt,{title:"Turbulence Freq",value:g,onChange:y,min:1,max:10,step:.1}),(0,a.jsx)(l.yt,{title:"Turbulence Exp",value:S,onChange:w,min:1.1,max:3,step:.05}),(0,a.jsx)(l.yt,{title:"Sphere Radius",value:C,onChange:T,min:.5,max:6,step:.1}),(0,a.jsx)(l.yt,{title:"Passthrough",value:M,onChange:R,min:.01,max:.5,step:.01}),(0,a.jsx)(l.yt,{title:"Brightness",value:j,onChange:F,min:1e-4,max:.005,step:1e-4}),(0,a.jsx)(l.W7,{title:"Core Color",value:A,onChange:D}),(0,a.jsx)(l.W7,{title:"Glow Color",value:k,onChange:U}),(0,a.jsx)(l.yt,{title:"Color Mix",value:I,onChange:E,min:0,max:1,step:.05}),(0,a.jsx)(l.W7,{title:"Background",value:O,onChange:L}),(0,a.jsx)(l.tl,{title:"Invert For Light",checked:H,onChange:X}),(0,a.jsx)(l.yt,{title:"Blur",value:q,onChange:N,min:0,max:12,step:.5}),(0,a.jsx)(l.yt,{title:"Blur Resolution",value:z,onChange:_,min:.25,max:1,step:.05})]}),(0,a.jsx)(l.Ub,{data:[{name:"width",type:"string | number",default:'"100%"',description:"Container width"},{name:"height",type:"string | number",default:'"100%"',description:"Container height"},{name:"className",type:"string",default:'""',description:"Additional CSS classes for styling"},{name:"children",type:"ReactNode",default:"undefined",description:"Content rendered above the effect"},{name:"speed",type:"number",default:"1",description:"Global animation speed multiplier (0.1–3.0)"},{name:"rotationSpeed",type:"number",default:"0.1",description:"Camera-orbit speed in radians/second at speed=1 (0–1)"},{name:"rayMarchSteps",type:"number",default:"20",description:"Ray-march steps per pixel; lower is faster (8–32)"},{name:"turbulenceIters",type:"number",default:"10",description:"Turbulence iterations folded into the warp field (2–10)"},{name:"turbulenceAmplitude",type:"number",default:"2.5",description:"Amplitude of each turbulence octave (0–3)"},{name:"turbulenceFrequency",type:"number",default:"7.5",description:"Initial turbulence frequency (1–10)"},{name:"turbulenceExponent",type:"number",default:"2.1",description:"Per-octave frequency multiplier (1.1–3)"},{name:"sphereRadius",type:"number",default:"2.9",description:"Sphere shell radius in world units (0.5–6)"},{name:"passthrough",type:"number",default:"0.05",description:"Empty-space density bias (0.01–0.5)"},{name:"brightness",type:"number",default:"0.0005",description:"Final brightness multiplier (0.0001–0.005)"},{name:"coreColor",type:"string",default:'"#D946EF"',description:"Inner / dense color in hex format"},{name:"glowColor",type:"string",default:'"#F472B6"',description:"Outer / glow color in hex format"},{name:"colorMix",type:"number",default:"0.5",description:"Mix factor between core and glow colors (0–1)"},{name:"backgroundColor",type:"string",default:'"#0A0A0A"',description:"Background fill color in hex format"},{name:"invertForLight",type:"boolean",default:"false",description:"Invert the rendered luminance: set true on light backgrounds"},{name:"opacity",type:"number",default:"1",description:"Master alpha (0–1)"},{name:"dpr",type:"number",default:"1.5",description:"Maximum device pixel ratio (caps GPU work) (1–3)"},{name:"blur",type:"number",default:"1",description:"Post-process Gaussian blur in pixels; 0 disables the off-screen pass (0–12)"},{name:"blurResolution",type:"number",default:"1",description:"Off-screen render scale used by the blur pass (0.25–1)"}]})]}),(0,a.jsx)(l.lT,{children:(0,a.jsx)(l.Gv,{})})]})]})}},56388:(e,t,r)=>{r.d(t,{Gv:()=>o.CodeExample,lT:()=>a.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>d.CopyButton,IH:()=>n.Customize,gI:()=>v,Dn:()=>h,pi:()=>f,W7:()=>l.PreviewColor,Ch:()=>u.PreviewContainer,UD:()=>l.PreviewInput,bg:()=>l.PreviewSelect,yt:()=>l.PreviewSlider,tl:()=>l.PreviewSwitch,Ec:()=>a.PreviewTab,Ub:()=>i.PropTable,VX:()=>a.TabsLayout,bs:()=>m});var a=r(55019);r(27382);var u=r(10236),n=r(69485),l=r(48543),i=r(87552);r(39260);var o=r(52407),s=r(79901);r(24496);var c=r(95155);r(66729);var d=r(28592),p=r(90650);let m="rounded-lg border bg-background";function v({className:e,children:t,...r}){return(0,c.jsx)("div",{className:(0,p.cn)("rounded-xl border bg-muted/50 p-1",e),...r,children:t})}function f({className:e,children:t,...r}){return(0,c.jsx)("div",{className:(0,p.cn)(m,e),...r,children:t})}function h({title:e,description:t,className:r,children:a}){return(0,c.jsxs)("section",{className:r,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:a})]})}},90761:(e,t,r)=>{r.d(t,{I:()=>u});var a=r(12115);function u(){let[e,t]=(0,a.useState)(0),r=(0,a.useCallback)(()=>{t(e=>e+1)},[]);return(0,a.useEffect)(()=>{let e=new MutationObserver(()=>{r()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[r]),[e,r]}}}]);