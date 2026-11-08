"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[83642],{56388:(e,t,a)=>{a.d(t,{Gv:()=>u.CodeExample,lT:()=>r.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>m.CopyButton,IH:()=>n.Customize,gI:()=>v,Dn:()=>p,pi:()=>h,W7:()=>o.PreviewColor,Ch:()=>l.PreviewContainer,UD:()=>o.PreviewInput,bg:()=>o.PreviewSelect,yt:()=>o.PreviewSlider,tl:()=>o.PreviewSwitch,Ec:()=>r.PreviewTab,Ub:()=>i.PropTable,VX:()=>r.TabsLayout,bs:()=>f});var r=a(55019);a(27382);var l=a(10236),n=a(69485),o=a(48543),i=a(87552);a(39260);var u=a(52407),s=a(79901);a(24496);var c=a(95155);a(66729);var m=a(28592),d=a(90650);let f="rounded-lg border bg-background";function v({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,d.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function h({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,d.cn)(f,e),...a,children:t})}function p({title:e,description:t,className:a,children:r}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:r})]})}},83642:(e,t,a)=>{a.r(t),a.d(t,{default:()=>A});var r=a(95155),l=a(12115),n=a(56388),o=a(86049),i=a(90761),u=a(2253),s=a(12246),c=a(90650);let m=2*Math.PI,d=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},f=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,v=(e,t,a)=>Math.min(a,Math.max(t,e)),h=null,p=(e,t)=>{if(h||(h=document.createElement("canvas").getContext("2d")),!h)return t;h.fillStyle="#010203",h.fillStyle=e;let a=String(h.fillStyle);if("#010203"===a&&"#010203"!==e.trim().toLowerCase())return t;if(a.startsWith("#")){let e=a.slice(1);return[parseInt(e.slice(0,2),16)/255,parseInt(e.slice(2,4),16)/255,parseInt(e.slice(4,6),16)/255]}let r=a.match(/[\d.]+/g);return!r||r.length<3?t:[Number(r[0])/255,Number(r[1])/255,Number(r[2])/255]},g=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),x=([e,t,a])=>{let r=g(e),l=g(t),n=g(a),o=Math.cbrt(.4122214708*r+.5363325363*l+.0514459929*n),i=Math.cbrt(.2119034982*r+.6806995451*l+.1073969566*n),u=Math.cbrt(.0883024619*r+.2817188376*l+.6299787005*n);return[.2104542553*o+.793617785*i-.0040720468*u,1.9779984951*o-2.428592205*i+.4505937099*u,.0259040371*o+.7827717662*i-.808675766*u]},b=`
uniform float uTime;
uniform float uSpin;
uniform float uCoreRadius;
uniform float uArms;
uniform float uTwist;
uniform float uEps;
uniform float uPattern;

float omega(float a) {
  return uSpin / sqrt(a * a + uCoreRadius * uCoreRadius);
}

vec3 orbit(float a, float psi, float bulge, out float phase) {
  float th = psi + omega(a) * uTime;
  phase = uArms * (th + uTwist * log(max(a, 1e-3)) - uPattern * uTime);
  float r = a * (1.0 - uEps * cos(phase) * (1.0 - bulge));
  return vec3(r * cos(th), r * sin(th), th);
}
`,y=`
precision highp float;
uniform sampler2D uStatic;
uniform sampler2D uState;
uniform vec4 uSegment;
uniform float uGather;
uniform float uDrag;
uniform float uWidth;
uniform float uDecay;
${b}
out vec4 fragColor;

void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  vec2 offset = texelFetch(uState, cell, 0).xy;
  if (uGather > 0.0) {
    vec4 star = texelFetch(uStatic, cell, 0);
    float phase;
    vec3 at = orbit(star.x, star.y, star.z, phase);
    vec2 radial = vec2(cos(at.z), sin(at.z));
    vec2 tangent = vec2(-radial.y, radial.x);
    vec2 p = at.xy + radial * offset.x + tangent * offset.y;
    vec2 d = uSegment.zw - uSegment.xy;
    float len = length(d);
    vec2 dir = len > 1e-6 ? d / len : vec2(1.0, 0.0);
    float along = clamp(dot(p - uSegment.xy, dir), 0.0, len);
    vec2 n = p - uSegment.xy - dir * along;
    float w = exp(-dot(n, n) / (uWidth * uWidth)) * (1.0 - 0.7 * star.z) * smoothstep(0.05, 0.3, star.x);
    vec2 delta = (dir * uDrag * uWidth - n * uGather) * w;
    offset += vec2(dot(delta, radial), dot(delta, tangent));
  }
  fragColor = vec4(offset * uDecay, 0.0, 1.0);
}
`,w=`
in vec4 aOrbit;
in vec4 aTraits;
uniform sampler2D uState;
uniform int uStride;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform float uFocal;
uniform float uDistance;
uniform float uIncline;
uniform float uRoll;
uniform float uPixelRatio;
uniform float uRealTime;
uniform float uDust;
uniform float uCore;
uniform float uVoid;
uniform float uSize;
uniform float uSizeScale;
uniform float uSparkle;
uniform float uTwinkle;
uniform float uBack;
uniform float uEnergy;
uniform float uInk;
uniform vec3 uLabA;
uniform vec3 uLabB;
uniform vec4 uRipples[6];
uniform float uActive;
${b}
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

