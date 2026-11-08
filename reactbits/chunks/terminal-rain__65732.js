"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[65732],{56388:(e,t,a)=>{a.d(t,{Gv:()=>u.CodeExample,lT:()=>l.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>d.CopyButton,IH:()=>n.Customize,gI:()=>f,Dn:()=>p,pi:()=>m,W7:()=>o.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>o.PreviewInput,bg:()=>o.PreviewSelect,yt:()=>o.PreviewSlider,tl:()=>o.PreviewSwitch,Ec:()=>l.PreviewTab,Ub:()=>i.PropTable,VX:()=>l.TabsLayout,bs:()=>h});var l=a(55019);a(27382);var r=a(10236),n=a(69485),o=a(48543),i=a(87552);a(39260);var u=a(52407),s=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),v=a(90650);let h="rounded-lg border bg-background";function f({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,v.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,v.cn)(h,e),...a,children:t})}function p({title:e,description:t,className:a,children:l}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:l})]})}},65732:(e,t,a)=>{a.r(t),a.d(t,{default:()=>D});var l=a(95155),r=a(12115),n=a(56388),o=a(86049),i=a(90761),u=a(2253),s=a(12246),c=a(90650);let d="ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF",v='ui-monospace, "SF Mono", Menlo, Consolas, "Hiragino Sans", "Noto Sans JP", "Yu Gothic", monospace',h=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},f=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,m=(e,t,a)=>Math.min(a,Math.max(t,e)),p=null,g=(e,t)=>{if(p||(p=document.createElement("canvas").getContext("2d")),!p)return t;p.fillStyle="#010203",p.fillStyle=e;let a=String(p.fillStyle);if("#010203"===a&&"#010203"!==e.trim().toLowerCase())return t;if(a.startsWith("#")){let e=a.slice(1);return[parseInt(e.slice(0,2),16)/255,parseInt(e.slice(2,4),16)/255,parseInt(e.slice(4,6),16)/255]}let l=a.match(/[\d.]+/g);return!l||l.length<3?t:[Number(l[0])/255,Number(l[1])/255,Number(l[2])/255]},x=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),y=([e,t,a])=>{let l=x(e),r=x(t),n=x(a),o=Math.cbrt(.4122214708*l+.5363325363*r+.0514459929*n),i=Math.cbrt(.2119034982*l+.6806995451*r+.1073969566*n),u=Math.cbrt(.0883024619*l+.2817188376*r+.6299787005*n);return[.2104542553*o+.793617785*i-.0040720468*u,1.9779984951*o-2.428592205*i+.4505937099*u,.0259040371*o+.7827717662*i-.808675766*u]},b=`
uniform vec4 uHover;
uniform float uSlow;

float rateAt(vec2 s) {
  vec2 gap = s - uHover.xy;
  float slow = uSlow * uHover.z * exp(-dot(gap, gap) / (uHover.w * uHover.w));
  return max(1.0 - slow, 0.02);
}
`,w=`
uniform vec2 uCenter;
uniform float uAngle;

vec2 toGrid(vec2 s, vec2 origin, vec2 cell) {
  vec2 d = s - uCenter;
  float c = cos(uAngle);
  float n = sin(uAngle);
  vec2 r = vec2(c * d.x + n * d.y, -n * d.x + c * d.y) + uCenter;
  return (r - origin) / cell;
}

vec2 toScreen(vec2 g, vec2 origin, vec2 cell) {
  vec2 r = origin + g * cell - uCenter;
  float c = cos(uAngle);
  float n = sin(uAngle);
  return vec2(c * r.x - n * r.y, n * r.x + c * r.y) + uCenter;
}
`,S=`
precision highp float;
uniform sampler2D uPrevious;
uniform sampler2D uHeads;
uniform vec2 uOrigin;
uniform vec2 uCell;
uniform float uDt;
uniform float uTrail;
uniform float uShuffle;
uniform float uGlyphCount;
uniform float uSeed;
${w}
${b}
out vec4 fragColor;

