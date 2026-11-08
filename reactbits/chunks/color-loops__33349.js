"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[33349],{33349:(e,t,n)=>{n.r(t),n.d(t,{default:()=>I});var r=n(95155),a=n(12115),i=n(56388),l=n(86049),o=n(90761),u=n(2253),s=n(12246),c=n(90650);let h=["#5227FF","#FF9FFC"],d=(e,t,n)=>Math.min(n,Math.max(t,e)),f=(e,t)=>Number.isFinite(e)?e:t,p=new u.Q1f,m=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),g=e=>e<=.0031308?12.92*e:1.055*Math.pow(e,1/2.4)-.055,v=(e,t,n)=>{let r=Math.pow(e+.3963377774*t+.2158037573*n,3),a=Math.pow(e-.1055613458*t-.0638541728*n,3),i=Math.pow(e-.0894841775*t-1.291485548*n,3);return[d(g(4.0767416621*r-3.3077115913*a+.2309699292*i),0,1),d(g(-1.2684380046*r+2.6097574011*a-.3413193965*i),0,1),d(g(-.0041960863*r-.7034186147*a+1.707614701*i),0,1)]},x=(e,t)=>{let n=Number.parseFloat(e);return Number.isFinite(n)?e.endsWith("%")?n/100*t:n:NaN},y=(e,t)=>{let n=(e??"").trim().toLowerCase();if(!n||"transparent"===n||"none"===n||"auto"===n)return null;let r=/^([a-z]+)\(([^)]*)\)$/.exec(n);if(r){let[e,n]=r[2].split("/"),a=e.split(/[\s,]+/).filter(Boolean),i=r[1].endsWith("a")&&a.length>3?a[3]:void 0,l=n?.trim()??i,o=l?d(x(l,1),0,1):1;if(!Number.isFinite(o))return null;if("rgb"===r[1]||"rgba"===r[1]){let e=a.slice(0,3).map(e=>x(e,255)/255);return e.length<3||e.some(e=>!Number.isFinite(e))?null:[d(e[0],0,1),d(e[1],0,1),d(e[2],0,1),o]}if("color"===r[1]&&"srgb"===a[0]){let e=a.slice(1,4).map(e=>x(e,1));return e.length<3||e.some(e=>!Number.isFinite(e))?null:[d(e[0],0,1),d(e[1],0,1),d(e[2],0,1),o]}if("oklch"===r[1]||"oklab"===r[1]){let e=x(a[0]??"",1),t=x(a[1]??"",.4),n=Number.parseFloat(a[2]??"");if(![e,t,n].every(Number.isFinite))return null;let i=n*Math.PI/180,[l,u,s]="oklch"===r[1]?v(e,t*Math.cos(i),t*Math.sin(i)):v(e,t,n);return[l,u,s,o]}if(!t)return null}let a=/^#([0-9a-f]{4}|[0-9a-f]{8})$/.exec(n);if(a){let e=4===a[1].length?a[1].split("").map(e=>e+e).join(""):a[1],t=t=>Number.parseInt(e.slice(2*t,2*t+2),16)/255;return[t(0),t(1),t(2),t(3)]}return t||n.startsWith("#")?(p.setRGB(-1,-1,-1,u.jf0),p.setStyle(n,u.jf0),p.r<0)?null:[p.r,p.g,p.b,1]:null},b=e=>.2126*e[0]+.7152*e[1]+.0722*e[2],w=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},C=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,F=`
in vec3 position;
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,L=`
precision highp float;

uniform vec2 uRes;
uniform float uPx;
uniform vec2 uCenter;
uniform vec4 uRings[40];
uniform vec4 uPulses[8];
uniform float uReach;
uniform float uSpacing;
uniform float uBody;
uniform float uGlow;
uniform float uLine;
uniform float uInterference;
uniform float uDepth;
uniform float uChirp;
uniform float uExposure;
uniform float uAmbient;
uniform float uSweep;
uniform vec3 uLchA;
uniform vec3 uLchB;
uniform float uInk;
uniform float uHeat;
uniform float uCrest;
uniform float uNear;
uniform float uTail;
uniform float uOpacity;
uniform float uFade;

out vec4 fragColor;

const float TAU = 6.28318530718;
const float PI = 3.14159265359;

vec3 shade(float m, float light) {
  float turn = uLchB.z - uLchA.z;
  turn -= TAU * floor((turn + PI) / TAU);
  float h = uLchA.z + turn * m;
  float chroma = mix(uLchA.y, uLchB.y, m);
  float lightness = mix(uLchA.x, uLchB.x, m);
  float e = 1.0 - exp(-light * 1.25);
  float k = sqrt(e);
  float heat = smoothstep(0.82, 1.0, e) * 0.6 * uHeat;
  float L = k * mix(lightness, 0.97, heat);
  float C = chroma * min(k * 1.6, 1.0) * mix(1.25, 1.0, k) * (1.0 - 0.6 * heat);
  vec3 lab = vec3(L, C * cos(h), C * sin(h));
  vec3 lms = mat3(1.0, 1.0, 1.0, 0.3963377774, -0.1055613458, -0.0894841775, 0.2158037573, -0.0638541728, -1.291485548) * lab;
  lms = lms * lms * lms;
  vec3 c = clamp(mat3(4.0767416621, -1.2684380046, -0.0041960863, -3.3077115913, 2.6097574011, -0.7034186147, 0.2309699292, -0.3413193965, 1.707614701) * lms, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float warp(float r) {
  return uChirp > 0.0001 ? (sqrt(1.0 + 2.0 * uChirp * r) - 1.0) / uChirp : r;
}

void ring(float d, float x, vec4 a, float birth, float body, inout float energy, inout float haze, inout vec2 field, inout float tint) {
  float local = uSpacing * inversesqrt(1.0 + 2.0 * uChirp * a.x);
  float radius = warp(a.x);
  float sd = d - radius;
  if (sd > local + 8.0 * uPx || sd < -2.0 * local * uBody - 8.0 * uPx) return;
  float life = a.x / uReach;
  float born = smoothstep(0.0, birth, a.x);
  float fade = born * born * exp(-uDepth * 4.5 * life) * (1.0 - smoothstep(0.8, 1.0, life));
  float hw = 0.5 * max(uLine, 1.0) * uPx;
  float crest = (1.0 - smoothstep(hw - 0.75 * uPx, hw + 0.75 * uPx, abs(sd))) * min(uLine, 1.0);
  float soft;
  if (sd < 0.0) {
    float t = min(-sd / max(min(local * uBody * body, 0.7 * radius), uPx), 1.0);
    float q = 1.0 - t * t;
    soft = (uNear * exp(-6.5 * t) + uTail * exp(-2.0 * t)) * q * q;
  } else {
    float u = sd / (local * 0.05 + 2.0 * uPx);
    soft = exp(-u * u);
  }
  float gain = a.y * fade;
  float line = gain * crest * uCrest;
  float glow = gain * uGlow * 0.55 * soft;
  float light = line + glow;
  if (light <= 0.0) return;
  float phase = TAU * 4.0 * sd / local;
  field += sqrt(glow) * vec2(cos(phase), sin(phase));
  haze += glow;
  energy += light;
  tint += light * (0.5 + 0.5 * sin(TAU * a.z + uSweep * x));
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) * uPx;
  float d = length(p - uCenter);
  float energy = 0.0;
  float haze = 0.0;
  vec2 field = vec2(0.0);
  float tint = 0.0;
  for (int i = 0; i < 40; i++) {
    vec4 a = uRings[i];
    if (a.y <= 0.0) continue;
    ring(d, p.x, a, uSpacing * 1.6, 1.0, energy, haze, field, tint);
  }
  for (int i = 0; i < 8; i++) {
    vec4 a = uPulses[i];
    if (a.y <= 0.0) continue;
    ring(d, p.x, a, uSpacing * 0.25, 0.55, energy, haze, field, tint);
  }
  float light = max(energy + (dot(field, field) - haze) * uInterference, 0.0);
  float base = uAmbient * 0.45 * (1.0 - 0.6 * smoothstep(0.0, 1.6, d));
  float m = (tint / max(energy, 0.00001) * light + (0.5 + 0.5 * sin(uSweep * p.x)) * base) / max(light + base, 0.00001);
  light = (light + base) * uExposure * uFade;
  vec3 color;
  float alpha;
  if (uInk > 0.5) {
    alpha = 1.0 - exp(-pow(light, 1.6) * 2.0);
    color = shade(m, 3.0);
  } else {
    vec3 lit = shade(m, light);
    alpha = max(lit.r, max(lit.g, lit.b));
    color = lit / max(alpha, 0.00001);
  }
  float dither = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  fragColor = vec4(clamp(color + dither, 0.0, 1.0), clamp(alpha + dither, 0.0, 1.0) * uOpacity);
}
`,S=(0,a.forwardRef)(function({colors:e=h,backgroundColor:t="transparent",centerX:n=.5,centerY:i=.5,speed:l=1,ringCount:o=7,ringWidth:p=.85,glow:g=1,interference:v=.3,depth:x=.6,intensity:S=.5,hoverStrength:j=1,pulseStrength:E=1,opacity:k=1,interactive:M=!0,intro:I=!0,paused:P=!1,dpr:A=2,scale:N=1,symmetric:R=!1,redInfluence:T=1,greenInfluence:B=1,blueInfluence:W=1,baseColor:Y=0,className:z,style:D},H){let q=(0,a.useRef)(null),X=(0,a.useRef)(null),O={colors:e,backgroundColor:t,centerX:n,centerY:i,speed:l,ringCount:o,ringWidth:p,glow:g,interference:v,depth:x,intensity:S,hoverStrength:j,pulseStrength:E,opacity:k,interactive:M,intro:I,paused:P,dpr:A,scale:N,symmetric:R,redInfluence:T,greenInfluence:B,blueInfluence:W,baseColor:Y,reduced:(0,a.useSyncExternalStore)(w,C,()=>!1)},U=(0,a.useRef)(O);(0,a.useEffect)(()=>{U.current=O,X.current?.sync()}),(0,a.useEffect)(()=>{let e=q.current;if(!e)return;let t=function(e,t){let n,r=e.ownerDocument,a=r.defaultView??window;try{n=new s.WebGLRenderer({alpha:!0,antialias:!1,premultipliedAlpha:!1,powerPreference:"high-performance"})}catch{return null}n.setClearColor(0,0);let i=n.domElement;i.setAttribute("aria-hidden","true"),i.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block",e.appendChild(i);let l=Array.from({length:40},()=>new u.IUQ),o=Array.from({length:8},()=>new u.IUQ),c={uRes:{value:new u.I9Y(1,1)},uPx:{value:1},uCenter:{value:new u.I9Y},uRings:{value:l},uPulses:{value:o},uReach:{value:1},uSpacing:{value:.2},uBody:{value:.85},uGlow:{value:1},uLine:{value:1.25},uInterference:{value:.3},uDepth:{value:.6},uChirp:{value:0},uExposure:{value:1},uAmbient:{value:0},uSweep:{value:1.3},uLchA:{value:new u.Pq0},uLchB:{value:new u.Pq0},uInk:{value:0},uHeat:{value:1},uCrest:{value:.8},uNear:{value:.55},uTail:{value:.45},uOpacity:{value:1},uFade:{value:1}},p=new u.D$Q({glslVersion:u.Wdf,vertexShader:F,fragmentShader:L,uniforms:c,blending:u.XIg,transparent:!1,depthTest:!1,depthWrite:!1}),g=new u.LoY;g.setAttribute("position",new u.qtW([-1,-1,0,3,-1,0,-1,3,0],3));let v=new u.eaF(g,p);v.frustumCulled=!1;let x=new u.Z58;x.add(v);let w=new u.qUd(-1,1,1,-1,0,1),C=[],S=[],j=0,E=0,k=1,M=!1,I="",P=!1,A=-10,N=0,R=0,T=0,B=0,W=0,Y=!1,z=0,D=1,H="",q=0,X=0,O=!1,U=!1,G=!1,_=null,V=()=>j/Math.max(E,1),Q=()=>{let e=t.current;return e.symmetric?0:.6*d(f(e.depth,.6),0,1)},$=(e,t)=>e+.5*t*e*e,K=()=>{let e=t.current,n=Q(),r=.5*Math.hypot(V(),1),a=d(f(e.ringCount,7)*d(f(e.scale,1),.2,5),2,14);return Math.max($(r,n)/a,$(2*r,n)/37)},Z=()=>{let e=t.current;return{x:(d(f(e.centerX,.5),-.5,1.5)-.5)*V(),y:d(f(e.centerY,.5),-.5,1.5)-.5}},J=e=>{let n=t.current,r=Z();return $(Math.hypot(.5*V()+Math.abs(r.x),.5+Math.abs(r.y)),Q())+e*(.2+2*d(f(n.ringWidth,.85),.05,1))},ee=()=>{let r=t.current,i=Math.round(e.clientWidth),l=Math.round(e.clientHeight);if(i<2||l<2)return M=!1,!1;let o=Math.min(a.devicePixelRatio||1,d(f(r.dpr,2),.5,3));return(!M||i!==j||l!==E||o!==k)&&(M=!0,j=i,E=l,k=o,n.setPixelRatio(k),n.setSize(j,E,!1),c.uRes.value.set(j*k,E*k),c.uPx.value=1/(E*k),!0)},et=()=>{let e=K();C.length=0,S.length=0,N=.35*e;let t=Math.min(40,Math.ceil((J(e)-N)/e));for(let n=t-1;n>=0;n--)C.push({radius:N+n*e,strength:1,hue:.125*R%1}),R+=1},en=e=>{C.length>=40&&C.shift(),C.push({radius:e,strength:1,hue:.125*R%1}),R+=1},er=e=>{e<=0||(S.length>=8&&S.shift(),S.push({radius:0,strength:e,hue:(.125*R+.5)%1}))},ea=()=>{if(!M)return;let r=t.current;performance.now()-A>1e3&&(A=performance.now(),(()=>{let n=t.current,r=y(n.backgroundColor,!0),i=r&&r[3]>=.5?r:(()=>{let t=e.parentElement;for(;t;){let e=y(a.getComputedStyle(t).backgroundColor,!1);if(e&&e[3]>.05)return e;t=t.parentElement}let n=y(a.getComputedStyle(e).color,!1);return n?b(n)>.55?[.04,.04,.04,1]:[1,1,1,1]:a.matchMedia("(prefers-color-scheme: dark)").matches?[.04,.04,.04,1]:[1,1,1,1]})(),l=Array.isArray(n.colors)?n.colors:h,o=[n.redInfluence,n.greenInfluence,n.blueInfluence].map(e=>d(f(e,1),0,2)),u=[i.join(","),l[0],l[1],o.join(",")].join("|");if(u===I)return;I=u,P=b(i)>.55;let s=(e,t)=>{var n,r,a;let i,l,u,s,c,h,f,p,g=y(e,!0)??y(t,!0)??[1,1,1,1],v=(n=d(g[0]*o[0],0,1),r=d(g[1]*o[1],0,1),a=d(g[2]*o[2],0,1),i=m(n),l=m(r),s=Math.cbrt(.4122214708*i+.5363325363*l+.0514459929*(u=m(a))),f=1.9779984951*s-2.428592205*(c=Math.cbrt(.2119034982*i+.6806995451*l+.1073969566*u))+.4505937099*(h=Math.cbrt(.0883024619*i+.2817188376*l+.6299787005*u)),p=.0259040371*s+.7827717662*c-.808675766*h,[.2104542553*s+.793617785*c-.0040720468*h,Math.hypot(f,p),Math.atan2(p,f)]);return[v[0],v[1]>.03?Math.max(v[1],.14):v[1],v[2]]},p=s(l[0],h[0]),g=s(l[1],h[1]);if(p[1]<.03&&g[1]>=.03&&(p=[p[0],p[1],g[2]]),g[1]<.03&&p[1]>=.03&&(g=[g[0],g[1],p[2]]),P){let e=([e,t,n])=>[d(.72*e,.3,.58),1.15*t,n];p=e(p),g=e(g)}c.uLchA.value.set(p[0],p[1],p[2]),c.uLchB.value.set(g[0],g[1],g[2]),c.uInk.value=+!!P})());let i=K(),u=Z(),s=1+.2*d(f(r.hoverStrength,1),0,3)*T;c.uCenter.value.set(u.x,u.y),c.uReach.value=J(i),c.uSpacing.value=i,c.uBody.value=d(f(r.ringWidth,.85),.05,1),c.uGlow.value=d(f(r.glow,1),0,2),c.uLine.value=(P?1.5:1.25)*k,c.uHeat.value=+!P,c.uCrest.value=P?1.2:.8,c.uNear.value=P?.95:.55,c.uTail.value=P?.04:.45,c.uInterference.value=d(f(r.interference,.3),0,1),c.uDepth.value=d(f(r.depth,.6),0,1)*(P?.55:1),c.uChirp.value=Q(),c.uExposure.value=2*d(f(r.intensity,.5),0,2)*s,c.uAmbient.value=d(f(r.baseColor,0),0,1),c.uOpacity.value=d(f(r.opacity,1),0,1),c.uFade.value=D;for(let e=0;e<40;e++){let t=C[e];t?l[e].set(t.radius,t.strength,t.hue,0):l[e].set(0,0,0,0)}for(let e=0;e<8;e++){let t=S[e];t?o[e].set(t.radius,t.strength,t.hue,0):o[e].set(0,0,0,0)}n.render(x,w)},ei=()=>{if(!t.current.reduced){H="";return}let e=Z(),n=[K().toFixed(5),e.x.toFixed(4),e.y.toFixed(4)].join("|");n!==H&&(H=n,Y=!1,D=1,T=0,B=0,et())},el=()=>{U||G||!O||q||(q=requestAnimationFrame(eo))},eo=e=>{if(q=0,U||G)return;let n=t.current,a=X&&e-X<100?Math.min(Math.max((e-X)/1e3,0),.05):1/60;X=e;let i=!n.reduced&&!n.paused;i&&(e=>{let n=t.current,r=d(f(n.hoverStrength,1),0,3),a=n.interactive?W:0;B+=(16*(a-T)-8*B)*e,T=d(T+B*e,0,1);let i=d(f(n.speed,1),0,4);Y?(z+=e,i*=1+6*Math.exp(-z/1),D=1-Math.pow(1-d(z/1.4,0,1),3),z>8&&(Y=!1)):D=1;let l=.09*(i*=1+.4*r*T)*e;for(let e of C)e.radius+=l;let o=Math.max(3.5*l,.24*e);for(let e of S)e.radius+=o;let u=K();N+=l;let s=0;for(;N>=u&&s<4;)en(N-=u),s+=1;N>=u&&(N%=u);let c=J(u);for(let e=C.length-1;e>=0;e--)C[e].radius>=c&&C.splice(e,1);for(let e=S.length-1;e>=0;e--)S[e].radius>=c&&S.splice(e,1)})(a),ea(),i&&!r.hidden?q=requestAnimationFrame(eo):X=0},eu=()=>{let e=t.current;!e.interactive||e.reduced||e.paused||(er(1.6*d(f(e.pulseStrength,1),0,3)),el())},es=e=>{var t;if(!(!e.isPrimary||(t=e.target)&&"function"==typeof t.closest&&t.closest("a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]"))&&("mouse"!==e.pointerType||0===e.button)){if("touch"===e.pointerType){_={id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()};return}eu()}},ec=e=>{let t=_;_=null,!t||t.id!==e.pointerId||Math.hypot(e.clientX-t.x,e.clientY-t.y)>10||performance.now()-t.time>600||eu()},eh=e=>{"touch"!==e.pointerType&&(W=1,el())},ed=e=>{"touch"!==e.pointerType&&(W=0,el())},ef=()=>{_=null},ep=()=>{X=0,el()},em=e=>{e.preventDefault(),G=!0,cancelAnimationFrame(q),q=0},eg=()=>{G=!1,I="",ea(),el()},ev=new ResizeObserver(()=>{ee()&&(ei(),ea(),el())}),ex=new IntersectionObserver(([e])=>{O=e.isIntersecting,X=0,el()},{rootMargin:"120px"}),ey=()=>{C.length=0,S.length=0,Y=!0,z=0,D=0,N=K()};e.addEventListener("pointerdown",es),e.addEventListener("pointerup",ec),e.addEventListener("pointerenter",eh),e.addEventListener("pointerleave",ed),e.addEventListener("pointercancel",ef),r.addEventListener("visibilitychange",ep),i.addEventListener("webglcontextlost",em),i.addEventListener("webglcontextrestored",eg),ev.observe(e),ex.observe(e),ee();let eb=t.current;return!eb.intro||eb.reduced||eb.paused?et():ey(),ei(),{sync:()=>{A=-10,ee(),ei(),X=0,!q&&O&&(ea(),el())},pulse:e=>{let n=t.current;n.reduced||(er(1.6*d(f(e??n.pulseStrength,1),0,3)),el())},replay:()=>{t.current.reduced||(ey(),X=0,el())},destroy:()=>{U=!0,cancelAnimationFrame(q),ev.disconnect(),ex.disconnect(),e.removeEventListener("pointerdown",es),e.removeEventListener("pointerup",ec),e.removeEventListener("pointerenter",eh),e.removeEventListener("pointerleave",ed),e.removeEventListener("pointercancel",ef),r.removeEventListener("visibilitychange",ep),i.removeEventListener("webglcontextlost",em),i.removeEventListener("webglcontextrestored",eg),x.remove(v),g.dispose(),p.dispose(),n.dispose(),i.remove()}}}(e,U);return X.current=t,()=>{t?.destroy(),X.current=null}},[]),(0,a.useImperativeHandle)(H,()=>({pulse:e=>X.current?.pulse(e),replay:()=>X.current?.replay()}),[]);let G=t.trim().toLowerCase();return(0,r.jsx)("div",{ref:q,className:(0,c.cn)("relative h-full w-full overflow-hidden",z),style:{minHeight:"inherit",backgroundColor:G&&"transparent"!==G&&"auto"!==G?t:void 0,...D}})});S.displayName="ColorLoops";let j={colors:["#5227FF","#FF9FFC"],centerX:.5,centerY:0,speed:.8,ringCount:7,ringWidth:.85,glow:1,interference:.3,depth:.6,intensity:.5},E={classic:j,sunset:{...j,colors:["#5227FF","#FF7A27"],ringCount:6,ringWidth:.9,glow:1.2,depth:.55},sonar:{...j,colors:["#22D3EE","#5227FF"],centerY:.5,speed:1.2,ringCount:10,ringWidth:.35,glow:.6,depth:.45},orchid:{...j,colors:["#B19EEF","#FF9FFC"],centerY:.5,speed:.6,ringCount:5,ringWidth:1,glow:1.4,depth:.5,intensity:.45},lagoon:{...j,colors:["#2DD4BF","#3B82F6"],centerX:.3,centerY:.35,ringCount:8,depth:.7},aurora:{...j,colors:["#34D399","#8B5CF6"],centerY:1,glow:1.1},rose:{...j,colors:["#FF3D7F","#FF9FFC"],centerX:0,centerY:0,ringCount:6,ringWidth:.8,glow:1.1}},k=[{label:"Classic",value:"classic"},{label:"Sunset",value:"sunset"},{label:"Sonar",value:"sonar"},{label:"Orchid",value:"orchid"},{label:"Lagoon",value:"lagoon"},{label:"Aurora",value:"aurora"},{label:"Rose",value:"rose"}],M=[{name:"colors",type:"[string, string]",default:'["#5227FF", "#FF9FFC"]',description:"Two colours the rings cycle between. They blend in OKLCh, so the mix stays vivid."},{name:"backgroundColor",type:"string",default:'"transparent"',description:"Colour behind the rings. Light backgrounds switch to saturated ink rings. Transparent reads the page colour."},{name:"centerX",type:"number",default:"0.5",description:"Horizontal position of the shared ring centre, from 0 (left) to 1 (right)."},{name:"centerY",type:"number",default:"0.5",description:"Vertical position of the shared ring centre, from 0 (bottom) to 1 (top)."},{name:"speed",type:"number",default:"1",description:"How fast the rings travel outward."},{name:"ringCount",type:"number",default:"7",description:"Rings between the centre and the far corner of a centred frame."},{name:"ringWidth",type:"number",default:"0.85",description:"Length of the soft body trailing behind each crest, as a share of the gap."},{name:"glow",type:"number",default:"1",description:"Brightness of the soft body behind each crest line."},{name:"interference",type:"number",default:"0.3",description:"Fine fringes where a click ring overlaps the loops as it passes through."},{name:"depth",type:"number",default:"0.6",description:"How much rings dim, thin and gather as they near the edges."},{name:"intensity",type:"number",default:"0.5",description:"Overall brightness of the rings, from 0 to 1."},{name:"hoverStrength",type:"number",default:"1",description:"How much hovering brightens and quickens the loops. 0 turns it off."},{name:"pulseStrength",type:"number",default:"1",description:"Strength of the bright ring a click sends out from the centre. Clicks stack."},{name:"opacity",type:"number",default:"1",description:"Opacity of the rings."},{name:"interactive",type:"boolean",default:"true",description:"Enables the hover lift and click pulses."},{name:"intro",type:"boolean",default:"true",description:"Rings rush out of the centre on mount, then settle to their speed."},{name:"paused",type:"boolean",default:"false",description:"Freezes the rings. Reduced-motion users get a still frame."},{name:"dpr",type:"number",default:"2",description:"Maximum device pixel ratio for the canvas."},{name:"ref",type:"{ pulse, replay }",default:"-",description:"pulse(strength?) sends a ring from the centre. replay() restarts the intro."},{name:"className",type:"string",default:"-",description:"Classes for the root, which fills its parent."},{name:"style",type:"CSSProperties",default:"-",description:"Inline styles for the root element."}],I=()=>{let e=(0,l.Y)(),[t,n]=(0,o.I)(),[u,s]=(0,a.useState)("classic"),[c,h]=(0,a.useState)(E.classic),d=e=>t=>h(n=>({...n,[e]:t})),[f,p]=(0,a.useState)(null),[m,g]=(0,a.useState)(1),[v,x]=(0,a.useState)(1),[y,b]=(0,a.useState)(1),[w,C]=(0,a.useState)(!0),[F,L]=(0,a.useState)(!0),[j,I]=(0,a.useState)(!1),P=f??("dark"===e?"#0a0a0a":"#ffffff");return(0,r.jsxs)("div",{children:[(0,r.jsx)(i.Bg,{}),(0,r.jsxs)(i.VX,{children:[(0,r.jsxs)(i.Ec,{children:[(0,r.jsx)(i.Ch,{onRefresh:n,minHeight:600,children:(0,r.jsx)("div",{className:"relative h-full w-full",children:(0,r.jsx)(S,{...c,backgroundColor:P,hoverStrength:m,pulseStrength:v,opacity:y,interactive:w,intro:F,paused:j},t)})}),(0,r.jsxs)(i.IH,{children:[(0,r.jsx)(i.bg,{title:"Preset",value:u,options:k,onChange:e=>{s(e),h(E[e]??E.classic)}}),(0,r.jsx)(i.W7,{title:"Color A",value:c.colors[0],onChange:e=>d("colors")([e,c.colors[1]])}),(0,r.jsx)(i.W7,{title:"Color B",value:c.colors[1],onChange:e=>d("colors")([c.colors[0],e])}),(0,r.jsx)(i.W7,{title:"Background",value:P,onChange:p}),(0,r.jsx)(i.yt,{title:"Speed",min:0,max:2.5,step:.01,value:c.speed,onChange:d("speed")}),(0,r.jsx)(i.yt,{title:"Rings",min:2,max:14,step:1,value:c.ringCount,onChange:d("ringCount")}),(0,r.jsx)(i.yt,{title:"Ring Width",min:.05,max:1,step:.01,value:c.ringWidth,onChange:d("ringWidth")}),(0,r.jsx)(i.yt,{title:"Glow",min:0,max:2,step:.01,value:c.glow,onChange:d("glow")}),(0,r.jsx)(i.yt,{title:"Interference",min:0,max:1,step:.01,value:c.interference,onChange:d("interference")}),(0,r.jsx)(i.yt,{title:"Depth",min:0,max:1,step:.01,value:c.depth,onChange:d("depth")}),(0,r.jsx)(i.yt,{title:"Intensity",min:0,max:1,step:.01,value:c.intensity,onChange:d("intensity")}),(0,r.jsx)(i.yt,{title:"Center X",min:0,max:1,step:.01,value:c.centerX,onChange:d("centerX")}),(0,r.jsx)(i.yt,{title:"Center Y",min:0,max:1,step:.01,value:c.centerY,onChange:d("centerY")}),(0,r.jsx)(i.yt,{title:"Hover",min:0,max:2,step:.01,value:m,onChange:g}),(0,r.jsx)(i.yt,{title:"Pulse",min:0,max:3,step:.01,value:v,onChange:x}),(0,r.jsx)(i.yt,{title:"Opacity",min:0,max:1,step:.01,value:y,onChange:b}),(0,r.jsx)(i.tl,{title:"Interactive",checked:w,onChange:C}),(0,r.jsx)(i.tl,{title:"Intro",checked:F,onChange:L}),(0,r.jsx)(i.tl,{title:"Paused",checked:j,onChange:I})]}),(0,r.jsx)(i.Ub,{data:M})]}),(0,r.jsx)(i.lT,{children:(0,r.jsx)(i.Gv,{})})]})]})}},56388:(e,t,n)=>{n.d(t,{Gv:()=>u.CodeExample,lT:()=>r.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>h.CopyButton,IH:()=>i.Customize,gI:()=>p,Dn:()=>g,pi:()=>m,W7:()=>l.PreviewColor,Ch:()=>a.PreviewContainer,UD:()=>l.PreviewInput,bg:()=>l.PreviewSelect,yt:()=>l.PreviewSlider,tl:()=>l.PreviewSwitch,Ec:()=>r.PreviewTab,Ub:()=>o.PropTable,VX:()=>r.TabsLayout,bs:()=>f});var r=n(55019);n(27382);var a=n(10236),i=n(69485),l=n(48543),o=n(87552);n(39260);var u=n(52407),s=n(79901);n(24496);var c=n(95155);n(66729);var h=n(28592),d=n(90650);let f="rounded-lg border bg-background";function p({className:e,children:t,...n}){return(0,c.jsx)("div",{className:(0,d.cn)("rounded-xl border bg-muted/50 p-1",e),...n,children:t})}function m({className:e,children:t,...n}){return(0,c.jsx)("div",{className:(0,d.cn)(f,e),...n,children:t})}function g({title:e,description:t,className:n,children:r}){return(0,c.jsxs)("section",{className:n,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:r})]})}},86049:(e,t,n)=>{n.d(t,{Y:()=>o});var r=n(12115),a=n(30701);let i=()=>()=>{},l=()=>"light";function o(){let{resolvedTheme:e}=(0,a.D)();return(0,r.useSyncExternalStore)(i,()=>"dark"===e?"dark":"light",l)}},90761:(e,t,n)=>{n.d(t,{I:()=>a});var r=n(12115);function a(){let[e,t]=(0,r.useState)(0),n=(0,r.useCallback)(()=>{t(e=>e+1)},[]);return(0,r.useEffect)(()=>{let e=new MutationObserver(()=>{n()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[n]),[e,n]}}}]);