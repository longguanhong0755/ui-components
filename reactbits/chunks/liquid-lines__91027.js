"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[91027],{56388:(e,t,a)=>{a.d(t,{Gv:()=>l.CodeExample,lT:()=>i.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>d.CopyButton,IH:()=>r.Customize,gI:()=>v,Dn:()=>h,pi:()=>p,W7:()=>o.PreviewColor,Ch:()=>n.PreviewContainer,UD:()=>o.PreviewInput,bg:()=>o.PreviewSelect,yt:()=>o.PreviewSlider,tl:()=>o.PreviewSwitch,Ec:()=>i.PreviewTab,Ub:()=>u.PropTable,VX:()=>i.TabsLayout,bs:()=>m});var i=a(55019);a(27382);var n=a(10236),r=a(69485),o=a(48543),u=a(87552);a(39260);var l=a(52407),s=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),f=a(90650);let m="rounded-lg border bg-background";function v({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,f.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,f.cn)(m,e),...a,children:t})}function h({title:e,description:t,className:a,children:i}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:i})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>n});var i=a(12115);function n(){let[e,t]=(0,i.useState)(0),a=(0,i.useCallback)(()=>{t(e=>e+1)},[]);return(0,i.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}},91027:(e,t,a)=>{a.r(t),a.d(t,{default:()=>g});var i=a(95155),n=a(12115),r=a(56388),o=a(48543),u=a(90761),l=a(81712),s=a(3907),c=a(2253),d=a(30701),f=a(90650);let m=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,v=`
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform int u_iterations;
uniform float u_waveFrequency;
uniform float u_depthStep;
uniform float u_lineThickness;
uniform float u_waveAmplitude;
uniform vec3 u_lineColor;
uniform vec3 u_backgroundColor;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_offsetX;
uniform float u_offsetY;
uniform float u_scale;
uniform float u_opacity;

varying vec2 vUv;

