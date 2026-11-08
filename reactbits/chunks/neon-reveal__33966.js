"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[33966],{11585:(e,t,a)=>{a.r(t),a.d(t,{default:()=>N});var l=a(95155),n=a(12115),r=a(56388),o=a(86049),i=a(90761),u=a(2253),s=a(12246),c=a(90650);let h=["#FF9FFC","#B163E9"],d="linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0))",m=(e,t,a)=>Math.min(a,Math.max(t,e)),p=(e,t)=>Number.isFinite(e)?e:t,f=(e,t,a)=>{let l=m((a-e)/(t-e),0,1);return l*l*(3-2*l)},v={out:e=>1-Math.pow(1-e,3),smooth:e=>e<.5?4*e*e*e:1-Math.pow(-2*e+2,3)/2,gentle:e=>.5-.5*Math.cos(Math.PI*e),linear:e=>e},g=e=>{let t=e>>>0;return()=>{let e=t=t+0x6d2b79f5>>>0;return e=Math.imul(e^e>>>15,1|e),(((e^=e+Math.imul(e^e>>>7,61|e))^e>>>14)>>>0)/0x100000000}},x=new u.Q1f,b=e=>{let t=e.trim().toLowerCase();if(!t||"transparent"===t||"none"===t||"auto"===t)return null;let a=/^rgba?\(([^)]+)\)$/.exec(t);if(a){let e=a[1].split(/[\s,/]+/).filter(Boolean).map(e=>Number.parseFloat(e)),t=e.length>3&&Number.isFinite(e[3])?m(e[3],0,1):1;return[[(e[0]??0)/255,(e[1]??0)/255,(e[2]??0)/255],t]}try{x.setStyle(t,u.jf0)}catch{return null}return[[x.r,x.g,x.b],1]},w=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),y=([e,t,a])=>{let l=w(e),n=w(t),r=w(a),o=Math.cbrt(.4122214708*l+.5363325363*n+.0514459929*r),i=Math.cbrt(.2119034982*l+.6806995451*n+.1073969566*r),u=Math.cbrt(.0883024619*l+.2817188376*n+.6299787005*r),s=1.9779984951*o-2.428592205*i+.4505937099*u,c=.0259040371*o+.7827717662*i-.808675766*u;return[.2104542553*o+.793617785*i-.0040720468*u,Math.hypot(s,c),Math.atan2(c,s)]},C=([e,t,a])=>{let l=t*Math.cos(a),n=t*Math.sin(a),r=Math.pow(e+.3963377774*l+.2158037573*n,3),o=Math.pow(e-.1055613458*l-.0638541728*n,3),i=Math.pow(e-.0894841775*l-1.291485548*n,3);return[4.0767416621*r-3.3077115913*o+.2309699292*i,-1.2684380046*r+2.6097574011*o-.3413193965*i,-.0041960863*r-.7034186147*o+1.707614701*i]},k=(e,t,a)=>{let l=t=>C([e,t,a]).every(e=>e>=-5e-4&&e<=1.0005);if(l(t))return[e,t,a];let n=0,r=t;for(let e=0;e<14;e++){let e=(n+r)/2;l(e)?n=e:r=e}return[e,n,a]},M=e=>C(e).map(e=>{let t;return m((t=m(e,0,1))<=.0031308?12.92*t:1.055*Math.pow(Math.max(t,0),1/2.4)-.055,0,1)}),F=e=>`#${e.map(e=>Math.round(255*m(e,0,1)).toString(16).padStart(2,"0")).join("")}`,S=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},P=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,I=`
in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,L=`
precision highp float;
uniform vec2 uRes;
uniform float uAxis;
uniform float uFlip;
uniform vec2 uSegment;
uniform vec2 uSpan;
uniform float uInset;
uniform float uMirror;
uniform float uSpread;
uniform float uTaper;
uniform float uLight;
uniform float uRadius;
uniform float uHalo;
uniform float uBloom;
uniform float uGlow;
uniform float uPower;
uniform float uGlass;
uniform float uTime;
uniform float uHum;
uniform float uScale;
uniform vec3 uTubeColor;
uniform vec3 uTubeLch;
uniform vec3 uMidLch;
uniform vec3 uDeepLch;
uniform float uInk;
uniform vec3 uInkTube;
uniform vec3 uInkCore;
uniform vec3 uPastelTube;
uniform vec3 uPastelMid;
uniform vec3 uPastelDeep;
uniform vec3 uBg;
uniform float uBgAlpha;
out vec4 fragColor;

const float PI = 3.14159265359;

vec3 lchToLinear(vec3 lch) {
  vec3 lab = vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z));
  vec3 lms = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.291485548) * lab;
  lms = lms * lms * lms;
  return clamp(mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * lms, 0.0, 1.0);
}

vec3 lchMix(vec3 a, vec3 b, float t) {
  float turn = mod(b.z - a.z + PI, 2.0 * PI) - PI;
  return vec3(mix(a.x, b.x, t), mix(a.y, b.y, t), a.z + turn * t);
}

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float hash(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

float noise(float x) {
  float i = floor(x);
  float f = fract(x);
  float w = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix((hash(i) * 2.0 - 1.0) * f, (hash(i + 1.0) * 2.0 - 1.0) * (f - 1.0), w) * 2.0;
}

float pour(float along, float depth) {
  if (depth <= 0.0 || uSegment.y <= uSegment.x) return 0.0;
  float from = atan(uSegment.x - along, depth);
  float to = atan(uSegment.y - along, depth);
  float stride = (to - from) / 16.0;
  float centre = 0.5 * (uSpan.x + uSpan.y);
  float extent = max(0.5 * (uSpan.y - uSpan.x), 0.0001);
  float sum = 0.0;
  for (int i = 0; i < 16; i++) {
    float angle = from + (float(i) + 0.5) * stride;
    float r = clamp(abs(along + depth * tan(angle) - centre) / extent, 0.0, 1.0);
    sum += (1.0 - uTaper * r * r) * exp(-uSpread * depth / cos(angle));
  }
  return sum * stride / (2.0 * PI);
}

vec4 tube(float along, float depth, vec2 size) {
  float dv = (depth - uInset) * size.y;
  float du = max(max(uSegment.x - along, along - uSegment.y), 0.0) * size.x;
  float d = length(vec2(du, dv));
  float lit = smoothstep(0.0, 1.0, (uSegment.y - uSegment.x) * size.x / max(uRadius, 1.0));
  float body = exp(-d * d / (uRadius * uRadius)) * lit;
  float halo = exp(-d / uHalo) * (1.0 - smoothstep(5.0 * uHalo, 7.0 * uHalo, d)) * lit;
  float bloom = exp(-d / uBloom) * (1.0 - smoothstep(5.0 * uBloom, 7.0 * uBloom, d)) * lit;
  float gu = max(max(uSpan.x - along, along - uSpan.y), 0.0) * size.x;
  float g = length(vec2(gu, dv)) / max(uRadius, 0.75);
  return vec4(body, halo, bloom, exp(-g * g));
}

float dither(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))) - 0.5;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float along = mix(uv.x, uv.y, uAxis);
  float depth = mix(uv.y, uv.x, uAxis);
  depth = mix(depth, 1.0 - depth, uFlip);
  vec2 size = mix(uRes, uRes.yx, uAxis);
  float below = depth - uInset;
  float light = pour(along, below) * smoothstep(0.0, uHalo, below * size.y);
  vec4 glass = tube(along, depth, size);
  if (uMirror > 0.5) {
    float back = 1.0 - depth - uInset;
    light += pour(along, back) * smoothstep(0.0, uHalo, back * size.y);
    glass += tube(along, 1.0 - depth, size);
  }
  float shimmer = 1.0 + uHum * 0.05 * noise(along * size.x / (140.0 * uScale) + uTime * 0.23);
  float power = uPower * shimmer;
  float k = light * uLight;
  float a = 1.2 * k;
  float q = k * (a + 1.0 - sqrt((a - 1.0) * (a - 1.0) + 0.01)) * 0.5;
  float grain = dither(gl_FragCoord.xy) / 255.0;

  if (uInk < 0.5) {
    vec3 lch = lchMix(uDeepLch, uMidLch, smoothstep(0.1, 0.95, q));
    lch = lchMix(lch, uTubeLch, smoothstep(0.9, 1.8, q));
    float raw = 0.576 * pow(max(q, 0.000001), 0.625);
    float L = raw < 0.8 ? raw : 0.8 + 0.17 * (1.0 - exp(-(raw - 0.8) / 0.17));
    float C = lch.y * smoothstep(-0.05, 0.36, L) * clamp((1.0 - L) / 0.12, 0.0, 1.0);
    vec3 dome = encode(lchToLinear(vec3(L, C, lch.z)));
    vec3 emission = (uTubeColor * (glass.x * 9.0 + glass.y * 1.3 * uGlow + glass.z * 0.1 * uGlow) + glass.x * glass.x * 2.2) * power;
    emission += mix(uTubeColor, vec3(1.0), 0.6) * glass.w * uGlass;
    vec3 rim = encode(1.0 - exp(-emission));
    vec3 color = 1.0 - (1.0 - dome) * (1.0 - rim);
    if (uBgAlpha > 0.5) {
      fragColor = vec4(clamp(1.0 - (1.0 - uBg) * (1.0 - color) + grain, 0.0, 1.0), 1.0);
    } else {
      float alpha = max(color.r, max(color.g, color.b));
      fragColor = vec4(color / max(alpha, 0.0001), clamp(alpha + grain, 0.0, 1.0));
    }
    return;
  }

  vec3 plch = lchMix(uPastelDeep, uPastelMid, smoothstep(0.15, 0.9, q));
  plch = lchMix(plch, uPastelTube, smoothstep(0.85, 1.8, q));
  vec3 pastel = encode(lchToLinear(plch));
  float amount = q + (glass.y * 0.3 + glass.z * 0.25) * uGlow * power;
  float washCover = pow(1.0 - exp(-amount * 1.5), 1.35) * 0.94;
  float glassCover = glass.w * uGlass * 7.0;
  float tubeCover = 1.0 - exp(-(glass.x * 6.0 + glass.y * glass.y * 0.9 * uGlow) * power);
  float coreCover = (1.0 - exp(-glass.x * 2.0 * power)) * 0.5;
  vec3 ink = pastel * washCover;
  float alpha = washCover;
  ink = encode(lchToLinear(uPastelTube)) * glassCover + ink * (1.0 - glassCover);
  alpha = glassCover + alpha * (1.0 - glassCover);
  ink = uInkTube * tubeCover + ink * (1.0 - tubeCover);
  alpha = tubeCover + alpha * (1.0 - tubeCover);
  ink = uInkCore * coreCover + ink * (1.0 - coreCover);
  alpha = coreCover + alpha * (1.0 - coreCover);
  if (uBgAlpha > 0.5) {
    fragColor = vec4(clamp(uBg * (1.0 - alpha) + ink + grain, 0.0, 1.0), 1.0);
  } else {
    fragColor = vec4(ink / max(alpha, 0.0001), clamp(alpha + grain, 0.0, 1.0));
  }
}
`,j=(0,n.forwardRef)(function({colors:e,backgroundColor:t="transparent",direction:a="down",expandFrom:r="center",trigger:o,revealDelay:i=0,revealDuration:x=2500,easing:w="out",thickness:j,glow:T=1,spill:D=1,reach:E,intensity:R=1,feather:B=.15,inset:z,length:A,mirrored:q=!1,hum:N=1,flicker:H=1,interactive:G=!0,intro:W=!0,paused:$=!1,dpr:O=2,scrollThreshold:U=.3,onStart:V,onComplete:Y,className:_,style:X,children:Q,verticalOffset:Z,color:J,barWidth:K,barHeight:ee,animateOnScroll:et=!1,glowSpread:ea},el){var en;let er,eo,ei,eu,es,ec=(0,n.useRef)(null),eh=(0,n.useRef)(null),ed=(0,n.useRef)(null),em=(0,n.useRef)(null),ep=(0,n.useSyncExternalStore)(S,P,()=>!1),ef="vertical"===a?"right":"up"===a||"left"===a||"right"===a?a:"down",[ev]=(0,n.useState)(()=>W&&!$?{WebkitMaskImage:d,maskImage:d}:{}),eg={colors:e??(void 0!==J?(en=p(J,200)+15,er=(en%360+360)%360/360,eo=.3875000000000002,[F((eu=[(ei=e=>{let t=er+e;return(t<0&&(t+=1),t>1&&(t-=1),t<1/6)?eo+(.9124999999999999-eo)*6*t:t<.5?.9124999999999999:t<2/3?eo+(.9124999999999999-eo)*(2/3-t)*6:eo})(1/3),ei(0),ei(-1/3)]).map(e=>1.7*e)),F(eu)]):h),backgroundColor:t,direction:ef,origin:"left"===r?-1:+("right"===r),trigger:o??(et?"inView":"mount"),delay:Math.max(p(i,0),0)/1e3,duration:Math.max(p(x,2500),50)/1e3,easing:w,thickness:j??(void 0!==ee?m(150*p(ee,.02),1,12):3),glow:T,spill:D,reach:E??(void 0!==ea?.5/Math.max(p(ea,.5),.05):1),intensity:R,feather:B,inset:z??24,offset:void 0===z&&void 0!==Z?(es=m(p(Z,1),0,1),"down"===ef||"left"===ef?1-es:es):-1,length:A??K??.9,mirrored:q,hum:N,flicker:H,interactive:G,intro:W,paused:$,dpr:O,threshold:U,reduced:ep,onStart:V,onComplete:Y},ex=(0,n.useRef)(eg);(0,n.useEffect)(()=>{ex.current=eg,em.current?.sync()}),(0,n.useEffect)(()=>{let e=ec.current,t=eh.current;if(!e||!t)return;let a=function(e,t,a,l){let n,r=e.ownerDocument,o=r.defaultView??window;try{n=new s.WebGLRenderer({alpha:!0,premultipliedAlpha:!1,antialias:!1,powerPreference:"high-performance"})}catch{return null}n.setClearColor(0,0);let i=n.domElement;i.setAttribute("aria-hidden","true"),i.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block",t.appendChild(i);let c={uRes:{value:new u.I9Y(1,1)},uAxis:{value:0},uFlip:{value:1},uSegment:{value:new u.I9Y(.5,.5)},uSpan:{value:new u.I9Y(0,1)},uInset:{value:0},uMirror:{value:0},uSpread:{value:1.5},uTaper:{value:.5},uLight:{value:0},uRadius:{value:2},uHalo:{value:8},uBloom:{value:30},uGlow:{value:1},uPower:{value:0},uGlass:{value:.05},uTime:{value:0},uHum:{value:1},uScale:{value:1},uTubeColor:{value:new u.Pq0(1,1,1)},uTubeLch:{value:new u.Pq0},uMidLch:{value:new u.Pq0},uDeepLch:{value:new u.Pq0},uInk:{value:0},uInkTube:{value:new u.Pq0},uInkCore:{value:new u.Pq0},uPastelTube:{value:new u.Pq0},uPastelMid:{value:new u.Pq0},uPastelDeep:{value:new u.Pq0},uBg:{value:new u.Pq0},uBgAlpha:{value:0}},h=new u.D$Q({glslVersion:u.Wdf,vertexShader:I,fragmentShader:L,uniforms:c,transparent:!1,blending:u.XIg,depthTest:!1,depthWrite:!1}),x=new u.LoY;x.setAttribute("position",new u.qtW([-1,-1,0,3,-1,0,-1,3,0],3));let w=new u.eaF(x,h);w.frustumCulled=!1;let F=new u.Z58;F.add(w);let S=new u.qUd(-1,1,1,-1,0,1),P=0,j=0,T=1,D=!1,E="",R=-10,B=0,z=0,A=!1,q=!1,N=!1,H=!1,G=0,W=0,$=0,O=0,U=7,V={flicks:[],on:0,attack:.3,growAt:.4},Y=0,_=0,X=0,Q=.04,Z=0,J=0,K=0,ee=1,et="",ea=null,el=[],en=()=>{let e=l.current.direction;return"left"===e||"right"===e},er=(e,t=!1)=>{let a=l.current,n=(t?1:m(p(a.length,.9),.05,1))*m(e,0,1);return a.origin<0?[0,n]:a.origin>0?[1-n,1]:[.5-n/2,.5+n/2]},eo=()=>1+m(p(l.current.hum,1),0,2)*(.025*Math.sin(G*Math.PI*2/4.3)+.015*Math.sin(G*Math.PI*2/1.9+1.7)),ei=()=>{let t=l.current,a=b(t.backgroundColor),n=a?a[0]:(()=>{let t=e.parentElement;for(;t;){let e=o.getComputedStyle(t).backgroundColor.match(/rgba?\(([^)]+)\)/);if(e){let t=e[1].split(/[\s,/]+/).filter(Boolean).map(e=>Number.parseFloat(e));if(t.length<4||t[3]>.05)return[t[0]/255,t[1]/255,t[2]/255]}t=t.parentElement}return o.matchMedia("(prefers-color-scheme: dark)").matches?[.04,.04,.04]:[1,1,1]})(),r=!!a&&a[1]>.995,i=[t.colors[0],t.colors[1],n.join(","),r].join("|");if(i===E)return;E=i;let u=.2126*n[0]+.7152*n[1]+.0722*n[2]>.55,s=y(b(t.colors[0])?.[0]??[1,.62,.99]),h=y(b(t.colors[1])?.[0]??[.69,.39,.91]);s[1]<.02&&h[1]>=.02&&(s[2]=h[2]),h[1]<.02&&s[1]>=.02&&(h[2]=s[2]);let d=C(k(.72,s[1]<.02?0:Math.max(1.45*s[1],.16),s[2])).map(e=>Math.max(e,0)),m=Math.max(d[0],d[1],d[2],1e-4);c.uTubeColor.value.set(d[0]/m,d[1]/m,d[2]/m);let p=h[2]-.36,f=k(.8,s[1],s[2]),v=k(.56,h[1]<.02?0:Math.max(h[1],.12),h[2]),g=k(.3,h[1]<.02?0:.9*Math.max(h[1],.12),p);c.uTubeLch.value.set(f[0],f[1],f[2]),c.uMidLch.value.set(v[0],v[1],v[2]),c.uDeepLch.value.set(g[0],g[1],g[2]);let x=M(k(.5,Math.max(1.5*s[1],.16),s[2])),w=M(k(.84,Math.min(Math.max(s[1],.06),.12),s[2])),F=k(.78,Math.max(s[1],.14),s[2]),S=k(.74,Math.max(h[1],.14),h[2]),P=k(.86,Math.max(Math.min(h[1],.1),.07),p);c.uInk.value=+!!u,c.uInkTube.value.set(x[0],x[1],x[2]),c.uInkCore.value.set(w[0],w[1],w[2]),c.uPastelTube.value.set(F[0],F[1],F[2]),c.uPastelMid.value.set(S[0],S[1],S[2]),c.uPastelDeep.value.set(P[0],P[1],P[2]),c.uBg.value.set(n[0],n[1],n[2]),c.uBgAlpha.value=+!!r},eu=()=>{let t=l.current,a=Math.round(e.clientWidth),r=Math.round(e.clientHeight);if(a<2||r<2)return D=!1,!1;let i=Math.min(o.devicePixelRatio||1,m(p(t.dpr,2),.5,3));return(!D||a!==P||r!==j||i!==T)&&(D=!0,P=a,j=r,T=i,n.setPixelRatio(T),n.setSize(P,j,!1),!0)},es=()=>{if(4===W){let e=Math.max(l.current.duration,.05);Q=.04+.96*(v[l.current.easing]??v.out)(m($/e,0,1))}else Q=5===W?1:2===W?ee:.04},ec=()=>{let e=a.current;if(!e)return;let t=l.current,n="none";if(5!==W||X<.999)if(X<=.001)n=d;else{let e=en()?j:P,[a,l]=er(Q,!0),r=m(p(t.feather,.15),.01,.6)*e,o=en()?"to top":"to right",i=`rgba(0,0,0,${X.toFixed(3)})`,u="rgba(0,0,0,0)",s=a*e,c=l*e;n=`linear-gradient(${o}, ${u} ${(s-r).toFixed(1)}px, ${i} ${s.toFixed(1)}px, ${i} ${c.toFixed(1)}px, ${u} ${(c+r).toFixed(1)}px)`}n!==et&&(et=n,e.style.setProperty("-webkit-mask-image",n),e.style.setProperty("mask-image",n))},eh=()=>{if(!D)return;let e=l.current;performance.now()-R>1e3&&(R=performance.now(),ei());let t=m(p(e.thickness,3),.5,24),a=m(p(e.glow,1),0,3),r=e.direction;c.uRes.value.set(P*T,j*T),c.uAxis.value=+!!en(),c.uFlip.value=+("down"===r||"left"===r);let[o,i]=er(Q),[u,s]=er(1),h=en()?P:j;c.uSegment.value.set(o,i),c.uSpan.value.set(u,s),c.uInset.value=e.offset>=0?m(e.offset,0,.45):m(Math.max(p(e.inset,24),0)/Math.max(h,1),0,.45),c.uMirror.value=+!!e.mirrored,c.uSpread.value=1.5/m(p(e.reach,1),.1,4),c.uTaper.value=.5,c.uLight.value=4.05*m(p(e.spill,1),0,3)*m(p(e.intensity,1),0,4)*_,c.uRadius.value=Math.max(.5*t*T,.75),c.uHalo.value=(1.5+1.2*t)*(.6+.4*a)*T,c.uBloom.value=(12+16*a)*T,c.uGlow.value=a,c.uPower.value=Y*m(p(e.intensity,1),0,4),c.uGlass.value=.05*m(p(e.intensity,1),0,4),c.uTime.value=G,c.uHum.value=e.reduced?0:m(p(e.hum,1),0,2),c.uScale.value=T,n.render(F,S)},ed=e=>{W=e,$=0,3===e?(V=(()=>{let e=m(p(l.current.flicker,1),0,2),t=g(U);U=1664525*U+0x3c6ef35f>>>0;let a=Math.round(2.2*e),n=[],r=.06;for(let e=0;e<a;e++){let l=.03+.05*t(),o=Math.min(.32+(e+1)/(a+1)*.5+.14*t(),.92);n.push([r,l,o]),r+=l+.05+.1*t()}let o=.06+.3*(1-Math.min(e,1));return{flicks:n,on:r,attack:o,growAt:r+o+.06}})(),O=0,l.current.onStart?.()):5===e&&l.current.onComplete?.()},em=(e,t)=>{let a=0,n=0;2===W?(a=Z*Math.exp(-$/.07),n=J*Math.exp(-$/.09)):W>=3&&(n=a=(e=>{let t=0;for(let[a,l,n]of V.flicks){if(!(e<a))t=Math.max(t,n*f(a,a+.014,e)*(e>a+l?Math.exp(-(e-a-l)/.028):1))}if(e>=V.on){let a=e-V.on;t=Math.max(t,f(0,V.attack,a)*(.86+.14*(1-Math.exp(-a/.35))))}return t})(O)*eo()*(()=>{let e=.4+.3*m(p(l.current.flicker,1),0,2),t=1;for(let a=el.length-1;a>=0;a--){let l=G-el[a].born;if(l>.6){el.splice(a,1);continue}let n=0;for(let[e,t,r]of el[a].dips){let a=(l-e)/t;n=Math.max(n,r*Math.exp(-a*a))}t*=1-Math.min(n*e,.95)}return t})()),Y=a,2===W||t?_=n:_+=(n-_)*(1-Math.exp(-e/.035)),X=2===W?K*(1-f(0,.28900000000000003,$)):W>=3?5===W?1:f(V.on-.1,V.on+V.attack+.2,O):0},ep=()=>{W=5,$=0,O=30,el.length=0,_=Y=eo(),X=1},ef=()=>{N||H||!A||B||(B=requestAnimationFrame(ev))},ev=e=>{if(B=0,N||H)return;let t=l.current,a=z&&e-z<100?m((e-z)/1e3,0,.05):1/60;z=e;let n=t.reduced||t.paused;if((t.reduced||t.paused&&W<=1)&&5!==W&&ep(),!n){let e;G+=a,e=l.current,$+=a,W>=3&&(O+=a),0===W?("mount"===e.trigger||"inView"===e.trigger&&q)&&(e.delay>0?ed(1):ed(3)):1===W?$>=e.delay&&ed(3):2===W?$>=.34&&ed(3):3===W?$>=V.growAt&&ed(4):4===W&&$>=Math.max(e.duration,.05)&&ed(5)}em(a,n),es(),eh(),ec();let o=5!==W||el.length>0||Math.abs(_-Y)>.002||X<.999||m(p(t.hum,1),0,2)>0,i=0===W&&"mount"!==t.trigger;n||!o||i||r.hidden?z=0:B=requestAnimationFrame(ev)},eg=()=>{l.current.reduced||2===W||(0===W||1===W?ed(3):(Z=Y,J=_,K=X,ee=Q,el.length=0,ed(2)),z=0,ef())},ex=e=>{var t;!e.isPrimary||(t=e.target)&&"function"==typeof t.closest&&t.closest("a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]")||("mouse"!==e.pointerType||0===e.button)&&(ea={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()})},eb=e=>{let t=ea;if(ea=null,!t||t.id!==e.pointerId||Math.hypot(e.clientX-t.x,e.clientY-t.y)>10||performance.now()-t.time>600)return;let a=l.current;if(a.interactive&&!a.reduced&&!a.paused){if(3===W||4===W){let e=g(U);U=1664525*U+0x3c6ef35f>>>0;let t=[],a=0;for(let l=0;l<3;l++)t.push([a,.016+.02*e(),(.92-.24*l)*(.75+.25*e())]),a+=.045+.07*e();el.length>=4&&el.shift(),el.push({born:G,dips:t}),ef();return}eg()}},ew=()=>{ea=null},ey=()=>{z=0,ef()},eC=e=>{e.preventDefault(),H=!0,cancelAnimationFrame(B),B=0},ek=()=>{H=!1,E="",ef()},eM=new ResizeObserver(()=>{eu()&&(es(),eh(),ec(),ef())}),eF=new IntersectionObserver(([e])=>{A=e.isIntersecting,z=0,ef()},{rootMargin:"120px"}),eS=m(p(l.current.threshold,.3),0,1),eP=new IntersectionObserver(([e])=>{e.isIntersecting&&!(e.intersectionRatio<eS-.001)&&(q=!0,eP.disconnect(),z=0,ef())},{threshold:[0,eS]});return e.addEventListener("pointerdown",ex),e.addEventListener("pointerup",eb),e.addEventListener("pointercancel",ew),r.addEventListener("visibilitychange",ey),i.addEventListener("webglcontextlost",eC),i.addEventListener("webglcontextrestored",ek),eM.observe(e),eF.observe(e),eP.observe(e),(!l.current.intro||l.current.reduced)&&ep(),eu(),ei(),ec(),{sync:()=>{if(R=-10,eu(),z=0,!B&&A){let e=l.current;(e.reduced||e.paused&&W<=1)&&5!==W&&ep(),em(0,!0),es(),eh(),ec(),ef()}},replay:eg,destroy:()=>{N=!0,cancelAnimationFrame(B),eM.disconnect(),eF.disconnect(),eP.disconnect(),e.removeEventListener("pointerdown",ex),e.removeEventListener("pointerup",eb),e.removeEventListener("pointercancel",ew),r.removeEventListener("visibilitychange",ey),i.removeEventListener("webglcontextlost",eC),i.removeEventListener("webglcontextrestored",ek),F.remove(w),x.dispose(),h.dispose(),n.dispose(),i.remove()}}}(e,t,ed,ex);return em.current=a,!a&&ed.current&&(ed.current.style.setProperty("-webkit-mask-image","none"),ed.current.style.setProperty("mask-image","none")),()=>{a?.destroy(),em.current=null}},[]),(0,n.useImperativeHandle)(el,()=>({replay:()=>em.current?.replay()}),[]);let eb=t.trim().toLowerCase();return(0,l.jsxs)("div",{ref:ec,className:(0,c.cn)("relative isolate h-full w-full overflow-hidden",_),style:{backgroundColor:eb&&"transparent"!==eb&&"auto"!==eb?t:void 0,...X},children:[(0,l.jsx)("div",{ref:eh,"aria-hidden":"true",className:"pointer-events-none absolute inset-0"}),Q?(0,l.jsx)("div",{ref:ed,className:"absolute inset-0 z-[1] flex items-center justify-center",style:ev,children:Q}):null]})});j.displayName="NeonReveal";let T={colors:["#FF9FFC","#B163E9"],direction:"down",expandFrom:"center",easing:"out",revealDuration:2500,thickness:3,glow:1,spill:1,reach:1,intensity:1,feather:.15,inset:24,length:.9,mirrored:!1,hum:1,flicker:1},D={ultraviolet:T,glacier:{...T,colors:["#CFF6FF","#3B82F6"],easing:"gentle",revealDuration:2800,reach:1.1,hum:.6,flicker:.6},sunset:{...T,colors:["#FFD3A8","#FF4D6D"],direction:"up",revealDuration:2600,spill:1.1,hum:.8,flicker:.8},motel:{...T,colors:["#FF5FA2","#8B5CF6"],easing:"smooth",revealDuration:1800,thickness:4,glow:1.3,reach:.8,inset:44,length:.5,hum:1.6,flicker:2},scanline:{...T,colors:["#F5F3FF","#5227FF"],expandFrom:"left",easing:"smooth",revealDuration:1800,thickness:1.5,glow:.6,spill:.8,reach:.7,feather:.08,inset:16,length:1,hum:.3,flicker:0},twin:{...T,colors:["#D9CCFF","#8B5CF6"],easing:"gentle",revealDuration:2600,spill:.8,reach:.6,mirrored:!0,hum:.8,flicker:.6},lagoon:{...T,colors:["#C6FFF0","#00C2A8"],direction:"right",expandFrom:"left",easing:"gentle",revealDuration:2600,reach:.9,hum:.7,flicker:.8},flamingo:{...T,colors:["#FFE4F1","#FF2E97"],expandFrom:"right",revealDuration:2200,thickness:2.5,reach:.9,hum:1.2,flicker:1.4}},E=[{label:"Ultraviolet",value:"ultraviolet"},{label:"Glacier",value:"glacier"},{label:"Sunset",value:"sunset"},{label:"Motel",value:"motel"},{label:"Scanline",value:"scanline"},{label:"Twin",value:"twin"},{label:"Lagoon",value:"lagoon"},{label:"Flamingo",value:"flamingo"}],R=[{label:"Down",value:"down"},{label:"Up",value:"up"},{label:"Left",value:"left"},{label:"Right",value:"right"}],B=[{label:"Center",value:"center"},{label:"Left",value:"left"},{label:"Right",value:"right"}],z=[{label:"Out",value:"out"},{label:"Smooth",value:"smooth"},{label:"Gentle",value:"gentle"},{label:"Linear",value:"linear"}],A=[{label:"Mount",value:"mount"},{label:"In View",value:"inView"},{label:"Manual",value:"manual"}],q=[{name:"colors",type:"[string, string]",default:'["#FF9FFC", "#B163E9"]',description:"Colour of the neon tube and of the light it pours. The light runs from the tube colour through the light colour into a deep shade of it. On light backgrounds both become pastel inks."},{name:"backgroundColor",type:"string",default:'"transparent"',description:"Background of the stage. Transparent reads the colour behind the component."},{name:"direction",type:'"down" | "up" | "left" | "right"',default:'"down"',description:"Which way the light pours. Down puts the tube on the top edge."},{name:"expandFrom",type:'"center" | "left" | "right"',default:'"center"',description:"Where the tube starts to light up before it runs across. On side tubes left is the bottom end."},{name:"trigger",type:'"mount" | "inView" | "manual"',default:'"mount"',description:"When the reveal plays. Manual waits for replay() or a click."},{name:"revealDelay",type:"number",default:"0",description:"Wait before the tube switches on, in milliseconds."},{name:"revealDuration",type:"number",default:"2500",description:"Time the light takes to run across the tube, in milliseconds."},{name:"easing",type:'"out" | "smooth" | "gentle" | "linear"',default:'"out"',description:"Timing of the sweep. Out starts fast and lands softly."},{name:"thickness",type:"number",default:"3",description:"Width of the tube, in pixels."},{name:"glow",type:"number",default:"1",description:"Size and strength of the halo around the tube."},{name:"spill",type:"number",default:"1",description:"Brightness of the light the tube pours over the content."},{name:"reach",type:"number",default:"1",description:"How far that light travels before it fades out."},{name:"intensity",type:"number",default:"1",description:"Overall exposure of the tube and its light."},{name:"feather",type:"number",default:"0.15",description:"Softness of the reveal edge, as a share of the frame."},{name:"inset",type:"number",default:"24",description:"Distance of the tube from its edge, in pixels."},{name:"length",type:"number",default:"0.9",description:"Length of the tube, as a share of the frame. Shorter tubes show their rounded ends."},{name:"mirrored",type:"boolean",default:"false",description:"Adds a second tube on the opposite edge, pouring the other way."},{name:"hum",type:"number",default:"1",description:"Gentle breathing of the lit tube."},{name:"flicker",type:"number",default:"1",description:"How hard the tube stutters as it switches on. 0 fades it on cleanly."},{name:"interactive",type:"boolean",default:"true",description:"Click to re-ignite: the light cuts out, the tube stutters back on and the reveal plays again. Clicks during a reveal make it flicker. Links and buttons in the content are ignored."},{name:"intro",type:"boolean",default:"true",description:"Plays the reveal. Off shows the content and the lit tube at once."},{name:"paused",type:"boolean",default:"false",description:"Freezes the motion. Reduced-motion users get the revealed state as a still frame."},{name:"dpr",type:"number",default:"2",description:"Maximum device pixel ratio for the canvas."},{name:"scrollThreshold",type:"number",default:"0.3",description:"Share of the component that must be visible for the inView trigger."},{name:"onStart",type:"() => void",default:"undefined",description:"Called each time the tube switches on."},{name:"onComplete",type:"() => void",default:"undefined",description:"Called each time a reveal finishes."},{name:"children",type:"ReactNode",default:"undefined",description:"Content revealed under the light, centred in the frame."},{name:"ref",type:"{ replay }",default:"undefined",description:"replay() switches the tube off and plays the reveal again."},{name:"className",type:"string",default:"undefined",description:"Classes for the root, which fills its parent."},{name:"style",type:"CSSProperties",default:"undefined",description:"Inline styles for the root element."}],N=()=>{let[e,t]=(0,i.I)(),a=(0,o.Y)(),u=(0,n.useRef)(null),[s,c]=(0,n.useState)("ultraviolet"),[h,d]=(0,n.useState)(D.ultraviolet),m=e=>t=>d(a=>({...a,[e]:t})),[p,f]=(0,n.useState)(null),v=p??("dark"===a?"#0a0a0a":"#ffffff"),[g,x]=(0,n.useState)("mount"),[b,w]=(0,n.useState)(300),[y,C]=(0,n.useState)(!0),[k,M]=(0,n.useState)(!0),[F,S]=(0,n.useState)(!1),P=()=>u.current?.replay();return(0,l.jsxs)("div",{children:[(0,l.jsx)(r.Bg,{}),(0,l.jsxs)(r.VX,{children:[(0,l.jsxs)(r.Ec,{children:[(0,l.jsx)(r.Ch,{onRefresh:t,minHeight:560,enableResponsive:!0,children:(0,l.jsx)("div",{className:"relative h-full w-full",children:(0,l.jsx)(j,{ref:u,...h,backgroundColor:v,trigger:g,revealDelay:b,interactive:y,intro:k,paused:F,children:(0,l.jsx)("h2",{"data-showcase-hide":!0,className:"px-6 text-center text-6xl font-extrabold tracking-tighter text-neutral-950 sm:text-8xl",children:"Neon Reveal"})},e)})}),(0,l.jsxs)(r.IH,{children:[(0,l.jsx)(r.bg,{title:"Preset",value:s,options:E,onChange:e=>{c(e),d(D[e]??D.ultraviolet),P()}}),(0,l.jsx)(r.bg,{title:"Direction",value:h.direction,options:R,onChange:e=>{m("direction")(e),P()}}),(0,l.jsx)(r.bg,{title:"Expand From",value:h.expandFrom,options:B,onChange:e=>{m("expandFrom")(e),P()}}),(0,l.jsx)(r.bg,{title:"Easing",value:h.easing,options:z,onChange:e=>{m("easing")(e),P()}}),(0,l.jsx)(r.bg,{title:"Trigger",value:g,options:A,onChange:e=>{x(e),t()}}),(0,l.jsx)(r.W7,{title:"Tube Color",value:h.colors[0],onChange:e=>d(t=>({...t,colors:[e,t.colors[1]]}))}),(0,l.jsx)(r.W7,{title:"Light Color",value:h.colors[1],onChange:e=>d(t=>({...t,colors:[t.colors[0],e]}))}),(0,l.jsx)(r.W7,{title:"Background",value:v,onChange:f}),(0,l.jsx)(r.yt,{title:"Duration",min:600,max:6e3,step:100,value:h.revealDuration,valueUnit:"ms",onChange:m("revealDuration")}),(0,l.jsx)(r.yt,{title:"Delay",min:0,max:3e3,step:100,value:b,valueUnit:"ms",onChange:w}),(0,l.jsx)(r.yt,{title:"Thickness",min:1,max:10,step:.5,value:h.thickness,valueUnit:"px",onChange:m("thickness")}),(0,l.jsx)(r.yt,{title:"Glow",min:0,max:2.5,step:.01,value:h.glow,onChange:m("glow")}),(0,l.jsx)(r.yt,{title:"Spill",min:0,max:2.5,step:.01,value:h.spill,onChange:m("spill")}),(0,l.jsx)(r.yt,{title:"Reach",min:.2,max:2.5,step:.01,value:h.reach,onChange:m("reach")}),(0,l.jsx)(r.yt,{title:"Intensity",min:.2,max:2.5,step:.01,value:h.intensity,onChange:m("intensity")}),(0,l.jsx)(r.yt,{title:"Feather",min:.01,max:.4,step:.01,value:h.feather,onChange:m("feather")}),(0,l.jsx)(r.yt,{title:"Inset",min:0,max:120,step:1,value:h.inset,valueUnit:"px",onChange:m("inset")}),(0,l.jsx)(r.yt,{title:"Length",min:.1,max:1,step:.01,value:h.length,onChange:m("length")}),(0,l.jsx)(r.yt,{title:"Hum",min:0,max:2,step:.01,value:h.hum,onChange:m("hum")}),(0,l.jsx)(r.yt,{title:"Flicker",min:0,max:2,step:.01,value:h.flicker,onChange:m("flicker")}),(0,l.jsx)(r.tl,{title:"Mirrored",checked:h.mirrored,onChange:e=>{m("mirrored")(e),P()}}),(0,l.jsx)(r.tl,{title:"Interactive",checked:y,onChange:C}),(0,l.jsx)(r.tl,{title:"Intro",checked:k,onChange:e=>{M(e),t()}}),(0,l.jsx)(r.tl,{title:"Paused",checked:F,onChange:S})]}),(0,l.jsx)(r.Ub,{data:q})]}),(0,l.jsx)(r.lT,{children:(0,l.jsx)(r.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>u.CodeExample,lT:()=>l.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>h.CopyButton,IH:()=>r.Customize,gI:()=>p,Dn:()=>v,pi:()=>f,W7:()=>o.PreviewColor,Ch:()=>n.PreviewContainer,UD:()=>o.PreviewInput,bg:()=>o.PreviewSelect,yt:()=>o.PreviewSlider,tl:()=>o.PreviewSwitch,Ec:()=>l.PreviewTab,Ub:()=>i.PropTable,VX:()=>l.TabsLayout,bs:()=>m});var l=a(55019);a(27382);var n=a(10236),r=a(69485),o=a(48543),i=a(87552);a(39260);var u=a(52407),s=a(79901);a(24496);var c=a(95155);a(66729);var h=a(28592),d=a(90650);let m="rounded-lg border bg-background";function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,d.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function f({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,d.cn)(m,e),...a,children:t})}function v({title:e,description:t,className:a,children:l}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:l})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>i});var l=a(12115),n=a(30701);let r=()=>()=>{},o=()=>"light";function i(){let{resolvedTheme:e}=(0,n.D)();return(0,l.useSyncExternalStore)(r,()=>"dark"===e?"dark":"light",o)}},90761:(e,t,a)=>{a.d(t,{I:()=>n});var l=a(12115);function n(){let[e,t]=(0,l.useState)(0),a=(0,l.useCallback)(()=>{t(e=>e+1)},[]);return(0,l.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);