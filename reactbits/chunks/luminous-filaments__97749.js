"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[97749],{56388:(e,t,a)=>{a.d(t,{Gv:()=>u.CodeExample,lT:()=>n.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>d.CopyButton,IH:()=>l.Customize,gI:()=>m,Dn:()=>v,pi:()=>p,W7:()=>i.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>i.PreviewInput,bg:()=>i.PreviewSelect,yt:()=>i.PreviewSlider,tl:()=>i.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>o.PropTable,VX:()=>n.TabsLayout,bs:()=>f});var n=a(55019);a(27382);var r=a(10236),l=a(69485),i=a(48543),o=a(87552);a(39260);var u=a(52407),s=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),h=a(90650);let f="rounded-lg border bg-background";function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)(f,e),...a,children:t})}function v({title:e,description:t,className:a,children:n}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:n})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>o});var n=a(12115),r=a(30701);let l=()=>()=>{},i=()=>"light";function o(){let{resolvedTheme:e}=(0,r.D)();return(0,n.useSyncExternalStore)(l,()=>"dark"===e?"dark":"light",i)}},90761:(e,t,a)=>{a.d(t,{I:()=>r});var n=a(12115);function r(){let[e,t]=(0,n.useState)(0),a=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}},97749:(e,t,a)=>{a.r(t),a.d(t,{default:()=>E});var n=a(95155),r=a(12115),l=a(56388),i=a(86049),o=a(90761),u=a(2253),s=a(12246),c=a(90650);let d=2*Math.PI,h=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},f=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,m=(e,t,a)=>Math.min(a,Math.max(t,e)),p=(e,t)=>(e%t+t)%t,v=null,g=(e,t)=>{if(v||(v=document.createElement("canvas").getContext("2d")),!v)return t;v.fillStyle="#010203",v.fillStyle=e;let a=String(v.fillStyle);if("#010203"===a&&"#010203"!==e.trim().toLowerCase())return t;if(a.startsWith("#")){let e=a.slice(1);return[parseInt(e.slice(0,2),16)/255,parseInt(e.slice(2,4),16)/255,parseInt(e.slice(4,6),16)/255]}let n=a.match(/[\d.]+/g);return!n||n.length<3?t:[Number(n[0])/255,Number(n[1])/255,Number(n[2])/255]},x=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),b=([e,t,a])=>{let n=x(e),r=x(t),l=x(a),i=Math.cbrt(.4122214708*n+.5363325363*r+.0514459929*l),o=Math.cbrt(.2119034982*n+.6806995451*r+.1073969566*l),u=Math.cbrt(.0883024619*n+.2817188376*r+.6299787005*l);return[.2104542553*i+.793617785*o-.0040720468*u,1.9779984951*i-2.428592205*o+.4505937099*u,.0259040371*i+.7827717662*o-.808675766*u]},w=`
in vec4 aFiber;
in vec2 aSample;
uniform sampler2D uLight;
uniform vec2 uResolution;
uniform float uPixelRatio;
uniform float uTime;
uniform float uSpinPhase;
uniform float uHead;
uniform vec2 uOrigin;
uniform float uAngle;
uniform float uLength;
uniform float uSpread;
uniform float uNeck;
uniform float uFlare;
uniform float uTwist;
uniform float uSway;
uniform float uBreathe;
uniform float uLineWidth;
uniform float uSheath;
uniform float uDefocus;
uniform float uBack;
uniform float uReach;
uniform float uEnergy;
uniform float uInk;
uniform vec3 uLabA;
uniform vec3 uLabB;
out float vDist;
out float vCore;
out float vHalo;
out vec3 vColor;
out float vGain;

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

vec3 fiber(float s, vec4 f) {
  float breath = 1.0 + uBreathe * 0.14 * sin(uTime * 0.31 + 1.1) + uBreathe * 0.05 * sin(uTime * 0.73 + f.z * 6.2831853);
  float open = mix(uNeck, uSpread * breath, pow(s, uFlare)) * f.y;
  float azimuth = f.x + uSpinPhase + uTwist * s + 0.05 * s * sin(uTime * 0.21 + f.z * 6.2831853);
  float x = cos(azimuth) * open;
  float z = sin(azimuth) * open;
  x += uSway * (0.07 * pow(s, 1.7) * sin(uTime * 0.33 + 0.6) + 0.02 * sin(3.1415927 * s) * s * sin(uTime * 0.71 + 2.3));
  return vec3(x, -uLength * s, z / max(open, 1e-4));
}

vec2 toScreen(vec2 p) {
  float c = cos(uAngle);
  float s = sin(uAngle);
  return uOrigin + vec2(c * p.x - s * p.y, s * p.x + c * p.y) * uResolution.y;
}

vec4 lightAt(float s, float row) {
  float k = min(uHead - s * 160.0, floor(uHead));
  float k0 = floor(k);
  float f = k - k0;
  int y = int(row + 0.5);
  vec4 a = texelFetch(uLight, ivec2(int(mod(k0, 168.0)), y), 0);
  vec4 b = texelFetch(uLight, ivec2(int(mod(k0 + 1.0, 168.0)), y), 0);
  return mix(a, b, f);
}

