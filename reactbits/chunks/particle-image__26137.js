"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[26137],{26137:(e,t,a)=>{a.r(t),a.d(t,{default:()=>j});var i=a(95155),n=a(12115),o=a(30701),r=a(56388),l=a(90761),s=a(81712),u=a(3907),c=a(2253),f=a(90650);let p="https://images.unsplash.com/photo-1460574283810-2aab119d8511?q=80&w=1726&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",d=`
#define HASH_SCALE vec3(0.1031, 0.11369, 0.13787)

vec3 hash33(vec3 p) {
  p = fract(p * HASH_SCALE);
  p += dot(p, p.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3(
    (p.x + p.y) * p.z,
    (p.x + p.z) * p.y,
    (p.y + p.z) * p.x
  ));
}
`,m=`
float flowNoise(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;

  vec3 cell = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (cell - (cell.x + cell.y + cell.z) * K2);
  vec3 edge = step(vec3(0.0), d0 - d0.yzx);
  vec3 o1 = edge * (1.0 - edge.zxy);
  vec3 o2 = 1.0 - edge.zxy * (1.0 - edge);
  vec3 d1 = d0 - (o1 - K2);
  vec3 d2 = d0 - (o2 - 2.0 * K2);
  vec3 d3 = d0 - (1.0 - 3.0 * K2);

  vec4 falloff = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
  vec4 weights = falloff * falloff * falloff * falloff * vec4(
    dot(d0, hash33(cell)),
    dot(d1, hash33(cell + o1)),
    dot(d2, hash33(cell + o2)),
    dot(d3, hash33(cell + 1.0))
  );

  return dot(vec4(31.316), weights);
}
`,v=`
vec2 coverUv(vec2 uv, float frameAspect, float imageAspect) {
  bool wide = imageAspect > frameAspect;
  float scale = wide ? frameAspect / imageAspect : imageAspect / frameAspect;
  vec2 axis = wide ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  return (uv - 0.5) * (axis * scale + (1.0 - axis)) + 0.5;
}
`,h=`precision highp float;

in vec3 position;
in vec2 uv;

out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`,g=`precision highp float;

uniform vec2 uResolution;
uniform float uLifespan;

in vec2 vUv;

layout(location = 0) out vec4 outMotion;
layout(location = 1) out vec4 outLife;

${d}

void main() {
  vec3 birth = hash33(vec3(vUv * 512.0, 1.0));
  vec3 jitter = hash33(vec3(vUv * 91.7, 7.3));

  vec2 origin = fract(birth.xy * 0.5 + 0.5);
  float span = uLifespan * (0.25 + 0.75 * fract(jitter.z * 0.5 + 0.5));

  outMotion = vec4(origin * uResolution, jitter.xy * 0.25);
  outLife = vec4(fract(birth.z * 0.5 + 0.5) * span, span, birth.xy);
}`,x=`precision highp float;

uniform sampler2D tMotion;
uniform sampler2D tLife;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform vec2 uPointerVelocity;
uniform float uTime;
uniform float uNoiseScale;
uniform float uNoiseStrength;
uniform float uDamping;
uniform float uLifespan;
uniform float uPointerStrength;
uniform float uPointerFalloff;

in vec2 vUv;

layout(location = 0) out vec4 outMotion;
layout(location = 1) out vec4 outLife;

${d}
${m}

void main() {
  vec4 motion = texture(tMotion, vUv);
  vec4 life = texture(tLife, vUv);

  vec2 pos = motion.xy;
  vec2 vel = motion.zw;
  float age = life.x + 1.0;
  float span = life.y;
  vec2 seed = life.zw;

  float angle = flowNoise(vec3(pos * uNoiseScale, uTime * 20.0 + age * 0.05)) * 6.2831853;
  vec2 flow = vec2(cos(angle), sin(angle)) * uNoiseStrength;

  vec2 offset = pos - uPointer;
  float proximity = uPointerFalloff / (dot(offset, offset) + uPointerFalloff);
  vec2 wake = uPointerVelocity * proximity * uPointerStrength;

  vel = vel * uDamping + flow + wake;
  pos += vel;

  bool spent = age >= span
    || pos.x < 0.0 || pos.x > uResolution.x
    || pos.y < 0.0 || pos.y > uResolution.y;

  if (spent) {
    vec3 rebirth = hash33(vec3(seed, uTime + age));
    float nextSpan = uLifespan * (0.25 + 0.75 * fract(rebirth.z * 0.5 + 0.5));
    outMotion = vec4(fract(rebirth.xy * 0.5 + 0.5) * uResolution, 0.0, 0.0);
    outLife = vec4(0.0, nextSpan, rebirth.xy);
  } else {
    outMotion = vec4(pos, vel);
    outLife = vec4(age, span, seed);
  }
}`,y=`precision highp float;

