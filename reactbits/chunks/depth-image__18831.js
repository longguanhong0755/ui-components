"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[18831],{18831:(e,t,a)=>{a.r(t),a.d(t,{default:()=>I});var r=a(95155),o=a(12115),l=a(56388),n=a(90761),i=a(81712),u=a(3907),s=a(50969),f=a(2253),h=a(90650);let c=(e,t,a)=>Math.min(a,Math.max(t,e)),d=(e,t)=>{let a=new f.Q1f;try{a.setStyle(e,f.Zr2)}catch{a.setStyle(t,f.Zr2)}return a},m=(e,t)=>{try{e.setStyle(t,f.Zr2)}catch{}},p=e=>{let t=window.matchMedia("(min-resolution: 2dppx)");return t.addEventListener("change",e),window.addEventListener("resize",e),()=>{t.removeEventListener("change",e),window.removeEventListener("resize",e)}},v=()=>window.devicePixelRatio||1,g=`
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,x=`
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;
uniform sampler2D uDepthMap;
uniform float uHasDepthMap;
uniform float uFromLight;
uniform float uContrast;
uniform float uInvert;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

void main() {
  float depth;
  if (uHasDepthMap > 0.5) {
    depth = texture(uDepthMap, vUv).r;
  } else {



    float near = luma(textureLod(uImage, vUv, 2.0).rgb);
    float wide = luma(textureLod(uImage, vUv, 4.0).rgb);
    float bright = mix(near, wide, 0.5);
    float floorward = 1.0 - vUv.y;
    depth = mix(floorward, bright, uFromLight);
  }
  depth = clamp((depth - 0.5) * uContrast + 0.5, 0.0, 1.0);
  depth = mix(depth, 1.0 - depth, uInvert);
  fragColor = vec4(depth, depth, depth, 1.0);
}
`,b=`
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uSource;
uniform vec2 uDirection;
uniform float uRadius;

const int TAPS = 16;

void main() {
  if (uRadius < 0.5) {
    fragColor = texture(uSource, vUv);
    return;
  }
  float sigma = uRadius * 0.5;
  float stride = uRadius / float(TAPS);
  float total = 1.0;
  float sum = texture(uSource, vUv).r;
  for (int i = 1; i <= TAPS; i++) {
    float offset = float(i) * stride;
    float weight = exp(-(offset * offset) / (2.0 * sigma * sigma));
    vec2 shift = uDirection * offset;
    sum += texture(uSource, vUv + shift).r * weight;
    sum += texture(uSource, vUv - shift).r * weight;
    total += weight * 2.0;
  }
  float depth = sum / total;
  fragColor = vec4(depth, depth, depth, 1.0);
}
`,w=`
precision highp float;
in vec2 vUv;
out vec4 fragColor;

uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform vec2 uImageSize;
uniform vec2 uDepthSize;
uniform float uReady;
uniform vec3 uFallback;
uniform vec3 uBackground;
uniform vec2 uResolution;
uniform float uContain;

uniform vec3 uLight;
uniform vec3 uLightColor;
uniform float uIntensity;
uniform float uFalloff;
uniform float uAmbient;
uniform vec3 uAmbientColor;
uniform float uColorPreserve;

uniform float uDisplacement;
uniform float uNormalStrength;
uniform float uDetail;
uniform float uShadowIntensity;
uniform float uShadowSoftness;
uniform float uView;

const int SHADOW_STEPS = 12;
const float MIN_LIGHT_ANGLE = 0.15;
const float SOFTNESS_GROWTH = 3.0;
const float DETAIL_LOD = 3.0;
const float DETAIL_TEXELS = 8.0;
const float GRADIENT_TEXELS = 3.0;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }


vec2 fitScale() {
  float plane = uResolution.x / uResolution.y;
  float photo = uImageSize.x / uImageSize.y;
  vec2 s = vec2(1.0);
  bool wider = photo > plane;
  if (uContain > 0.5) wider = !wider;
  if (wider) s.x = plane / photo; else s.y = photo / plane;
  return s;
}

vec2 depthGradient(vec2 uv, vec2 step) {
  float l = texture(uDepth, uv - vec2(step.x, 0.0)).r;
  float r = texture(uDepth, uv + vec2(step.x, 0.0)).r;
  float b = texture(uDepth, uv - vec2(0.0, step.y)).r;
  float t = texture(uDepth, uv + vec2(0.0, step.y)).r;
  return vec2(r - l, t - b) * 0.5;
}

vec2 detailGradient(vec2 uv, vec2 step) {
  float l = luma(textureLod(uImage, uv - vec2(step.x, 0.0), DETAIL_LOD).rgb);
  float r = luma(textureLod(uImage, uv + vec2(step.x, 0.0), DETAIL_LOD).rgb);
  float b = luma(textureLod(uImage, uv - vec2(0.0, step.y), DETAIL_LOD).rgb);
  float t = luma(textureLod(uImage, uv + vec2(0.0, step.y), DETAIL_LOD).rgb);
  return vec2(r - l, t - b) * 0.5;
}

void main() {
  if (uReady < 0.5) {
    fragColor = vec4(uFallback, 1.0);
    return;
  }

  float aspect = uResolution.x / uResolution.y;
  vec2 scale = fitScale();
  vec2 uv = (vUv - 0.5) * scale + 0.5;

  if (uContain > 0.5 && (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)) {
    fragColor = vec4(uFallback, 1.0);
    return;
  }



  vec2 worldPerUv = vec2(2.0 * aspect, 2.0) / scale;

  vec3 albedo = texture(uImage, uv).rgb;
  float depth = texture(uDepth, uv).r;

  vec2 step = vec2(GRADIENT_TEXELS) / uDepthSize;
  vec2 slope = depthGradient(uv, step) / (step * worldPerUv)
    * uDisplacement * uNormalStrength;
  vec2 fine = detailGradient(uv, vec2(DETAIL_TEXELS) / uImageSize) * uDetail * 4.0;
  vec3 normal = normalize(vec3(-slope.x - fine.x, -slope.y - fine.y, 1.0));

  vec3 surface = vec3((vUv - 0.5) * vec2(2.0 * aspect, 2.0), (depth - 1.0) * uDisplacement);
  vec3 toLight = uLight - surface;
  float dist = max(length(toLight), 0.001);
  vec3 dir = toLight / dist;


  float occlusion = 0.0;
  if (uShadowIntensity > 0.0 && dir.z > 0.0) {
    float remaining = 1.0 - depth;
    vec2 rayUv = dir.xy / max(dir.z, MIN_LIGHT_ANGLE) * uDisplacement * remaining / worldPerUv;
    for (int i = 0; i < SHADOW_STEPS; i++) {
      float progress = (float(i) + 1.0) / float(SHADOW_STEPS);
      float rayDepth = depth + remaining * progress;
      float blocker = texture(uDepth, uv + rayUv * progress).r;
      float softness = uShadowSoftness * (progress * SOFTNESS_GROWTH + 1.0);
      occlusion = max(occlusion, clamp((blocker - rayDepth) / softness, 0.0, 1.0));
    }
  }
  float shadow = 1.0 - occlusion * uShadowIntensity;

  float lambert = max(dot(normal, dir), 0.0);
  float attenuation = uIntensity / pow(dist, uFalloff);
  vec3 lit = uLightColor * lambert * attenuation * shadow;
  vec3 fill = uAmbientColor * uAmbient;
  vec3 exposure = fill + lit;


  exposure = mix(exposure, max(exposure, vec3(luma(albedo) * 0.35)), uColorPreserve);

  vec3 color = 1.0 - exp(-albedo * exposure * 1.1);

  color = uBackground + color * (1.0 - uBackground);

  if (uView > 1.5) {
    color = normal * 0.5 + 0.5;
  } else if (uView > 0.5) {
    color = vec3(depth);
  }

  fragColor = vec4(color, 1.0);
}
`,S=(e,t,a)=>{let r=new Image;r.crossOrigin="anonymous",r.decoding="async";let o=!1;return r.onload=()=>{if(o)return;let e=new f.gPd(r);e.colorSpace=f.jf0,e.wrapS=f.ghU,e.wrapT=f.ghU,e.minFilter=f.$_I,e.magFilter=f.k6q,e.generateMipmaps=!0,e.anisotropy=t,e.needsUpdate=!0,a({texture:e,width:r.naturalWidth,height:r.naturalHeight})},r.onerror=()=>{o||a(null)},r.src=e,()=>{o=!0}},y=({image:e,depthMap:t,fit:a,depthFromLight:l,depthSmoothing:n,depthContrast:u,invertDepth:s,displacement:h,normalStrength:p,detail:v,shadowIntensity:y,shadowSoftness:C,lightColor:D,lightIntensity:I,falloff:L,elevation:j,ambient:M,ambientColor:E,colorPreserve:R,follow:T,autoOrbit:k,orbitRadius:P,orbitDuration:F,view:U,backgroundColor:A,fallbackColor:N,paused:H,pointer:_})=>{let O=(0,o.useRef)(null),{gl:z,size:W,invalidate:B}=(0,i.C)(),G=(0,o.useRef)(new f.I9Y(.4,.3)),V=(0,o.useRef)(new f.I9Y),q=(0,o.useRef)(0),X=(0,o.useRef)(!0),Y=(0,o.useRef)(null),Z=()=>{let e,t,a,r,o,l,n;return Y.current||(e=new f.Z58,t=new f.qUd(-1,1,1,-1,0,1),a=new f.BKk({glslVersion:f.Wdf,vertexShader:g,fragmentShader:x,uniforms:{uImage:{value:null},uDepthMap:{value:null},uHasDepthMap:{value:0},uFromLight:{value:.5},uContrast:{value:1},uInvert:{value:0}},depthTest:!1,depthWrite:!1}),r=new f.BKk({glslVersion:f.Wdf,vertexShader:g,fragmentShader:b,uniforms:{uSource:{value:null},uDirection:{value:new f.I9Y(1,0)},uRadius:{value:0}},depthTest:!1,depthWrite:!1}),o=new f.bdM(2,2),l=new f.eaF(o,a),e.add(l),Y.current={scene:e,camera:t,quad:l,material:a,blur:r,geometry:o,target:(n=()=>{let e=new f.nWS(512,512,{type:f.ix0,minFilter:f.k6q,magFilter:f.k6q,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1});return e.texture.wrapS=f.ghU,e.texture.wrapT=f.ghU,e})(),scratch:n(),radius:0}),Y.current};(0,o.useEffect)(()=>()=>{let e=Y.current;Y.current=null,e&&(e.target.dispose(),e.scratch.dispose(),e.material.dispose(),e.blur.dispose(),e.geometry.dispose())},[]);let K=(0,o.useMemo)(()=>({uImage:{value:null},uDepth:{value:null},uImageSize:{value:new f.I9Y(1,1)},uDepthSize:{value:new f.I9Y(512,512)},uReady:{value:0},uFallback:{value:d("#171717","#171717")},uBackground:{value:d("#000000","#000000")},uResolution:{value:new f.I9Y(1,1)},uContain:{value:0},uLight:{value:new f.Pq0(.4,.3,1)},uLightColor:{value:d("#ffffff","#ffffff")},uIntensity:{value:2},uFalloff:{value:1},uAmbient:{value:.2},uAmbientColor:{value:d("#ffffff","#ffffff")},uColorPreserve:{value:.3},uDisplacement:{value:1.5},uNormalStrength:{value:1.5},uDetail:{value:.8},uShadowIntensity:{value:.7},uShadowSoftness:{value:.1},uView:{value:0}}),[]);return(0,o.useEffect)(()=>{let t=O.current;if(!t)return;let a=Z();t.uniforms.uDepth.value=a.target.texture;let r=z.capabilities.getMaxAnisotropy(),o=null,l=S(e,r,e=>{let r=t.uniforms;if(!e){r.uReady.value=0,a.material.uniforms.uImage.value=null,B();return}o=e.texture,r.uImage.value=e.texture,r.uImageSize.value.set(e.width,e.height),r.uReady.value=1,a.material.uniforms.uImage.value=e.texture;let l=Math.max(1,Math.round(512*e.height/e.width));a.target.setSize(512,l),a.scratch.setSize(512,l),r.uDepthSize.value.set(512,l),X.current=!0,B()});return()=>{l(),o?.dispose()}},[e,z,B]),(0,o.useEffect)(()=>{let e=Z().material.uniforms;if(!t){e.uHasDepthMap.value=0,e.uDepthMap.value=null,X.current=!0,B();return}let a=null,r=S(t,1,t=>{if(!t){e.uHasDepthMap.value=0,X.current=!0,B();return}a=t.texture,e.uDepthMap.value=t.texture,e.uHasDepthMap.value=1,X.current=!0,B()});return()=>{r(),a?.dispose(),e.uHasDepthMap.value=0,e.uDepthMap.value=null}},[t,B]),(0,o.useEffect)(()=>{let e=Z(),t=e.material.uniforms;t.uFromLight.value=c(l,0,1),e.radius=5*Math.max(0,n),t.uContrast.value=Math.max(0,u),t.uInvert.value=+!!s,X.current=!0,B()},[l,n,u,s,B]),(0,o.useEffect)(()=>{let e=O.current;if(!e)return;let t=e.uniforms;m(t.uFallback.value,N),m(t.uBackground.value,A),m(t.uLightColor.value,D),m(t.uAmbientColor.value,E),t.uContain.value=+("contain"===a),t.uIntensity.value=Math.max(0,I),t.uFalloff.value=Math.max(0,L),t.uAmbient.value=Math.max(0,M),t.uColorPreserve.value=c(R,0,1),t.uDisplacement.value=Math.max(0,h),t.uNormalStrength.value=Math.max(0,p),t.uDetail.value=Math.max(0,v),t.uShadowIntensity.value=c(y,0,1),t.uShadowSoftness.value=Math.max(.002,C),t.uView.value="normal"===U?2:+("depth"===U),B()},[N,A,D,E,a,I,L,M,R,h,p,v,y,C,U,B]),(0,i.D)((e,t)=>{let a=O.current;if(!a)return;let r=a.uniforms;r.uResolution.value.set(W.width,W.height),X.current&&r.uReady.value>.5&&(X.current=!1,((e,t)=>{let a=e.getRenderTarget(),{width:r,height:o}=t.target,l=(a,r)=>{t.quad.material=a,e.setRenderTarget(r),e.render(t.scene,t.camera)};if(l(t.material,t.target),t.radius>=.5){let e=t.blur.uniforms;e.uRadius.value=t.radius,e.uSource.value=t.target.texture,e.uDirection.value.set(1/r,0),l(t.blur,t.scratch),e.uSource.value=t.scratch.texture,e.uDirection.value.set(0,1/o),l(t.blur,t.target),e.uSource.value=null}e.setRenderTarget(a)})(z,Z()));let o=W.width/Math.max(W.height,1),l=_.current;if(l.inside)V.current.set(l.x*o,l.y);else if(k&&!H){q.current+=t/Math.max(F,.1);let e=q.current*Math.PI*2;V.current.set(Math.cos(e)*P*o,Math.sin(e)*P)}else V.current.copy(G.current);let n=Math.min(t,.05),i=T>=1?1:1-Math.pow(1-c(T,0,1),60*n);G.current.lerp(V.current,i),r.uLight.value.set(G.current.x,G.current.y,j)}),(0,r.jsxs)("mesh",{frustumCulled:!1,children:[(0,r.jsx)("planeGeometry",{args:[2,2]}),(0,r.jsx)("shaderMaterial",{ref:O,glslVersion:f.Wdf,vertexShader:g,fragmentShader:w,uniforms:K,depthTest:!1,depthWrite:!1})]})},C=({image:e,depthMap:t,fit:a="cover",depthFromLight:l=.5,depthSmoothing:n=7,depthContrast:i=1.2,invertDepth:f=!1,displacement:d=1.5,normalStrength:m=1.5,detail:g=.8,shadowIntensity:x=.7,shadowSoftness:b=.1,lightColor:w="#ffffff",lightIntensity:S=6,falloff:C=2.5,elevation:D=1.2,ambient:I=.02,ambientColor:L="#ffffff",colorPreserve:j=0,follow:M=.12,autoOrbit:E=!0,orbitRadius:R=.6,orbitDuration:T=10,view:k="lit",backgroundColor:P="#000000",fallbackColor:F="#171717",paused:U=!1,dpr:A=1.5,className:N,children:H})=>{let _=(0,o.useRef)(null),O=(0,o.useRef)({x:0,y:0,inside:!1}),[z,W]=(0,o.useState)(!0),B=(0,s.I)(),G=Math.min((0,o.useSyncExternalStore)(p,v,()=>1),Math.max(A,.5));(0,o.useEffect)(()=>{let e=_.current;if(!e||"undefined"==typeof IntersectionObserver)return;let t=new IntersectionObserver(([e])=>W(e.isIntersecting),{threshold:0});return t.observe(e),()=>t.disconnect()},[]);let V=e=>{let t=e.currentTarget.getBoundingClientRect();O.current.x=c((e.clientX-t.left)/t.width*2-1,-1,1),O.current.y=c(1-(e.clientY-t.top)/t.height*2,-1,1),O.current.inside=!0},q=U||!!B;return(0,r.jsxs)("div",{ref:_,className:(0,h.cn)("relative touch-none overflow-hidden",N),onPointerMove:V,onPointerDown:V,onPointerLeave:()=>{O.current.inside=!1},children:[(0,r.jsx)("div",{className:"absolute inset-0",children:(0,r.jsx)(u.Hl,{orthographic:!0,dpr:G,frameloop:z?"always":"demand",gl:{antialias:!1,alpha:!1,powerPreference:"high-performance"},children:(0,r.jsx)(y,{image:e,depthMap:t,fit:a,depthFromLight:l,depthSmoothing:n,depthContrast:i,invertDepth:f,displacement:d,normalStrength:m,detail:g,shadowIntensity:x,shadowSoftness:b,lightColor:w,lightIntensity:S,falloff:C,elevation:D,ambient:I,ambientColor:L,colorPreserve:j,follow:B?1:M,autoOrbit:E&&!q,orbitRadius:R,orbitDuration:T,view:k,backgroundColor:P,fallbackColor:F,paused:q,pointer:O})})}),H?(0,r.jsx)("div",{className:"pointer-events-none relative z-10 h-full w-full",children:H}):null]})},D="https://images.unsplash.com/photo-1574359587026-daf1bfd26baa?q=80&w=1740&auto=format&fit=crop",I=()=>{let[e,t]=(0,n.I)(),[a,i]=(0,o.useState)("#0a0a0a"),[u,s]=(0,o.useState)(D),[f,h]=(0,o.useState)("cover"),[c,d]=(0,o.useState)("lit"),[m,p]=(0,o.useState)(.5),[v,g]=(0,o.useState)(7),[x,b]=(0,o.useState)(1.2),[w,S]=(0,o.useState)(!1),[y,I]=(0,o.useState)(1.5),[L,j]=(0,o.useState)(1.5),[M,E]=(0,o.useState)(.8),[R,T]=(0,o.useState)(.7),[k,P]=(0,o.useState)(.1),[F,U]=(0,o.useState)("#ffffff"),[A,N]=(0,o.useState)(6),[H,_]=(0,o.useState)(2.5),[O,z]=(0,o.useState)(1.2),[W,B]=(0,o.useState)(.02),[G,V]=(0,o.useState)("#ffffff"),[q,X]=(0,o.useState)(0),[Y,Z]=(0,o.useState)(.12),[K,Q]=(0,o.useState)(!0),[$,J]=(0,o.useState)(.6),[ee,et]=(0,o.useState)(10);return(0,r.jsxs)("div",{children:[(0,r.jsx)(l.Bg,{}),(0,r.jsxs)(l.VX,{children:[(0,r.jsxs)(l.Ec,{children:[(0,r.jsx)(l.Ch,{onRefresh:t,minHeight:560,children:(0,r.jsx)("div",{className:"relative h-full w-full",children:(0,r.jsx)(C,{className:"h-full w-full",image:u.trim()||D,fit:f,view:c,backgroundColor:a,fallbackColor:a,depthFromLight:m,depthSmoothing:v,depthContrast:x,invertDepth:w,displacement:y,normalStrength:L,detail:M,shadowIntensity:R,shadowSoftness:k,lightColor:F,lightIntensity:A,falloff:H,elevation:O,ambient:W,ambientColor:G,colorPreserve:q,follow:Y,autoOrbit:K,orbitRadius:$,orbitDuration:ee},e)})}),(0,r.jsxs)(l.IH,{children:[(0,r.jsx)(l.UD,{title:"Image URL",value:u,placeholder:"https://",onChange:s}),(0,r.jsx)(l.bg,{title:"Fit",value:f,onChange:e=>h(e),options:[{label:"Cover",value:"cover"},{label:"Contain",value:"contain"}]}),(0,r.jsx)(l.bg,{title:"View",value:c,onChange:e=>d(e),options:[{label:"Lit",value:"lit"},{label:"Depth",value:"depth"},{label:"Normals",value:"normal"}]}),(0,r.jsx)(l.yt,{title:"Depth From Light",min:0,max:1,step:.05,value:m,onChange:p}),(0,r.jsx)(l.yt,{title:"Depth Smoothing",min:0,max:7,step:.5,value:v,onChange:g}),(0,r.jsx)(l.yt,{title:"Depth Contrast",min:.2,max:3,step:.1,value:x,onChange:b}),(0,r.jsx)(l.tl,{title:"Invert Depth",checked:w,onChange:S}),(0,r.jsx)(l.yt,{title:"Displacement",min:0,max:4,step:.05,value:y,onChange:I}),(0,r.jsx)(l.yt,{title:"Normal Strength",min:0,max:3,step:.05,value:L,onChange:j}),(0,r.jsx)(l.yt,{title:"Detail",min:0,max:4,step:.05,value:M,onChange:E}),(0,r.jsx)(l.yt,{title:"Shadow Intensity",min:0,max:1,step:.01,value:R,onChange:T}),(0,r.jsx)(l.yt,{title:"Shadow Softness",min:.002,max:.3,step:.002,value:k,onChange:P}),(0,r.jsx)(l.W7,{title:"Light Color",value:F,onChange:U}),(0,r.jsx)(l.yt,{title:"Light Intensity",min:0,max:12,step:.1,value:A,onChange:N}),(0,r.jsx)(l.yt,{title:"Falloff",min:0,max:4,step:.05,value:H,onChange:_}),(0,r.jsx)(l.yt,{title:"Elevation",min:.1,max:4,step:.05,value:O,onChange:z}),(0,r.jsx)(l.yt,{title:"Ambient",min:0,max:2,step:.01,value:W,onChange:B}),(0,r.jsx)(l.W7,{title:"Ambient Color",value:G,onChange:V}),(0,r.jsx)(l.W7,{title:"Background",value:a,onChange:i}),(0,r.jsx)(l.yt,{title:"Color Preserve",min:0,max:1,step:.05,value:q,onChange:X}),(0,r.jsx)(l.yt,{title:"Follow",min:.01,max:1,step:.01,value:Y,onChange:Z}),(0,r.jsx)(l.tl,{title:"Auto Orbit",checked:K,onChange:Q}),(0,r.jsx)(l.yt,{title:"Orbit Radius",min:0,max:1,step:.05,value:$,onChange:J}),(0,r.jsx)(l.yt,{title:"Orbit Duration",min:2,max:30,step:.5,value:ee,onChange:et,valueUnit:"s"})]}),(0,r.jsx)(l.Ub,{data:[{name:"image",type:"string",default:"—",description:"Photo to relight."},{name:"depthMap",type:"string",default:"—",description:"Optional real depth map, white near and black far. When omitted one is estimated from the photo."},{name:"fit",type:'"cover" | "contain"',default:'"cover"',description:"How the photo fills the container."},{name:"depthFromLight",type:"number",default:"0.5",description:"Estimated depth: 0 reads depth from vertical position only, 1 from brightness only."},{name:"depthSmoothing",type:"number",default:"7",description:"Blur applied to the height field, in steps of five texels of a 512 wide map. Applies to supplied depth maps too."},{name:"depthContrast",type:"number",default:"1.2",description:"Estimated depth: contrast applied to the estimate."},{name:"invertDepth",type:"boolean",default:"false",description:"Flip near and far."},{name:"displacement",type:"number",default:"1.5",description:"Height of the relief in scene units; the plane is 2 tall."},{name:"normalStrength",type:"number",default:"1.5",description:"Strength of the large scale surface tilt from depth."},{name:"detail",type:"number",default:"0.8",description:"Strength of fine surface detail read from the photo."},{name:"shadowIntensity",type:"number",default:"0.7",description:"Darkness of self cast shadows, 0 disables them."},{name:"shadowSoftness",type:"number",default:"0.1",description:"Penumbra width of the shadows."},{name:"lightColor",type:"string",default:'"#ffffff"',description:"Light colour."},{name:"lightIntensity",type:"number",default:"6",description:"Light brightness."},{name:"falloff",type:"number",default:"2.5",description:"How quickly the light fades with distance, 0 is even, 4 is a tight pool."},{name:"elevation",type:"number",default:"1.2",description:"Height of the light above the surface."},{name:"ambient",type:"number",default:"0.02",description:"Flat fill light applied everywhere."},{name:"ambientColor",type:"string",default:'"#ffffff"',description:"Colour of the fill light."},{name:"colorPreserve",type:"number",default:"0",description:"How much of the photo's own tone survives in unlit areas, 0 to 1."},{name:"follow",type:"number",default:"0.12",description:"How quickly the light follows the pointer, 0 to 1."},{name:"autoOrbit",type:"boolean",default:"true",description:"Move the light on a slow circle when the pointer is away."},{name:"orbitRadius",type:"number",default:"0.6",description:"Radius of the idle orbit, 0 to 1."},{name:"orbitDuration",type:"number",default:"10",description:"Seconds per idle orbit."},{name:"view",type:'"lit" | "depth" | "normal"',default:'"lit"',description:"Debug view of the estimated depth or the normals."},{name:"backgroundColor",type:"string",default:'"#000000"',description:"Floor colour of the unlit surface, so shadows settle on the page colour rather than pure black."},{name:"fallbackColor",type:"string",default:'"#171717"',description:"Colour shown while the photo loads or if it fails."},{name:"paused",type:"boolean",default:"false",description:"Freeze the light."},{name:"dpr",type:"number",default:"1.5",description:"Render scale cap."},{name:"className",type:"string",default:"—",description:"Extra classes for the container."},{name:"children",type:"ReactNode",default:"—",description:"Content layered above the canvas."}]})]}),(0,r.jsx)(l.lT,{children:(0,r.jsx)(l.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>u.CodeExample,lT:()=>r.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>h.CopyButton,IH:()=>l.Customize,gI:()=>m,Dn:()=>v,pi:()=>p,W7:()=>n.PreviewColor,Ch:()=>o.PreviewContainer,UD:()=>n.PreviewInput,bg:()=>n.PreviewSelect,yt:()=>n.PreviewSlider,tl:()=>n.PreviewSwitch,Ec:()=>r.PreviewTab,Ub:()=>i.PropTable,VX:()=>r.TabsLayout,bs:()=>d});var r=a(55019);a(27382);var o=a(10236),l=a(69485),n=a(48543),i=a(87552);a(39260);var u=a(52407),s=a(79901);a(24496);var f=a(95155);a(66729);var h=a(28592),c=a(90650);let d="rounded-lg border bg-background";function m({className:e,children:t,...a}){return(0,f.jsx)("div",{className:(0,c.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function p({className:e,children:t,...a}){return(0,f.jsx)("div",{className:(0,c.cn)(d,e),...a,children:t})}function v({title:e,description:t,className:a,children:r}){return(0,f.jsxs)("section",{className:a,children:[(0,f.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,f.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,f.jsx)("div",{className:"mt-6",children:r})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>o});var r=a(12115);function o(){let[e,t]=(0,r.useState)(0),a=(0,r.useCallback)(()=>{t(e=>e+1)},[]);return(0,r.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);