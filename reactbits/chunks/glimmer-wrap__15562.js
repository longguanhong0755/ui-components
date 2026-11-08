"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[15562],{15562:(e,t,a)=>{a.r(t),a.d(t,{default:()=>M});var n=a(95155),i=a(12115),r=a(56388),l=a(86049),o=a(90761),s=a(2253),u=a(12246),c=a(90650);let d=2*Math.PI,p=(e,t,a)=>Math.min(a,Math.max(t,e)),f=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},h=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,m=new s.Q1f,v=e=>{let t=e.trim().toLowerCase();if(!t||"transparent"===t||"none"===t)return null;try{m.setStyle(t,s.jf0)}catch{return null}return[m.r,m.g,m.b]},g=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),w=e=>e<=.0031308?12.92*e:1.055*Math.pow(e,1/2.4)-.055,x=([e,t,a])=>{let n=g(e),i=g(t),r=g(a),l=Math.cbrt(.4122214708*n+.5363325363*i+.0514459929*r),o=Math.cbrt(.2119034982*n+.6806995451*i+.1073969566*r),s=Math.cbrt(.0883024619*n+.2817188376*i+.6299787005*r);return[.2104542553*l+.793617785*o-.0040720468*s,1.9779984951*l-2.428592205*o+.4505937099*s,.0259040371*l+.7827717662*o-.808675766*s]},y=([e,t,a])=>{let n=Math.pow(e+.3963377774*t+.2158037573*a,3),i=Math.pow(e-.1055613458*t-.0638541728*a,3),r=Math.pow(e-.0894841775*t-1.291485548*a,3);return[p(w(4.0767416621*n-3.3077115913*i+.2309699292*r),0,1),p(w(-1.2684380046*n+2.6097574011*i-.3413193965*r),0,1),p(w(-.0041960863*n-.7034186147*i+1.707614701*r),0,1)]},b=`
attribute vec4 aSeed;
attribute vec4 aLook;
uniform vec2 uView;
uniform vec2 uCenter;
uniform float uFocal;
uniform float uTravel;
uniform float uExposure;
uniform float uTime;
uniform float uSpread;
uniform float uHollow;
uniform float uNear;
uniform float uTwist;
uniform float uTurbulence;
uniform vec2 uLook;
uniform float uSize;
uniform float uSizeVariance;
uniform float uBrightness;
uniform float uFocus;
uniform float uAperture;
uniform float uGlitter;
uniform float uGlintSize;
uniform float uTwinkle;
uniform float uFade;
uniform float uDpr;
uniform vec4 uWaves[4];
varying vec2 vLocal;
varying float vHalfLength;
varying float vSigma;
varying float vIntensity;
varying float vGlint;
varying float vSpike;
varying vec2 vSpikeAxis;
varying float vTone;

float hash(float n) {
  return fract(sin(n * 12.9898 + 78.233) * 43758.5453);
}

vec3 place(float cycle, float depth) {
  float radius = mix(uHollow, 1.0, sqrt(hash(aSeed.y * 91.7 + cycle * 1.371)));
  float angle = hash(aSeed.z * 47.3 + cycle * 2.113) * 6.2831853;
  angle += uTwist * (1.0 - depth) * 2.6;
  vec2 offset = vec2(cos(angle), sin(angle)) * radius * uSpread;
  float wobble = uTurbulence * 0.09;
  offset += wobble * vec2(
    sin(depth * 11.0 + aSeed.x * 31.0 + uTime * 0.7),
    cos(depth * 9.0 + aSeed.w * 27.0 - uTime * 0.6)
  );
  float z = mix(uNear, 1.0, depth);
  return vec3(offset, z);
}

vec3 project(vec3 p) {
  float cy = cos(uLook.x);
  float sy = sin(uLook.x);
  float cp = cos(uLook.y);
  float sp = sin(uLook.y);
  vec3 q = vec3(p.x * cy - p.z * sy, p.y, p.x * sy + p.z * cy);
  q = vec3(q.x, q.y * cp - q.z * sp, q.y * sp + q.z * cp);
  float z = max(q.z, 0.02);
  return vec3(uCenter + uFocal * q.xy / z, z);
}