in vec3 position;

uniform sampler2D tMotion;
uniform sampler2D tLife;
uniform sampler2D uImage;
uniform vec2 uResolution;
uniform float uImageAspect;
uniform float uPointSize;
uniform float uOpacity;

out vec3 vTint;
out float vAlpha;

${v}

void main() {
  vec4 motion = texture(tMotion, position.xy);
  vec4 life = texture(tLife, position.xy);

  float ratio = life.x / max(life.y, 1.0);
  float fade = smoothstep(0.0, 0.05, ratio) * (1.0 - smoothstep(0.85, 1.0, ratio));
  vec2 birthUv = fract(life.zw * 0.5 + 0.5);

  vTint = texture(uImage, coverUv(birthUv, uResolution.x / uResolution.y, uImageAspect)).rgb;
  vAlpha = fade * uOpacity;

  vec2 ndc = motion.xy / uResolution * 2.0 - 1.0;
  gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
  gl_PointSize = smoothstep(1.0, 0.5, ratio) * uPointSize * fade;
}`,b=`precision highp float;

in vec3 vTint;
in float vAlpha;

out vec4 fragColor;

void main() {
  float mask = 1.0 - smoothstep(0.3, 0.5, length(gl_PointCoord - 0.5));
  fragColor = vec4(vTint, vAlpha * mask);
}`,S=`precision highp float;

uniform sampler2D uImage;
uniform float uFrameAspect;
uniform float uImageAspect;
uniform float uOpacity;

in vec2 vUv;

out vec4 fragColor;

${v}