void main() {
  float a = aOrbit.x;
  float bulge = aTraits.x;
  float phase;
  vec3 at = orbit(a, aOrbit.y, bulge, phase);
  vec2 radial = vec2(cos(at.z), sin(at.z));
  vec2 tangent = vec2(-radial.y, radial.x);
  vec2 offset = texelFetch(uState, ivec2(gl_VertexID % uStride, gl_VertexID / uStride), 0).xy;
  vec3 p = vec3(at.xy + radial * offset.x + tangent * offset.y, aOrbit.z);
  float tidal = smoothstep(0.004, 0.03, length(offset));
  float ring = 0.0;
  if (uActive > 0.5) {
    for (int k = 0; k < 6; k++) {
      vec4 wave = uRipples[k];
      if (wave.w <= 0.0) continue;
      float age = uRealTime - wave.z;
      if (age < 0.0 || age > 7.0) continue;
      vec2 rel = p.xy - wave.xy;
      float rr = length(rel);
      float front = 0.05 + 0.32 * age;
      float width = 0.07 + 0.03 * age;
      float g = (rr - front) / width;
      float band = exp(-g * g);
      float envelope = wave.w * smoothstep(0.0, 0.7, age) * exp(-age / 2.2) * smoothstep(0.03, 0.2, front + length(wave.xy));
      p.xy -= rel / max(rr, 1e-4) * (rr - front) * 0.55 * envelope * band;
      p.z += 0.03 * envelope * band;
      ring += envelope * band;
    }
  }

  float ci = cos(uIncline);
  float si = sin(uIncline);
  vec3 q = vec3(p.x, p.y * ci + p.z * si, -p.y * si + p.z * ci);
  float cr = cos(uRoll);
  float sr = sin(uRoll);
  q.xy = vec2(cr * q.x - sr * q.y, sr * q.x + cr * q.y);
  float depth = uDistance - q.z;
  vec2 screen = uCenter + uFocal * q.xy / depth;

  float mk = uArms * uTwist;
  float crest = (cos(phase) - mk * sin(phase)) / sqrt(1.0 + mk * mk);
  float arm = pow(max(crest, 0.0), 2.0) * (1.0 - bulge);
  float laneCrest = (cos(phase - 0.55) - mk * sin(phase - 0.55)) / sqrt(1.0 + mk * mk);
  float lane = pow(max(laneCrest, 0.0), 8.0) * (1.0 - arm) * (1.0 - bulge) * smoothstep(0.1, 0.3, a);

  float reach = smoothstep(0.02, 0.55, a);
  vec3 tone = labToLinear(mix(uLabB, uLabA, reach));
  vec3 core = labToLinear(vec3(min(uLabB.x * 1.08 + 0.06, 0.98), uLabB.yz * 0.45));
  vec3 color = mix(tone, core, bulge * 0.75);
  vec3 youngColor = labToLinear(vec3(min(uLabB.x * 0.92, 0.9), uLabB.yz * 1.25));
  float young = smoothstep(0.84, 0.97, aTraits.z) * arm;
  float kindled = clamp(tidal * 0.7 + ring * 1.5, 0.0, 0.75) * (1.0 - bulge * 0.7);
  color = mix(color, youngColor, max(young * 0.75, kindled));
  float bright = step(1.0 - uSparkle, aTraits.y) * (1.0 - bulge * 0.6);
  color = mix(color, vec3(1.0, 0.97, 1.0), bright * 0.35);

  float twinkle = 1.0 - uTwinkle * 0.55 * (0.5 + 0.5 * sin(uRealTime * (0.6 + 1.6 * aTraits.w) + aTraits.w * 61.0));
  float body = mix(0.5 + 1.2 * arm + young * 1.4, uCore * 1.1, bulge) * (1.0 + bright * 2.2);
  body *= 1.0 - uDust * 0.8 * lane;
  float edge = 1.0 - smoothstep(0.82, 1.08, a);
  float hollow = smoothstep(uVoid * 0.85, uVoid * 1.15 + 0.01, a);
  float near = clamp(0.5 + 0.5 * q.z / 0.9, 0.0, 1.0);
  float gain = body * edge * hollow * twinkle * mix(uBack, 1.0, near) * (1.0 + uEnergy * 0.15);
  gain *= 1.0 + 0.9 * tidal * (1.0 - bulge * 0.7) + 0.5 * min(ring, 1.0);

  vColor = mix(color, labToLinear(vec3(uLabA.x * 0.62, uLabA.yz * 1.15)), uInk * 0.35);
  vGain = gain;
  float size = uSize * uSizeScale * uPixelRatio * mix(0.6, 1.1, fract(aTraits.y * 7.31)) * (1.0 + bright * 0.7 + young * 0.4);
  gl_PointSize = max(size * uDistance / depth, 1.0);
  gl_Position = vec4(screen / uResolution * 2.0 - 1.0, 0.0, 1.0);
}
`,S=`
precision highp float;
uniform float uStarGain;
in vec3 vColor;
in float vGain;
out vec4 fragColor;

