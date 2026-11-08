"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[76725],{56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>l.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>d.CopyButton,IH:()=>i.Customize,gI:()=>p,Dn:()=>v,pi:()=>f,W7:()=>o.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>o.PreviewInput,bg:()=>o.PreviewSelect,yt:()=>o.PreviewSlider,tl:()=>o.PreviewSwitch,Ec:()=>l.PreviewTab,Ub:()=>n.PropTable,VX:()=>l.TabsLayout,bs:()=>m});var l=a(55019);a(27382);var r=a(10236),i=a(69485),o=a(48543),n=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),h=a(90650);let m="rounded-lg border bg-background";function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function f({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)(m,e),...a,children:t})}function v({title:e,description:t,className:a,children:l}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:l})]})}},76725:(e,t,a)=>{a.r(t),a.d(t,{default:()=>Y});var l=a(95155),r=a(12115),i=a(86049),o=a(56388),n=a(90761),s=a(81712),u=a(3907),c=a(2253),d=a(90650);let h=["#5227FF","#FF9FFC"],m=`
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,p=`
precision highp float;

uniform sampler2D uVelocity;
uniform vec2 uSize;
uniform vec2 uCanvas;
uniform float uDt;
uniform float uDecay;
uniform float uBlend;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform vec2 uBrushVelocity;
uniform float uRadius;

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 e = b - a;
  float t = clamp(dot(p - a, e) / max(dot(e, e), 1e-4), 0.0, 1.0);
  return length(p - a - e * t);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 p = uv * uCanvas - uCanvas * 0.5;
  vec2 v = texture2D(uVelocity, uv).xy;
  vec2 carried = texture2D(uVelocity, uv - v * uDt / uCanvas).xy * uDecay;
  float d = segment(p, uFrom, uTo) / uRadius;
  float w = exp(-d * d * d * d) * uBlend;
  gl_FragColor = vec4(mix(carried, uBrushVelocity, w), 0.0, 1.0);
}
`,f=`
precision highp float;

uniform sampler2D uLight;
uniform sampler2D uVelocity;
uniform vec2 uSize;
uniform vec2 uCanvas;
uniform float uDt;
uniform float uDrift;
uniform vec2 uDecay;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
uniform float uEnergy;

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 e = b - a;
  float t = clamp(dot(p - a, e) / max(dot(e, e), 1e-4), 0.0, 1.0);
  return length(p - a - e * t);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 p = uv * uCanvas - uCanvas * 0.5;
  vec2 v = texture2D(uVelocity, uv).xy;
  vec2 light = texture2D(uLight, uv - v * uDrift * uDt / uCanvas).xy * uDecay;
  float d = segment(p, uFrom, uTo) / uRadius;
  float paint = exp(-d * d) * uEnergy;
  gl_FragColor = vec4(max(light, vec2(paint)), 0.0, 1.0);
}
`,v=`
precision highp float;

#define MAX_PULSES 4

uniform vec2 uResolution;
uniform float uCell;
uniform float uTime;
uniform float uClock;
uniform sampler2D uLight;
uniform vec3 uLens;
uniform float uLensRadius;
uniform vec4 uPulses[MAX_PULSES];
uniform float uPulseSpeed;
uniform float uLineWidth;
uniform float uLitWidth;
uniform float uLattice;
uniform float uGlow;
uniform float uGlowRadius;
uniform float uShimmer;
uniform float uVignette;
uniform float uGrain;
uniform float uCore;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uBackground;
uniform float uInk;
uniform float uTransparent;

const float HALF_EDGE = 0.2886751;

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

void main() {
  vec2 p = gl_FragCoord.xy - uResolution * 0.5;
  vec2 q = p.yx / uCell;
  vec2 s = vec2(1.0, 1.7320508);
  vec4 hc = floor(vec4(q, q - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  vec4 h = vec4(q - hc.xy * s, q - (hc.zw + 0.5) * s);
  vec2 o;
  vec2 c;
  if (dot(h.xy, h.xy) < dot(h.zw, h.zw)) {
    o = h.xy;
    c = hc.xy * s;
  } else {
    o = h.zw;
    c = (hc.zw + 0.5) * s;
  }

  vec2 dirs[3];
  dirs[0] = vec2(1.0, 0.0);
  dirs[1] = vec2(0.5, 0.8660254);
  dirs[2] = vec2(-0.5, 0.8660254);

  float nearest = 1e9;
  vec2 nearestMid = vec2(0.0);
  float lineLit = 0.0;
  float glowLit = 0.0;
  float haloLit = 0.0;
  float heatSum = 0.0;
  float heatWeight = 1e-4;
  float pulseLine = 0.0;
  float pulseGlow = 0.0;
  float pulseHeat = 0.0;
  float aa = 0.8;
  float glowRadius = max(uGlowRadius, 0.5);

  for (int e = 0; e < 6; e++) {
    int slot = e < 3 ? e : e - 3;
    vec2 n = dirs[slot] * (e < 3 ? 1.0 : -1.0);
    vec2 t = vec2(-n.y, n.x);
    vec2 rel = o - n * 0.5;
    float along = dot(rel, t);
    float across = dot(rel, n);
    float dist = length(vec2(across, max(abs(along) - HALF_EDGE, 0.0))) * uCell;
    vec2 midPx = (c + n * 0.5).yx * uCell;
    if (dist < nearest) {
      nearest = dist;
      nearestMid = midPx;
    }

    vec2 tPx = t.yx;
    vec2 endA = midPx - tPx * HALF_EDGE * uCell;
    vec2 endB = midPx + tPx * HALF_EDGE * uCell;
    float clampedAlong = clamp(along, -HALF_EDGE, HALF_EDGE) * uCell;
    float fall = exp(-dist / glowRadius);

    vec2 at = midPx + tPx * clampedAlong;
    vec2 wake = texture2D(uLight, at / uResolution + 0.5).rg;
    vec2 offset = (at - uLens.xy) / uLensRadius;
    float r2 = dot(offset, offset);
    float lens = (0.62 * exp(-r2 * 4.0) + 0.38 * exp(-r2 * 0.8)) * uLens.z;
    float lit = max(wake.x, lens);
    float warm = max(wake.y, lens) * smoothstep(0.0, 0.3, lit);
    lit = pow(lit, 1.4);

    float edgeWidth = mix(uLineWidth, uLitWidth, clamp(lit, 0.0, 1.0));
    float edgeCover = 1.0 - smoothstep(edgeWidth * 0.5 - aa, edgeWidth * 0.5 + aa, dist);
    float edgeLine = edgeCover * lit;
    float edgeGlow = fall * lit;
    lineLit = max(lineLit, edgeLine);
    glowLit = max(glowLit, edgeGlow);
    haloLit = max(haloLit, exp(-dist / (glowRadius * 1.8)) * lit * warm * warm);
    heatSum += warm * (edgeLine + edgeGlow);
    heatWeight += edgeLine + edgeGlow;

    float spark = 0.0;
    float head = 0.0;
    for (int k = 0; k < MAX_PULSES; k++) {
      vec4 pl = uPulses[k];
      float age = uClock - pl.z;
      if (pl.w <= 0.0 || age < 0.0 || age > 7.0) continue;
      float da = length(endA - pl.xy);
      float db = length(endB - pl.xy);
      float fromNear = da < db ? clampedAlong + HALF_EDGE * uCell : HALF_EDGE * uCell - clampedAlong;
      float jitter = (hash(floor(midPx * 0.25) + pl.z) - 0.5) * 0.3 * uCell;
      float front = age * uPulseSpeed - min(da, db) + jitter;
      float gap = fromNear - front;
      float fade = exp(-age * 0.55) * pl.w;
      float headK = exp(-gap * gap / (0.018 * uCell * uCell)) * fade;
      float tailK = (gap < 0.0 ? exp(gap / (0.7 * uCell)) : 0.0) * fade;
      spark += headK + tailK * 0.3;
      head = max(head, headK);
    }
    float pulseWidth = mix(uLineWidth, uLitWidth, clamp(spark, 0.0, 1.0));
    float pulseCover = 1.0 - smoothstep(pulseWidth * 0.5 - aa, pulseWidth * 0.5 + aa, dist);
    pulseLine = max(pulseLine, pulseCover * spark);
    pulseGlow = max(pulseGlow, fall * spark);
    pulseHeat = max(pulseHeat, head * max(pulseCover, fall));
  }

  float heat = heatSum / heatWeight;

  float baseLine = 1.0 - smoothstep(uLineWidth * 0.5 - aa, uLineWidth * 0.5 + aa, nearest);
  float sweep = 0.5 + 0.5 * sin(dot(nearestMid / uCell, vec2(0.21, 0.13)) - uTime * 0.35);
  float shimmer = pow(sweep, 8.0) * uShimmer;

  float energy = clamp(lineLit + pulseLine, 0.0, 1.6);
  float glow = clamp(glowLit + pulseGlow, 0.0, 1.6);
  float hot = clamp(heat * 0.9 + pulseHeat, 0.0, 1.0);
  vec3 cool = mix(uColorA, vec3(dot(uColorA, vec3(0.2126, 0.7152, 0.0722))) * 1.6, 0.2);
  vec3 lineColor = mix(cool, uColorB, smoothstep(0.2, 0.75, hot));
  float radial = length(p / uResolution.y);

  float dither = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  float grain = (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * uGrain * 0.05;

  if (uInk > 0.5) {
    vec3 ink = mix(uColorA, uColorB, smoothstep(0.2, 0.9, hot) * 0.6);
    vec3 neutral = vec3(0.08, 0.08, 0.1);
    vec3 color = uBackground * (1.0 - uVignette * 0.04 * smoothstep(0.2, 1.1, radial));
    color = mix(color, neutral, baseLine * uLattice * (0.22 + 0.12 * shimmer));
    color = mix(color, ink, clamp(glow * uGlow * 0.22 + haloLit * uGlow * 0.1, 0.0, 0.45));
    color = mix(color, ink, clamp(min(energy, 1.0) * 1.8, 0.0, 1.0));
    gl_FragColor = vec4(toSrgb(color) + dither + grain, 1.0);
    return;
  }

  vec3 latticeColor = mix(vec3(0.62, 0.62, 0.7), uColorA, 0.25);
  vec3 emission = latticeColor * baseLine * uLattice * (0.055 + 0.14 * shimmer);
  float white = smoothstep(0.55, 1.0, hot * min(energy, 1.0));
  vec3 core = mix(lineColor, vec3(1.0), uCore * white);
  emission += core * energy * (1.3 + 1.1 * white);
  emission += lineColor * glow * uGlow * 0.6;
  emission += mix(lineColor, uColorB, 0.5) * haloLit * uGlow * 0.12;

  if (uTransparent > 0.5) {
    vec3 light = 1.0 - exp(-emission * 1.05);
    float alpha = clamp(max(max(light.r, light.g), light.b), 0.0, 1.0);
    gl_FragColor = vec4(toSrgb(light) + (dither + grain) * step(0.004, alpha), alpha);
    return;
  }

  vec3 base = uBackground * (1.0 + uVignette * 0.6 * (1.0 - smoothstep(0.0, 1.1, radial)));
  vec3 color = base + emission;
  color = 1.0 - exp(-color * 1.05);
  gl_FragColor = vec4(toSrgb(color) + dither + grain, 1.0);
}
`,g=(e,t,a)=>Math.min(a,Math.max(t,e)),x=e=>{let t=e.trim().toLowerCase();return"transparent"===t||(/^#[0-9a-f]{8}$/.test(t)?t.endsWith("00"):/^#[0-9a-f]{4}$/.test(t)?t.endsWith("0"):null!==t.match(/^(?:rgba?|hsla?)\(.*[,/]\s*(0|0?\.0+|0%)\s*\)$/))},w=(e,t,a)=>{let l=t.trim();try{e.set(/^#[0-9a-f]{8}$/i.test(l)?l.slice(0,7):l)}catch{e.set(a)}return e},y=e=>{let t=window.matchMedia("(min-resolution: 2dppx)");return t.addEventListener("change",e),window.addEventListener("resize",e),()=>{t.removeEventListener("change",e),window.removeEventListener("resize",e)}},b=()=>window.devicePixelRatio||1,C=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},k=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,L=(e,t)=>new c.nWS(e,t,{type:c.ix0,format:c.GWd,minFilter:c.k6q,magFilter:c.k6q,depthBuffer:!1,stencilBuffer:!1}),S=(e,t)=>new c.BKk({vertexShader:m,fragmentShader:e,uniforms:t,depthTest:!1,depthWrite:!1}),F=({settings:e,pointerRef:t,wakeRef:a})=>{let{gl:i,size:o,viewport:n,invalidate:u}=(0,s.C)(),d=(0,r.useRef)(null),y=(0,r.useRef)(null),b=(0,r.useRef)(null),C=(0,r.useMemo)(()=>({uResolution:{value:new c.I9Y(1,1)},uCell:{value:72},uTime:{value:0},uClock:{value:0},uLight:{value:null},uLens:{value:new c.Pq0},uLensRadius:{value:100},uPulses:{value:Array.from({length:4},()=>new c.IUQ(0,0,-99,0))},uPulseSpeed:{value:400},uLineWidth:{value:1},uLitWidth:{value:1.8},uLattice:{value:.4},uGlow:{value:1.5},uGlowRadius:{value:4.5},uShimmer:{value:1},uVignette:{value:0},uGrain:{value:1},uCore:{value:.4},uColorA:{value:new c.Q1f},uColorB:{value:new c.Q1f},uBackground:{value:new c.Q1f},uInk:{value:0},uTransparent:{value:0}}),[]),k=e.colors.join("|"),{backgroundColor:F}=e,M=72*g(e.cellSize,.5,4)*n.dpr,V=g(Math.round(M/20),3,10),E=Math.max(8,Math.ceil(o.width*n.dpr/V)),j=Math.max(8,Math.ceil(o.height*n.dpr/V));return(0,r.useEffect)(()=>{let e,t,a,l,r,i,o=(t=S(f,{...(e=()=>({uSize:{value:new c.I9Y(E,j)},uCanvas:{value:new c.I9Y(1,1)},uDt:{value:0},uFrom:{value:new c.I9Y},uTo:{value:new c.I9Y},uRadius:{value:100}}))(),uLight:{value:null},uVelocity:{value:null},uDrift:{value:.5},uDecay:{value:new c.I9Y(1,1)},uEnergy:{value:0}}),a=S(p,{...e(),uVelocity:{value:null},uDecay:{value:1},uBlend:{value:0},uBrushVelocity:{value:new c.I9Y}}),l=new c.Z58,r=new c.qUd(-1,1,1,-1,0,1),(i=new c.eaF(new c.bdM(2,2),t)).frustumCulled=!1,l.add(i),{light:[L(E,j),L(E,j)],velocity:[L(E,j),L(E,j)],flip:0,scene:l,camera:r,lightMaterial:t,velocityMaterial:a,quad:i,width:E,height:j});return y.current=o,u(),()=>{y.current=null,o.light.forEach(e=>e.dispose()),o.velocity.forEach(e=>e.dispose()),o.lightMaterial.dispose(),o.velocityMaterial.dispose(),o.quad.geometry.dispose()}},[E,j,u]),(0,r.useEffect)(()=>(a.current=u,()=>{a.current=null}),[u,a]),(0,r.useEffect)(()=>{let e=d.current;if(!e)return;let t=e.uniforms,a=k?k.split("|"):h;w(t.uColorA.value,a[0]??h[0],h[0]),w(t.uColorB.value,a[1]??a[0]??h[1],h[1]);let l=x(F);w(t.uBackground.value,l?"#000000":F,"#000000");let r=t.uBackground.value,i=.2126*r.r+.7152*r.g+.0722*r.b;t.uInk.value=+(!l&&i>.2),t.uTransparent.value=+!!l,u()},[k,F,u]),(0,r.useEffect)(()=>{u()},[e,o,u]),(0,s.D)((a,l)=>{let r=d.current,n=y.current;if(!r||!n)return;let s=r.uniforms,h=t.current,m=Math.min(Math.max(l,0),.1),p=!e.paused&&!e.reduced,f=a.viewport.dpr,v=72*g(e.cellSize,.5,4)*f,x=o.width*f,w=o.height*f,C=g(e.speed,0,4);if(!b.current||b.current.seed!==e.seed){let t,a=(t=(0x2f6b9d11^Math.floor(7919*(e.seed+.5)))>>>0,()=>{let e=t=t+0x6d2b79f5>>>0;return e=Math.imul(e^e>>>15,1|e),(((e^=e+Math.imul(e^e>>>7,61|e))^e>>>14)>>>0)/0x100000000});b.current={time:0,clock:0,brushX:0,brushY:0,brushVX:0,brushVY:0,hasBrush:!1,tracking:!1,pointerX:0,pointerY:0,pointerVX:0,pointerVY:0,roaming:!1,roamX:(a()-.5)*.5*x,roamY:(a()-.5)*.4*w,heading:a()*Math.PI*2,roamClock:40*a(),roamIdle:0,roamDelay:0,phases:[0,1,2,3].map(()=>a()*Math.PI*2),energy:0,presence:0,lastPaint:-99,seed:e.seed,presses:h.presses,nextPulse:0,pulses:Array.from({length:4},()=>new c.IUQ(0,0,-99,0))}}let k=b.current;p&&(k.time+=m*C),e.reduced||(k.clock+=m);let L=e.interactive&&!e.reduced&&h.inside,S=e.autoplay&&!L,F=(h.x-o.width/2)*f,M=(o.height/2-h.y)*f;S&&!k.roaming&&(k.hasBrush?(k.roamX=g(k.brushX+.2*k.brushVX,-(.5*x)+v,.5*x-v),k.roamY=g(k.brushY+.2*k.brushVY,-(.5*w)+v,.5*w-v),Math.hypot(k.brushVX,k.brushVY)>.2*v&&(k.heading=Math.atan2(k.brushVY,k.brushVX)),k.roamDelay=.8):(k.brushX=k.roamX,k.brushY=k.roamY,k.brushVX=0,k.brushVY=0,k.hasBrush=!0,k.roamDelay=0),k.roamIdle=0),k.roaming=S;let V=0;if(S&&p){k.roamIdle+=m;let e=g((k.roamIdle-k.roamDelay)/1.6,0,1),t=e*e*(3-2*e);k.roamClock+=m*C*t;let a=k.roamClock,[l,r,i,o]=k.phases,n=.45*Math.sin(.43*a+l)+.3*Math.sin(.27*a+r)+.18*Math.sin(.71*a+i),s=Math.max(.5*x-1.5*v,v),u=Math.max(.5*w-1.2*v,v),c=Math.hypot(k.roamX/s,k.roamY/u)-.7;if(c>0){let e=Math.atan2(-k.roamY,-k.roamX);n+=Math.atan2(Math.sin(e-k.heading),Math.cos(e-k.heading))*Math.min(6*c,3)}k.heading+=n*m*C*t,V=1.1*v*(.8+.2*Math.sin(.19*a+o))*C*t,k.roamX+=Math.cos(k.heading)*V*m,k.roamY+=Math.sin(k.heading)*V*m}if(L&&(!k.hasBrush||!k.tracking&&k.presence<.05)&&(k.brushX=F,k.brushY=M,k.brushVX=0,k.brushVY=0,k.hasBrush=!0),L&&!k.tracking&&(k.pointerX=F,k.pointerY=M,k.pointerVX=0,k.pointerVY=0),k.tracking=L,L&&m>0){let e=1-Math.exp(-m/.06);k.pointerVX+=((F-k.pointerX)/m-k.pointerVX)*e,k.pointerVY+=((M-k.pointerY)/m-k.pointerVY)*e,k.pointerX=F,k.pointerY=M}else k.pointerVX=0,k.pointerVY=0;let E=L||S,j=L?F:k.roamX,Y=L?M:k.roamY,P=k.brushX,X=k.brushY;if(e.reduced&&S)k.brushX=j,k.brushY=Y,k.brushVX=0,k.brushVY=0;else if(k.hasBrush&&m>0){let t=10*g(e.follow,.2,4),a=1.24*t,l=Math.max(4,Math.ceil(m/.008)),r=m/l;for(let e=0;e<l;e++)E?(k.brushVX+=((j-k.brushX)*t*t-k.brushVX*a)*r,k.brushVY+=((Y-k.brushY)*t*t-k.brushVY*a)*r):(k.brushVX*=Math.exp(-(6*r)),k.brushVY*=Math.exp(-(6*r))),k.brushX+=k.brushVX*r,k.brushY+=k.brushVY*r}let W=Math.hypot(k.brushVX,k.brushVY)/f,D=Math.hypot(k.pointerVX,k.pointerVY)/f,R=V/f,B=L?1-Math.exp(-D/120):S?.85*(1-Math.exp(-R/120)):0;if(e.reduced)k.energy=0,k.presence=+!!S;else{let e=B>k.energy?.08:.35;k.energy+=(B-k.energy)*(1-Math.exp(-m/e)),k.presence+=(!!E-k.presence)*(1-Math.exp(-m/.3))}if(k.energy>.01&&(k.lastPaint=k.clock),!E&&k.presence<.005&&k.energy<.005&&W<1&&(k.hasBrush=!1),h.presses!==k.presses&&(k.presses=h.presses,e.clickPulses&&e.interactive&&!e.reduced)){let e=k.nextPulse;k.nextPulse=(e+1)%4,k.pulses[e].set((h.pressX-o.width/2)*f,(o.height/2-h.pressY)*f,k.clock,1)}let A=n.flip,G=1-A,I=2*g(e.trailWidth,.2,4)*v,T=1-Math.exp(-Math.max(D,R)/600),z=.26*g(e.trailLength,.1,8),_=k.hasBrush?k.energy:0,H=e=>{e.uCanvas.value.set(x,w),e.uSize.value.set(n.width,n.height),e.uFrom.value.set(P,X),e.uTo.value.set(k.brushX,k.brushY),e.uDt.value=m},q=n.velocityMaterial.uniforms;H(q),q.uRadius.value=I,q.uVelocity.value=n.velocity[A].texture,q.uDecay.value=Math.exp(-m/.25),q.uBlend.value=(1-Math.exp(-m/.05))*_,q.uBrushVelocity.value.set(k.brushVX,k.brushVY);let N=n.lightMaterial.uniforms;H(N),N.uRadius.value=I*(.35+.25*T),N.uLight.value=n.light[A].texture,N.uVelocity.value=n.velocity[G].texture,N.uDrift.value=.8*g(e.flow,0,1),N.uDecay.value.set(Math.exp(-m/z),Math.exp(-m/(.5*z))),N.uEnergy.value=.7*_;let U=i.getRenderTarget();n.quad.material=n.velocityMaterial,i.setRenderTarget(n.velocity[G]),i.render(n.scene,n.camera),n.quad.material=n.lightMaterial,i.setRenderTarget(n.light[G]),i.render(n.scene,n.camera),i.setRenderTarget(U),n.flip=G;let K=!1;for(let e=0;e<4;e++)s.uPulses.value[e].copy(k.pulses[e]),k.pulses[e].w>0&&k.clock-k.pulses[e].z<7&&(K=!0);s.uLight.value=n.light[G].texture,s.uLens.value.set(k.brushX,k.brushY,k.hasBrush?k.presence*(.45+.55*k.energy):0),s.uLensRadius.value=I,s.uResolution.value.set(x,w),s.uCell.value=v,s.uTime.value=k.time,s.uClock.value=k.clock,s.uPulseSpeed.value=5.5*g(e.pulseSpeed,.1,5)*v,s.uLineWidth.value=g(e.lineWidth,.2,4)*f,s.uLitWidth.value=g(e.litWidth,.5,8)*f,s.uLattice.value=g(e.lattice,0,3),s.uGlow.value=g(e.glow,0,3),s.uGlowRadius.value=4.5*g(e.glowRadius,.1,4)*f,s.uShimmer.value=g(e.shimmer,0,2),s.uVignette.value=g(e.vignette,0,1),s.uGrain.value=g(e.grain,0,1),s.uCore.value=g(e.core,0,1);let Q=Math.abs(!!E-k.presence)>.002||k.energy>.002||W>.5,$=K||Q||k.clock-k.lastPaint<6*z;p||e.reduced||!$||u()}),(0,l.jsxs)("mesh",{frustumCulled:!1,children:[(0,l.jsx)("planeGeometry",{args:[2,2]}),(0,l.jsx)("shaderMaterial",{ref:d,vertexShader:m,fragmentShader:v,uniforms:C,depthTest:!1,depthWrite:!1})]})},M=({colors:e=h,backgroundColor:t="#0a0a0a",cellSize:a=1.9,lineWidth:i=.5,litWidth:o=1.8,lattice:n=.4,glow:s=1.5,glowRadius:c=.5,core:m=.4,vignette:p=0,grain:f=1,trailLength:v=3,trailWidth:g=1,follow:w=.5,flow:L=.5,autoplay:S=!0,shimmer:M=1,speed:V=1,interactive:E=!0,clickPulses:j=!0,pulseSpeed:Y=1,seed:P=0,paused:X=!1,dpr:W=2,className:D,style:R,children:B})=>{let A=(0,r.useRef)(null),G=(0,r.useRef)({x:0,y:0,inside:!1,presses:0,pressX:0,pressY:0}),I=(0,r.useRef)(null),[T,z]=(0,r.useState)(!0),_=(0,r.useSyncExternalStore)(C,k,()=>!1),H=Math.min((0,r.useSyncExternalStore)(y,b,()=>1),Math.max(W,.5)),q=!X&&!_,N=x(t);return(0,r.useEffect)(()=>{let e=A.current;if(!e||"undefined"==typeof IntersectionObserver)return;let t=new IntersectionObserver(([e])=>z(e.isIntersecting),{rootMargin:"80px"});return t.observe(e),()=>t.disconnect()},[]),(0,r.useEffect)(()=>{let e=A.current;if(!e)return;let t=t=>{let a=e.getBoundingClientRect(),l=G.current;l.x=t.clientX-a.left,l.y=t.clientY-a.top,l.inside=!0},a=e=>{t(e),I.current?.()},l=e=>{t(e);let a=G.current;a.pressX=a.x,a.pressY=a.y,a.presses+=1,I.current?.()},r=()=>{G.current.inside=!1,I.current?.()};return e.addEventListener("pointermove",a,{passive:!0}),e.addEventListener("pointerdown",l,{passive:!0}),e.addEventListener("pointerleave",r,{passive:!0}),e.addEventListener("pointercancel",r,{passive:!0}),()=>{e.removeEventListener("pointermove",a),e.removeEventListener("pointerdown",l),e.removeEventListener("pointerleave",r),e.removeEventListener("pointercancel",r)}},[]),(0,l.jsxs)("div",{ref:A,className:(0,d.cn)("relative isolate overflow-hidden",D),style:{backgroundColor:N?void 0:t,...R},children:[(0,l.jsx)("div",{className:"absolute inset-0","aria-hidden":"true",children:(0,l.jsx)(u.Hl,{dpr:H,frameloop:T&&q?"always":"demand",gl:{antialias:!1,alpha:!0,premultipliedAlpha:!0,powerPreference:"high-performance"},style:{pointerEvents:"none"},children:(0,l.jsx)(F,{settings:{colors:e,backgroundColor:t,cellSize:a,lineWidth:i,litWidth:o,lattice:n,glow:s,glowRadius:c,core:m,vignette:p,grain:f,trailLength:v,trailWidth:g,follow:w,flow:L,autoplay:S,shimmer:M,speed:V,interactive:E,clickPulses:j,pulseSpeed:Y,seed:P,paused:X,reduced:_},pointerRef:G,wakeRef:I})})}),B?(0,l.jsx)("div",{className:"relative z-10 h-full w-full",children:B}):null]})},V={violet:{colors:["#5227FF","#FF9FFC"],background:"#0a0a0a"},ice:{colors:["#2F6BFF","#BFEFFF"],background:"#0a0a0a"},mono:{colors:["#8A8A99","#FFFFFF"],background:"#0a0a0a"},amber:{colors:["#FF6A1A","#FFD9A8"],background:"#0a0a0a"},emerald:{colors:["#10B981","#D1FAE5"],background:"#0a0a0a"},ink:{colors:["#5227FF","#C026D3"],background:"#FAFAFA"},graphite:{colors:["#52525B","#18181B"],background:"#F4F4F5"}},E=[{label:"Violet",value:"violet"},{label:"Ice",value:"ice"},{label:"Mono",value:"mono"},{label:"Amber",value:"amber"},{label:"Emerald",value:"emerald"},{label:"Ink",value:"ink"},{label:"Graphite",value:"graphite"}],j=[{name:"colors",type:"string[]",default:'["#5227FF", "#FF9FFC"]',description:"Two colours: edges as they cool, then the hot light where the pointer has just passed."},{name:"backgroundColor",type:"string",default:'"#0a0a0a"',description:'Colour behind the lattice. Light backgrounds switch to ink lines. Pass "transparent" to show the page.'},{name:"cellSize",type:"number",default:"1.9",description:"Size of the hexagonal cells. 1 is 72px between cell centres."},{name:"lineWidth",type:"number",default:"0.5",description:"Width of the resting lattice lines, in pixels."},{name:"litWidth",type:"number",default:"1.8",description:"Width of an edge at full light, in pixels."},{name:"lattice",type:"number",default:"0.4",description:"Visibility of the resting lattice. 0 hides it, so only lit edges appear."},{name:"glow",type:"number",default:"1.5",description:"Strength of the glow around lit edges."},{name:"glowRadius",type:"number",default:"0.5",description:"How far the glow spreads from each lit edge."},{name:"core",type:"number",default:"0.4",description:"How close to white the hottest edges burn, from 0 to 1."},{name:"vignette",type:"number",default:"0",description:"Soft lift of the background towards the centre, from 0 to 1."},{name:"grain",type:"number",default:"1",description:"Fine film grain over the whole surface, from 0 to 1."},{name:"trailLength",type:"number",default:"3",description:"How long the afterglow lingers on the lattice where the light has passed. It fades faster at its edges, so it tapers as it goes."},{name:"trailWidth",type:"number",default:"1",description:"Size of the pool of light that follows the pointer, and of the afterglow it leaves."},{name:"follow",type:"number",default:"0.5",description:"Stiffness of the spring the light follows the pointer on. Lower values glide further behind and settle more softly."},{name:"flow",type:"number",default:"0.5",description:"Momentum carried by the afterglow: it keeps drifting in the direction of motion after the pointer slows, from 0 to 1."},{name:"autoplay",type:"boolean",default:"true",description:"While the pointer is away, the light wanders the lattice on its own along a smooth, meandering path, leaving its afterglow. When the pointer returns, the light glides over to it."},{name:"shimmer",type:"number",default:"1",description:"A slow band of light sweeping across the resting lattice. 0 disables it."},{name:"speed",type:"number",default:"1",description:"Pace of the idle animation: the wandering light and the shimmer. 0 holds them still."},{name:"interactive",type:"boolean",default:"true",description:"A soft light glides after the pointer on a damped spring. It glows brighter while moving and leaves a fading afterglow on the lattice."},{name:"clickPulses",type:"boolean",default:"true",description:"Each click sends sparks racing outward along every edge from the point you clicked. Rapid clicks stack."},{name:"pulseSpeed",type:"number",default:"1",description:"How fast the sparks travel."},{name:"seed",type:"number",default:"0",description:"Changes where the wandering light starts and the path it takes."},{name:"paused",type:"boolean",default:"false",description:"Freezes the idle animation, so the wandering light holds still. The pointer and clicks still work."},{name:"dpr",type:"number",default:"2",description:"Upper bound for the device pixel ratio."},{name:"className",type:"string",default:"—",description:"Classes for the root element. Give it a height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."},{name:"children",type:"ReactNode",default:"—",description:"Content layered above the lattice."}],Y=()=>{let[e,t]=(0,n.I)(),a=(0,i.Y)(),[s,u]=(0,r.useState)(null),c=s??("dark"===a?"violet":"ink"),[d,h]=(0,r.useState)({}),m={...V[c]??V.violet,...d},[p,f]=(0,r.useState)(1.9),[v,g]=(0,r.useState)(.5),[x,w]=(0,r.useState)(1.8),[y,b]=(0,r.useState)(.4),[C,k]=(0,r.useState)(1.5),[L,S]=(0,r.useState)(.5),[F,Y]=(0,r.useState)(.4),[P,X]=(0,r.useState)(0),[W,D]=(0,r.useState)(1),[R,B]=(0,r.useState)(3),[A,G]=(0,r.useState)(1),[I,T]=(0,r.useState)(.5),[z,_]=(0,r.useState)(.5),[H,q]=(0,r.useState)(!0),[N,U]=(0,r.useState)(1),[K,Q]=(0,r.useState)(1),[$,O]=(0,r.useState)(1),[Z,J]=(0,r.useState)(0),[ee,et]=(0,r.useState)(!0),[ea,el]=(0,r.useState)(!0),[er,ei]=(0,r.useState)(!1),eo=e=>t=>h(a=>{let l=[...a.colors??m.colors];return l[e]=t,{...a,colors:l}});return(0,l.jsxs)("div",{children:[(0,l.jsx)(o.Bg,{}),(0,l.jsxs)(o.VX,{children:[(0,l.jsxs)(o.Ec,{children:[(0,l.jsx)(o.Ch,{onRefresh:t,minHeight:600,children:(0,l.jsx)("div",{className:"relative h-full w-full",children:(0,l.jsx)(M,{className:"h-full w-full",colors:m.colors,backgroundColor:m.background,cellSize:p,lineWidth:v,litWidth:x,lattice:y,glow:C,glowRadius:L,core:F,vignette:P,grain:W,trailLength:R,trailWidth:A,follow:I,flow:z,autoplay:H,shimmer:N,speed:K,interactive:ee,clickPulses:ea,pulseSpeed:$,seed:Z,paused:er},e)})}),(0,l.jsxs)(o.IH,{children:[(0,l.jsx)(o.bg,{title:"Preset",value:c,options:E,onChange:e=>{u(e),h({})}}),(0,l.jsx)(o.W7,{title:"Background",value:m.background,onChange:e=>h(t=>({...t,background:e}))}),(0,l.jsx)(o.W7,{title:"Cool",value:m.colors[0],onChange:eo(0)}),(0,l.jsx)(o.W7,{title:"Hot",value:m.colors[1],onChange:eo(1)}),(0,l.jsx)(o.yt,{title:"Cell Size",min:.5,max:3,step:.05,value:p,onChange:f}),(0,l.jsx)(o.yt,{title:"Line Width",min:.3,max:3,step:.05,value:v,valueUnit:"px",onChange:g}),(0,l.jsx)(o.yt,{title:"Lit Width",min:.5,max:6,step:.1,value:x,valueUnit:"px",onChange:w}),(0,l.jsx)(o.yt,{title:"Lattice",min:0,max:3,step:.05,value:y,onChange:b}),(0,l.jsx)(o.yt,{title:"Glow",min:0,max:3,step:.05,value:C,onChange:k}),(0,l.jsx)(o.yt,{title:"Glow Radius",min:.2,max:3,step:.05,value:L,onChange:S}),(0,l.jsx)(o.yt,{title:"Core",min:0,max:1,step:.01,value:F,onChange:Y}),(0,l.jsx)(o.yt,{title:"Vignette",min:0,max:1,step:.01,value:P,onChange:X}),(0,l.jsx)(o.yt,{title:"Grain",min:0,max:1,step:.01,value:W,onChange:D}),(0,l.jsx)(o.yt,{title:"Trail Length",min:.2,max:5,step:.1,value:R,valueUnit:"s",onChange:B}),(0,l.jsx)(o.yt,{title:"Trail Width",min:.4,max:3,step:.05,value:A,onChange:G}),(0,l.jsx)(o.yt,{title:"Follow",min:.2,max:3,step:.05,value:I,onChange:T}),(0,l.jsx)(o.yt,{title:"Flow",min:0,max:1,step:.01,value:z,onChange:_}),(0,l.jsx)(o.yt,{title:"Shimmer",min:0,max:2,step:.05,value:N,onChange:U}),(0,l.jsx)(o.yt,{title:"Speed",min:0,max:3,step:.05,value:K,onChange:Q}),(0,l.jsx)(o.yt,{title:"Pulse Speed",min:.2,max:3,step:.05,value:$,onChange:O}),(0,l.jsx)(o.yt,{title:"Seed",min:0,max:20,step:1,value:Z,onChange:J}),(0,l.jsx)(o.tl,{title:"Autoplay",checked:H,onChange:q}),(0,l.jsx)(o.tl,{title:"Interactive",checked:ee,onChange:et}),(0,l.jsx)(o.tl,{title:"Click Pulses",checked:ea,onChange:el}),(0,l.jsx)(o.tl,{title:"Paused",checked:er,onChange:ei})]}),(0,l.jsx)(o.Ub,{data:j})]}),(0,l.jsx)(o.lT,{children:(0,l.jsx)(o.Gv,{})})]})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>n});var l=a(12115),r=a(30701);let i=()=>()=>{},o=()=>"light";function n(){let{resolvedTheme:e}=(0,r.D)();return(0,l.useSyncExternalStore)(i,()=>"dark"===e?"dark":"light",o)}},90761:(e,t,a)=>{a.d(t,{I:()=>r});var l=a(12115);function r(){let[e,t]=(0,l.useState)(0),a=(0,l.useCallback)(()=>{t(e=>e+1)},[]);return(0,l.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);