"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[2544],{2544:(e,t,a)=>{a.r(t),a.d(t,{default:()=>x});var i=a(95155),n=a(12115),u=a(30701),l=a(56388),r=a(90761),o=a(81712),s=a(3907),c=a(2253),d=a(90650);let m=(e,t,a)=>Math.min(a,Math.max(t,e)),f=e=>{let t=e.replace("#","").trim(),a=Number.parseInt(3===t.length?t.split("").map(e=>e+e).join(""):t.padEnd(6,"0").slice(0,6),16),i=Number.isFinite(a)?a:0,n=e=>{let t=e/255;return t<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)};return[n(i>>16&255),n(i>>8&255),n(255&i)]},p=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,v=({samples:e,size:t,eye:a,basis:u,zoom:l,cell:r,gap:s,round:d,amplitude:f,lift:v,liftRadius:h,ceiling:x,near:g,far:y,tones:b,accentMix:w,speed:C,maxFps:S,advance:z})=>{let{invalidate:M}=(0,o.C)(),R=(0,n.useRef)(null),j=(0,n.useRef)(0),k=(0,n.useMemo)(()=>[{uSize:{value:new c.I9Y(1,1)},uEye:{value:new c.Pq0},uRight:{value:new c.Pq0},uUp:{value:new c.Pq0},uFwd:{value:new c.Pq0},uZoom:{value:3.5},uTime:{value:0},uFocus:{value:new c.I9Y},uCell:{value:.04},uGap:{value:0},uAmp:{value:0},uLift:{value:0},uReach:{value:1},uRound:{value:0},uRest:{value:.12},uSun:{value:new c.Pq0(.57,.71,-.43)},uCeil:{value:1},uNear:{value:1},uFar:{value:4},uReveal:{value:0},uTop:{value:new c.Pq0},uSide:{value:new c.Pq0},uFace:{value:new c.Pq0},uAccent:{value:new c.Pq0},uAccentMix:{value:0},uBack:{value:new c.Pq0}}],[]),E=(0,n.useMemo)(()=>{let t,a;return t=m(e,1,3),a=d>0,`
precision highp float;

#define AA ${t}
${a?"#define ROUND":""}
#define STEPS 96

uniform vec2 uSize;
uniform vec3 uEye;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uFwd;
uniform float uZoom;
uniform float uTime;
uniform vec2 uFocus;
uniform float uCell;
uniform float uGap;
uniform float uAmp;
uniform float uLift;
uniform float uReach;
uniform float uRound;
uniform float uRest;
uniform vec3 uSun;
uniform float uCeil;
uniform float uNear;
uniform float uFar;
uniform float uReveal;
uniform vec3 uTop;
uniform vec3 uSide;
uniform vec3 uFace;
uniform vec3 uAccent;
uniform float uAccentMix;
uniform vec3 uBack;

varying vec2 vUv;

const float TAU = 6.2831853;

float hash21(vec2 seed) {
  return fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
}

float grip(vec2 mid) {
  float span = smoothstep(0.0, uReach, length(mid - uFocus));
  return 1.0 - mix(span, sqrt(span), 0.2);
}

float lidY(vec2 cell) {
  vec2 mid = cell * uCell + uCell * 0.5;
  float far = length(mid - uFocus);
  if (far >= uReach) return uRest;
  float span = smoothstep(0.0, uReach, far);
  float hold = 1.0 - mix(span, sqrt(span), 0.2);
  float wob = sin(hash21(cell * 0.001) * TAU + uTime * (2.0 + far * 0.015));
  return uRest + (uLift + wob * uAmp) * hold;
}

vec3 paint(vec3 n, vec2 mid, float hit) {
  float lambert = dot(uSun, n) * 0.5 + 0.5;
  vec3 flank = mix(uSide, uFace, smoothstep(0.35, 0.65, abs(n.z)));
  vec3 tone = mix(flank * lambert, uTop, smoothstep(0.35, 0.65, n.y));
  tone = mix(tone, uAccent * (0.28 + lambert * 0.82), grip(mid) * uAccentMix);
  return mix(tone, uBack, smoothstep(uNear, uFar, hit));
}