void main() {
  float cycle = aSeed.x + uTravel;
  float k = floor(cycle);
  float depth = 1.0 - fract(cycle);
  vec3 star = place(k, depth);
  float previousDepth = clamp(depth + uExposure, 0.0, 1.0);
  vec3 before = place(k, previousDepth);
  vec3 now = project(star);
  vec3 then = project(before);

  float sizeFactor = mix(1.0, 0.35 + 1.3 * aSeed.w, uSizeVariance);
  float sizePx = uSize * sizeFactor * pow(1.0 / star.z, 0.5);
  float focusZ = mix(uNear, 1.0, uFocus);
  float coc = uAperture * 1.1 * abs(1.0 / star.z - 1.0 / focusZ);
  float core = max(sizePx * 0.5, 0.5 / uDpr);
  float sigma = sqrt(core * core + coc * coc);
  float energy = max((core * core) / (sigma * sigma), 0.035);

  vec2 segment = now.xy - then.xy;
  float streak = length(segment);
  vec2 axis = streak > 1e-3 ? segment / streak : vec2(1.0, 0.0);
  energy *= (sigma * 2.5) / (sigma * 2.5 + streak);

  float far = 1.0 - smoothstep(0.76, 1.0, depth);
  float near = smoothstep(0.0, 0.09, depth);
  float twinkle = 1.0 - uTwinkle * 0.55 * (0.5 + 0.5 * sin(uTime * (1.1 + 2.3 * aLook.y) + aLook.y * 40.0));

  float glint = 0.0;
  if (uGlitter > 0.0) {
    float rate = (0.03 + 0.16 * aLook.w) * uGlitter;
    float phase = fract(uTime * rate + aLook.z);
    float width = 0.22 * rate;
    glint = phase < width ? pow(sin(3.14159265 * phase / width), 2.0) : 0.0;
  }
  for (int i = 0; i < 4; i++) {
    vec4 w = uWaves[i];
    if (w.w <= 0.001) continue;
    float d = abs(distance(now.xy, w.xy) - w.z);
    float band = 34.0 + w.z * 0.08;
    float catchLight = step(0.68, hash(aSeed.z * 13.1 + float(i) * 7.7));
    glint = max(glint, 0.5 * w.w * catchLight * exp(-d * d / (band * band)));
  }

  float intensity = uBrightness * energy * far * near * twinkle * uFade * (1.0 + 5.0 * glint);
  float spike = uGlintSize * glint * (10.0 + 14.0 * aSeed.w) * clamp(1.4 - coc / 6.0, 0.25, 1.0);
  float reach = max(sigma * 3.0, spike) + 1.0 + glint * (sigma * 6.0 + 4.0);
  float halfLength = streak * 0.5;
  vec2 middle = (now.xy + then.xy) * 0.5;
  vec2 normal = vec2(-axis.y, axis.x);
  vec2 local = vec2(position.x * (halfLength + reach), position.y * reach);
  vec2 screen = middle + axis * local.x + normal * local.y;

  vec2 clip = vec2(screen.x / uView.x * 2.0 - 1.0, 1.0 - screen.y / uView.y * 2.0);
  bool hidden = intensity < 0.002 || now.z <= 0.021;
  gl_Position = hidden ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(clip, 0.0, 1.0);

  float spikeAngle = aSeed.w * 6.2831853 + 0.4;
  float relative = spikeAngle - atan(axis.y, axis.x);
  vLocal = local;
  vHalfLength = halfLength;
  vSigma = sigma;
  vIntensity = intensity;
  vGlint = glint;
  vSpike = spike;
  vSpikeAxis = vec2(cos(relative), sin(relative));
  vTone = aLook.x;
}
`,k=`
precision highp float;
uniform vec3 uLut[8];
uniform vec3 uGlintColor;
uniform float uInk;
varying vec2 vLocal;
varying float vHalfLength;
varying float vSigma;
varying float vIntensity;
varying float vGlint;
varying float vSpike;
varying vec2 vSpikeAxis;
varying float vTone;

vec3 tone(float t) {
  float x = clamp(t, 0.0, 1.0) * 7.0;
  int i = int(floor(x));
  int j = min(i + 1, 7);
  return mix(uLut[i], uLut[j], x - float(i));
}