float hash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  vec4 previous = texelFetch(uPrevious, cell, 0);
  float speed = texelFetch(uHeads, ivec2(0, cell.x), 0).x;
  vec2 screen = toScreen(vec2(cell) + 0.5, uOrigin, uCell);
  float rate = rateAt(screen);
  float tau = uTrail / max(speed, 0.5) / 2.2;
  float light = previous.x * exp(-uDt * rate / tau);
  float glyph = previous.y;
  float row = float(cell.y) + 0.5;
  for (int k = 1; k <= 3; k++) {
    vec4 head = texelFetch(uHeads, ivec2(k, cell.x), 0);
    if (head.z > 0.5 && head.x < row && row <= head.y) {
      light = max(light, clamp(head.z - 0.5, 0.0, 1.0));
      glyph = floor(hash(vec3(vec2(cell), head.w * 97.0 + row)) * uGlyphCount);
    }
  }
  float churn = uShuffle * 2.5 * rate * uDt;
  if (hash(vec3(vec2(cell), uSeed)) < churn) glyph = floor(hash(vec3(vec2(cell) + 17.0, uSeed * 1.7)) * uGlyphCount);
  fragColor = vec4(light, glyph, 0.0, 1.0);
}
`,C=`
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,k=`
precision highp float;
uniform sampler2D uAtlas;
uniform vec2 uAtlasGrid;
uniform vec2 uResolution;
uniform float uMirror;
uniform float uGlyphScale;
uniform vec3 uLabTrail;
uniform vec3 uLabHead;
uniform float uInk;
uniform sampler2D uState0;
uniform sampler2D uHeads0;
uniform vec2 uOrigin0;
uniform vec4 uGrid0;
uniform sampler2D uState1;
uniform sampler2D uHeads1;
uniform vec2 uOrigin1;
uniform vec4 uGrid1;
uniform float uFar;
${w}
in vec2 vUv;
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

float hash(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}

vec4 layer(sampler2D state, sampler2D heads, vec2 origin, vec4 grid, float bias) {
  vec2 screen = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 g = toGrid(screen, origin, grid.xy);
  ivec2 cell = ivec2(floor(g));
  if (cell.x < 0 || cell.y < 0 || float(cell.x) >= grid.z || float(cell.y) >= grid.w) return vec4(0.0);
  vec4 data = texelFetch(state, cell, 0);
  float light = data.x;
  float glyph = data.y;
  float head = 0.0;
  for (int k = 1; k <= 3; k++) {
    vec4 h = texelFetch(heads, ivec2(k, cell.x), 0);
    if (h.z > 0.5 && floor(h.y) == float(cell.y)) {
      head = clamp(h.z - 0.5, 0.0, 1.0);
      glyph = floor(hash(vec3(vec2(cell), h.w * 31.0 + floor(h.y * 3.0))) * max(uAtlasGrid.x * uAtlasGrid.y, 1.0));
    }
  }
  if (light < 0.004 && head < 0.5) return vec4(0.0);
  vec2 f = fract(g);
  vec2 local = vec2(f.x - 0.5, f.y - 0.5);
  if (uMirror > 0.5) local.x = -local.x;
  vec2 span = vec2(grid.x / grid.y, 1.0) * 0.84 * uGlyphScale;
  vec2 texel = 0.5 + local * span;
  float inside = step(0.02, texel.x) * step(texel.x, 0.98) * step(0.02, texel.y) * step(texel.y, 0.98);
  float index = mod(glyph, uAtlasGrid.x * uAtlasGrid.y);
  vec2 slot = vec2(mod(index, uAtlasGrid.x), floor(index / uAtlasGrid.x));
  vec2 uv = (slot + texel) / uAtlasGrid;
  vec2 scale = span / uAtlasGrid;
  float coverage = textureGrad(uAtlas, uv, dFdx(g) * scale * exp2(bias), dFdy(g) * scale * exp2(bias)).r * inside;
  float flicker = 0.82 + 0.18 * hash(vec3(vec2(cell), glyph));
  float fresh = smoothstep(0.55, 1.0, light);
  vec3 trailTone = labToLinear(mix(vec3(uLabTrail.x * 0.55, uLabTrail.yz * 0.9), uLabTrail, smoothstep(0.0, 0.6, light)));
  vec3 tone = mix(trailTone, labToLinear(uLabHead), fresh * 0.35);
  vec3 headTone = labToLinear(uLabHead);
  vec3 inkHead = labToLinear(vec3(uLabTrail.x * 0.55, uLabTrail.yz * 1.1));
  headTone = mix(headTone, inkHead, uInk);
  float fade = light * (0.35 + 0.65 * light);
  float energy = coverage * (fade * flicker * 0.8 + head * 0.9);
  vec3 color = mix(tone, headTone, head) * energy;
  return vec4(color, energy);
}

void main() {
  vec4 near = layer(uState0, uHeads0, uOrigin0, uGrid0, 0.0);
  vec4 far = uFar > 0.0 ? layer(uState1, uHeads1, uOrigin1, uGrid1, 1.2) * uFar : vec4(0.0);
  fragColor = near + far;
}
`,F=`
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
`,T=`
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
    float cover = clamp(1.0 - exp(-energy * uExposure * 1.4), 0.0, 0.95);
    color = mix(uBackground, clamp(hue * 0.85, 0.0, 1.0), cover);
  }
  float grain = hash(gl_FragCoord.xy + uGrain * 311.0) - 0.5;
  fragColor = vec4(encode(color) + grain * (1.2 / 255.0), 1.0);
}
`,A=(0,r.forwardRef)(function({colors:e=["#9D7BFF","#FFD6F5"],backgroundColor:t="#0A0A0A",mode:a="auto",glyphs:n=d,fontFamily:o=v,glyphSize:i=18,spacing:p=1,density:b=.45,trail:w=16,speed:A=1,variance:G=.5,angle:H=0,shuffle:E=.35,mirror:j=!1,depth:B=.6,glow:L=.22,intensity:z=1,interactive:D=!0,bulletTime:U=!0,slowRadius:I=170,slowStrength:R=.6,clickBurst:P=!0,burstSize:Y=1,paused:N=!1,quality:O=1,className:W,style:_,children:X},q){let $=(0,r.useRef)(null),Q=(0,r.useRef)(null),V=(0,r.useSyncExternalStore)(h,f,()=>!1),K=(0,r.useRef)({colors:e,backgroundColor:t,mode:a,glyphs:n,fontFamily:o,glyphSize:i,spacing:p,density:b,trail:w,speed:A,variance:G,angle:H,shuffle:E,mirror:j,depth:B,glow:L,intensity:z,interactive:D,bulletTime:U,slowRadius:I,slowStrength:R,clickBurst:P,burstSize:Y,paused:N,quality:O,reduced:V});return(0,r.useEffect)(()=>{K.current={colors:e,backgroundColor:t,mode:a,glyphs:n,fontFamily:o,glyphSize:i,spacing:p,density:b,trail:w,speed:A,variance:G,angle:H,shuffle:E,mirror:j,depth:B,glow:L,intensity:z,interactive:D,bulletTime:U,slowRadius:I,slowStrength:R,clickBurst:P,burstSize:Y,paused:N,quality:O,reduced:V},Q.current?.sync()}),(0,r.useEffect)(()=>{let e=$.current;if(!e)return;let t=((e,t)=>{let a,l=document.createElement("canvas");l.setAttribute("aria-hidden","true"),l.style.position="absolute",l.style.inset="0",l.style.width="100%",l.style.height="100%",l.style.display="block",l.style.pointerEvents="none",e.prepend(l);try{a=new s.WebGLRenderer({canvas:l,alpha:!1,antialias:!1,powerPreference:"high-performance"})}catch{return l.remove(),null}if(!a.capabilities.isWebGL2)return a.dispose(),l.remove(),null;a.autoClear=!1;let r=a.extensions.has("EXT_color_buffer_float"),n=r||a.extensions.has("EXT_color_buffer_half_float")?u.ix0:u.OUM,o=r?u.RQf:u.ix0,i=new u.qUd(-1,1,1,-1,0,1),c=new u.bdM(2,2),h={x:0,y:0,vx:0,vy:0,goalX:0,goalY:0,amount:0,inside:!1,placed:!1},f={uHover:{value:new u.IUQ(0,0,0,100)},uSlow:{value:.9}},p={uCenter:{value:new u.I9Y},uAngle:{value:0}},b=(e,t)=>new u.BKk({glslVersion:u.Wdf,uniforms:t,vertexShader:C,fragmentShader:e,depthTest:!1,depthWrite:!1,blending:u.XIg}),w=b(S,{...f,...p,uPrevious:{value:null},uHeads:{value:null},uOrigin:{value:new u.I9Y},uCell:{value:new u.I9Y(1,1)},uDt:{value:0},uTrail:{value:16},uShuffle:{value:.4},uGlyphCount:{value:1},uSeed:{value:0}}),A=b(k,{...p,uAtlas:{value:null},uAtlasGrid:{value:new u.I9Y(16,1)},uResolution:{value:new u.I9Y(1,1)},uMirror:{value:0},uGlyphScale:{value:1},uLabTrail:{value:new u.Pq0},uLabHead:{value:new u.Pq0},uInk:{value:0},uState0:{value:null},uHeads0:{value:null},uOrigin0:{value:new u.I9Y},uGrid0:{value:new u.IUQ(1,1,1,1)},uState1:{value:null},uHeads1:{value:null},uOrigin1:{value:new u.I9Y},uGrid1:{value:new u.IUQ(1,1,1,1)},uFar:{value:0}}),G=b(F,{uSource:{value:null},uTexel:{value:new u.I9Y}}),H=b(M,{uSource:{value:null},uBase:{value:null},uTexel:{value:new u.I9Y}}),E=b(T,{uLines:{value:null},uBloom:{value:null},uBackground:{value:new u.Pq0},uGlow:{value:.5},uExposure:{value:1.4},uMode:{value:0},uGrain:{value:0}}),j=new u.eaF(c,E);j.frustumCulled=!1;let B=new u.Z58;B.add(j);let L=(e,t,a,l)=>new u.nWS(Math.max(1,e),Math.max(1,t),{type:a,format:u.GWd,minFilter:l,magFilter:l,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1}),z=null,D=[],U=[],I=[],R="",P=null,Y="",N=!1,O=0,W=0,_=!0,X=1,q=1,$=1,Q=0,V=97,K=()=>(V=16807*V%0x7fffffff)/0x7fffffff,J=()=>{z?.dispose(),D.forEach(e=>e.dispose()),U.forEach(e=>e.dispose()),z=null,D=[],U=[]},Z=()=>{I.forEach(e=>{e.targets.forEach(e=>e.dispose()),e.headTexture.dispose()}),I=[]},ee=(e,t)=>{j.material=e,a.setRenderTarget(t),a.render(B,i)},et=()=>{let e=t.current,a=String(e.glyphs??"")||d,l=String(e.fontFamily??"")||v,r=Math.round(m(m(e.glyphSize,6,64)*$*1.25,16,128)),n=`${a}|${l}|${r}`;if(n!==Y||!P){let e,t,o,i,s;Y=n,P?.texture.dispose(),(e=Array.from(new Set(Array.from(a.replace(/\s/g,"")))).slice(0,512)).length||e.push("0","1"),t=Math.ceil(e.length/16),(o=document.createElement("canvas")).width=16*r,o.height=t*r,(i=o.getContext("2d"))&&(i.fillStyle="#000000",i.fillRect(0,0,o.width,o.height),i.fillStyle="#ffffff",i.textAlign="center",i.textBaseline="middle",i.font=`500 ${Math.round(.78*r)}px ${l}`,e.forEach((e,t)=>{let a=Math.floor(t/16)*r+r/2+.04*r;i.fillText(e,t%16*r+r/2,a)})),(s=new u.GOR(o)).minFilter=u.$_I,s.magFilter=u.k6q,s.generateMipmaps=!0,s.colorSpace=u.jf0,s.flipY=!1,s.anisotropy=4,s.needsUpdate=!0,P={texture:s,count:e.length,rows:t},A.uniforms.uAtlas.value=P.texture,A.uniforms.uAtlasGrid.value.set(16,P.rows),w.uniforms.uGlyphCount.value=P.count}},ea=(e,a)=>{let l=e-h.x,r=a-h.y,n=f.uHover.value.w;return Math.max(1-m(t.current.slowStrength,0,1)*h.amount*Math.exp(-(l*l+r*r)/(n*n)),.02)},el=(e,a)=>e*(1/(m(t.current.density,.02,1)*(0===a?1:.3))-1)*(.4+1.2*K()),er=(e,l,r,n)=>{let i=t.current,s=X*$,c=q*$,d=m(i.glyphSize,6,64)*$*e,v=.68*d*m(i.spacing,.6,3),h=1.05*d,f=m(i.angle,-80,80)*Math.PI/180,p=Math.ceil((s*Math.abs(Math.cos(f))+c*Math.abs(Math.sin(f)))/v)+2,g=Math.ceil((s*Math.abs(Math.sin(f))+c*Math.abs(Math.cos(f)))/h)+2,x=s/2-p*v/2,y=c/2-g*h/2,b=new Float32Array(p),w=new Float32Array(4*p*4),S=new Float32Array(3*p),C=m(i.variance,0,1),k=Math.max(9*m(i.speed,0,5)*l,.5);for(let e=0;e<p;e++){b[e]=Math.max(.3,1+(2*K()-1)*C*.75);let t=k*b[e],a=(g+3)/t;for(let l=0;l<3;l++){let r=(4*e+l+1)*4;if(2===l){w.set([0,0,0,K()],r),S[3*e+l]=1/0;continue}let n=el(a,l),o=K()*(a+n);if(o<a){let e=-2+o*t;w.set([e,e,1.5,K()],r)}else w.set([0,0,0,K()],r),S[3*e+l]=o-a}}let F=new u.GYF(w,4,p,u.GWd,u.RQf);F.minFilter=u.hxR,F.magFilter=u.hxR,F.needsUpdate=!0;let M=[0,1].map(()=>L(p,g,o,u.hxR));for(let e of M)a.setRenderTarget(e),a.setClearColor(0,0),a.clear();return{cellW:v,cellH:h,cols:p,rows:g,originX:x,originY:y,speedScale:l,gain:r,bias:n,columnSpeed:b,heads:w,respawn:S,headTexture:F,targets:M,index:0}},en=(e,t,a)=>{let l=p.uAngle.value,r=X*$/2,n=q*$/2,o=e.originX+t*e.cellW-r,i=e.originY+a*e.cellH-n,u=Math.cos(l),s=Math.sin(l);return[u*o-s*i+r,s*o+u*i+n]},eo=(e,a)=>{let l=9*m(t.current.speed,0,5)*e.speedScale;for(let t=0;t<e.cols;t++){let r=l*e.columnSpeed[t];e.heads[4*t*4]=r;for(let l=0;l<3;l++){let n=(4*t+l+1)*4,o=3*t+l;if(e.heads[n+2]>.5){e.heads[n+2]<1.5&&(e.heads[n+2]=Math.min(1.5,e.heads[n+2]+a/.3));let i=e.heads[n+1],[u,s]=en(e,t+.5,i);e.heads[n]=i,e.heads[n+1]=i+r*ea(u,s)*a,e.heads[n+1]>e.rows+1&&(e.heads[n+2]=0,e.respawn[o]=2===l?1/0:el((e.rows+3)/Math.max(r,.5),l))}else if(e.respawn[o]!==1/0&&(e.respawn[o]-=a,e.respawn[o]<=0)){let t=2===l?e.heads[n+1]:-2-2*K();e.heads.set([t,t,2===l?.52:1.5,K()],n)}}}e.headTexture.needsUpdate=!0},ei=(e,a)=>{let l=t.current,r=w.uniforms;r.uPrevious.value=e.targets[e.index].texture,r.uHeads.value=e.headTexture,r.uOrigin.value.set(e.originX,e.originY),r.uCell.value.set(e.cellW,e.cellH),r.uDt.value=a,r.uTrail.value=m(l.trail,2,80),r.uShuffle.value=m(l.shuffle,0,1),r.uSeed.value=1e3*K(),ee(w,e.targets[1-e.index]),e.index=1-e.index},eu=()=>{let e=t.current,a=m(e.depth,0,1),l=[X,q,$,e.glyphSize,e.spacing,e.angle,a>0,e.variance].join("|");if(l===R&&I.length)return;R=l,Z(),p.uAngle.value=m(e.angle,-80,80)*Math.PI/180,p.uCenter.value.set(X*$/2,q*$/2),I=[er(1,1,1,0)],a>0&&I.push(er(.62,.58,1,1.2));let r=1/30;for(let e=0;e<3;e+=r)for(let e of I)eo(e,r),ei(e,r)},es=()=>{let e=t.current,a=X*$,l=q*$,r=g(e.backgroundColor,[.04,.04,.04]),n=.2126*r[0]+.7152*r[1]+.0722*r[2],o="ink"===e.mode||"auto"===e.mode&&n>.5,i=y(g(e.colors[0],[.6,.48,1])),u=y(g(e.colors[1],[1,.84,.96])),s=A.uniforms;s.uResolution.value.set(a,l),s.uMirror.value=+!!e.mirror,s.uLabTrail.value.set(i[0],i[1],i[2]),s.uLabHead.value.set(u[0],u[1],u[2]),s.uInk.value=+!!o;let c=I[0];c&&(s.uState0.value=c.targets[c.index].texture,s.uHeads0.value=c.headTexture,s.uOrigin0.value.set(c.originX,c.originY),s.uGrid0.value.set(c.cellW,c.cellH,c.cols,c.rows));let d=I[1];s.uFar.value=d?.32*m(e.depth,0,1):0,d&&(s.uState1.value=d.targets[d.index].texture,s.uHeads1.value=d.headTexture,s.uOrigin1.value.set(d.originX,d.originY),s.uGrid1.value.set(d.cellW,d.cellH,d.cols,d.rows)),f.uSlow.value=m(e.slowStrength,0,1),f.uHover.value.set(h.x,h.y,h.amount,m(e.slowRadius,20,800)*$);let v=E.uniforms;v.uBackground.value.set(x(r[0]),x(r[1]),x(r[2])),v.uGlow.value=m(e.glow,0,3),v.uExposure.value=(o?5:1.25)*m(e.intensity,0,4),v.uMode.value=+!!o,v.uGrain.value=Q},ec=()=>{if(!z||!D.length)return;et(),eu(),es(),ee(A,z);let e=z;for(let t of D)G.uniforms.uSource.value=e.texture,G.uniforms.uTexel.value.set(1/e.width,1/e.height),ee(G,t),e=t;let t=D[D.length-1];for(let e=D.length-2;e>=0;e--)H.uniforms.uSource.value=t.texture,H.uniforms.uBase.value=D[e].texture,H.uniforms.uTexel.value.set(1/t.width,1/t.height),ee(H,U[e]),t=U[e];E.uniforms.uLines.value=z.texture,E.uniforms.uBloom.value=t.texture,ee(E,null)},ed=e=>{if(O=0,N)return;let a=Math.min(.05,Math.max(0,(e-W)/1e3));W=e;let l=t.current,r=h.inside&&l.interactive&&l.bulletTime&&!l.reduced?1:0;if(h.amount+=(r-h.amount)*(1-Math.exp(-a/.35)),h.vx+=(81*(h.goalX-h.x)-18*h.vx)*a,h.vy+=(81*(h.goalY-h.y)-18*h.vy)*a,h.x+=h.vx*a,h.y+=h.vy*a,!l.paused&&!l.reduced){for(let e of(et(),eu(),es(),I))eo(e,a),ei(e,a);Q=(Q+.618034)%1}ec();let n=t.current,o=!n.paused&&!n.reduced,i=Math.abs(h.amount-(h.inside&&n.bulletTime?1:0))>.002;_&&!document.hidden&&(o||i)&&(O=requestAnimationFrame(ed))};function ev(){N||O||!_||(W=performance.now(),O=requestAnimationFrame(ed))}let eh=()=>{let l=e.getBoundingClientRect();X=Math.max(1,l.width),q=Math.max(1,l.height),$=Math.min(window.devicePixelRatio||1,2)*m(t.current.quality,.25,1),a.setPixelRatio($),a.setSize(X,q,!1);let r=Math.round(X*$),o=Math.round(q*$);J(),z=L(r,o,n,u.k6q);let i=m(Math.floor(Math.log2(Math.min(r,o)/8)),3,7);for(let e=1;e<=i;e++)D.push(L(r>>e,o>>e,n,u.k6q)),U.push(L(r>>e,o>>e,n,u.k6q));ec(),ev()},ef=t=>{let a=e.getBoundingClientRect();return[(t.clientX-a.left)*$,(t.clientY-a.top)*$]},em=e=>{if("touch"===e.pointerType||!t.current.interactive)return;let[a,l]=ef(e);h.goalX=a,h.goalY=l,h.placed||(h.x=a,h.y=l,h.placed=!0),h.inside||(h.inside=!0,ev())},ep=()=>{h.inside=!1,h.placed=h.amount>.01,ev()},eg=(e,a)=>{let l=t.current;if(l.reduced||l.paused)return;let r=m(l.burstSize,0,3);r<=0||(I.forEach((t,l)=>{let n,o,i,u,s,c,d,[v,h]=(n=p.uAngle.value,o=X*$/2,i=q*$/2,u=e-o,s=a-i,[((c=Math.cos(n))*u+(d=Math.sin(n))*s+o-t.originX)/t.cellW,(-d*u+c*s+i-t.originY)/t.cellH]),f=Math.max(1,Math.round((0===l?6:8)*r)),m=Math.floor(v);for(let e=m-f;e<=m+f;e++){if(e<0||e>=t.cols)continue;let a=Math.abs(e-m)/f;if(K()>Math.exp(-a*a*2.2)*(0===l?.95:.6))continue;let r=(4*e+2+1)*4,n=3*e+2;if(t.heads[r+2]>.5)continue;let o=h-.5-1.5*K();t.heads.set([o,o,0,K()],r),t.respawn[n]=a*f*.045+.06*K()}}),ev())},ex=e=>{let a=t.current;if(0!==e.button||!a.interactive||!a.clickBurst)return;let[l,r]=ef(e);eg(l,r)};e.addEventListener("pointermove",em),e.addEventListener("pointerleave",ep),e.addEventListener("pointercancel",ep),e.addEventListener("pointerdown",ex);let ey=new ResizeObserver(eh);ey.observe(e);let eb=new IntersectionObserver(e=>{(_=e.some(e=>e.isIntersecting))&&ev()},{rootMargin:"80px"});eb.observe(e);let ew=()=>{document.hidden||ev()};document.addEventListener("visibilitychange",ew);let eS=e=>e.preventDefault();return l.addEventListener("webglcontextlost",eS),eh(),{sync:()=>{Math.abs(Math.min(window.devicePixelRatio||1,2)*m(t.current.quality,.25,1)-$)>.001?eh():ec(),ev()},destroy:()=>{N=!0,cancelAnimationFrame(O),e.removeEventListener("pointermove",em),e.removeEventListener("pointerleave",ep),e.removeEventListener("pointercancel",ep),e.removeEventListener("pointerdown",ex),document.removeEventListener("visibilitychange",ew),l.removeEventListener("webglcontextlost",eS),ey.disconnect(),eb.disconnect(),J(),Z(),P?.texture.dispose(),c.dispose(),[w,A,G,H,E].forEach(e=>e.dispose()),a.dispose(),a.forceContextLoss(),l.remove()},burst:(e,t)=>eg(m(e,0,1)*X*$,m(t,0,1)*q*$)}})(e,K);return Q.current=t,()=>{t?.destroy(),Q.current=null}},[]),(0,r.useImperativeHandle)(q,()=>({burst:(e=.5,t=.3)=>Q.current?.burst(e,t)}),[]),(0,l.jsx)("div",{ref:$,className:(0,c.cn)("relative isolate h-full min-h-[240px] w-full overflow-hidden",W),style:{backgroundColor:t,..._},children:X&&(0,l.jsx)("div",{className:"relative z-10 h-full w-full",children:X})})});A.displayName="TerminalRain";let G={katakana:"ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF",binary:"01",hex:"0123456789ABCDEF",latin:"ABCDEFGHIJKLMNOPQRSTUVWXYZ",symbols:"+-*/=<>[]{}()#$%&@!?;:"},H=[{label:"Katakana",value:"katakana"},{label:"Binary",value:"binary"},{label:"Hex",value:"hex"},{label:"Latin",value:"latin"},{label:"Symbols",value:"symbols"}],E={dark:["#9D7BFF","#FFD6F5"],light:["#5B2BFF","#D13DB8"],glyphs:"katakana",density:.45,trail:16,speed:1,angle:0},j={aurora:E,matrix:{...E,dark:["#3DFF8A","#E8FFF0"],light:["#0B7A3B","#064D25"]},amber:{...E,dark:["#FFB000","#FFF1C9"],light:["#B45309","#78350F"],glyphs:"hex"},binary:{...E,glyphs:"binary",trail:20},storm:{...E,density:.7,trail:22,speed:1.6,angle:-14},drizzle:{...E,density:.22,trail:26,speed:.55},mono:{...E,dark:["#CFCFCF","#FFFFFF"],light:["#1A1A1A","#555555"]}},B=[{label:"Aurora",value:"aurora"},{label:"Matrix",value:"matrix"},{label:"Amber",value:"amber"},{label:"Binary",value:"binary"},{label:"Storm",value:"storm"},{label:"Drizzle",value:"drizzle"},{label:"Mono",value:"mono"}],L=[{label:"Auto",value:"auto"},{label:"Glow",value:"glow"},{label:"Ink",value:"ink"}],z=[{name:"colors",type:"[string, string]",default:'["#9D7BFF", "#FFD6F5"]',description:"Colour of the falling trails and colour of the bright glyph leading each stream."},{name:"backgroundColor",type:"string",default:'"#0A0A0A"',description:"Colour behind the rain."},{name:"mode",type:'"auto" | "glow" | "ink"',default:'"auto"',description:"glow adds light for dark backgrounds, ink prints coloured glyphs for light ones. auto picks from the background brightness."},{name:"glyphs",type:"string",default:"half-width katakana, digits and A–F",description:"Characters the streams are made of. Any string works: binary, hex, letters, symbols or your brand's characters."},{name:"fontFamily",type:"string",default:"system monospace",description:"Font used to draw the glyphs. Use a font that is already loaded on the page."},{name:"glyphSize",type:"number",default:"18",description:"Height of the glyphs in pixels."},{name:"spacing",type:"number",default:"1",description:"Horizontal gap between columns, from 0.6 (packed) to 3 (sparse)."},{name:"density",type:"number",default:"0.45",description:"Share of columns carrying a stream at any moment, from 0 to 1."},{name:"trail",type:"number",default:"16",description:"Length of each stream's fading trail, in glyphs."},{name:"speed",type:"number",default:"1",description:"How fast the streams fall."},{name:"variance",type:"number",default:"0.5",description:"How much fall speed varies between columns, from 0 (uniform) to 1."},{name:"angle",type:"number",default:"0",description:"Tilt of the rain in degrees, as if blown by wind."},{name:"shuffle",type:"number",default:"0.35",description:"How often glyphs in the trails change character, from 0 (frozen) to 1."},{name:"mirror",type:"boolean",default:"false",description:"Draw every glyph mirrored, as in the classic film titles."},{name:"depth",type:"number",default:"0.6",description:"Visibility of a second, smaller and slower layer of rain behind the first, from 0 (off) to 1."},{name:"glow",type:"number",default:"0.22",description:"Soft bloom around the bright glyphs, from 0 to 3."},{name:"intensity",type:"number",default:"1",description:"Overall exposure."},{name:"interactive",type:"boolean",default:"true",description:"Respond to the pointer."},{name:"bulletTime",type:"boolean",default:"true",description:"Time slows around the pointer: streams crawl past it and their trails linger, then pick up speed again."},{name:"slowRadius",type:"number",default:"170",description:"Radius of the slowed zone around the pointer, in pixels."},{name:"slowStrength",type:"number",default:"0.6",description:"How much time slows at the centre of the zone, from 0 (no effect) to 1 (nearly frozen)."},{name:"clickBurst",type:"boolean",default:"true",description:"Clicking releases a cascade of new streams from the click point, fanning out column by column."},{name:"burstSize",type:"number",default:"1",description:"How many columns a click cascade spans, from 0 to 3."},{name:"paused",type:"boolean",default:"false",description:"Freeze the rain. Reduced-motion users always get a still frame."},{name:"quality",type:"number",default:"1",description:"Resolution scale from 0.25 to 1. Lower values are cheaper on large screens."},{name:"ref",type:"{ burst }",default:"—",description:"burst(x, y) releases a cascade from a point given as fractions of the width and height."},{name:"children",type:"ReactNode",default:"—",description:"Content placed over the background."},{name:"className",type:"string",default:"—",description:"Classes for the root element. It fills its parent, with a 240px minimum height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."}],D=()=>{let[e,t]=(0,i.I)(),a="dark"===(0,o.Y)(),[u,s]=(0,r.useState)("aurora"),[c,d]=(0,r.useState)(E),v=e=>t=>d(a=>({...a,[e]:t})),[h,f]=(0,r.useState)(null),m=h??(a?c.dark:c.light),p=e=>t=>{let a=[...m];a[e]=t,f(a)},[g,x]=(0,r.useState)(null),y=g??(a?"#0A0A0A":"#FFFFFF"),[b,w]=(0,r.useState)("auto"),[S,C]=(0,r.useState)(18),[k,F]=(0,r.useState)(1),[M,T]=(0,r.useState)(.5),[D,U]=(0,r.useState)(.35),[I,R]=(0,r.useState)(!1),[P,Y]=(0,r.useState)(.6),[N,O]=(0,r.useState)(.22),[W,_]=(0,r.useState)(1),[X,q]=(0,r.useState)(170),[$,Q]=(0,r.useState)(.6),[V,K]=(0,r.useState)(1),[J,Z]=(0,r.useState)(!0),[ee,et]=(0,r.useState)(!0),[ea,el]=(0,r.useState)(!0),[er,en]=(0,r.useState)(!1);return(0,l.jsxs)("div",{children:[(0,l.jsx)(n.Bg,{}),(0,l.jsxs)(n.VX,{children:[(0,l.jsxs)(n.Ec,{children:[(0,l.jsx)(n.Ch,{onRefresh:t,minHeight:560,enableResponsive:!0,children:(0,l.jsx)("div",{className:"relative h-full w-full",children:(0,l.jsx)(A,{colors:m,backgroundColor:y,mode:b,glyphs:G[c.glyphs]??G.katakana,glyphSize:S,spacing:k,density:c.density,trail:c.trail,speed:c.speed,variance:M,angle:c.angle,shuffle:D,mirror:I,depth:P,glow:N,intensity:W,interactive:ea,bulletTime:J,slowRadius:X,slowStrength:$,clickBurst:ee,burstSize:V,paused:er},e)})}),(0,l.jsxs)(n.IH,{children:[(0,l.jsx)(n.bg,{title:"Preset",value:u,options:B,onChange:e=>{s(e),d(j[e]??E),f(null)}}),(0,l.jsx)(n.bg,{title:"Mode",value:b,options:L,onChange:e=>w(e)}),(0,l.jsx)(n.bg,{title:"Glyphs",value:c.glyphs,options:H,onChange:v("glyphs")}),(0,l.jsx)(n.W7,{title:"Trail",value:m[0],onChange:p(0)}),(0,l.jsx)(n.W7,{title:"Head",value:m[1],onChange:p(1)}),(0,l.jsx)(n.W7,{title:"Background",value:y,onChange:x}),(0,l.jsx)(n.yt,{title:"Glyph Size",min:8,max:40,step:1,value:S,valueUnit:"px",onChange:C}),(0,l.jsx)(n.yt,{title:"Spacing",min:.6,max:3,step:.05,value:k,onChange:F}),(0,l.jsx)(n.yt,{title:"Density",min:.05,max:1,step:.01,value:c.density,onChange:v("density")}),(0,l.jsx)(n.yt,{title:"Trail",min:2,max:60,step:1,value:c.trail,onChange:v("trail")}),(0,l.jsx)(n.yt,{title:"Speed",min:0,max:4,step:.05,value:c.speed,onChange:v("speed")}),(0,l.jsx)(n.yt,{title:"Variance",min:0,max:1,step:.01,value:M,onChange:T}),(0,l.jsx)(n.yt,{title:"Angle",min:-45,max:45,step:1,value:c.angle,valueUnit:"\xb0",onChange:v("angle")}),(0,l.jsx)(n.yt,{title:"Shuffle",min:0,max:1,step:.01,value:D,onChange:U}),(0,l.jsx)(n.yt,{title:"Depth",min:0,max:1,step:.01,value:P,onChange:Y}),(0,l.jsx)(n.yt,{title:"Glow",min:0,max:2,step:.02,value:N,onChange:O}),(0,l.jsx)(n.yt,{title:"Intensity",min:.2,max:3,step:.05,value:W,onChange:_}),(0,l.jsx)(n.yt,{title:"Slow Radius",min:40,max:400,step:5,value:X,valueUnit:"px",onChange:q}),(0,l.jsx)(n.yt,{title:"Slow Strength",min:0,max:1,step:.01,value:$,onChange:Q}),(0,l.jsx)(n.yt,{title:"Burst Size",min:0,max:3,step:.05,value:V,onChange:K}),(0,l.jsx)(n.tl,{title:"Mirror",checked:I,onChange:R}),(0,l.jsx)(n.tl,{title:"Bullet Time",checked:J,onChange:Z}),(0,l.jsx)(n.tl,{title:"Click Burst",checked:ee,onChange:et}),(0,l.jsx)(n.tl,{title:"Interactive",checked:ea,onChange:el}),(0,l.jsx)(n.tl,{title:"Paused",checked:er,onChange:en})]}),(0,l.jsx)(n.Ub,{data:z})]}),(0,l.jsx)(n.lT,{children:(0,l.jsx)(n.Gv,{})})]})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>i});var l=a(12115),r=a(30701);let n=()=>()=>{},o=()=>"light";function i(){let{resolvedTheme:e}=(0,r.D)();return(0,l.useSyncExternalStore)(n,()=>"dark"===e?"dark":"light",o)}},90761:(e,t,a)=>{a.d(t,{I:()=>r});var l=a(12115);function r(){let[e,t]=(0,l.useState)(0),a=(0,l.useCallback)(()=>{t(e=>e+1)},[]);return(0,l.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);