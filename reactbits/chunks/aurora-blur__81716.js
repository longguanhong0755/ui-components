"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[81716],{56388:(e,t,a)=>{a.d(t,{Gv:()=>u.CodeExample,lT:()=>n.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>v.CopyButton,IH:()=>l.Customize,gI:()=>y,Dn:()=>p,pi:()=>f,W7:()=>o.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>o.PreviewInput,bg:()=>o.PreviewSelect,yt:()=>o.PreviewSlider,tl:()=>o.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>i.PropTable,VX:()=>n.TabsLayout,bs:()=>c});var n=a(55019);a(27382);var r=a(10236),l=a(69485),o=a(48543),i=a(87552);a(39260);var u=a(52407),s=a(79901);a(24496);var m=a(95155);a(66729);var v=a(28592),d=a(90650);let c="rounded-lg border bg-background";function y({className:e,children:t,...a}){return(0,m.jsx)("div",{className:(0,d.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function f({className:e,children:t,...a}){return(0,m.jsx)("div",{className:(0,d.cn)(c,e),...a,children:t})}function p({title:e,description:t,className:a,children:n}){return(0,m.jsxs)("section",{className:a,children:[(0,m.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,m.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,m.jsx)("div",{className:"mt-6",children:n})]})}},81716:(e,t,a)=>{a.r(t),a.d(t,{default:()=>h});var n=a(95155),r=a(12115),l=a(56388),o=a(48543),i=a(90761),u=a(81712),s=a(3907),m=a(2253);let v=[{color:"#00ff4d",speed:.37,intensity:.5},{color:"#66b3ff",speed:.15,intensity:.35},{color:"#d438ff",speed:.2,intensity:.1},{color:"#1acbae",speed:.07,intensity:.15}],d=[{color:"#5f2762",blend:.5},{color:"#263031",blend:.5}],c=`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,y=`
precision highp float;
varying vec2 vUv;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_speed;
uniform vec3 u_layer1Color;
uniform float u_layer1Speed;
uniform float u_layer1Intensity;
uniform vec3 u_layer2Color;
uniform float u_layer2Speed;
uniform float u_layer2Intensity;
uniform vec3 u_layer3Color;
uniform float u_layer3Speed;
uniform float u_layer3Intensity;
uniform vec3 u_layer4Color;
uniform float u_layer4Speed;
uniform float u_layer4Intensity;
uniform float u_noiseScale;
uniform float u_movementX;
uniform float u_movementY;
uniform float u_verticalFade;
uniform float u_bloomIntensity;
uniform vec3 u_skyColor1;
uniform vec3 u_skyColor2;
uniform float u_skyBlend1;
uniform float u_skyBlend2;
uniform float u_brightness;
uniform float u_saturation;
uniform float u_opacity;

float h(float n){return fract(sin(n)*43758.5453);}

float n2d(vec2 p){
  vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);
  return mix(mix(h(i.x+h(i.y)),h(i.x+1.+h(i.y)),u.x),
             mix(h(i.x+h(i.y+1.)),h(i.x+1.+h(i.y+1.)),u.x),u.y);
}

vec3 aurora(vec2 uv,float spd,float intensity,vec3 col,float aspect){
  float t=u_time*u_speed*spd;
  vec2 scaled=vec2(uv.x*aspect,uv.y)*u_noiseScale;
  vec2 p=scaled+t*vec2(u_movementX,u_movementY);
  float n=n2d(p+n2d(col.xy+p+t));
  float a=n-uv.y*u_verticalFade;
  return col*a*intensity*u_bloomIntensity;
}

vec3 sat(vec3 c,float s){
  float g=dot(c,vec3(0.299,0.587,0.114));
  return mix(vec3(g),c,s);
}

