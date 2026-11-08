"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[56997],{56388:(e,t,a)=>{a.d(t,{Gv:()=>u.CodeExample,lT:()=>n.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>c.CopyButton,IH:()=>i.Customize,gI:()=>f,Dn:()=>p,pi:()=>v,W7:()=>l.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>l.PreviewInput,bg:()=>l.PreviewSelect,yt:()=>l.PreviewSlider,tl:()=>l.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>o.PropTable,VX:()=>n.TabsLayout,bs:()=>h});var n=a(55019);a(27382);var r=a(10236),i=a(69485),l=a(48543),o=a(87552);a(39260);var u=a(52407),s=a(79901);a(24496);var d=a(95155);a(66729);var c=a(28592),m=a(90650);let h="rounded-lg border bg-background";function f({className:e,children:t,...a}){return(0,d.jsx)("div",{className:(0,m.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function v({className:e,children:t,...a}){return(0,d.jsx)("div",{className:(0,m.cn)(h,e),...a,children:t})}function p({title:e,description:t,className:a,children:n}){return(0,d.jsxs)("section",{className:a,children:[(0,d.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,d.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,d.jsx)("div",{className:"mt-6",children:n})]})}},56997:(e,t,a)=>{a.r(t),a.d(t,{default:()=>P});var n=a(95155),r=a(12115),i=a(56388),l=a(86049),o=a(90761),u=a(12246),s=a(2253),d=a(90650);let c=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},m=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,h=(e,t,a)=>Math.min(a,Math.max(t,e)),f=(e,t)=>Number.isFinite(e)?e:t,v=(e,t,a)=>{let n=h((a-e)/(t-e),0,1);return n*n*(3-2*n)},p=(e,t,a)=>{if(!e||"string"!=typeof t)return a;e.fillStyle="#010203",e.fillStyle=t;let n=String(e.fillStyle);if("#010203"===n&&"#010203"!==t.trim().toLowerCase())return a;if(n.startsWith("#")){let e=n.slice(1);return[parseInt(e.slice(0,2),16)/255,parseInt(e.slice(2,4),16)/255,parseInt(e.slice(4,6),16)/255]}let r=n.match(/[\d.]+/g);return!r||r.length<3?a:[Number(r[0])/255,Number(r[1])/255,Number(r[2])/255]},g=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),x=([e,t,a])=>{let n=g(e),r=g(t),i=g(a),l=Math.cbrt(.4122214708*n+.5363325363*r+.0514459929*i),o=Math.cbrt(.2119034982*n+.6806995451*r+.1073969566*i),u=Math.cbrt(.0883024619*n+.2817188376*r+.6299787005*i);return[.2104542553*l+.793617785*o-.0040720468*u,1.9779984951*l-2.428592205*o+.4505937099*u,.0259040371*l+.7827717662*o-.808675766*u]},b=`
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
`,y=`
in vec4 aHead;
in vec4 aShape;
in vec4 aLook;
uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uLineWidth;
uniform float uTrailGain;
out vec2 vLine;
out float vLength;
out float vHalf;
out float vGain;
out float vLayer;

