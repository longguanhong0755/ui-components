"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[78404],{56388:(e,t,a)=>{a.d(t,{Gv:()=>o.CodeExample,lT:()=>r.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>c.CopyButton,IH:()=>l.Customize,gI:()=>m,Dn:()=>p,pi:()=>h,W7:()=>i.PreviewColor,Ch:()=>u.PreviewContainer,UD:()=>i.PreviewInput,bg:()=>i.PreviewSelect,yt:()=>i.PreviewSlider,tl:()=>i.PreviewSwitch,Ec:()=>r.PreviewTab,Ub:()=>n.PropTable,VX:()=>r.TabsLayout,bs:()=>f});var r=a(55019);a(27382);var u=a(10236),l=a(69485),i=a(48543),n=a(87552);a(39260);var o=a(52407),s=a(79901);a(24496);var v=a(95155);a(66729);var c=a(28592),d=a(90650);let f="rounded-lg border bg-background";function m({className:e,children:t,...a}){return(0,v.jsx)("div",{className:(0,d.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function h({className:e,children:t,...a}){return(0,v.jsx)("div",{className:(0,d.cn)(f,e),...a,children:t})}function p({title:e,description:t,className:a,children:r}){return(0,v.jsxs)("section",{className:a,children:[(0,v.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,v.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,v.jsx)("div",{className:"mt-6",children:r})]})}},78404:(e,t,a)=>{a.r(t),a.d(t,{default:()=>G});var r=a(95155),u=a(12115),l=a(86049),i=a(56388),n=a(90761),o=a(81712),s=a(3907),v=a(2253),c=a(90650);let d=["#5227FF","#FF9FFC"],f=`
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

uniform vec2 uTexel;