void main(){
  vec2 uv=vUv;
  float aspect=u_resolution.x/u_resolution.y;

  vec3 c=vec3(0.);
  c+=aurora(uv,u_layer1Speed,u_layer1Intensity,u_layer1Color,aspect);
  c+=aurora(uv,u_layer2Speed,u_layer2Intensity,u_layer2Color,aspect);
  c+=aurora(uv,u_layer3Speed,u_layer3Intensity,u_layer3Color,aspect);
  c+=aurora(uv,u_layer4Speed,u_layer4Intensity,u_layer4Color,aspect);

  c+=u_skyColor2*(1.-smoothstep(u_skyBlend1,1.,uv.y));
  c+=u_skyColor1*(1.-smoothstep(0.,u_skyBlend2,uv.y));

  c=sat(c,u_saturation)*u_brightness;

  gl_FragColor=vec4(c,u_opacity);
}
`;function f(e){let t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t?[parseInt(t[1],16)/255,parseInt(t[2],16)/255,parseInt(t[3],16)/255]:[1,1,1]}let p=({speed:e,layers:t,noiseScale:a,movementX:l,movementY:o,verticalFade:i,bloomIntensity:s,skyLayers:v,brightness:d,saturation:p,opacity:_})=>{let h=(0,r.useRef)(null),{size:x}=(0,u.C)(),S=(0,r.useMemo)(()=>({u_time:{value:0},u_resolution:{value:new m.I9Y(1,1)},u_speed:{value:1},u_layer1Color:{value:new m.Pq0(0,1,.3)},u_layer1Speed:{value:.05},u_layer1Intensity:{value:.3},u_layer2Color:{value:new m.Pq0(.1,.5,.9)},u_layer2Speed:{value:.1},u_layer2Intensity:{value:.4},u_layer3Color:{value:new m.Pq0(.4,.1,.8)},u_layer3Speed:{value:.15},u_layer3Intensity:{value:.3},u_layer4Color:{value:new m.Pq0(.8,.1,.6)},u_layer4Speed:{value:.07},u_layer4Intensity:{value:.2},u_noiseScale:{value:2},u_movementX:{value:2},u_movementY:{value:-2},u_verticalFade:{value:.6},u_bloomIntensity:{value:2},u_skyColor1:{value:new m.Pq0(.2,0,.4)},u_skyColor2:{value:new m.Pq0(.15,.2,.35)},u_skyBlend1:{value:.4},u_skyBlend2:{value:.5},u_brightness:{value:1},u_saturation:{value:1},u_opacity:{value:1}}),[]);return(0,u.D)(n=>{if(!h.current)return;let r=h.current.material;r.uniforms.u_time.value=n.clock.elapsedTime,r.uniforms.u_resolution.value.set(x.width,x.height),r.uniforms.u_speed.value=e,r.uniforms.u_layer1Color.value.set(...f(t[0]?.color||"#000")),r.uniforms.u_layer1Speed.value=t[0]?.speed||0,r.uniforms.u_layer1Intensity.value=t[0]?.intensity||0,r.uniforms.u_layer2Color.value.set(...f(t[1]?.color||"#000")),r.uniforms.u_layer2Speed.value=t[1]?.speed||0,r.uniforms.u_layer2Intensity.value=t[1]?.intensity||0,r.uniforms.u_layer3Color.value.set(...f(t[2]?.color||"#000")),r.uniforms.u_layer3Speed.value=t[2]?.speed||0,r.uniforms.u_layer3Intensity.value=t[2]?.intensity||0,r.uniforms.u_layer4Color.value.set(...f(t[3]?.color||"#000")),r.uniforms.u_layer4Speed.value=t[3]?.speed||0,r.uniforms.u_layer4Intensity.value=t[3]?.intensity||0,r.uniforms.u_noiseScale.value=a,r.uniforms.u_movementX.value=l,r.uniforms.u_movementY.value=o,r.uniforms.u_verticalFade.value=i,r.uniforms.u_bloomIntensity.value=s,r.uniforms.u_skyColor1.value.set(...f(v[0]?.color||"#000")),r.uniforms.u_skyColor2.value.set(...f(v[1]?.color||"#000")),r.uniforms.u_skyBlend1.value=v[1]?.blend||0,r.uniforms.u_skyBlend2.value=v[0]?.blend||0,r.uniforms.u_brightness.value=d,r.uniforms.u_saturation.value=p,r.uniforms.u_opacity.value=_}),(0,n.jsxs)("mesh",{ref:h,children:[(0,n.jsx)("planeGeometry",{args:[2,2]}),(0,n.jsx)("shaderMaterial",{vertexShader:c,fragmentShader:y,uniforms:S,transparent:!0})]})},_=({width:e="100%",height:t="100%",className:a,children:r,speed:l=1.5,layers:o=v,noiseScale:i=3.5,movementX:u=-2,movementY:m=-3,verticalFade:c=.75,bloomIntensity:y=2,skyLayers:f=d,brightness:_=.8,saturation:h=1,opacity:x=1})=>{let S="number"==typeof e?`${e}px`:e,C="number"==typeof t?`${t}px`:t;return(0,n.jsxs)("div",{className:`relative overflow-hidden ${a||""}`,style:{width:S,height:C},children:[(0,n.jsx)(s.Hl,{className:"absolute inset-0 w-full h-full",gl:{antialias:!0,alpha:!0},orthographic:!0,camera:{position:[0,0,1],zoom:1,left:-1,right:1,top:1,bottom:-1},children:(0,n.jsx)(p,{speed:l,layers:o,noiseScale:i,movementX:u,movementY:m,verticalFade:c,bloomIntensity:y,skyLayers:f,brightness:_,saturation:h,opacity:x})}),r&&(0,n.jsx)("div",{className:"relative z-10",children:r})]})};_.displayName="AuroraBlur";let h=()=>{let[e,t]=(0,i.I)(),[a,u]=(0,r.useState)(1.5),[s,m]=(0,r.useState)(.8),[v,d]=(0,r.useState)(1),[c,y]=(0,r.useState)(1),[f,p]=(0,r.useState)(3.5),[h,x]=(0,r.useState)(-2),[S,C]=(0,r.useState)(-3),[g,b]=(0,r.useState)(.75),[w,j]=(0,r.useState)(2),[I,P]=(0,r.useState)("#00ff4d"),[k,B]=(0,r.useState)(.37),[N,F]=(0,r.useState)(.5),[X,Y]=(0,r.useState)("#66b3ff"),[M,E]=(0,r.useState)(.15),[H,T]=(0,r.useState)(.35),[U,q]=(0,r.useState)("#d438ff"),[L,V]=(0,r.useState)(.2),[A,z]=(0,r.useState)(.1),[R,$]=(0,r.useState)("#5f2762"),[D,G]=(0,r.useState)(.5),[O,W]=(0,r.useState)("#263031"),[J,K]=(0,r.useState)(.5),Q=[{color:I,speed:k,intensity:N},{color:X,speed:M,intensity:H},{color:U,speed:L,intensity:A}],Z=[{color:R,blend:D},{color:O,blend:J}];return(0,n.jsxs)("div",{children:[(0,n.jsx)(l.Bg,{}),(0,n.jsxs)(l.VX,{children:[(0,n.jsxs)(l.Ec,{children:[(0,n.jsx)(l.Ch,{onRefresh:t,minHeight:600,children:(0,n.jsx)(_,{speed:a,layers:Q,noiseScale:f,movementX:h,movementY:S,verticalFade:g,bloomIntensity:w,skyLayers:Z,brightness:s,saturation:v,opacity:c},e)}),(0,n.jsxs)(l.IH,{children:[(0,n.jsx)(o.PreviewSlider,{title:"Speed",value:a,onChange:u,min:.1,max:5,step:.1}),(0,n.jsx)(o.PreviewSlider,{title:"Brightness",value:s,onChange:m,min:0,max:2,step:.1}),(0,n.jsx)(o.PreviewSlider,{title:"Saturation",value:v,onChange:d,min:0,max:2,step:.1}),(0,n.jsx)(o.PreviewSlider,{title:"Opacity",value:c,onChange:y,min:0,max:1,step:.05}),(0,n.jsx)(o.PreviewSlider,{title:"Noise Scale",value:f,onChange:p,min:.5,max:10,step:.5}),(0,n.jsx)(o.PreviewSlider,{title:"Movement X",value:h,onChange:x,min:-5,max:5,step:.5}),(0,n.jsx)(o.PreviewSlider,{title:"Movement Y",value:S,onChange:C,min:-5,max:5,step:.5}),(0,n.jsx)(o.PreviewSlider,{title:"Vertical Fade",value:g,onChange:b,min:0,max:2,step:.05}),(0,n.jsx)(o.PreviewSlider,{title:"Bloom Intensity",value:w,onChange:j,min:.5,max:5,step:.1}),(0,n.jsx)(o.PreviewColor,{title:"Color",value:I,onChange:P}),(0,n.jsx)(o.PreviewSlider,{title:"Speed",value:k,onChange:B,min:0,max:1,step:.01}),(0,n.jsx)(o.PreviewSlider,{title:"Intensity",value:N,onChange:F,min:0,max:1,step:.05}),(0,n.jsx)(o.PreviewColor,{title:"Color",value:X,onChange:Y}),(0,n.jsx)(o.PreviewSlider,{title:"Speed",value:M,onChange:E,min:0,max:1,step:.01}),(0,n.jsx)(o.PreviewSlider,{title:"Intensity",value:H,onChange:T,min:0,max:1,step:.05}),(0,n.jsx)(o.PreviewColor,{title:"Color",value:U,onChange:q}),(0,n.jsx)(o.PreviewSlider,{title:"Speed",value:L,onChange:V,min:0,max:1,step:.01}),(0,n.jsx)(o.PreviewSlider,{title:"Intensity",value:A,onChange:z,min:0,max:1,step:.05}),(0,n.jsx)(o.PreviewColor,{title:"Color",value:R,onChange:$}),(0,n.jsx)(o.PreviewSlider,{title:"Blend",value:D,onChange:G,min:0,max:1,step:.05}),(0,n.jsx)(o.PreviewColor,{title:"Color",value:O,onChange:W}),(0,n.jsx)(o.PreviewSlider,{title:"Blend",value:J,onChange:K,min:0,max:1,step:.05})]}),(0,n.jsx)(l.Ub,{data:[{name:"width",type:"number | string",default:'"100%"',description:"Width of the component in pixels or CSS value"},{name:"height",type:"number | string",default:'"100%"',description:"Height of the component in pixels or CSS value"},{name:"speed",type:"number",default:"1.5",description:"Animation speed multiplier (0.1-5)"},{name:"layers",type:"AuroraLayer[]",default:"[...]",description:"Aurora layers - array of { color: string, speed: number, intensity: number }"},{name:"noiseScale",type:"number",default:"3.5",description:"Noise scale for aurora pattern (0.5-10)"},{name:"movementX",type:"number",default:"-2",description:"Horizontal movement speed (-5 to 5)"},{name:"movementY",type:"number",default:"-3",description:"Vertical movement speed (-5 to 5)"},{name:"verticalFade",type:"number",default:"0.75",description:"Vertical fade intensity (0-2)"},{name:"bloomIntensity",type:"number",default:"2",description:"Bloom/glow intensity (0.5-5)"},{name:"skyLayers",type:"SkyLayer[]",default:"[...]",description:"Sky gradient layers - array of { color: string, blend: number }"},{name:"brightness",type:"number",default:"0.8",description:"Overall brightness (0-2)"},{name:"saturation",type:"number",default:"1",description:"Color saturation (0-2)"},{name:"opacity",type:"number",default:"1",description:"Master opacity (0-1)"},{name:"className",type:"string",default:'""',description:"Additional CSS classes"},{name:"children",type:"React.ReactNode",default:"undefined",description:"Content to render on top of the effect"}]})]}),(0,n.jsx)(l.lT,{children:(0,n.jsx)(l.Gv,{})})]})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>r});var n=a(12115);function r(){let[e,t]=(0,n.useState)(0),a=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);