void main() {
  float len = aShape.x * uPixelRatio;
  float width = uLineWidth * aShape.w * uPixelRatio;
  vLine = vec2(0.0);
  vLength = 1.0;
  vHalf = 0.0;
  vGain = 0.0;
  vLayer = aLook.z;
  if (aShape.y <= 0.0 || len < 0.05 || width <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  float body = max(width, 1.0);
  float reach = body * 0.5 + 1.0;
  vec2 dir = aHead.zw;
  vec2 side = vec2(-dir.y, dir.x);
  float along = mix(-1.0, len + 1.0, position.x);
  float across = position.y * reach;
  vec2 point = aHead.xy * uPixelRatio - dir * (len - along) + side * across;
  vLine = vec2(along, across);
  vLength = len;
  vHalf = body * 0.5;
  vGain = aShape.y * uTrailGain * min(width, 1.0);
  gl_Position = vec4(point / uResolution * 2.0 - 1.0, 0.0, 1.0);
}
`,w=`
precision highp float;
uniform vec3 uTrailLab;
uniform vec3 uHeadLab;
uniform float uFade;
in vec2 vLine;
in float vLength;
in float vHalf;
in float vGain;
in float vLayer;
out vec4 fragColor;
${b}

void main() {
  float t = clamp(vLine.x / vLength, 0.0, 1.0);
  float side = clamp(vHalf + 0.5 - abs(vLine.y), 0.0, 1.0);
  float cap = clamp(vLength + 0.5 - vLine.x, 0.0, 1.0);
  float e = pow(t, uFade * 2.2) * side * cap * vGain;
  vec3 color = labToLinear(mix(uTrailLab, uHeadLab, smoothstep(0.45, 1.0, t) * 0.45 * vLayer));
  fragColor = vec4(color * e, e);
}
`,S=`
in vec4 aHead;
in vec4 aShape;
in vec4 aLook;
uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uStarSize;
uniform float uTime;
uniform float uTwinkle;
uniform float uHeadGain;
out vec2 vOffset;
out float vSigma;
out float vRadius;
out float vGain;
out float vLayer;

void main() {
  float wanted = uStarSize * aShape.z * uPixelRatio * 0.42;
  float sigma = max(wanted, 0.5);
  float radius = sigma * 4.5 + 1.0;
  vOffset = position.xy * radius;
  vSigma = sigma;
  vRadius = radius;
  vGain = 0.0;
  vLayer = aLook.z;
  if (aShape.y <= 0.0 || wanted <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  float wave = 0.5 + 0.5 * sin(uTime * (0.6 + 1.5 * aLook.x) + aLook.x * 57.0);
  float shimmer = 1.0 - uTwinkle * 0.6 * wave * wave;
  vGain = aShape.y * uHeadGain * shimmer * (1.0 + aLook.y * 0.5) * (wanted * wanted) / (sigma * sigma);
  gl_Position = vec4((aHead.xy * uPixelRatio + vOffset) / uResolution * 2.0 - 1.0, 0.0, 1.0);
}
`,F=`
precision highp float;
uniform vec3 uTrailLab;
uniform vec3 uHeadLab;
uniform float uHalo;
in vec2 vOffset;
in float vSigma;
in float vRadius;
in float vGain;
in float vLayer;
out vec4 fragColor;
${b}

void main() {
  float d = length(vOffset);
  float x = d / vSigma;
  float body = exp(-0.5 * x * x) + uHalo * exp(-0.06 * x * x);
  float e = body * (1.0 - smoothstep(vRadius * 0.5, vRadius, d)) * vGain;
  vec3 color = labToLinear(mix(uTrailLab, uHeadLab, mix(0.5, 1.0, vLayer)));
  fragColor = vec4(color * e, e);
}
`,C=`
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,L=`
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;
uniform float uFloor;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 a = texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  vec4 b = texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  vec4 c = texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  vec4 d = texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  vec4 color = (a + b + c + d) * 0.125 + texture(uSource, vUv) * 0.5;
  float peak = max(color.r, max(color.g, color.b));
  float knee = uThreshold * 0.6 + 1e-4;
  float soft = clamp(peak - uThreshold + knee, 0.0, 2.0 * knee);
  float weight = max(soft * soft / (4.0 * knee), peak - uThreshold) / max(peak, 1e-4);
  color.rgb *= mix(uFloor, 1.0, clamp(weight, 0.0, 1.0));
  fragColor = color;
}
`,M=`
precision highp float;
uniform sampler2D uSource;
uniform sampler2D uBase;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 sum = texture(uSource, vUv) * 4.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 0.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, -1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(0.0, 1.0)) * 2.0;
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  sum += texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  sum += texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = texture(uBase, vUv) + sum / 16.0;
}
`,k=`
precision highp float;
uniform sampler2D uLines;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform float uGlow;
uniform float uExposure;
uniform float uMode;
uniform float uGrain;
uniform float uSeed;
in vec2 vUv;
out vec4 fragColor;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void main() {
  vec4 lines = texture(uLines, vUv);
  vec4 bloom = texture(uBloom, vUv);
  vec3 color;
  float amount;
  if (uMode < 0.5) {
    vec3 light = (lines.rgb + bloom.rgb * uGlow) * uExposure;
    vec3 exposed = 1.0 - exp(-light);
    float peak = max(exposed.r, max(exposed.g, exposed.b));
    exposed = mix(exposed, vec3(peak), smoothstep(0.7, 1.0, peak) * 0.4);
    color = uBackground + (1.0 - uBackground) * exposed;
    amount = peak;
  } else {
    float energy = lines.a + bloom.a * uGlow * 0.15;
    vec3 hue = (lines.rgb + bloom.rgb * uGlow * 0.15) / max(energy, 1e-4);
    float cover = clamp(1.0 - exp(-energy * uExposure), 0.0, 0.92);
    color = mix(uBackground, clamp(hue, 0.0, 1.0), cover);
    amount = cover;
  }
  float noise = hash(gl_FragCoord.xy + uSeed * 311.0) - 0.5;
  fragColor = vec4(encode(color) + noise * (1.0 / 255.0 + uGrain * 0.08 * sqrt(amount)), 1.0);
}
`,T=(0,r.forwardRef)(function({colors:e=["#5227FF","#FF9FFC"],backgroundColor:t="#0a0a0a",mode:a="auto",direction:i="up",spread:l=150,focus:o=.35,originOffset:b=.18,originShift:T=0,count:j=480,speed:E=.16,speedVariance:R=.6,acceleration:H=.9,trailLength:U=.45,trailFade:G=1.6,lineWidth:P=1,starSize:B=2.2,twinkle:A=.35,fadeIn:I=.06,fadeOut:O=.3,depth:W=.5,glow:q=.45,intensity:z=1,grain:D=.3,interactive:N=!0,thrust:_=1,burst:V=64,paused:X=!1,quality:Y=1,className:K,style:Z,children:$},Q){let J=(0,r.useRef)(null),ee=(0,r.useRef)(null),et=(0,r.useSyncExternalStore)(c,m,()=>!1),ea=(0,r.useRef)({colors:e,backgroundColor:t,mode:a,direction:i,spread:l,focus:o,originOffset:b,originShift:T,count:j,speed:E,speedVariance:R,acceleration:H,trailLength:U,trailFade:G,lineWidth:P,starSize:B,twinkle:A,fadeIn:I,fadeOut:O,depth:W,glow:q,intensity:z,grain:D,interactive:N,thrust:_,burst:V,paused:X,quality:Y,reduced:et});return(0,r.useEffect)(()=>{ea.current={colors:e,backgroundColor:t,mode:a,direction:i,spread:l,focus:o,originOffset:b,originShift:T,count:j,speed:E,speedVariance:R,acceleration:H,trailLength:U,trailFade:G,lineWidth:P,starSize:B,twinkle:A,fadeIn:I,fadeOut:O,depth:W,glow:q,intensity:z,grain:D,interactive:N,thrust:_,burst:V,paused:X,quality:Y,reduced:et},ee.current?.sync()}),(0,r.useEffect)(()=>{let e=J.current;if(!e)return;let t=((e,t)=>{let a,n,r=e.ownerDocument,i=r.defaultView??window,l=r.createElement("canvas");l.setAttribute("aria-hidden","true"),l.style.position="absolute",l.style.inset="0",l.style.width="100%",l.style.height="100%",l.style.display="block",l.style.pointerEvents="none",e.prepend(l);try{a=new u.WebGLRenderer({canvas:l,alpha:!1,antialias:!1,powerPreference:"high-performance"})}catch{return l.remove(),null}if(!a.capabilities.isWebGL2)return a.dispose(),l.remove(),null;a.autoClear=!1;let o=a.extensions.has("EXT_color_buffer_float")||a.extensions.has("EXT_color_buffer_half_float")?s.ix0:s.OUM,d=r.createElement("canvas").getContext("2d"),c=(n=24301,()=>{let e=n=n+0x6d2b79f5>>>0;return e=Math.imul(e^e>>>15,1|e),(((e^=e+Math.imul(e^e>>>7,61|e))^e>>>14)>>>0)/0x100000000}),m=new s.qUd(-1,1,1,-1,0,1),b=new s.bdM(2,2),T={uResolution:{value:new s.I9Y(1,1)},uPixelRatio:{value:1},uTrailLab:{value:new s.Pq0},uHeadLab:{value:new s.Pq0}},j=(e,t,a)=>new s.BKk({glslVersion:s.Wdf,uniforms:{...T,...a},vertexShader:e,fragmentShader:t,depthTest:!1,depthWrite:!1,transparent:!0,blending:s.bCz,blendEquation:s.gO9,blendSrc:s.qad,blendDst:s.qad,blendSrcAlpha:s.qad,blendDstAlpha:s.qad}),E=j(y,w,{uLineWidth:{value:1},uTrailGain:{value:1},uFade:{value:1.6}}),R=j(S,F,{uStarSize:{value:2.2},uTime:{value:0},uTwinkle:{value:.35},uHeadGain:{value:3},uHalo:{value:.07}}),H=(e,t)=>new s.BKk({glslVersion:s.Wdf,uniforms:t,vertexShader:C,fragmentShader:e,depthTest:!1,depthWrite:!1,blending:s.XIg}),U=H(L,{uSource:{value:null},uTexel:{value:new s.I9Y},uThreshold:{value:0},uFloor:{value:1}}),G=H(M,{uSource:{value:null},uBase:{value:null},uTexel:{value:new s.I9Y}}),P=H(k,{uLines:{value:null},uBloom:{value:null},uBackground:{value:new s.Pq0},uGlow:{value:.45},uExposure:{value:1},uMode:{value:0},uGrain:{value:.3},uSeed:{value:0}}),B=new Float32Array([0,-1,0,1,-1,0,0,1,0,1,1,0]),A=new Float32Array([-1,-1,0,1,-1,0,-1,1,0,1,1,0]),I=new s.CmU,O=new s.CmU,W=new s.eaF(I,E),q=new s.eaF(O,R);W.frustumCulled=!1,q.frustumCulled=!1;let z=new s.Z58;z.add(W,q);let D=new s.eaF(b,P);D.frustumCulled=!1;let N=new s.Z58;N.add(D);let _=(e,t)=>new s.nWS(Math.max(1,e),Math.max(1,t),{type:o,format:s.GWd,minFilter:s.k6q,magFilter:s.k6q,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1}),V=null,X=[],Y=[],K=0,Z=new Float32Array(0),$=null,Q=[],J={dx:0,dy:1,enter:0,exit:0},ee=!1,et=!1,ea=0,en=0,er=!0,ei=1,el=1,eo=1,eu=0,es=0,ed=0,ec=0,em=0,eh=0,ef=!1,ev="",ep=null,eg=null,ex=(e,t)=>{let a=new s.CmU;return a.setIndex([0,1,2,2,1,3]),a.setAttribute("position",new s.qtW(e,3)),a.setAttribute("aHead",new s.eHs(t,4,0)),a.setAttribute("aShape",new s.eHs(t,4,4)),a.setAttribute("aLook",new s.eHs(t,4,8)),a.instanceCount=0,a},eb=e=>{e<=K&&$||(Z=new Float32Array(12*(K=Math.max(64,2**Math.ceil(Math.log2(Math.max(e,1)))))),($=new s.LuO(Z,12,1)).setUsage(s.Vnu),I.dispose(),O.dispose(),I=ex(B,$),O=ex(A,$),W.geometry=I,q.geometry=O)},ey=()=>{V?.dispose(),X.forEach(e=>e.dispose()),Y.forEach(e=>e.dispose()),V=null,X=[],Y=[]},ew=()=>{let e=t.current;return!e.paused&&!e.reduced},eS=()=>{let e=t.current,a=h(f(e.originOffset,.18),0,2)*Math.min(ei,el),n=h(f(e.originShift,0),-1,1),r=e.direction,i=.5*ei*(1+n),l=-a,o=0,u=1,s=el;"down"===r?(l=el+a,u=-1):"left"===r||"right"===r?(i="left"===r?ei+a:-a,l=.5*el*(1-n),o="left"===r?-1:1,u=0,s=ei):"out"===r&&(l=.5*el,s=.5*Math.hypot(ei,el));let d="out"===r,c=d?Math.PI:h(f(e.spread,150),1,180)*Math.PI/360,m=-c,v=c;if(!d){let e=1/0,t=-1/0;for(let a=0;a<4;a++){let n=(1&a?ei:0)-i,r=(2&a?el:0)-l,s=Math.atan2(o*r-u*n,o*n+u*r);e=Math.min(e,s),t=Math.max(t,s)}m=Math.max(m,e),(v=Math.min(v,t))<m&&(m=0,v=0)}let p=d?0:4.5*h(f(e.focus,.35),0,1),g=e=>p<.001?e:Math.asinh(e*Math.sinh(p))/p;return{ox:i,oy:l,ax:o,ay:u,unit:Math.max(s,1),half:c,lo:m,hi:v,full:d,bend:p,from:g(m/c),to:g(v/c)}},eF=(e,t)=>{if(e.full)return(2*t-1)*Math.PI;let a=e.from+(e.to-e.from)*t;return e.half*(e.bend<.001?a:Math.sinh(e.bend*a)/Math.sinh(e.bend))},eC=(e,t)=>{let a=Math.cos(t),n=Math.sin(t),r=e.ax*a-e.ay*n,i=e.ax*n+e.ay*a,l=0,o=1/0;if(Math.abs(r)>1e-9){let t=-e.ox/r,a=(ei-e.ox)/r;l=Math.max(l,Math.min(t,a)),o=Math.min(o,Math.max(t,a))}else(e.ox<0||e.ox>ei)&&(o=-1);if(Math.abs(i)>1e-9){let t=-e.oy/i,a=(el-e.oy)/i;l=Math.max(l,Math.min(t,a)),o=Math.min(o,Math.max(t,a))}else(e.oy<0||e.oy>el)&&(o=-1);return J.dx=r,J.dy=i,J.enter=l/e.unit,J.exit=o/e.unit,J.exit-J.enter>1e-4},eL=(e,t,a)=>a<1e-4?e+t:(e+1/a)*Math.exp(a*t)-1/a,eM=(e,t,a,n)=>{if(t<=e)return e;if(a<1e-4)return e+(t-e)*n;let r=1/a;return(e+r)*Math.pow((t+r)/(e+r),n)-r},ek=e=>({q:0,angle:0,r:0,pace:.5,layer:1,gain:1,seed:0,glint:0,age:0,fade:0,retire:1,shell:e}),eT=(e,t,a,n,r)=>{for(let i=0;i<4;i++)if(e.q=c(),e.pace=c(),e.layer=c(),e.gain=.55+.45*c(),e.seed=c(),e.glint=+(.07>c()),eC(t,eF(t,e.q))){e.r=a?Math.max(J.enter-r,0):eM(J.enter,J.exit,n,c());return}e.r=0},ej=e=>{let a=t.current,n=ew(),r=eS(),i=h(f(a.speed,.16),0,2),l=h(f(a.speedVariance,.6),0,1),o=h(f(a.acceleration,.9),0,4),u=h(f(a.trailLength,.45),0,2),s=Math.max(h(f(a.fadeIn,.06),0,1),.01),d=h(f(a.fadeOut,.3),0,1),c=h(f(a.depth,.5),0,1),m=(2*h(f(a.starSize,2.2),0,8)+3)/r.unit,p=1+Math.max(em,0);((e,a,n)=>{let r=t.current,i=ew(),l=h(Math.sqrt(ei*el/921600),.35,1.6),o=Math.round(h(f(r.count,480),0,3e3)*h(f(r.quality,1),.25,1)*l),u=0;for(let e of Q)!e.shell&&e.retire>=1&&u++;if(u<o)for(let t=u;t<o;t++){let t=ek(!1);eT(t,e,!1,a,n),t.fade=.9*!!i,Q.push(t)}else if(u>o){let e=u-o;for(let t=Q.length-1;t>=0&&e>0;t--){let a=Q[t];!a.shell&&!(a.retire<1)&&(a.retire=.999*!!i,e--)}}})(r,o,m),eb(Q.length);let g=0,x=0;for(let t=0;t<Q.length;t++){let a=Q[t];if(e>0&&(a.age+=e,a.retire<1&&(a.retire-=e/.5)),a.retire<=0)continue;let h=a.shell?1:a.layer<c?.3+.35*(a.layer/Math.max(c,.001)):1,f=a.shell?1.9:Math.max(.05,1+.9*l*(2*a.pace-1))*(.35+.65*h),b=eC(r,a.shell?a.angle:eF(r,a.q));b&&e>0&&i>0&&(a.r=eL(a.r,i*f*p*e,o));let y=0,w=0;if(b){y=Math.min(u*f*(1+o*a.r)*p/(1+.6*o),Math.max(a.r-J.enter,0));let e=(a.r-J.enter)/(J.exit-J.enter);if(e>=1&&(d>0||a.r-y-m>=J.exit))b=!1;else{let t=v(0,s,e),a=d>0?1-v(1-d,1,e):1;w=t*t*a*a}}if(!b){if(a.shell)continue;eT(a,r,n,o,m),a.fade=0,Q[x++]=a;continue}if(Q[x++]=a,a.fade>0&&n&&(w*=v(0,a.fade,a.age)),a.retire<1&&(w*=v(0,1,a.retire)),(w*=a.gain*h*h)<=1e-4)continue;let S=12*g;Z[S]=r.ox+J.dx*a.r*r.unit,Z[S+1]=r.oy+J.dy*a.r*r.unit,Z[S+2]=J.dx,Z[S+3]=J.dy,Z[S+4]=y*r.unit,Z[S+5]=w,Z[S+6]=(.45+.55*h)*(1+.15*a.glint)*(.85+.3*(7.31*a.seed%1)),Z[S+7]=.55+.45*h,Z[S+8]=a.seed,Z[S+9]=a.glint,Z[S+10]=h,Z[S+11]=0,g++}Q.length=x,$&&($.clearUpdateRanges(),$.addUpdateRange(0,12*Math.max(g,1)),$.needsUpdate=!0),I.instanceCount=g,O.instanceCount=g},eE=()=>{let e=t.current;if(ee||!ew())return;let a=Math.round(h(f(e.burst,64),0,256));if(!a)return;let n=0;for(let e of Q)e.shell&&n++;let r=Math.min(a,4096-n);if(r<=0)return;let i=eS();for(let e=0;e<r;e++){let t=ek(!0);t.angle=i.lo+(i.hi-i.lo)*(e+.5+(c()-.5)*.6)/r,eC(i,t.angle)&&(t.r=J.enter+.003,t.seed=c(),t.glint=.6,t.fade=.14,Q.push(t))}eG()},eR=(e,t)=>{D.material=e,a.setRenderTarget(t),a.render(N,m)},eH=()=>{let e,n,r,i;if(!V||!X.length||et||ee)return;e=t.current,(()=>{let e=t.current,[a="#5227FF",n="#FF9FFC"]=e.colors??[],r=[a,n,e.backgroundColor,e.mode].join("|");if(r===ev)return;ev=r;let i=p(d,e.backgroundColor,[.04,.04,.04]),l=.2126*i[0]+.7152*i[1]+.0722*i[2];ef="ink"===e.mode||"auto"===e.mode&&l>.5;let o=x(p(d,a,[.08,.72,.65])),u=x(p(d,n,[.8,1,.96]));if(ef){let e,t,a=(e=o,t=u,[e[0]+(t[0]-e[0])*.35,e[1]+(t[1]-e[1])*.35,e[2]+(t[2]-e[2])*.35]);o=[Math.min(o[0],.58),1.08*o[1],1.08*o[2]],u=[Math.min(a[0],.4),1.15*a[1],1.15*a[2]]}T.uTrailLab.value.set(o[0],o[1],o[2]),T.uHeadLab.value.set(u[0],u[1],u[2]),P.uniforms.uBackground.value.set(g(i[0]),g(i[1]),g(i[2]))})(),T.uResolution.value.set(l.width,l.height),T.uPixelRatio.value=l.width/ei,(n=E.uniforms).uLineWidth.value=h(f(e.lineWidth,1),.25,4),n.uTrailGain.value=ef?1:.6,n.uFade.value=h(f(e.trailFade,1.6),.2,6),(r=R.uniforms).uStarSize.value=h(f(e.starSize,2.2),0,8),r.uTime.value=eu,r.uTwinkle.value=h(f(e.twinkle,.35),0,1),r.uHeadGain.value=ef?1.6:1.7,r.uHalo.value=.04*!ef,(i=P.uniforms).uGlow.value=h(f(e.glow,.45),0,3),i.uExposure.value=(ef?1.8:1)*h(f(e.intensity,1),0,4),i.uMode.value=+!!ef,i.uGrain.value=h(f(e.grain,.3),0,1),i.uSeed.value=es,a.setRenderTarget(V),a.setClearColor(0,0),a.clear(),a.render(z,m);let o=V;for(let e of X){let t=o===V;U.uniforms.uSource.value=o.texture,U.uniforms.uTexel.value.set(1/o.width,1/o.height),U.uniforms.uThreshold.value=t&&!ef?.3:0,U.uniforms.uFloor.value=t&&!ef?.22:1,eR(U,e),o=e}let u=X[X.length-1];for(let e=X.length-2;e>=0;e--)G.uniforms.uSource.value=u.texture,G.uniforms.uBase.value=X[e].texture,G.uniforms.uTexel.value.set(1/u.width,1/u.height),eR(G,Y[e]),u=Y[e];P.uniforms.uLines.value=V.texture,P.uniforms.uBloom.value=u.texture,eR(P,null)},eU=e=>{if(ea=0,ee||et)return;let a=en>0?h((e-en)/1e3,0,.05):1/60;en=e;let n=ew();if(n){let e,n,r;eu+=a,es=(es+.618034)%1,e=t.current,n=Math.max(Math.hypot(ei,el),1),r=e.interactive?ed/Math.max(a,1/240)/n:0,ed=0,ec=Math.max(2*h(f(e.thrust,1),0,3)*(1-Math.exp(-r/.8)),ec*Math.exp(-a/.25)),eh+=(42.25*(ec-em)-13*eh)*a,(em+=eh*a)<0&&(em=0,eh=Math.max(eh,0)),ej(a)}else ej(0);eH(),n&&er&&!r.hidden?ea=i.requestAnimationFrame(eU):en=0};function eG(){ee||et||ea||!er||(ea=i.requestAnimationFrame(eU))}let eP=()=>Math.min(i.devicePixelRatio||1,2)*h(f(t.current.quality,1),.25,1),eB=()=>{if(ee)return;let t=e.getBoundingClientRect();ei=Math.max(1,e.clientWidth||t.width),el=Math.max(1,e.clientHeight||t.height),eo=eP(),a.setPixelRatio(eo),a.setSize(ei,el,!1);let n=l.width,r=l.height;ey(),V=_(n,r);let i=h(Math.floor(Math.log2(Math.min(n,r)/8)),3,7);for(let e=1;e<=i;e++)X.push(_(Math.max(1,n>>e),Math.max(1,r>>e))),Y.push(_(Math.max(1,n>>e),Math.max(1,r>>e)));ej(0),eH(),eG()},eA=e=>{let a=t.current;if("touch"===e.pointerType||!a.interactive||!ew()){ep=null;return}ep&&(ed+=Math.hypot(e.clientX-ep.x,e.clientY-ep.y)),ep={x:e.clientX,y:e.clientY},eG()},eI=()=>{ep=null,eg=null},eO=e=>{var a;if(eg=null,!(!t.current.interactive||!e.isPrimary||(a=e.target)&&"function"==typeof a.closest&&a.closest("a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]"))){if("touch"===e.pointerType){eg={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()};return}0===e.button&&eE()}},eW=e=>{let t=eg;eg=null,!t||t.id!==e.pointerId||Math.hypot(e.clientX-t.x,e.clientY-t.y)>10||performance.now()-t.time>500||eE()},eq=()=>{en=0,r.hidden||eG()},ez=e=>{e.preventDefault(),et=!0,i.cancelAnimationFrame(ea),ea=0,en=0},eD=()=>{et=!1,ev="",V=null,X=[],Y=[],D.geometry=b=new s.bdM(2,2),I=new s.CmU,O=new s.CmU,$=null,K=0,eB()};e.addEventListener("pointermove",eA),e.addEventListener("pointerleave",eI),e.addEventListener("pointercancel",eI),e.addEventListener("pointerdown",eO),e.addEventListener("pointerup",eW),r.addEventListener("visibilitychange",eq),l.addEventListener("webglcontextlost",ez),l.addEventListener("webglcontextrestored",eD);let eN=new ResizeObserver(eB);eN.observe(e);let e_=new IntersectionObserver(e=>{er=e.some(e=>e.isIntersecting),en=0,er&&eG()},{rootMargin:"80px"});return e_.observe(e),eb(64),eB(),{sync:()=>{if(!ee&&!et){if(Math.abs(eP()-eo)>.001)return void eB();ea||(ej(0),eH()),eG()}},destroy:()=>{ee=!0,i.cancelAnimationFrame(ea),ea=0,e.removeEventListener("pointermove",eA),e.removeEventListener("pointerleave",eI),e.removeEventListener("pointercancel",eI),e.removeEventListener("pointerdown",eO),e.removeEventListener("pointerup",eW),r.removeEventListener("visibilitychange",eq),l.removeEventListener("webglcontextlost",ez),l.removeEventListener("webglcontextrestored",eD),eN.disconnect(),e_.disconnect(),ey(),I.dispose(),O.dispose(),b.dispose(),[E,R,U,G,P].forEach(e=>e.dispose()),a.dispose(),a.forceContextLoss(),l.remove()},burst:eE}})(e,ea);return ee.current=t,()=>{t?.destroy(),ee.current=null}},[]),(0,r.useImperativeHandle)(Q,()=>({burst:()=>ee.current?.burst()}),[]),(0,n.jsx)("div",{ref:J,className:(0,d.cn)("relative isolate h-full min-h-[240px] w-full overflow-hidden",K),style:{backgroundColor:t,...Z},children:$&&(0,n.jsx)("div",{className:"relative z-10 h-full w-full",children:$})})});T.displayName="FadingStars";let j={dark:["#5227FF","#FF9FFC"],light:["#5B3BFF","#9D1FA8"],direction:"up",spread:150,focus:.35,originOffset:.18,count:480,speed:.16,acceleration:.9,trailLength:.45},E={violet:j,signal:{...j,dark:["#14B8A6","#CCFFF4"],light:["#0D9488","#134E4A"]},ember:{...j,dark:["#FF7A27","#FFD9A8"],light:["#E8590C","#9A3412"]},rain:{...j,dark:["#9CC7FF","#EAF4FF"],light:["#3B6FB6","#1E3A66"],direction:"down",spread:36,focus:.1,originOffset:2,speed:.28,acceleration:.3,trailLength:.35},warp:{...j,dark:["#C9C2FF","#FFFFFF"],light:["#5B4FC4","#24204F"],direction:"out",count:700,acceleration:2.2,trailLength:.7},dawn:{...j,dark:["#FF7EA8","#FFE0B5"],light:["#D9466F","#9A3A1C"],direction:"up",spread:90,focus:.6}},R=[{label:"Violet",value:"violet"},{label:"Signal",value:"signal"},{label:"Ember",value:"ember"},{label:"Rain",value:"rain"},{label:"Warp",value:"warp"},{label:"Dawn",value:"dawn"}],H=[{label:"Auto",value:"auto"},{label:"Glow",value:"glow"},{label:"Ink",value:"ink"}],U=[{label:"Up",value:"up"},{label:"Down",value:"down"},{label:"Left",value:"left"},{label:"Right",value:"right"},{label:"Out",value:"out"}],G=[{name:"colors",type:"[string, string]",default:'["#5227FF", "#FF9FFC"]',description:"Trail colour and head colour. The end of each trail warms toward the head colour, and distant stars blend the two in OKLab. On light backgrounds both are deepened into ink tones."},{name:"backgroundColor",type:"string",default:'"#0a0a0a"',description:"Colour behind the stars."},{name:"mode",type:'"auto" | "glow" | "ink"',default:'"auto"',description:"glow adds light for dark backgrounds, ink draws fine dark lines for light ones. auto picks from the background brightness."},{name:"direction",type:'"up" | "down" | "left" | "right" | "out"',default:'"up"',description:"Direction the stars travel. up, down, left and right stream from an origin beyond the opposite edge; out radiates in every direction from the centre."},{name:"spread",type:"number",default:"150",description:"Width of the fan in degrees, from 1 to 180. Ignored by out, which always covers 360\xb0."},{name:"focus",type:"number",default:"0.35",description:"How strongly stars gather toward the centre line of the fan, from 0 (even) to 1."},{name:"originOffset",type:"number",default:"0.18",description:"How far beyond the edge the origin sits, as a fraction of the frame's shorter side. Larger values make the rays more parallel."},{name:"originShift",type:"number",default:"0",description:"Position of the origin along its edge, from -1 (left or top) to 1 (right or bottom). With out it moves the centre horizontally."},{name:"count",type:"number",default:"480",description:"Number of stars in a 1280\xd7720 frame, up to 3,000. Smaller frames show proportionally fewer."},{name:"speed",type:"number",default:"0.16",description:"Base travel speed, in frame lengths per second along the direction of travel."},{name:"speedVariance",type:"number",default:"0.6",description:"How much speed differs from star to star, from 0 (all equal) to 1."},{name:"acceleration",type:"number",default:"0.9",description:"Warp acceleration: stars gather speed as they move away from the origin, from 0 to 4."},{name:"trailLength",type:"number",default:"0.45",description:"Trail length as a fraction of the frame at base speed. Trails scale with each star's current speed, so faster stars streak longer."},{name:"trailFade",type:"number",default:"1.6",description:"Falloff along each trail from head to tail. Higher values give shorter, sharper tails."},{name:"lineWidth",type:"number",default:"1",description:"Width of the trails in pixels. Distant stars draw thinner."},{name:"starSize",type:"number",default:"2.2",description:"Diameter of the star heads in pixels. 0 hides them."},{name:"twinkle",type:"number",default:"0.35",description:"How much the heads shimmer, from 0 to 1."},{name:"fadeIn",type:"number",default:"0.06",description:"Share of the path over which a star fades in after entering the frame, from 0 to 1."},{name:"fadeOut",type:"number",default:"0.3",description:"Share of the path over which a star fades out before reaching the far edge, from 0 to 1. At 0 stars leave the frame instead."},{name:"depth",type:"number",default:"0.5",description:"Share of stars that sit further back: smaller, dimmer and slower, for parallax. From 0 to 1."},{name:"glow",type:"number",default:"0.45",description:"Soft halo around the brightest heads, from 0 to 3."},{name:"intensity",type:"number",default:"1",description:"Overall exposure."},{name:"grain",type:"number",default:"0.3",description:"Fine film grain on lit areas, from 0 to 1. The background stays clean."},{name:"interactive",type:"boolean",default:"true",description:"Respond to the pointer."},{name:"thrust",type:"number",default:"1",description:"Moving the pointer over the stars speeds up the flow in proportion to pointer speed, stretching the trails, then it eases back over about a second. From 0 to 3."},{name:"burst",type:"number",default:"64",description:"Clicking or tapping launches a shell of this many stars at once, which rises as an expanding arc. Bursts stack. 0 turns it off."},{name:"paused",type:"boolean",default:"false",description:"Freeze the stars. Reduced-motion users always get a still frame."},{name:"quality",type:"number",default:"1",description:"Resolution and star count scale from 0.25 to 1. Lower values are cheaper on large screens."},{name:"ref",type:"{ burst }",default:"—",description:"burst() launches a shell of stars, for example when a form is submitted."},{name:"children",type:"ReactNode",default:"—",description:"Content placed over the stars."},{name:"className",type:"string",default:"—",description:"Classes for the root element. It fills its parent, with a 240px minimum height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."}],P=()=>{let[e,t]=(0,o.I)(),a="dark"===(0,l.Y)(),[u,s]=(0,r.useState)("violet"),[d,c]=(0,r.useState)(j),m=e=>t=>c(a=>({...a,[e]:t})),[h,f]=(0,r.useState)(null),v=h??(a?d.dark:d.light),p=e=>t=>{let a=[...v];a[e]=t,f(a)},[g,x]=(0,r.useState)(null),b=g??(a?"#0A0A0A":"#FFFFFF"),[y,w]=(0,r.useState)("auto"),[S,F]=(0,r.useState)(0),[C,L]=(0,r.useState)(.6),[M,k]=(0,r.useState)(1.6),[P,B]=(0,r.useState)(1),[A,I]=(0,r.useState)(2.2),[O,W]=(0,r.useState)(.35),[q,z]=(0,r.useState)(.06),[D,N]=(0,r.useState)(.3),[_,V]=(0,r.useState)(.5),[X,Y]=(0,r.useState)(.45),[K,Z]=(0,r.useState)(1),[$,Q]=(0,r.useState)(.3),[J,ee]=(0,r.useState)(1),[et,ea]=(0,r.useState)(64),[en,er]=(0,r.useState)(1),[ei,el]=(0,r.useState)(!0),[eo,eu]=(0,r.useState)(!1);return(0,n.jsxs)("div",{children:[(0,n.jsx)(i.Bg,{}),(0,n.jsxs)(i.VX,{children:[(0,n.jsxs)(i.Ec,{children:[(0,n.jsx)(i.Ch,{onRefresh:t,minHeight:600,enableResponsive:!0,children:(0,n.jsx)("div",{className:"relative h-full w-full",children:(0,n.jsx)(T,{colors:v,backgroundColor:b,mode:y,direction:d.direction,spread:d.spread,focus:d.focus,originOffset:d.originOffset,originShift:S,count:d.count,speed:d.speed,speedVariance:C,acceleration:d.acceleration,trailLength:d.trailLength,trailFade:M,lineWidth:P,starSize:A,twinkle:O,fadeIn:q,fadeOut:D,depth:_,glow:X,intensity:K,grain:$,interactive:ei,thrust:J,burst:et,paused:eo,quality:en},e)})}),(0,n.jsxs)(i.IH,{children:[(0,n.jsx)(i.bg,{title:"Preset",value:u,options:R,onChange:e=>{s(e),c(E[e]??j),f(null)}}),(0,n.jsx)(i.bg,{title:"Mode",value:y,options:H,onChange:e=>w(e)}),(0,n.jsx)(i.bg,{title:"Direction",value:d.direction,options:U,onChange:e=>m("direction")(e)}),(0,n.jsx)(i.W7,{title:"Trail",value:v[0],onChange:p(0)}),(0,n.jsx)(i.W7,{title:"Head",value:v[1],onChange:p(1)}),(0,n.jsx)(i.W7,{title:"Background",value:b,onChange:x}),(0,n.jsx)(i.yt,{title:"Spread",min:1,max:180,step:1,value:d.spread,valueUnit:"\xb0",onChange:m("spread")}),(0,n.jsx)(i.yt,{title:"Focus",min:0,max:1,step:.01,value:d.focus,onChange:m("focus")}),(0,n.jsx)(i.yt,{title:"Origin Offset",min:0,max:2,step:.01,value:d.originOffset,onChange:m("originOffset")}),(0,n.jsx)(i.yt,{title:"Origin Shift",min:-1,max:1,step:.01,value:S,onChange:F}),(0,n.jsx)(i.yt,{title:"Count",min:0,max:1500,step:10,value:d.count,onChange:m("count")}),(0,n.jsx)(i.yt,{title:"Speed",min:0,max:1,step:.01,value:d.speed,onChange:m("speed")}),(0,n.jsx)(i.yt,{title:"Speed Variance",min:0,max:1,step:.01,value:C,onChange:L}),(0,n.jsx)(i.yt,{title:"Acceleration",min:0,max:4,step:.05,value:d.acceleration,onChange:m("acceleration")}),(0,n.jsx)(i.yt,{title:"Trail Length",min:0,max:2,step:.01,value:d.trailLength,onChange:m("trailLength")}),(0,n.jsx)(i.yt,{title:"Trail Fade",min:.2,max:6,step:.05,value:M,onChange:k}),(0,n.jsx)(i.yt,{title:"Line Width",min:.25,max:4,step:.05,value:P,valueUnit:"px",onChange:B}),(0,n.jsx)(i.yt,{title:"Star Size",min:0,max:8,step:.1,value:A,valueUnit:"px",onChange:I}),(0,n.jsx)(i.yt,{title:"Twinkle",min:0,max:1,step:.01,value:O,onChange:W}),(0,n.jsx)(i.yt,{title:"Fade In",min:0,max:1,step:.01,value:q,onChange:z}),(0,n.jsx)(i.yt,{title:"Fade Out",min:0,max:1,step:.01,value:D,onChange:N}),(0,n.jsx)(i.yt,{title:"Depth",min:0,max:1,step:.01,value:_,onChange:V}),(0,n.jsx)(i.yt,{title:"Glow",min:0,max:3,step:.05,value:X,onChange:Y}),(0,n.jsx)(i.yt,{title:"Intensity",min:.2,max:3,step:.05,value:K,onChange:Z}),(0,n.jsx)(i.yt,{title:"Grain",min:0,max:1,step:.01,value:$,onChange:Q}),(0,n.jsx)(i.yt,{title:"Thrust",min:0,max:3,step:.05,value:J,onChange:ee}),(0,n.jsx)(i.yt,{title:"Burst",min:0,max:256,step:1,value:et,onChange:ea}),(0,n.jsx)(i.yt,{title:"Quality",min:.25,max:1,step:.05,value:en,onChange:er}),(0,n.jsx)(i.tl,{title:"Interactive",checked:ei,onChange:el}),(0,n.jsx)(i.tl,{title:"Paused",checked:eo,onChange:eu})]}),(0,n.jsx)(i.Ub,{data:G})]}),(0,n.jsx)(i.lT,{children:(0,n.jsx)(i.Gv,{})})]})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>o});var n=a(12115),r=a(30701);let i=()=>()=>{},l=()=>"light";function o(){let{resolvedTheme:e}=(0,r.D)();return(0,n.useSyncExternalStore)(i,()=>"dark"===e?"dark":"light",l)}},90761:(e,t,a)=>{a.d(t,{I:()=>r});var n=a(12115);function r(){let[e,t]=(0,n.useState)(0),a=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);