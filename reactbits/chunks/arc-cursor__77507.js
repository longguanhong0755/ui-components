"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[77507],{56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>n.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>d.CopyButton,IH:()=>l.Customize,gI:()=>m,Dn:()=>p,pi:()=>f,W7:()=>i.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>i.PreviewInput,bg:()=>i.PreviewSelect,yt:()=>i.PreviewSlider,tl:()=>i.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>o.PropTable,VX:()=>n.TabsLayout,bs:()=>v});var n=a(55019);a(27382);var r=a(10236),l=a(69485),i=a(48543),o=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),h=a(90650);let v="rounded-lg border bg-background";function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function f({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)(v,e),...a,children:t})}function p({title:e,description:t,className:a,children:n}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:n})]})}},77507:(e,t,a)=>{a.r(t),a.d(t,{default:()=>B});var n=a(95155),r=a(12115),l=a(56388),i=a(86049),o=a(90761),s=a(12246),u=a(2253),c=a(90650);let d=2*Math.PI,h=1/240,v=(e,t,a)=>Math.min(a,Math.max(t,e)),m=e=>{let t=v(e,0,1);return t*t*(3-2*t)},f=(e,t,a)=>m((a-e)/(t-e)),p=new Uint8Array(512),g=new Float32Array(256),x=new Float32Array(256);{let e=Array.from({length:256},(e,t)=>t),t=1337;for(let a=255;a>0;a--){let n=(t=16807*t%0x7fffffff)%(a+1),r=e[a];e[a]=e[n],e[n]=r}for(let t=0;t<512;t++)p[t]=e[255&t];for(let e=0;e<256;e++)g[e]=Math.cos(e/256*d),x[e]=Math.sin(e/256*d)}let y=(e,t)=>{let a=Math.floor(e),n=Math.floor(t),r=255&a,l=255&n,i=e-a,o=t-n,s=p[r+p[l]],u=p[r+1+p[l]],c=p[r+p[l+1]],d=p[r+1+p[l+1]],h=g[s]*i+x[s]*o,v=g[u]*(i-1)+x[u]*o,m=g[c]*i+x[c]*(o-1),f=g[d]*(i-1)+x[d]*(o-1),y=i*i*i*(i*(6*i-15)+10),b=h+(v-h)*y;return(b+o*o*o*(o*(6*o-15)+10)*(m+(f-m)*y-b))*1.41},b=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},w=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,M=new Map,k=e=>{let t=e.trim(),a=M.get(t);if(a)return a;let n=[0,0,0,0],r=t.replace("#","");if(/^[0-9a-f]{3}$/i.test(r)||/^[0-9a-f]{6}$/i.test(r)){let e=3===r.length?r.replace(/./g,e=>e+e):r;n=[Number.parseInt(e.slice(0,2),16)/255,Number.parseInt(e.slice(2,4),16)/255,Number.parseInt(e.slice(4,6),16)/255,1]}else if("undefined"!=typeof document){let e=document.createElement("canvas");e.width=1,e.height=1;let a=e.getContext("2d",{willReadFrequently:!0});if(a){a.fillStyle="rgba(0, 0, 0, 0)",a.fillStyle=t,a.fillRect(0,0,1,1);let e=a.getImageData(0,0,1,1).data,r=e[3]/255;r>0&&(n=[e[0]/255/r,e[1]/255/r,e[2]/255/r,r])}}return M.set(t,n),n},S=([e,t,a])=>.2126*e+.7152*t+.0722*a,C=`
in vec4 aSegment;
in vec4 aTrack;
in vec4 aLevel;
in vec4 aMeta;
uniform vec2 uView;
out vec2 vPoint;
flat out vec4 vSegment;
flat out vec4 vTrack;
flat out vec4 vLevel;
flat out vec4 vMeta;

void main() {
  vec2 a = aSegment.xy;
  vec2 axis = aSegment.zw - a;
  float span = length(axis);
  vec2 dir = span > 1e-4 ? axis / span : vec2(1.0, 0.0);
  vec2 side = vec2(-dir.y, dir.x);
  float pad = max(aLevel.z, aLevel.w) * 7.0 + max(aTrack.z, aTrack.w) * 1.3 + 2.0;
  vec2 point = a + dir * mix(-pad, span + pad, position.x * 0.5 + 0.5) + side * position.y * pad;
  gl_Position = vec4(point.x / uView.x * 2.0 - 1.0, 1.0 - point.y / uView.y * 2.0, 0.0, 1.0);
  vPoint = point;
  vSegment = aSegment;
  vTrack = aTrack;
  vLevel = aLevel;
  vMeta = vec4(aMeta.xy, 0.0, 0.0);
}
`,F=`
precision highp float;
precision highp int;
uniform float uTime;
in vec2 vPoint;
flat in vec4 vSegment;
flat in vec4 vTrack;
flat in vec4 vLevel;
flat in vec4 vMeta;
out vec4 fragColor;

uint scramble(uint x) {
  x ^= x >> 16u;
  x *= 0x7feb352du;
  x ^= x >> 15u;
  x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}

vec2 lattice(ivec2 c, uint seed) {
  uint h = scramble(uint(c.x & 1023) * 0x8da6b343u + uint(c.y & 1023) * 0xd8163841u + seed * 0xcb1ab31fu);
  return vec2(float(h & 65535u), float(h >> 16u)) / 32767.5 - 1.0;
}

float wave(vec2 p, uint seed, out float slope) {
  vec2 i = floor(p);
  vec2 f = p - i;
  vec2 m = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 dm = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  ivec2 c = ivec2(i);
  vec2 ga = lattice(c, seed);
  vec2 gb = lattice(c + ivec2(1, 0), seed);
  vec2 gc = lattice(c + ivec2(0, 1), seed);
  vec2 gd = lattice(c + ivec2(1, 1), seed);
  float va = dot(ga, f);
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0));
  float k = va - vb - vc + vd;
  slope = ga.x + m.x * (gb.x - ga.x) + m.y * (gc.x - ga.x) + m.x * m.y * (ga.x - gb.x - gc.x + gd.x) + dm.x * (vb - va + m.y * k);
  return va + m.x * (vb - va) + m.y * (vc - va) + m.x * m.y * k;
}

