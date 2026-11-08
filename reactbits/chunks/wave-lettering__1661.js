"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[1661],{1661:(e,t,a)=>{a.r(t),a.d(t,{default:()=>j});var n=a(95155),l=a(12115),r=a(56388),o=a(86049),i=a(90761),s=a(2253),u=a(12246),c=a(90650);let h=1/240,d=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},p=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,f=(e,t,a)=>Math.min(a,Math.max(t,e)),m=null,v=(e,t)=>{if(m||(m=document.createElement("canvas").getContext("2d")),!m)return t;m.fillStyle="#010203",m.fillStyle=e;let a=String(m.fillStyle);if("#010203"===a&&"#010203"!==e.trim().toLowerCase())return t;if(a.startsWith("#")){let e=a.slice(1);return[parseInt(e.slice(0,2),16)/255,parseInt(e.slice(2,4),16)/255,parseInt(e.slice(4,6),16)/255]}let n=a.match(/[\d.]+/g);return!n||n.length<3?t:[Number(n[0])/255,Number(n[1])/255,Number(n[2])/255]},g=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),w=([e,t,a])=>{let n=g(e),l=g(t),r=g(a),o=Math.cbrt(.4122214708*n+.5363325363*l+.0514459929*r),i=Math.cbrt(.2119034982*n+.6806995451*l+.1073969566*r),s=Math.cbrt(.0883024619*n+.2817188376*l+.6299787005*r);return[.2104542553*o+.793617785*i-.0040720468*s,1.9779984951*o-2.428592205*i+.4505937099*s,.0259040371*o+.7827717662*i-.808675766*s]},x=`
uniform float uTime;
uniform float uAmp;
uniform float uK;
uniform float uSharp;
uniform vec2 uDir;
uniform float uEnvelope;
uniform float uHalf;
uniform sampler2D uStrings;
uniform float uRowZ[64];
uniform float uRowHalf[64];

float crest(float p) {
  float s = 0.5 + 0.5 * sin(p);
  return pow(s, uSharp) * 2.0 - 1.0;
}

float swellAt(vec2 q) {
  vec2 d2 = vec2(uDir.x * 0.8 - uDir.y * 0.6, uDir.x * 0.6 + uDir.y * 0.8);
  vec2 d3 = vec2(uDir.x * 0.9 + uDir.y * 0.44, -uDir.x * 0.44 + uDir.y * 0.9);
  vec2 d4 = vec2(uDir.y, -uDir.x);
  float w = sqrt(uK * 9.8) * 0.42;
  float t = uTime;
  float h = crest(dot(q, uDir) * uK - t * w) * 0.56;
  h += crest(dot(q, d2) * uK * 1.71 + 1.3 - t * w * 1.31) * 0.27;
  h += sin(dot(q, d3) * uK * 2.93 + 2.1 - t * w * 1.71) * 0.13;
  float group = 0.7 + 0.3 * sin(dot(q, d4) * uK * 0.37 + t * 0.21) * sin(dot(q, uDir) * uK * 0.19 - t * 0.13 + 1.7);
  float env = mix(1.0, 0.16 + 1.3 * exp(-pow(q.x / (uHalf * 0.6), 2.0)), uEnvelope);
  return uAmp * h * group * env;
}

float stringAt(float x, int row) {
  float u = clamp((x / uRowHalf[row] * 0.5 + 0.5) * 159.0, 0.0, 159.0);
  float i = floor(u);
  float a = texelFetch(uStrings, ivec2(int(i), row), 0).r;
  float b = texelFetch(uStrings, ivec2(int(min(i + 1.0, 159.0)), row), 0).r;
  return mix(a, b, u - i);
}

float lineAt(float x, float z, int row) {
  return swellAt(vec2(x, z)) + stringAt(x, row);
}
`,y=`
precision highp float;
${x}
in float aRow;
in float aX;
in float aBottom;

