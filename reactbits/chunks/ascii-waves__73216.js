"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[73216],{56388:(e,t,n)=>{n.d(t,{Gv:()=>l.CodeExample,lT:()=>i.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>d.CopyButton,IH:()=>a.Customize,gI:()=>m,Dn:()=>h,pi:()=>p,W7:()=>u.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>u.PreviewInput,bg:()=>u.PreviewSelect,yt:()=>u.PreviewSlider,tl:()=>u.PreviewSwitch,Ec:()=>i.PreviewTab,Ub:()=>o.PropTable,VX:()=>i.TabsLayout,bs:()=>f});var i=n(55019);n(27382);var r=n(10236),a=n(69485),u=n(48543),o=n(87552);n(39260);var l=n(52407),s=n(79901);n(24496);var c=n(95155);n(66729);var d=n(28592),v=n(90650);let f="rounded-lg border bg-background";function m({className:e,children:t,...n}){return(0,c.jsx)("div",{className:(0,v.cn)("rounded-xl border bg-muted/50 p-1",e),...n,children:t})}function p({className:e,children:t,...n}){return(0,c.jsx)("div",{className:(0,v.cn)(f,e),...n,children:t})}function h({title:e,description:t,className:n,children:i}){return(0,c.jsxs)("section",{className:n,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:i})]})}},73216:(e,t,n)=>{n.r(t),n.d(t,{default:()=>p});var i=n(95155),r=n(56388),a=n(12115),u=n(90761),o=n(81712),l=n(3907),s=n(2253),c=n(90650);let d=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,v=`
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  uniform sampler2D uFontTexture;
  uniform float uCharCount;
  uniform vec3 uColor;
  uniform bool uInvert;
  uniform float uScale;
  uniform float uSize;
  uniform float uSpeed;
  uniform float uHasMouse;
  uniform float uIntensity;
  uniform float uInteractIntensity;
  uniform float uWaveTension;
  uniform float uWaveTwist;
  uniform sampler2D uVideoTexture;
  uniform bool uHasVideo;

  varying vec2 vUv;

  #define PI 3.14159265359
  #define TAU 6.28318530718

  float flowField(vec2 p, float t) {
    return sin(p.x + sin(p.y + t * 0.1)) * sin(p.y * p.x * 0.1 + t * 0.2);
  }

  vec2 computeField(vec2 p, float t) {
    vec2 ep = vec2(0.05, 0.0);
    vec2 result = vec2(0.0);
    float tension = uWaveTension;
    float twist = uWaveTwist;

    for (int i = 0; i < 20; i++) {
      float t0 = flowField(p, t);
      float t1 = flowField(p + ep.xy, t);
      float t2 = flowField(p + ep.yx, t);
      vec2 gradient = vec2((t1 - t0), (t2 - t0)) / ep.xx;
      vec2 tangent = vec2(-gradient.y, gradient.x);

      p += tangent * tension + gradient * 0.005;
      p.x += sin(t * 0.25) * twist;
      p.y += cos(t * 0.25) * twist;
      result = gradient;
    }

    return result;
  }

  vec3 getDistortion(vec2 coord) {
      vec2 aspect;

      if(uResolution.x > uResolution.y) {
          aspect = vec2(uResolution.x / uResolution.y, 1.0);
      } else {
          aspect = vec2(uResolution.y / uResolution.x, 1.0);
      }

      vec2 uv0 = coord.xy / uResolution.xy * aspect;
      vec2 muv = uMouse.xy / uResolution.xy * aspect;

      float speed = uSpeed;
      float noiseTime = uTime * speed;

      vec2 diff = uv0 - muv;
      float distance = length(diff);

      float radius = 0.5;
      float interaction = smoothstep(radius, 0.0, distance);

      vec2 p = uv0 * uScale;
      float interactStrength = uInteractIntensity * uHasMouse;

      vec2 mouseDistort = normalize(diff) * interaction * interactStrength;
      p += mouseDistort;
      p.x += sin(uTime * 3.0) * interaction * interactStrength * 0.5;
      p.y += cos(uTime * 3.0) * interaction * interactStrength * 0.5;

      vec2 field = computeField(p, noiseTime);

      float val = length(field) * uIntensity;
      val = clamp(val, 0.0, 1.0);

      vec2 totalDisplacement = mouseDistort + field * 0.5 * uIntensity;

      return vec3(val, totalDisplacement);
  }

  void main() {
      float gridSize = uSize;

      vec2 pix = vUv * uResolution;
      vec2 snappedMuv = floor(pix / gridSize) * gridSize;

      vec3 distData = getDistortion(snappedMuv);
      float intensity = distData.x;
      vec2 displacement = distData.yz;

      vec3 col;
      if (uHasVideo) {
        vec2 videoUV = snappedMuv / uResolution;
        vec2 distortedVideoUV = videoUV + (displacement * 0.1);

        col = texture2D(uVideoTexture, distortedVideoUV).rgb;
      } else {
        col = vec3(intensity);
      }

      float gray = 0.3 * col.r + 0.59 * col.g + 0.11 * col.b;

      if (uInvert) {
        gray = 1.0 - gray;
      }

      float charIndex = floor(gray * (uCharCount - 1.0));
      charIndex = clamp(charIndex, 0.0, uCharCount - 1.0);

      vec2 cellUV = fract(pix / gridSize);

      float charWidth = 1.0 / uCharCount;
      vec2 atlasUV = vec2((cellUV.x * charWidth) + (charIndex * charWidth), cellUV.y);

      vec4 fontSample = texture2D(uFontTexture, atlasUV);
      float alpha = fontSample.a;

      vec3 targetColor = uHasVideo ? col : uColor * (gray + 0.1);
      vec3 finalColor = targetColor * alpha;

      gl_FragColor = vec4(finalColor, alpha);
  }