void main() {
  vec2 a = vSegment.xy;
  vec2 axis = vSegment.zw - a;
  float span = length(axis);
  vec2 dir = span > 1e-4 ? axis / span : vec2(1.0, 0.0);
  vec2 rel = vPoint - a;
  float s = dot(rel, dir);
  float h = dot(rel, vec2(-dir.y, dir.x));
  float t = span > 1e-4 ? s / span : 0.0;
  float k = clamp(t, 0.0, 1.0);
  float u = mix(vTrack.x, vTrack.y, t);
  float stretch = span > 1e-4 ? (vTrack.y - vTrack.x) / span : 1.0;
  float amp = mix(vTrack.z, vTrack.w, k);
  uint seed = uint(vMeta.y + 0.5);
  float fine;
  float micro;
  float crinkle = wave(vec2(u * 0.125, uTime * 4.75), seed, fine);
  float grit = wave(vec2(u * 0.25 + 17.0, uTime * 6.75 + 5.0), seed + 1u, micro);
  float offset = (crinkle + grit * 0.35) * amp;
  float slope = (fine * 0.125 + micro * 0.0875) * amp * stretch;
  float across = (h - offset) * inversesqrt(1.0 + slope * slope);
  float beyond = max(-s, 0.0) + max(s - span, 0.0);
  float d = length(vec2(beyond, across));
  float w = mix(vLevel.z, vLevel.w, k);
  float e = mix(vLevel.x, vLevel.y, k);
  float spread = length(rel - axis * k);
  float line = (exp(-d * d / (w * w * 0.5)) + exp(-spread / (w * 2.2)) * 0.6 * smoothstep(w * 7.0, w * 3.8, spread)) * e;
  float hot = exp(-d * d / (w * w * 0.16)) * e;
  float group = vMeta.x;
  fragColor = vec4(group < 0.5 ? line : 0.0, group > 0.5 && group < 1.5 ? line : 0.0, group > 1.5 ? line : 0.0, hot);
}
`,L=`
in vec4 aSegment;
in vec4 aLevel;
in vec4 aMeta;
uniform vec2 uView;
uniform float uSigma;
uniform float uWide;
out vec2 vPoint;
flat out vec4 vSegment;
flat out vec4 vLevel;
flat out vec4 vMeta;

void main() {
  vec2 a = aSegment.xy;
  vec2 axis = aSegment.zw - a;
  float span = length(axis);
  vec2 dir = span > 1e-4 ? axis / span : vec2(1.0, 0.0);
  vec2 side = vec2(-dir.y, dir.x);
  float reach = aMeta.y > 0.0 ? uSigma * 3.2 : 0.0;
  float pad = (uWide > 0.5 ? reach : max(max(aLevel.z, aLevel.w) * 20.0, reach)) + 2.0;
  if (uWide > 0.5 && aMeta.y <= 0.0) pad = 0.0;
  vec2 point = a + dir * mix(-pad, span + pad, position.x * 0.5 + 0.5) + side * position.y * pad;
  gl_Position = vec4(point.x / uView.x * 2.0 - 1.0, 1.0 - point.y / uView.y * 2.0, 0.0, 1.0);
  vPoint = point;
  vSegment = aSegment;
  vLevel = aLevel;
  vMeta = vec4(aMeta.xy, 0.0, 0.0);
}
`,A=`
precision highp float;
uniform float uSigma;
uniform float uWide;
in vec2 vPoint;
flat in vec4 vSegment;
flat in vec4 vLevel;
flat in vec4 vMeta;
out vec4 fragColor;