void main() {
  int row = int(aRow);
  float z = uRowZ[row];
  float h = lineAt(aX, z, row);
  vec3 p = vec3(aX, aBottom > 0.5 ? h - 60.0 : h, z);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`,b=`
precision highp float;
uniform vec3 uBackground;
out vec4 fragColor;

void main() {
  fragColor = vec4(uBackground, 1.0);
}
`,F=`
precision highp float;
${x}
in float aRow;
in float aX;
in vec4 aRect;
in float aWidth;
uniform float uRowLength[64];
uniform float uRowShift[64];
uniform float uRowCount;
uniform float uGlyph;
uniform float uLean;
uniform float uGap;
uniform float uFocus;
uniform float uDof;
uniform float uRange;
uniform float uPad;
out vec2 vUv;
out float vLift;
out float vNear;
out float vRing;
out float vBlur;

void main() {
  int row = int(aRow);
  float z = uRowZ[row];
  float span = uRowLength[row];
  float x = mod(aX + uRowShift[row] + span * 0.5, span) - span * 0.5;
  float swell = swellAt(vec2(x, z));
  float ring = stringAt(x, row);
  float h = swell + ring;
  float e = uGlyph * 0.45;
  float slope = (lineAt(x + e, z, row) - lineAt(x - e, z, row)) / (2.0 * e);
  vec4 view = modelViewMatrix * vec4(x, h, z, 1.0);
  vec2 corner = position.xy;
  vec2 local = vec2(corner.x * aWidth, mix(-0.32 - uPad, 0.98 + uPad, corner.y + 0.5) * uGlyph);
  float angle = atan(slope) * uLean;
  float c = cos(angle);
  float s = sin(angle);
  view.xy += vec2(c * local.x - s * local.y, s * local.x + c * local.y);
  view.z += uGlyph * 0.02;
  gl_Position = projectionMatrix * view;
  vUv = vec2(aRect.x + (corner.x + 0.5) * aRect.z, aRect.y + (0.5 - corner.y) * aRect.w);
  vLift = clamp(swell / max(uAmp, 1e-4) * 0.5 + 0.5, 0.0, 1.0);
  vNear = 1.0 - aRow / max(uRowCount - 1.0, 1.0);
  vRing = clamp(abs(ring) / max(uGap, 1e-4), 0.0, 1.0);
  float off = abs((1.0 - vNear) - uFocus);
  vBlur = uDof * smoothstep(uRange * 0.5, uRange * 0.5 + 0.42, off);
}
`,S=`
precision highp float;
uniform sampler2D uAtlas;
uniform vec3 uLabHigh;
uniform vec3 uLabLow;
uniform float uInk;
uniform float uFog;
uniform vec2 uAtlasSize;
in vec2 vUv;
in float vLift;
in float vNear;
in float vRing;
in float vBlur;
out vec4 fragColor;

vec3 labToLinear(vec3 lab) {
  float l = lab.x + 0.3963377774 * lab.y + 0.2158037573 * lab.z;
  float m = lab.x - 0.1055613458 * lab.y - 0.0638541728 * lab.z;
  float s = lab.x - 0.0894841775 * lab.y - 1.2914855480 * lab.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return max(vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  ), 0.0);
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void main() {
  float radius = vBlur * 26.0;
  float coverage;
  if (radius < 0.6) {
    coverage = texture(uAtlas, vUv).r;
  } else {
    float lod = log2(max(radius * 0.55, 1.0));
    vec2 step_ = radius * 0.62 / uAtlasSize;
    coverage = textureLod(uAtlas, vUv, lod).r * 0.28;
    coverage += textureLod(uAtlas, vUv + vec2(step_.x, 0.0), lod).r * 0.12;
    coverage += textureLod(uAtlas, vUv - vec2(step_.x, 0.0), lod).r * 0.12;
    coverage += textureLod(uAtlas, vUv + vec2(0.0, step_.y), lod).r * 0.12;
    coverage += textureLod(uAtlas, vUv - vec2(0.0, step_.y), lod).r * 0.12;
    coverage += textureLod(uAtlas, vUv + step_ * 0.7071, lod).r * 0.06;
    coverage += textureLod(uAtlas, vUv - step_ * 0.7071, lod).r * 0.06;
    coverage += textureLod(uAtlas, vUv + vec2(step_.x, -step_.y) * 0.7071, lod).r * 0.06;
    coverage += textureLod(uAtlas, vUv + vec2(-step_.x, step_.y) * 0.7071, lod).r * 0.06;
    coverage *= 1.0 + vBlur * 0.35;
  }
  if (coverage < 0.004) discard;
  float ring = smoothstep(0.02, 0.6, vRing);
  float t = clamp(0.2 + 0.5 * smoothstep(0.25, 0.95, vLift) + 0.42 * vNear * vNear, 0.0, 1.0);
  t = max(t, 0.55 + 0.45 * ring);
  vec3 lab = mix(uLabLow, uLabHigh, t);
  if (uInk < 0.5) lab = mix(lab, vec3(min(uLabHigh.x * 1.04 + 0.04, 0.99), uLabHigh.yz * 0.25), smoothstep(0.84, 1.0, t) * 0.55);
  vec3 color = encode(labToLinear(lab));
  float fog = exp(-(1.0 - vNear) * uFog * 2.4);
  float strength = (0.34 + 0.66 * smoothstep(0.0, 0.85, t)) * mix(fog, 1.0, ring * 0.6) * (1.0 - vBlur * 0.3);
  float alpha = coverage * clamp(strength, 0.0, 1.0);
  fragColor = vec4(color * alpha, alpha);
}
`,C=(0,l.forwardRef)(function({text:e="FORM FOLLOWS FEELING \xb7",colors:t=["#FFFFFF","#7C5CFF"],backgroundColor:a="#0A0A0A",mode:r="auto",fontFamily:o="",fontWeight:i=500,letterSpacing:m=.08,glyphSize:g=13,rows:x=30,perspective:C=.55,tilt:M=24,horizon:A=.36,amplitude:L=1.6,wavelength:R=.7,speed:k=1,direction:j=0,sharpness:z=.5,envelope:E=0,flow:D=.8,alternate:W=!1,fog:N=.6,interactive:I=!0,hoverFocus:P=!0,focusDepth:B=.3,depthOfField:H=.7,focusRange:U=.14,clickStrum:q=!0,strumStrength:T=1,tension:O=1,sustain:G=1.6,paused:_=!1,quality:K=1,className:X,style:Y,children:$},V){let Z=(0,l.useRef)(null),Q=(0,l.useRef)(null),J=(0,l.useSyncExternalStore)(d,p,()=>!1),ee=(0,l.useRef)({text:e,colors:t,backgroundColor:a,mode:r,fontFamily:o,fontWeight:i,letterSpacing:m,glyphSize:g,rows:x,perspective:C,tilt:M,horizon:A,amplitude:L,wavelength:R,speed:k,direction:j,sharpness:z,envelope:E,flow:D,alternate:W,fog:N,interactive:I,hoverFocus:P,focusDepth:B,depthOfField:H,focusRange:U,clickStrum:q,strumStrength:T,tension:O,sustain:G,paused:_,quality:K,reduced:J});return(0,l.useEffect)(()=>{ee.current={text:e,colors:t,backgroundColor:a,mode:r,fontFamily:o,fontWeight:i,letterSpacing:m,glyphSize:g,rows:x,perspective:C,tilt:M,horizon:A,amplitude:L,wavelength:R,speed:k,direction:j,sharpness:z,envelope:E,flow:D,alternate:W,fog:N,interactive:I,hoverFocus:P,focusDepth:B,depthOfField:H,focusRange:U,clickStrum:q,strumStrength:T,tension:O,sustain:G,paused:_,quality:K,reduced:J},Q.current?.sync()}),(0,l.useEffect)(()=>{let e=Z.current;if(!e)return;let t=((e,t)=>{let a,n,l=document.createElement("canvas");l.setAttribute("aria-hidden","true"),l.style.position="absolute",l.style.inset="0",l.style.width="100%",l.style.height="100%",l.style.display="block",l.style.pointerEvents="none",e.prepend(l);try{a=new u.WebGLRenderer({canvas:l,alpha:!1,antialias:!0,powerPreference:"high-performance"})}catch{return l.remove(),null}if(!a.capabilities.isWebGL2)return a.dispose(),l.remove(),null;let r=new s.ubm(30,1,.1,400),o=new s.Z58,i=new Float32Array(64),c=new Float32Array(64).fill(1),d=new Float32Array(64).fill(1),p=new Float32Array(64),m=new Float64Array(64),g=new Float32Array(10240),x=new Float32Array(10240),C=new s.GYF(g,160,64,s.VT0,s.RQf);C.minFilter=s.hxR,C.magFilter=s.hxR,C.needsUpdate=!0;let M={uTime:{value:0},uAmp:{value:.3},uK:{value:2},uSharp:{value:1.6},uDir:{value:new s.I9Y(0,-1)},uEnvelope:{value:0},uHalf:{value:4},uStrings:{value:C},uRowZ:{value:i},uRowHalf:{value:c}},A=new s.BKk({glslVersion:s.Wdf,vertexShader:y,fragmentShader:b,uniforms:{...M,uBackground:{value:new s.Pq0}},depthTest:!0,depthWrite:!0}),L=new s.BKk({glslVersion:s.Wdf,vertexShader:F,fragmentShader:S,uniforms:{...M,uRowLength:{value:d},uRowShift:{value:p},uRowCount:{value:2},uGlyph:{value:.1},uLean:{value:.6},uGap:{value:.3},uFocus:{value:.3},uDof:{value:.6},uRange:{value:.12},uPad:{value:.3888888888888889},uAtlasSize:{value:new s.I9Y(1,1)},uAtlas:{value:null},uLabHigh:{value:new s.Pq0},uLabLow:{value:new s.Pq0},uInk:{value:0},uFog:{value:.5}},transparent:!0,depthTest:!0,depthWrite:!1,premultipliedAlpha:!0,blending:s.bCz,blendSrc:s.qad,blendDst:s.OuU}),R=new s.LoY,k=new s.CmU,j=new s.eaF(R,A),z=new s.eaF(k,L);j.frustumCulled=!1,z.frustumCulled=!1,j.renderOrder=0,z.renderOrder=1,o.add(j),o.add(z);let E=null,D="",W="",N=1,I=1,P=1,B=2,H=.1,U=4,q=0,T=0,O=0,G=0,_=0,K=!1,X=!0,Y=!1,$={x:0,y:0,inside:!1},V={value:f(t.current.focusDepth,0,1),velocity:0},Z=[],Q=[],J=new s.Pq0,ee={k:.3,aspect:1,depthNear:8},et=e=>{let a=f(t.current.tilt,4,85)*Math.PI/180;return r.position.y*Math.sin(a)+(r.position.z-e)*Math.cos(a)},ea=()=>{let e=t.current,a=N/I,n=3+57*f(e.perspective,0,1),l=Math.tan(n*Math.PI/360),o=f(e.tilt,4,85)*Math.PI/180,i=.92*Math.tan(o)/l,s=Math.min(1-2*f(e.horizon,.02,.9),i,.96),u=e=>(Math.sin(o)-e*l*Math.cos(o))/(Math.cos(o)+e*l*Math.sin(o)),c=u(-1.18),h=u(s),d=10*h/Math.max(c-h,1e-4),p=d*c;r.fov=n,r.aspect=a,r.position.set(0,p,d),r.lookAt(0,p-Math.sin(o),d-Math.cos(o)),r.near=Math.max(.01,.05*Math.min(d,p)),r.far=(d+p+10)*4+50,r.updateProjectionMatrix(),r.updateMatrixWorld(),ee.k=l,ee.aspect=a,ee.depthNear=et(0),U=ee.depthNear*l*a;let m=I/2/(ee.depthNear*l);H=Math.min(f(e.glyphSize,4,120)/m,ee.depthNear*l*.25)},en=(n=(e,t)=>2*Math.pow(.5+.5*Math.sin(e),t)-1,(e,t)=>{let a=M.uDir.value.x,l=M.uDir.value.y,r=M.uK.value,o=M.uSharp.value,i=M.uTime.value,s=.42*Math.sqrt(9.8*r),u=e*a+t*l,c=.56*n(u*r-i*s,o);c+=.27*n((e*(.8*a-.6*l)+t*(.6*a+.8*l))*r*1.71+1.3-i*s*1.31,o)+.13*Math.sin((e*(.9*a+.44*l)+t*(-(.44*a)+.9*l))*r*2.93+2.1-i*s*1.71);let h=.7+.3*Math.sin((e*l-t*a)*r*.37+.21*i)*Math.sin(u*r*.19-.13*i+1.7),d=1+(.16+1.3*Math.exp(-Math.pow(e/(.6*M.uHalf.value),2))-1)*M.uEnvelope.value;return M.uAmp.value*c*h*d}),el=()=>{let n,l;(l=[(n=t.current).text,n.fontFamily,n.fontWeight,n.letterSpacing,n.glyphSize,n.rows,n.perspective,n.tilt,n.horizon,Math.round(N),Math.round(I),getComputedStyle(e).fontFamily].join("|"))!==W?(W=l,(()=>{let a,n,l,r=t.current;ea();let o=(n=(a=t.current).fontFamily||getComputedStyle(e).fontFamily,`${f(a.fontWeight,100,900)} 72px ${n}`),u=r.text.trim()?r.text.trim():"\xb7",h=(l=`${u} `,"undefined"==typeof Intl||void 0===Intl.Segmenter?Array.from(l):Array.from(new Intl.Segmenter(void 0,{granularity:"grapheme"}).segment(l),e=>e.segment)),p=`${o}|${h.join("")}`;if(p!==D||!E){let e,t,a,n,l,r,i,u,c,d,f,m,v,g;D=p,E?.texture.dispose(),e=Array.from(new Set(h.filter(e=>e.trim()))),t=document.createElement("canvas").getContext("2d"),a=e=>t?(t.font=o,t.measureText(e).width):36,n=e.map(a),l=Math.ceil(149.60000000000002),r=0,i=0,u=[],n.forEach(e=>{let t=Math.ceil(e)+56;r+t>2048&&(r=0,i+=l),u.push({x:r,y:i,w:t}),r+=t}),c=Math.max(l,Math.pow(2,Math.ceil(Math.log2(i+l)))),(d=document.createElement("canvas")).width=2048,d.height=c,f=d.getContext("2d"),m=new Map,f&&(f.fillStyle="#000",f.fillRect(0,0,2048,c),f.fillStyle="#fff",f.font=o,f.textBaseline="alphabetic",f.textAlign="left",e.forEach((e,t)=>{let a=u[t];f.fillText(e,a.x+28,a.y+28+70.56),m.set(e,{u:a.x/2048,v:a.y/c,w:a.w/2048,h:l/c,advance:n[t]/72,width:a.w/72})})),v=a(" ")/72,m.set(" ",{u:0,v:0,w:0,h:0,advance:v,width:0}),(g=new s.GOR(d)).flipY=!1,g.minFilter=s.$_I,g.magFilter=s.k6q,g.generateMipmaps=!0,g.anisotropy=4,g.colorSpace=s.jf0,g.needsUpdate=!0,E={texture:g,glyphs:m,size:[2048,c]},L.uniforms.uAtlas.value=E.texture,L.uniforms.uAtlasSize.value.set(E.size[0],E.size[1])}B=Math.round(f(r.rows,2,64));let v=f(r.letterSpacing,-.1,1),w=e=>((E?.glyphs.get(e)?.advance??.3)+v)*H,y=h.reduce((e,t)=>e+w(t),0),b=[],F=[],S=[],C=[],M=[],A=[],W=[],N=[];for(let e=0;e<B;e++){let t=-(e/Math.max(B-1,1)*10);i[e]=t;let a=et(t)*ee.k*ee.aspect*1.1+3*H;c[e]=a;let n=Math.max(1,Math.ceil(2*a/Math.max(y,1e-4))+1),l=n*y;d[e]=l,m[e]>0||(m[e]=Math.random()*l);let r=-l/2;for(let t=0;t<n;t++)for(let t of h){let a=w(t),n=E?.glyphs.get(t);n&&n.width>0&&(b.push(e),F.push(r+a/2-v*H/2),S.push(n.u,n.v,n.w,n.h),C.push(n.width*H)),r+=a}let o=M.length;for(let t=0;t<=260;t++){let n=-a+2*a*t/260;if(M.push(e,e),A.push(n,n),W.push(0,1),t<260){let e=o+2*t;N.push(e,e+1,e+2,e+1,e+3,e+2)}}}let I=new s.LoY;I.setAttribute("position",new s.qtW(new Float32Array(3*M.length),3)),I.setAttribute("aRow",new s.qtW(M,1)),I.setAttribute("aX",new s.qtW(A,1)),I.setAttribute("aBottom",new s.qtW(W,1)),I.setIndex(N),R.dispose(),R=I,j.geometry=I;let P=new s.CmU;P.setAttribute("position",new s.qtW([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,-.5,0,.5,.5,0,-.5,.5,0],3)),P.setAttribute("aRow",new s.uWO(new Float32Array(b),1)),P.setAttribute("aX",new s.uWO(new Float32Array(F),1)),P.setAttribute("aRect",new s.uWO(new Float32Array(S),4)),P.setAttribute("aWidth",new s.uWO(new Float32Array(C),1)),P.instanceCount=b.length,k.dispose(),k=P,z.geometry=P,g.fill(0),x.fill(0)})()):ea(),(()=>{let e=t.current,n=v(e.backgroundColor,[.04,.04,.04]),l=.2126*n[0]+.7152*n[1]+.0722*n[2],r="ink"===e.mode||"auto"===e.mode&&l>.5,o=w(v(e.colors[0],[1,1,1])),i=w(v(e.colors[1],[.49,.36,1])),u=10/Math.max(B-1,1),c=f(e.direction,-180,180)*Math.PI/180;M.uTime.value=q,M.uAmp.value=f(e.amplitude,0,8)*u,M.uK.value=2*Math.PI/Math.max(f(e.wavelength,.05,4)*U*2,.001),M.uSharp.value=1+2.4*f(e.sharpness,0,1),M.uDir.value.set(Math.sin(c),-Math.cos(c)),M.uEnvelope.value=f(e.envelope,0,1),M.uHalf.value=U;let h=L.uniforms;h.uRowCount.value=B,h.uGlyph.value=H,h.uFocus.value=e.reduced?f(e.focusDepth,0,1):V.value,h.uDof.value=f(e.depthOfField,0,1),h.uRange.value=f(e.focusRange,0,1),h.uGap.value=u,h.uLabHigh.value.set(o[0],o[1],o[2]),h.uLabLow.value.set(i[0],i[1],i[2]),h.uInk.value=+!!r,h.uFog.value=f(e.fog,0,3),A.uniforms.uBackground.value.set(n[0],n[1],n[2]),a.setClearColor(new s.Q1f().setRGB(n[0],n[1],n[2],s.er$),1);for(let e=0;e<B;e++){let t=d[e];p[e]=(m[e]%t+t)%t}})(),a.setRenderTarget(null),a.render(o,r)},er=(e,t,a)=>{let n=c[e],l=159*f(t/n*.5+.5,0,1),r=Math.max(3,7*H/(2*n)*159);Q.push({row:e,center:l,spread:r,amount:a,left:.09})},eo=e=>{for(let t=Q.length-1;t>=0;t--){let a=Q[t],n=Math.min(e,a.left)/.09;a.left-=e;let l=Math.max(1,Math.floor(a.center-3*a.spread)),r=Math.min(158,Math.ceil(a.center+3*a.spread)),o=160*a.row;for(let e=l;e<=r;e++){let t=(e-a.center)/a.spread;g[o+e]+=a.amount*n*Math.exp(-t*t)}a.left<=0&&Q.splice(t,1)}},ei=(e,t)=>{let a=t/N*2-1,n=i[e],l=a*et(n)*ee.k*ee.aspect,o=en(l,n);return J.set(l,o,n).project(r),[l,(1-J.y)*.5*I]},es=a=>{if(O=0,Y)return;let n=Math.min(.05,Math.max(0,(a-G)/1e3));G=a;let l=t.current,r=!l.paused&&!l.reduced;if(++_%30==0&&(Math.abs(e.clientWidth-N)>1||Math.abs(e.clientHeight-I)>1)&&ec(),!K){X&&!document.hidden&&(O=requestAnimationFrame(es));return}if(r){let e,a;q+=n*f(l.speed,0,4);let r=f(l.flow,-20,20)*H;for(let e=0;e<B;e++){let t=l.alternate&&e%2==1?-1:1;m[e]+=r*t*n}for(let e=Z.length-1;e>=0;e--){let t=Z[e];t.at>q||(t.row<B&&er(t.row,t.x,t.amount),Z.splice(e,1))}a=f((e=t.current).focusDepth,0,1),$.inside&&e.interactive&&e.hoverFocus&&(a=((e,t)=>{let a=ei(0,e)[1];if(t>=a)return 0;for(let n=1;n<B;n++){let l=ei(n,e)[1];if(t>=l){let e=a-l;return(n-1+f(e>.001?(a-t)/e:0,0,1))/Math.max(B-1,1)}a=l}return 1})($.x,$.y)),V.velocity+=(42.25*(a-V.value)-13*V.velocity)*n,V.value+=V.velocity*n,(e=>{let a=t.current,n=Math.min(.95,62*f(a.tension,.1,3)*h)**2/(h*h),l=1/f(a.sustain,.2,10);T+=e;let r=0;for(;T>=h&&r<16;){T-=h,r++,eo(h);for(let e=0;e<B;e++){let t=160*e;for(let e=1;e<159;e++){let a=t+e,r=g[a-1]+g[a+1]-2*g[a],o=Math.min(e,159-e),i=o<14?(14-o)*1.6:0;x[a]+=(n*r-(l+i)*x[a])*h}for(let e=1;e<159;e++)g[t+e]+=x[t+e]*h}}16===r&&(T=0),C.needsUpdate=!0})(n)}el(),X&&!document.hidden&&r&&(O=requestAnimationFrame(es))};function eu(){Y||O||!X||(G=performance.now(),O=requestAnimationFrame(es))}let ec=()=>{let n=e.getBoundingClientRect();if(n.width<2||n.height<2){K=!1,eu();return}K=!0,N=n.width,I=n.height,P=Math.min(window.devicePixelRatio||1,2)*f(t.current.quality,.25,1),a.setPixelRatio(P),a.setSize(N,I,!1),W="",el(),eu()},eh=t=>{let a=e.getBoundingClientRect();return[t.clientX-a.left,t.clientY-a.top]},ed=e=>{if("touch"===e.pointerType)return;let[t,a]=eh(e);$.x=t,$.y=a,$.inside=!0,eu()},ep=()=>{$.inside=!1},ef=(e,a)=>{let n=t.current;if(n.reduced||n.paused)return;let l=10/Math.max(B-1,1),r=0,o=1/0;for(let t=0;t<B;t++){let[,n]=ei(t,e),l=Math.abs(n-a);l<o&&(o=l,r=t)}let i=.75*l*f(n.strumStrength,0,3);for(let t=0;t<B;t++){let[a]=ei(t,e),n=Math.abs(t-r);Z.push({row:t,x:a,at:q+.045*n,amount:i*Math.exp(-n/12)})}eu()},em=e=>{let a=t.current;if(!a.interactive||!a.clickStrum)return;let[n,l]=eh(e);ef(n,l)};e.addEventListener("pointermove",ed),e.addEventListener("pointerleave",ep),e.addEventListener("click",em);let ev=new ResizeObserver(ec);ev.observe(e);let eg=new IntersectionObserver(e=>{(X=e.some(e=>e.isIntersecting))&&eu()},{rootMargin:"80px"});eg.observe(e);let ew=()=>{document.hidden||eu()};document.addEventListener("visibilitychange",ew),document.fonts?.ready&&document.fonts.ready.then(()=>{!Y&&(D="",W="",K&&el())}).catch(()=>{});let ex=e=>e.preventDefault();return l.addEventListener("webglcontextlost",ex),ec(),{sync:()=>{let e=Math.min(window.devicePixelRatio||1,2)*f(t.current.quality,.25,1);!K||Math.abs(e-P)>.001?ec():el(),eu()},destroy:()=>{Y=!0,cancelAnimationFrame(O),e.removeEventListener("pointermove",ed),e.removeEventListener("pointerleave",ep),e.removeEventListener("click",em),document.removeEventListener("visibilitychange",ew),l.removeEventListener("webglcontextlost",ex),ev.disconnect(),eg.disconnect(),E?.texture.dispose(),C.dispose(),R.dispose(),k.dispose(),A.dispose(),L.dispose(),a.dispose(),a.forceContextLoss(),l.remove()},strum:(e,t)=>ef(f(e,0,1)*N,f(t,0,1)*I)}})(e,ee);return Q.current=t,()=>{t?.destroy(),Q.current=null}},[]),(0,l.useImperativeHandle)(V,()=>({strum:(e=.5,t=.6)=>Q.current?.strum(e,t)}),[]),(0,n.jsx)("div",{ref:Z,role:"img","aria-label":e,className:(0,c.cn)("relative isolate h-full min-h-[240px] w-full overflow-hidden",X),style:{backgroundColor:a,...Y},children:$&&(0,n.jsx)("div",{className:"relative z-10 h-full w-full",children:$})})});C.displayName="WaveLettering";let M={dark:["#FFFFFF","#7C5CFF"],light:["#0A0A0A","#A594F9"],rows:30,glyphSize:13,perspective:.55,tilt:24,horizon:.36,amplitude:1.6,wavelength:.7,speed:1,sharpness:.5,envelope:0},A={tide:M,ridgeline:{...M,rows:34,glyphSize:10,perspective:.03,tilt:70,horizon:.16,amplitude:4.6,wavelength:.32,sharpness:.8,envelope:1},stillwater:{...M,dark:["#E9E4FF","#5B6CFF"],light:["#1E1B4B","#A5B4FC"],amplitude:.8,wavelength:1.1,speed:.6,sharpness:.2},swell:{...M,dark:["#FFE7FB","#FF5FD2"],light:["#4A044E","#F0ABFC"],rows:26,amplitude:2.4,wavelength:.9,speed:1.2,sharpness:.85}},L=[{label:"Tide",value:"tide"},{label:"Ridgeline",value:"ridgeline"},{label:"Still Water",value:"stillwater"},{label:"Swell",value:"swell"}],R=[{label:"Auto",value:"auto"},{label:"Glow",value:"glow"},{label:"Ink",value:"ink"}],k=[{name:"text",type:"string",default:'"FORM FOLLOWS FEELING \xb7"',description:"The phrase repeated along every line of the sea."},{name:"colors",type:"[string, string]",default:'["#FFFFFF", "#7C5CFF"]',description:"Colour of the text on the crests and nearby, and colour it fades to in the troughs and the distance, blended in OKLab."},{name:"backgroundColor",type:"string",default:'"#0A0A0A"',description:"Colour of the water between the lines. Nearer crests hide the lines behind them in this colour."},{name:"mode",type:'"auto" | "glow" | "ink"',default:'"auto"',description:"glow lets bright crests burn toward white on dark backgrounds; ink keeps colours true for light ones. auto picks from the background."},{name:"fontFamily",type:"string",default:"inherited",description:"Font for the lettering. Leave unset to use the page font."},{name:"fontWeight",type:"number",default:"500",description:"Font weight."},{name:"letterSpacing",type:"number",default:"0.08",description:"Letter spacing in em."},{name:"glyphSize",type:"number",default:"13",description:"Size of the nearest line of text, in pixels. Lines further away get smaller."},{name:"rows",type:"number",default:"30",description:"Number of lines of text, from 2 to 64."},{name:"perspective",type:"number",default:"0.55",description:"Depth of the view, from 0 (a flat stack of lines, like a ridgeline chart) to 1 (a deep sea running to the horizon)."},{name:"tilt",type:"number",default:"24",description:"How steeply you look down at the sea, in degrees."},{name:"horizon",type:"number",default:"0.36",description:"Where the furthest line sits, as a fraction of the height from the top. Leaves room for a headline above."},{name:"amplitude",type:"number",default:"1.6",description:"Height of the swell, measured in line spacings."},{name:"wavelength",type:"number",default:"0.7",description:"Length of the swell relative to the width of the frame."},{name:"speed",type:"number",default:"1",description:"Time scale for the swell."},{name:"direction",type:"number",default:"0",description:"Direction the swell travels, in degrees. 0 rolls toward you."},{name:"sharpness",type:"number",default:"0.5",description:"How peaked the crests are, from 0 (rounded) to 1 (sharp)."},{name:"envelope",type:"number",default:"0",description:"Gathers the swell toward the centre, from 0 (even) to 1 (peaks in the middle, flat at the sides)."},{name:"flow",type:"number",default:"0.8",description:"Speed the text drifts along its line, in em per second. Negative values drift the other way."},{name:"alternate",type:"boolean",default:"false",description:"Neighbouring lines drift in opposite directions."},{name:"fog",type:"number",default:"0.6",description:"How quickly distant lines fade, from 0 to 3."},{name:"interactive",type:"boolean",default:"true",description:"Respond to the pointer."},{name:"hoverFocus",type:"boolean",default:"true",description:"The lens racks focus to follow the pointer: the lines at the pointer's depth turn crisp while nearer and farther lines soften, then focus eases back to focusDepth when the pointer leaves."},{name:"focusDepth",type:"number",default:"0.3",description:"Where the lens rests, from 0 (the nearest line) to 1 (the horizon)."},{name:"depthOfField",type:"number",default:"0.7",description:"How soft the out-of-focus lines get, from 0 (everything sharp) to 1."},{name:"focusRange",type:"number",default:"0.14",description:"Depth of the sharp band around the focus, as a fraction of the sea."},{name:"clickStrum",type:"boolean",default:"true",description:"Clicking strums the lines: a soft ripple runs along each one, spreading out from the line you clicked."},{name:"strumStrength",type:"number",default:"1",description:"Height of the strum ripple, from 0 to 3."},{name:"tension",type:"number",default:"1",description:"How fast a strum ripple runs along the lines."},{name:"sustain",type:"number",default:"1.6",description:"Seconds a strummed line keeps ringing."},{name:"paused",type:"boolean",default:"false",description:"Freeze the sea. Reduced-motion users always get a still frame."},{name:"quality",type:"number",default:"1",description:"Resolution scale from 0.25 to 1."},{name:"ref",type:"{ strum }",default:"—",description:"strum(x, y) strums the lines from a point given as fractions of the width and height."},{name:"children",type:"ReactNode",default:"—",description:"Content placed over the sea."},{name:"className",type:"string",default:"—",description:"Classes for the root element. It fills its parent, with a 240px minimum height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."}],j=()=>{let[e,t]=(0,i.I)(),a="dark"===(0,o.Y)(),[s,u]=(0,l.useState)("FORM FOLLOWS FEELING \xb7"),[c,h]=(0,l.useState)("tide"),[d,p]=(0,l.useState)(M),f=e=>t=>p(a=>({...a,[e]:t})),[m,v]=(0,l.useState)(null),g=m??(a?d.dark:d.light),w=e=>t=>{let a=[...g];a[e]=t,v(a)},[x,y]=(0,l.useState)(null),b=x??(a?"#0A0A0A":"#FFFFFF"),[F,S]=(0,l.useState)("auto"),[j,z]=(0,l.useState)(500),[E,D]=(0,l.useState)(.08),[W,N]=(0,l.useState)(0),[I,P]=(0,l.useState)(.8),[B,H]=(0,l.useState)(.6),[U,q]=(0,l.useState)(.3),[T,O]=(0,l.useState)(.7),[G,_]=(0,l.useState)(.14),[K,X]=(0,l.useState)(1),[Y,$]=(0,l.useState)(1),[V,Z]=(0,l.useState)(1.6),[Q,J]=(0,l.useState)(!1),[ee,et]=(0,l.useState)(!0),[ea,en]=(0,l.useState)(!0),[el,er]=(0,l.useState)(!0),[eo,ei]=(0,l.useState)(!1);return(0,n.jsxs)("div",{children:[(0,n.jsx)(r.Bg,{}),(0,n.jsxs)(r.VX,{children:[(0,n.jsxs)(r.Ec,{children:[(0,n.jsx)(r.Ch,{onRefresh:t,minHeight:560,enableResponsive:!0,children:(0,n.jsx)("div",{className:"relative h-full w-full",children:(0,n.jsx)(C,{text:s,colors:g,backgroundColor:b,mode:F,fontWeight:j,letterSpacing:E,glyphSize:d.glyphSize,rows:d.rows,perspective:d.perspective,tilt:d.tilt,horizon:d.horizon,amplitude:d.amplitude,wavelength:d.wavelength,speed:d.speed,direction:W,sharpness:d.sharpness,envelope:d.envelope,flow:I,alternate:Q,fog:B,interactive:el,hoverFocus:ee,focusDepth:U,depthOfField:T,focusRange:G,clickStrum:ea,strumStrength:K,tension:Y,sustain:V,paused:eo},e)})}),(0,n.jsxs)(r.IH,{children:[(0,n.jsx)(r.UD,{title:"Text",value:s,onChange:u}),(0,n.jsx)(r.bg,{title:"Look",value:c,options:L,onChange:e=>{h(e),p(A[e]??M),v(null)}}),(0,n.jsx)(r.bg,{title:"Mode",value:F,options:R,onChange:e=>S(e)}),(0,n.jsx)(r.W7,{title:"Crest",value:g[0],onChange:w(0)}),(0,n.jsx)(r.W7,{title:"Depth",value:g[1],onChange:w(1)}),(0,n.jsx)(r.W7,{title:"Background",value:b,onChange:y}),(0,n.jsx)(r.yt,{title:"Glyph Size",min:6,max:40,step:1,value:d.glyphSize,valueUnit:"px",onChange:f("glyphSize")}),(0,n.jsx)(r.yt,{title:"Rows",min:4,max:64,step:1,value:d.rows,onChange:f("rows")}),(0,n.jsx)(r.yt,{title:"Font Weight",min:300,max:800,step:100,value:j,onChange:z}),(0,n.jsx)(r.yt,{title:"Letter Spacing",min:-.05,max:.5,step:.01,value:E,valueUnit:"em",onChange:D}),(0,n.jsx)(r.yt,{title:"Perspective",min:0,max:1,step:.01,value:d.perspective,onChange:f("perspective")}),(0,n.jsx)(r.yt,{title:"Tilt",min:6,max:80,step:1,value:d.tilt,valueUnit:"\xb0",onChange:f("tilt")}),(0,n.jsx)(r.yt,{title:"Horizon",min:.04,max:.8,step:.01,value:d.horizon,onChange:f("horizon")}),(0,n.jsx)(r.yt,{title:"Amplitude",min:0,max:5,step:.05,value:d.amplitude,onChange:f("amplitude")}),(0,n.jsx)(r.yt,{title:"Wavelength",min:.15,max:2,step:.01,value:d.wavelength,onChange:f("wavelength")}),(0,n.jsx)(r.yt,{title:"Speed",min:0,max:3,step:.05,value:d.speed,onChange:f("speed")}),(0,n.jsx)(r.yt,{title:"Direction",min:-180,max:180,step:1,value:W,valueUnit:"\xb0",onChange:N}),(0,n.jsx)(r.yt,{title:"Sharpness",min:0,max:1,step:.01,value:d.sharpness,onChange:f("sharpness")}),(0,n.jsx)(r.yt,{title:"Envelope",min:0,max:1,step:.01,value:d.envelope,onChange:f("envelope")}),(0,n.jsx)(r.yt,{title:"Flow",min:-6,max:6,step:.1,value:I,onChange:P}),(0,n.jsx)(r.yt,{title:"Fog",min:0,max:3,step:.05,value:B,onChange:H}),(0,n.jsx)(r.yt,{title:"Focus Depth",min:0,max:1,step:.01,value:U,onChange:q}),(0,n.jsx)(r.yt,{title:"Depth Of Field",min:0,max:1,step:.01,value:T,onChange:O}),(0,n.jsx)(r.yt,{title:"Focus Range",min:0,max:.6,step:.01,value:G,onChange:_}),(0,n.jsx)(r.yt,{title:"Strum Strength",min:0,max:3,step:.05,value:K,onChange:X}),(0,n.jsx)(r.yt,{title:"Tension",min:.2,max:3,step:.05,value:Y,onChange:$}),(0,n.jsx)(r.yt,{title:"Sustain",min:.3,max:6,step:.1,value:V,valueUnit:"s",onChange:Z}),(0,n.jsx)(r.tl,{title:"Alternate",checked:Q,onChange:J}),(0,n.jsx)(r.tl,{title:"Hover Focus",checked:ee,onChange:et}),(0,n.jsx)(r.tl,{title:"Click Strum",checked:ea,onChange:en}),(0,n.jsx)(r.tl,{title:"Interactive",checked:el,onChange:er}),(0,n.jsx)(r.tl,{title:"Paused",checked:eo,onChange:ei})]}),(0,n.jsx)(r.Ub,{data:k})]}),(0,n.jsx)(r.lT,{children:(0,n.jsx)(r.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>n.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>h.CopyButton,IH:()=>r.Customize,gI:()=>f,Dn:()=>v,pi:()=>m,W7:()=>o.PreviewColor,Ch:()=>l.PreviewContainer,UD:()=>o.PreviewInput,bg:()=>o.PreviewSelect,yt:()=>o.PreviewSlider,tl:()=>o.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>i.PropTable,VX:()=>n.TabsLayout,bs:()=>p});var n=a(55019);a(27382);var l=a(10236),r=a(69485),o=a(48543),i=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var c=a(95155);a(66729);var h=a(28592),d=a(90650);let p="rounded-lg border bg-background";function f({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,d.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,d.cn)(p,e),...a,children:t})}function v({title:e,description:t,className:a,children:n}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:n})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>i});var n=a(12115),l=a(30701);let r=()=>()=>{},o=()=>"light";function i(){let{resolvedTheme:e}=(0,l.D)();return(0,n.useSyncExternalStore)(r,()=>"dark"===e?"dark":"light",o)}},90761:(e,t,a)=>{a.d(t,{I:()=>l});var n=a(12115);function l(){let[e,t]=(0,n.useState)(0),a=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);