void main() {
  float s = aSample.x;
  float delta = 1.0 / 180.0;
  vec3 p0 = fiber(max(s - delta, 0.0), aFiber);
  vec3 p1 = fiber(s, aFiber);
  vec3 p2 = fiber(min(s + delta, 1.0), aFiber);
  vec2 s0 = toScreen(p0.xy);
  vec2 s1 = toScreen(p1.xy);
  vec2 s2 = toScreen(p2.xy);
  vec2 tangent = normalize(s2 - s0 + vec2(0.0, 1e-5));
  vec2 normal = vec2(-tangent.y, tangent.x);
  float facing = clamp(0.5 + 0.5 * p1.z, 0.0, 1.0);
  float blur = 1.0 + uDefocus * 3.0 * (1.0 - facing) * (1.0 - facing);
  float core = uLineWidth * uPixelRatio * mix(0.45, 1.0, facing) * 0.5 * blur;
  float halo = uSheath * 5.0 * uPixelRatio * mix(0.6, 1.0, facing) * sqrt(blur);
  float reach = max(core * 2.4, halo * 2.2) + 1.5;
  vec2 position2 = s1 + normal * aSample.y * reach;
  vDist = aSample.y * reach;
  vCore = core;
  vHalo = halo;

  vec4 light = lightAt(s, aFiber.w);
  float amount = max(light.x, 0.0);
  float hue = clamp(light.y / max(amount, 1e-3), 0.0, 1.0);
  float heat = clamp(light.z / max(amount, 1e-3), 0.0, 1.0);
  float fade = 1.0 - smoothstep(uReach * 0.5, uReach, s);

  float tone = clamp(hue * 0.8 + s * 0.3, 0.0, 1.0);
  vec3 base = labToLinear(mix(uLabA, uLabB, smoothstep(0.0, 1.0, tone)));
  vec3 glowTint = mix(base, vec3(1.0, 0.95, 1.0), heat * 0.55);
  vec3 inkTint = mix(base, labToLinear(vec3(uLabA.x * 0.6, uLabA.yz * 1.15)), heat * 0.6);
  vColor = mix(glowTint, inkTint, uInk);
  float strand = mix(0.65, 1.0, fract(aFiber.z * 7.13 + 0.31));
  vGain = (0.1 + amount) * fade * strand * mix(uBack, 1.0, facing) * (1.0 + uEnergy * 0.15) / blur;
  gl_Position = vec4(position2 / uResolution * 2.0 - 1.0, 0.0, 1.0);
}
`,y=`
precision highp float;
uniform float uCore;
uniform float uSheathGain;
in float vDist;
in float vCore;
in float vHalo;
in vec3 vColor;
in float vGain;
out vec4 fragColor;