bool ledge(vec3 rd, vec3 inv, vec2 dir, float lo, float hi, out vec3 hue) {
  if (rd.y > -1e-4) return false;
  float tp = (uRest - uEye.y) * inv.y;
  if (tp <= lo || tp >= hi) return false;

  vec3 p = uEye + rd * tp;
  vec2 off = mod(p.xz, uCell) - uCell * 0.5;
  vec2 loc = abs(off);
  float wall = uCell * 0.5 * (1.0 - uGap);
  vec2 mid = p.xz - off;

  if (max(loc.x, loc.y) <= wall) {
    hue = paint(vec3(0.0, 1.0, 0.0), mid, tp);
  } else {
    vec3 n = loc.x > loc.y
      ? vec3(-dir.x, 0.0, 0.0)
      : vec3(0.0, 0.0, -dir.y);
    hue = paint(n, mid, tp);
  }
  return true;
}

#ifdef ROUND
float tile(vec3 p, float wall, float top) {
  vec3 d;
  d.x = abs(p.x) - wall + uRound;
  d.z = abs(p.z) - wall + uRound;
  d.y = p.y - top + uRound;
  vec3 q = max(d, 0.0);
  float body =
    length(q) - uRound + min(max(d.x, max(d.y, d.z)), 0.0);
  return max(body, top - 0.7 - p.y);
}

vec3 tileNormal(vec3 p, float wall, float top) {
  vec2 e = vec2(1.0, -1.0) * 0.0005;
  return normalize(
    e.xyy * tile(p + e.xyy, wall, top) +
    e.yyx * tile(p + e.yyx, wall, top) +
    e.yxy * tile(p + e.yxy, wall, top) +
    e.xxx * tile(p + e.xxx, wall, top)
  );
}
#endif

vec3 trace(vec2 uv) {
  vec3 rd = normalize(uRight * uv.x + uUp * uv.y + uFwd * uZoom);
  vec3 inv = 1.0 / (max(abs(rd), vec3(1e-5)) * (step(0.0, rd) * 2.0 - 1.0));
  vec2 dir = step(0.0, rd.xz) * 2.0 - 1.0;

  float t = 0.0;
  if (uEye.y > uCeil) {
    if (rd.y > -1e-4) return uBack;
    t = (uEye.y - uCeil) * -inv.y;
  }
  if (t >= uFar) return uBack;

  vec2 oc = uEye.xz - uFocus;
  float ax = dot(rd.xz, rd.xz);
  float bx = dot(oc, rd.xz);
  float cx = dot(oc, oc) - uReach * uReach;
  float root = bx * bx - ax * cx;

  float lit = uFar;
  float dim = uFar;
  if (root > 0.0 && ax > 1e-9) {
    float sq = sqrt(root);
    lit = max(t, (-bx - sq) / ax);
    dim = min(uFar, (-bx + sq) / ax);
  }

  vec3 hue;
  float root0 = t;
  if (lit > t && ledge(rd, inv, dir, t, min(lit, uFar), hue)) return hue;
  if (dim <= lit) {
    if (ledge(rd, inv, dir, root0, uFar, hue)) return hue;
    return uBack;
  }

  t = lit;
  vec2 cell = floor((uEye.xz + rd.xz * t) / uCell);
  vec2 gate = ((cell + step(0.0, rd.xz)) * uCell - uEye.xz) * inv.xz;
  vec2 pace = uCell * abs(inv.xz);
  float wall = uCell * 0.5 * (1.0 - uGap);

  for (int i = 0; i < STEPS; i++) {
    float leave = min(gate.x, gate.y);
    vec2 mid = cell * uCell + uCell * 0.5;
    float top = lidY(cell);

    vec3 lo = vec3(mid.x - wall, top - 0.7, mid.y - wall);
    vec3 hi = vec3(mid.x + wall, top, mid.y + wall);
    vec3 a = (lo - uEye) * inv;
    vec3 b = (hi - uEye) * inv;
    vec3 lip = min(a, b);
    vec3 out1 = max(a, b);
    float tin = max(max(lip.x, lip.y), lip.z);
    float tout = min(min(out1.x, out1.y), out1.z);

    if (tout >= tin && tout > t && tin < leave && tin < uFar) {
#ifdef ROUND
      float edge = min(min(tout, leave), uFar);
      float walk = max(tin, t);
      vec3 seat = vec3(mid.x, 0.0, mid.y);
      for (int k = 0; k < 24; k++) {
        if (walk > edge) break;
        float gapTo = tile(uEye + rd * walk - seat, wall, top);
        if (gapTo < 0.0003) {
          vec3 n = tileNormal(uEye + rd * walk - seat, wall, top);
          return paint(n, mid, walk);
        }
        walk += max(gapTo, 0.0002);
      }
#else
      float peak = max(max(lip.x, lip.y), lip.z);
      vec3 axis = vec3(0.0, 1.0, 0.0);
      if (peak > lip.y + uCell * 0.03) {
        axis = lip.x >= lip.z ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0);
      }
      vec3 n = -vec3(dir.x, rd.y >= 0.0 ? 1.0 : -1.0, dir.y) * axis;
      return paint(n, mid, max(tin, t));
#endif
    }

    t = leave;
    if (t >= dim) break;
    float pick = step(gate.x, gate.y);
    cell += dir * vec2(pick, 1.0 - pick);
    gate += pace * vec2(pick, 1.0 - pick);
  }

  if (ledge(rd, inv, dir, root0, uFar, hue)) return hue;
  return uBack;
}