void main() {
  vec2 uv = coverUv(vec2(vUv.x, 1.0 - vUv.y), uFrameAspect, uImageAspect);
  fragColor = vec4(texture(uImage, uv).rgb, uOpacity);
}`;function w({source:e,particleCount:t,particleSize:a,particleOpacity:o,speed:r,noiseScale:l,noiseStrength:u,damping:f,lifespan:p,showImage:d,imageOpacity:m,cursorInteraction:v,cursorStrength:w,cursorRadius:C,paused:j}){let{gl:M}=(0,s.C)(),P=(0,n.useMemo)(()=>Math.min(1024,Math.max(64,Math.ceil(Math.sqrt(Math.max(t,1))))),[t]),I=(0,n.useRef)(null),R=(0,n.useRef)({targetX:-1e5,targetY:-1e5,lastX:-1e5,lastY:-1e5,velocityX:0,velocityY:0,engaged:!1}),A=(0,n.useRef)({time:0}),L=(0,n.useRef)(new c.I9Y(1,1)),D=(0,n.useMemo)(()=>new c.D$Q({glslVersion:c.Wdf,vertexShader:y,fragmentShader:b,uniforms:{tMotion:{value:null},tLife:{value:null},uImage:{value:null},uResolution:{value:new c.I9Y(1,1)},uImageAspect:{value:1},uPointSize:{value:4},uOpacity:{value:.5}},transparent:!0,depthTest:!1,depthWrite:!1,blending:c.NTi}),[]),N=(0,n.useMemo)(()=>new c.D$Q({glslVersion:c.Wdf,vertexShader:h,fragmentShader:S,uniforms:{uImage:{value:null},uFrameAspect:{value:1},uImageAspect:{value:1},uOpacity:{value:1}},transparent:!0,depthTest:!1,depthWrite:!1}),[]),T=(0,n.useRef)(null);(0,n.useEffect)(()=>(T.current={point:D,backdrop:N},()=>{D.dispose(),N.dispose(),T.current=null}),[D,N]);let z=(0,n.useMemo)(()=>{let e=P*P,t=new Float32Array(3*e);for(let a=0;a<e;a++)t[3*a]=(a%P+.5)/P,t[3*a+1]=(Math.floor(a/P)+.5)/P;let a=new c.LoY;return a.setAttribute("position",new c.THS(t,3)),a},[P]);return(0,n.useEffect)(()=>()=>z.dispose(),[z]),(0,n.useEffect)(()=>{let e=null!==M.getContext().getExtension("EXT_color_buffer_float")?c.RQf:c.ix0,t=()=>new c.nWS(P,P,{count:2,type:e,format:c.GWd,minFilter:c.hxR,magFilter:c.hxR,wrapS:c.ghU,wrapT:c.ghU,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1}),a=[t(),t()],i=new c.D$Q({glslVersion:c.Wdf,vertexShader:h,fragmentShader:g,uniforms:{uResolution:{value:new c.I9Y(1,1)},uLifespan:{value:400}},depthTest:!1,depthWrite:!1}),n=new c.D$Q({glslVersion:c.Wdf,vertexShader:h,fragmentShader:x,uniforms:{tMotion:{value:null},tLife:{value:null},uResolution:{value:new c.I9Y(1,1)},uPointer:{value:new c.I9Y(-1e5,-1e5)},uPointerVelocity:{value:new c.I9Y(0,0)},uTime:{value:0},uNoiseScale:{value:.004},uNoiseStrength:{value:.04},uDamping:{value:.98},uLifespan:{value:400},uPointerStrength:{value:.08},uPointerFalloff:{value:1e3}},depthTest:!1,depthWrite:!1}),o=new c.bdM(2,2),r=new c.eaF(o,n);r.frustumCulled=!1;let l=new c.Z58;return l.add(r),I.current={scene:l,camera:new c.i7d,quad:r,seedMaterial:i,stepMaterial:n,buffers:a,front:0,seeded:!1,release:()=>{a.forEach(e=>e.dispose()),i.dispose(),n.dispose(),o.dispose()}},()=>{I.current?.release(),I.current=null}},[M,P]),(0,n.useEffect)(()=>{let e=M.domElement,t=R.current,a=a=>{let i=e.getBoundingClientRect(),n=M.getPixelRatio(),o=(a.clientX-i.left)*n,r=(a.clientY-i.top)*n;t.engaged||(t.lastX=o,t.lastY=r,t.engaged=!0),t.targetX=o,t.targetY=r},i=()=>{t.engaged=!1,t.targetX=-1e5,t.targetY=-1e5,t.lastX=-1e5,t.lastY=-1e5,t.velocityX=0,t.velocityY=0};return e.addEventListener("pointermove",a),e.addEventListener("pointerleave",i),()=>{e.removeEventListener("pointermove",a),e.removeEventListener("pointerleave",i)}},[M]),(0,s.D)((t,i)=>{let n=I.current,s=T.current;if(!n||!s)return;let c=t.gl,d=c.getDrawingBufferSize(L.current),h=Math.max(d.x,1),g=Math.max(d.y,1),x=c.getPixelRatio(),y=R.current;if(v){let e=y.targetX-y.lastX,t=y.targetY-y.lastY;y.velocityX+=(e-y.velocityX)*.15,y.velocityY+=(t-y.velocityY)*.15}else y.velocityX=0,y.velocityY=0;y.lastX=y.targetX,y.lastY=y.targetY;let b=n.stepMaterial.uniforms;if(b.uResolution.value.set(h,g),b.uNoiseScale.value=l,b.uNoiseStrength.value=u,b.uDamping.value=f,b.uLifespan.value=p,b.uPointerStrength.value=v?w:0,b.uPointerFalloff.value=Math.max(C*x,1)**2,b.uPointer.value.set(y.targetX,y.targetY),b.uPointerVelocity.value.set(y.velocityX,y.velocityY),j||(A.current.time+=.05*i*r),b.uTime.value=A.current.time,n.seeded||(n.seedMaterial.uniforms.uResolution.value.set(h,g),n.seedMaterial.uniforms.uLifespan.value=p,n.quad.material=n.seedMaterial,n.buffers.forEach(e=>{c.setRenderTarget(e),c.render(n.scene,n.camera)}),c.setRenderTarget(null),n.seeded=!0),!j){let e=n.buffers[n.front],t=n.buffers[1-n.front];b.tMotion.value=e.textures[0],b.tLife.value=e.textures[1],n.quad.material=n.stepMaterial,c.setRenderTarget(t),c.render(n.scene,n.camera),c.setRenderTarget(null),n.front=1-n.front}let S=n.buffers[n.front],M=s.point.uniforms;M.tMotion.value=S.textures[0],M.tLife.value=S.textures[1],M.uImage.value=e.texture,M.uResolution.value.set(h,g),M.uImageAspect.value=e.aspect,M.uPointSize.value=a*x,M.uOpacity.value=o;let P=s.backdrop.uniforms;P.uImage.value=e.texture,P.uFrameAspect.value=h/g,P.uImageAspect.value=e.aspect,P.uOpacity.value=m}),(0,i.jsxs)(i.Fragment,{children:[d&&(0,i.jsx)("mesh",{frustumCulled:!1,renderOrder:-1,material:N,children:(0,i.jsx)("planeGeometry",{args:[2,2]})}),(0,i.jsx)("points",{geometry:z,material:D,frustumCulled:!1,renderOrder:1})]})}let C=({imageUrl:e=p,width:t="100%",height:a="100%",className:o,children:r,particleCount:l=5e5,particleSize:s=2,particleOpacity:d=.85,speed:m=1,noiseScale:v=5e-4,noiseStrength:h=.05,damping:g=.95,lifespan:x=200,showImage:y=!0,imageOpacity:b=1,backgroundColor:S="#ffffff",cursorInteraction:C=!0,cursorStrength:j=.1,cursorRadius:M=100,dpr:P=2,paused:I=!1})=>{let R=(0,n.useRef)(null),A=function(e){let[t,a]=(0,n.useState)(null);return(0,n.useEffect)(()=>{let t=!0,i=new c.Tap;return i.setCrossOrigin("anonymous"),i.load(e,e=>{if(!t)return void e.dispose();let i=e.image,n=i.naturalWidth??i.width??1,o=i.naturalHeight??i.height??1;e.flipY=!1,e.generateMipmaps=!1,e.minFilter=c.k6q,e.magFilter=c.k6q,e.wrapS=c.ghU,e.wrapT=c.ghU,e.needsUpdate=!0,a({texture:e,aspect:n/Math.max(o,1)})}),()=>{t=!1}},[e]),(0,n.useEffect)(()=>()=>t?.texture.dispose(),[t]),t}(e),L=function(e){let[t,a]=(0,n.useState)(!0);return(0,n.useEffect)(()=>{let t=e.current;if(!t)return;let i=new IntersectionObserver(([e])=>a(e.isIntersecting),{threshold:.01});return i.observe(t),()=>i.disconnect()},[e]),t}(R);return(0,i.jsxs)("div",{ref:R,className:(0,f.cn)("relative overflow-hidden",o),style:{width:t,height:a,backgroundColor:S},children:[(0,i.jsx)(u.Hl,{className:"absolute inset-0",dpr:[1,Math.min(Math.max(P,1),2)],frameloop:L?"always":"demand",gl:{antialias:!1,alpha:!0,depth:!1,powerPreference:"high-performance"},children:A&&(0,i.jsx)(w,{source:A,particleCount:l,particleSize:s,particleOpacity:d,speed:m,noiseScale:v,noiseStrength:h,damping:g,lifespan:x,showImage:y,imageOpacity:b,cursorInteraction:C,cursorStrength:j,cursorRadius:M,paused:I})}),r&&(0,i.jsx)("div",{className:"relative z-10",children:r})]})},j=()=>{let{resolvedTheme:e}=(0,o.D)(),[t,a]=(0,l.I)(),[s,u]=(0,n.useState)("https://images.unsplash.com/photo-1574359587026-daf1bfd26baa?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"),[c,f]=(0,n.useState)(5e5),[p,d]=(0,n.useState)(2),[m,v]=(0,n.useState)(.85),[h,g]=(0,n.useState)(1),[x,y]=(0,n.useState)(5e-4),[b,S]=(0,n.useState)(.05),[w,j]=(0,n.useState)(.95),[M,P]=(0,n.useState)(200),[I,R]=(0,n.useState)(!0),[A,L]=(0,n.useState)(1),[D,N]=(0,n.useState)("#ffffff"),[T,z]=(0,n.useState)(!0),[U,Y]=(0,n.useState)(.1),[E,k]=(0,n.useState)(100),[O,X]=(0,n.useState)(!1);return(0,i.jsxs)("div",{children:[(0,i.jsx)(r.Bg,{}),(0,i.jsxs)(r.VX,{children:[(0,i.jsxs)(r.Ec,{children:[(0,i.jsx)(r.Ch,{onRefresh:a,minHeight:560,children:(0,i.jsx)("div",{className:"relative h-full w-full",children:(0,i.jsx)(C,{className:"light"===e?"invert hue-rotate-180":void 0,imageUrl:s,particleCount:c,particleSize:p,particleOpacity:m,speed:h,noiseScale:x,noiseStrength:b,damping:w,lifespan:M,showImage:I,imageOpacity:A,backgroundColor:D,cursorInteraction:T,cursorStrength:U,cursorRadius:E,paused:O},t)})}),(0,i.jsxs)(r.IH,{children:[(0,i.jsx)(r.UD,{title:"Image URL",value:s,onChange:e=>{u(e),a()}}),(0,i.jsx)(r.yt,{title:"Particle Count",min:2e4,max:6e5,step:1e4,value:c,onChange:e=>{f(e),a()}}),(0,i.jsx)(r.yt,{title:"Particle Size",min:.5,max:6,step:.1,value:p,onChange:d}),(0,i.jsx)(r.yt,{title:"Particle Opacity",min:.1,max:1,step:.05,value:m,onChange:v}),(0,i.jsx)(r.yt,{title:"Speed",min:0,max:4,step:.1,value:h,onChange:g}),(0,i.jsx)(r.yt,{title:"Noise Scale",min:5e-4,max:.02,step:5e-4,value:x,onChange:y}),(0,i.jsx)(r.yt,{title:"Noise Strength",min:.01,max:.3,step:.01,value:b,onChange:S}),(0,i.jsx)(r.yt,{title:"Damping",min:.8,max:.999,step:.001,value:w,onChange:j}),(0,i.jsx)(r.yt,{title:"Lifespan",min:60,max:1200,step:20,value:M,onChange:P}),(0,i.jsx)(r.yt,{title:"Image Opacity",min:0,max:1,step:.05,value:A,onChange:L}),(0,i.jsx)(r.yt,{title:"Cursor Strength",min:0,max:.4,step:.01,value:U,onChange:Y}),(0,i.jsx)(r.yt,{title:"Cursor Radius",min:20,max:400,step:10,value:E,onChange:k}),(0,i.jsx)(r.W7,{title:"Background",value:D,onChange:N}),(0,i.jsx)(r.tl,{title:"Show Image",checked:I,onChange:R}),(0,i.jsx)(r.tl,{title:"Cursor Interaction",checked:T,onChange:z}),(0,i.jsx)(r.tl,{title:"Paused",checked:O,onChange:X})]}),(0,i.jsx)(r.Ub,{data:[{name:"imageUrl",type:"string",default:'"https://images.unsplash.com/..."',description:"Image sampled for particle color and drawn behind the field"},{name:"width",type:"string | number",default:'"100%"',description:"Container width"},{name:"height",type:"string | number",default:'"100%"',description:"Container height"},{name:"className",type:"string",default:"undefined",description:"Additional CSS classes"},{name:"children",type:"ReactNode",default:"undefined",description:"Content rendered above the effect"},{name:"particleCount",type:"number",default:"500000",description:"Number of live particles, rounded up to a square simulation grid"},{name:"particleSize",type:"number",default:"2",description:"Particle diameter in CSS pixels"},{name:"particleOpacity",type:"number",default:"0.85",description:"Peak particle opacity"},{name:"speed",type:"number",default:"1",description:"Rate the flow field evolves"},{name:"noiseScale",type:"number",default:"0.0005",description:"Flow field frequency: lower means longer, smoother currents"},{name:"noiseStrength",type:"number",default:"0.05",description:"Acceleration applied along the flow field each frame"},{name:"damping",type:"number",default:"0.95",description:"Velocity retained each frame, lower settles faster"},{name:"lifespan",type:"number",default:"200",description:"Frames a particle lives before it respawns"},{name:"showImage",type:"boolean",default:"true",description:"Draw the source image behind the particles"},{name:"imageOpacity",type:"number",default:"1",description:"Opacity of the image behind the particles"},{name:"backgroundColor",type:"string",default:'"#ffffff"',description:"Background fill color in hex"},{name:"cursorInteraction",type:"boolean",default:"true",description:"Let pointer movement drag particles along with it"},{name:"cursorStrength",type:"number",default:"0.1",description:"How much pointer momentum transfers to nearby particles"},{name:"cursorRadius",type:"number",default:"100",description:"Radius of the pointer influence in CSS pixels"},{name:"dpr",type:"number",default:"2",description:"Maximum device pixel ratio"},{name:"paused",type:"boolean",default:"false",description:"Freeze the simulation in place"}]})]}),(0,i.jsx)(r.lT,{children:(0,i.jsx)(r.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>i.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>f.CopyButton,IH:()=>o.Customize,gI:()=>m,Dn:()=>h,pi:()=>v,W7:()=>r.PreviewColor,Ch:()=>n.PreviewContainer,UD:()=>r.PreviewInput,bg:()=>r.PreviewSelect,yt:()=>r.PreviewSlider,tl:()=>r.PreviewSwitch,Ec:()=>i.PreviewTab,Ub:()=>l.PropTable,VX:()=>i.TabsLayout,bs:()=>d});var i=a(55019);a(27382);var n=a(10236),o=a(69485),r=a(48543),l=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var c=a(95155);a(66729);var f=a(28592),p=a(90650);let d="rounded-lg border bg-background";function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,p.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function v({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,p.cn)(d,e),...a,children:t})}function h({title:e,description:t,className:a,children:i}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:i})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>n});var i=a(12115);function n(){let[e,t]=(0,i.useState)(0),a=(0,i.useCallback)(()=>{t(e=>e+1)},[]);return(0,i.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);