void main() {
  float sigma = max(vCore, 0.55);
  float d = vDist / sigma;
  float core = exp(-d * d) * min(vCore / 0.55, 1.0);
  float h = vDist / max(vHalo, 0.5);
  float sheath = exp(-h * h) * uSheathGain;
  float energy = (core + sheath) * vGain * uCore;
  fragColor = vec4(vColor * energy, energy);
}
`,S=`
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,k=`
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 a = texture(uSource, vUv + uTexel * vec2(-1.0, -1.0));
  vec4 b = texture(uSource, vUv + uTexel * vec2(1.0, -1.0));
  vec4 c = texture(uSource, vUv + uTexel * vec2(-1.0, 1.0));
  vec4 d = texture(uSource, vUv + uTexel * vec2(1.0, 1.0));
  fragColor = (a + b + c + d) * 0.125 + texture(uSource, vUv) * 0.5;
}
`,C=`
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
`,F=`
precision highp float;
uniform sampler2D uLines;
uniform sampler2D uBloom;
uniform vec3 uBackground;
uniform float uGlow;
uniform float uExposure;
uniform float uMode;
uniform float uGrain;
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
  if (uMode < 0.5) {
    vec3 light = (lines.rgb + bloom.rgb * uGlow) * uExposure;
    vec3 exposed = 1.0 - exp(-light);
    float peak = max(exposed.r, max(exposed.g, exposed.b));
    exposed = mix(exposed, vec3(peak), smoothstep(0.75, 1.0, peak) * 0.35);
    color = uBackground + (1.0 - uBackground) * exposed;
  } else {
    float energy = lines.a + bloom.a * uGlow * 0.2;
    vec3 hue = (lines.rgb + bloom.rgb * uGlow * 0.2) / max(energy, 1e-4);
    float cover = clamp(1.0 - exp(-energy * uExposure * 1.4), 0.0, 0.94);
    color = mix(uBackground, clamp(hue * 0.8, 0.0, 1.0), cover);
  }
  float grain = hash(gl_FragCoord.xy + uGrain * 311.0) - 0.5;
  fragColor = vec4(encode(color) + grain * (1.2 / 255.0), 1.0);
}
`,M=(0,r.forwardRef)(function({colors:e=["#7B4DFF","#FF7AD9"],backgroundColor:t="#0A0A0A",mode:a="auto",fibers:l=72,lineWidth:i=1.5,sheath:o=.7,defocus:v=.8,length:M=1.05,spread:L=1,neck:j=.035,flare:A=1.3,originX:B=.5,originY:T=0,angle:E=0,twist:R=.35,depth:P=.6,spin:D=0,sway:U=1,breathe:W=.5,flowSpeed:H=.3,pulses:I=1.3,pulseRate:z=.4,stagger:G=.4,colorFlow:N=.08,reach:q=.85,glow:Y=.5,intensity:O=1,speed:X=1,interactive:_=!0,hoverPulses:V=!0,clickSurge:K=!0,pulseStrength:Z=1,hoverBoost:$=1,paused:Q=!1,quality:J=1,className:ee,style:et,children:ea},en){let er=(0,r.useRef)(null),el=(0,r.useRef)(null),ei=(0,r.useSyncExternalStore)(h,f,()=>!1),eo=(0,r.useRef)({colors:e,backgroundColor:t,mode:a,fibers:l,lineWidth:i,sheath:o,defocus:v,length:M,spread:L,neck:j,flare:A,originX:B,originY:T,angle:E,twist:R,depth:P,spin:D,sway:U,breathe:W,flowSpeed:H,pulses:I,pulseRate:z,stagger:G,colorFlow:N,reach:q,glow:Y,intensity:O,speed:X,interactive:_,hoverPulses:V,clickSurge:K,pulseStrength:Z,hoverBoost:$,paused:Q,quality:J,reduced:ei});return(0,r.useEffect)(()=>{eo.current={colors:e,backgroundColor:t,mode:a,fibers:l,lineWidth:i,sheath:o,defocus:v,length:M,spread:L,neck:j,flare:A,originX:B,originY:T,angle:E,twist:R,depth:P,spin:D,sway:U,breathe:W,flowSpeed:H,pulses:I,pulseRate:z,stagger:G,colorFlow:N,reach:q,glow:Y,intensity:O,speed:X,interactive:_,hoverPulses:V,clickSurge:K,pulseStrength:Z,hoverBoost:$,paused:Q,quality:J,reduced:ei},el.current?.sync()}),(0,r.useEffect)(()=>{let e=er.current;if(!e)return;let t=((e,t)=>{let a,n=document.createElement("canvas");n.setAttribute("aria-hidden","true"),n.style.position="absolute",n.style.inset="0",n.style.width="100%",n.style.height="100%",n.style.display="block",n.style.pointerEvents="none",e.prepend(n);try{a=new s.WebGLRenderer({canvas:n,alpha:!1,antialias:!1,powerPreference:"high-performance"})}catch{return n.remove(),null}if(!a.capabilities.isWebGL2)return a.dispose(),n.remove(),null;a.autoClear=!1;let r=a.extensions.has("EXT_color_buffer_float")||a.extensions.has("EXT_color_buffer_half_float")?u.ix0:u.OUM,l=new u.qUd(-1,1,1,-1,0,1),i=new u.bdM(2,2),o=new u.BKk({glslVersion:u.Wdf,uniforms:{uLight:{value:null},uResolution:{value:new u.I9Y(1,1)},uPixelRatio:{value:1},uTime:{value:0},uSpinPhase:{value:0},uHead:{value:0},uOrigin:{value:new u.I9Y},uAngle:{value:0},uLength:{value:1},uSpread:{value:1},uNeck:{value:.03},uFlare:{value:1.3},uTwist:{value:.35},uSway:{value:1},uBreathe:{value:.5},uLineWidth:{value:1.5},uSheath:{value:.7},uDefocus:{value:.8},uBack:{value:.4},uReach:{value:.85},uEnergy:{value:0},uInk:{value:0},uLabA:{value:new u.Pq0},uLabB:{value:new u.Pq0},uCore:{value:.8},uSheathGain:{value:.1}},vertexShader:w,fragmentShader:y,depthTest:!1,depthWrite:!1,transparent:!0,side:u.$EB,blending:u.bCz,blendEquation:u.gO9,blendSrc:u.qad,blendDst:u.qad,blendSrcAlpha:u.qad,blendDstAlpha:u.qad}),c=(e,t)=>new u.BKk({glslVersion:u.Wdf,uniforms:t,vertexShader:S,fragmentShader:e,depthTest:!1,depthWrite:!1,blending:u.XIg}),h=c(k,{uSource:{value:null},uTexel:{value:new u.I9Y}}),f=c(C,{uSource:{value:null},uBase:{value:null},uTexel:{value:new u.I9Y}}),v=c(F,{uLines:{value:null},uBloom:{value:null},uBackground:{value:new u.Pq0},uGlow:{value:.5},uExposure:{value:1.5},uMode:{value:0},uGrain:{value:0}}),M=null,L=new u.eaF(new u.LoY,o);L.frustumCulled=!1;let j=new u.Z58;j.add(L);let A=new u.eaF(i,v);A.frustumCulled=!1;let B=new u.Z58;B.add(A);let T=(e,t)=>new u.nWS(Math.max(1,e),Math.max(1,t),{type:r,format:u.GWd,minFilter:u.k6q,magFilter:u.k6q,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1}),E=null,R=[],P=[],D=!1,U=0,W=0,H=!0,I=20,z=0,G=0,N=0,q=1,Y=1,O=1,X=0,_={inside:!1,x:0,y:0},V=[],K=()=>{E?.dispose(),R.forEach(e=>e.dispose()),P.forEach(e=>e.dispose()),E=null,R=[],P=[]},Z=(e,t)=>{A.material=e,a.setRenderTarget(t),a.render(B,l)},$=()=>{let e=t.current;return{angle:m(e.angle,-180,180)*Math.PI/180,length:m(e.length,.1,3),spread:m(e.spread,0,2),neck:m(e.neck,0,.5),flare:m(e.flare,.4,4),twist:m(e.twist,-8,8),sway:m(e.sway,0,4),breathe:m(e.breathe,0,3),originX:m(e.originX,-1,2)*q,originY:(1-m(e.originY,-1,2))*Y}},Q=()=>{let e=t.current;return m(e.flowSpeed,0,3)*m(e.speed,0,4)*(1+.3*N)},J=(e,a)=>{let n=t.current,r=M;if(!r)return[0,0];let l=m(n.stagger,0,2)*(.3*Math.sin(r.azimuth[a]+.4)+.7*(r.seed[a]-.5)),i=e*m(n.pulseRate,0,4)+l,o=n.reduced?.7:.5+.5*Math.cos(d*i),u=.78+.22*Math.sin(.37*e+5*r.seed[a]),s=.3+1.1*m(n.pulses,0,2)*o*o*o*u;for(let t of V){let n=e-t.time-.45*r.seed[a];if(n<=0||n>2.5)continue;let l=Math.min(n/.22,1);s+=t.amount*l*l*(3-2*l)*Math.exp(-Math.max(n-.22,0)/.35)}return[s,.5+.5*Math.sin(d*e*m(n.colorFlow,-2,2)+r.azimuth[a]+.6*r.seed[a])]},ee=()=>{let e=M;if(!e)return;let t=160*Math.max(Q(),.05),a=Math.floor(G);for(let n=0;n<168;n++){let r=p(a-n,168),l=I-n/t;for(let t=0;t<e.count;t++){let[a,n]=J(l,t),i=(168*t+r)*4;e.ring[i]=a,e.ring[i+1]=a*n,e.ring[i+2]=0,e.ring[i+3]=0}}e.texture.needsUpdate=!0},et=()=>{let e=Math.round(m(t.current.fibers,8,320));M&&M.count===e||(M&&(M.geometry.dispose(),M.texture.dispose()),L.geometry=(M=(e=>{let t=new Float32Array(181*e*12),a=new Uint32Array(180*e*6),n=new Float32Array(e),r=new Float32Array(e),l=new Float32Array(e),i=0,o=0,s=7,c=()=>(s=16807*s%0x7fffffff)/0x7fffffff;for(let u=0;u<e;u++){n[u]=2.399963*u+(c()-.5)*.25,r[u]=Math.pow(.03+(.618034*u+.31)%1*.97,.4),l[u]=c();let e=i/6;for(let e=0;e<=180;e++){let a=e/180;t.set([n[u],r[u],l[u],u,a,-1,n[u],r[u],l[u],u,a,1],i),i+=12}for(let t=0;t<180;t++){let n=e+2*t;a.set([n,n+1,n+2,n+1,n+3,n+2],o),o+=6}}let d=new u.LoY,h=new u.eB$(t,6);d.setAttribute("aFiber",new u.eHs(h,4,0)),d.setAttribute("aSample",new u.eHs(h,2,4)),d.setAttribute("position",new u.eHs(h,3,0)),d.setIndex(new u.THS(a,1));let f=new Float32Array(168*e*4),m=new u.GYF(f,168,e,u.GWd,u.RQf);return m.minFilter=u.hxR,m.magFilter=u.hxR,m.generateMipmaps=!1,m.needsUpdate=!0,{count:e,azimuth:n,radius:r,seed:l,gap:new Float32Array(e),tracked:new Uint8Array(e),ring:f,texture:m,geometry:d}})(e)).geometry,o.uniforms.uLight.value=M.texture,ee())},ea=(e,t)=>{let a=M;if(!a)return 0;let n=$(),r=a.seed[t],l=1+.14*n.breathe*Math.sin(.31*I+1.1)+.05*n.breathe*Math.sin(.73*I+r*d),i=(n.neck+(n.spread*l-n.neck)*Math.pow(e,n.flare))*a.radius[t];return Math.cos(a.azimuth[t]+z+n.twist*e+.05*e*Math.sin(.21*I+r*d))*i+n.sway*(.07*Math.pow(e,1.7)*Math.sin(.33*I+.6)+.02*Math.sin(Math.PI*e)*e*Math.sin(.71*I+2.3))},en=(e,t,a,n,r)=>{let l=M;if(!l||a<=0)return;let i=G-160*t,o=Math.floor(G),u=Math.floor(i-3*r),s=Math.ceil(i+3*r);for(let t=u;t<=s&&!(t>o);t++){let o=(t-i)/r,u=Math.exp(-o*o),s=(168*e+p(t,168))*4,c=a*u;l.ring[s]+=c,l.ring[s+1]+=c,l.ring[s+2]+=c*n}l.texture.needsUpdate=!0},er=(t,a)=>{let n=e.getBoundingClientRect(),r=$(),l=(t-n.left-r.originX)/n.height,i=(n.height-(a-n.top)-r.originY)/n.height,o=Math.cos(r.angle),u=Math.sin(r.angle);return{x:o*l+u*i,y:-u*l+o*i,length:r.length}},el=()=>{let e=t.current;if(!e.reduced&&!e.paused){for(V.push({time:I,amount:1.5*m(e.pulseStrength,0,3)});V.length>12;)V.shift();es()}},ei=()=>{let e,n,r,i,u,s,c,d,w,y,S;if(!E||!R.length)return;et(),e=t.current,n=o.uniforms,r=q*O,i=Y*O,u=$(),c=.2126*(s=g(e.backgroundColor,[.04,.04,.04]))[0]+.7152*s[1]+.0722*s[2],d="ink"===e.mode||"auto"===e.mode&&c>.5,w=b(g(e.colors[0],[.48,.3,1])),y=b(g(e.colors[1],[1,.48,.85])),n.uResolution.value.set(r,i),n.uPixelRatio.value=O,n.uTime.value=I,n.uSpinPhase.value=z,n.uHead.value=p(G,168),n.uOrigin.value.set(u.originX*O,u.originY*O),n.uAngle.value=u.angle,n.uLength.value=u.length,n.uSpread.value=u.spread,n.uNeck.value=u.neck,n.uFlare.value=u.flare,n.uTwist.value=u.twist,n.uSway.value=u.sway,n.uBreathe.value=u.breathe,n.uLineWidth.value=m(e.lineWidth,.4,6),n.uSheath.value=m(e.sheath,0,3),n.uDefocus.value=m(e.defocus,0,2),n.uBack.value=1-m(e.depth,0,1),n.uReach.value=m(e.reach,.1,1.5),n.uEnergy.value=N,n.uInk.value=+!!d,n.uLabA.value.set(w[0],w[1],w[2]),n.uLabB.value.set(y[0],y[1],y[2]),(S=v.uniforms).uBackground.value.set(x(s[0]),x(s[1]),x(s[2])),S.uGlow.value=m(e.glow,0,3),S.uExposure.value=1.5*m(e.intensity,0,4)*(1+.1*N),S.uMode.value=+!!d,S.uGrain.value=X,a.setRenderTarget(E),a.setClearColor(0,0),a.clear(),a.render(j,l);let k=E;for(let e of R)h.uniforms.uSource.value=k.texture,h.uniforms.uTexel.value.set(1/k.width,1/k.height),Z(h,e),k=e;let C=R[R.length-1];for(let e=R.length-2;e>=0;e--)f.uniforms.uSource.value=C.texture,f.uniforms.uBase.value=R[e].texture,f.uniforms.uTexel.value.set(1/C.width,1/C.height),Z(f,P[e]),C=P[e];v.uniforms.uLines.value=E.texture,v.uniforms.uBloom.value=C.texture,Z(v,null)},eo=()=>{let e=t.current;return _.inside&&e.interactive&&!e.reduced?m(e.hoverBoost,0,2):0},eu=e=>{if(U=0,D)return;let a=Math.min(.05,Math.max(0,(e-W)/1e3));W=e,(e=>{let a=t.current;if(et(),N+=(eo()-N)*(1-Math.exp(-e/.45)),a.paused||a.reduced)return;let n=m(a.speed,0,4),r=I,l=G;I+=e*n,z+=e*n*m(a.spin,-4,4),G+=160*Q()*e;let i=M;if(i){for(let e=Math.floor(l)+1;e<=Math.floor(G);e++){let t=r+(e-l)/Math.max(G-l,1e-6)*(I-r),a=p(e,168);for(let e=0;e<i.count;e++){let[n,r]=J(t,e),l=(168*e+a)*4;i.ring[l]=n,i.ring[l+1]=n*r,i.ring[l+2]=0,i.ring[l+3]=0}}i.texture.needsUpdate=!0}for(;V.length&&I-V[0].time>3;)V.shift();(()=>{let e=M,a=t.current;if(!e)return;if(!(_.inside&&a.interactive&&a.hoverPulses&&!a.paused&&!a.reduced))return e.tracked.fill(0);let n=er(_.x,_.y),r=-n.y/n.length;if(r<.01||r>1)return e.tracked.fill(0);let l=m(a.pulseStrength,0,3);for(let t=0;t<e.count;t++){let a=ea(r,t)-n.x;e.tracked[t]&&a*e.gap[t]<0&&.12>Math.abs(a-e.gap[t])&&en(t,r,.9*l,.4,5),e.gap[t]=a,e.tracked[t]=1}})(),X=(X+.618034)%1})(a),ei();let n=t.current,r=!n.paused&&!n.reduced,l=Math.abs(N-eo())>.002;H&&!document.hidden&&(r||l)&&(U=requestAnimationFrame(eu))};function es(){D||U||!H||(W=performance.now(),U=requestAnimationFrame(eu))}let ec=()=>{let n=e.getBoundingClientRect();q=Math.max(1,n.width),Y=Math.max(1,n.height),O=Math.min(window.devicePixelRatio||1,2)*m(t.current.quality,.25,1),a.setPixelRatio(O),a.setSize(q,Y,!1);let r=Math.round(q*O),l=Math.round(Y*O);K(),E=T(r,l);let i=m(Math.floor(Math.log2(Math.min(r,l)/8)),3,7);for(let e=1;e<=i;e++)R.push(T(Math.max(1,r>>e),Math.max(1,l>>e))),P.push(T(Math.max(1,r>>e),Math.max(1,l>>e)));ei(),es()},ed=e=>{"touch"!==e.pointerType&&t.current.interactive&&(_.x=e.clientX,_.y=e.clientY,_.inside||(_.inside=!0,M?.tracked.fill(0),es()))},eh=()=>{_.inside=!1,M?.tracked.fill(0),es()},ef=e=>{let a=t.current;0===e.button&&a.interactive&&a.clickSurge&&((e,a)=>{let n=M,r=t.current;if(!n||r.reduced||r.paused)return;let l=er(e,a),i=-l.y/l.length,o=0;if(i>.01&&i<m(r.reach,.1,1.5)){let e=m(r.pulseStrength,0,3);for(let t=0;t<n.count;t++){let a=Math.abs(ea(i,t)-l.x);if(a>.2)continue;let r=1-a/.2*(a/.2),u=(n.seed[t]-.5)*4/160;en(t,i+u,1.05*e*r,.35,7),o+=1}}o||el(),es()})(e.clientX,e.clientY)};e.addEventListener("pointermove",ed),e.addEventListener("pointerleave",eh),e.addEventListener("pointercancel",eh),e.addEventListener("pointerdown",ef);let em=new ResizeObserver(ec);em.observe(e);let ep=new IntersectionObserver(e=>{(H=e.some(e=>e.isIntersecting))&&es()},{rootMargin:"80px"});ep.observe(e);let ev=()=>{document.hidden||es()};document.addEventListener("visibilitychange",ev);let eg=e=>e.preventDefault();n.addEventListener("webglcontextlost",eg),ec();let ex="";return{sync:()=>{let e=t.current,a=[e.pulses,e.pulseRate,e.stagger,e.colorFlow,e.reduced].join("|");a!==ex&&(ex=a,ee()),Math.abs(Math.min(window.devicePixelRatio||1,2)*m(e.quality,.25,1)-O)>.001?ec():ei(),es()},destroy:()=>{D=!0,cancelAnimationFrame(U),e.removeEventListener("pointermove",ed),e.removeEventListener("pointerleave",eh),e.removeEventListener("pointercancel",eh),e.removeEventListener("pointerdown",ef),document.removeEventListener("visibilitychange",ev),n.removeEventListener("webglcontextlost",eg),em.disconnect(),ep.disconnect(),K(),M?.geometry.dispose(),M?.texture.dispose(),i.dispose(),[o,h,f,v].forEach(e=>e.dispose()),a.dispose(),a.forceContextLoss(),n.remove()},surge:el}})(e,eo);return el.current=t,()=>{t?.destroy(),el.current=null}},[]),(0,r.useImperativeHandle)(en,()=>({surge:()=>el.current?.surge()}),[]),(0,n.jsx)("div",{ref:er,className:(0,c.cn)("relative isolate h-full min-h-[240px] w-full overflow-hidden",ee),style:{backgroundColor:t,...et},children:ea&&(0,n.jsx)("div",{className:"relative z-10 h-full w-full",children:ea})})});M.displayName="LuminousFilaments";let L={dark:["#7B4DFF","#FF7AD9"],light:["#5B2BFF","#D13DB8"],fibers:72,lineWidth:1.5,sheath:.7,spread:1,flare:1.3,twist:.35,flowSpeed:.3,pulses:1.3,pulseRate:.4,stagger:.4,glow:.5},j={aurora:L,fiber:{...L,dark:["#5B6CFF","#B98CFF"],light:["#3346E0","#7A3CE0"],fibers:140,lineWidth:1.1,sheath:.4,flowSpeed:.45,pulseRate:.7,stagger:.9},silk:{...L,fibers:36,lineWidth:2.2,sheath:1.4,twist:.2,flowSpeed:.22,pulses:.9,pulseRate:.25,glow:.7},cascade:{...L,fibers:110,spread:1.5,flare:1.8,twist:.6},beam:{...L,fibers:64,spread:.2,flare:1.05,twist:.15,pulseRate:.5,glow:.65},gold:{...L,dark:["#FF9A1F","#FFD35A"],light:["#C46A00","#D99A00"]},mono:{...L,dark:["#E4DEFF","#FFFFFF"],light:["#1A1A1A","#5A5A5A"],glow:.4}},A=[{label:"Aurora",value:"aurora"},{label:"Fiber",value:"fiber"},{label:"Silk",value:"silk"},{label:"Cascade",value:"cascade"},{label:"Beam",value:"beam"},{label:"Gold",value:"gold"},{label:"Mono",value:"mono"}],B=[{label:"Auto",value:"auto"},{label:"Glow",value:"glow"},{label:"Ink",value:"ink"}],T=[{name:"colors",type:"[string, string]",default:'["#7B4DFF", "#FF7AD9"]',description:"Colour of the light near the source and at the ends of the fibers, blended in OKLab. Where the fibers converge the light burns toward white."},{name:"backgroundColor",type:"string",default:'"#0A0A0A"',description:"Colour behind the fibers."},{name:"mode",type:'"auto" | "glow" | "ink"',default:'"auto"',description:"glow adds light for dark backgrounds, ink draws fine coloured strands for light ones. auto picks from the background brightness."},{name:"fibers",type:"number",default:"72",description:"Number of fibers in the bundle, from 8 to 320."},{name:"lineWidth",type:"number",default:"1.5",description:"Width of the fibers nearest the viewer, in pixels."},{name:"sheath",type:"number",default:"0.7",description:"Soft glow around each fiber, so it reads as a lit tube rather than a hairline. 0 draws bare hairlines."},{name:"defocus",type:"number",default:"0.8",description:"Depth of field: fibers on the far side of the bundle soften out of focus, from 0 to 2."},{name:"length",type:"number",default:"1.05",description:"Length of the bundle as a fraction of the height."},{name:"spread",type:"number",default:"1",description:"How far the fibers fan out at their ends, as a fraction of the height."},{name:"neck",type:"number",default:"0.035",description:"Width of the bundle where it enters, as a fraction of the height."},{name:"flare",type:"number",default:"1.3",description:"How the fan opens. 1 is a straight cone, higher values stay tight before flaring out like a trumpet."},{name:"originX",type:"number",default:"0.5",description:"Horizontal position of the source, from 0 (left) to 1 (right)."},{name:"originY",type:"number",default:"0",description:"Vertical position of the source, from 0 (top edge) to 1 (bottom edge)."},{name:"angle",type:"number",default:"0",description:"Direction the bundle hangs, in degrees. 0 falls straight down."},{name:"twist",type:"number",default:"0.35",description:"How much the fibers spiral around the bundle along their length."},{name:"depth",type:"number",default:"0.6",description:"How much fibers on the far side of the bundle dim and thin, from 0 (flat) to 1."},{name:"spin",type:"number",default:"0",description:"Speed at which the bundle turns around its axis, so fibers pass in front of each other. 0 keeps it still."},{name:"sway",type:"number",default:"1",description:"How far the bundle drifts from side to side, like a cable hanging in still air."},{name:"breathe",type:"number",default:"0.5",description:"Slow opening and closing of the fan."},{name:"flowSpeed",type:"number",default:"0.3",description:"Speed at which light travels down the fibers, in fiber lengths per second. Hover strokes and click bands travel with it."},{name:"pulses",type:"number",default:"1.3",description:"Strength of the pulses of light the source sends down the fibers, from 0 (a steady glow) to 2."},{name:"pulseRate",type:"number",default:"0.4",description:"Number of pulses entering the fibers per second."},{name:"stagger",type:"number",default:"0.4",description:"How far pulses are offset from fiber to fiber. 0 sends them down as clean bands, higher values scatter them."},{name:"colorFlow",type:"number",default:"0.08",description:"Speed at which the two colours rotate through the bundle. 0 keeps every fiber's colour fixed."},{name:"reach",type:"number",default:"0.85",description:"How far along the fibers the light travels before it dies out, as a fraction of their length."},{name:"glow",type:"number",default:"0.5",description:"Bloom around the bright source and the fibers, from 0 to 3."},{name:"intensity",type:"number",default:"1",description:"Overall exposure."},{name:"speed",type:"number",default:"1",description:"Overall animation speed."},{name:"interactive",type:"boolean",default:"true",description:"Respond to the pointer."},{name:"hoverPulses",type:"boolean",default:"true",description:"Every fiber the pointer crosses picks up a stroke of light that flows down it, like a plucked string."},{name:"clickSurge",type:"boolean",default:"true",description:"Clicking the fibers sends a band of light down from the click point. Clicking empty space sends a surge from the source."},{name:"pulseStrength",type:"number",default:"1",description:"Brightness of hover strokes, click bands and surges, from 0 to 3."},{name:"hoverBoost",type:"number",default:"1",description:"How much the light brightens and quickens while the pointer is over the component, from 0 to 2."},{name:"paused",type:"boolean",default:"false",description:"Freeze the motion. Pulses still run. Reduced-motion users always get a still frame."},{name:"quality",type:"number",default:"1",description:"Resolution scale from 0.25 to 1. Lower values are cheaper on large screens."},{name:"ref",type:"{ surge }",default:"—",description:"surge() sends a surge of light through every fiber from code, for example when a form is submitted."},{name:"children",type:"ReactNode",default:"—",description:"Content placed over the background."},{name:"className",type:"string",default:"—",description:"Classes for the root element. It fills its parent, with a 240px minimum height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."}],E=()=>{let[e,t]=(0,o.I)(),a="dark"===(0,i.Y)(),[u,s]=(0,r.useState)("aurora"),[c,d]=(0,r.useState)(L),h=e=>t=>d(a=>({...a,[e]:t})),[f,m]=(0,r.useState)(null),p=f??(a?c.dark:c.light),v=e=>t=>{let a=[...p];a[e]=t,m(a)},[g,x]=(0,r.useState)(null),b=g??(a?"#0A0A0A":"#FFFFFF"),[w,y]=(0,r.useState)("auto"),[S,k]=(0,r.useState)(.8),[C,F]=(0,r.useState)(1.5),[E,R]=(0,r.useState)(.035),[P,D]=(0,r.useState)(.5),[U,W]=(0,r.useState)(0),[H,I]=(0,r.useState)(0),[z,G]=(0,r.useState)(.6),[N,q]=(0,r.useState)(0),[Y,O]=(0,r.useState)(.08),[X,_]=(0,r.useState)(1),[V,K]=(0,r.useState)(.5),[Z,$]=(0,r.useState)(.85),[Q,J]=(0,r.useState)(1),[ee,et]=(0,r.useState)(1),[ea,en]=(0,r.useState)(1),[er,el]=(0,r.useState)(1),[ei,eo]=(0,r.useState)(!0),[eu,es]=(0,r.useState)(!0),[ec,ed]=(0,r.useState)(!0),[eh,ef]=(0,r.useState)(!1);return(0,n.jsxs)("div",{children:[(0,n.jsx)(l.Bg,{}),(0,n.jsxs)(l.VX,{children:[(0,n.jsxs)(l.Ec,{children:[(0,n.jsx)(l.Ch,{onRefresh:t,minHeight:560,enableResponsive:!0,children:(0,n.jsx)("div",{className:"relative h-full w-full",children:(0,n.jsx)(M,{colors:p,backgroundColor:b,mode:w,fibers:c.fibers,lineWidth:c.lineWidth,sheath:c.sheath,defocus:S,length:C,spread:c.spread,neck:E,flare:c.flare,originX:P,originY:U,angle:H,twist:c.twist,depth:z,spin:N,sway:X,breathe:V,flowSpeed:c.flowSpeed,pulses:c.pulses,pulseRate:c.pulseRate,stagger:c.stagger,colorFlow:Y,reach:Z,glow:c.glow,intensity:Q,speed:ee,interactive:ec,hoverPulses:ei,clickSurge:eu,pulseStrength:ea,hoverBoost:er,paused:eh},e)})}),(0,n.jsxs)(l.IH,{children:[(0,n.jsx)(l.bg,{title:"Preset",value:u,options:A,onChange:e=>{s(e),d(j[e]??L),m(null)}}),(0,n.jsx)(l.bg,{title:"Mode",value:w,options:B,onChange:e=>y(e)}),(0,n.jsx)(l.W7,{title:"Source",value:p[0],onChange:v(0)}),(0,n.jsx)(l.W7,{title:"Ends",value:p[1],onChange:v(1)}),(0,n.jsx)(l.W7,{title:"Background",value:b,onChange:x}),(0,n.jsx)(l.yt,{title:"Fibers",min:8,max:320,step:1,value:c.fibers,onChange:h("fibers")}),(0,n.jsx)(l.yt,{title:"Line Width",min:.4,max:4,step:.05,value:c.lineWidth,valueUnit:"px",onChange:h("lineWidth")}),(0,n.jsx)(l.yt,{title:"Sheath",min:0,max:3,step:.05,value:c.sheath,onChange:h("sheath")}),(0,n.jsx)(l.yt,{title:"Defocus",min:0,max:2,step:.05,value:S,onChange:k}),(0,n.jsx)(l.yt,{title:"Length",min:.3,max:2,step:.01,value:C,onChange:F}),(0,n.jsx)(l.yt,{title:"Spread",min:0,max:2,step:.01,value:c.spread,onChange:h("spread")}),(0,n.jsx)(l.yt,{title:"Neck",min:0,max:.3,step:.005,value:E,onChange:R}),(0,n.jsx)(l.yt,{title:"Flare",min:.5,max:3,step:.05,value:c.flare,onChange:h("flare")}),(0,n.jsx)(l.yt,{title:"Origin X",min:0,max:1,step:.01,value:P,onChange:D}),(0,n.jsx)(l.yt,{title:"Origin Y",min:-.2,max:1,step:.01,value:U,onChange:W}),(0,n.jsx)(l.yt,{title:"Angle",min:-180,max:180,step:1,value:H,valueUnit:"\xb0",onChange:I}),(0,n.jsx)(l.yt,{title:"Twist",min:-4,max:4,step:.05,value:c.twist,onChange:h("twist")}),(0,n.jsx)(l.yt,{title:"Depth",min:0,max:1,step:.01,value:z,onChange:G}),(0,n.jsx)(l.yt,{title:"Spin",min:-1,max:1,step:.01,value:N,onChange:q}),(0,n.jsx)(l.yt,{title:"Sway",min:0,max:3,step:.05,value:X,onChange:_}),(0,n.jsx)(l.yt,{title:"Breathe",min:0,max:2,step:.05,value:V,onChange:K}),(0,n.jsx)(l.yt,{title:"Flow Speed",min:0,max:1.5,step:.01,value:c.flowSpeed,onChange:h("flowSpeed")}),(0,n.jsx)(l.yt,{title:"Pulses",min:0,max:2,step:.05,value:c.pulses,onChange:h("pulses")}),(0,n.jsx)(l.yt,{title:"Pulse Rate",min:0,max:2,step:.01,value:c.pulseRate,onChange:h("pulseRate")}),(0,n.jsx)(l.yt,{title:"Stagger",min:0,max:2,step:.05,value:c.stagger,onChange:h("stagger")}),(0,n.jsx)(l.yt,{title:"Color Flow",min:-.5,max:.5,step:.01,value:Y,onChange:O}),(0,n.jsx)(l.yt,{title:"Reach",min:.2,max:1.5,step:.01,value:Z,onChange:$}),(0,n.jsx)(l.yt,{title:"Glow",min:0,max:2,step:.05,value:c.glow,onChange:h("glow")}),(0,n.jsx)(l.yt,{title:"Intensity",min:.2,max:3,step:.05,value:Q,onChange:J}),(0,n.jsx)(l.yt,{title:"Speed",min:0,max:3,step:.05,value:ee,onChange:et}),(0,n.jsx)(l.yt,{title:"Pulse Strength",min:0,max:2,step:.05,value:ea,onChange:en}),(0,n.jsx)(l.yt,{title:"Hover Boost",min:0,max:2,step:.05,value:er,onChange:el}),(0,n.jsx)(l.tl,{title:"Hover Pulses",checked:ei,onChange:eo}),(0,n.jsx)(l.tl,{title:"Click Surge",checked:eu,onChange:es}),(0,n.jsx)(l.tl,{title:"Interactive",checked:ec,onChange:ed}),(0,n.jsx)(l.tl,{title:"Paused",checked:eh,onChange:ef})]}),(0,n.jsx)(l.Ub,{data:T})]}),(0,n.jsx)(l.lT,{children:(0,n.jsx)(l.Gv,{})})]})]})}}}]);