void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(q, q);
  float e = (exp(-r2 * 6.0) + 0.25 * exp(-r2 * 2.0)) * vGain * uStarGain;
  fragColor = vec4(vColor * e, e);
}
`,C=`
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
    float cover = clamp(1.0 - exp(-energy * uExposure * 1.4), 0.0, 0.94);
    color = mix(uBackground, clamp(hue * 0.8, 0.0, 1.0), cover);
  }
  float grain = hash(gl_FragCoord.xy + uGrain * 311.0) - 0.5;
  fragColor = vec4(encode(color) + grain * (1.2 / 255.0), 1.0);
}
`,F=(0,l.forwardRef)(function({colors:e=["#7B4DFF","#FFC2EE"],backgroundColor:t="#0A0A0A",mode:a="auto",stars:n=7e4,starSize:o=1.7,sparkle:i=.5,arms:h=3,twist:b=3.5,armStrength:F=.5,dust:z=.5,core:R=1,coreSize:E=.07,innerVoid:j=0,thickness:B=.02,tilt:A=62,roll:L=-8,scale:D=1,centerX:I=.5,centerY:q=.52,speed:G=1,twinkle:U=.35,depth:P=.4,glow:W=.45,intensity:N=1,interactive:V=!0,hoverWake:_=!0,clickRipple:H=!0,wakeStrength:Y=1,rippleStrength:O=1,hoverBoost:X=.5,paused:Q=!1,quality:K=1,className:$,style:Z,children:J},ee){let et=(0,l.useRef)(null),ea=(0,l.useRef)(null),er=(0,l.useSyncExternalStore)(d,f,()=>!1),el=(0,l.useRef)({colors:e,backgroundColor:t,mode:a,stars:n,starSize:o,sparkle:i,arms:h,twist:b,armStrength:F,dust:z,core:R,coreSize:E,innerVoid:j,thickness:B,tilt:A,roll:L,scale:D,centerX:I,centerY:q,speed:G,twinkle:U,depth:P,glow:W,intensity:N,interactive:V,hoverWake:_,clickRipple:H,wakeStrength:Y,rippleStrength:O,hoverBoost:X,paused:Q,quality:K,reduced:er});return(0,l.useEffect)(()=>{el.current={colors:e,backgroundColor:t,mode:a,stars:n,starSize:o,sparkle:i,arms:h,twist:b,armStrength:F,dust:z,core:R,coreSize:E,innerVoid:j,thickness:B,tilt:A,roll:L,scale:D,centerX:I,centerY:q,speed:G,twinkle:U,depth:P,glow:W,intensity:N,interactive:V,hoverWake:_,clickRipple:H,wakeStrength:Y,rippleStrength:O,hoverBoost:X,paused:Q,quality:K,reduced:er},ea.current?.sync()}),(0,l.useEffect)(()=>{let e=et.current;if(!e)return;let t=((e,t)=>{let a,r=document.createElement("canvas");r.setAttribute("aria-hidden","true"),r.style.position="absolute",r.style.inset="0",r.style.width="100%",r.style.height="100%",r.style.display="block",r.style.pointerEvents="none",e.prepend(r);try{a=new s.WebGLRenderer({canvas:r,alpha:!1,antialias:!1,powerPreference:"high-performance"})}catch{return r.remove(),null}if(!a.capabilities.isWebGL2)return a.dispose(),r.remove(),null;a.autoClear=!1;let l=a.extensions.has("EXT_color_buffer_float")||a.extensions.has("EXT_color_buffer_half_float")?u.ix0:u.OUM,n=new u.qUd(-1,1,1,-1,0,1),o=new u.bdM(2,2),i=Array.from({length:6},()=>new u.IUQ(0,0,-100,0)),c=a.extensions.has("EXT_color_buffer_float")?u.RQf:u.ix0,d={uTime:{value:0},uSpin:{value:.11},uCoreRadius:{value:.12},uArms:{value:3},uTwist:{value:3.5},uEps:{value:.1},uPattern:{value:.04}},f=new u.BKk({glslVersion:u.Wdf,uniforms:{...d,uState:{value:null},uStride:{value:512},uResolution:{value:new u.I9Y(1,1)},uCenter:{value:new u.I9Y},uFocal:{value:1},uDistance:{value:3.6},uIncline:{value:1},uRoll:{value:0},uPixelRatio:{value:1},uRealTime:{value:0},uDust:{value:.5},uCore:{value:1},uVoid:{value:0},uSize:{value:1.4},uSizeScale:{value:1},uSparkle:{value:.08},uTwinkle:{value:.4},uBack:{value:.5},uEnergy:{value:0},uInk:{value:0},uLabA:{value:new u.Pq0},uLabB:{value:new u.Pq0},uRipples:{value:i},uActive:{value:0},uStarGain:{value:.3}},vertexShader:w,fragmentShader:S,depthTest:!1,depthWrite:!1,transparent:!0,blending:u.bCz,blendEquation:u.gO9,blendSrc:u.qad,blendDst:u.qad,blendSrcAlpha:u.qad,blendDstAlpha:u.qad}),h=(e,t)=>new u.BKk({glslVersion:u.Wdf,uniforms:t,vertexShader:C,fragmentShader:e,depthTest:!1,depthWrite:!1,blending:u.XIg}),b=h(y,{...d,uStatic:{value:null},uState:{value:null},uSegment:{value:new u.IUQ},uGather:{value:0},uDrag:{value:0},uWidth:{value:.09},uDecay:{value:1}}),F=h(k,{uSource:{value:null},uTexel:{value:new u.I9Y}}),z=h(M,{uSource:{value:null},uBase:{value:null},uTexel:{value:new u.I9Y}}),R=h(T,{uLines:{value:null},uBloom:{value:null},uBackground:{value:new u.Pq0},uGlow:{value:.5},uExposure:{value:1},uMode:{value:0},uGrain:{value:0}}),E=new u.ONl(new u.LoY,f);E.frustumCulled=!1;let j=new u.Z58;j.add(E);let B=new u.eaF(o,R);B.frustumCulled=!1;let A=new u.Z58;A.add(B);let L="",D=null,I=[],q=0,G=(e,t)=>new u.nWS(Math.max(1,e),Math.max(1,t),{type:l,format:u.GWd,minFilter:u.k6q,magFilter:u.k6q,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1}),U=null,P=[],W=[],N=!1,V=0,_=0,H=!0,Y=40,O=0,X=0,Q=1,K=1,$=1,Z=0,J=-100,ee={inside:!1,disc:null,trail:null},et=()=>{U?.dispose(),P.forEach(e=>e.dispose()),W.forEach(e=>e.dispose()),U=null,P=[],W=[]},ea=(e,t)=>{B.material=e,a.setRenderTarget(t),a.render(A,n)},er=()=>{let e=t.current,r=Math.round(v(e.stars,2e3,25e4)),l=v(e.coreSize,.02,.3),n=v(e.thickness,0,.2),o=[r,l,n].join("|");if(o===L)return;L=o,E.geometry.dispose(),D?.dispose(),I.forEach(e=>e.dispose());let i=((e,t,a)=>{let r,l=(r=23,()=>(r=16807*r%0x7fffffff)/0x7fffffff),n=()=>Math.sqrt(-2*Math.log(Math.max(l(),1e-9)))*Math.cos(m*l()),o=Math.ceil(e/512),i=new Float32Array(8*e),s=new Float32Array(512*o*4);for(let r=0;r<e;r++){let e,o,u=.16>l();if(u)e=Math.min(t/Math.sqrt(Math.pow(Math.min(Math.max(l(),1e-4),.995),-2/3)-1),4*t),o=n()*e*.5;else{do e=-.32*Math.log(Math.max(l()*l(),1e-9));while(e>1.08);e=Math.max(e,.012),o=n()*a*(.5+.5*Math.exp(-e/.25))}let c=l()*m;i.set([e,c,o,l(),+!!u,l(),l(),l()],8*r),s.set([e,c,+!!u,0],4*r)}let c=new u.LoY,d=new u.eB$(i,8);c.setAttribute("aOrbit",new u.eHs(d,4,0)),c.setAttribute("aTraits",new u.eHs(d,4,4)),c.setAttribute("position",new u.eHs(d,3,0));let f=new u.GYF(s,512,o,u.GWd,u.RQf);return f.minFilter=u.hxR,f.magFilter=u.hxR,f.generateMipmaps=!1,f.needsUpdate=!0,{geometry:c,texture:f,rows:o}})(r,l,n);for(let e of(E.geometry=i.geometry,D=i.texture,I=[0,1].map(()=>new u.nWS(512,i.rows,{type:c,format:u.GWd,minFilter:u.hxR,magFilter:u.hxR,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1})),q=0,I))a.setRenderTarget(e),a.setClearColor(0,0),a.clear();b.uniforms.uStatic.value=D,f.uniforms.uState.value=I[0].texture},el=()=>{let e=t.current,a=Q*$,r=K*$,l=.36*v(e.scale,.2,4)*Math.min(a,1.7*r);return{incline:v(e.tilt,0,85)*Math.PI/180,roll:v(e.roll,-180,180)*Math.PI/180,focal:3.6*l,center:[v(e.centerX,-.5,1.5)*a,(1-v(e.centerY,-.5,1.5))*r]}},en=(t,a)=>{let r=e.getBoundingClientRect(),l=el(),n=(t-r.left)*$,o=(r.height-(a-r.top))*$,i=(n-l.center[0])/l.focal,u=(o-l.center[1])/l.focal,s=Math.cos(l.roll),c=Math.sin(l.roll),m=-c*i+s*u,d=Math.cos(l.incline),f=Math.sin(l.incline),v=d-m*f;if(v<=.02)return null;let h=3.6*m/v;return{x:(s*i+c*u)*(3.6+h*f),y:h}},eo=(e=0,a=0)=>{let r=t.current;if(r.reduced||r.paused)return;let l=v(r.rippleStrength,0,3),n=0,o=0;for(let e=1;e<6;e++)i[e].z>i[n].z&&(n=e),i[e].z<i[o].z&&(o=e);let u=i[n];u.w>0&&O-u.z<.35&&.15>Math.hypot(u.x-e,u.y-a)?u.w=Math.min(u.w+.3*l,1.6*l):O-i[o].z>7?i[o].set(e,a,O,l):u.w=Math.min(u.w+.25*l,1.6*l),em()},ei=()=>i.some(e=>e.w>0&&O-e.z<7),eu=()=>{let e,r,l,o,i,u,s,c,m,h,b,y,w,S,C,k,M,T;if(!U||!P.length)return;er(),e=t.current,r=f.uniforms,l=Q*$,o=K*$,i=el(),s=.2126*(u=p(e.backgroundColor,[.04,.04,.04]))[0]+.7152*u[1]+.0722*u[2],c="ink"===e.mode||"auto"===e.mode&&s>.5,m=x(p(e.colors[0],[.48,.3,1])),h=x(p(e.colors[1],[1,.78,.95])),b=Math.round(v(e.arms,1,8)),y=v(e.twist,.5,8),w=v(e.armStrength,0,1),r.uResolution.value.set(l,o),r.uCenter.value.set(i.center[0],i.center[1]),r.uFocal.value=i.focal,r.uIncline.value=i.incline,r.uRoll.value=i.roll,r.uPixelRatio.value=$,d.uTime.value=Y,r.uRealTime.value=O,d.uArms.value=b,d.uTwist.value=y,d.uEps.value=.92*w/Math.sqrt(1+b*b*y*y),r.uDust.value=v(e.dust,0,1),r.uCore.value=v(e.core,0,3),r.uVoid.value=v(e.innerVoid,0,.6),r.uSize.value=v(e.starSize,.3,6),r.uSparkle.value=.2*v(e.sparkle,0,1),r.uTwinkle.value=e.reduced?0:v(e.twinkle,0,1),r.uBack.value=1-v(e.depth,0,1),r.uEnergy.value=X,r.uInk.value=+!!c,r.uLabA.value.set(m[0],m[1],m[2]),r.uLabB.value.set(h[0],h[1],h[2]),r.uActive.value=+!!ei(),S=Math.round(v(e.stars,2e3,25e4)),k=v(C=Math.pow(i.focal/3.6/$/380,2),.2,1),M=v(Math.pow(C,.25),.9,1.22),E.geometry.setDrawRange(0,Math.round(S*k)),r.uSizeScale.value=M,r.uStarGain.value=.3*Math.sqrt(6e4/S)*v(C/(k*M*M),.5,1.5),(T=R.uniforms).uBackground.value.set(g(u[0]),g(u[1]),g(u[2])),T.uGlow.value=v(e.glow,0,3),T.uExposure.value=(c?4.5:1)*v(e.intensity,0,4)*(1+.08*X),T.uMode.value=+!!c,T.uGrain.value=Z,a.setRenderTarget(U),a.setClearColor(0,0),a.clear(),a.render(j,n);let B=U;for(let e of P)F.uniforms.uSource.value=B.texture,F.uniforms.uTexel.value.set(1/B.width,1/B.height),ea(F,e),B=e;let A=P[P.length-1];for(let e=P.length-2;e>=0;e--)z.uniforms.uSource.value=A.texture,z.uniforms.uBase.value=P[e].texture,z.uniforms.uTexel.value.set(1/A.width,1/A.height),ea(z,W[e]),A=W[e];R.uniforms.uLines.value=U.texture,R.uniforms.uBloom.value=A.texture,ea(R,null)},es=()=>{let e=t.current;return ee.inside&&e.interactive&&!e.reduced?v(e.hoverBoost,0,2):0},ec=e=>{let r;if(V=0,N)return;let l=Math.min(.05,Math.max(0,(e-_)/1e3));_=e,r=t.current,X+=(es()-X)*(1-Math.exp(-l/.5)),r.paused||r.reduced||(O+=l,Y+=l*v(r.speed,-4,4)*(1+.25*X),Z=(Z+.618034)%1),er(),(e=>{let r=t.current;if(!I.length||r.paused||r.reduced||e<=0)return;let l=0,o=0,i=ee.trail,u=ee.disc,s=b.uniforms;if(ee.inside&&r.interactive&&r.hoverWake&&i&&u){let t=Math.hypot(u.x-i.x,u.y-i.y);if(t>1e-5){let a=v((t/Math.max(e,1/240)-.05)/1.15,0,1);o=.25*(l=.9*v(r.wakeStrength,0,3)*a*a*(3-2*a)*t/(t+.15947999999999998)),s.uSegment.value.set(i.x,i.y,u.x,u.y),l>0&&(J=O)}}ee.trail=u?{x:u.x,y:u.y}:null,l<=0&&O-J>24.5||(s.uGather.value=l,s.uDrag.value=o,s.uDecay.value=Math.exp(-e/3.5),s.uState.value=I[q].texture,s.uTime.value=Y,B.material=b,a.setRenderTarget(I[1-q]),a.render(A,n),q=1-q,f.uniforms.uState.value=I[q].texture)})(l),eu();let o=t.current,i=!o.paused&&!o.reduced,u=Math.abs(X-es())>.002||ei()||O-J<24.5;H&&!document.hidden&&(i||u)&&(V=requestAnimationFrame(ec))};function em(){N||V||!H||(_=performance.now(),V=requestAnimationFrame(ec))}let ed=()=>{let r=e.getBoundingClientRect();Q=Math.max(1,r.width),K=Math.max(1,r.height),$=Math.min(window.devicePixelRatio||1,2)*v(t.current.quality,.25,1),a.setPixelRatio($),a.setSize(Q,K,!1);let l=Math.round(Q*$),n=Math.round(K*$);et(),U=G(l,n);let o=v(Math.floor(Math.log2(Math.min(l,n)/8)),3,7);for(let e=1;e<=o;e++)P.push(G(Math.max(1,l>>e),Math.max(1,n>>e))),W.push(G(Math.max(1,l>>e),Math.max(1,n>>e)));eu(),em()},ef=e=>{let a=t.current;if("touch"===e.pointerType||!a.interactive)return;ee.inside||(ee.inside=!0,ee.trail=null,em());let r=en(e.clientX,e.clientY);ee.disc=r&&1.6>Math.hypot(r.x,r.y)?r:null,ee.disc||(ee.trail=null),em()},ev=()=>{ee.inside=!1,ee.disc=null,ee.trail=null,em()},eh=e=>{let a=t.current;if(0!==e.button||!a.interactive||!a.clickRipple)return;let r=en(e.clientX,e.clientY),l=r&&1.2>Math.hypot(r.x,r.y);eo(l?r.x:0,l?r.y:0)};e.addEventListener("pointermove",ef),e.addEventListener("pointerleave",ev),e.addEventListener("pointercancel",ev),e.addEventListener("pointerdown",eh);let ep=new ResizeObserver(ed);ep.observe(e);let eg=new IntersectionObserver(e=>{(H=e.some(e=>e.isIntersecting))&&em()},{rootMargin:"80px"});eg.observe(e);let ex=()=>{document.hidden||em()};document.addEventListener("visibilitychange",ex);let eb=e=>e.preventDefault();return r.addEventListener("webglcontextlost",eb),ed(),{sync:()=>{Math.abs(Math.min(window.devicePixelRatio||1,2)*v(t.current.quality,.25,1)-$)>.001?ed():eu(),em()},destroy:()=>{N=!0,cancelAnimationFrame(V),e.removeEventListener("pointermove",ef),e.removeEventListener("pointerleave",ev),e.removeEventListener("pointercancel",ev),e.removeEventListener("pointerdown",eh),document.removeEventListener("visibilitychange",ex),r.removeEventListener("webglcontextlost",eb),ep.disconnect(),eg.disconnect(),et(),E.geometry.dispose(),D?.dispose(),I.forEach(e=>e.dispose()),o.dispose(),[f,b,F,z,R].forEach(e=>e.dispose()),a.dispose(),a.forceContextLoss(),r.remove()},ripple:()=>eo(0,0)}})(e,el);return ea.current=t,()=>{t?.destroy(),ea.current=null}},[]),(0,l.useImperativeHandle)(ee,()=>({ripple:()=>ea.current?.ripple()}),[]),(0,r.jsx)("div",{ref:et,className:(0,c.cn)("relative isolate h-full min-h-[240px] w-full overflow-hidden",$),style:{backgroundColor:t,...Z},children:J&&(0,r.jsx)("div",{className:"relative z-10 h-full w-full",children:J})})});F.displayName="BinaryOrbits";let z={dark:["#7B4DFF","#FFC2EE"],light:["#5B2BFF","#D13DB8"],stars:7e4,starSize:1.7,sparkle:.5,arms:3,twist:3.5,armStrength:.5,core:1,innerVoid:0,tilt:62,roll:-8,scale:1},R={aurora:z,andromeda:{...z,dark:["#6C8CFF","#FFE0C7"],light:["#2F4FD8","#B8742E"],arms:2,twist:2.6,armStrength:.4,core:1.3,tilt:74,roll:-18},whirlpool:{...z,arms:2,twist:3,armStrength:.75,tilt:32,roll:0,scale:.85},halo:{...z,arms:5,twist:5,armStrength:.55,innerVoid:.14},mono:{...z,dark:["#CFC8FF","#FFFFFF"],light:["#1A1A1A","#555555"]},ember:{...z,dark:["#FF6A2A","#FFD8A8"],light:["#C2410C","#B45309"]},deepField:{...z,stars:16e4,starSize:1.2,sparkle:.8,armStrength:.3}},E=[{label:"Aurora",value:"aurora"},{label:"Andromeda",value:"andromeda"},{label:"Whirlpool",value:"whirlpool"},{label:"Halo",value:"halo"},{label:"Mono",value:"mono"},{label:"Ember",value:"ember"},{label:"Deep Field",value:"deepField"}],j=[{label:"Auto",value:"auto"},{label:"Glow",value:"glow"},{label:"Ink",value:"ink"}],B=[{name:"colors",type:"[string, string]",default:'["#7B4DFF", "#FFC2EE"]',description:"Colour of the outer arms and colour of the inner disc, blended in OKLab. The core burns toward white and newly formed stars take on a warmer shade of the second colour."},{name:"backgroundColor",type:"string",default:'"#0A0A0A"',description:"Colour behind the galaxy."},{name:"mode",type:'"auto" | "glow" | "ink"',default:'"auto"',description:"glow adds light for dark backgrounds, ink stipples coloured stars for light ones. auto picks from the background brightness."},{name:"stars",type:"number",default:"70000",description:"Number of stars, from 2,000 to 250,000."},{name:"starSize",type:"number",default:"1.7",description:"Size of the stars in pixels. Stars nearer the camera draw slightly larger."},{name:"sparkle",type:"number",default:"0.5",description:"Share of brighter, larger stars scattered through the disc, from 0 to 1."},{name:"arms",type:"number",default:"3",description:"Number of spiral arms, from 1 to 8."},{name:"twist",type:"number",default:"3.5",description:"How tightly the arms wind. Higher values give tighter, more numerous turns."},{name:"armStrength",type:"number",default:"0.5",description:"How strongly stars crowd into the arms, from 0 (a smooth disc) to 1."},{name:"dust",type:"number",default:"0.5",description:"Darkness of the dust lanes that run along the inner edge of each arm, from 0 to 1."},{name:"core",type:"number",default:"1",description:"Brightness of the central bulge, from 0 to 3."},{name:"coreSize",type:"number",default:"0.07",description:"Radius of the central bulge, as a fraction of the galaxy's radius."},{name:"innerVoid",type:"number",default:"0",description:"Radius of an empty hole at the centre, from 0 to 0.6. Combine with more arms for a ringed galaxy."},{name:"thickness",type:"number",default:"0.02",description:"Thickness of the disc. Stars scatter above and below it, most of all near the centre."},{name:"tilt",type:"number",default:"62",description:"Viewing angle in degrees, from 0 (face-on) to 85 (nearly edge-on)."},{name:"roll",type:"number",default:"-8",description:"Rotation of the whole galaxy on screen, in degrees."},{name:"scale",type:"number",default:"1",description:"Size of the galaxy relative to the frame."},{name:"centerX",type:"number",default:"0.5",description:"Horizontal position of the centre, from 0 (left) to 1 (right)."},{name:"centerY",type:"number",default:"0.52",description:"Vertical position of the centre, from 0 (top) to 1 (bottom)."},{name:"speed",type:"number",default:"1",description:"Rotation speed. Inner stars orbit faster than outer ones, so the arms stay put while stars stream through them. Negative values turn it the other way."},{name:"twinkle",type:"number",default:"0.35",description:"How much individual stars shimmer, from 0 to 1."},{name:"depth",type:"number",default:"0.4",description:"How much the far side of the disc dims, from 0 (flat) to 1."},{name:"glow",type:"number",default:"0.45",description:"Soft haze around bright regions, from 0 to 3."},{name:"intensity",type:"number",default:"1",description:"Overall exposure."},{name:"interactive",type:"boolean",default:"true",description:"Respond to the pointer."},{name:"hoverWake",type:"boolean",default:"true",description:"Sweeping the pointer across the disc gathers nearby stars into a faint tidal filament. The galaxy's rotation winds it into a new trailing arc, which then relaxes back into the disc."},{name:"clickRipple",type:"boolean",default:"true",description:"Clicking sends a soft ring of compressed stars outward from the click point, like the density wave of a ring galaxy. Newly formed stars light up as it passes."},{name:"wakeStrength",type:"number",default:"1",description:"How strongly a sweep gathers stars, from 0 to 3."},{name:"rippleStrength",type:"number",default:"1",description:"Strength of the click ring, from 0 to 3."},{name:"hoverBoost",type:"number",default:"0.5",description:"How much the rotation quickens and the disc brightens while the pointer is over it, from 0 to 2."},{name:"paused",type:"boolean",default:"false",description:"Freeze the rotation. Reduced-motion users always get a still frame."},{name:"quality",type:"number",default:"1",description:"Resolution scale from 0.25 to 1. Lower values are cheaper on large screens."},{name:"ref",type:"{ ripple }",default:"—",description:"ripple() sends a ring outward from the centre, for example when a form is submitted."},{name:"children",type:"ReactNode",default:"—",description:"Content placed over the background."},{name:"className",type:"string",default:"—",description:"Classes for the root element. It fills its parent, with a 240px minimum height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."}],A=()=>{let[e,t]=(0,i.I)(),a="dark"===(0,o.Y)(),[u,s]=(0,l.useState)("aurora"),[c,m]=(0,l.useState)(z),d=e=>t=>m(a=>({...a,[e]:t})),[f,v]=(0,l.useState)(null),h=f??(a?c.dark:c.light),p=e=>t=>{let a=[...h];a[e]=t,v(a)},[g,x]=(0,l.useState)(null),b=g??(a?"#0A0A0A":"#FFFFFF"),[y,w]=(0,l.useState)("auto"),[S,C]=(0,l.useState)(.5),[k,M]=(0,l.useState)(.07),[T,A]=(0,l.useState)(.02),[L,D]=(0,l.useState)(.5),[I,q]=(0,l.useState)(.52),[G,U]=(0,l.useState)(1),[P,W]=(0,l.useState)(.35),[N,V]=(0,l.useState)(.4),[_,H]=(0,l.useState)(.45),[Y,O]=(0,l.useState)(1),[X,Q]=(0,l.useState)(1),[K,$]=(0,l.useState)(1),[Z,J]=(0,l.useState)(.5),[ee,et]=(0,l.useState)(!0),[ea,er]=(0,l.useState)(!0),[el,en]=(0,l.useState)(!0),[eo,ei]=(0,l.useState)(!1);return(0,r.jsxs)("div",{children:[(0,r.jsx)(n.Bg,{}),(0,r.jsxs)(n.VX,{children:[(0,r.jsxs)(n.Ec,{children:[(0,r.jsx)(n.Ch,{onRefresh:t,minHeight:560,enableResponsive:!0,children:(0,r.jsx)("div",{className:"relative h-full w-full",children:(0,r.jsx)(F,{colors:h,backgroundColor:b,mode:y,stars:c.stars,starSize:c.starSize,sparkle:c.sparkle,arms:c.arms,twist:c.twist,armStrength:c.armStrength,dust:S,core:c.core,coreSize:k,innerVoid:c.innerVoid,thickness:T,tilt:c.tilt,roll:c.roll,scale:c.scale,centerX:L,centerY:I,speed:G,twinkle:P,depth:N,glow:_,intensity:Y,interactive:el,hoverWake:ee,clickRipple:ea,wakeStrength:X,rippleStrength:K,hoverBoost:Z,paused:eo},e)})}),(0,r.jsxs)(n.IH,{children:[(0,r.jsx)(n.bg,{title:"Preset",value:u,options:E,onChange:e=>{s(e),m(R[e]??z),v(null)}}),(0,r.jsx)(n.bg,{title:"Mode",value:y,options:j,onChange:e=>w(e)}),(0,r.jsx)(n.W7,{title:"Arms",value:h[0],onChange:p(0)}),(0,r.jsx)(n.W7,{title:"Core",value:h[1],onChange:p(1)}),(0,r.jsx)(n.W7,{title:"Background",value:b,onChange:x}),(0,r.jsx)(n.yt,{title:"Stars",min:2e3,max:25e4,step:1e3,value:c.stars,onChange:d("stars")}),(0,r.jsx)(n.yt,{title:"Star Size",min:.3,max:4,step:.05,value:c.starSize,valueUnit:"px",onChange:d("starSize")}),(0,r.jsx)(n.yt,{title:"Sparkle",min:0,max:1,step:.01,value:c.sparkle,onChange:d("sparkle")}),(0,r.jsx)(n.yt,{title:"Arms",min:1,max:8,step:1,value:c.arms,onChange:d("arms")}),(0,r.jsx)(n.yt,{title:"Twist",min:.5,max:8,step:.05,value:c.twist,onChange:d("twist")}),(0,r.jsx)(n.yt,{title:"Arm Strength",min:0,max:1,step:.01,value:c.armStrength,onChange:d("armStrength")}),(0,r.jsx)(n.yt,{title:"Dust",min:0,max:1,step:.01,value:S,onChange:C}),(0,r.jsx)(n.yt,{title:"Core",min:0,max:3,step:.05,value:c.core,onChange:d("core")}),(0,r.jsx)(n.yt,{title:"Core Size",min:.02,max:.3,step:.005,value:k,onChange:M}),(0,r.jsx)(n.yt,{title:"Inner Void",min:0,max:.6,step:.01,value:c.innerVoid,onChange:d("innerVoid")}),(0,r.jsx)(n.yt,{title:"Thickness",min:0,max:.2,step:.005,value:T,onChange:A}),(0,r.jsx)(n.yt,{title:"Tilt",min:0,max:85,step:1,value:c.tilt,valueUnit:"\xb0",onChange:d("tilt")}),(0,r.jsx)(n.yt,{title:"Roll",min:-180,max:180,step:1,value:c.roll,valueUnit:"\xb0",onChange:d("roll")}),(0,r.jsx)(n.yt,{title:"Scale",min:.3,max:2.5,step:.01,value:c.scale,onChange:d("scale")}),(0,r.jsx)(n.yt,{title:"Center X",min:0,max:1,step:.01,value:L,onChange:D}),(0,r.jsx)(n.yt,{title:"Center Y",min:0,max:1,step:.01,value:I,onChange:q}),(0,r.jsx)(n.yt,{title:"Speed",min:-3,max:3,step:.05,value:G,onChange:U}),(0,r.jsx)(n.yt,{title:"Twinkle",min:0,max:1,step:.01,value:P,onChange:W}),(0,r.jsx)(n.yt,{title:"Depth",min:0,max:1,step:.01,value:N,onChange:V}),(0,r.jsx)(n.yt,{title:"Glow",min:0,max:2,step:.05,value:_,onChange:H}),(0,r.jsx)(n.yt,{title:"Intensity",min:.2,max:3,step:.05,value:Y,onChange:O}),(0,r.jsx)(n.yt,{title:"Wake Strength",min:0,max:3,step:.05,value:X,onChange:Q}),(0,r.jsx)(n.yt,{title:"Ripple Strength",min:0,max:3,step:.05,value:K,onChange:$}),(0,r.jsx)(n.yt,{title:"Hover Boost",min:0,max:2,step:.05,value:Z,onChange:J}),(0,r.jsx)(n.tl,{title:"Hover Wake",checked:ee,onChange:et}),(0,r.jsx)(n.tl,{title:"Click Ripple",checked:ea,onChange:er}),(0,r.jsx)(n.tl,{title:"Interactive",checked:el,onChange:en}),(0,r.jsx)(n.tl,{title:"Paused",checked:eo,onChange:ei})]}),(0,r.jsx)(n.Ub,{data:B})]}),(0,r.jsx)(n.lT,{children:(0,r.jsx)(n.Gv,{})})]})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>i});var r=a(12115),l=a(30701);let n=()=>()=>{},o=()=>"light";function i(){let{resolvedTheme:e}=(0,l.D)();return(0,r.useSyncExternalStore)(n,()=>"dark"===e?"dark":"light",o)}},90761:(e,t,a)=>{a.d(t,{I:()=>l});var r=a(12115);function l(){let[e,t]=(0,r.useState)(0),a=(0,r.useCallback)(()=>{t(e=>e+1)},[]);return(0,r.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);