void main() {
  float time = u_time * u_speed;
  vec2 resolution = u_resolution;

  vec3 accumulator = vec3(0.0);
  float depth = time;
  float magnitude = 0.0;

  vec2 baseCoord = (vUv - 0.5) * 2.0;
  baseCoord.x *= resolution.x / resolution.y;
  baseCoord *= u_scale;
  baseCoord += vec2(u_offsetX, u_offsetY);

  for (int i = 0; i < 100; i++) {
    if (i >= u_iterations) break;

    vec2 coord = baseCoord;
    vec2 waveCoord = coord;

    coord -= waveCoord.x + 0.1;
    coord.x *= resolution.x / resolution.y;

    depth += u_depthStep;
    magnitude = length(coord);

    float phase1 = depth * 0.7;
    float phase2 = depth * 1.3;
    float wave1 = sin(phase1) * 0.5 + cos(phase2) * 0.5 + 1.5;
    float wave2 = sin(magnitude * u_waveFrequency - depth) * 0.7 + cos(magnitude * u_waveFrequency * 0.5 + depth * 0.3) * 0.3;
    waveCoord += coord / max(magnitude, 0.01) * wave1 * wave2 * u_waveAmplitude;

    vec2 gridPos = mod(waveCoord, 1.0) - 0.5;
    float lineIntensity = u_lineThickness / length(gridPos);

    if (i == 0) accumulator.r = lineIntensity;
    else if (i == 1) accumulator.g = lineIntensity;
    else if (i == 2) accumulator.b = lineIntensity;
    else {
      accumulator += vec3(lineIntensity) * 0.01;
    }
  }

  accumulator = accumulator / max(magnitude, 0.001);

  accumulator = (accumulator - 0.5) * u_contrast + 0.5;
  accumulator *= u_brightness;

  vec3 finalColor = accumulator * u_lineColor;

  float alpha = clamp(length(accumulator) * u_opacity, 0.0, 1.0);
  finalColor = mix(u_backgroundColor, finalColor, alpha);

  gl_FragColor = vec4(finalColor, 1.0);
}
`,p=({speed:e,iterations:t,waveFrequency:a,depthStep:r,lineThickness:o,waveAmplitude:u,lineColor:s,backgroundColor:d,brightness:f,contrast:p,offsetX:h,offsetY:g,scale:x,opacity:_})=>{let w=(0,n.useRef)(null),C=(0,n.useRef)(null),{viewport:b}=(0,l.C)(),y=(0,n.useMemo)(()=>({u_time:{value:0},u_resolution:{value:new c.I9Y(100*b.width,100*b.height)},u_speed:{value:e},u_iterations:{value:t},u_waveFrequency:{value:a},u_depthStep:{value:r},u_lineThickness:{value:o},u_waveAmplitude:{value:u},u_lineColor:{value:new c.Q1f(s)},u_backgroundColor:{value:new c.Q1f(d)},u_brightness:{value:f},u_contrast:{value:p},u_offsetX:{value:h},u_offsetY:{value:g},u_scale:{value:x},u_opacity:{value:_}}),[]);return(0,l.D)(i=>{C.current&&(C.current.uniforms.u_time.value=i.clock.elapsedTime,C.current.uniforms.u_resolution.value.set(100*b.width,100*b.height),C.current.uniforms.u_speed.value=e,C.current.uniforms.u_iterations.value=t,C.current.uniforms.u_waveFrequency.value=a,C.current.uniforms.u_depthStep.value=r,C.current.uniforms.u_lineThickness.value=o,C.current.uniforms.u_waveAmplitude.value=u,C.current.uniforms.u_lineColor.value.set(s),C.current.uniforms.u_backgroundColor.value.set(d),C.current.uniforms.u_brightness.value=f,C.current.uniforms.u_contrast.value=p,C.current.uniforms.u_offsetX.value=h,C.current.uniforms.u_offsetY.value=g,C.current.uniforms.u_scale.value=x,C.current.uniforms.u_opacity.value=_)}),(0,i.jsxs)("mesh",{ref:w,scale:[b.width,b.height,1],children:[(0,i.jsx)("planeGeometry",{args:[1,1]}),(0,i.jsx)("shaderMaterial",{ref:C,vertexShader:m,fragmentShader:v,uniforms:y})]})},h=({width:e="100%",height:t="100%",className:a="",speed:n=.4,iterations:r=3,waveFrequency:o=49,depthStep:u=.05,lineThickness:l=.009,waveAmplitude:c=.6,lineColor:m="#ffffff",lightBackground:v="#ffffff",darkBackground:h="#000000",brightness:g=2.5,contrast:x=1.1,offsetX:_=0,offsetY:w=0,scale:C=.3,opacity:b=1})=>{let{resolvedTheme:y}=(0,d.D)(),S="number"==typeof e?`${e}px`:e,j="number"==typeof t?`${t}px`:t;return(0,i.jsx)("div",{className:(0,f.cn)("relative overflow-hidden",a),style:{width:S,height:j},children:(0,i.jsx)(s.Hl,{className:"absolute inset-0 h-full w-full",gl:{antialias:!0,alpha:!1},camera:{position:[0,0,1],fov:75},children:(0,i.jsx)(p,{speed:n,iterations:r,waveFrequency:o,depthStep:u,lineThickness:l,waveAmplitude:c,lineColor:m,backgroundColor:"dark"===y?h:v,brightness:g,contrast:x,offsetX:_,offsetY:w,scale:C,opacity:b})})})};h.displayName="LiquidLines";let g=()=>{let[e,t]=(0,u.I)(),[a,l]=(0,n.useState)(.4),[s,c]=(0,n.useState)(3),[d,f]=(0,n.useState)(49),[m,v]=(0,n.useState)(.05),[p,g]=(0,n.useState)(.6),[x,_]=(0,n.useState)("#ffffff"),[w,C]=(0,n.useState)(.009),[b,y]=(0,n.useState)("#ffffff"),[S,j]=(0,n.useState)("#333333"),[k,P]=(0,n.useState)(2.5),[T,I]=(0,n.useState)(1.1),[N,q]=(0,n.useState)(1),[A,B]=(0,n.useState)(0),[F,X]=(0,n.useState)(0),[Y,D]=(0,n.useState)(.3);return(0,i.jsxs)("div",{children:[(0,i.jsx)(r.Bg,{}),(0,i.jsxs)(r.VX,{children:[(0,i.jsxs)(r.Ec,{children:[(0,i.jsx)(r.Ch,{onRefresh:t,minHeight:500,children:(0,i.jsx)(h,{speed:a,iterations:s,waveFrequency:d,depthStep:m,lineThickness:w,waveAmplitude:p,lineColor:x,lightBackground:b,darkBackground:S,brightness:k,contrast:T,offsetX:A,offsetY:F,scale:Y,opacity:N},e)}),(0,i.jsxs)(r.IH,{children:[(0,i.jsx)(o.PreviewSlider,{title:"Speed",value:a,onChange:l,min:.1,max:2,step:.1}),(0,i.jsx)(o.PreviewSlider,{title:"Iterations",value:s,onChange:c,min:1,max:10,step:1}),(0,i.jsx)(o.PreviewSlider,{title:"Frequency",value:d,onChange:f,min:1,max:100,step:1}),(0,i.jsx)(o.PreviewSlider,{title:"Depth Step",value:m,onChange:v,min:.01,max:.2,step:.01}),(0,i.jsx)(o.PreviewSlider,{title:"Amplitude",value:p,onChange:g,min:0,max:2,step:.1}),(0,i.jsx)(o.PreviewColor,{title:"Line Color",value:x,onChange:_}),(0,i.jsx)(o.PreviewSlider,{title:"Line Thickness",value:w,onChange:C,min:.001,max:.05,step:.001}),(0,i.jsx)(o.PreviewColor,{title:"Light Mode",value:b,onChange:y}),(0,i.jsx)(o.PreviewColor,{title:"Dark Mode",value:S,onChange:j}),(0,i.jsx)(o.PreviewSlider,{title:"Brightness",value:k,onChange:P,min:.5,max:5,step:.1}),(0,i.jsx)(o.PreviewSlider,{title:"Contrast",value:T,onChange:I,min:.5,max:2,step:.1}),(0,i.jsx)(o.PreviewSlider,{title:"Opacity",value:N,onChange:q,min:0,max:1,step:.05}),(0,i.jsx)(o.PreviewSlider,{title:"Scale",value:Y,onChange:D,min:.1,max:2,step:.1}),(0,i.jsx)(o.PreviewSlider,{title:"Offset X",value:A,onChange:B,min:-2,max:2,step:.1}),(0,i.jsx)(o.PreviewSlider,{title:"Offset Y",value:F,onChange:X,min:-2,max:2,step:.1})]}),(0,i.jsx)(r.Ub,{data:[{name:"width",type:"number | string",default:'"100%"',description:"Width of the component in pixels or CSS value"},{name:"height",type:"number | string",default:'"100%"',description:"Height of the component in pixels or CSS value"},{name:"speed",type:"number",default:"0.4",description:"Animation speed multiplier"},{name:"iterations",type:"number",default:"3",description:"Number of iterations for detail (higher = more detailed but slower)"},{name:"waveFrequency",type:"number",default:"49",description:"Wave frequency - controls how many waves appear"},{name:"depthStep",type:"number",default:"0.05",description:"Depth progression - how much depth changes per iteration"},{name:"lineThickness",type:"number",default:"0.009",description:"Line thickness - controls the thickness of the lines"},{name:"waveAmplitude",type:"number",default:"0.6",description:"Wave amplitude - how much the waves displace"},{name:"lineColor",type:"string",default:'"#ffffff"',description:"Primary line color"},{name:"lightBackground",type:"string",default:'"#ffffff"',description:"Background color for light mode"},{name:"darkBackground",type:"string",default:'"#000000"',description:"Background color for dark mode"},{name:"brightness",type:"number",default:"2.5",description:"Brightness multiplier"},{name:"contrast",type:"number",default:"1.1",description:"Contrast adjustment"},{name:"offsetX",type:"number",default:"0",description:"Horizontal offset"},{name:"offsetY",type:"number",default:"0",description:"Vertical offset"},{name:"scale",type:"number",default:"0.3",description:"Pattern scale"},{name:"opacity",type:"number",default:"1",description:"Alpha/opacity of the effect"},{name:"className",type:"string",default:'""',description:"Additional CSS classes"}]})]}),(0,i.jsx)(r.lT,{children:(0,i.jsx)(r.Gv,{})})]})]})}}}]);