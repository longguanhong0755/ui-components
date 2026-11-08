"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[39911],{39911:(e,t,a)=>{a.r(t),a.d(t,{default:()=>C});var n=a(95155),i=a(12115),r=a(56388),l=a(86049),o=a(90761),s=a(12246),u=a(2253),c=a(90650);let d=1/60,h=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},p=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,f=(e,t,a)=>Math.min(a,Math.max(t,e)),m=null,v=(e,t)=>{if(m||(m=document.createElement("canvas").getContext("2d")),!m)return t;m.fillStyle="#010203",m.fillStyle=e;let a=String(m.fillStyle);if("#010203"===a&&"#010203"!==e.trim().toLowerCase())return t;if(a.startsWith("#")){let e=a.slice(1);return[parseInt(e.slice(0,2),16)/255,parseInt(e.slice(2,4),16)/255,parseInt(e.slice(4,6),16)/255]}let n=a.match(/[\d.]+/g);return!n||n.length<3?t:[Number(n[0])/255,Number(n[1])/255,Number(n[2])/255]},x=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),g=([e,t,a])=>{let n=x(e),i=x(t),r=x(a),l=Math.cbrt(.4122214708*n+.5363325363*i+.0514459929*r),o=Math.cbrt(.2119034982*n+.6806995451*i+.1073969566*r),s=Math.cbrt(.0883024619*n+.2817188376*i+.6299787005*r);return[.2104542553*l+.793617785*o-.0040720468*s,1.9779984951*l-2.428592205*o+.4505937099*s,.0259040371*l+.7827717662*o-.808675766*s]},y=`
out vec2 vPos;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPos = world.xy;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`,b=`
precision highp float;
uniform sampler2D uMask;
uniform vec4 uMaskRect;
uniform sampler2D uMap;
uniform vec4 uMapRect;
uniform ivec2 uMapSize;
uniform sampler2D uStir;
uniform vec4 uStirRect;
uniform ivec2 uStirSize;
uniform vec3 uInkA;
uniform vec3 uInkB;
uniform vec3 uInkC;
uniform vec3 uBase;
uniform float uBand;
uniform float uWave;
uniform float uGrain;
uniform float uGrainSize;
uniform float uDotSize;
uniform vec2 uDrift;
uniform float uIntro;
in vec2 vPos;
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

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash2(i) - 0.5, f);
  float b = dot(hash2(i + vec2(1.0, 0.0)) - 0.5, f - vec2(1.0, 0.0));
  float c = dot(hash2(i + vec2(0.0, 1.0)) - 0.5, f - vec2(0.0, 1.0));
  float d = dot(hash2(i + vec2(1.0, 1.0)) - 0.5, f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0;
}

float fbm(vec2 p) {
  return noise(p) * 0.6 + noise(p * 2.03 + vec2(3.1, 1.7)) * 0.3 + noise(p * 4.07 - vec2(1.7, 4.3)) * 0.1;
}

vec3 marble(vec2 h) {
  vec2 q = h / uBand;
  vec2 warp = vec2(fbm(q * 0.42 + vec2(1.7, 9.2)), fbm(q * 0.42 + vec2(8.3, 2.8)));
  float s = q.y * 0.8 + uWave * 1.35 * fbm(q * 0.55 + warp * 1.7) + 0.35 * sin(q.x * 0.31 + warp.x * 2.0);
  float f1 = abs(fract(s) - 0.5);
  float veinA = 1.0 - smoothstep(0.035, 0.12, f1);
  float f2 = abs(fract(s + 0.5) - 0.5);
  float veinB = 1.0 - smoothstep(0.015, 0.065, f2);
  float cloud = 0.5 + 0.5 * fbm(q * 0.3 + warp + 5.0);
  vec3 col = mix(uInkC, mix(uInkC, uInkA, 0.4), smoothstep(0.45, 0.85, cloud));
  col = mix(col, uInkA, veinA);
  return mix(col, uInkB, veinB);
}

vec3 dye(float hue) {
  return hue < 0.33 ? uInkB : hue < 0.66 ? uInkC : uInkA;
}

