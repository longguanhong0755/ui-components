"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[63719],{16499:(e,t,a)=>{a.d(t,{A:()=>o});let o=(0,a(1604).A)("layers",[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]])},41338:(e,t,a)=>{a.r(t),a.d(t,{default:()=>A});var o=a(95155),i=a(12115),n=a(56388),r=a(60936),l=a(83904),s=a(16499),u=a(61037),c=a(90761),m=a(2253),d=a(12246),f=a(90650);let h=`
  void main() {
    gl_Position = vec4(position, 1.0);
  }
`,p=`
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,v=`
precision highp float;

uniform float uTime;
uniform vec2 uRes;
uniform vec2 uShift;
uniform vec3 uDeep;
uniform vec3 uMain;
uniform vec3 uHot;
uniform float uPositionY;
uniform float uScale;
uniform float uEffectRadius;
uniform float uEffectBoost;
uniform float uEdgeMin;
uniform float uEdgeMax;
uniform float uFalloffPower;
uniform float uNoiseScale;
uniform float uWidthFactor;
uniform float uWaveAmount;
uniform float uBranchIntensity;
uniform float uVerticalExtent;
uniform float uHorizontalExtent;
uniform float uContours;
uniform float uFlash;
uniform float uLift;
uniform float uFade;
uniform float uIntensity;

in vec2 vUv;
out vec4 fragColor;

vec3 random3(vec3 c) {
  float j = 4096.0 * sin(dot(c, vec3(17.0, 59.4, 15.0)));
  vec3 r;
  r.z = fract(512.0 * j);
  j *= 0.125;
  r.x = fract(512.0 * j);
  j *= 0.125;
  r.y = fract(512.0 * j);
  return r - 0.5;
}

const float F3 = 0.3333333;
const float G3 = 0.1666667;

float simplex3d(vec3 p) {
  vec3 s = floor(p + dot(p, vec3(F3)));
  vec3 x = p - s + dot(s, vec3(G3));
  vec3 e = step(vec3(0.0), x - x.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);
  vec3 x1 = x - i1 + G3;
  vec3 x2 = x - i2 + 2.0 * G3;
  vec3 x3 = x - 1.0 + 3.0 * G3;
  vec4 w;
  vec4 d;
  w.x = dot(x, x);
  w.y = dot(x1, x1);
  w.z = dot(x2, x2);
  w.w = dot(x3, x3);
  w = max(0.6 - w, 0.0);
  d.x = dot(random3(s), x);
  d.y = dot(random3(s + i1), x1);
  d.z = dot(random3(s + i2), x2);
  d.w = dot(random3(s + 1.0), x3);
  w *= w;
  w *= w;
  d *= w;
  return dot(d, vec4(52.0));
}

const float PI = 3.14159265359;

void main() {
  float time = 28.22 + 1.25 * uTime;
  float bignessScale = 1.0 / uNoiseScale;

  vec2 uv = ((vUv * uRes + uShift) / uRes) * 2.0 - 1.0;
  float aspect = uRes.x / uRes.y;
  uv.x *= aspect;

  float effectiveScale = max(uScale, 0.5);
  uv = uv / effectiveScale;

  float yOffset = mix(-0.3, 0.8, uPositionY) + uLift / effectiveScale;
  uv.y -= yOffset;
  uv.y *= uVerticalExtent;
  uv.x *= uHorizontalExtent;

  vec2 p = (uv / aspect + 1.0) * 0.5;
  p.x *= aspect;

  vec2 positionFromCenter = uv;
  positionFromCenter /= uEffectRadius;
  positionFromCenter.x /= uWidthFactor;
  float positionFromBottom = 0.5 * (positionFromCenter.y + 1.0);

  vec2 waveOffset = vec2(0.0);
  waveOffset.x += positionFromBottom * sin(4.0 * positionFromCenter.y - 4.0 * time);
  waveOffset.x += 0.1 * positionFromBottom * sin(4.0 * positionFromCenter.x - 1.561 * time);
  waveOffset.x += uBranchIntensity * 0.15 * sin(8.0 * positionFromCenter.y + time * 2.0);
  waveOffset.x += uBranchIntensity * 0.1 * sin(12.0 * positionFromCenter.y - time * 1.5);
  waveOffset.y += uBranchIntensity * 0.08 * sin(6.0 * positionFromCenter.x + time * 1.8);
  positionFromCenter += uWaveAmount * waveOffset;

  positionFromCenter.x += positionFromCenter.x / (1.0 - positionFromCenter.y);

  float effectMask = clamp(1.0 - length(positionFromCenter), 0.0, 1.0);
  effectMask = 1.0 - pow(1.0 - effectMask, uFalloffPower);

  vec3 p3 = bignessScale * 0.25 * vec3(p.x, p.y, 0.0) + vec3(0.0, -time * 0.1, time * 0.025);
  float noise = simplex3d(p3 * 32.0);
  noise += 0.3 * simplex3d(p3 * 64.0 + vec3(time * 0.05, time * 0.03, 0.0));
  noise += 0.15 * simplex3d(p3 * 128.0 - vec3(time * 0.08, 0.0, time * 0.04));
  noise = 0.5 + 0.5 * noise;

  float value = effectMask * noise + uEffectBoost * effectMask;
  float edge = mix(uEdgeMin, uEdgeMax, pow(clamp(0.5 * (positionFromCenter.y + 1.0), 0.0, 1.0), 1.2));
  float edgedValue = clamp(value - edge, 0.0, 1.0);
  float steppedValue = smoothstep(edge, edge + 0.1, value);
  float highlight = 1.0 - edgedValue;

  p3 = bignessScale * 0.1 * vec3(p.x, p.y, 0.0) + vec3(0.0, -time * 0.01, time * 0.025);
  noise = 0.5 + 0.5 * simplex3d(p3 * 32.0);
  float repeatedValue = mix(highlight, noise, 0.65);
  repeatedValue = 0.5 * sin(6.0 * PI * (1.0 - pow(1.0 - repeatedValue, 1.8)) - 0.5 * PI) + 0.5;
  float steppedLines = smoothstep(0.95, 1.0, pow(repeatedValue, 8.0));
  steppedLines = mix(steppedLines, 0.0, 0.8 - noise);
  highlight = max(steppedLines * uContours, highlight);
  highlight = highlight * highlight;

  float wave = sin(time * 3.0);
  float flash = wave * wave * wave * wave * uFlash;
  float heat = clamp(steppedValue * highlight, 0.0, 1.0);
  float height = clamp(vUv.y, 0.0, 1.0);
  vec3 body = mix(uMain, uDeep, smoothstep(0.0, 0.9, height));
  vec3 emission = body * steppedValue * 0.95;
  emission += uHot * heat * (0.9 + 0.4 * flash);
  emission += vec3(1.0, 0.94, 0.98) * heat * heat * heat * (0.15 + 0.35 * flash);
  float cover = steppedValue * mix(0.55, 1.0, heat);

  float fadeStart = mix(1.05, 0.3, uFade);
  float mask = 1.0 - smoothstep(fadeStart, fadeStart + 0.4, vUv.y);
  fragColor = vec4(emission * uIntensity * mask, cover * mask);
}
`,x=`
precision highp float;
uniform sampler2D uSource;
uniform vec2 uDirection;
in vec2 vUv;
out vec4 fragColor;
void main() {
  vec4 sum = texture(uSource, vUv) * 0.2270270270;
  sum += texture(uSource, vUv + uDirection * 1.3846153846) * 0.3162162162;
  sum += texture(uSource, vUv - uDirection * 1.3846153846) * 0.3162162162;
  sum += texture(uSource, vUv + uDirection * 3.2307692308) * 0.0702702703;
  sum += texture(uSource, vUv - uDirection * 3.2307692308) * 0.0702702703;
  fragColor = sum;
}
`,g=`
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;
in vec2 vUv;
out vec4 fragColor;
vec3 tap(vec2 d) { return texture(uSource, vUv + d * uTexel).rgb; }
void main() {
  vec3 a = tap(vec2(-2.0, 2.0));
  vec3 b = tap(vec2(0.0, 2.0));
  vec3 c = tap(vec2(2.0, 2.0));
  vec3 d = tap(vec2(-2.0, 0.0));
  vec3 e = tap(vec2(0.0, 0.0));
  vec3 f = tap(vec2(2.0, 0.0));
  vec3 g = tap(vec2(-2.0, -2.0));
  vec3 h = tap(vec2(0.0, -2.0));
  vec3 i = tap(vec2(2.0, -2.0));
  vec3 j = tap(vec2(-1.0, 1.0));
  vec3 k = tap(vec2(1.0, 1.0));
  vec3 l = tap(vec2(-1.0, -1.0));
  vec3 m = tap(vec2(1.0, -1.0));
  vec3 color = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  if (uThreshold > 0.0) {
    float peak = max(color.r, max(color.g, color.b));
    float knee = 0.5;
    float soft = clamp(peak - uThreshold + knee, 0.0, 2.0 * knee);
    soft = soft * soft / (4.0 * knee + 0.00001);
    color *= max(soft, peak - uThreshold) / max(peak, 0.00001);
  }
  fragColor = vec4(color, 1.0);
}
`,y=`
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
in vec2 vUv;
out vec4 fragColor;
vec3 tap(vec2 d) { return texture(uSource, vUv + d * uTexel).rgb; }
void main() {
  vec3 color = tap(vec2(0.0)) * 4.0
    + (tap(vec2(-1.0, 0.0)) + tap(vec2(1.0, 0.0)) + tap(vec2(0.0, -1.0)) + tap(vec2(0.0, 1.0))) * 2.0
    + tap(vec2(-1.0, -1.0)) + tap(vec2(1.0, -1.0)) + tap(vec2(-1.0, 1.0)) + tap(vec2(1.0, 1.0));
  fragColor = vec4(color / 16.0, 1.0);
}
`,b=`
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uGrain;
uniform float uTime;
uniform float uInk;
in vec2 vUv;
out vec4 fragColor;

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec4 scene = texture(uScene, vUv);
  vec3 light = max(scene.rgb + texture(uBloom, vUv).rgb * uBloomStrength, 0.0);
  float n = hash(gl_FragCoord.xy + fract(uTime * 7.0) * 517.0) - 0.5;
  float dither = (hash(gl_FragCoord.xy * 1.37 + 0.71) - 0.5) / 255.0;
  float peak = max(light.r, max(light.g, light.b));
  if (uInk > 0.5) {
    vec3 hue = light / max(peak, 0.0001);
    float cover = clamp(max(scene.a * 0.9, 1.0 - exp(-peak * 1.3)), 0.0, 1.0);
    vec3 ink = encode(hue * mix(0.55, 0.8, smoothstep(0.4, 1.6, peak)));
    ink += n * uGrain * 0.08 + dither;
    fragColor = vec4(clamp(ink, 0.0, 1.0) * cover, cover);
    return;
  }
  vec3 mapped = 1.0 - exp(-light * 1.35);
  vec3 color = encode(mapped);
  float alpha = max(max(color.r, max(color.g, color.b)), scene.a * 0.8);
  color += (n * uGrain * 0.08 + dither) * smoothstep(0.0, 0.1, alpha);
  color = clamp(color, 0.0, 1.0);
  fragColor = vec4(min(color, vec3(alpha)), alpha);
}
`,w=`
  void main() {
    gl_FragColor = vec4(0.0);
  }
`,C=e=>{if(!window.matchMedia)return()=>{};let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},M=()=>!!window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,S=()=>!1;function E(e){let t=function(e){let t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e.trim());if(t)return[parseInt(t[1],16)/255,parseInt(t[2],16)/255,parseInt(t[3],16)/255];let a=/^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(e.trim());return a?[parseInt(a[1]+a[1],16)/255,parseInt(a[2]+a[2],16)/255,parseInt(a[3]+a[3],16)/255]:null}(e);if(t)return t;let a=new m.Q1f;try{a.setStyle(e,m.er$)}catch{a.setRGB(0,1,1,m.er$)}let o=a.clone().convertLinearToSRGB();return[o.r,o.g,o.b]}let F=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4);function j([e,t,a]){let o=t*Math.cos(a),i=t*Math.sin(a),n=Math.pow(e+.3963377774*o+.2158037573*i,3),r=Math.pow(e-.1055613458*o-.0638541728*i,3),l=Math.pow(e-.0894841775*o-1.291485548*i,3),s=e=>Math.min(Math.max(e,0),1);return[s(4.0767416621*n-3.3077115913*r+.2309699292*l),s(-1.2684380046*n+2.6097574011*r-.3413193965*l),s(-.0041960863*n-.7034186147*r+1.707614701*l)]}function k(e,t,a,o,i){let n=t+(o*o*(a-e)-2*o*t)*i;return[e+n*i,n]}let R=e=>"number"==typeof e?`${e}px`:e,I=(0,i.forwardRef)(({width:e=400,height:t=500,borderRadius:a="12px",speed:n=.5,className:r="",style:l,fragmentShader:s,autoPlay:u=!0,paused:c=!1,color:I="#5227FF",highlightColor:B,backgroundColor:P,positionY:T=0,scale:N=4,effectRadius:A=.9,effectBoost:z=.5,edgeMin:L=0,edgeMax:H=1,falloffPower:U=2,noiseScale:D=1.5,widthFactor:W=1.5,waveAmount:V=.15,branchIntensity:Y=2,verticalExtent:G=1.5,horizontalExtent:q=1.5,contours:$=1,flash:_=.6,blur:O,opacity:X=1,intensity:Z=1,bloom:Q=.8,grain:K=.25,fade:J=.6,interactive:ee=!0,tiltStrength:et=8,parallax:ea=1,hoverRise:eo=1,intro:ei=!0,dpr:en=2,children:er},el)=>{let es=(0,i.useRef)(null),eu=(0,i.useRef)(null),ec=(0,i.useRef)(null),em=(0,i.useRef)(null),ed=(0,i.useSyncExternalStore)(C,M,S),ef=!!s,eh=O??4*!ef,ep={speed:n,playing:u&&!c,fragmentShader:s,color:I,highlightColor:B,positionY:T,scale:N,effectRadius:A,effectBoost:z,edgeMin:L,edgeMax:H,falloffPower:U,noiseScale:D,widthFactor:W,waveAmount:V,branchIntensity:Y,verticalExtent:G,horizontalExtent:q,contours:$,flash:_,blur:eh,intensity:Z,bloom:Q,grain:K,fade:J,interactive:ee,tiltStrength:et,parallax:ea,hoverRise:eo,intro:ei,dpr:en,reducedMotion:ed},ev=(0,i.useRef)(ep);return(0,i.useEffect)(()=>{ev.current=ep,em.current?.sync()}),(0,i.useEffect)(()=>{var e;let t,a,o,i,n,r,l,s,u,c,f,C,M,S,R,I,B,P,T,N,A,z,L,H,U,D,W,V,Y,G,q,$,_,O,X,Z,Q,K,J,ee,et,ea,eo,ei,en,er,el,ed,ef,eh,ep,ex,eg,ey,eb=es.current,ew=eu.current;if(!eb||!ew)return;let eC=(e=()=>ec.current,t=ew.ownerDocument.defaultView??window,(a=new d.WebGLRenderer({antialias:!1,alpha:!0,powerPreference:"high-performance"})).setClearColor(0,0),a.autoClear=!1,(o=a.domElement).style.width="100%",o.style.height="100%",o.style.display="block",ew.appendChild(o),i=a.extensions.has("EXT_color_buffer_float")||a.extensions.has("EXT_color_buffer_half_float")?m.ix0:m.OUM,n=new m.qUd(-1,1,1,-1,-1,1),(r=new m.LoY).setAttribute("position",new m.qtW([-1,-1,0,3,-1,0,-1,3,0],3)),l=new m.Z58,(s=new m.eaF(r)).frustumCulled=!1,l.add(s),u={uTime:{value:0},uRes:{value:new m.I9Y(1,1)},uShift:{value:new m.I9Y(0,0)},uDeep:{value:new m.Pq0(.02,0,.2)},uMain:{value:new m.Pq0(.08,.02,1)},uHot:{value:new m.Pq0(1,.35,.95)},uPositionY:{value:.1},uScale:{value:3},uEffectRadius:{value:.9},uEffectBoost:{value:.5},uEdgeMin:{value:0},uEdgeMax:{value:.5},uFalloffPower:{value:2},uNoiseScale:{value:1.5},uWidthFactor:{value:.5},uWaveAmount:{value:.5},uBranchIntensity:{value:.5},uVerticalExtent:{value:1.5},uHorizontalExtent:{value:1.5},uContours:{value:1},uFlash:{value:1},uLift:{value:0},uFade:{value:0},uIntensity:{value:1}},c={iTime:{value:0},iResolution:{value:new m.Pq0(1,1,1)},uColor:{value:new m.Pq0(1,.62,.99)},uHighlight:{value:new m.Pq0(1,1,1)},uUseHighlight:{value:0},uPositionY:u.uPositionY,uScale:u.uScale,uEffectRadius:u.uEffectRadius,uEffectBoost:u.uEffectBoost,uEdgeMin:u.uEdgeMin,uEdgeMax:u.uEdgeMax,uFalloffPower:u.uFalloffPower,uNoiseScale:u.uNoiseScale,uWidthFactor:u.uWidthFactor,uWaveAmount:u.uWaveAmount,uBranchIntensity:u.uBranchIntensity,uVerticalExtent:u.uVerticalExtent,uHorizontalExtent:u.uHorizontalExtent,uContours:u.uContours,uFlash:u.uFlash,uLift:u.uLift,uShift:{value:new m.I9Y(0,0)}},C=(f=(e,t,a=!1)=>new m.D$Q({glslVersion:m.Wdf,vertexShader:p,fragmentShader:e,uniforms:t,blending:a?m.EZo:m.XIg,transparent:a,depthTest:!1,depthWrite:!1}))(v,u),M=f(x,{uSource:{value:null},uDirection:{value:new m.I9Y}}),S=f(g,{uSource:{value:null},uTexel:{value:new m.I9Y},uThreshold:{value:0}}),R=f(y,{uSource:{value:null},uTexel:{value:new m.I9Y}},!0),B=(I=()=>new m.nWS(1,1,{type:i,format:m.GWd,depthBuffer:!1,stencilBuffer:!1,minFilter:m.k6q,magFilter:m.k6q,generateMipmaps:!1}))(),P=I(),T=Array.from({length:4},I),N=f(b,{uScene:{value:B.texture},uBloom:{value:T[0].texture},uBloomStrength:{value:.15},uGrain:{value:.2},uTime:{value:0},uInk:{value:0}}),A=ev.current.fragmentShader||w,z=new m.BKk({uniforms:c,vertexShader:h,fragmentShader:A,transparent:!0,blending:m.NTi,depthTest:!1,depthWrite:!1}),L=0,H=0,U=0,D=!0,W=!0,V="hidden"!==t.document.visibilityState,Y=0,G=0,q=0,$=ev.current.intro&&!ev.current.reducedMotion?0:1.6,_=0,O=0,X=0,Z=0,Q=0,K=0,J=0,ee=0,et=0,ea="",eo=!1,ei=0,en=()=>{let e=eb,a=null;for(;e&&null===a;)a=function(e){let t=e.trim().toLowerCase();if(!t||"transparent"===t)return null;let a=/^rgba?\(([^)]+)\)$/.exec(t);if(a){let e=a[1].split(/[\s,/]+/).filter(Boolean).map(Number);return e.length>=4&&e[3]<.05?null:(.2126*e[0]+.7152*e[1]+.0722*e[2])/255}let o=/^oklch\(([^)]+)\)$/.exec(t);if(o){let e=o[1].split(/[\s/]+/).filter(Boolean);if(e.length>=4&&.05>parseFloat(e[3]))return null;let t=e[0].endsWith("%")?parseFloat(e[0])/100:parseFloat(e[0]);return Number.isFinite(t)?t:null}return null}(t.getComputedStyle(e).backgroundColor),e=e.parentElement;let o=null!==a&&a>.55;o!==eo&&(eo=o,ea="")},er=o=>{let i,r,m;if(Y=0,!W||!V)return;let d=ev.current,f=G&&o-G<100?Math.min(Math.max((o-G)/1e3,0),.05):1/60;G=o,(()=>{let e=ew.getBoundingClientRect(),o=Math.min(t.devicePixelRatio||1,Math.max(ev.current.dpr,.5)),i=Math.max(1,Math.round(e.width)),n=Math.max(1,Math.round(e.height));if(i===L&&n===H&&o===U)return;L=i,H=n,U=o,a.setPixelRatio(U),a.setSize(L,H,!1),c.iResolution.value.set(L*U,H*U,1);let r=Math.max(1,Math.round(L*U*.5)),l=Math.max(1,Math.round(H*U*.5));B.setSize(r,l),P.setSize(r,l),u.uRes.value.set(r,l);let s=r,m=l;for(let e of T)s=Math.max(1,Math.round(s/2)),m=Math.max(1,Math.round(m/2)),e.setSize(s,m);D=!0})(),(ei-=f)<=0&&(ei=.5,en()),i=ev.current,(r=`${i.color}|${i.highlightColor??""}|${+!!eo}`)!==ea&&(ea=r,(e=>{let t,a=E(e.color);if(c.uColor.value.set(a[0],a[1],a[2]),e.highlightColor){let t=E(e.highlightColor);c.uHighlight.value.set(t[0],t[1],t[2]),c.uUseHighlight.value=1}else c.uUseHighlight.value=0;let o=[F(a[0]),F(a[1]),F(a[2])],[i,n,r]=function([e,t,a]){let o=Math.cbrt(.4122214708*e+.5363325363*t+.0514459929*a),i=Math.cbrt(.2119034982*e+.6806995451*t+.1073969566*a),n=Math.cbrt(.0883024619*e+.2817188376*t+.6299787005*a),r=1.9779984951*o-2.428592205*i+.4505937099*n,l=.0259040371*o+.7827717662*i-.808675766*n;return[.2104542553*o+.793617785*i-.0040720468*n,Math.hypot(r,l),Math.atan2(l,r)]}(o),l=j([.55*i,.9*n,r-.12]);if(e.highlightColor){let a=E(e.highlightColor);t=[F(a[0]),F(a[1]),F(a[2])]}else t=j([Math.min(i+.13,.86),n,r+.28]);u.uDeep.value.set(l[0],l[1],l[2]),u.uMain.value.set(o[0],o[1],o[2]),u.uHot.value.set(t[0],t[1],t[2]),N.uniforms.uInk.value=+!!eo})(i)),u.uPositionY.value=i.positionY,u.uScale.value=i.scale,u.uEffectRadius.value=i.effectRadius,u.uEffectBoost.value=i.effectBoost,u.uEdgeMin.value=i.edgeMin,u.uEdgeMax.value=i.edgeMax,u.uFalloffPower.value=i.falloffPower,u.uNoiseScale.value=i.noiseScale,u.uWidthFactor.value=i.widthFactor,u.uWaveAmount.value=i.waveAmount,u.uBranchIntensity.value=i.branchIntensity,u.uVerticalExtent.value=i.verticalExtent,u.uHorizontalExtent.value=i.horizontalExtent,u.uContours.value=i.contours,u.uFlash.value=i.flash,u.uFade.value=i.fade,N.uniforms.uGrain.value=Math.min(Math.max(i.grain,0),1),(m=i.fragmentShader||w)!==A&&(A=m,z.fragmentShader=m,z.needsUpdate=!0);let h=d.playing&&!d.reducedMotion;h&&(q+=f*d.speed*(1+.6*_*d.hoverRise)),$<1.6&&($+=d.reducedMotion?1.6:f);let p=Math.min($/1.6,1),v=1-(1-Math.pow(1-p,3));[_,O]=k(_,O,X,6,f),[Z,K]=k(Z,K,ee,9,f),[Q,J]=k(Q,J,et,9,f),c.iTime.value=q,u.uTime.value=q,u.uLift.value=-(2.2*v)+_*d.hoverRise*.35,u.uIntensity.value=d.intensity*(1+.18*_*d.hoverRise),(()=>{let t=ev.current,a=t.tiltStrength,o=-Q*a,i=Z*a;eb.style.transform=Math.abs(o)+Math.abs(i)>.001?`perspective(900px) rotateX(${o.toFixed(3)}deg) rotateY(${i.toFixed(3)}deg)`:"";let n=e();if(n){let e=6*t.parallax;n.style.transform=Math.abs(Z)+Math.abs(Q)>5e-4?`translate3d(${(Z*e).toFixed(2)}px, ${(Q*e).toFixed(2)}px, 0)`:""}c.uShift.value.set(Z*t.parallax*10*U,Q*t.parallax*10*U),u.uShift.value.set(Z*t.parallax*10*U*.5,Q*t.parallax*10*U*.5)})(),d.fragmentShader?(s.material=z,a.setRenderTarget(null),a.clear(),a.render(l,n)):(()=>{let e=ev.current;s.material=C,a.setRenderTarget(B),a.render(l,n);let t=Math.max(e.blur,0)*U*.5/2.2;t>.05&&(s.material=M,M.uniforms.uSource.value=B.texture,M.uniforms.uDirection.value.set(t/B.width,0),a.setRenderTarget(P),a.render(l,n),M.uniforms.uSource.value=P.texture,M.uniforms.uDirection.value.set(0,t/B.height),a.setRenderTarget(B),a.render(l,n));let o=Math.min(Math.max(e.bloom,0),3)*(eo?.6:1);if(o>.001){let e=B;for(let t of(s.material=S,T))S.uniforms.uThreshold.value=.75*(e===B),S.uniforms.uSource.value=e.texture,S.uniforms.uTexel.value.set(1/e.width,1/e.height),a.setRenderTarget(t),a.render(l,n),e=t;s.material=R;for(let e=T.length-1;e>0;e--)R.uniforms.uSource.value=T[e].texture,R.uniforms.uTexel.value.set(1/T[e].width,1/T[e].height),a.setRenderTarget(T[e-1]),a.render(l,n)}N.uniforms.uBloomStrength.value=o/T.length,N.uniforms.uTime.value=q,s.material=N,a.setRenderTarget(null),a.clear(),a.render(l,n)})(),D=!1,(h||p<1||!(5e-4>Math.abs(Z-ee)&&5e-4>Math.abs(Q-et)&&Math.abs(K)+Math.abs(J)<5e-4&&5e-4>Math.abs(_-X)&&5e-4>Math.abs(O))||D)&&(Y=requestAnimationFrame(er))},el=()=>{!Y&&W&&V&&(G=0,Y=requestAnimationFrame(er))},ed=e=>{let t=ev.current;if(!t.interactive||t.reducedMotion)return;let a=eb.getBoundingClientRect();if(!(a.width<1)&&!(a.height<1)){if(X=1,"touch"===e.pointerType)return void el();ee=Math.min(Math.max((e.clientX-a.left)/a.width*2-1,-1),1),et=Math.min(Math.max((e.clientY-a.top)/a.height*2-1,-1),1),el()}},ef=()=>{X=0,ee=0,et=0,el()},eb.addEventListener("pointermove",ed),eb.addEventListener("pointerenter",ed),eb.addEventListener("pointerleave",ef),eb.addEventListener("pointercancel",ef),(eh=new ResizeObserver(()=>{D=!0,el()})).observe(ew),(ep=new IntersectionObserver(e=>{(W=e.some(e=>e.isIntersecting))&&el()},{rootMargin:"120px"})).observe(eb),ex=()=>{(V="hidden"!==t.document.visibilityState)&&el()},t.document.addEventListener("visibilitychange",ex),eg=e=>{e.preventDefault(),Y&&cancelAnimationFrame(Y),Y=0},ey=()=>{D=!0,L=0,el()},o.addEventListener("webglcontextlost",eg),o.addEventListener("webglcontextrestored",ey),en(),el(),{replay:()=>{ev.current.reducedMotion||($=0,el())},sync:()=>{ei=0,el()},destroy:()=>{Y&&cancelAnimationFrame(Y),Y=0,eb.removeEventListener("pointermove",ed),eb.removeEventListener("pointerenter",ed),eb.removeEventListener("pointerleave",ef),eb.removeEventListener("pointercancel",ef),eh.disconnect(),ep.disconnect(),t.document.removeEventListener("visibilitychange",ex),o.removeEventListener("webglcontextlost",eg),o.removeEventListener("webglcontextrestored",ey),eb.style.transform="";let i=e();for(let e of(i&&(i.style.transform=""),l.remove(s),r.dispose(),C.dispose(),M.dispose(),S.dispose(),R.dispose(),N.dispose(),z.dispose(),B.dispose(),P.dispose(),T))e.dispose();a.dispose(),o.parentNode===ew&&ew.removeChild(o)}});return em.current=eC,()=>{eC.destroy(),em.current=null}},[]),(0,i.useImperativeHandle)(el,()=>({replay:()=>em.current?.replay()})),(0,o.jsxs)("div",{ref:es,className:(0,f.cn)("relative overflow-hidden shadow-lg border bg-card rounded-xl",r),style:{width:R(e),height:R(t),..."12px"!==a&&{borderRadius:a},...P&&{backgroundColor:P},...l},children:[(0,o.jsx)("div",{ref:eu,className:"absolute inset-0",style:{filter:ef&&eh>0?`blur(${eh}px)`:void 0,opacity:X}}),er&&(0,o.jsx)("div",{ref:ec,className:"relative z-10 w-full h-full flex flex-col",children:er})]})});I.displayName="ShaderCard";let B={color:"#5227FF",highlightColor:null,speed:.5,positionY:0,scale:4,effectRadius:.9,effectBoost:.5,edgeMin:0,edgeMax:1,falloffPower:2,noiseScale:1.5,widthFactor:1.5,waveAmount:.15,branchIntensity:2,verticalExtent:1.5,horizontalExtent:1.5,contours:1,flash:.6,blur:4,opacity:1,intensity:1,bloom:.8,grain:.25,fade:.6},P={violet:B,ember:{...B,color:"#FF4A1C",highlightColor:"#FFC46B"},rose:{...B,color:"#E8368F",highlightColor:"#FFC2E6"},glacier:{...B,color:"#2563EB",highlightColor:"#7DD3FC"},nebula:{...B,color:"#8B5CF6",highlightColor:"#FF9FFC",bloom:1.4,blur:6,intensity:1.1},contour:{...B,highlightColor:"#B19EEF",blur:1.5,bloom:.5,contours:1.6},mint:{...B,color:"#0EA5A4",highlightColor:"#A7F3D0",positionY:.06,branchIntensity:1.4}},T=[{label:"Violet",value:"violet"},{label:"Ember",value:"ember"},{label:"Rose",value:"rose"},{label:"Glacier",value:"glacier"},{label:"Nebula",value:"nebula"},{label:"Contour",value:"contour"},{label:"Mint",value:"mint"}],N=[{name:"width",type:"number | string",default:"400",description:"Width of the card. Numbers are pixels."},{name:"height",type:"number | string",default:"500",description:"Height of the card. Numbers are pixels."},{name:"borderRadius",type:"string",default:'"12px"',description:"Corner radius of the card."},{name:"color",type:"string",default:'"#5227FF"',description:"Colour of the flame."},{name:"highlightColor",type:"string",default:"—",description:"Colour of the luminous edges and contour lines. Defaults to a lighter, warmer tone of the flame colour."},{name:"backgroundColor",type:"string",default:"—",description:"Card fill. Defaults to the theme's card colour."},{name:"speed",type:"number",default:"0.5",description:"Speed of the flame."},{name:"positionY",type:"number",default:"0",description:"Vertical position of the flame. Higher values raise it."},{name:"scale",type:"number",default:"4",description:"Zoom of the flame."},{name:"effectRadius",type:"number",default:"0.9",description:"Size of the flame's core."},{name:"effectBoost",type:"number",default:"0.5",description:"How full the flame burns."},{name:"edgeMin",type:"number",default:"0",description:"Edge threshold at the base of the flame."},{name:"edgeMax",type:"number",default:"1",description:"Edge threshold at the tip of the flame."},{name:"falloffPower",type:"number",default:"2",description:"How quickly the flame fades toward its edges."},{name:"noiseScale",type:"number",default:"1.5",description:"Size of the flickering detail."},{name:"widthFactor",type:"number",default:"1.5",description:"Width of the flame."},{name:"waveAmount",type:"number",default:"0.15",description:"How much the flame sways."},{name:"branchIntensity",type:"number",default:"2",description:"How much the flame splits into tongues."},{name:"verticalExtent",type:"number",default:"1.5",description:"Vertical stretch of the flame."},{name:"horizontalExtent",type:"number",default:"1.5",description:"Horizontal stretch of the flame."},{name:"contours",type:"number",default:"1",description:"Strength of the fine contour lines inside the flame."},{name:"flash",type:"number",default:"0.6",description:"Strength of the periodic bright pulse."},{name:"blur",type:"number",default:"4",description:"Soft focus on the flame, in pixels."},{name:"intensity",type:"number",default:"1",description:"Brightness of the flame."},{name:"bloom",type:"number",default:"0.8",description:"Glow that spills from the brightest edges."},{name:"grain",type:"number",default:"0.25",description:"Fine film grain inside the flame."},{name:"fade",type:"number",default:"0.6",description:"How far below the top the flame fades out, keeping the content readable."},{name:"opacity",type:"number",default:"1",description:"Opacity of the flame."},{name:"interactive",type:"boolean",default:"true",description:"Hover tilts the card toward the pointer and stokes the flame."},{name:"tiltStrength",type:"number",default:"8",description:"Maximum tilt in degrees."},{name:"parallax",type:"number",default:"1",description:"Depth between the flame and the content while tilting."},{name:"hoverRise",type:"number",default:"1",description:"How much the flame rises, brightens and quickens on hover."},{name:"intro",type:"boolean",default:"true",description:"The flame rises into the card when it appears."},{name:"autoPlay",type:"boolean",default:"true",description:"Animate the flame."},{name:"paused",type:"boolean",default:"false",description:"Freeze the flame. Reduced-motion users get a still flame."},{name:"dpr",type:"number",default:"2",description:"Maximum device pixel ratio for the canvas."},{name:"fragmentShader",type:"string",default:"—",description:"Custom GLSL fragment shader that replaces the flame."},{name:"ref",type:"{ replay }",default:"—",description:"replay() plays the rising intro again."},{name:"children",type:"ReactNode",default:"—",description:"Content shown on top of the flame."},{name:"className",type:"string",default:'""',description:"Classes for the card."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the card."}],A=()=>{let[e,t]=(0,c.I)(),[a,m]=(0,i.useState)("violet"),[d,f]=(0,i.useState)(P.violet),h=e=>t=>f(a=>({...a,[e]:t})),[p,v]=(0,i.useState)(320),[x,g]=(0,i.useState)(400),[y,b]=(0,i.useState)(!0),[w,C]=(0,i.useState)(!0),[M,S]=(0,i.useState)(8),[E,F]=(0,i.useState)(1),[j,k]=(0,i.useState)(1),[R,B]=(0,i.useState)(!0);return(0,o.jsxs)("div",{children:[(0,o.jsx)(n.Bg,{}),(0,o.jsxs)(n.VX,{children:[(0,o.jsxs)(n.Ec,{children:[(0,o.jsx)(n.Ch,{onRefresh:t,minHeight:600,children:(0,o.jsx)(I,{width:p,height:x,speed:d.speed,autoPlay:y,color:d.color,highlightColor:d.highlightColor??void 0,positionY:d.positionY,scale:d.scale,effectRadius:d.effectRadius,effectBoost:d.effectBoost,edgeMin:d.edgeMin,edgeMax:d.edgeMax,falloffPower:d.falloffPower,noiseScale:d.noiseScale,widthFactor:d.widthFactor,waveAmount:d.waveAmount,branchIntensity:d.branchIntensity,verticalExtent:d.verticalExtent,horizontalExtent:d.horizontalExtent,contours:d.contours,flash:d.flash,blur:d.blur,opacity:d.opacity,intensity:d.intensity,bloom:d.bloom,grain:d.grain,fade:d.fade,interactive:w,tiltStrength:M,parallax:E,hoverRise:j,intro:R,className:"m-8 rounded-3xl",children:(0,o.jsxs)("div",{className:"p-6 flex flex-col h-full",children:[(0,o.jsx)("h3",{className:"text-2xl font-bold text-primary mb-1",children:"Shader Card"}),(0,o.jsx)("p",{className:"text-primary/60 text-sm",children:"A stunning card component with an animated shader effect"}),(0,o.jsxs)("div",{className:"grid grid-cols-1 gap-3.5 mt-7",children:[(0,o.jsxs)("div",{className:"flex items-center gap-2 text-xs text-primary/80",children:[(0,o.jsx)(r.A,{className:"w-3.5 h-3.5 text-primary"}),(0,o.jsx)("span",{children:"60fps constantly"})]}),(0,o.jsxs)("div",{className:"flex items-center gap-2 text-xs text-primary/80",children:[(0,o.jsx)(l.A,{className:"w-3.5 h-3.5 text-primary"}),(0,o.jsx)("span",{children:"Fully customizable"})]}),(0,o.jsxs)("div",{className:"flex items-center gap-2 text-xs text-primary/80",children:[(0,o.jsx)(s.A,{className:"w-3.5 h-3.5 text-primary"}),(0,o.jsx)("span",{children:"Lightweight & performant"})]}),(0,o.jsxs)("div",{className:"flex items-center gap-2 text-xs text-primary/80",children:[(0,o.jsx)(u.A,{className:"w-3.5 h-3.5 text-primary"}),(0,o.jsx)("span",{children:"Responsive everywhere"})]})]}),(0,o.jsx)("button",{className:"mt-auto w-full py-2.5 px-6 rounded-xl bg-primary text-accent text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer",children:"Explore"})]})},e)}),(0,o.jsxs)(n.IH,{children:[(0,o.jsx)(n.bg,{title:"Preset",value:a,options:T,onChange:e=>{m(e),f(P[e]??P.violet)}}),(0,o.jsx)(n.W7,{title:"Flame Color",value:d.color,onChange:h("color")}),(0,o.jsx)(n.W7,{title:"Highlight Color",value:d.highlightColor??d.color,onChange:e=>h("highlightColor")(e)}),(0,o.jsx)(n.yt,{title:"Width",value:p,onChange:v,min:260,max:460,step:10,valueUnit:"px"}),(0,o.jsx)(n.yt,{title:"Height",value:x,onChange:g,min:320,max:520,step:10,valueUnit:"px"}),(0,o.jsx)(n.yt,{title:"Speed",value:d.speed,onChange:h("speed"),min:.1,max:3,step:.05}),(0,o.jsx)(n.yt,{title:"Position Y",value:d.positionY,onChange:h("positionY"),min:-.3,max:1,step:.01}),(0,o.jsx)(n.yt,{title:"Scale",value:d.scale,onChange:h("scale"),min:.5,max:6,step:.1}),(0,o.jsx)(n.yt,{title:"Branch Intensity",value:d.branchIntensity,onChange:h("branchIntensity"),min:0,max:3,step:.05}),(0,o.jsx)(n.yt,{title:"Vertical Extent",value:d.verticalExtent,onChange:h("verticalExtent"),min:.5,max:2.5,step:.05}),(0,o.jsx)(n.yt,{title:"Horizontal Extent",value:d.horizontalExtent,onChange:h("horizontalExtent"),min:.5,max:2.5,step:.05}),(0,o.jsx)(n.yt,{title:"Effect Radius",value:d.effectRadius,onChange:h("effectRadius"),min:.1,max:1.5,step:.01}),(0,o.jsx)(n.yt,{title:"Effect Boost",value:d.effectBoost,onChange:h("effectBoost"),min:0,max:1,step:.01}),(0,o.jsx)(n.yt,{title:"Noise Scale",value:d.noiseScale,onChange:h("noiseScale"),min:.5,max:5,step:.05}),(0,o.jsx)(n.yt,{title:"Width Factor",value:d.widthFactor,onChange:h("widthFactor"),min:.3,max:2,step:.01}),(0,o.jsx)(n.yt,{title:"Wave Amount",value:d.waveAmount,onChange:h("waveAmount"),min:0,max:1,step:.01}),(0,o.jsx)(n.yt,{title:"Edge Min",value:d.edgeMin,onChange:h("edgeMin"),min:0,max:.3,step:.005}),(0,o.jsx)(n.yt,{title:"Edge Max",value:d.edgeMax,onChange:h("edgeMax"),min:.3,max:1.2,step:.01}),(0,o.jsx)(n.yt,{title:"Falloff Power",value:d.falloffPower,onChange:h("falloffPower"),min:1,max:10,step:.1}),(0,o.jsx)(n.yt,{title:"Contours",value:d.contours,onChange:h("contours"),min:0,max:2,step:.01}),(0,o.jsx)(n.yt,{title:"Flash",value:d.flash,onChange:h("flash"),min:0,max:2,step:.01}),(0,o.jsx)(n.yt,{title:"Blur",value:d.blur,onChange:h("blur"),min:0,max:20,step:.5,valueUnit:"px"}),(0,o.jsx)(n.yt,{title:"Intensity",value:d.intensity,onChange:h("intensity"),min:.2,max:2,step:.01}),(0,o.jsx)(n.yt,{title:"Bloom",value:d.bloom,onChange:h("bloom"),min:0,max:3,step:.01}),(0,o.jsx)(n.yt,{title:"Grain",value:d.grain,onChange:h("grain"),min:0,max:1,step:.01}),(0,o.jsx)(n.yt,{title:"Fade",value:d.fade,onChange:h("fade"),min:0,max:1,step:.01}),(0,o.jsx)(n.yt,{title:"Opacity",value:d.opacity,onChange:h("opacity"),min:0,max:1,step:.01}),(0,o.jsx)(n.yt,{title:"Tilt",value:M,onChange:S,min:0,max:20,step:.5,valueUnit:"\xb0"}),(0,o.jsx)(n.yt,{title:"Parallax",value:E,onChange:F,min:0,max:3,step:.05}),(0,o.jsx)(n.yt,{title:"Hover Rise",value:j,onChange:k,min:0,max:2,step:.05}),(0,o.jsx)(n.tl,{title:"Interactive",checked:w,onChange:C}),(0,o.jsx)(n.tl,{title:"Intro",checked:R,onChange:B}),(0,o.jsx)(n.tl,{title:"Auto Play",checked:y,onChange:b})]}),(0,o.jsx)(n.Ub,{data:N})]}),(0,o.jsx)(n.lT,{children:(0,o.jsx)(n.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>o.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>m.CopyButton,IH:()=>n.Customize,gI:()=>h,Dn:()=>v,pi:()=>p,W7:()=>r.PreviewColor,Ch:()=>i.PreviewContainer,UD:()=>r.PreviewInput,bg:()=>r.PreviewSelect,yt:()=>r.PreviewSlider,tl:()=>r.PreviewSwitch,Ec:()=>o.PreviewTab,Ub:()=>l.PropTable,VX:()=>o.TabsLayout,bs:()=>f});var o=a(55019);a(27382);var i=a(10236),n=a(69485),r=a(48543),l=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var c=a(95155);a(66729);var m=a(28592),d=a(90650);let f="rounded-lg border bg-background";function h({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,d.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,d.cn)(f,e),...a,children:t})}function v({title:e,description:t,className:a,children:o}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:o})]})}},60936:(e,t,a)=>{a.d(t,{A:()=>o});let o=(0,a(1604).A)("zap",[["path",{d:"M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",key:"1xq2db"}]])},83904:(e,t,a)=>{a.d(t,{A:()=>o});let o=(0,a(1604).A)("palette",[["path",{d:"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z",key:"e79jfc"}],["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor",key:"1okk4w"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor",key:"f64h9f"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor",key:"qy21gx"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor",key:"fotxhn"}]])},90761:(e,t,a)=>{a.d(t,{I:()=>i});var o=a(12115);function i(){let[e,t]=(0,o.useState)(0),a=(0,o.useCallback)(()=>{t(e=>e+1)},[]);return(0,o.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);