`,f=({mouse:e,characters:t,color:n,invert:r,scale:u,size:l,speed:c,hasMouse:f,intensity:m,interactionIntensity:p,waveTension:h,waveTwist:x,videoUrl:g})=>{let y=(0,a.useRef)(null),C=(0,a.useRef)(null),{size:w,viewport:S}=(0,o.C)(),I=t.length>0?t:" ",T=(0,a.useRef)(null),b=(0,a.useRef)(null),j=(0,a.useMemo)(()=>({uTime:{value:0},uMouse:{value:new s.I9Y(0,0)},uResolution:{value:new s.I9Y(w.width,w.height)},uFontTexture:{value:null},uCharCount:{value:I.length},uColor:{value:new s.Q1f(n)},uInvert:{value:r},uScale:{value:u},uSize:{value:l},uSpeed:{value:c},uHasMouse:{value:+!!f},uIntensity:{value:m},uInteractIntensity:{value:p},uWaveTension:{value:h},uWaveTwist:{value:x},uVideoTexture:{value:null},uHasVideo:{value:!1}}),[]);return(0,a.useEffect)(()=>{let e=((e,t=64)=>{let n=document.createElement("canvas"),i=n.getContext("2d");if(!i)return new s.gPd;let r=e.length,a=r*t;n.width=a,n.height=t,i.clearRect(0,0,a,t),i.font=`bold ${t}px monospace`,i.fillStyle="white",i.textAlign="center",i.textBaseline="middle";for(let n=0;n<r;n++){let r=e[n],a=n*t+t/2,u=t/2;i.fillText(r,a,u)}let u=new s.GOR(n);return u.minFilter=s.k6q,u.magFilter=s.k6q,u.needsUpdate=!0,u})(I);return e.wrapS=e.wrapT=s.ghU,T.current=e,()=>{e.dispose(),T.current=null}},[I]),(0,a.useEffect)(()=>{if(!g){b.current=null;return}let e=document.createElement("video");e.src=g,e.crossOrigin="Anonymous",e.loop=!0,e.muted=!0,e.playsInline=!0,e.play().catch(e=>console.error("Video play failed",e));let t=new s.Nv2(e);return t.minFilter=s.k6q,t.magFilter=s.k6q,b.current=t,()=>{e.pause(),e.src="",t.dispose(),b.current=null}},[g]),(0,o.D)(t=>{C.current&&(C.current.uniforms.uTime.value=t.clock.elapsedTime,C.current.uniforms.uResolution.value.set(w.width,w.height),C.current.uniforms.uColor.value.set(n),C.current.uniforms.uInvert.value=r,C.current.uniforms.uScale.value=u,C.current.uniforms.uSize.value=l,C.current.uniforms.uSpeed.value=c,C.current.uniforms.uHasMouse.value=+!!f,C.current.uniforms.uIntensity.value=m,C.current.uniforms.uInteractIntensity.value=p,C.current.uniforms.uWaveTension.value=h,C.current.uniforms.uWaveTwist.value=x,C.current.uniforms.uCharCount.value=I.length,T.current&&(C.current.uniforms.uFontTexture.value=T.current),b.current?(C.current.uniforms.uVideoTexture.value=b.current,C.current.uniforms.uHasVideo.value=!0):(C.current.uniforms.uVideoTexture.value=null,C.current.uniforms.uHasVideo.value=!1),e.current&&C.current.uniforms.uMouse.value.lerp(e.current,.1))}),(0,i.jsxs)("mesh",{ref:y,children:[(0,i.jsx)("planeGeometry",{args:[S.width,S.height]}),(0,i.jsx)("shaderMaterial",{ref:C,vertexShader:d,fragmentShader:v,uniforms:j,transparent:!0})]})},m=({characters:e=" .:-+*=%@#",color:t="#ffffff",invert:n=!1,noiseScale:r=2,elementSize:u=16,speed:o=1,hasCursorInteraction:d=!0,intensity:v=1,interactionIntensity:m=1,waveTension:p=.5,waveTwist:h=.1,className:x="",videoUrl:g})=>{let y=(0,a.useRef)(new s.I9Y(0,0));return(0,i.jsx)("div",{className:(0,c.cn)("relative h-full w-full cursor-text overflow-hidden",x),onMouseMove:e=>{let t=e.currentTarget.getBoundingClientRect(),n=e.clientX-t.left,i=t.height-(e.clientY-t.top);y.current.set(n,i)},children:(0,i.jsx)(l.Hl,{orthographic:!0,camera:{position:[0,0,1],zoom:1},gl:{alpha:!0,antialias:!0},children:(0,i.jsx)(f,{mouse:y,characters:e,color:t,invert:n,scale:r,size:u,speed:o,hasMouse:d,intensity:v,interactionIntensity:m,waveTension:p,waveTwist:h,videoUrl:g})})})},p=()=>{let[e,t]=(0,u.I)(),[n,o]=(0,a.useState)("#ffffff"),[l,s]=(0,a.useState)(" .:-+*=%@#"),[c,d]=(0,a.useState)(!1),[v,f]=(0,a.useState)(2),[p,h]=(0,a.useState)(16),[x,g]=(0,a.useState)(1),[y,C]=(0,a.useState)(!1),[w,S]=(0,a.useState)(1),[I,T]=(0,a.useState)(1),[b,j]=(0,a.useState)(.5),[V,U]=(0,a.useState)(.1),[R,D]=(0,a.useState)("");return(0,i.jsxs)("div",{children:[(0,i.jsx)(r.Bg,{}),(0,i.jsxs)(r.VX,{children:[(0,i.jsxs)(r.Ec,{children:[(0,i.jsx)(r.Ch,{onRefresh:t,minHeight:700,children:(0,i.jsx)(m,{color:n,waveTension:b,waveTwist:V,characters:l,invert:c,noiseScale:v,elementSize:p,speed:x,hasCursorInteraction:y,intensity:w,interactionIntensity:I,videoUrl:R,className:"w-full h-full min-h-[400px]"},e)}),(0,i.jsxs)(r.IH,{children:[(0,i.jsx)(r.UD,{title:"Characters",value:l,onChange:s}),(0,i.jsx)(r.UD,{title:"Video URL",placeholder:"https://example.com/video.mp4",value:R,onChange:D}),(0,i.jsx)(r.W7,{title:"Color",value:n,onChange:o}),(0,i.jsx)(r.tl,{title:"Invert",checked:c,onChange:d}),(0,i.jsx)(r.yt,{title:"Element Size",min:4,max:64,step:1,value:p,onChange:h}),(0,i.jsx)(r.yt,{title:"Noise Scale",min:.1,max:5,step:.1,value:v,onChange:f}),(0,i.jsx)(r.yt,{title:"Speed",min:.01,max:1,step:.01,value:x,onChange:g}),(0,i.jsx)(r.yt,{title:"Wave Intensity",min:0,max:2,step:.1,value:w,onChange:S}),(0,i.jsx)(r.yt,{title:"Wave Tension",min:.1,max:2,step:.1,value:b,onChange:j}),(0,i.jsx)(r.yt,{title:"Wave Twist",min:0,max:1,step:.1,value:V,onChange:U}),(0,i.jsx)(r.tl,{title:"Cursor Interaction",checked:y,onChange:C}),(0,i.jsx)(r.yt,{title:"Interaction Intensity",min:0,max:2,step:.1,value:I,onChange:T})]}),(0,i.jsx)(r.Ub,{data:[{name:"characters",type:"string",default:'" .:-+*=%@#"',description:"String of characters to use for the ASCII gradient."},{name:"color",type:"string",default:'"#ffffff"',description:"Color of the ASCII characters."},{name:"waveTension",type:"number",default:"0.5",description:"Tension of the wave flow (0.1-2.0)."},{name:"waveTwist",type:"number",default:"0.1",description:"Twist amount of the wave flow (0.0-1.0)."},{name:"invert",type:"boolean",default:"false",description:"Invert the character mapping."},{name:"noiseScale",type:"number",default:"1.0",description:"Scale of the noise/wave pattern (zoom)."},{name:"elementSize",type:"number",default:"16.0",description:"Size of individual ASCII characters/grid cells."},{name:"speed",type:"number",default:"1.0",description:"Animation speed multiplier."},{name:"hasCursorInteraction",type:"boolean",default:"true",description:"Whether the waves react to mouse cursor."},{name:"intensity",type:"number",default:"1.0",description:"Intensity of the wave effect."},{name:"interactionIntensity",type:"number",default:"1.0",description:"Intensity of the cursor interaction."},{name:"className",type:"string",default:'""',description:"Additional CSS classes."},{name:"videoUrl",type:"string",default:'""',description:"Direct URL to a video file to be rendered as ASCII."}]})]}),(0,i.jsx)(r.lT,{children:(0,i.jsx)(r.Gv,{})})]})]})}},90761:(e,t,n)=>{n.d(t,{I:()=>r});var i=n(12115);function r(){let[e,t]=(0,i.useState)(0),n=(0,i.useCallback)(()=>{t(e=>e+1)},[]);return(0,i.useEffect)(()=>{let e=new MutationObserver(()=>{n()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[n]),[e,n]}}}]);