void main() {
  vUv = uv;
  vL = uv - vec2(uTexel.x, 0.0);
  vR = uv + vec2(uTexel.x, 0.0);
  vT = uv + vec2(0.0, uTexel.y);
  vB = uv - vec2(0.0, uTexel.y);
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,m=`
precision highp float;

varying vec2 vUv;

uniform sampler2D uTarget;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform vec3 uValue;
uniform float uRadius;
uniform float uAspect;

void main() {
  vec2 a = uFrom * vec2(uAspect, 1.0);
  vec2 b = uTo * vec2(uAspect, 1.0);
  vec2 p = vUv * vec2(uAspect, 1.0);
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  vec2 d = p - (a + ab * h);
  float g = exp(-dot(d, d) / max(uRadius * uRadius, 1e-6));
  gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + uValue * g, 1.0);
}
`,h=`
precision highp float;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

uniform sampler2D uVelocity;

void main() {
  float left = texture2D(uVelocity, vL).y;
  float right = texture2D(uVelocity, vR).y;
  float top = texture2D(uVelocity, vT).x;
  float bottom = texture2D(uVelocity, vB).x;
  gl_FragColor = vec4(0.5 * (right - left - top + bottom), 0.0, 0.0, 1.0);
}
`,p=`
precision highp float;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uStrength;
uniform float uDelta;

void main() {
  float left = texture2D(uCurl, vL).x;
  float right = texture2D(uCurl, vR).x;
  float top = texture2D(uCurl, vT).x;
  float bottom = texture2D(uCurl, vB).x;
  float center = texture2D(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(top) - abs(bottom), abs(right) - abs(left));
  force /= length(force) + 1e-4;
  force *= uStrength * center;
  force.y *= -1.0;
  vec2 velocity = texture2D(uVelocity, vUv).xy + force * uDelta;
  gl_FragColor = vec4(clamp(velocity, -1000.0, 1000.0), 0.0, 1.0);
}
`,g=`
precision highp float;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

uniform sampler2D uVelocity;

void main() {
  vec2 center = texture2D(uVelocity, vUv).xy;
  float left = vL.x < 0.0 ? -center.x : texture2D(uVelocity, vL).x;
  float right = vR.x > 1.0 ? -center.x : texture2D(uVelocity, vR).x;
  float top = vT.y > 1.0 ? -center.y : texture2D(uVelocity, vT).y;
  float bottom = vB.y < 0.0 ? -center.y : texture2D(uVelocity, vB).y;
  gl_FragColor = vec4(0.5 * (right - left + top - bottom), 0.0, 0.0, 1.0);
}
`,x=`
precision highp float;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

uniform sampler2D uSource;
uniform float uAmount;

void main() {
  vec4 center = texture2D(uSource, vUv);
  vec4 around = (
    texture2D(uSource, vL) +
    texture2D(uSource, vR) +
    texture2D(uSource, vT) +
    texture2D(uSource, vB)
  ) * 0.25;
  gl_FragColor = mix(center, around, uAmount);
}
`,y=`
precision highp float;

varying vec2 vUv;

uniform sampler2D uSource;
uniform float uKeep;

void main() {
  gl_FragColor = texture2D(uSource, vUv) * uKeep;
}
`,b=`
precision highp float;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

uniform sampler2D uPressure;
uniform sampler2D uDivergence;

void main() {
  float left = texture2D(uPressure, vL).x;
  float right = texture2D(uPressure, vR).x;
  float top = texture2D(uPressure, vT).x;
  float bottom = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  gl_FragColor = vec4((left + right + top + bottom - divergence) * 0.25, 0.0, 0.0, 1.0);
}
`,w=`
precision highp float;

varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

uniform sampler2D uPressure;
uniform sampler2D uVelocity;

void main() {
  float left = texture2D(uPressure, vL).x;
  float right = texture2D(uPressure, vR).x;
  float top = texture2D(uPressure, vT).x;
  float bottom = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy - vec2(right - left, top - bottom);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`,S=`
precision highp float;

varying vec2 vUv;

uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uGridTexel;
uniform float uDelta;
uniform float uFade;

void main() {
  vec2 from = vUv - uDelta * texture2D(uVelocity, vUv).xy * uGridTexel;
  gl_FragColor = texture2D(uSource, from) / (1.0 + uFade * uDelta);
}
`,F=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,D=`
precision highp float;

#define TAU 6.28318530718

varying vec2 vUv;

uniform sampler2D uDye;
uniform vec2 uDyeTexel;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uBackground;
uniform vec3 uShade;
uniform float uTexture;
uniform float uTransparent;
uniform float uLightSurface;
uniform float uAngle;
uniform float uFlutes;
uniform float uRefraction;
uniform float uAberration;
uniform float uSoftness;
uniform float uWave;
uniform float uWaveFrequency;
uniform float uDrift;
uniform float uHighlight;
uniform float uHighlightSoftness;
uniform float uLightAngle;
uniform float uGrain;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

float gradientNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(hash22(i), f);
  float b = dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec2 mirrorUv(vec2 uv) {
  vec2 m = mod(uv, 2.0);
  return 1.0 - abs(1.0 - m);
}

vec3 surface(vec2 uv, float aspect) {
  vec2 q = (uv - 0.5) * vec2(aspect, 1.0) * 1.7;
  float t = uTime * 0.08;
  float warp = gradientNoise(q * 0.9 + vec2(t, -t * 0.7));
  float swirl = gradientNoise(q * 1.6 + warp * 1.4 + vec2(-t * 0.6, t * 0.9) + 3.7);
  float blend = clamp(0.5 + swirl * 1.2, 0.0, 1.0);
  return mix(uBackground, uShade, blend * uTexture);
}

vec4 paint(vec2 uv) {
  vec2 at = mirrorUv(uv);
  vec2 o = uDyeTexel * 2.6;
  vec3 dye = texture2D(uDye, at).rgb * 0.4;
  dye += texture2D(uDye, at + vec2(o.x, o.y)).rgb * 0.15;
  dye += texture2D(uDye, at + vec2(-o.x, o.y)).rgb * 0.15;
  dye += texture2D(uDye, at + vec2(o.x, -o.y)).rgb * 0.15;
  dye += texture2D(uDye, at + vec2(-o.x, -o.y)).rgb * 0.15;
  dye = max(dye, 0.0);
  float amount = max(dye.r, max(dye.g, dye.b));
  float cover = 1.0 - exp(-amount * 2.4);
  vec3 hue = dye / max(amount, 1e-4);
  float dark = 1.0 - uLightSurface;
  hue = mix(hue, vec3(1.0), 0.34 * dark * smoothstep(0.4, 1.0, cover));
  return vec4(clamp(hue, 0.0, 1.0), cover);
}

void main() {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  float c = cos(uAngle);
  float s = sin(uAngle);
  vec2 across = vec2(c, -s);
  vec2 along = vec2(s, c);
  float span = max(aspect, 1.0);
  float width = span / max(uFlutes, 1.0) * max(abs(c), 0.15);

  float travel = dot(p, along);
  float sway = uWave * width * 0.35 * sin((travel / span) * uWaveFrequency * TAU + uTime * 0.6);
  float position = (dot(p, across) + sway) / width + uTime * uDrift * 0.15;
  float f = fract(position) - 0.5;
  float power = mix(3.0, 1.0, clamp(uSoftness, 0.0, 1.0));
  float lens = sign(f) * pow(abs(f) * 2.0, power) * 0.5;

  float shift = -lens * uRefraction * width;
  float split = uAberration * 0.42 * width * lens;
  vec2 toUv = vec2(1.0 / aspect, 1.0);
  vec2 red = vUv + across * (shift + split) * toUv;
  vec2 green = vUv + across * shift * toUv;
  vec2 blue = vUv + across * (shift - split) * toUv;

  vec4 paintR = paint(red);
  vec4 paintG = paint(green);
  vec4 paintB = paint(blue);
  vec3 base = vec3(
    surface(red, aspect).r,
    surface(green, aspect).g,
    surface(blue, aspect).b
  );
  vec3 color = vec3(
    mix(base.r, paintR.r, paintR.a),
    mix(base.g, paintG.g, paintG.a),
    mix(base.b, paintB.b, paintB.a)
  );

  float light = sin(radians(uLightAngle)) * 0.5;
  float spread = mix(0.012, 0.16, clamp(uHighlightSoftness, 0.0, 1.0));
  float glint = exp(-pow((f - light * 0.97) / spread, 2.0));
  float cover = max(paintG.a, max(paintR.a, paintB.a));
  color += vec3(uHighlight) * glint * (0.05 + cover * 0.9) * (1.0 - uLightSurface);
  float seamShadow = 1.0 - smoothstep(0.0, 0.16, 0.5 - abs(f));
  float roll = 1.0 - 0.05 * lens * lens * 4.0 - 0.08 * seamShadow;
  color *= mix(1.0, roll, uLightSurface * (1.0 - cover * 0.6));

  float alpha = 1.0;
  if (uTransparent > 0.5) {
    alpha = clamp(max(cover, uHighlight * glint * 0.8), 0.0, 1.0);
  }
  vec4 encoded = linearToOutputTexel(vec4(max(color, 0.0), 1.0));
  float lum = dot(encoded.rgb, vec3(0.2126, 0.7152, 0.0722));
  float noise = hash21(gl_FragCoord.xy) - 0.5;
  encoded.rgb += noise * uGrain * 0.45 * pow(1.0 - clamp(lum, 0.0, 1.0), 2.0);
  gl_FragColor = vec4(encoded.rgb * alpha, alpha);
  float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  gl_FragColor.rgb += (dither - 0.5) / 255.0 * alpha;
}
`,T=(e,t,a)=>Math.min(a,Math.max(t,e)),C=e=>{let t=e.trim().toLowerCase();return"transparent"===t||(/^#[0-9a-f]{8}$/.test(t)?t.endsWith("00"):/^#[0-9a-f]{4}$/.test(t)?t.endsWith("0"):null!==t.match(/^(?:rgba?|hsla?)\(.*[,/]\s*(0|0?\.0+|0%)\s*\)$/))},j=(e,t,a)=>{let r=t.trim();try{e.set(/^#[0-9a-f]{8}$/i.test(r)?r.slice(0,7):r)}catch{e.set(a)}return e},L=e=>{let t=Math.cbrt(.4122214708*e.r+.5363325363*e.g+.0514459929*e.b),a=Math.cbrt(.2119034982*e.r+.6806995451*e.g+.1073969566*e.b),r=Math.cbrt(.0883024619*e.r+.2817188376*e.g+.6299787005*e.b),u=1.9779984951*t-2.428592205*a+.4505937099*r,l=.0259040371*t+.7827717662*a-.808675766*r;return[.2104542553*t+.793617785*a-.0040720468*r,Math.hypot(u,l),Math.atan2(l,u)]},R=(e,t,a,r)=>{let[u,l,i]=L(t),[n,o,s]=L(a),v=s-i;v>Math.PI&&(v-=2*Math.PI),v<-Math.PI&&(v+=2*Math.PI);let c=u+(n-u)*r,d=l+(o-l)*r,f=i+v*r,m=d*Math.cos(f),h=d*Math.sin(f),p=(c+.3963377774*m+.2158037573*h)**3,g=(c-.1055613458*m-.0638541728*h)**3,x=(c-.0894841775*m-1.291485548*h)**3;return e.setRGB(Math.max(4.0767416621*p-3.3077115913*g+.2309699292*x,0),Math.max(-1.2684380046*p+2.6097574011*g-.3413193965*x,0),Math.max(-.0041960863*p-.7034186147*g+1.707614701*x,0))},k=e=>{let t=window.matchMedia("(min-resolution: 2dppx)");return t.addEventListener("change",e),window.addEventListener("resize",e),()=>{t.removeEventListener("change",e),window.removeEventListener("resize",e)}},M=()=>window.devicePixelRatio||1,U=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},B=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,A=(e,t)=>new v.nWS(e,t,{type:v.ix0,format:v.GWd,minFilter:v.k6q,magFilter:v.k6q,depthBuffer:!1,stencilBuffer:!1,wrapS:v.ghU,wrapT:v.ghU}),P=(e,t)=>({read:A(e,t),write:A(e,t)}),E=e=>{let t=e.read;e.read=e.write,e.write=t},V=(e,t)=>new v.BKk({vertexShader:f,fragmentShader:e,uniforms:{uTexel:{value:new v.I9Y},...t},depthTest:!1,depthWrite:!1}),I=({settings:e,pointerRef:t,wakeRef:a})=>{let{gl:l,size:i,invalidate:n}=(0,o.C)(),s=(0,u.useRef)(null),c=(0,u.useRef)(null),f=(0,u.useRef)({time:0,lastX:.5,lastY:.5,hasLast:!1,idle:10,lastMoved:0,wander:0,colors:d.map(e=>new v.Q1f(e)),flow:new v.Q1f(d[0]),mix:new v.Q1f}),L=(0,u.useMemo)(()=>({uDye:{value:null},uDyeTexel:{value:new v.I9Y(1/512,1/512)},uResolution:{value:new v.I9Y(1,1)},uTime:{value:0},uBackground:{value:new v.Q1f},uShade:{value:new v.Q1f},uTexture:{value:.6},uTransparent:{value:0},uLightSurface:{value:0},uAngle:{value:0},uFlutes:{value:8},uRefraction:{value:4},uAberration:{value:.61},uSoftness:{value:.5},uWave:{value:.06},uWaveFrequency:{value:1.5},uDrift:{value:0},uHighlight:{value:.12},uHighlightSoftness:{value:.3},uLightAngle:{value:-90},uGrain:{value:.05}}),[]),k=e.colors.join("|"),{backgroundColor:M}=e,U=i.width/Math.max(i.height,1),B=Math.max(16,Math.round(128*U)),I=Math.max(64,Math.round(288*U));return(0,u.useEffect)(()=>{let e,t,a,r,u=(e=new v.Z58,t=new v.qUd(-1,1,1,-1,0,1),a={splat:V(m,{uTarget:{value:null},uFrom:{value:new v.I9Y},uTo:{value:new v.I9Y},uValue:{value:new v.Pq0},uRadius:{value:.05},uAspect:{value:1}}),curl:V(h,{uVelocity:{value:null}}),vorticity:V(p,{uVelocity:{value:null},uCurl:{value:null},uStrength:{value:20},uDelta:{value:0}}),smooth:V(x,{uSource:{value:null},uAmount:{value:.5}}),divergence:V(g,{uVelocity:{value:null}}),fade:V(y,{uSource:{value:null},uKeep:{value:.8}}),pressure:V(b,{uPressure:{value:null},uDivergence:{value:null}}),gradient:V(w,{uPressure:{value:null},uVelocity:{value:null}}),advect:V(S,{uVelocity:{value:null},uSource:{value:null},uGridTexel:{value:new v.I9Y},uDelta:{value:0},uFade:{value:1}})},(r=new v.eaF(new v.bdM(1,1),a.splat)).frustumCulled=!1,e.add(r),{scene:e,camera:t,quad:r,passes:a,velocity:P(B,128),pressure:P(B,128),dye:P(I,288),divergence:A(B,128),curl:A(B,128),gridTexel:new v.I9Y(1/B,1/128),dyeTexel:new v.I9Y(1/I,1/288)});return c.current=u,()=>{c.current=null;for(let e of[u.velocity,u.pressure,u.dye])e.read.dispose(),e.write.dispose();for(let e of(u.divergence.dispose(),u.curl.dispose(),Object.values(u.passes)))e.dispose();u.quad.geometry.dispose()}},[B,128,I,288]),(0,u.useEffect)(()=>(a.current=n,()=>{a.current=null}),[n,a]),(0,u.useEffect)(()=>{let e=s.current;if(!e)return;let t=e.uniforms,a=f.current,r=k?k.split("|"):d;for(let e=0;e<2;e++)j(a.colors[e],r[Math.min(e,r.length-1)]??d[e],d[e]);R(a.flow,a.colors[0],a.colors[1],.5);let u=C(M);j(t.uBackground.value,u?"#000000":M,"#000000");let l=.2126*t.uBackground.value.r+.7152*t.uBackground.value.g+.0722*t.uBackground.value.b>.4;t.uShade.value.copy(t.uBackground.value).lerp(l?new v.Q1f(0,0,0):new v.Q1f(1,1,1),l?.05:.0035),t.uTransparent.value=+!!u,t.uLightSurface.value=l&&!u?1:0,n()},[k,M,n]),(0,u.useEffect)(()=>{n()},[e,i,n]),(0,o.D)((a,r)=>{let u=s.current,n=c.current;if(!u||!n)return;let o=u.uniforms,v=f.current,d=t.current,m=Math.min(Math.max(r,0),.033),h=!e.paused&&!e.reduced&&e.speed>0,p=h?m*e.speed:0,g=e.paused?0:m;v.time+=p;let x=!1,y=1,b=v.lastX,w=v.lastY;if(e.interactive&&d.inside&&d.moved!==v.lastMoved?(v.lastMoved=d.moved,v.idle=0,b=d.x,w=d.y,x=!0,v.hasLast||(v.lastX=b,v.lastY=w,v.hasLast=!0)):v.idle+=m,!x&&e.autoplay&&h&&v.idle>1.6){v.wander+=p;let e=.32*v.wander;b=.5+.34*Math.sin(1.3*e+.4)+.08*Math.sin(3.1*e),w=.5+.3*Math.sin(.9*e+1.7)+.07*Math.cos(2.3*e),y=.75,x=!0,v.hasLast||(v.lastX=b,v.lastY=w,v.hasLast=!0)}let S=l.getRenderTarget(),F=(e,t,a)=>{n.quad.material=e,e.uniforms.uTexel.value.copy(a),l.setRenderTarget(t),l.render(n.scene,n.camera)},{passes:D}=n;if(x&&g>0){let t=b-v.lastX,a=w-v.lastY,r=Math.hypot(t*U,a);if(r>4e-4){let u=t*U/g,l=a/g,i=Math.hypot(u,l),o=T(.5+(u/Math.max(i,1e-5)+l/Math.max(i,1e-5))*.3536,0,1);R(v.mix,v.colors[0],v.colors[1],o),v.flow.lerp(v.mix,1-Math.exp(-g/.14));let s=.012*T(e.radius,.2,12),c=D.splat.uniforms;c.uAspect.value=U,c.uRadius.value=s,c.uFrom.value.set(v.lastX,v.lastY),c.uTo.value.set(b,w);let d=.06+.009*T(e.momentum,0,60);c.uRadius.value=2.2*s,c.uTarget.value=n.velocity.read.texture,c.uValue.value.set(T(t/g,-12,12)*B*d,128*T(a/g,-12,12)*d,0),F(D.splat,n.velocity.write,n.gridTexel),E(n.velocity),c.uRadius.value=s;let f=T(e.intensity,0,3)*y*T(12*r,.035,.3);c.uTarget.value=n.dye.read.texture,c.uValue.value.set(v.flow.r*f,v.flow.g*f,v.flow.b*f),F(D.splat,n.dye.write,n.dyeTexel),E(n.dye)}}if(x&&(v.lastX=b,v.lastY=w),g>0){let t=T(e.swirl,0,60);if(t>0){D.curl.uniforms.uVelocity.value=n.velocity.read.texture,F(D.curl,n.curl,n.gridTexel);let e=D.vorticity.uniforms;e.uVelocity.value=n.velocity.read.texture,e.uCurl.value=n.curl.texture,e.uStrength.value=t,e.uDelta.value=g,F(D.vorticity,n.velocity.write,n.gridTexel),E(n.velocity)}D.smooth.uniforms.uAmount.value=.85;for(let e=0;e<2;e++)D.smooth.uniforms.uSource.value=n.velocity.read.texture,F(D.smooth,n.velocity.write,n.gridTexel),E(n.velocity);if(t>0){D.divergence.uniforms.uVelocity.value=n.velocity.read.texture,F(D.divergence,n.divergence,n.gridTexel),D.fade.uniforms.uSource.value=n.pressure.read.texture,D.fade.uniforms.uKeep.value=.8,F(D.fade,n.pressure.write,n.gridTexel),E(n.pressure),D.pressure.uniforms.uDivergence.value=n.divergence.texture;for(let e=0;e<18;e++)D.pressure.uniforms.uPressure.value=n.pressure.read.texture,F(D.pressure,n.pressure.write,n.gridTexel),E(n.pressure);let e=D.gradient.uniforms;e.uPressure.value=n.pressure.read.texture,e.uVelocity.value=n.velocity.read.texture,F(D.gradient,n.velocity.write,n.gridTexel),E(n.velocity)}let a=T(e.momentum,0,60),r=D.advect.uniforms;r.uGridTexel.value.copy(n.gridTexel),r.uDelta.value=g,r.uVelocity.value=n.velocity.read.texture,r.uSource.value=n.velocity.read.texture,r.uFade.value=3.2/(.4+.09*a),F(D.advect,n.velocity.write,n.gridTexel),E(n.velocity),r.uVelocity.value=n.velocity.read.texture,r.uSource.value=n.dye.read.texture,r.uFade.value=3/T(e.trail,.05,10),F(D.advect,n.dye.write,n.dyeTexel),E(n.dye)}l.setRenderTarget(S),o.uDye.value=n.dye.read.texture,o.uDyeTexel.value.copy(n.dyeTexel),o.uResolution.value.set(i.width*a.viewport.dpr,i.height*a.viewport.dpr),o.uTime.value=v.time,o.uTexture.value=T(e.texture,0,1),o.uAngle.value=T(e.angle,-360,360)*Math.PI/180,o.uFlutes.value=T(e.flutes,1,60),o.uRefraction.value=T(e.refraction,0,12),o.uAberration.value=T(e.aberration,0,3),o.uSoftness.value=T(e.softness,0,1),o.uWave.value=T(e.wave,0,.5),o.uWaveFrequency.value=T(e.waveFrequency,0,12),o.uDrift.value=T(e.drift,-5,5),o.uHighlight.value=T(e.highlight,0,2),o.uHighlightSoftness.value=T(e.highlightSoftness,0,1),o.uLightAngle.value=T(e.lightAngle,-180,180),o.uGrain.value=T(e.grain,0,1)}),(0,r.jsxs)("mesh",{frustumCulled:!1,children:[(0,r.jsx)("planeGeometry",{args:[1,1]}),(0,r.jsx)("shaderMaterial",{ref:s,vertexShader:F,fragmentShader:D,uniforms:L,depthTest:!1,depthWrite:!1,transparent:!0,premultipliedAlpha:!0})]})},q=({colors:e=d,backgroundColor:t="#050505",texture:a=.6,angle:l=28,flutes:i=8,refraction:n=4,aberration:o=.61,softness:v=.5,wave:f=.06,waveFrequency:m=1.5,drift:h=0,highlight:p=.12,highlightSoftness:g=.3,lightAngle:x=-90,radius:y=6.5,momentum:b=13,swirl:w=0,intensity:S=1,trail:F=1,autoplay:D=!0,interactive:T=!0,grain:j=.05,speed:L=1,paused:R=!1,dpr:A=1.5,className:P,style:E,children:V})=>{let q=(0,u.useRef)(null),H=(0,u.useRef)({x:.5,y:.5,inside:!1,moved:0}),N=(0,u.useRef)(null),[W,G]=(0,u.useState)(!0),_=(0,u.useSyncExternalStore)(U,B,()=>!1),Y=Math.min((0,u.useSyncExternalStore)(k,M,()=>1),Math.max(A,.5)),z=C(t);return(0,u.useEffect)(()=>{let e=q.current;if(!e||"undefined"==typeof IntersectionObserver)return;let t=new IntersectionObserver(([e])=>G(e.isIntersecting),{rootMargin:"80px"});return t.observe(e),()=>t.disconnect()},[]),(0,u.useEffect)(()=>{let e=q.current;if(!e)return;let t=t=>{let a=e.getBoundingClientRect(),r=H.current;r.x=(t.clientX-a.left)/Math.max(a.width,1),r.y=1-(t.clientY-a.top)/Math.max(a.height,1),r.inside=!0,r.moved+=1,N.current?.()},a=e=>{("pointerup"!==e.type||"mouse"!==e.pointerType)&&(H.current.inside=!1,N.current?.())};return e.addEventListener("pointermove",t,{passive:!0}),e.addEventListener("pointerdown",t,{passive:!0}),e.addEventListener("pointerleave",a,{passive:!0}),e.addEventListener("pointercancel",a,{passive:!0}),e.addEventListener("pointerup",a,{passive:!0}),()=>{e.removeEventListener("pointermove",t),e.removeEventListener("pointerdown",t),e.removeEventListener("pointerleave",a),e.removeEventListener("pointercancel",a),e.removeEventListener("pointerup",a)}},[]),(0,r.jsxs)("div",{ref:q,className:(0,c.cn)("relative isolate overflow-hidden",P),style:{backgroundColor:z?void 0:t,...E},children:[(0,r.jsx)("div",{className:"absolute inset-0","aria-hidden":"true",children:(0,r.jsx)(s.Hl,{orthographic:!0,dpr:Y,frameloop:W?"always":"never",gl:{antialias:!1,alpha:!0,premultipliedAlpha:!0,powerPreference:"high-performance"},style:{pointerEvents:"none"},children:(0,r.jsx)(I,{settings:{colors:e,backgroundColor:t,texture:a,angle:l,flutes:i,refraction:n,aberration:o,softness:v,wave:f,waveFrequency:m,drift:h,highlight:p,highlightSoftness:g,lightAngle:x,radius:y,momentum:b,swirl:w,intensity:S,trail:F,autoplay:D,interactive:T,grain:j,speed:L,paused:R,reduced:_},pointerRef:H,wakeRef:N})})}),V?(0,r.jsx)("div",{className:"relative z-10 h-full w-full",children:V}):null]})},H={violet:{colors:["#5227FF","#FF9FFC"],background:"#050505",angle:28,flutes:8,radius:6.5},neon:{colors:["#05FFA1","#D100FF"],background:"#000000",angle:250,flutes:8,radius:6},ember:{colors:["#FF3D00","#FFB347"],background:"#000000",angle:28,flutes:8,radius:7},cobalt:{colors:["#0033FF","#00E1FF"],background:"#000000",angle:28,flutes:8,radius:6.5},lime:{colors:["#55FF00","#F2FF00"],background:"#000000",angle:28,flutes:8,radius:6},bronze:{colors:["#5A4A3E","#B8A48A"],background:"#000000",angle:0,flutes:10,radius:7.5},frost:{colors:["#5B4FFF","#D042FF"],background:"#FFFFFF",angle:31,flutes:8,radius:6.5},iris:{colors:["#4642FF","#56C2FC"],background:"#FFFFFF",angle:31,flutes:8,radius:6}},N=[{label:"Violet",value:"violet"},{label:"Neon",value:"neon"},{label:"Ember",value:"ember"},{label:"Cobalt",value:"cobalt"},{label:"Lime",value:"lime"},{label:"Bronze",value:"bronze"},{label:"Frost",value:"frost"},{label:"Iris",value:"iris"}],W=[{name:"colors",type:"[string, string]",default:'["#5227FF", "#FF9FFC"]',description:"Two liquid colours. Strokes up and to the right lean towards the second, strokes down and to the left towards the first."},{name:"backgroundColor",type:"string",default:'"#050505"',description:'Surface behind the glass. Light surfaces switch to soft shadows instead of highlights. Pass "transparent" to show the page.'},{name:"texture",type:"number",default:"0.6",description:"Strength of the slow swirl in the surface behind the glass."},{name:"angle",type:"number",default:"28",description:"Direction of the flutes in degrees. 0 gives vertical bars."},{name:"flutes",type:"number",default:"8",description:"Number of flutes across the width of the frame."},{name:"refraction",type:"number",default:"4",description:"How strongly each flute bends and compresses the light behind it."},{name:"aberration",type:"number",default:"0.61",description:"Splits red, green and blue at the flute seams."},{name:"softness",type:"number",default:"0.5",description:"0 keeps each flute flat in the middle with sharp seams, 1 bends it in a gentle curve."},{name:"wave",type:"number",default:"0.06",description:"How far the flutes sway along their length."},{name:"waveFrequency",type:"number",default:"1.5",description:"How many sways fit along each flute."},{name:"drift",type:"number",default:"0",description:"Slowly slides the flutes sideways. Negative reverses it."},{name:"highlight",type:"number",default:"0.12",description:"Strength of the specular line on each flute."},{name:"highlightSoftness",type:"number",default:"0.3",description:"0 keeps the highlight pin sharp, 1 spreads it into a sheen."},{name:"lightAngle",type:"number",default:"-90",description:"Where the highlight sits across each flute, in degrees."},{name:"radius",type:"number",default:"6.5",description:"Size of the liquid stroke each pointer movement pours in."},{name:"momentum",type:"number",default:"13",description:"How hard the pointer stirs the liquid and how long the flow keeps going after it stops."},{name:"swirl",type:"number",default:"0",description:"Lets the liquid behave like a full fluid that curls into eddies. 0 keeps each movement a single smooth stroke."},{name:"intensity",type:"number",default:"1",description:"How much coloured liquid the pointer pours in."},{name:"trail",type:"number",default:"1",description:"How slowly the liquid fades once the pointer rests."},{name:"autoplay",type:"boolean",default:"true",description:"Stirs the liquid along a slow wandering path whenever the pointer has been away for a moment, so the surface never sits empty on touch screens."},{name:"interactive",type:"boolean",default:"true",description:"Lets the pointer stir coloured liquid behind the glass."},{name:"grain",type:"number",default:"0.05",description:"Film grain, weighted towards the darker areas."},{name:"speed",type:"number",default:"1",description:"Speed of the surface swirl, the flute sway and the autoplay light."},{name:"paused",type:"boolean",default:"false",description:"Freezes the animation."},{name:"dpr",type:"number",default:"1.5",description:"Upper bound for the device pixel ratio."},{name:"className",type:"string",default:"—",description:"Classes for the root element. Give it a height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."},{name:"children",type:"ReactNode",default:"—",description:"Content layered above the glass."}],G=()=>{let[e,t]=(0,n.I)(),a=(0,l.Y)(),[o,s]=(0,u.useState)(null),v=o??("dark"===a?"violet":"frost"),[c,d]=(0,u.useState)({}),f={...H[v]??H.violet,...c},[m,h]=(0,u.useState)(.6),[p,g]=(0,u.useState)(4),[x,y]=(0,u.useState)(.61),[b,w]=(0,u.useState)(.5),[S,F]=(0,u.useState)(.06),[D,T]=(0,u.useState)(1.5),[C,j]=(0,u.useState)(0),[L,R]=(0,u.useState)(.12),[k,M]=(0,u.useState)(.3),[U,B]=(0,u.useState)(-90),[A,P]=(0,u.useState)(13),[E,V]=(0,u.useState)(0),[I,G]=(0,u.useState)(1),[_,Y]=(0,u.useState)(1),[z,X]=(0,u.useState)(.05),[Q,K]=(0,u.useState)(1),[O,$]=(0,u.useState)(!0),[Z,J]=(0,u.useState)(!0),[ee,et]=(0,u.useState)(!1),ea=e=>t=>d(a=>({...a,[e]:t})),er=e=>t=>d(a=>{let r=[...a.colors??f.colors];return r[e]=t,{...a,colors:r}});return(0,r.jsxs)("div",{children:[(0,r.jsx)(i.Bg,{}),(0,r.jsxs)(i.VX,{children:[(0,r.jsxs)(i.Ec,{children:[(0,r.jsx)(i.Ch,{onRefresh:t,minHeight:600,children:(0,r.jsx)("div",{className:"relative h-full w-full",children:(0,r.jsx)(q,{className:"h-full w-full",colors:f.colors,backgroundColor:f.background,texture:m,angle:f.angle,flutes:f.flutes,refraction:p,aberration:x,softness:b,wave:S,waveFrequency:D,drift:C,highlight:L,highlightSoftness:k,lightAngle:U,radius:f.radius,momentum:A,swirl:E,intensity:I,trail:_,autoplay:O,interactive:Z,grain:z,speed:Q,paused:ee},e)})}),(0,r.jsxs)(i.IH,{children:[(0,r.jsx)(i.bg,{title:"Preset",value:v,options:N,onChange:e=>{s(e),d({})}}),(0,r.jsx)(i.W7,{title:"Background",value:f.background,onChange:ea("background")}),(0,r.jsx)(i.W7,{title:"Primary",value:f.colors[0],onChange:er(0)}),(0,r.jsx)(i.W7,{title:"Secondary",value:f.colors[1],onChange:er(1)}),(0,r.jsx)(i.yt,{title:"Angle",min:-180,max:360,step:1,value:f.angle,valueUnit:"\xb0",onChange:ea("angle")}),(0,r.jsx)(i.yt,{title:"Flutes",min:2,max:30,step:1,value:f.flutes,onChange:ea("flutes")}),(0,r.jsx)(i.yt,{title:"Refraction",min:0,max:10,step:.1,value:p,onChange:g}),(0,r.jsx)(i.yt,{title:"Aberration",min:0,max:2,step:.01,value:x,onChange:y}),(0,r.jsx)(i.yt,{title:"Softness",min:0,max:1,step:.01,value:b,onChange:w}),(0,r.jsx)(i.yt,{title:"Wave",min:0,max:.4,step:.01,value:S,onChange:F}),(0,r.jsx)(i.yt,{title:"Wave Frequency",min:0,max:6,step:.1,value:D,onChange:T}),(0,r.jsx)(i.yt,{title:"Drift",min:-2,max:2,step:.05,value:C,onChange:j}),(0,r.jsx)(i.yt,{title:"Highlight",min:0,max:1,step:.01,value:L,onChange:R}),(0,r.jsx)(i.yt,{title:"Highlight Softness",min:0,max:1,step:.01,value:k,onChange:M}),(0,r.jsx)(i.yt,{title:"Light Angle",min:-180,max:180,step:1,value:U,valueUnit:"\xb0",onChange:B}),(0,r.jsx)(i.yt,{title:"Radius",min:1,max:12,step:.1,value:f.radius,onChange:ea("radius")}),(0,r.jsx)(i.yt,{title:"Momentum",min:0,max:40,step:1,value:A,onChange:P}),(0,r.jsx)(i.yt,{title:"Swirl",min:0,max:40,step:1,value:E,onChange:V}),(0,r.jsx)(i.yt,{title:"Intensity",min:.1,max:2,step:.05,value:I,onChange:G}),(0,r.jsx)(i.yt,{title:"Trail",min:.2,max:4,step:.05,value:_,onChange:Y}),(0,r.jsx)(i.yt,{title:"Texture",min:0,max:1,step:.01,value:m,onChange:h}),(0,r.jsx)(i.yt,{title:"Grain",min:0,max:.3,step:.005,value:z,onChange:X}),(0,r.jsx)(i.yt,{title:"Speed",min:0,max:3,step:.05,value:Q,onChange:K}),(0,r.jsx)(i.tl,{title:"Autoplay",checked:O,onChange:$}),(0,r.jsx)(i.tl,{title:"Interactive",checked:Z,onChange:J}),(0,r.jsx)(i.tl,{title:"Paused",checked:ee,onChange:et})]}),(0,r.jsx)(i.Ub,{data:W})]}),(0,r.jsx)(i.lT,{children:(0,r.jsx)(i.Gv,{})})]})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>n});var r=a(12115),u=a(30701);let l=()=>()=>{},i=()=>"light";function n(){let{resolvedTheme:e}=(0,u.D)();return(0,r.useSyncExternalStore)(l,()=>"dark"===e?"dark":"light",i)}},90761:(e,t,a)=>{a.d(t,{I:()=>u});var r=a(12115);function u(){let[e,t]=(0,r.useState)(0),a=(0,r.useCallback)(()=>{t(e=>e+1)},[]);return(0,r.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);