void main() {
  float along = max(abs(vLocal.x) - vHalfLength, 0.0);
  float d2 = along * along + vLocal.y * vLocal.y;
  float core = exp(-d2 / (2.0 * vSigma * vSigma));
  float halo = exp(-sqrt(d2) / (vSigma * 3.0 + 1.5)) * 0.16 * vGlint;
  float spikes = 0.0;
  if (vSpike > 0.5) {
    vec2 q = vec2(dot(vLocal, vSpikeAxis), dot(vLocal, vec2(-vSpikeAxis.y, vSpikeAxis.x)));
    float width = 0.6;
    float decay = vSpike * 0.3;
    spikes = exp(-abs(q.x) / decay) * exp(-q.y * q.y / (2.0 * width * width))
      + exp(-abs(q.y) / decay) * exp(-q.x * q.x / (2.0 * width * width));
    spikes *= vGlint * 0.7;
  }
  float light = (core + halo + spikes) * vIntensity;
  vec3 color = mix(tone(vTone), uGlintColor, clamp(vGlint * 0.7, 0.0, 1.0));
  if (uInk > 0.5) {
    float alpha = clamp(light, 0.0, 1.0);
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(color * alpha, alpha);
  } else {
    if (light < 0.0015) discard;
    gl_FragColor = vec4(color * light, 1.0);
  }
}
`,S=(0,i.forwardRef)(function({colors:e=["#FFFFFF","#B19EEF"],backgroundColor:t="transparent",count:a=1500,size:r=1.6,sizeVariance:l=.6,brightness:o=1,spread:m=1,hollow:g=.06,perspective:w=.7,centerX:S=.5,centerY:C=.5,speed:F=.5,direction:z="outward",twist:L=0,turbulence:j=0,trail:M=.08,glitter:T=.5,glintSize:E=1,twinkle:A=.5,focus:I=.62,aperture:G=.45,boost:V=7,parallax:q=.5,waves:P=!0,intro:H=!0,paused:N=!1,dpr:B=2,children:D,className:W,style:R},Y){let O=(0,i.useRef)(null),U=(0,i.useRef)(null),X=(0,i.useRef)(null),_={colors:e,backgroundColor:t,count:a,size:r,sizeVariance:l,brightness:o,spread:m,hollow:g,perspective:w,centerX:S,centerY:C,speed:F,direction:z,twist:L,turbulence:j,trail:M,glitter:T,glintSize:E,twinkle:A,focus:I,aperture:G,boost:V,parallax:q,waves:P,intro:H,paused:N,dpr:B,reduced:(0,i.useSyncExternalStore)(f,h,()=>!1)},Z=(0,i.useRef)(_);(0,i.useEffect)(()=>{Z.current=_,X.current?.sync()}),(0,i.useEffect)(()=>{let e=O.current,t=U.current;if(!e||!t)return;let a=((e,t,a)=>{let n,i=e.ownerDocument,r=i.defaultView??window,l=i.createElement("canvas");l.setAttribute("aria-hidden","true"),l.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block";try{n=new u.WebGLRenderer({canvas:l,alpha:!1,antialias:!1,powerPreference:"high-performance"})}catch{return null}t.appendChild(l);let o=new s.Z58,c=new s.qUd(-1,1,1,-1,-1,1),f=new s.bdM(2,2),h=new s.CmU;h.index=f.index,h.setAttribute("position",f.getAttribute("position")),h.instanceCount=0;let m=Array.from({length:8},()=>new s.Pq0(1,1,1)),g=Array.from({length:4},()=>new s.IUQ(0,0,0,0)),w=new s.BKk({uniforms:{uView:{value:new s.I9Y(1,1)},uCenter:{value:new s.I9Y(0,0)},uFocal:{value:300},uTravel:{value:0},uExposure:{value:0},uTime:{value:0},uSpread:{value:1},uHollow:{value:.2},uNear:{value:.05},uTwist:{value:0},uTurbulence:{value:0},uLook:{value:new s.I9Y(0,0)},uSize:{value:1.6},uSizeVariance:{value:.6},uBrightness:{value:1},uFocus:{value:.6},uAperture:{value:.4},uGlitter:{value:.4},uGlintSize:{value:1},uTwinkle:{value:.5},uFade:{value:0},uDpr:{value:1},uWaves:{value:g},uLut:{value:m},uGlintColor:{value:new s.Pq0(1,1,1)},uInk:{value:0}},vertexShader:b,fragmentShader:k,transparent:!0,side:s.$EB,depthTest:!1,depthWrite:!1,blending:s.EZo}),S=new s.eaF(h,w);S.frustumCulled=!1,o.add(S);let C=0,F=0,z=1,L=!1,j=-1,M=[.04,.04,.04],T="",E=!1,A=-10,I=0,G=0,V=1,q=0,P=0,H=!1,N=null,B={yaw:0,pitch:0,yawV:0,pitchV:0,tx:0,ty:0},D=[],W=-1,R=!1,Y=0,O=0,U=!1,X=!1,_=!1,Z=!1,K=()=>{let t=a.current,i=Math.round(e.clientWidth),l=Math.round(e.clientHeight);if(i<2||l<2)return L=!1,!1;let o=Math.min(r.devicePixelRatio||1,Math.max(t.dpr,.5));return(!L||i!==C||l!==F||o!==z)&&(L=!0,C=i,F=l,z=o,n.setPixelRatio(z),n.setSize(C,F,!1),Z=!1,!0)},Q=()=>{M=v(a.current.backgroundColor)??(()=>{let t=e.parentElement;for(;t;){let e=r.getComputedStyle(t).backgroundColor.match(/rgba?\(([^)]+)\)/);if(e){let t=e[1].split(",").map(e=>Number.parseFloat(e));if(t.length<4||t[3]>.05)return[t[0]/255,t[1]/255,t[2]/255]}t=t.parentElement}let a=r.getComputedStyle(e).color.match(/rgba?\(([^)]+)\)/);if(a){let e=a[1].split(",").map(e=>Number.parseFloat(e));return e[0]+e[1]+e[2]>382?[.04,.04,.04]:[1,1,1]}return[.04,.04,.04]})()},$=()=>{let e=a.current,t=[M.join(","),e.colors[0],e.colors[1]].join("|");if(t===T)return;T=t,E=.2126*M[0]+.7152*M[1]+.0722*M[2]>.55,n.setClearColor(new s.Q1f().setRGB(M[0],M[1],M[2],s.er$),1);let i=x(v(e.colors[0])??[1,1,1]),r=x(v(e.colors[1])??[.69,.62,.94]),l=e=>Math.hypot(e[1],e[2]),o=(e,t)=>{if(!E)return e;let a=e;.03>l(e)&&l(t)>=.03&&(a=t);let n=l(a);if(n<.03)return[.34,0,0];let i=Math.max(1,.15/n);return[p(a[0],.4,.55),a[1]*i,a[2]*i]},u=o(i,r),c=o(r,i);for(let e=0;e<8;e++){let t=e/7,a=y([u[0]+(c[0]-u[0])*t,u[1]+(c[1]-u[1])*t,u[2]+(c[2]-u[2])*t]);m[e].set(a[0],a[1],a[2])}let d=E?y([Math.min((u[0]+c[0])/2,.42),(u[1]+c[1])/2,(u[2]+c[2])/2]):[1,1,1];w.uniforms.uGlintColor.value.set(d[0],d[1],d[2]),w.uniforms.uInk.value=+!!E,w.blending=E?s.bCz:s.EZo,E&&(w.blendEquation=s.gO9,w.blendSrc=s.qad,w.blendDst=s.OuU),w.needsUpdate=!0,Z=!1},J=()=>{let e,t=p(Math.round(a.current.count),0,9e3);if(t===j)return;j=t;let n=(e=Math.floor(Math.abs(9173))%0x7ffffffe+1,()=>((e=16807*e%0x7fffffff)-1)/0x7ffffffe),i=new Float32Array(4*Math.max(t,1)),r=new Float32Array(4*Math.max(t,1));for(let e=0;e<t;e++)i[4*e]=n(),i[4*e+1]=100*n(),i[4*e+2]=100*n(),i[4*e+3]=n(),r[4*e]=Math.pow(n(),1.6),r[4*e+1]=n(),r[4*e+2]=n(),r[4*e+3]=n();h.setAttribute("aSeed",new s.uWO(i,4)),h.setAttribute("aLook",new s.uWO(r,4)),h.instanceCount=t,Z=!1},ee=()=>{X||_||!U||Y||(Y=requestAnimationFrame(ea))},et=(e,t)=>{if(a.current.reduced||!L)return;let n=void 0===e?C/2:p(e,0,1)*C,i=void 0===t?F/2:p(t,0,1)*F;D.length>=4&&D.shift(),D.push({x:n,y:i,born:performance.now()/1e3}),ee()};function ea(e){if(Y=0,X||_||!L&&(K(),!L))return;let t=a.current,i=O&&e-O<100?Math.min(Math.max((e-O)/1e3,0),.05):1/60;O=e;let r=performance.now()/1e3,l=t.reduced;K(),r-A>1.2&&(A=r,Q()),$(),J(),W<0&&(W=r,R=l||!t.intro);let s=1,u=1;if(!R){let e=r-W;s=1-Math.pow(1-p(e/1.1,0,1),3),u=1+7*Math.exp(-e/.45),e>2.6&&(R=!0)}let f=!t.paused&&!l,h=f&&(H||r<P),m=h?Math.max(t.boost,1):1,v=d/(h?.9:1.3),x=Math.max(1,Math.ceil(240*i)),y=i/x;for(let e=0;e<x;e++)q+=(v*v*(m-V)-2*v*q)*y,V+=q*y;let b="inward"===t.direction?-1:1,k=.1*p(t.speed,0,5),S=f?k*V*u:0;((I+=S*i*b)>1e4||I<-1e4)&&(I-=Math.round(I)),f&&(G+=i);let j=l?0:p(t.parallax,0,1),M=d/1.1;for(let e=0;e<x;e++)B.yawV+=(M*M*(B.tx*j*.16-B.yaw)-2*M*B.yawV)*y,B.pitchV+=(M*M*(B.ty*j*.11-B.pitch)-2*M*B.pitchV)*y,B.yaw+=B.yawV*y,B.pitch+=B.pitchV*y;let T=Math.hypot(C,F),N=0;for(let e=D.length-1;e>=0;e--)r-D[e].born>2.4&&D.splice(e,1);for(let e=0;e<4;e++){let t=D[e];if(!t){g[e].set(0,0,0,0);continue}let a=r-t.born,n=a*T*.42,i=Math.exp(-a/.9)*Math.min(a/.06,1);g[e].set(t.x,t.y,n,i),N++}let U=Math.min(C,F),et=w.uniforms;et.uView.value.set(C,F),et.uCenter.value.set(p(t.centerX,-1,2)*C,p(t.centerY,-1,2)*F),et.uFocal.value=.42*U,et.uTravel.value=I,et.uExposure.value=Math.min(S*p(t.trail,0,1)*.6,.6),et.uTime.value=G,et.uSpread.value=p(t.spread,.1,4),et.uHollow.value=p(t.hollow,0,.95),et.uNear.value=.26-.235*p(t.perspective,0,1),et.uTwist.value=p(t.twist,-2,2),et.uTurbulence.value=p(t.turbulence,0,2),et.uLook.value.set(B.yaw,B.pitch),et.uSize.value=p(t.size,.2,8),et.uSizeVariance.value=p(t.sizeVariance,0,1),et.uBrightness.value=p(t.brightness,0,3)*(E?1.3:1),et.uFocus.value=p(t.focus,0,1),et.uAperture.value=1.6*p(t.aperture,0,1),et.uGlitter.value=l?0:p(t.glitter,0,2),et.uGlintSize.value=p(t.glintSize,0,3),et.uTwinkle.value=l?0:p(t.twinkle,0,1),et.uFade.value=s,et.uDpr.value=z,n.render(o,c),Z=!0,(f||!R||N>0||Math.abs(V-m)>.001||Math.abs(B.yawV)+Math.abs(B.pitchV)>1e-5)&&ee()}let en=t=>{let a=e.getBoundingClientRect();return{x:t.clientX-a.left,y:t.clientY-a.top}},ei=e=>e instanceof Element&&!!e.closest("a,button,input,textarea,select,label,summary,[role=button],[contenteditable=true]"),er=0,el=e=>{let t=en(e);"touch"!==e.pointerType&&(B.tx=p(t.x/Math.max(C,1)*2-1,-1,1),B.ty=p(t.y/Math.max(F,1)*2-1,-1,1)),N&&N.id===e.pointerId&&Math.hypot(t.x-N.x,t.y-N.y)>10&&(N.moved=!0,"touch"===e.pointerType&&(H=!1,r.clearTimeout(er))),ee()},eo=e=>{"touch"!==e.pointerType&&(B.tx=0,B.ty=0,ee())},es=e=>{if(!e.isPrimary||e.button>0||ei(e.target))return;let t=en(e);N={id:e.pointerId,x:t.x,y:t.y,at:performance.now(),moved:!1},r.clearTimeout(er),er=r.setTimeout(()=>{N&&!N.moved&&(H=!0,ee())},180)},eu=e=>{if(!N||N.id!==e.pointerId)return;let t=N;N=null,r.clearTimeout(er);let n=H;H=!1,ee(),!("pointercancel"===e.type||n||t.moved||ei(e.target))&&a.current.waves&&et(t.x/Math.max(C,1),t.y/Math.max(F,1))};e.addEventListener("pointermove",el),e.addEventListener("pointerleave",eo),e.addEventListener("pointerdown",es),e.addEventListener("pointerup",eu),e.addEventListener("pointercancel",eu);let ec=new ResizeObserver(()=>{K()&&ee()});ec.observe(e);let ed="undefined"==typeof IntersectionObserver?null:new IntersectionObserver(([e])=>{(U=e.isIntersecting)?(O=0,ee()):(Y&&cancelAnimationFrame(Y),Y=0)},{rootMargin:"80px"});ed?ed.observe(e):U=!0;let ep=e=>{e.preventDefault(),_=!0,Y&&cancelAnimationFrame(Y),Y=0},ef=()=>{_=!1,T="",j=-1,ee()};return l.addEventListener("webglcontextlost",ep),l.addEventListener("webglcontextrestored",ef),K(),Q(),$(),J(),n.compile(o,c),ee(),{sync:()=>{K(),Q(),Z||ee(),ee()},wave:et,warp:(e=1.2)=>{a.current.reduced||(P=Math.max(P,performance.now()/1e3+p(e,.1,10)),ee())},replay:()=>{W=-1,R=!1,ee()},destroy:()=>{X=!0,Y&&cancelAnimationFrame(Y),r.clearTimeout(er),ed?.disconnect(),ec.disconnect(),e.removeEventListener("pointermove",el),e.removeEventListener("pointerleave",eo),e.removeEventListener("pointerdown",es),e.removeEventListener("pointerup",eu),e.removeEventListener("pointercancel",eu),l.removeEventListener("webglcontextlost",ep),l.removeEventListener("webglcontextrestored",ef),w.dispose(),h.dispose(),f.dispose(),n.dispose(),n.getContext().isContextLost()||n.forceContextLoss(),l.remove()}}})(e,t,Z);return X.current=a,()=>{a?.destroy(),X.current=null}},[]),(0,i.useImperativeHandle)(Y,()=>({wave:(e,t)=>X.current?.wave(e,t),warp:e=>X.current?.warp(e),replay:()=>X.current?.replay()}),[]);let K=t.trim().toLowerCase();return(0,n.jsxs)("div",{ref:O,className:(0,c.cn)("relative isolate h-full min-h-[320px] w-full overflow-hidden",W),style:{backgroundColor:"transparent"===K||""===K?void 0:t,touchAction:"pan-y",...R},children:[(0,n.jsx)("div",{ref:U,"aria-hidden":"true",style:{position:"absolute",inset:0,zIndex:0}}),D?(0,n.jsx)("div",{style:{position:"relative",zIndex:1,height:"100%"},children:D}):null]})});S.displayName="GlimmerWrap";let C={colors:["#FFFFFF","#B19EEF"],count:1500,size:1.6,brightness:1,spread:1,hollow:.06,perspective:.7,centerX:.5,centerY:.5,speed:.5,direction:"outward",twist:0,turbulence:0,trail:.08,glitter:.5,twinkle:.5,focus:.62,aperture:.45},F={glimmer:C,warp:{...C,speed:1.6,trail:.9,glitter:.2,count:2400,brightness:1.6},gold:{...C,colors:["#FFE3A3","#FFB27A"],speed:.25,turbulence:.6,twinkle:.8,glitter:.9,size:1.8},tunnel:{...C,hollow:.55,perspective:.9,twist:.7,count:2400,speed:.7,trail:.3},dream:{...C,colors:["#5227FF","#FF9FFC"],count:1900,aperture:1,focus:.88,speed:.35,size:2},snowfall:{...C,centerY:-.3,speed:.28,size:2.3,aperture:.85,focus:.7,glitter:.3,spread:2.2,count:3600,hollow:0},horizon:{...C,colors:["#B19EEF","#FF9FFC"],centerY:1.02,speed:.45,spread:2.2,hollow:0,count:3600,perspective:.8,size:2,brightness:1.3}},z=[{label:"Glimmer",value:"glimmer"},{label:"Warp",value:"warp"},{label:"Gold Dust",value:"gold"},{label:"Tunnel",value:"tunnel"},{label:"Dream",value:"dream"},{label:"Snowfall",value:"snowfall"},{label:"Horizon",value:"horizon"}],L=[{label:"Outward",value:"outward"},{label:"Inward",value:"inward"}],j=[{name:"colors",type:"[string, string]",default:'["#FFFFFF", "#B19EEF"]',description:"Two colours each glint is tinted between, blended in OKLab. On light backgrounds they turn into matching inks automatically."},{name:"backgroundColor",type:"string",default:'"transparent"',description:"Background of the component. Transparent reads the colour behind the component."},{name:"count",type:"number",default:"1500",description:"Number of glints in the field, up to 9000."},{name:"size",type:"number",default:"1.6",description:"Size of a glint in pixels at the middle of the field."},{name:"sizeVariance",type:"number",default:"0.6",description:"How much glint sizes vary."},{name:"brightness",type:"number",default:"1",description:"Overall brightness of the field."},{name:"spread",type:"number",default:"1",description:"Width of the field around the centre."},{name:"hollow",type:"number",default:"0.06",description:"Size of the empty core around the centre, from 0 (filled) to 0.95 (a tunnel). Keeps the middle clear for content."},{name:"perspective",type:"number",default:"0.7",description:"Depth of the field. Higher values fling near glints wider and faster."},{name:"centerX",type:"number",default:"0.5",description:"Horizontal position of the vanishing point, as a fraction of the width."},{name:"centerY",type:"number",default:"0.5",description:"Vertical position of the vanishing point. Above the frame gives falling snow; below it, glints rising from a horizon."},{name:"speed",type:"number",default:"0.5",description:"Speed of travel through the field. 0 holds still."},{name:"direction",type:'"outward" | "inward"',default:'"outward"',description:"Fly into the field, or drift backwards out of it."},{name:"twist",type:"number",default:"0",description:"Spiral twist of the field with depth. Negative values twist the other way."},{name:"turbulence",type:"number",default:"0",description:"Gentle wobble in each glint's path."},{name:"trail",type:"number",default:"0.08",description:"Shutter length for motion streaks. Streaks grow with speed, so warp boosts stretch them out."},{name:"glitter",type:"number",default:"0.5",description:"How often glints catch the light and flash into four-point stars. 0 turns flashes off."},{name:"glintSize",type:"number",default:"1",description:"Length of the four-point flash."},{name:"twinkle",type:"number",default:"0.5",description:"Gentle brightness shimmer of every glint."},{name:"focus",type:"number",default:"0.62",description:"Depth that is in sharp focus, from 0 (nearest) to 1 (farthest)."},{name:"aperture",type:"number",default:"0.45",description:"Depth of field. Higher values turn out-of-focus glints into soft bokeh."},{name:"boost",type:"number",default:"7",description:"Speed multiplier while the pointer is held down, a short jump to warp. 1 turns it off."},{name:"parallax",type:"number",default:"0.5",description:"How far the view turns toward the pointer, so near glints shift more than far ones."},{name:"waves",type:"boolean",default:"true",description:"Click or tap to send a wave of light through the field, catching glints as it passes."},{name:"intro",type:"boolean",default:"true",description:"Arrive out of warp: the field fades in at speed and settles to its cruising pace."},{name:"paused",type:"boolean",default:"false",description:"Stops the motion. Reduced-motion users get a still field without flashes."},{name:"dpr",type:"number",default:"2",description:"Maximum device pixel ratio for the canvas."},{name:"children",type:"ReactNode",default:"—",description:"Content laid over the field, such as a hero headline. Clicks on its links and buttons never send waves."},{name:"ref",type:"{ wave, warp, replay }",default:"—",description:"wave(x?, y?) sends a wave from a position given in fractions of the size; warp(seconds?) boosts for a moment; replay() replays the intro."},{name:"className",type:"string",default:"—",description:"Classes for the root element. It fills its parent, with a 320px minimum height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."}],M=()=>{let[e,t]=(0,o.I)(),a=(0,l.Y)(),[s,u]=(0,i.useState)("glimmer"),[c,d]=(0,i.useState)(F.glimmer),p=e=>t=>d(a=>({...a,[e]:t})),[f,h]=(0,i.useState)(null),m=f??("dark"===a?"#0A0A0A":"#FFFFFF"),[v,g]=(0,i.useState)(.6),[w,x]=(0,i.useState)(1),[y,b]=(0,i.useState)(7),[k,C]=(0,i.useState)(.5),[M,T]=(0,i.useState)(!0),[E,A]=(0,i.useState)(!0),[I,G]=(0,i.useState)(!1);return(0,n.jsxs)("div",{children:[(0,n.jsx)(r.Bg,{}),(0,n.jsxs)(r.VX,{children:[(0,n.jsxs)(r.Ec,{children:[(0,n.jsx)(r.Ch,{onRefresh:t,minHeight:560,enableResponsive:!0,children:(0,n.jsx)("div",{className:"relative h-full w-full",children:(0,n.jsx)(S,{...c,backgroundColor:m,sizeVariance:v,glintSize:w,boost:y,parallax:k,waves:M,intro:E,paused:I},e)})}),(0,n.jsxs)(r.IH,{children:[(0,n.jsx)(r.bg,{title:"Preset",value:s,options:z,onChange:e=>{u(e),d(F[e]??F.glimmer)}}),(0,n.jsx)(r.bg,{title:"Direction",value:c.direction,options:L,onChange:e=>p("direction")(e)}),(0,n.jsx)(r.W7,{title:"Color A",value:c.colors[0],onChange:e=>d(t=>({...t,colors:[e,t.colors[1]]}))}),(0,n.jsx)(r.W7,{title:"Color B",value:c.colors[1],onChange:e=>d(t=>({...t,colors:[t.colors[0],e]}))}),(0,n.jsx)(r.W7,{title:"Background",value:m,onChange:h}),(0,n.jsx)(r.yt,{title:"Count",min:100,max:6e3,step:50,value:c.count,onChange:p("count")}),(0,n.jsx)(r.yt,{title:"Size",min:.4,max:5,step:.05,value:c.size,valueUnit:"px",onChange:p("size")}),(0,n.jsx)(r.yt,{title:"Size Variance",min:0,max:1,step:.01,value:v,onChange:g}),(0,n.jsx)(r.yt,{title:"Brightness",min:.1,max:2.5,step:.01,value:c.brightness,onChange:p("brightness")}),(0,n.jsx)(r.yt,{title:"Spread",min:.3,max:3,step:.01,value:c.spread,onChange:p("spread")}),(0,n.jsx)(r.yt,{title:"Hollow",min:0,max:.9,step:.01,value:c.hollow,onChange:p("hollow")}),(0,n.jsx)(r.yt,{title:"Perspective",min:0,max:1,step:.01,value:c.perspective,onChange:p("perspective")}),(0,n.jsx)(r.yt,{title:"Center X",min:-.5,max:1.5,step:.01,value:c.centerX,onChange:p("centerX")}),(0,n.jsx)(r.yt,{title:"Center Y",min:-.8,max:1.8,step:.01,value:c.centerY,onChange:p("centerY")}),(0,n.jsx)(r.yt,{title:"Speed",min:0,max:3,step:.01,value:c.speed,onChange:p("speed")}),(0,n.jsx)(r.yt,{title:"Twist",min:-1.5,max:1.5,step:.01,value:c.twist,onChange:p("twist")}),(0,n.jsx)(r.yt,{title:"Turbulence",min:0,max:1.5,step:.01,value:c.turbulence,onChange:p("turbulence")}),(0,n.jsx)(r.yt,{title:"Trail",min:0,max:1,step:.01,value:c.trail,onChange:p("trail")}),(0,n.jsx)(r.yt,{title:"Glitter",min:0,max:1.5,step:.01,value:c.glitter,onChange:p("glitter")}),(0,n.jsx)(r.yt,{title:"Glint Size",min:0,max:2.5,step:.01,value:w,onChange:x}),(0,n.jsx)(r.yt,{title:"Twinkle",min:0,max:1,step:.01,value:c.twinkle,onChange:p("twinkle")}),(0,n.jsx)(r.yt,{title:"Focus",min:0,max:1,step:.01,value:c.focus,onChange:p("focus")}),(0,n.jsx)(r.yt,{title:"Aperture",min:0,max:1,step:.01,value:c.aperture,onChange:p("aperture")}),(0,n.jsx)(r.yt,{title:"Boost",min:1,max:14,step:.5,value:y,onChange:b}),(0,n.jsx)(r.yt,{title:"Parallax",min:0,max:1,step:.01,value:k,onChange:C}),(0,n.jsx)(r.tl,{title:"Waves",checked:M,onChange:T}),(0,n.jsx)(r.tl,{title:"Intro",checked:E,onChange:A}),(0,n.jsx)(r.tl,{title:"Paused",checked:I,onChange:G})]}),(0,n.jsx)(r.Ub,{data:j})]}),(0,n.jsx)(r.lT,{children:(0,n.jsx)(r.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>n.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>d.CopyButton,IH:()=>r.Customize,gI:()=>h,Dn:()=>v,pi:()=>m,W7:()=>l.PreviewColor,Ch:()=>i.PreviewContainer,UD:()=>l.PreviewInput,bg:()=>l.PreviewSelect,yt:()=>l.PreviewSlider,tl:()=>l.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>o.PropTable,VX:()=>n.TabsLayout,bs:()=>f});var n=a(55019);a(27382);var i=a(10236),r=a(69485),l=a(48543),o=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),p=a(90650);let f="rounded-lg border bg-background";function h({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,p.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,p.cn)(f,e),...a,children:t})}function v({title:e,description:t,className:a,children:n}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:n})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>o});var n=a(12115),i=a(30701);let r=()=>()=>{},l=()=>"light";function o(){let{resolvedTheme:e}=(0,i.D)();return(0,n.useSyncExternalStore)(r,()=>"dark"===e?"dark":"light",l)}},90761:(e,t,a)=>{a.d(t,{I:()=>i});var n=a(12115);function i(){let[e,t]=(0,n.useState)(0),a=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);