void main() {
  vec2 a = vSegment.xy;
  vec2 axis = vSegment.zw - a;
  vec2 rel = vPoint - a;
  float k = clamp(dot(rel, axis) / max(dot(axis, axis), 1e-6), 0.0, 1.0);
  float d = length(rel - axis * k);
  float w = mix(vLevel.z, vLevel.w, k);
  float e = mix(vLevel.x, vLevel.y, k);
  float bloom = exp(-d * d / (2.0 * uSigma * uSigma)) * smoothstep(uSigma * 3.2, uSigma * 1.9, d) * vMeta.y * e;
  float haze = exp(-d / (w * 4.5)) * smoothstep(w * 20.0, w * 12.0, d) * 0.6 * vMeta.x * e;
  fragColor = uWide > 0.5 ? vec4(bloom, 0.0, 0.0, 0.0) : vec4(haze, bloom, 0.0, 0.0);
}
`,E=`
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,T=`
precision highp float;
uniform sampler2D uSource;
uniform vec2 uStep;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 sum = texture(uSource, vUv) * 0.2270270270;
  sum += (texture(uSource, vUv + uStep * 1.3846153846) + texture(uSource, vUv - uStep * 1.3846153846)) * 0.3162162162;
  sum += (texture(uSource, vUv + uStep * 3.2307692308) + texture(uSource, vUv - uStep * 3.2307692308)) * 0.0702702703;
  fragColor = sum;
}
`,j=`
precision highp float;
uniform sampler2D uLine;
uniform sampler2D uGlow;
uniform sampler2D uWide;
uniform vec3 uCore;
uniform vec3 uAccent;
uniform vec3 uHalo;
uniform vec3 uDeep;
uniform float uGlowAmount;
uniform float uGain;
uniform float uMode;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 line = texture(uLine, vUv);
  vec2 aura = texture(uGlow, vUv).rg;
  float wide = texture(uWide, vUv).r;
  float body = line.r + line.g;
  float haze = aura.r * uGlowAmount;
  float bloom = (aura.g * 0.34 + wide * 0.17) * uGlowAmount;
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  if (uMode < 0.5) {
    vec3 light = uCore * body + uAccent * line.b + uHalo * (haze + bloom);
    float energy = body + line.b + haze + bloom;
    float alpha = 1.0 - exp(-energy * uGain);
    vec3 color = 1.0 - exp(-light * uGain);
    alpha = clamp(alpha + grain, 0.0, 1.0);
    fragColor = vec4(clamp(color + grain, 0.0, alpha), alpha);
  } else {
    float veil = (haze + bloom) * 0.3;
    vec3 tone = (uCore * body + uAccent * line.b + uHalo * veil) / max(body + line.b + veil, 1e-4);
    tone = mix(tone, uDeep, clamp(line.a, 0.0, 1.0) * 0.55);
    float energy = line.a * 0.9 + (body + line.b) * 0.4 + veil;
    float alpha = clamp(1.0 - exp(-energy * uGain) + grain, 0.0, 1.0);
    fragColor = vec4(tone * alpha, alpha);
  }
}
`,I=(0,r.forwardRef)(function({colors:e=["#7B5CFF","#FF9FFC"],backgroundColor:t="transparent",mode:a="auto",thickness:l=1.5,glow:i=1,intensity:o=1,length:p=.55,bend:g=10,crackle:x=1.5,speed:M=1,flicker:I=.5,strands:P=3,branches:W=.5,charge:U=.5,follow:R=.03,discharge:z=!0,autoplay:B=!0,autoplaySpeed:G=1,idleDelay:N=1.5,interactive:D=!0,paused:V=!1,dpr:H=2,className:_,style:X,children:q},O){let Y=(0,r.useRef)(null),$=(0,r.useRef)(null),K=(0,r.useRef)(null),Q={colors:e,backgroundColor:t,mode:a,thickness:l,glow:i,intensity:o,length:p,bend:g,crackle:x,speed:M,flicker:I,strands:P,branches:W,charge:U,follow:R,discharge:z,autoplay:B,autoplaySpeed:G,idleDelay:N,interactive:D,paused:V,dpr:H,reduced:(0,r.useSyncExternalStore)(b,w,()=>!1)},Z=(0,r.useRef)(Q);(0,r.useEffect)(()=>{Z.current=Q,K.current?.sync()}),(0,r.useEffect)(()=>{let e=Y.current,t=$.current;if(!e||!t)return;let a=((e,t,a)=>{let n,r=e.ownerDocument,l=r.defaultView??window,i=r.createElement("canvas");i.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";try{n=new s.WebGLRenderer({canvas:i,alpha:!0,antialias:!1,depth:!1,stencil:!1,premultipliedAlpha:!0,powerPreference:"high-performance"})}catch{return null}if(!n.capabilities.isWebGL2)return n.dispose(),null;t.appendChild(i),n.autoClear=!1;let o=n.extensions.has("EXT_color_buffer_float")||n.extensions.has("EXT_color_buffer_half_float")?u.ix0:u.OUM,c=new u.qUd(-1,1,1,-1,0,1),p=new u.bdM(2,2),g=(e,t)=>{let a=new u.CmU;a.index=p.index,a.setAttribute("position",p.getAttribute("position"));let n=t.map(t=>{let n=new u.uWO(new Float32Array(4*e),4);return n.setUsage(u.Vnu),a.setAttribute(t,n),n});return a.instanceCount=0,{geometry:a,attributes:n}},x=g(12288,["aSegment","aTrack","aLevel","aMeta"]),b=g(12288,["aSegment","aLevel","aMeta"]),[w,M,I,P]=x.attributes.map(e=>e.array),[W,U,R]=b.attributes.map(e=>e.array),z={depthTest:!1,depthWrite:!1,transparent:!0,side:u.$EB,blending:u.bCz,blendEquation:u.$ei,blendEquationAlpha:u.$ei},B=new u.BKk({...z,glslVersion:u.Wdf,uniforms:{uView:{value:new u.I9Y(1,1)},uTime:{value:0}},vertexShader:C,fragmentShader:F}),G=new u.BKk({...z,glslVersion:u.Wdf,uniforms:{uView:{value:new u.I9Y(1,1)},uSigma:{value:16},uWide:{value:0}},vertexShader:L,fragmentShader:A}),N=new u.BKk({glslVersion:u.Wdf,uniforms:{uLine:{value:null},uGlow:{value:null},uWide:{value:null},uCore:{value:new u.Q1f},uAccent:{value:new u.Q1f},uHalo:{value:new u.Q1f},uDeep:{value:new u.Q1f},uGlowAmount:{value:1},uGain:{value:1.4},uMode:{value:0}},vertexShader:E,fragmentShader:j,depthTest:!1,depthWrite:!1,blending:u.XIg}),D=new u.BKk({glslVersion:u.Wdf,uniforms:{uSource:{value:null},uStep:{value:new u.I9Y}},vertexShader:E,fragmentShader:T,depthTest:!1,depthWrite:!1,blending:u.XIg}),V=(e,t)=>{let a=new u.eaF(e,t);a.frustumCulled=!1;let n=new u.Z58;return n.add(a),n},H=V(x.geometry,B),_=V(b.geometry,G),X=V(p,N),q=V(p,D),O=null,Y=null,$=null,K=null,Q=0,Z=0,J="",ee=0,et=0,ea=!1,en=!1,er=!1,el=0,ei=0,eo=0,es=0,eu=0,ec=30*Math.random(),ed=0,eh=null,ev=0,em=0,ef=0,ep=1,eg=0,ex=0,ey=0,eb=0,ew=0,eM=[],ek=[],eS=[],eC=[],eF=new Float64Array(2048),eL=new Float64Array(2048),eA=new Float64Array(2048),eE=new Float64Array(2048),eT=new Float64Array(2048),ej=new Float64Array(2048),eI=new Float64Array(2048),eP=new Float64Array(2048),eW=new Float64Array(2048),eU=new Float64Array(2048),eR={x:0,y:0,vx:0,vy:0,pace:0,ready:!1,gain:0},ez={x:0,y:0,inside:!1,seen:!1,leftAt:0,fresh:!0},eB=()=>(ep=48271*ep%0x7fffffff)%997,eG=(e,t)=>new u.nWS(Math.max(1,e),Math.max(1,t),{type:o,format:u.GWd,minFilter:u.k6q,magFilter:u.k6q,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1}),eN=()=>{O?.dispose(),Y?.dispose(),$?.dispose(),K?.dispose(),O=null,Y=null,$=null,K=null},eD=()=>{let t=a.current,r=e.getBoundingClientRect(),i=Math.max(1,Math.round(r.width)),o=Math.max(1,Math.round(r.height)),s=Math.max(.5,Math.min(l.devicePixelRatio||1,Math.max(t.dpr,.5),Math.sqrt(45e5/(i*o)))),u=`${i}x${o}@${s.toFixed(3)}`;return u!==J&&(J=u,Q=i,Z=o,n.setPixelRatio(s),n.setSize(Q,Z,!1),eN(),O=eG(Math.round(Q*s),Math.round(Z*s)),Y=eG(Math.ceil(.5*Q),Math.ceil(.5*Z)),$=eG(Math.ceil(.125*Q),Math.ceil(.125*Z)),K=eG(Y.width,Y.height),!0)},eV=(e,t,a,n)=>{ex=Math.min(ex,e,a),ey=Math.min(ey,t,n),eb=Math.max(eb,e,a),ew=Math.max(ew,t,n)},eH=(e,t,a,n,r,l,i,o,s,u,c,d,h,v)=>{if(eo>=12288||s<=.004&&u<=.004)return;let m=4*eo;w[m]=e,w[m+1]=t,w[m+2]=a,w[m+3]=n,M[m]=r,M[m+1]=l,M[m+2]=i,M[m+3]=o,I[m]=s,I[m+1]=u,I[m+2]=Math.max(c,.2),I[m+3]=Math.max(d,.2),P[m]=h,P[m+1]=v,P[m+2]=0,P[m+3]=0,eo++,eV(e,t,a,n)},e_=(e,t,a,n,r,l,i,o,s,u)=>{if(es>=12288||r<=.004&&l<=.004)return;let c=4*es;W[c]=e,W[c+1]=t,W[c+2]=a,W[c+3]=n,U[c]=r,U[c+1]=l,U[c+2]=Math.max(i,.2),U[c+3]=Math.max(o,.2),R[c]=s,R[c+1]=u,R[c+2]=0,R[c+3]=0,es++,eV(e,t,a,n)},eX=(e,t,n,r,l,i,o,s,u,c,d,h,f)=>{let p=n-e,g=r-t,x=Math.hypot(p,g);if(x<2||o<.01)return;let b=a.current,w=-g/x,M=p/x,k=Math.max(4,Math.min(48,Math.ceil(x/3))),S=.3*v(b.bend,0,60)+.05*x,C=2.2*v(b.crackle,0,3)*.8,F=Math.max(.3*x,14),L=i%97*41,A=e,E=t,T=L,j=0,I=o,P=s,W=e,U=t,R=o;for(let a=1;a<=k;a++){let n=a/k,r=n*x,v=m(r/12),b=l*Math.sin(Math.PI*n),z=b+(y(r/F+3.1*i,1.4*f+i)+.4*y(r/(.42*F)+5.3*i+19,2.5*f-i))*S*v,B=e+p*n+w*z,G=t+g*n+M*z,N=o*(1-h*n),D=s*(1-.35*n),V=C*v,H=L+r;if(eH(A,E,B,G,T,H,j,V,I,N,P,D,u,i),c>0&&e_(A,E,B,G,I,N,P,D,c,0),d>0&&(a%3==0||a===k)){let a=e+p*n+w*b,r=t+g*n+M*b;e_(W,U,a,r,R,N,s,s,0,d),W=a,U=r,R=N}A=B,E=G,T=H,j=V,I=N,P=D}},eq=(e,t,a,n)=>{let r=eM[eM.length-1];r&&.75>Math.hypot(e-r.x,t-r.y)||(r&&(eu+=Math.hypot(e-r.x,t-r.y)),eM.push({x:e,y:t,t:n,speed:a}))},eO=(e,t)=>{eR.x=e,eR.y=t,eR.vx=0,eR.vy=0,eR.pace=0,eR.ready=!0,eM.length=0},eY=(e,t,n)=>{let r=2/v(a.current.follow,.005,.4),l=0;for(;n-l>1e-6;){let a=Math.min(h,n-l);l+=a,eR.vx+=(r*r*(e-eR.x)-2*r*eR.vx)*a,eR.vy+=(r*r*(t-eR.y)-2*r*eR.vy)*a,eR.x+=eR.vx*a,eR.y+=eR.vy*a,eR.pace+=(Math.hypot(eR.vx,eR.vy)-eR.pace)*(1-Math.exp(-a/.09)),eq(eR.x,eR.y,eR.pace,el-n+l)}},e$=(e,t)=>{for(let a of e)a.clearUpdateRanges(),t>0&&(a.addUpdateRange(0,4*t),a.needsUpdate=!0)},eK=(e,t,a,n=1)=>e.setRGB((t[0]+(1-t[0])*a)*n,(t[1]+(1-t[1])*a)*n,(t[2]+(1-t[2])*a)*n),eQ=()=>{en||er||!ea||ee||(ee=l.requestAnimationFrame(eZ))};function eZ(t){if(ee=0,en||er)return;let r=a.current,o=et?v((t-et)/1e3,0,1/15):1/60;if(et=t,"auto"===r.mode&&t-ev>1200&&(ev=t,eh=null),!r.paused){el+=o,ei+=o*v(r.speed,0,5)*(r.reduced?.15:1);let e=ez.inside?0:(t-ez.leftAt)/1e3,n=r.autoplay&&!r.reduced&&(!ez.seen||!ez.inside&&e>Math.max(r.idleDelay,0));if(ez.inside)ed=0,eR.gain=1,eR.ready||eO(ez.x,ez.y),eY(ez.x,ez.y,o);else if(n||ed>0){let e,t=ed<=0;eR.gain=m(ed=v(ed+(n?o/.7:-o/.25),0,1)),ec+=o*v(r.autoplaySpeed,0,5)*Math.max(1,560/Math.max(Math.min(Q,Z),1));let a={x:Q*(.5+.32*Math.sin(.92*(e=ec))+.08*Math.sin(2.3*e+.4)),y:Z*(.5+.26*Math.sin(1.45*e+.8)+.07*Math.cos(3.1*e+.3))};(t||!eR.ready)&&eO(a.x,a.y),eY(a.x,a.y,o)}else eR.ready=!1,eR.gain=Math.max(0,eR.gain-o/.2);(e=>{let t=a.current;eo=0,es=0,ex=1/0,ey=1/0,eb=-1/0,ew=-1/0;let n=v(t.length,.05,3);for(;eM.length>0&&el-eM[0].t>n;)eM.shift();let r=v(t.thickness,.3,8),l=v(t.bend,0,60),i=v(t.crackle,0,3),o=t.reduced?0:v(t.flicker,0,1),s=ei,u=8192*Math.floor(eu/8192),c=eR.gain;((e,t)=>{if(eg=0,eM.length<2||t<=.001)return;let a=eM[eM.length-1];eF[0]=a.x,eL[0]=a.y,eT[0]=0,ej[0]=eu,eI[0]=t*(1-m(((el-a.t)/e-.2)/.8))*(.72+.28*m(a.speed/900)),eg=1;let n=eu%3;n<.5&&(n+=3);let r=0;for(let a=eM.length-1;a>0&&eg<2048;a--){let l=eM[a],i=eM[a-1],o=i.x-l.x,s=i.y-l.y,u=Math.hypot(o,s);if(!(u<1e-6)){for(;n<=r+u&&eg<2048;){let a=(n-r)/u,c=1-m(((el-(l.t+(i.t-l.t)*a))/e-.2)/.8),d=l.speed+(i.speed-l.speed)*a;eF[eg]=l.x+o*a,eL[eg]=l.y+s*a,eT[eg]=n,ej[eg]=eu-n,eI[eg]=c*(.72+.28*m(d/900))*t,eg++,n+=3}r+=u}}for(let e=0;e<eg;e++){let t=Math.max(0,e-1),a=Math.min(eg-1,e+1),n=eF[a]-eF[t],r=eL[a]-eL[t],l=Math.hypot(n,r)||1;eA[e]=-r/l,eE[e]=n/l}let l=Math.exp(-3/18),i=Math.exp(-.075);for(let e=1;e<eg;e++)eI[e]+=(eI[e-1]-eI[e])*l;for(let e=eg-2;e>=0;e--)eI[e]+=(eI[e+1]-eI[e])*l;let o=m(eT[eg-1]/90);for(let e=0;e<eg;e++)eP[e]=eI[e];for(let e=1;e<eg;e++)eP[e]+=(eP[e-1]-eP[e])*i;for(let e=eg-2;e>=0;e--)eP[e]+=(eP[e+1]-eP[e])*i;for(let e=0;e<eg;e++)eP[e]*=o})(n,c);let h=Math.round(v(t.strands,1,4));for(let e=0;e<h&&eg>1;e++){let t=0===e,a=t?.7:.6+.2*e,n=s*(1+.19*e),c=7*e+3,d=1-.3*o*(.5+.5*y(15*n,2.3*e+50)),h=2.2*i*a,p=0,g=0,x=0,b=0,w=0,M=0;for(let i=0;i<eg;i++){let o=ej[i],s=m(eT[i]/20),k=(y(o/140+13.1*c,.73*n+5.7*c)*l+y(o/46+7.3*c+31.7,2.1*n-2.9*c)*l*.4)*a*s,S=eF[i]+eA[i]*k,C=eL[i]+eE[i]*k,F=v(.5+.5*y(o/64+5.1*e,2.25*n+3.3*e),0,1),L=t?1:.3+.45*f(-.35,.28,y(o/110+3.7*e+90,.53*n+e)),A=eI[i]*L*d*(.7+.6*F),E=r*(t?1:.5)*(.5+F),T=h*s;t&&(eW[i]=S,eU[i]=C),i>0&&(eH(p,g,S,C,x-u,o-u,b,T,w,A,M,E,+!t,c),e_(p,g,S,C,w,A,M,E,t?1:.55,0)),p=S,g=C,x=o,b=T,w=A,M=E}}for(let e=0;e<eg-1;e+=3){let t=Math.min(e+3,eg-1);e_(eF[e],eL[e],eF[t],eL[t],eP[e],eP[t],r,r,0,1)}let p=v(t.branches,0,1);if(eg>16&&p>0&&!t.reduced&&Math.random()<e*p*8){let e=6+Math.floor(Math.random()*(eg-8));eI[e]>.2&&(ek.push({u:ej[e],turn:(.5>Math.random()?-1:1)*(.45+.6*Math.random()),reach:16+34*Math.random(),bow:(Math.random()-.5)*14,seed:eB(),born:el,life:.16+.26*Math.random()}),ek.length>10&&ek.shift())}for(let e=ek.length-1;e>=0;e--){let t=ek[e],a=el-t.born,n=eg>2?1+Math.round((ej[1]-t.u)/3):-1;if(a>t.life||n<1||n>=eg-1){ek.splice(e,1);continue}let l=eW[n],i=eU[n],o=eW[n+1]-eW[n-1],u=eU[n+1]-eU[n-1],c=Math.hypot(o,u)||1,d=Math.cos(t.turn),h=Math.sin(t.turn),v=o/c*d-u/c*h,m=o/c*h+u/c*d,f=Math.pow(Math.sin(Math.PI*(a/t.life)),.7),p=t.reach*(.6+.4*Math.min(eI[n],1));eX(l,i,l+v*p,i+m*p,t.bow,t.seed,f*eI[n]*.85,.7*r,2,.5,0,.8,s)}let g=v(t.charge,0,1);g>0&&eR.ready&&c>.3&&!t.reduced&&Math.random()<e*g*9*(.35+.65*(1-m(Math.hypot(eR.vx,eR.vy)/500)))&&(eS.push({angle:Math.random()*d,reach:(9+16*Math.random())*(.6+.7*g),bow:(Math.random()-.5)*10,seed:eB(),born:el,life:.12+.18*Math.random()}),eS.length>8&&eS.shift());for(let e=eS.length-1;e>=0;e--){let t=eS[e],a=el-t.born;if(a>t.life||!eR.ready){eS.splice(e,1);continue}let n=Math.pow(Math.sin(Math.PI*(a/t.life)),.8);eX(eR.x,eR.y,eR.x+Math.cos(t.angle)*t.reach,eR.y+Math.sin(t.angle)*t.reach,t.bow,t.seed,n*g*c,.65*r,2,.45,0,.85,s)}ef=0;for(let e=eC.length-1;e>=0;e--){let t=eC[e],a=el-t.born;if(a>.9){eC.splice(e,1);continue}let n=m(a/.03)*Math.exp(-a/.22);ef=Math.max(ef,n);let l=1-Math.exp(-a/.05);for(let e=0;e<t.count;e++){let a=31*t.seed+7*e,i=e/t.count*d+.6*y(.37*a,.5),o=t.reach*(.6+.4*(.5+.5*y(.61*a,1.5)))*l,u=t.x+Math.cos(i)*o,c=t.y+Math.sin(i)*o,h=y(.83*a,2.5)*o*.22;if(eX(t.x,t.y,u,c,h,a%997,n,1.05*r,0,1,1,.7,s),e%2==0&&o>30){let l=.45+.2*(.5+.5*y(.29*a,3.5)),d=h*Math.sin(Math.PI*l),v=t.x+(u-t.x)*l-(c-t.y)/o*d,m=t.y+(c-t.y)*l+(u-t.x)/o*d,f=i+(e%4==0?.75:-.75),p=.35*o;eX(v,m,v+Math.cos(f)*p,m+Math.sin(f)*p,.3*h,(a+5)%997,.8*n,.7*r,2,.5,0,.85,s)}}}})(o)}(()=>{let t,r=a.current;if(!O||!Y||!$||!K)return;let o="glow"===(t=a.current.mode)||"ink"!==t&&(null===eh&&(eh=.45>(()=>{let t=k(a.current.backgroundColor);if(t[3]>.5)return S(t);let n=e.parentElement;for(;n;){let e=k(l.getComputedStyle(n).backgroundColor);if(e[3]>.5)return S(e);n=n.parentElement}return+!l.matchMedia("(prefers-color-scheme: dark)").matches})()),eh);i.style.mixBlendMode=o?"screen":"normal";let[s,u]=r.colors,d=k(s??"#7B5CFF"),h=k(u??s??"#FF9FFC"),m=N.uniforms,f=e=>[d[0]+(h[0]-d[0])*e,d[1]+(h[1]-d[1])*e,d[2]+(h[2]-d[2])*e,1];o?(eK(m.uCore.value,f(.35),.6),eK(m.uAccent.value,h,.4),eK(m.uHalo.value,f(.2),0)):(eK(m.uCore.value,d,0),eK(m.uAccent.value,f(.55),0),eK(m.uHalo.value,f(.2),.45)),eK(m.uDeep.value,d,0,.72);let p=1+.42*v(r.reduced?0:r.flicker,0,1)*y(5.25*ei,7.5);if(m.uGlowAmount.value=v(r.glow,0,2)*(o?1:.5),m.uGain.value=1.4*v(r.intensity,0,3)*p*(1+.3*ef),m.uMode.value=+!o,B.uniforms.uView.value.set(Q,Z),G.uniforms.uView.value.set(Q,Z),B.uniforms.uTime.value=ei%4096,e$(x.attributes,eo),e$(b.attributes,es),x.geometry.instanceCount=eo,b.geometry.instanceCount=es,n.setClearColor(0,0),n.setRenderTarget(O),n.clear(),eo>0&&n.render(H,c),n.setRenderTarget(Y),n.clear(),G.uniforms.uSigma.value=16,G.uniforms.uWide.value=0,es>0&&n.render(_,c),es>0){let e=D.uniforms.uStep.value;D.uniforms.uSource.value=Y.texture,e.set(1/Y.width,0),n.setRenderTarget(K),n.render(q,c),D.uniforms.uSource.value=K.texture,e.set(0,1/Y.height),n.setRenderTarget(Y),n.render(q,c)}if(n.setRenderTarget($),n.clear(),G.uniforms.uSigma.value=44,G.uniforms.uWide.value=1,es>0&&n.render(_,c),m.uLine.value=O.texture,m.uGlow.value=Y.texture,m.uWide.value=$.texture,n.setRenderTarget(null),n.clear(),eo+es===0)return;let g=v(Math.floor(ex-164.8),0,Q),w=v(Math.floor(ey-164.8),0,Z),M=v(Math.ceil(eb+164.8),0,Q),C=v(Math.ceil(ew+164.8),0,Z);M<=g||C<=w||(n.setScissor(g,Z-C,M-g,C-w),n.setScissorTest(!0),n.render(X,c),n.setScissorTest(!1))})(),em=eo>0?0:em+o;let s=r.autoplay&&!r.reduced&&!ez.inside,u=ez.inside&&Math.hypot(eR.vx,eR.vy)>.5||eo>0||eC.length>0||eM.length>1;!r.paused&&(s||u||em<.2)&&eQ()}let eJ=(t,n)=>{let r=a.current;if(!r.interactive||r.paused)return;let l=e.getBoundingClientRect(),i=t-l.left,o=n-l.top;if(!(i>=0&&o>=0&&i<=l.width&&o<=l.height)){ez.inside&&(ez.inside=!1,ez.fresh=!0,ez.leftAt=performance.now(),eR.ready=!1,eQ());return}let s=Math.hypot(i-ez.x,o-ez.y)>Math.max(240,.35*Math.min(l.width,l.height));(!ez.inside||ez.fresh||s)&&(ez.inside=!0,ez.seen=!0,ez.fresh=!1,eO(i,o)),ez.x=i,ez.y=o,eQ()},e0=()=>{ez.inside&&(ez.inside=!1,ez.fresh=!0,ez.leftAt=performance.now(),eR.ready=!1,eQ())},e1=(e,t)=>{eC.push({x:e,y:t,born:el,seed:eB(),count:6+Math.floor(3*Math.random()),reach:85+45*Math.random()}),eC.length>5&&eC.shift(),eQ()},e2=e=>{"touch"!==e.pointerType&&eJ(e.clientX,e.clientY)},e5=t=>{let n=a.current;if(!n.interactive||!n.discharge||n.paused||n.reduced||t.button>0)return;let r=e.getBoundingClientRect(),l=t.clientX-r.left,i=t.clientY-r.top;l<0||i<0||l>r.width||i>r.height||e1(l,i)},e4=e=>{let t=e.touches[0];t&&(ez.fresh=!0,eJ(t.clientX,t.clientY))},e3=e=>{let t=e.touches[0];t&&eJ(t.clientX,t.clientY)};l.addEventListener("pointermove",e2,{passive:!0}),l.addEventListener("pointerdown",e5,{passive:!0}),l.addEventListener("touchstart",e4,{passive:!0}),l.addEventListener("touchmove",e3,{passive:!0}),l.addEventListener("touchend",e0,{passive:!0}),l.addEventListener("touchcancel",e0,{passive:!0}),l.addEventListener("blur",e0),r.documentElement.addEventListener("mouseleave",e0);let e6=()=>{eh=null,eQ()},e8=new MutationObserver(e6);e8.observe(r.documentElement,{attributes:!0,attributeFilter:["class","style","data-theme"]}),r.body&&e8.observe(r.body,{attributes:!0,attributeFilter:["class","style","data-theme"]});let e7=l.matchMedia("(prefers-color-scheme: dark)");e7.addEventListener("change",e6);let e9=new ResizeObserver(()=>{eD()&&(eh=null,et=0,eQ())});e9.observe(e);let te="undefined"==typeof IntersectionObserver?null:new IntersectionObserver(([e])=>{(ea=e.isIntersecting)?(et=0,eQ()):ee&&(l.cancelAnimationFrame(ee),ee=0)},{rootMargin:"80px"});te?te.observe(e):ea=!0;let tt=e=>{e.preventDefault(),er=!0,ee&&l.cancelAnimationFrame(ee),ee=0},ta=()=>{er=!1,J="",eD(),et=0,eQ()};return i.addEventListener("webglcontextlost",tt),i.addEventListener("webglcontextrestored",ta),eD(),n.compile(H,c),n.compile(_,c),n.compile(X,c),n.compile(q,c),eQ(),{sync:()=>{eh=null,eD()&&(et=0),eQ()},discharge:(e,t)=>{Number.isFinite(e)&&Number.isFinite(t)&&e1(e,t)},clear:()=>{eM.length=0,ek.length=0,eS.length=0,eC.length=0,eQ()},destroy:()=>{en=!0,ee&&l.cancelAnimationFrame(ee),te?.disconnect(),e9.disconnect(),e8.disconnect(),e7.removeEventListener("change",e6),l.removeEventListener("pointermove",e2),l.removeEventListener("pointerdown",e5),l.removeEventListener("touchstart",e4),l.removeEventListener("touchmove",e3),l.removeEventListener("touchend",e0),l.removeEventListener("touchcancel",e0),l.removeEventListener("blur",e0),r.documentElement.removeEventListener("mouseleave",e0),i.removeEventListener("webglcontextlost",tt),i.removeEventListener("webglcontextrestored",ta),eN(),x.geometry.dispose(),b.geometry.dispose(),p.dispose(),B.dispose(),G.dispose(),N.dispose(),D.dispose(),n.dispose(),n.getContext().isContextLost()||n.forceContextLoss(),i.remove()}}})(e,t,Z);return K.current=a,()=>{a?.destroy(),K.current=null}},[]),(0,r.useImperativeHandle)(O,()=>({discharge:(e,t)=>K.current?.discharge(e,t),clear:()=>K.current?.clear()}),[]);let J=t.trim().toLowerCase();return(0,n.jsxs)("div",{ref:Y,className:(0,c.cn)("relative h-full min-h-[320px] w-full overflow-hidden",_),style:{backgroundColor:"transparent"===J||""===J?void 0:t,...X},children:[(0,n.jsx)("div",{ref:$,"aria-hidden":"true",style:{position:"absolute",inset:0,pointerEvents:"none"}}),q?(0,n.jsx)("div",{style:{position:"relative",zIndex:1,height:"100%"},children:q}):null]})});I.displayName="ArcCursor";let P={dark:["#7B5CFF","#FF9FFC"],light:["#5227FF","#E0409A"],thickness:1.5,glow:1,intensity:1,length:.55,bend:10,crackle:1.5,speed:1,flicker:.5,strands:3,branches:.5,charge:.5},W={arc:P,filament:{...P,thickness:1.1,glow:.7,length:.8,bend:6,crackle:1,speed:.8,flicker:.3,strands:1,branches:0,charge:.25},tesla:{...P,thickness:1.8,glow:1.2,length:.6,bend:14,crackle:2,flicker:.6,strands:4,branches:.9,charge:.8},storm:{...P,thickness:1.6,glow:1.3,intensity:1.15,length:.45,bend:18,crackle:2.4,speed:1.4,flicker:.8,strands:4,branches:1,charge:1},neon:{...P,dark:["#FF9FFC","#7B5CFF"],light:["#E0409A","#5227FF"]},mono:{...P,dark:["#F4F4F5","#A1A1AA"],light:["#18181B","#71717A"]}},U=[{label:"Arc",value:"arc"},{label:"Filament",value:"filament"},{label:"Tesla",value:"tesla"},{label:"Storm",value:"storm"},{label:"Neon",value:"neon"},{label:"Mono",value:"mono"}],R=[{label:"Auto",value:"auto"},{label:"Glow",value:"glow"},{label:"Ink",value:"ink"}],z=[{name:"colors",type:"[string, string]",default:'["#7B5CFF", "#FF9FFC"]',description:"The arc colour and a second colour. On dark pages the arc colour becomes the violet haze and bloom, the core burns white-hot with a hint of the second colour, and forks and sparks take the second colour."},{name:"backgroundColor",type:"string",default:'"transparent"',description:"Background of the component. Leave it transparent to lay the arc over your own page."},{name:"mode",type:'"auto" | "glow" | "ink"',default:'"auto"',description:"Glow draws luminous, screen-blended light for dark pages. Ink draws crisp coloured filaments with a faint veil for light pages. Auto picks one from the background behind the component and follows theme changes."},{name:"thickness",type:"number",default:"1.5",description:"Width of each filament's hot core in pixels. Filaments swell and thin along their length around this value."},{name:"glow",type:"number",default:"1",description:"Strength of the haze and bloom around the arc, from 0 to 2. Ink mode keeps only a faint veil of it."},{name:"intensity",type:"number",default:"1",description:"Overall exposure of the light. Higher values push more of the arc toward white."},{name:"length",type:"number",default:"0.55",description:"Seconds the arc trails behind the cursor. When the pointer stops, the arc retracts into it and goes dark."},{name:"bend",type:"number",default:"10",description:"How far the filaments writhe away from the cursor path, in pixels."},{name:"crackle",type:"number",default:"1.5",description:"Amount of fine, fast crackle riding on the filaments, from 0 to 3."},{name:"speed",type:"number",default:"1",description:"How fast the filaments writhe and crackle. 0 freezes their shape."},{name:"flicker",type:"number",default:"0.5",description:"How much the arc's brightness flickers, from 0 to 1. Reduced-motion users get a steady arc."},{name:"strands",type:"number",default:"3",description:"Number of braided filaments, from 1 to 4. Extra strands are thinner and fade in and out along the arc."},{name:"branches",type:"number",default:"0.5",description:"How often short forks split off the arc, from 0 to 1."},{name:"charge",type:"number",default:"0.5",description:"Small sparks that crackle around the cursor tip, strongest while it rests."},{name:"follow",type:"number",default:"0.03",description:"Seconds the arc takes to catch up with the pointer. A little lag smooths the path."},{name:"discharge",type:"boolean",default:"true",description:"Clicking releases a burst of forked bolts from the pointer. Skipped for reduced-motion users."},{name:"autoplay",type:"boolean",default:"true",description:"Until the pointer arrives, and again after it leaves, an invisible cursor keeps the arc moving."},{name:"autoplaySpeed",type:"number",default:"1",description:"Speed of that invisible cursor."},{name:"idleDelay",type:"number",default:"1.5",description:"Seconds after the pointer leaves before the invisible cursor takes over again."},{name:"interactive",type:"boolean",default:"true",description:"Let the pointer and touch drive the arc. The component listens on the window, so content laid over it still works."},{name:"paused",type:"boolean",default:"false",description:"Freezes the arc. Reduced-motion users never get the invisible cursor."},{name:"dpr",type:"number",default:"2",description:"Maximum device pixel ratio for the canvas."},{name:"ref",type:"{ discharge, clear }",default:"—",description:"Imperative controls: release a burst at a point (in pixels from the top-left corner), or clear the arc."},{name:"children",type:"ReactNode",default:"—",description:"Content rendered above the arc, such as a hero."},{name:"className",type:"string",default:"—",description:"Classes for the root element. It fills its parent, with a 320px minimum height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."}],B=()=>{let[e,t]=(0,o.I)(),a=(0,i.Y)(),[s,u]=(0,r.useState)("arc"),[c,d]=(0,r.useState)(P),h=e=>t=>d(a=>({...a,[e]:t})),[v,m]=(0,r.useState)(null),f=v??("dark"===a?c.dark:c.light),[p,g]=(0,r.useState)(null),x=p??("dark"===a?"#0A0A0A":"#FFFFFF"),[y,b]=(0,r.useState)("auto"),[w,M]=(0,r.useState)(.03),[k,S]=(0,r.useState)(1),[C,F]=(0,r.useState)(1.5),[L,A]=(0,r.useState)(!0),[E,T]=(0,r.useState)(!0),[j,B]=(0,r.useState)(!0),[G,N]=(0,r.useState)(!1);return(0,n.jsxs)("div",{children:[(0,n.jsx)(l.Bg,{}),(0,n.jsxs)(l.VX,{children:[(0,n.jsxs)(l.Ec,{children:[(0,n.jsx)(l.Ch,{onRefresh:t,minHeight:560,enableResponsive:!0,children:(0,n.jsx)("div",{className:"relative h-full w-full",children:(0,n.jsx)(I,{colors:f,backgroundColor:x,mode:y,thickness:c.thickness,glow:c.glow,intensity:c.intensity,length:c.length,bend:c.bend,crackle:c.crackle,speed:c.speed,flicker:c.flicker,strands:c.strands,branches:c.branches,charge:c.charge,follow:w,discharge:L,autoplay:E,autoplaySpeed:k,idleDelay:C,interactive:j,paused:G},e)})}),(0,n.jsxs)(l.IH,{children:[(0,n.jsx)(l.bg,{title:"Preset",value:s,options:U,onChange:e=>{u(e),d(W[e]??P),m(null)}}),(0,n.jsx)(l.W7,{title:"Arc",value:f[0],onChange:e=>m([e,f[1]])}),(0,n.jsx)(l.W7,{title:"Accent",value:f[1],onChange:e=>m([f[0],e])}),(0,n.jsx)(l.W7,{title:"Background",value:x,onChange:g}),(0,n.jsx)(l.bg,{title:"Mode",value:y,options:R,onChange:e=>b(e)}),(0,n.jsx)(l.yt,{title:"Thickness",min:.5,max:4,step:.1,value:c.thickness,valueUnit:"px",onChange:h("thickness")}),(0,n.jsx)(l.yt,{title:"Glow",min:0,max:2,step:.05,value:c.glow,onChange:h("glow")}),(0,n.jsx)(l.yt,{title:"Intensity",min:.2,max:2,step:.05,value:c.intensity,onChange:h("intensity")}),(0,n.jsx)(l.yt,{title:"Length",min:.1,max:2,step:.05,value:c.length,valueUnit:"s",onChange:h("length")}),(0,n.jsx)(l.yt,{title:"Bend",min:0,max:30,step:.5,value:c.bend,valueUnit:"px",onChange:h("bend")}),(0,n.jsx)(l.yt,{title:"Crackle",min:0,max:3,step:.05,value:c.crackle,onChange:h("crackle")}),(0,n.jsx)(l.yt,{title:"Speed",min:0,max:3,step:.05,value:c.speed,onChange:h("speed")}),(0,n.jsx)(l.yt,{title:"Flicker",min:0,max:1,step:.01,value:c.flicker,onChange:h("flicker")}),(0,n.jsx)(l.yt,{title:"Strands",min:1,max:4,step:1,value:c.strands,onChange:h("strands")}),(0,n.jsx)(l.yt,{title:"Branches",min:0,max:1,step:.01,value:c.branches,onChange:h("branches")}),(0,n.jsx)(l.yt,{title:"Charge",min:0,max:1,step:.01,value:c.charge,onChange:h("charge")}),(0,n.jsx)(l.yt,{title:"Follow",min:.005,max:.3,step:.005,value:w,valueUnit:"s",onChange:M}),(0,n.jsx)(l.yt,{title:"Autoplay Speed",min:.1,max:3,step:.05,value:k,onChange:S}),(0,n.jsx)(l.yt,{title:"Idle Delay",min:0,max:6,step:.25,value:C,valueUnit:"s",onChange:F}),(0,n.jsx)(l.tl,{title:"Discharge",checked:L,onChange:A}),(0,n.jsx)(l.tl,{title:"Autoplay",checked:E,onChange:T}),(0,n.jsx)(l.tl,{title:"Interactive",checked:j,onChange:B}),(0,n.jsx)(l.tl,{title:"Paused",checked:G,onChange:N})]}),(0,n.jsx)(l.Ub,{data:z})]}),(0,n.jsx)(l.lT,{children:(0,n.jsx)(l.Gv,{})})]})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>o});var n=a(12115),r=a(30701);let l=()=>()=>{},i=()=>"light";function o(){let{resolvedTheme:e}=(0,r.D)();return(0,n.useSyncExternalStore)(l,()=>"dark"===e?"dark":"light",i)}},90761:(e,t,a)=>{a.d(t,{I:()=>r});var n=a(12115);function r(){let[e,t]=(0,n.useState)(0),a=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);