void main() {
  vec2 base = (vUv * uSize * 2.0 - uSize) / min(uSize.x, uSize.y);
  float pix = 2.0 / min(uSize.x, uSize.y);

  vec3 sum = vec3(0.0);
  for (int j = 0; j < AA; j++) {
    for (int i = 0; i < AA; i++) {
      vec2 jitter = (vec2(float(i), float(j)) + 0.5) / float(AA) - 0.5;
      sum += trace(base + jitter * pix);
    }
  }
  sum /= float(AA * AA);

  vec3 shown = max(mix(uBack, sum, uReveal), 0.0);
  vec3 curve = mix(
    shown * 12.92,
    1.055 * pow(shown, vec3(0.4166667)) - 0.055,
    step(vec3(0.0031308), shown)
  );
  gl_FragColor = vec4(clamp(curve, 0.0, 1.0), 1.0);
}
`},[e,d]);return(0,o.D)((e,i)=>{let n=Math.min(i,.05),[o,c,m]=z(n);j.current+=(1-j.current)*Math.min(2.6*n,1);let p=R.current?.uniforms;p&&(p.uSize.value.set(Math.max(t.w,1),Math.max(t.h,1)),p.uEye.value.set(a[0],a[1],a[2]),p.uRight.value.set(u.right[0],u.right[1],u.right[2]),p.uUp.value.set(u.up[0],u.up[1],u.up[2]),p.uFwd.value.set(u.fwd[0],u.fwd[1],u.fwd[2]),p.uZoom.value=l,p.uTime.value=o*C,p.uFocus.value.set(c,m),p.uCell.value=r,p.uGap.value=s,p.uRound.value=d,p.uAmp.value=f,p.uLift.value=v,p.uReach.value=h,p.uCeil.value=x,p.uNear.value=g,p.uFar.value=y,p.uReveal.value=j.current,p.uTop.value.set(b.top[0],b.top[1],b.top[2]),p.uSide.value.set(b.side[0],b.side[1],b.side[2]),p.uFace.value.set(b.face[0],b.face[1],b.face[2]),p.uAccent.value.set(b.accent[0],b.accent[1],b.accent[2]),p.uAccentMix.value=w,p.uBack.value.set(b.back[0],b.back[1],b.back[2]))}),(0,n.useEffect)(()=>{let e=1e3/Math.max(1,S),t=Math.min(4,.5*e),a=0,i=0,n=u=>{a=requestAnimationFrame(n),u-i<e-t||(i=u,M())};return a=requestAnimationFrame(n),()=>cancelAnimationFrame(a)},[M,S]),(0,i.jsxs)("mesh",{frustumCulled:!1,children:[(0,i.jsx)("planeGeometry",{args:[1,1]}),(0,i.jsx)("shaderMaterial",{ref:R,vertexShader:p,fragmentShader:E,uniforms:k[0],depthTest:!1,depthWrite:!1},E)]})},h=({color:e="#0a0a0a",accent:t="#de7dfa",background:a="#0a0a0a",relief:u=0,accentStrength:l=.85,cellSize:r=.06,gap:o=0,rounding:c=.1,amplitude:p=.05,lift:h=.06,liftRadius:x=.6,speed:g=.6,zoom:y=4,orbit:b=45,distance:w=1.5,altitude:C=1,haze:S=1,samples:z=2,dpr:M=1,maxFps:R=60,drift:j=.28,ease:k=.1,interactive:E=!0,paused:F=!1,className:A,style:P,children:N})=>{let q=(0,n.useRef)(null),T=(0,n.useRef)(0),L=(0,n.useRef)({x:0,z:0,live:!1}),B=(0,n.useRef)({x:0,z:0}),U=(0,n.useRef)({left:0,top:0,width:1,height:1}),I=(0,n.useRef)(!1),[H,D]=(0,n.useState)({w:0,h:0}),[O,G]=(0,n.useState)(!1),W=(0,n.useMemo)(()=>{let e=b*Math.PI/180,t=Math.max(.2,w);return[Math.sin(e)*t,Math.max(.15,C),Math.cos(e)*t]},[b,w,C]),_=(0,n.useMemo)(()=>{let e=0-W[0],t=.2-W[1],a=0-W[2],i=Math.hypot(e,t,a)||1,n=[e/i,t/i,a/i],u=Math.hypot(-n[2],0,n[0])||1,l=[-n[2]/u,0,n[0]/u],r=l[1]*n[2]-l[2]*n[1],o=l[2]*n[0]-l[0]*n[2],s=l[0]*n[1]-l[1]*n[0],c=Math.hypot(r,o,s)||1;return{right:l,up:[r/c,o/c,s/c],fwd:n}},[W]),Y=(0,n.useMemo)(()=>{let i=f(e),n=f(a),l=f(t),r=m(u,0,1),o=.2126*n[0]+.7152*n[1]+.0722*n[2]<.16,s=e=>[0,1,2].map(t=>o?i[t]+(1-i[t])*r*e*.075:Math.max(0,i[t]*(1-r*e*.64)));return{top:i,side:s(1),face:s(o?.52:1.56),accent:l,back:n}},[e,t,a,u]);(0,n.useEffect)(()=>{let e=q.current;if(e){if("undefined"!=typeof ResizeObserver){let t=new ResizeObserver(([t])=>{U.current=e.getBoundingClientRect(),D({w:Math.round(t.contentRect.width),h:Math.round(t.contentRect.height)})});return t.observe(e),()=>t.disconnect()}D({w:e.clientWidth,h:e.clientHeight})}},[]),(0,n.useEffect)(()=>{let e=q.current;if(!e||"undefined"==typeof IntersectionObserver){let e=requestAnimationFrame(()=>G(!0));return()=>cancelAnimationFrame(e)}let t=new IntersectionObserver(([e])=>G(e.isIntersecting),{rootMargin:"160px"});return t.observe(e),()=>t.disconnect()},[]),(0,n.useEffect)(()=>{let e=q.current;if(!e)return;let t=()=>{U.current=e.getBoundingClientRect()};return t(),window.addEventListener("scroll",t,{passive:!0,capture:!0}),window.addEventListener("resize",t,{passive:!0}),()=>{window.removeEventListener("scroll",t,{capture:!0}),window.removeEventListener("resize",t)}},[]),(0,n.useEffect)(()=>{if(!window.matchMedia)return;let e=window.matchMedia("(prefers-reduced-motion: reduce)"),t=()=>{I.current=e.matches};return t(),e.addEventListener("change",t),()=>e.removeEventListener("change",t)},[]);let Z=(0,n.useCallback)((e,t)=>{let a=_.right[0]*e+_.up[0]*t+_.fwd[0]*y,i=_.right[1]*e+_.up[1]*t+_.fwd[1]*y,n=_.right[2]*e+_.up[2]*t+_.fwd[2]*y,u=Math.hypot(a,i,n)||1,l=Math.min(i/u,-.001),r=m((.14-W[1])/l,0,40);return[W[0]+a/u*r,W[2]+n/u*r]},[_,y,W]);(0,n.useEffect)(()=>{let e=q.current;if(!e||!E)return;let t=e=>{let t=U.current,a=Math.max(Math.min(t.width,t.height),1),[i,n]=Z(((e.clientX-t.left)*2-t.width)/a,(t.height-(e.clientY-t.top)*2)/a);L.current.x=i,L.current.z=n,L.current.live=!0},a=()=>{L.current.live=!1};return e.addEventListener("pointermove",t),e.addEventListener("pointerleave",a),e.addEventListener("pointercancel",a),()=>{e.removeEventListener("pointermove",t),e.removeEventListener("pointerleave",a),e.removeEventListener("pointercancel",a)}},[E,Z]);let X=(0,n.useCallback)(e=>{F||I.current||(T.current+=e);let t=L.current,a=B.current;if(!t.live){let e=.55*T.current;t.x=Math.sin(1.3*e)*j,t.z=Math.cos(1.7*e)*j}let i=1-Math.pow(1-m(k,.01,1),60*e);return a.x+=(t.x-a.x)*i,a.z+=(t.z-a.z)*i,[T.current,a.x,a.z]},[F,j,k]),V=(0,n.useMemo)(()=>{let e=.5*Math.max(.008,r)*(1-m(o,0,.6));return m(c,0,1)*Math.min(e,.34)*.98},[r,o,c]),$=(0,n.useMemo)(()=>{let e=Math.hypot(W[0],W[1],W[2]),t=3.4*e,a=.5*e,i=a+(t-a)*(1-m(S,0,1));return{far:t,near:Math.min(i,.8*t),ceiling:.13+Math.max(0,h)+Math.max(0,p)}},[W,S,h,p]);return(0,i.jsxs)("div",{ref:q,className:(0,d.cn)("relative overflow-hidden",A),style:P,children:[(0,i.jsx)("div",{className:"absolute inset-0",children:O&&H.w>0?(0,i.jsx)(s.Hl,{orthographic:!0,camera:{position:[0,0,1],zoom:1},dpr:m(M,.75,2),gl:{antialias:!1,alpha:!1,depth:!1,stencil:!1,powerPreference:"high-performance"},frameloop:"demand",children:(0,i.jsx)(v,{samples:Math.round(m(z,1,3)),size:H,eye:W,basis:_,zoom:Math.max(.5,y),cell:Math.max(.008,r),gap:m(o,0,.6),round:V,amplitude:p,lift:h,liftRadius:Math.max(.02,x),ceiling:$.ceiling,near:$.near,far:$.far,tones:Y,accentMix:m(l,0,1),speed:g,maxFps:R,advance:X})}):null}),N?(0,i.jsx)("div",{className:"pointer-events-none relative z-10 h-full w-full",children:N}):null]})},x=()=>{let[e,t]=(0,r.I)(),{resolvedTheme:a}=(0,u.D)(),[o,s]=(0,n.useState)(null),[c,d]=(0,n.useState)("#de7dfa"),[m,f]=(0,n.useState)(null),[p,v]=(0,n.useState)(0),[x,g]=(0,n.useState)(.85),[y,b]=(0,n.useState)(.06),[w,C]=(0,n.useState)(0),[S,z]=(0,n.useState)(.1),[M,R]=(0,n.useState)(.05),[j,k]=(0,n.useState)(.06),[E,F]=(0,n.useState)(.6),[A,P]=(0,n.useState)(.6),[N,q]=(0,n.useState)(4),[T,L]=(0,n.useState)(45),[B,U]=(0,n.useState)(1.5),[I,H]=(0,n.useState)(1),[D,O]=(0,n.useState)(1),[G,W]=(0,n.useState)(2),[_,Y]=(0,n.useState)(1),[Z,X]=(0,n.useState)(60),[V,$]=(0,n.useState)(.28),[J,K]=(0,n.useState)(.1),[Q,ee]=(0,n.useState)(!0),[et,ea]=(0,n.useState)(!1),ei="dark"===a,en=(0,n.useMemo)(()=>null!==m?m:ei?"#0a0a0a":"#ffffff",[ei,m]),eu=(0,n.useMemo)(()=>null!==o?o:ei?"#0a0a0a":"#ffffff",[ei,o]);return(0,i.jsxs)("div",{children:[(0,i.jsx)(l.Bg,{}),(0,i.jsxs)(l.VX,{children:[(0,i.jsxs)(l.Ec,{children:[(0,i.jsx)(l.Ch,{onRefresh:t,minHeight:520,children:(0,i.jsx)("div",{className:"relative h-full w-full",children:(0,i.jsx)(h,{className:"h-full w-full",color:eu,relief:p,accent:c,background:en,accentStrength:x,cellSize:y,gap:w,rounding:S,amplitude:M,lift:j,liftRadius:E,speed:A,zoom:N,orbit:T,distance:B,altitude:I,haze:D,samples:G,dpr:_,maxFps:Z,drift:V,ease:J,interactive:Q,paused:et},e)})}),(0,i.jsxs)(l.IH,{children:[(0,i.jsx)(l.W7,{title:"Color",value:eu,onChange:s}),(0,i.jsx)(l.W7,{title:"Accent",value:c,onChange:d}),(0,i.jsx)(l.W7,{title:"Background",value:en,onChange:f}),(0,i.jsx)(l.yt,{title:"Relief",min:0,max:1,step:.05,value:p,onChange:v}),(0,i.jsx)(l.yt,{title:"Accent Strength",min:0,max:1,step:.05,value:x,onChange:g}),(0,i.jsx)(l.yt,{title:"Cell Size",min:.02,max:.09,step:.002,value:y,onChange:e=>{b(e),t()}}),(0,i.jsx)(l.yt,{title:"Gap",min:0,max:.5,step:.01,value:w,onChange:C}),(0,i.jsx)(l.yt,{title:"Rounding",min:0,max:1,step:.05,value:S,onChange:z}),(0,i.jsx)(l.yt,{title:"Amplitude",min:0,max:.16,step:.005,value:M,onChange:R}),(0,i.jsx)(l.yt,{title:"Lift",min:0,max:.2,step:.005,value:j,onChange:k}),(0,i.jsx)(l.yt,{title:"Lift Radius",min:.05,max:1.2,step:.05,value:E,onChange:F}),(0,i.jsx)(l.yt,{title:"Speed",min:0,max:3,step:.1,value:A,onChange:P}),(0,i.jsx)(l.yt,{title:"Zoom",min:1.5,max:6,step:.1,value:N,onChange:q}),(0,i.jsx)(l.yt,{title:"Orbit",min:0,max:90,step:1,value:T,onChange:L}),(0,i.jsx)(l.yt,{title:"Distance",min:.8,max:3,step:.02,value:B,onChange:U}),(0,i.jsx)(l.yt,{title:"Altitude",min:.3,max:2.2,step:.02,value:I,onChange:H}),(0,i.jsx)(l.yt,{title:"Haze",min:0,max:1,step:.05,value:D,onChange:O}),(0,i.jsx)(l.yt,{title:"Samples",min:1,max:3,step:1,value:G,onChange:W}),(0,i.jsx)(l.yt,{title:"DPR",min:.75,max:2,step:.05,value:_,onChange:Y}),(0,i.jsx)(l.yt,{title:"Max FPS",min:24,max:60,step:1,value:Z,onChange:X}),(0,i.jsx)(l.yt,{title:"Drift",min:0,max:.8,step:.02,value:V,onChange:$}),(0,i.jsx)(l.yt,{title:"Ease",min:.02,max:.5,step:.01,value:J,onChange:K}),(0,i.jsx)(l.tl,{title:"Interactive",checked:Q,onChange:ee}),(0,i.jsx)(l.tl,{title:"Paused",checked:et,onChange:ea})]}),(0,i.jsx)(l.Ub,{data:[{name:"color",type:"string",default:'"#0a0a0a"',description:"Base tile colour, darkened automatically on side faces."},{name:"relief",type:"number",default:"0",description:"How much darker the side faces read than the tops."},{name:"accent",type:"string",default:'"#de7dfa"',description:"Colour blended into tiles nearest the cursor."},{name:"background",type:"string",default:'"#0a0a0a"',description:"Backdrop colour the grid fades into."},{name:"accentStrength",type:"number",default:"0.85",description:"How strongly the accent tints lifted tiles."},{name:"cellSize",type:"number",default:"0.06",description:"Width of one grid cell in world units."},{name:"rounding",type:"number",default:"0.1",description:"Rounds the top corners of the tiles, 0 keeps them square."},{name:"gap",type:"number",default:"0.08",description:"Fraction of each cell left empty as a seam."},{name:"amplitude",type:"number",default:"0.05",description:"Height of the idle bobbing near the cursor."},{name:"lift",type:"number",default:"0.06",description:"Steady rise applied to tiles under the cursor."},{name:"liftRadius",type:"number",default:"0.6",description:"Radius of the cursor's influence."},{name:"speed",type:"number",default:"0.6",description:"Multiplier for the bobbing rate."},{name:"zoom",type:"number",default:"4",description:"Lens length; higher flattens the perspective."},{name:"orbit",type:"number",default:"45",description:"Camera angle around the grid in degrees."},{name:"distance",type:"number",default:"1.5",description:"Camera distance from the centre."},{name:"altitude",type:"number",default:"1",description:"Camera height above the grid."},{name:"haze",type:"number",default:"1",description:"How much of the depth fades into the background."},{name:"samples",type:"number",default:"2",description:"Anti-aliasing grid: 1, 2 or 3 rays per axis."},{name:"dpr",type:"number",default:"1",description:"Pixel ratio ceiling."},{name:"maxFps",type:"number",default:"60",description:"Upper bound on rendered frames per second."},{name:"drift",type:"number",default:"0.28",description:"Radius of the idle orbit used before the cursor arrives."},{name:"ease",type:"number",default:"0.1",description:"How quickly the focus catches up to the cursor."},{name:"interactive",type:"boolean",default:"true",description:"Let the pointer steer the raised region."},{name:"paused",type:"boolean",default:"false",description:"Freeze the animation clock."},{name:"className",type:"string",default:'""',description:"Classes applied to the wrapper."},{name:"children",type:"ReactNode",default:"undefined",description:"Overlay content rendered above the grid."}]})]}),(0,i.jsx)(l.lT,{children:(0,i.jsx)(l.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>o.CodeExample,lT:()=>i.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>d.CopyButton,IH:()=>u.Customize,gI:()=>p,Dn:()=>h,pi:()=>v,W7:()=>l.PreviewColor,Ch:()=>n.PreviewContainer,UD:()=>l.PreviewInput,bg:()=>l.PreviewSelect,yt:()=>l.PreviewSlider,tl:()=>l.PreviewSwitch,Ec:()=>i.PreviewTab,Ub:()=>r.PropTable,VX:()=>i.TabsLayout,bs:()=>f});var i=a(55019);a(27382);var n=a(10236),u=a(69485),l=a(48543),r=a(87552);a(39260);var o=a(52407),s=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),m=a(90650);let f="rounded-lg border bg-background";function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,m.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function v({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,m.cn)(f,e),...a,children:t})}function h({title:e,description:t,className:a,children:i}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:i})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>n});var i=a(12115);function n(){let[e,t]=(0,i.useState)(0),a=(0,i.useCallback)(()=>{t(e=>e+1)},[]);return(0,i.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);