vec4 mapAt(vec2 p) {
  vec2 g = vec2((p.x - uMapRect.x) / uMapRect.z, (uMapRect.y - p.y) / uMapRect.z) - 0.5;
  ivec2 i = ivec2(floor(g));
  vec2 f = g - vec2(i);
  ivec2 top = uMapSize - 1;
  vec4 a = texelFetch(uMap, clamp(i, ivec2(0), top), 0);
  vec4 b = texelFetch(uMap, clamp(i + ivec2(1, 0), ivec2(0), top), 0);
  vec4 c = texelFetch(uMap, clamp(i + ivec2(0, 1), ivec2(0), top), 0);
  vec4 d = texelFetch(uMap, clamp(i + ivec2(1, 1), ivec2(0), top), 0);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float stirAt(vec2 p) {
  vec2 g = vec2((p.x - uStirRect.x) / uStirRect.z, (uStirRect.y - p.y) / uStirRect.z) - 0.5;
  ivec2 i = ivec2(floor(g));
  vec2 f = g - vec2(i);
  ivec2 top = uStirSize - 1;
  float a = texelFetch(uStir, clamp(i, ivec2(0), top), 0).r;
  float b = texelFetch(uStir, clamp(i + ivec2(1, 0), ivec2(0), top), 0).r;
  float c = texelFetch(uStir, clamp(i + ivec2(0, 1), ivec2(0), top), 0).r;
  float d = texelFetch(uStir, clamp(i + ivec2(1, 1), ivec2(0), top), 0).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

vec3 inkAt(vec2 p) {
  vec4 field = mapAt(p);
  vec2 h = vec2(p.x + field.x, p.y - field.y) + uDrift;
  float amount = clamp(field.z, 0.0, 1.0);
  return mix(marble(h), dye(field.w / max(field.z, 1e-4)), amount);
}

void main() {
  vec2 mu = vec2((vPos.x - uMaskRect.x) / uMaskRect.z, (uMaskRect.y - vPos.y) / uMaskRect.w);
  float alpha = smoothstep(0.25, 0.75, texture(uMask, mu).a);
  if (alpha < 0.003) discard;
  vec2 g = vPos / uGrainSize;
  float aa = max(length(fwidth(g)) * 0.75, 1e-3);
  vec2 cell = floor(g);
  float best = 1e9;
  vec2 centre = g;
  vec2 seed = vec2(0.0);
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 c = cell + vec2(float(i), float(j));
      vec2 r = hash2(c);
      vec2 p = c + 0.5 + (r - 0.5) * 0.76;
      float d = length(g - p);
      if (d < best) {
        best = d;
        centre = p;
        seed = r;
      }
    }
  }
  vec2 dot = centre * uGrainSize;
  float across = clamp((dot.x - uMaskRect.x) / uMaskRect.z, 0.0, 1.0);
  float rank = 0.4 * seed.x + 0.6 * across;
  float reveal = smoothstep(rank, rank + 0.1, uIntro * 1.45);
  float settle = smoothstep(rank + 0.16, rank + 0.45, uIntro * 1.45);
  float stirred = clamp(stirAt(dot), 0.0, 1.0);
  float merged = settle * (1.0 - stirred) * (1.0 - uGrain);
  float radius = mix((0.26 + 0.12 * seed.y) * uDotSize, 1.25, merged);
  float cover = (1.0 - smoothstep(radius - aa, radius + aa, best)) * reveal;
  vec3 ink = inkAt(mix(dot, vPos, merged));
  ink.x *= 0.975 + 0.05 * seed.y * (1.0 - merged * 0.6);
  vec3 lab = mix(uBase, ink, cover);
  float fill = smoothstep(0.25, 0.8, uIntro);
  float a = alpha * max(fill, cover);
  fragColor = vec4(encode(labToLinear(lab)) * a, a);
}
`,M=(0,i.forwardRef)(function({text:e="Made by hand",fontFamily:t="",fontWeight:a=800,fontSize:r=124,letterSpacing:l=-.02,lineHeight:o=1,colors:m=["#3F3F46","#A1A1AA"],baseColor:x="#F4F4F5",bandSize:M=.5,waviness:S=1.2,grain:w=0,grainSize:k=2,dotSize:z=1,current:F=1,interactive:C=!0,stirStrength:A=1,stirRadius:I=.5,dropInk:j=!0,dropSize:R=.5,viscosity:E=.5,memory:B=8,intro:L=!0,introDuration:D=1.8,paused:P=!1,quality:T=1,className:W,style:q,children:U},G){let N=(0,i.useRef)(null),H=(0,i.useRef)(null),Y=(0,i.useSyncExternalStore)(h,p,()=>!1),V=(0,i.useRef)({text:e,fontFamily:t,fontWeight:a,fontSize:r,letterSpacing:l,lineHeight:o,colors:m,baseColor:x,bandSize:M,waviness:S,grain:w,grainSize:k,dotSize:z,current:F,interactive:C,stirStrength:A,stirRadius:I,dropInk:j,dropSize:R,viscosity:E,memory:B,intro:L,introDuration:D,paused:P,quality:T,reduced:Y});return(0,i.useEffect)(()=>{V.current={text:e,fontFamily:t,fontWeight:a,fontSize:r,letterSpacing:l,lineHeight:o,colors:m,baseColor:x,bandSize:M,waviness:S,grain:w,grainSize:k,dotSize:z,current:F,interactive:C,stirStrength:A,stirRadius:I,dropInk:j,dropSize:R,viscosity:E,memory:B,intro:L,introDuration:D,paused:P,quality:T,reduced:Y},H.current?.sync()}),(0,i.useEffect)(()=>{let e=N.current;if(!e)return;let t=((e,t)=>{let a,n=document.createElement("canvas");n.setAttribute("aria-hidden","true"),n.style.position="absolute",n.style.inset="0",n.style.width="100%",n.style.height="100%",n.style.display="block",n.style.pointerEvents="none",e.prepend(n);try{a=new s.WebGLRenderer({canvas:n,alpha:!0,premultipliedAlpha:!0,antialias:!1})}catch{return n.remove(),null}if(!a.capabilities.isWebGL2)return a.dispose(),n.remove(),null;a.setClearColor(0,0);let i=new u.qUd(-1,1,1,-1,-10,10),r=new u.Z58,l=document.createElement("canvas"),o=new u.GOR(l);o.flipY=!1,o.minFilter=u.k6q,o.magFilter=u.k6q,o.generateMipmaps=!1,o.colorSpace=u.jf0;let c=(e,t,a,n)=>{let i=new u.GYF(e,t,a,n,u.RQf);return i.minFilter=u.hxR,i.magFilter=u.hxR,i.flipY=!1,i.needsUpdate=!0,i},h=c(new Float32Array(4),1,1,u.GWd),p=c(new Float32Array(1),1,1,u.VT0),m={uMask:{value:o},uMaskRect:{value:new u.IUQ(0,0,1,1)},uMap:{value:h},uMapRect:{value:new u.IUQ(0,0,1,0)},uMapSize:{value:new u.I9Y(1,1)},uStir:{value:p},uStirRect:{value:new u.IUQ(0,0,1,0)},uStirSize:{value:new u.I9Y(1,1)},uInkA:{value:new u.Pq0},uInkB:{value:new u.Pq0},uInkC:{value:new u.Pq0},uBase:{value:new u.Pq0},uBand:{value:40},uWave:{value:.7},uGrain:{value:.1},uGrainSize:{value:2},uDotSize:{value:1},uDrift:{value:new u.I9Y},uIntro:{value:1}},x=new u.BKk({glslVersion:u.Wdf,vertexShader:y,fragmentShader:b,uniforms:m,transparent:!0,depthTest:!1,depthWrite:!1,premultipliedAlpha:!0,blending:u.bCz,blendSrc:u.qad,blendDst:u.OuU}),M=new u.eaF(new u.bdM(1,1),x);M.frustumCulled=!1,r.add(M);let S={x0:0,y0:0,x1:0,y1:0,size:100},w={nx:2,ny:2,cell:8,u:new Float32Array(4),v:new Float32Array(4),u0:new Float32Array(4),v0:new Float32Array(4),p:new Float32Array(4),div:new Float32Array(4),stir:new Float32Array(4),energy:0,stirred:!1},k={nx:2,ny:2,cell:4,front:new Float32Array(16),back:new Float32Array(16),busy:!1},z=[],F=[],C=[],A={x:0,y:0,t:0,placed:!1,id:-1,moved:0},I=0,j="",R="",E=1e9,B=1,L=1,D=1,P=0,T=0,W=0,q=0,U=!0,G=!1,N=!1,H=0,Y=new Set,V=a=>{let n=t.current,i=n.fontFamily||getComputedStyle(e).fontFamily;return`${f(Math.round(n.fontWeight),100,900)} ${a}px ${i}`},$=()=>{let a=t.current,n=[a.text,a.fontFamily,a.fontWeight,a.fontSize,a.letterSpacing,a.lineHeight,Math.round(B),Math.round(L),D.toFixed(2),a.fontFamily?"":getComputedStyle(e).fontFamily].join("|");n!==j&&(j=n,(()=>{let e=t.current,a=l.getContext("2d");if(!a)return;let n=V(16);document.fonts?.load&&!Y.has(n)&&(Y.add(n),document.fonts.load(n).then(e=>{!G&&e.length&&(j="",N&&ee())}).catch(()=>{}));let i=e.text.split(/\s+/).filter(Boolean),r=f(e.lineHeight,.7,2),s=f(e.letterSpacing,-.2,1),d=f(e.fontSize,12,600),v=[],x=e=>(a.font=V(d),a.letterSpacing=`${s*d}px`,a.measureText(e).width);for(let e=0;e<40;e++){v=[];let e="",t=!0;for(let a of i){if(x(a)>.8*B){t=!1;break}let n=e?`${e} ${a}`:a;e&&x(n)>.8*B?(v.push(e),e=a):e=n}if(e&&v.push(e),t&&v.length*d*r<=.7*L)break;d*=.94}let g=0;v.forEach(e=>{g=Math.max(g,x(e))});let y=Math.max(1,v.length)*d*r,b=.2*d;S.size=d,S.x0=-g/2-b,S.x1=g/2+b,S.y0=-y/2-b,S.y1=y/2+b;let C=S.x1-S.x0,A=S.y1-S.y0,I=Math.min(1.25*D,3);l.width=Math.max(1,Math.ceil(C*I)),l.height=Math.max(1,Math.ceil(A*I)),a.setTransform(1,0,0,1,0,0),a.clearRect(0,0,l.width,l.height),a.setTransform(I,0,0,I,0,0),a.font=V(d),a.letterSpacing=`${s*d}px`,a.textAlign="center",a.textBaseline="middle",a.fillStyle="#fff",v.forEach((e,t)=>{let n=((v.length-1)/2-t)*d*r;a.fillText(e,-S.x0+s*d/2,S.y1-n)}),o.dispose(),o.needsUpdate=!0,m.uMaskRect.value.set(S.x0,S.y1,C,A),M.scale.set(C,A,1),M.position.set((S.x0+S.x1)/2,(S.y0+S.y1)/2,0),(()=>{let e=S.x1-S.x0,t=S.y1-S.y0,a=f(.08*S.size,6,16);for(;e/a*(t/a)>3200;)a*=1.08;w.cell=a,w.nx=Math.max(4,Math.ceil(e/a)),w.ny=Math.max(4,Math.ceil(t/a));let n=w.nx*w.ny;w.u=new Float32Array(n),w.v=new Float32Array(n),w.u0=new Float32Array(n),w.v0=new Float32Array(n),w.p=new Float32Array(n),w.div=new Float32Array(n),w.stir=new Float32Array(n),w.energy=0,w.stirred=!1,p.dispose(),p=c(w.stir,w.nx,w.ny,u.VT0),m.uStir.value=p,m.uStirRect.value.set(S.x0,S.y1,a,0),m.uStirSize.value.set(w.nx,w.ny);let i=f(.03*S.size,2.5,7);for(;e/i*(t/i)>22e3;)i*=1.08;k.cell=i,k.nx=Math.max(4,Math.ceil(e/i)),k.ny=Math.max(4,Math.ceil(t/i)),k.front=new Float32Array(k.nx*k.ny*4),k.back=new Float32Array(k.nx*k.ny*4),k.busy=!1,h.dispose(),h=c(k.front,k.nx,k.ny,u.GWd),m.uMap.value=h,m.uMapRect.value.set(S.x0,S.y1,i,0),m.uMapSize.value.set(k.nx,k.ny),z.length=0,F.length=0})();let P=[e.text,e.fontFamily,e.fontWeight,e.fontSize,e.letterSpacing,e.lineHeight].join("|");P!==R&&(R=P,E=!e.intro||e.reduced||e.paused?1e9:0)})())},O=(e,t,a,n,i)=>{let r=f(n,0,t-1.001),l=f(i,0,a-1.001),o=Math.floor(r),s=Math.floor(l),u=r-o,c=s*t+o,d=e[c]+(e[c+1]-e[c])*u;return d+(e[c+t]+(e[c+t+1]-e[c+t])*u-d)*(l-s)},_=e=>{let a=t.current,{nx:n,ny:i,cell:r,u:l,v:o,u0:s,v0:u,p:c,div:d,stir:h}=w;for(let e of z){let t=e.radius/r,a=e.x/r-.5,s=e.y/r-.5,u=Math.ceil(2*t);for(let r=Math.max(0,Math.floor(s-u));r<=Math.min(i-1,Math.ceil(s+u));r++)for(let i=Math.max(0,Math.floor(a-u));i<=Math.min(n-1,Math.ceil(a+u));i++){let u=i-a,c=r-s,d=Math.exp(-(u*u+c*c)/(t*t));d<.01||(l[r*n+i]+=e.fx*d,o[r*n+i]+=e.fy*d)}}z.length=0,s.set(l),u.set(o);let m=e/r;for(let e=0;e<i;e++)for(let t=0;t<n;t++){let a=e*n+t,r=t-s[a]*m,c=e-u[a]*m;l[a]=O(s,n,i,r,c),o[a]=O(u,n,i,r,c)}let v=Math.exp(-e/(.3+1.7*(1-f(a.viscosity,0,1))));for(let e=0;e<n*i;e++)l[e]*=v,o[e]*=v;for(let e=0;e<n;e++)o[e]=0,o[(i-1)*n+e]=0;for(let e=0;e<i;e++)l[e*n]=0,l[e*n+n-1]=0;for(let e=0;e<i;e++)for(let t=0;t<n;t++){let a=e*n+t,r=t>0?l[a-1]:0,s=t<n-1?l[a+1]:0,u=e>0?o[a-n]:0,h=e<i-1?o[a+n]:0;d[a]=(s-r+(h-u))*.5,c[a]=0}for(let e=0;e<70;e++)for(let e=0;e<2;e++)for(let t=0;t<i;t++)for(let a=t+e&1;a<n;a+=2){let e=t*n+a,r=0,l=0;a>0&&(r+=c[e-1],l++),a<n-1&&(r+=c[e+1],l++),t>0&&(r+=c[e-n],l++),t<i-1&&(r+=c[e+n],l++),c[e]+=1.86*((r-d[e])/l-c[e])}let x=0,g=Math.exp(-e/.45),y=!1;for(let e=0;e<i;e++)for(let t=0;t<n;t++){let a=e*n+t,r=t>0?c[a-1]:c[a],s=t<n-1?c[a+1]:c[a],u=e>0?c[a-n]:c[a],d=e<i-1?c[a+n]:c[a];l[a]-=(s-r)*.5,o[a]-=(d-u)*.5;let p=Math.abs(l[a])+Math.abs(o[a]);x=Math.max(x,p);let f=p>120?Math.min(1,(p-120)/520):0,m=Math.max(h[a]*g,f);h[a]=m<.004?0:m,h[a]>0&&(y=!0)}x<3&&(l.fill(0),o.fill(0),x=0),w.energy=x,w.stirred=y,p.needsUpdate=!0},Q=e=>{let{stir:t}=w,a=Math.exp(-e/.45),n=!1;for(let e=0;e<t.length;e++){let i=t[e]*a;t[e]=i<.004?0:i,t[e]>0&&(n=!0)}w.stirred=n,p.needsUpdate=!0},X=(e,t,a,n)=>{let{nx:i,ny:r}=k,l=f(t,0,i-1.001),o=f(a,0,r-1.001),s=Math.floor(l),u=Math.floor(o),c=l-s,d=o-u,h=(u*i+s)*4,p=h+4,m=h+4*i,v=m+4;for(let t=0;t<4;t++){let a=e[h+t]+(e[p+t]-e[h+t])*c,i=e[m+t]+(e[v+t]-e[m+t])*c;n[t]=a+(i-a)*d}},K=e=>{let a=t.current,{nx:n,ny:i,cell:r}=k,l=k.front,o=k.back,s=1-(1-Math.exp(-(3*e)/f(a.memory,.5,120)))*Math.exp(-w.energy/500),u=w.energy>0,c=[0,0,0,0],d=r/w.cell,p=!1;for(let t=0;t<i;t++)for(let a=0;a<n;a++){let i=(t*n+a)*4,h=0,f=0;if(u){let e=(a+.5)*d-.5,n=(t+.5)*d-.5;h=O(w.u,w.nx,w.ny,e,n),f=O(w.v,w.nx,w.ny,e,n)}0!==h||0!==f?(X(l,a-h*e/r,t-f*e/r,c),o[i]=(c[0]-h*e)*s,o[i+1]=(c[1]-f*e)*s,o[i+2]=c[2]*s,o[i+3]=c[3]*s):(o[i]=l[i]*s,o[i+1]=l[i+1]*s,o[i+2]=l[i+2]*s,o[i+3]=l[i+3]*s),!p&&(Math.abs(o[i])>.05||Math.abs(o[i+1])>.05||o[i+2]>.004)&&(p=!0)}k.front=o,k.back=l;for(let t=F.length-1;t>=0;t--){let a=F[t];a.age+=e;let n=f(a.age/.75,0,1),i=1-Math.pow(1-n,3),r=a.target*i;r>a.radius+.001&&(Z(a,a.radius,r),a.radius=r),n>=1&&F.splice(t,1),p=!0}k.busy=p,h.image.data=k.front,h.needsUpdate=!0},Z=(e,t,a)=>{let{nx:n,ny:i,cell:r}=k,l=k.front,o=k.back;o.set(l);let s=a*a-t*t,u=e.x/r-.5,c=e.y/r-.5,d=Math.ceil((5*a+2*r)/r),h=[0,0,0,0];for(let t=Math.max(0,Math.floor(c-d));t<=Math.min(i-1,Math.ceil(c+d));t++)for(let i=Math.max(0,Math.floor(u-d));i<=Math.min(n-1,Math.ceil(u+d));i++){let u=(t*n+i)*4,c=(i+.5)*r,d=(t+.5)*r,p=c-e.x,m=d-e.y,v=Math.hypot(p,m);if(v>a-r){let t=Math.sqrt(Math.max(0,1-s/Math.max(v*v,1e-6))),a=e.x+p*t,n=e.y+m*t;X(l,a/r-.5,n/r-.5,h),o[u]=h[0]+(a-c),o[u+1]=h[1]+(n-d),o[u+2]=h[2],o[u+3]=h[3]}let x=f((a-v)/(1.2*r)+.5,0,1);x>0&&(o[u]*=1-x,o[u+1]*=1-x,o[u+2]=o[u+2]*(1-x)+x,o[u+3]=o[u+3]*(1-x)+x*e.hue)}k.front=o,k.back=l;let m=w.cell,v=e.x/m-.5,x=e.y/m-.5,g=Math.ceil(1.6*a/m);for(let e=Math.max(0,Math.floor(x-g));e<=Math.min(w.ny-1,Math.ceil(x+g));e++)for(let t=Math.max(0,Math.floor(v-g));t<=Math.min(w.nx-1,Math.ceil(v+g));t++){let n=Math.exp(-Math.pow((Math.hypot(t-v,e-x)*m-a)/(.45*a+m),2)),i=e*w.nx+t;w.stir[i]=Math.max(w.stir[i],.85*n)}w.stirred=!0,p.needsUpdate=!0},J=(e,t,a)=>{let n=[.1,.5,.1,.9];F.push({x:e,y:t,radius:0,target:a,age:0,hue:n[I%n.length]}),I++},ee=()=>{if(N){let e,n,l,o,s;$(),n=g(v((e=t.current).colors[0],[.32,.15,1])),l=g(v(e.colors[1],[1,.62,.99])),o=g(v(e.baseColor,[.95,.93,1])),m.uInkA.value.set(n[0],n[1],n[2]),m.uInkB.value.set(l[0],l[1],l[2]),m.uInkC.value.set(o[0],o[1],o[2]),o[0]>.6?m.uBase.value.set(Math.min(.3,.32*o[0]),.5*n[1],.5*n[2]):m.uBase.value.set(Math.max(.9,o[0]+.6),.08*n[1],.08*n[2]),m.uBand.value=S.size*f(e.bandSize,.05,2),m.uWave.value=f(e.waviness,0,2),m.uGrain.value=f(e.grain,0,1),m.uGrainSize.value=f(e.grainSize,1.2,14)*(S.size/f(e.fontSize,12,600)),m.uDotSize.value=f(e.dotSize,.3,2),m.uDrift.value.set(P*S.size*.06,Math.sin(.21*P)*S.size*.05),s=f(e.introDuration,.2,8),m.uIntro.value=E>=1e8?1:f(E/s,0,1),a.setRenderTarget(null),a.clear(),a.render(r,i)}},et=()=>{let e=t.current;return!e.reduced&&!e.paused},ea=(e,a,n,i,r)=>{let l=t.current,o=n-e,s=i-a,u=Math.hypot(o,s);if(u<.3||r<=0)return;let c=Math.min(u/Math.max(r,1/120),1600),d=.42*f(l.stirStrength,0,3),h=f(l.stirRadius,.1,3)*S.size*.5,p=Math.max(1,Math.ceil(u/(.5*h)));for(let t=0;t<p;t++){let n=(t+.5)/p;z.push({x:e+o*n,y:a+s*n,fx:o/u*c*d/p,fy:s/u*c*d/p,radius:h})}},en=e=>{for(let t=C.length-1;t>=0;t--){let a=C[t],n=e=>{let t=e<.5?2*e*e:1-Math.pow(-2*e+2,2)/2,n=a.from[0]+(a.to[0]-a.from[0])*t,i=a.from[1]+(a.to[1]-a.from[1])*t;return[n*(S.x1-S.x0),i*(S.y1-S.y0)]},i=n(f(a.elapsed/a.duration,0,1));a.elapsed+=e;let r=n(f(a.elapsed/a.duration,0,1));ea(i[0],i[1],r[0],r[1],e),a.elapsed>=a.duration&&C.splice(t,1)}},ei=a=>{if(W=0,G)return;let n=Math.min(.1,Math.max(0,(a-q)/1e3));q=a,++H%30==0&&(Math.abs(e.clientWidth-B)>1||Math.abs(e.clientHeight-L)>1)&&el(),N&&$();let i=t.current;if(et()){P+=n*f(i.current,0,4),E<1e8&&(E+=n)>f(i.introDuration,.2,8)+.2&&(E=1e9),T+=n;let e=0;for(;T>=d&&e<4;){en(d);let t=z.length>0||w.energy>0;t?_(d):w.stirred&&Q(d),(t||k.busy||F.length)&&K(d),T-=d,e++}4===e&&(T=0)}ee();let r=i.current>0||E<1e8||k.busy||F.length>0||w.energy>0||w.stirred||C.length>0||z.length>0;U&&!document.hidden&&et()&&r&&(W=requestAnimationFrame(ei))};function er(){G||W||!U||(q=performance.now(),W=requestAnimationFrame(ei))}function el(){let n=e.getBoundingClientRect();if(n.width<2||n.height<2){N=!1;return}N=!0,B=n.width,L=n.height,D=Math.min(window.devicePixelRatio||1,2)*f(t.current.quality,.25,1),a.setPixelRatio(D),a.setSize(B,L,!1),i.left=-B/2,i.right=B/2,i.top=L/2,i.bottom=-L/2,i.updateProjectionMatrix(),ee(),er()}let eo=(t,a)=>{let n=e.getBoundingClientRect(),i=t-n.left-B/2,r=L/2-(a-n.top);return[i-S.x0,S.y1-r]},es=e=>{let a=t.current,[n,i]=eo(e.clientX,e.clientY),r=performance.now();a.interactive&&et()&&A.placed&&r-A.t<120&&(ea(A.x,A.y,n,i,(r-A.t)/1e3),er()),A.id===e.pointerId&&(A.moved+=Math.hypot(n-A.x,i-A.y)),A.x=n,A.y=i,A.t=r,A.placed=!0},eu=e=>{t.current.interactive&&et()&&("mouse"!==e.pointerType||0===e.button)&&(A.id=e.pointerId,A.moved=0)},ec=e=>{if(A.id!==e.pointerId)return;A.id=-1;let a=t.current;if(!a.dropInk||!a.interactive||!et()||A.moved>12)return;let[n,i]=eo(e.clientX,e.clientY);n<0||i<0||n>S.x1-S.x0||i>S.y1-S.y0||(J(n,i,f(a.dropSize,.05,2)*S.size*.5),er())},ed=()=>{A.placed=!1};e.addEventListener("pointermove",es),e.addEventListener("pointerdown",eu),e.addEventListener("pointerup",ec),e.addEventListener("pointercancel",ec),e.addEventListener("pointerleave",ed);let eh=new ResizeObserver(el);eh.observe(e);let ep=new IntersectionObserver(e=>{(U=e.some(e=>e.isIntersecting))&&er()},{rootMargin:"80px"});ep.observe(e);let ef=()=>{document.hidden||er()};document.addEventListener("visibilitychange",ef),document.fonts?.ready&&document.fonts.ready.then(()=>{!G&&(j="",N&&ee())}).catch(()=>{});let em=e=>e.preventDefault();return n.addEventListener("webglcontextlost",em),el(),{sync:()=>{let e=Math.min(window.devicePixelRatio||1,2)*f(t.current.quality,.25,1);!N||Math.abs(e-D)>.001?el():(et()||(E=1e9),ee()),er()},destroy:()=>{G=!0,cancelAnimationFrame(W),e.removeEventListener("pointermove",es),e.removeEventListener("pointerdown",eu),e.removeEventListener("pointerup",ec),e.removeEventListener("pointercancel",ec),e.removeEventListener("pointerleave",ed),document.removeEventListener("visibilitychange",ef),n.removeEventListener("webglcontextlost",em),eh.disconnect(),ep.disconnect(),o.dispose(),h.dispose(),p.dispose(),M.geometry.dispose(),x.dispose(),a.dispose(),a.forceContextLoss(),n.remove()},drop:(e,t,a)=>{et()&&N&&($(),J(f(e,0,1)*(S.x1-S.x0),f(t,0,1)*(S.y1-S.y0),f(a,.05,2)*S.size*.5),er())},stir:(e,t,a)=>{et()&&N&&(C.push({from:e,to:t,duration:f(a,.05,10),elapsed:0}),er())},replay:()=>{et()&&N&&(E=0,er())}}})(e,V);return H.current=t,()=>{t?.destroy(),H.current=null}},[]),(0,i.useImperativeHandle)(G,()=>({drop:(e=.5,t=.5,a=.5)=>H.current?.drop(e,t,a),stir:(e,t,a=1)=>H.current?.stir(e,t,a),replay:()=>H.current?.replay()}),[]),(0,n.jsx)("div",{ref:N,role:"img","aria-label":e,className:(0,c.cn)("relative isolate h-full min-h-[240px] w-full overflow-hidden",W),style:{touchAction:"pan-y",...q},children:U&&(0,n.jsx)("div",{className:"relative z-10 h-full w-full",children:U})})});M.displayName="StippleType";let S={dark:{colors:["#5227FF","#FF9FFC"],base:"#F1EDFF"},light:{colors:["#B9A7FF","#FF7BD8"],base:"#1C1440"},bandSize:.34,waviness:.7,grain:0,grainSize:2,dotSize:1},w={...S,dark:{colors:["#3F3F46","#A1A1AA"],base:"#F4F4F5"},light:{colors:["#A1A1AA","#E4E4E7"],base:"#18181B"},bandSize:.5,waviness:1.2},k={marble:w,violet:S,endpaper:{...S,dark:{colors:["#1E1B4B","#F97316"],base:"#F5EBDD"},light:{colors:["#F97316","#FBBF24"],base:"#1E1B4B"},bandSize:.26,waviness:1},lagoon:{...S,dark:{colors:["#0F766E","#F59E0B"],base:"#ECFDF5"},light:{colors:["#5EEAD4","#FBBF24"],base:"#0B3B37"},bandSize:.42,waviness:.55},pointillist:{...S,grain:1,grainSize:3.2,dotSize:1.3}},z=[{label:"Marble",value:"marble"},{label:"Violet",value:"violet"},{label:"Endpaper",value:"endpaper"},{label:"Lagoon",value:"lagoon"},{label:"Pointillist",value:"pointillist"}],F=[{name:"text",type:"string",default:'"Made by hand"',description:"The headline. It wraps onto as many lines as it needs."},{name:"colors",type:"[string, string]",default:'["#3F3F46", "#A1A1AA"]',description:"The two inks marbled through the headline: the broad veins, and the fine threads between them. Click drops are also drawn from these and the base."},{name:"baseColor",type:"string",default:'"#F4F4F5"',description:"The colour of the marbling bath the inks float on, which is the body colour of the headline. Use a pale base on dark pages and a deep one on light pages."},{name:"bandSize",type:"number",default:"0.5",description:"Spacing of the veins as a fraction of the font size."},{name:"waviness",type:"number",default:"1.2",description:"How much the veins meander, from 0 (straight bands) to 2."},{name:"grain",type:"number",default:"0",description:"How stippled the ink looks at rest, from 0 (smooth, the grains only show where you stir) to 1 (a dot print everywhere)."},{name:"grainSize",type:"number",default:"2",description:"Spacing of the stipple grains in pixels at the full font size."},{name:"dotSize",type:"number",default:"1",description:"Size of each grain once the ink breaks apart, from 0.3 to 2."},{name:"current",type:"number",default:"1",description:"Speed of the slow current that keeps the marbling drifting. 0 holds it still."},{name:"fontFamily",type:"string",default:"inherited",description:"Font for the headline. Leave unset to use the page font."},{name:"fontWeight",type:"number",default:"800",description:"Font weight. Heavy weights show more of the marbling."},{name:"fontSize",type:"number",default:"124",description:"Largest font size in pixels. The headline shrinks to fit the frame when it needs to."},{name:"letterSpacing",type:"number",default:"-0.02",description:"Letter spacing in em."},{name:"lineHeight",type:"number",default:"1",description:"Line height as a multiple of the font size."},{name:"interactive",type:"boolean",default:"true",description:"Moving the pointer through the headline stirs the ink: it swirls along with your stroke and breaks into stipple grains where the flow is fast, then knits back together."},{name:"stirStrength",type:"number",default:"1",description:"How hard the pointer stirs, from 0 to 3."},{name:"stirRadius",type:"number",default:"0.5",description:"Width of the stirring stroke, as a multiple of the font size."},{name:"dropInk",type:"boolean",default:"true",description:"Clicking or tapping drops a bead of ink that spreads out and pushes the marbling aside, like paint dropped on a marbling bath."},{name:"dropSize",type:"number",default:"0.5",description:"Radius of each drop, as a multiple of the font size."},{name:"viscosity",type:"number",default:"0.5",description:"Thickness of the bath, from 0 (thin, swirls keep turning) to 1 (thick, every stroke stops quickly)."},{name:"memory",type:"number",default:"8",description:"Seconds the swirls and drops take to fade back into the original marbling."},{name:"intro",type:"boolean",default:"true",description:"The headline is stippled in from the left, grain by grain, and the grains then flow together into ink. It plays when the headline first comes into view and again when the text changes."},{name:"introDuration",type:"number",default:"1.8",description:"Length of the intro in seconds."},{name:"paused",type:"boolean",default:"false",description:"Freeze the marbling and ignore the pointer. Reduced-motion users always get this still print, without the intro."},{name:"quality",type:"number",default:"1",description:"Resolution scale from 0.25 to 1."},{name:"ref",type:"{ drop, stir, replay }",default:"—",description:"drop(x, y, size) drops ink at a point given as fractions of the headline. stir(from, to, duration) draws a stirring stroke between two such points. replay() plays the intro again."},{name:"children",type:"ReactNode",default:"—",description:"Content placed over the headline."},{name:"className",type:"string",default:"—",description:"Classes for the root element. It fills its parent, with a 240px minimum height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."}],C=()=>{let[e,t]=(0,o.I)(),a=(0,l.Y)(),[s,u]=(0,i.useState)("Made by hand"),[c,d]=(0,i.useState)("marble"),[h,p]=(0,i.useState)(w),f=e=>t=>p(a=>({...a,[e]:t})),m="dark"===a?h.dark:h.light,[v,x]=(0,i.useState)(null),[g,y]=(0,i.useState)(null),b=v??m.colors,S=g??m.base,C=e=>t=>{let a=[...b];a[e]=t,x(a)},[A,I]=(0,i.useState)(124),[j,R]=(0,i.useState)(800),[E,B]=(0,i.useState)(-.02),[L,D]=(0,i.useState)(1),[P,T]=(0,i.useState)(1),[W,q]=(0,i.useState)(1),[U,G]=(0,i.useState)(.5),[N,H]=(0,i.useState)(.5),[Y,V]=(0,i.useState)(.5),[$,O]=(0,i.useState)(8),[_,Q]=(0,i.useState)(1.8),[X,K]=(0,i.useState)(!0),[Z,J]=(0,i.useState)(!0),[ee,et]=(0,i.useState)(!0),[ea,en]=(0,i.useState)(!1);return(0,n.jsxs)("div",{children:[(0,n.jsx)(r.Bg,{}),(0,n.jsxs)(r.VX,{children:[(0,n.jsxs)(r.Ec,{children:[(0,n.jsx)(r.Ch,{onRefresh:t,minHeight:520,enableResponsive:!0,children:(0,n.jsx)("div",{className:"relative h-full w-full",children:(0,n.jsx)(M,{text:s,colors:b,baseColor:S,bandSize:h.bandSize,waviness:h.waviness,grain:h.grain,grainSize:h.grainSize,dotSize:h.dotSize,current:P,fontSize:A,fontWeight:j,letterSpacing:E,lineHeight:L,interactive:ee,stirStrength:W,stirRadius:U,dropInk:X,dropSize:N,viscosity:Y,memory:$,intro:Z,introDuration:_,paused:ea},e)})}),(0,n.jsxs)(r.IH,{children:[(0,n.jsx)(r.UD,{title:"Text",value:s,onChange:u}),(0,n.jsx)(r.bg,{title:"Look",value:c,options:z,onChange:e=>{d(e),p(k[e]??w),x(null),y(null)}}),(0,n.jsx)(r.W7,{title:"Vein",value:b[0],onChange:C(0)}),(0,n.jsx)(r.W7,{title:"Thread",value:b[1],onChange:C(1)}),(0,n.jsx)(r.W7,{title:"Base",value:S,onChange:y}),(0,n.jsx)(r.yt,{title:"Band Size",min:.08,max:1.5,step:.01,value:h.bandSize,onChange:f("bandSize")}),(0,n.jsx)(r.yt,{title:"Waviness",min:0,max:2,step:.01,value:h.waviness,onChange:f("waviness")}),(0,n.jsx)(r.yt,{title:"Grain",min:0,max:1,step:.01,value:h.grain,onChange:f("grain")}),(0,n.jsx)(r.yt,{title:"Grain Size",min:1.2,max:8,step:.1,value:h.grainSize,valueUnit:"px",onChange:f("grainSize")}),(0,n.jsx)(r.yt,{title:"Dot Size",min:.3,max:2,step:.05,value:h.dotSize,onChange:f("dotSize")}),(0,n.jsx)(r.yt,{title:"Current",min:0,max:4,step:.05,value:P,onChange:T}),(0,n.jsx)(r.yt,{title:"Font Size",min:40,max:260,step:1,value:A,valueUnit:"px",onChange:I}),(0,n.jsx)(r.yt,{title:"Font Weight",min:400,max:900,step:100,value:j,onChange:R}),(0,n.jsx)(r.yt,{title:"Letter Spacing",min:-.1,max:.3,step:.005,value:E,valueUnit:"em",onChange:B}),(0,n.jsx)(r.yt,{title:"Line Height",min:.8,max:1.6,step:.01,value:L,onChange:D}),(0,n.jsx)(r.yt,{title:"Stir Strength",min:0,max:3,step:.05,value:W,onChange:q}),(0,n.jsx)(r.yt,{title:"Stir Radius",min:.1,max:2,step:.05,value:U,onChange:G}),(0,n.jsx)(r.yt,{title:"Drop Size",min:.1,max:1.5,step:.05,value:N,onChange:H}),(0,n.jsx)(r.yt,{title:"Viscosity",min:0,max:1,step:.01,value:Y,onChange:V}),(0,n.jsx)(r.yt,{title:"Memory",min:1,max:40,step:.5,value:$,valueUnit:"s",onChange:O}),(0,n.jsx)(r.yt,{title:"Intro Duration",min:.4,max:5,step:.1,value:_,valueUnit:"s",onChange:Q}),(0,n.jsx)(r.tl,{title:"Drop Ink",checked:X,onChange:K}),(0,n.jsx)(r.tl,{title:"Intro",checked:Z,onChange:J}),(0,n.jsx)(r.tl,{title:"Interactive",checked:ee,onChange:et}),(0,n.jsx)(r.tl,{title:"Paused",checked:ea,onChange:en})]}),(0,n.jsx)(r.Ub,{data:F})]}),(0,n.jsx)(r.lT,{children:(0,n.jsx)(r.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>n.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>d.CopyButton,IH:()=>r.Customize,gI:()=>f,Dn:()=>v,pi:()=>m,W7:()=>l.PreviewColor,Ch:()=>i.PreviewContainer,UD:()=>l.PreviewInput,bg:()=>l.PreviewSelect,yt:()=>l.PreviewSlider,tl:()=>l.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>o.PropTable,VX:()=>n.TabsLayout,bs:()=>p});var n=a(55019);a(27382);var i=a(10236),r=a(69485),l=a(48543),o=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),h=a(90650);let p="rounded-lg border bg-background";function f({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)(p,e),...a,children:t})}function v({title:e,description:t,className:a,children:n}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:n})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>o});var n=a(12115),i=a(30701);let r=()=>()=>{},l=()=>"light";function o(){let{resolvedTheme:e}=(0,i.D)();return(0,n.useSyncExternalStore)(r,()=>"dark"===e?"dark":"light",l)}},90761:(e,t,a)=>{a.d(t,{I:()=>i});var n=a(12115);function i(){let[e,t]=(0,n.useState)(0),a=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);