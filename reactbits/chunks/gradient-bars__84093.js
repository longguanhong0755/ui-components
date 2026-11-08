"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[84093],{56388:(e,t,a)=>{a.d(t,{Gv:()=>l.CodeExample,lT:()=>r.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>d.CopyButton,IH:()=>i.Customize,gI:()=>p,Dn:()=>h,pi:()=>v,W7:()=>u.PreviewColor,Ch:()=>n.PreviewContainer,UD:()=>u.PreviewInput,bg:()=>u.PreviewSelect,yt:()=>u.PreviewSlider,tl:()=>u.PreviewSwitch,Ec:()=>r.PreviewTab,Ub:()=>o.PropTable,VX:()=>r.TabsLayout,bs:()=>m});var r=a(55019);a(27382);var n=a(10236),i=a(69485),u=a(48543),o=a(87552);a(39260);var l=a(52407),s=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),f=a(90650);let m="rounded-lg border bg-background";function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,f.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function v({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,f.cn)(m,e),...a,children:t})}function h({title:e,description:t,className:a,children:r}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:r})]})}},84093:(e,t,a)=>{a.r(t),a.d(t,{default:()=>g});var r=a(95155),n=a(12115),i=a(30701),u=a(56388),o=a(90761),l=a(81712),s=a(3907),c=a(90650),d=a(2253);let f=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,m=`
precision highp float;
varying vec2 vUv;

uniform float uTime;
uniform float uBars;
uniform float uCurve;
uniform float uBalance;
uniform float uSpeed;
uniform float uSpread;
uniform float uMirror;
uniform float uAltDir;
uniform float uFlipRate;
uniform float uRange;
uniform float uPower;
uniform int uMode;
uniform bool uVertical;
uniform vec3 uTint;
uniform vec3 uBg;
uniform float uAlpha;
uniform vec2 uPointer;
uniform float uCursorActive;

const float TAU = 6.2831853;

float ease(float t, float p, int m) {
  if (m == 1) return 1.0 - pow(1.0 - t, p);
  if (m == 2) return t < 0.5
    ? pow(2.0, p - 1.0) * pow(t, p)
    : 1.0 - pow(-2.0 * t + 2.0, p) / 2.0;
  return pow(t, p);
}

float remap(float v, float b) {
  float g = exp(mix(-2.0, 2.0, b));
  return pow(v, g);
}

void main() {
  vec2 coord = vUv;

  float ax1 = uVertical ? coord.x : coord.y;
  float ax2 = uVertical ? coord.y : coord.x;

  float sym = abs(ax1 - 0.5) * uMirror;
  float band = floor(sym * uBars + 0.5);

  float cursorPhase = ((uPointer.x - 0.5) * 2.0 + (uPointer.y - 0.5)) * 0.5 * uCursorActive;
  float pOff = band * (1.0 / (uBars * max(uSpread, 0.001)));
  float phi = fract(uTime * uSpeed + pOff + cursorPhase);
  float wave = ease(phi, uPower, uMode) * uRange - (uRange / 2.0);

  bool even = mod(band, 2.0) < 1.0;
  float flipped = even ? ax2 : 1.0 - ax2;
  ax2 = mix(ax2, flipped, uAltDir);

  float grad = pow(ax2, uCurve);
  grad = mix(grad, 1.0 - grad, 0.5 + sin(uTime * uFlipRate) * 0.5);

  float anim = fract(wave + grad);
  float val = 0.5 + 0.5 * sin(anim * TAU);
  val = remap(val, uBalance);

  vec3 out_col = mix(uTint, uBg, val);
  gl_FragColor = vec4(out_col, uAlpha);
}
`;function p(e){let t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t?[parseInt(t[1],16)/255,parseInt(t[2],16)/255,parseInt(t[3],16)/255]:[0,0,0]}let v=({speed:e,barCount:t,gradientPower:a,balance:i,phaseSpread:u,mirrorRepeat:o,alternateDirection:s,invertSpeed:c,phaseRange:v,curvePower:h,easingMode:g,vertical:x,color:b,backgroundColor:C,opacity:y,pointer:w,cursorInteraction:S})=>{let j=(0,n.useRef)(null),{size:P}=(0,l.C)(),R=(0,n.useRef)(new d.I9Y(.5,.5)),B=(0,n.useMemo)(()=>({uTime:{value:0},uResolution:{value:new d.I9Y(1,1)},uBars:{value:8},uCurve:{value:.2},uBalance:{value:.15},uSpeed:{value:.1},uSpread:{value:4},uMirror:{value:2},uAltDir:{value:0},uFlipRate:{value:.2},uRange:{value:2},uPower:{value:1},uMode:{value:0},uVertical:{value:!0},uTint:{value:new d.Pq0(1,1,1)},uBg:{value:new d.Pq0(0,0,0)},uAlpha:{value:1},uPointer:{value:new d.I9Y(.5,.5)},uCursorActive:{value:0}}),[]);return(0,l.D)((r,n)=>{if(!j.current)return;let l=j.current.material;l.uniforms.uTime.value=r.clock.elapsedTime,l.uniforms.uResolution.value.set(P.width,P.height),l.uniforms.uBars.value=t,l.uniforms.uCurve.value=a,l.uniforms.uBalance.value=i,l.uniforms.uSpeed.value=e,l.uniforms.uSpread.value=u,l.uniforms.uMirror.value=o,l.uniforms.uAltDir.value=s,l.uniforms.uFlipRate.value=c,l.uniforms.uRange.value=v,l.uniforms.uPower.value=h,l.uniforms.uMode.value=g,l.uniforms.uVertical.value=x,l.uniforms.uAlpha.value=y;let[d,f,m]=p(b);l.uniforms.uTint.value.set(d,f,m);let[B,M,T]=p(C);l.uniforms.uBg.value.set(B,M,T),l.uniforms.uCursorActive.value=+!!S;let k=1-Math.exp(-n/.15);R.current.x+=(w[0]-R.current.x)*k,R.current.y+=(w[1]-R.current.y)*k,l.uniforms.uPointer.value.set(R.current.x,R.current.y)}),(0,r.jsxs)("mesh",{ref:j,children:[(0,r.jsx)("planeGeometry",{args:[2,2]}),(0,r.jsx)("shaderMaterial",{vertexShader:f,fragmentShader:m,uniforms:B,transparent:!0})]})},h=({width:e="100%",height:t="100%",className:a,children:i,barCount:u=8,gradientPower:o=.2,balance:l=.15,speed:d=.1,phaseSpread:f=4,mirrorRepeat:m=2,alternateDirection:p=0,invertSpeed:h=.2,phaseRange:g=2,curvePower:x=1,easingMode:b=0,vertical:C=!0,color:y="#ffffff",backgroundColor:w="#000000",opacity:S=1,cursorInteraction:j=!1})=>{let P=(0,n.useRef)(null),[R,B]=(0,n.useState)([.5,.5]),M=(0,n.useCallback)(e=>{if(!j)return;let t=P.current?.getBoundingClientRect();t&&B([(e.clientX-t.left)/t.width,1-(e.clientY-t.top)/t.height])},[j]);return(0,r.jsxs)("div",{ref:P,className:(0,c.cn)("relative overflow-hidden",a),style:{width:e,height:t},onPointerMove:M,children:[(0,r.jsx)(s.Hl,{className:"absolute inset-0",gl:{antialias:!0,alpha:!0},orthographic:!0,camera:{position:[0,0,1],zoom:1,left:-1,right:1,top:1,bottom:-1},children:(0,r.jsx)(v,{speed:d,barCount:u,gradientPower:o,balance:l,phaseSpread:f,mirrorRepeat:m,alternateDirection:p,invertSpeed:h,phaseRange:g,curvePower:x,easingMode:b,vertical:C,color:y,backgroundColor:w,opacity:S,pointer:R,cursorInteraction:j})}),i&&(0,r.jsx)("div",{className:"relative z-1",children:i})]})};h.displayName="GradientBars";let g=()=>{let[e,t]=(0,o.I)(),{resolvedTheme:a}=(0,i.D)(),[l,s]=(0,n.useState)(8),[c,d]=(0,n.useState)(.2),[f,m]=(0,n.useState)(.15),[p,v]=(0,n.useState)(!0),[g,x]=(0,n.useState)(.1),[b,C]=(0,n.useState)(4),[y,w]=(0,n.useState)(2),[S,j]=(0,n.useState)(0),[P,R]=(0,n.useState)(.2),[B,M]=(0,n.useState)(2),[T,k]=(0,n.useState)(1),[I,A]=(0,n.useState)(0),[N,E]=(0,n.useState)(1),[D,F]=(0,n.useState)(!1),[U,V]=(0,n.useState)(null),[_,G]=(0,n.useState)(null),O=(0,n.useMemo)(()=>null!==U?U:"dark"===a?"#ffffff":"#000000",[a,U]),z=(0,n.useMemo)(()=>null!==_?_:"dark"===a?"#0a0a0a":"#FFFFFF",[a,_]);return(0,r.jsxs)("div",{children:[(0,r.jsx)(u.Bg,{}),(0,r.jsxs)(u.VX,{children:[(0,r.jsxs)(u.Ec,{children:[(0,r.jsx)(u.Ch,{onRefresh:t,children:(0,r.jsx)("div",{className:"relative h-full w-full",children:(0,r.jsx)(h,{width:"100%",height:"100%",barCount:l,gradientPower:c,balance:f,speed:g,phaseSpread:b,mirrorRepeat:y,alternateDirection:S,invertSpeed:P,phaseRange:B,curvePower:T,easingMode:I,vertical:p,color:O,backgroundColor:z,opacity:N,cursorInteraction:D},e)})}),(0,r.jsxs)(u.IH,{children:[(0,r.jsx)(u.yt,{title:"Bar Count",value:l,onChange:s,min:1,max:32,step:1}),(0,r.jsx)(u.yt,{title:"Gradient Power",value:c,onChange:d,min:.01,max:1,step:.01}),(0,r.jsx)(u.yt,{title:"Balance",value:f,onChange:m,min:0,max:1,step:.01}),(0,r.jsx)(u.yt,{title:"Mirror Repeat",value:y,onChange:w,min:1,max:8,step:1}),(0,r.jsx)(u.tl,{title:"Vertical",checked:p,onChange:v}),(0,r.jsx)(u.yt,{title:"Speed",value:g,onChange:x,min:0,max:2,step:.01}),(0,r.jsx)(u.yt,{title:"Phase Spread",value:b,onChange:C,min:0,max:16,step:.5}),(0,r.jsx)(u.yt,{title:"Phase Range",value:B,onChange:M,min:1,max:16,step:1}),(0,r.jsx)(u.yt,{title:"Alternate Direction",value:S,onChange:j,min:0,max:1,step:.1}),(0,r.jsx)(u.yt,{title:"Invert Speed",value:P,onChange:R,min:0,max:2,step:.05}),(0,r.jsx)(u.yt,{title:"Curve Power",value:T,onChange:k,min:1,max:5,step:.5}),(0,r.jsx)(u.bg,{title:"Easing Mode",value:String(I),onChange:e=>A(Number(e)),options:[{label:"Ease In",value:"0"},{label:"Ease Out",value:"1"},{label:"Ease In-Out",value:"2"}]}),(0,r.jsx)(u.W7,{title:"Tint Color",value:O,onChange:e=>V(e)}),(0,r.jsx)(u.W7,{title:"Background",value:z,onChange:e=>G(e)}),(0,r.jsx)(u.yt,{title:"Opacity",value:N,onChange:E,min:0,max:1,step:.05}),(0,r.jsx)(u.tl,{title:"Cursor Interaction",checked:D,onChange:F})]}),(0,r.jsx)(u.Ub,{data:[{name:"width",type:"string | number",default:'"100%"',description:"Container width"},{name:"height",type:"string | number",default:'"100%"',description:"Container height"},{name:"className",type:"string",default:'""',description:"Additional CSS classes for styling"},{name:"children",type:"ReactNode",default:"undefined",description:"Content rendered above the effect"},{name:"barCount",type:"number",default:"8",description:"Number of stripes (1–32)"},{name:"gradientPower",type:"number",default:"0.2",description:"Gradient curve exponent (0–1)"},{name:"balance",type:"number",default:"0.15",description:"Black/white balance (0–1)"},{name:"speed",type:"number",default:"0.1",description:"Animation speed (0–2)"},{name:"phaseSpread",type:"number",default:"4",description:"Phase offset between stripes (0–16)"},{name:"mirrorRepeat",type:"number",default:"2",description:"Horizontal mirror repetitions (1–8)"},{name:"alternateDirection",type:"number",default:"0",description:"Alternate direction on odd stripes (0–1)"},{name:"invertSpeed",type:"number",default:"0.2",description:"Speed of direction inversion oscillation (0–2)"},{name:"phaseRange",type:"number",default:"2",description:"Phase multiplier for animation range (1–16)"},{name:"curvePower",type:"number",default:"1",description:"Easing curve power (1=linear, 2=quad, 3=cubic, etc.)"},{name:"easingMode",type:"number",default:"0",description:"Easing mode: 0=in, 1=out, 2=in-out"},{name:"vertical",type:"boolean",default:"true",description:"Use vertical columns (true) or horizontal rows (false)"},{name:"color",type:"string",default:'"#ffffff"',description:"Tint color in hex format"},{name:"backgroundColor",type:"string",default:'"#000000"',description:"Background gradient color in hex format"},{name:"opacity",type:"number",default:"1",description:"Master opacity (0–1)"},{name:"cursorInteraction",type:"boolean",default:"false",description:"Enable cursor interaction to shift the phase offset"}]})]}),(0,r.jsx)(u.lT,{children:(0,r.jsx)(u.Gv,{})})]})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>n});var r=a(12115);function n(){let[e,t]=(0,r.useState)(0),a=(0,r.useCallback)(()=>{t(e=>e+1)},[]);return(0,r.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);