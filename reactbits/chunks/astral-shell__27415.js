"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[27415],{27415:(e,t,a)=>{a.r(t),a.d(t,{default:()=>B});var n=a(95155),r=a(12115),i=a(86049),l=a(56388),o=a(90761),s=a(81712),u=a(3907),d=a(2253),c=a(90650);let h=["#7C6BFF","#FFE6FA"],p=`
uniform float uClock;
uniform float uDepthFade;
uniform vec4 uPulseTime;
uniform vec3 uPulseOrigin[4];
uniform float uPulseSpeed;

float pulseGlow(vec3 direction) {
  float glow = 0.0;
  for (int k = 0; k < 4; k++) {
    float age = uClock - uPulseTime[k];
    if (age < 0.0 || age > 12.0) continue;
    float travelled = acos(clamp(dot(direction, uPulseOrigin[k]), -1.0, 1.0));
    float front = age * uPulseSpeed - travelled;
    glow += exp(-front * front * 60.0) * exp(-age * 0.38);
  }
  return glow;
}
`,m=`
${p}
uniform float uTime;
uniform float uWorldRadius;
uniform vec2 uPointer;
uniform float uHover;
uniform float uHoverRadius;
uniform float uAspect;

void shellLight(vec4 mv, out vec4 clip, out float depthLight, out float hover, out float front) {
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float facing = clamp((mv.z - center.z) / max(uWorldRadius, 1e-4), -1.0, 1.0);
  front = smoothstep(-0.6, 0.6, facing);
  float rim = 1.0 - abs(facing);
  depthLight = mix(1.0 - uDepthFade, 1.0, front) * (1.0 + rim * rim * 0.45);
  clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 delta = (ndc - uPointer) * vec2(uAspect, 1.0);
  hover = exp(-dot(delta, delta) / max(uHoverRadius * uHoverRadius, 1e-4)) * uHover * front;
}
`,v=`
${m}

attribute float aDegree;
attribute float aSeed;

uniform float uSize;
uniform float uPixelRatio;

varying float vBright;
varying float vHeat;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 clip;
  float depthLight;
  float hover;
  float front;
  shellLight(mv, clip, depthLight, hover, front);
  float pulse = pulseGlow(normalize(position)) * mix(1.0 - uDepthFade * 0.8, 1.0, front);
  float hub = min(aDegree / 6.0, 1.0);
  float twinkle = 0.78 + 0.22 * sin(uTime * (0.5 + aSeed * 1.3) + aSeed * 40.0);
  vHeat = clamp(hover * 0.9 + pulse, 0.0, 1.0);
  vBright = depthLight * (0.5 + 0.5 * hub) * twinkle + hover * 1.1 + pulse * 1.3;
  gl_Position = clip;
  vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float scale = center.z / min(mv.z, -1e-3);
  gl_PointSize = uSize * uPixelRatio * scale * (0.65 + 0.7 * hub) * (1.0 + vHeat * 0.7);
}
`,f=`
precision highp float;

uniform vec3 uBase;
uniform vec3 uHot;
uniform float uInk;

varying float vBright;
varying float vHeat;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float disc = 1.0 - smoothstep(0.35, 1.0, r);
  float amount = disc * vBright;
  if (amount < 0.003) discard;
  vec3 color = mix(uBase, uHot, clamp(vHeat + 0.25, 0.0, 1.0));
  if (uInk > 0.5) {
    float alpha = clamp(amount * 0.9, 0.0, 1.0);
    gl_FragColor = vec4(color * alpha, alpha);
  } else {
    gl_FragColor = vec4(color * amount, clamp(amount, 0.0, 1.0));
  }
}
`,g=`
${m}

attribute float aLength;

uniform float uReach;
uniform float uLineOpacity;

varying float vBright;
varying float vHover;
varying float vFront;
varying float vSpan;
varying vec3 vDirection;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec4 clip;
  float depthLight;
  float hover;
  float front;
  shellLight(mv, clip, depthLight, hover, front);
  float span = 1.0 - smoothstep(uReach * 0.35, uReach, aLength);
  vBright = depthLight * uLineOpacity * (0.35 + 0.65 * span) + hover * 0.55;
  vHover = hover;
  vFront = front;
  vSpan = mix(0.55, 1.0, span);
  vDirection = position;
  gl_Position = clip;
}
`,x=`
precision highp float;

${p}

uniform vec3 uBase;
uniform vec3 uHot;
uniform float uInk;
uniform float uLineGain;

varying float vBright;
varying float vHover;
varying float vFront;
varying float vSpan;
varying vec3 vDirection;

void main() {
  float pulse = pulseGlow(normalize(vDirection)) * mix(1.0 - uDepthFade * 0.8, 1.0, vFront);
  float heat = clamp(vHover * 0.8 + pulse, 0.0, 1.0);
  vec3 color = mix(uBase, uHot, heat);
  float amount = (vBright + pulse * 0.8) * vSpan * uLineGain;
  if (uInk > 0.5) {
    float alpha = clamp(amount * 0.85, 0.0, 1.0);
    gl_FragColor = vec4(color * alpha, alpha);
  } else {
    gl_FragColor = vec4(color * amount, clamp(amount, 0.0, 1.0));
  }
}
`,y=(e,t,a)=>Math.min(a,Math.max(t,e)),b=e=>e*Math.PI/180,w=e=>{let t=e.trim().toLowerCase();return"transparent"===t||(/^#[0-9a-f]{8}$/.test(t)?t.endsWith("00"):/^#[0-9a-f]{4}$/.test(t)?t.endsWith("0"):null!==t.match(/^(?:rgba?|hsla?)\(.*[,/]\s*(0|0?\.0+|0%)\s*\)$/))},S=new d.Q1f,C=(e,t,a)=>{let n=t.trim();try{S.set(/^#[0-9a-f]{8}$/i.test(n)?n.slice(0,7):n)}catch{S.set(a)}let r={r:0,g:0,b:0};return S.getRGB(r,d.er$),e.set(r.r,r.g,r.b)},M=e=>{let t=window.matchMedia("(min-resolution: 2dppx)");return t.addEventListener("change",e),window.addEventListener("resize",e),()=>{t.removeEventListener("change",e),window.removeEventListener("resize",e)}},k=()=>window.devicePixelRatio||1,F=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},P=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,j=(e,t,a)=>{let n=Math.hypot(e,t,a)||1;return[e/n,t/n,a/n]},L=e=>{let t=2*e()-1,a=e()*Math.PI*2,n=Math.sqrt(1-t*t);return[n*Math.cos(a),n*Math.sin(a),t]},A=(e,t,a)=>{let n=()=>Math.sqrt(-2*Math.log(Math.max(a(),1e-6)))*Math.cos(2*Math.PI*a());return j(e[0]+n()*t,e[1]+n()*t,e[2]+n()*t)},H=(e,t,a)=>{let n=Math.acos(y(e[0]*t[0]+e[1]*t[1]+e[2]*t[2],-1,1));if(n<1e-4)return e.slice();let r=Math.sin(n),i=Math.sin((1-a)*n)/r,l=Math.sin(a*n)/r;return j(e[0]*i+t[0]*l,e[1]*i+t[1]*l,e[2]*i+t[2]*l)},R=({settings:e,pointerRef:t,wakeRef:a})=>{let{size:i,invalidate:l}=(0,s.C)(),o=(0,r.useRef)(null),u=(0,r.useRef)(null),c=(0,r.useRef)(null),p=(0,r.useRef)({time:0,clock:0,quaternion:new d.PTz,spinVelocity:new d.I9Y,lastDragX:0,lastDragY:0,dragging:!1,hover:0,pointerX:9,pointerY:9,presses:0,pulseTimes:[-99,-99,-99,-99],pulseOrigins:Array.from({length:4},()=>new d.Pq0(0,0,1)),nextPulse:0,lean:new d.I9Y}),m=(0,r.useMemo)(()=>({axis:new d.Pq0,turn:new d.PTz,base:new d.PTz,point:new d.Pq0,euler:new d.O9p,raycaster:new d.tBo,ndc:new d.I9Y,sphere:new d.iyt,inverse:new d.PTz}),[]),M=(0,r.useMemo)(()=>({uTime:{value:0},uClock:{value:0},uWorldRadius:{value:1},uDepthFade:{value:.7},uPointer:{value:new d.I9Y(9,9)},uHover:{value:0},uHoverRadius:{value:.22},uAspect:{value:1},uPulseTime:{value:new d.IUQ(-99,-99,-99,-99)},uPulseOrigin:{value:Array.from({length:4},()=>new d.Pq0(0,0,1))},uPulseSpeed:{value:1.2},uSize:{value:3},uPixelRatio:{value:1},uReach:{value:.3},uLineOpacity:{value:.5},uLineGain:{value:1},uBase:{value:new d.Pq0},uHot:{value:new d.Pq0},uInk:{value:0}}),[]),k=Math.round(y(e.nodes,100,2500)),F=Math.round(y(e.connections,1,8)),P=y(e.reach,.05,1),j=y(e.clustering,0,1),R=y(e.chords,0,2),E=(0,r.useMemo)(()=>((e,t,a,n,r,i)=>{let l,o=(l=(0x2545f491^Math.floor(9973*(i+.37)))>>>0,()=>{let e=l=l+0x6d2b79f5>>>0;return e=Math.imul(e^e>>>15,1|e),(((e^=e+Math.imul(e^e>>>7,61|e))^e>>>14)>>>0)/0x100000000}),s=[],u=Math.max(8,Math.round(e/90));for(let e=0;e<u;e++)s.push(L(o));let d=[];for(let e=0;e<u;e++){let t=s.map((t,a)=>({j:a,d:a===e?1/0:1-(t[0]*s[e][0]+t[1]*s[e][1]+t[2]*s[e][2])})).sort((e,t)=>e.d-t.d);for(let a=0;a<3;a++){let n=t[a].j;d.some(([t,a])=>t===e&&a===n||t===n&&a===e)||d.push([e,n])}}let c=1-.85*y(n,0,1),h=new Float32Array(3*e);for(let t=0;t<e;t++){let e,a=o();if(a<c)e=L(o);else if(a<c+(1-c)*.35)e=A(s[Math.floor(o()*s.length)],.07+.06*o(),o);else{let[t,a]=d[Math.floor(o()*d.length)];e=A(H(s[t],s[a],o()),.018+.02*o(),o)}h.set(e,3*t)}let p=Math.max(a,.05),m=new Map,v=(e,t,a)=>`${Math.floor(e/p)},${Math.floor(t/p)},${Math.floor(a/p)}`;for(let t=0;t<e;t++){let e=v(h[3*t],h[3*t+1],h[3*t+2]),a=m.get(e);a?a.push(t):m.set(e,[t])}let f=new Float32Array(e),g=new Set,x=[],b=[],w=a*a,S=[],C=(t,a,n,r)=>{let i=t<a?t*e+a:a*e+t;!g.has(i)&&(g.add(i),x.push(t,a),b.push(n),r&&(f[t]+=1,f[a]+=1))};for(let a=0;a<e;a++){S.length=0;let e=h[3*a],n=h[3*a+1],r=h[3*a+2],i=Math.floor(e/p),l=Math.floor(n/p),o=Math.floor(r/p);for(let t=i-1;t<=i+1;t++)for(let i=l-1;i<=l+1;i++)for(let l=o-1;l<=o+1;l++){let o=m.get(`${t},${i},${l}`);if(o)for(let t of o){if(t===a)continue;let i=h[3*t]-e,l=h[3*t+1]-n,o=h[3*t+2]-r,s=i*i+l*l+o*o;s<w&&S.push({j:t,d:s})}}S.sort((e,t)=>e.d-t.d);for(let e=0;e<Math.min(t,S.length);e++)C(a,S[e].j,Math.sqrt(S[e].d),!0)}let M=Math.round(e*y(r,0,2));for(let t=0;t<M;t++){let t=Math.floor(o()*e);for(let a=0;a<6;a++){let a=Math.floor(o()*e);if(a===t)continue;let n=Math.hypot(h[3*a]-h[3*t],h[3*a+1]-h[3*t+1],h[3*a+2]-h[3*t+2]);if(n>.45&&n<1.6){C(t,a,n,!1);break}}}let k=new Float32Array(e);for(let t=0;t<e;t++)k[t]=o();return{points:h,degree:f,seeds:k,edges:Uint32Array.from(x),lengths:Float32Array.from(b)}})(k,F,P,j,R,e.seed),[k,F,P,j,R,e.seed]),D=(0,r.useMemo)(()=>{let e=new d.LoY;e.setAttribute("position",new d.THS(E.points,3)),e.setAttribute("aDegree",new d.THS(E.degree,1)),e.setAttribute("aSeed",new d.THS(E.seeds,1)),e.boundingSphere=new d.iyt(new d.Pq0,2);let t=E.edges.length/2,a=new Float32Array(6*t),n=new Float32Array(2*t);for(let e=0;e<t;e++){let t=E.edges[2*e],r=E.edges[2*e+1];a.set(E.points.subarray(3*t,3*t+3),6*e),a.set(E.points.subarray(3*r,3*r+3),6*e+3),n[2*e]=E.lengths[e],n[2*e+1]=E.lengths[e]}let r=new d.LoY;return r.setAttribute("position",new d.THS(a,3)),r.setAttribute("aLength",new d.THS(n,1)),r.boundingSphere=new d.iyt(new d.Pq0,2),{nodes:e,lines:r}},[E]),[Y,T]=e.colors,{backgroundColor:B}=e;return(0,r.useEffect)(()=>()=>{D.nodes.dispose(),D.lines.dispose()},[D]),(0,r.useEffect)(()=>(a.current=l,()=>{a.current=null}),[l,a]),(0,r.useEffect)(()=>{let e=u.current;if(!e)return;let t=e.uniforms;C(t.uBase.value,Y??h[0],h[0]),C(t.uHot.value,T??Y??h[1],h[1]);let a=w(B);S.set(a?"#000000":B);let n=.2126*S.r+.7152*S.g+.0722*S.b,r=!a&&n>.35;for(let e of(t.uInk.value=+!!r,[u.current,c.current]))e&&(e.blending=d.bCz,e.blendEquation=d.gO9,e.blendSrc=d.qad,e.blendDst=r?d.OuU:d.qad,e.blendSrcAlpha=d.qad,e.blendDstAlpha=d.OuU,e.needsUpdate=!0);l()},[Y,T,B,l]),(0,r.useEffect)(()=>{l()},[e,i,l]),(0,s.D)((a,n)=>{let r=o.current,s=u.current;if(!r||!s)return;let d=s.uniforms,c=p.current,h=t.current,v=Math.min(Math.max(n,0),.05),f=!e.paused&&!e.reduced;f&&(c.time+=v),e.reduced||(c.clock+=v);let g=i.width/Math.max(i.height,1),x=a.camera,w=x.position.z*Math.tan(b(35)/2),S=2*y(e.radius,.05,1.5)*w;r.position.set((y(e.originX,-.5,1.5)-.5)*2*w*g,(y(e.originY,-.5,1.5)-.5)*2*w,0),r.scale.setScalar(S);let C=e.draggable&&e.interactive&&h.down;if(C){c.dragging||(c.lastDragX=h.dragX,c.lastDragY=h.dragY,c.spinVelocity.set(0,0));let e=h.dragX-c.lastDragX,t=h.dragY-c.lastDragY;c.lastDragX=h.dragX,c.lastDragY=h.dragY;let a=1/Math.max(v,1/240);c.spinVelocity.set(3.2*e*a*.35,3.2*t*a*.35),m.axis.set(0,1,0),m.turn.setFromAxisAngle(m.axis,3.2*e),c.quaternion.premultiply(m.turn),m.axis.set(1,0,0),m.turn.setFromAxisAngle(m.axis,-(3.2*t)),c.quaternion.premultiply(m.turn)}else{let t=Math.exp(-(1.6*v));if(c.spinVelocity.multiplyScalar(t),m.axis.set(0,1,0),m.turn.setFromAxisAngle(m.axis,c.spinVelocity.x*v),c.quaternion.premultiply(m.turn),m.axis.set(1,0,0),m.turn.setFromAxisAngle(m.axis,-c.spinVelocity.y*v),c.quaternion.premultiply(m.turn),f){let t=.11*y(e.spin,-4,4);m.axis.set(.18,1,.08).normalize(),m.turn.setFromAxisAngle(m.axis,t*v),c.quaternion.premultiply(m.turn)}}c.dragging=C,c.quaternion.normalize();let M=e.interactive&&!e.reduced&&h.inside,k=M?(h.x-.5)*2:0,F=M?(h.y-.5)*2:0,j=1-Math.exp(-(2.4*v));c.lean.x+=(k-c.lean.x)*j,c.lean.y+=(F-c.lean.y)*j,m.euler.set(b(y(e.tilt,-90,90))-.12*c.lean.y,.16*c.lean.x,0),m.base.setFromEuler(m.euler),r.quaternion.copy(m.base).multiply(c.quaternion),r.updateMatrixWorld();let L=M&&!C?1:0;if(c.hover+=(L-c.hover)*(1-Math.exp(-(5*v))),M){let e=1-Math.exp(-(14*v));c.pointerX>5&&(c.pointerX=h.x,c.pointerY=h.y),c.pointerX+=(h.x-c.pointerX)*e,c.pointerY+=(h.y-c.pointerY)*e}else c.hover<.002&&(c.pointerX=9,c.pointerY=9);if(h.presses!==c.presses&&(c.presses=h.presses,e.clickPulse&&e.interactive&&!e.reduced&&h.travel<.02)){m.ndc.set(h.pressX,h.pressY),m.raycaster.setFromCamera(m.ndc,x),m.sphere.set(r.position,S);let e=m.raycaster.ray;e.intersectSphere(m.sphere,m.point)||e.closestPointToPoint(r.position,m.point),m.point.sub(r.position).normalize(),m.inverse.copy(r.quaternion).invert(),m.point.applyQuaternion(m.inverse);let t=c.nextPulse;c.nextPulse=(c.nextPulse+1)%4,c.pulseOrigins[t].copy(m.point),c.pulseTimes[t]=c.clock}let A=y(e.pulseSpeed,.1,5),H=Math.PI/A+1,R=!1;for(let e=0;e<4;e++)c.clock-c.pulseTimes[e]<H&&(R=!0),d.uPulseOrigin.value[e].copy(c.pulseOrigins[e]);d.uTime.value=c.time,d.uClock.value=c.clock,d.uWorldRadius.value=S,d.uDepthFade.value=y(e.depthFade,0,1),d.uPointer.value.set(2*c.pointerX-1,2*c.pointerY-1),d.uHover.value=c.hover*y(e.hoverBoost,0,3),d.uHoverRadius.value=y(e.hoverRadius,.02,1),d.uAspect.value=g,d.uPulseTime.value.set(c.pulseTimes[0],c.pulseTimes[1],c.pulseTimes[2],c.pulseTimes[3]),d.uPulseSpeed.value=A,d.uSize.value=3.2*y(e.nodeSize,0,4),d.uPixelRatio.value=a.viewport.dpr,d.uLineGain.value=1+(Math.max(a.viewport.dpr,1)-1)*.85,d.uReach.value=P,d.uLineOpacity.value=y(e.lineOpacity,0,2);let E=C||R||c.spinVelocity.lengthSq()>1e-6||Math.abs(c.hover-L)>.002||Math.abs(c.lean.x-k)>.001||Math.abs(c.lean.y-F)>.001;!f&&E&&l()}),(0,n.jsxs)("group",{ref:o,children:[(0,n.jsx)("lineSegments",{geometry:D.lines,frustumCulled:!1,children:(0,n.jsx)("shaderMaterial",{ref:c,vertexShader:g,fragmentShader:x,uniforms:M,transparent:!0,depthTest:!1,depthWrite:!1})}),(0,n.jsx)("points",{geometry:D.nodes,frustumCulled:!1,children:(0,n.jsx)("shaderMaterial",{ref:u,vertexShader:v,fragmentShader:f,uniforms:M,transparent:!0,depthTest:!1,depthWrite:!1})})]})},E=({colors:e=h,backgroundColor:t="#0a0a0a",nodes:a=2400,connections:i=4,reach:l=.2,clustering:o=.85,chords:s=.35,radius:d=.4,originX:p=.5,originY:m=.5,lineOpacity:v=.7,nodeSize:f=.8,depthFade:g=.7,spin:x=1,tilt:y=18,interactive:b=!0,draggable:S=!0,hoverRadius:C=.22,hoverBoost:j=1,clickPulse:L=!0,pulseSpeed:A=1.2,seed:H=0,paused:E=!1,dpr:D=2,className:Y,style:T,children:B})=>{let X=(0,r.useRef)(null),z=(0,r.useRef)({x:.5,y:.5,inside:!1,down:!1,lastClientX:0,lastClientY:0,dragX:0,dragY:0,presses:0,pressX:0,pressY:0,travel:0}),I=(0,r.useRef)(null),[q,O]=(0,r.useState)(!0),N=(0,r.useSyncExternalStore)(F,P,()=>!1),V=Math.min((0,r.useSyncExternalStore)(M,k,()=>1),Math.max(D,.5)),$=!E&&!N,W=w(t);return(0,r.useEffect)(()=>{let e=X.current;if(!e||"undefined"==typeof IntersectionObserver)return;let t=new IntersectionObserver(([e])=>O(e.isIntersecting),{rootMargin:"80px"});return t.observe(e),()=>t.disconnect()},[]),(0,r.useEffect)(()=>{let e=X.current;if(!e)return;let t=t=>{let a=e.getBoundingClientRect(),n=z.current;return n.x=(t.clientX-a.left)/Math.max(a.width,1),n.y=1-(t.clientY-a.top)/Math.max(a.height,1),n.inside=!0,a},a=e=>{let a=t(e),n=z.current;if(n.down){let t=1/Math.max(a.height,1),r=(e.clientX-n.lastClientX)*t,i=(e.clientY-n.lastClientY)*t;n.dragX+=r,n.dragY+=i,n.travel+=Math.hypot(r,i)}n.lastClientX=e.clientX,n.lastClientY=e.clientY,I.current?.()},n=e=>{t(e);let a=z.current;a.down=!0,a.travel=0,a.lastClientX=e.clientX,a.lastClientY=e.clientY,I.current?.()},r=e=>{let t=z.current;t.down&&t.travel<.02&&(t.pressX=2*t.x-1,t.pressY=2*t.y-1,t.presses+=1),t.down=!1,"mouse"!==e.pointerType&&(t.inside=!1),I.current?.()},i=()=>{let e=z.current;e.inside=!1,e.down=!1,I.current?.()};return e.addEventListener("pointermove",a,{passive:!0}),e.addEventListener("pointerdown",n,{passive:!0}),e.addEventListener("pointerup",r,{passive:!0}),e.addEventListener("pointerleave",i,{passive:!0}),e.addEventListener("pointercancel",i,{passive:!0}),()=>{e.removeEventListener("pointermove",a),e.removeEventListener("pointerdown",n),e.removeEventListener("pointerup",r),e.removeEventListener("pointerleave",i),e.removeEventListener("pointercancel",i)}},[]),(0,n.jsxs)("div",{ref:X,className:(0,c.cn)("relative isolate overflow-hidden",Y),style:{backgroundColor:W?void 0:t,touchAction:S&&b?"none":void 0,...T},children:[(0,n.jsx)("div",{className:"absolute inset-0","aria-hidden":"true",children:(0,n.jsx)(u.Hl,{dpr:V,frameloop:q&&$?"always":"demand",camera:{fov:35,near:.1,far:100,position:[0,0,10]},gl:{antialias:!0,alpha:!0,premultipliedAlpha:!0,powerPreference:"high-performance"},style:{pointerEvents:"none"},children:(0,n.jsx)(R,{settings:{colors:e,backgroundColor:t,nodes:a,connections:i,reach:l,clustering:o,chords:s,radius:d,originX:p,originY:m,lineOpacity:v,nodeSize:f,depthFade:g,spin:x,tilt:y,interactive:b,draggable:S,hoverRadius:C,hoverBoost:j,clickPulse:L,pulseSpeed:A,seed:H,paused:E,reduced:N},pointerRef:z,wakeRef:I})})}),B?(0,n.jsx)("div",{className:"relative z-10 h-full w-full",children:B}):null]})},D={violet:{colors:["#7C6BFF","#FFE6FA"],background:"#0a0a0a"},cyan:{colors:["#1FB8D0","#D8FBFF"],background:"#0a0a0a"},mono:{colors:["#8A8A99","#FFFFFF"],background:"#0a0a0a"},rose:{colors:["#D9468F","#FFE3F1"],background:"#0a0a0a"},ink:{colors:["#3A1DB8","#C026D3"],background:"#FAFAFA"},lilac:{colors:["#6D5BC0","#3A1DB8"],background:"#F6F3FF"}},Y=[{label:"Violet",value:"violet"},{label:"Cyan",value:"cyan"},{label:"Mono",value:"mono"},{label:"Rose",value:"rose"},{label:"Ink",value:"ink"},{label:"Lilac",value:"lilac"}],T=[{name:"colors",type:"string[]",default:'["#7C6BFF", "#FFE6FA"]',description:"Two colours: the network itself, then the highlight that tints hubs, the pointer's glow and click pulses."},{name:"backgroundColor",type:"string",default:'"#0a0a0a"',description:'Colour behind the globe. Light backgrounds switch to ink lines. Pass "transparent" to show the page.'},{name:"nodes",type:"number",default:"2400",description:"Number of stars on the shell, from 100 to 2500."},{name:"connections",type:"number",default:"4",description:"Lines drawn from each star to its nearest neighbours, from 1 to 8."},{name:"reach",type:"number",default:"0.2",description:"Longest neighbour line, relative to the globe's radius. Longer lines draw fainter."},{name:"clustering",type:"number",default:"0.85",description:"0 scatters the stars evenly; 1 gathers them into constellations joined by filaments."},{name:"chords",type:"number",default:"0.35",description:"Long lines cutting through the globe, as a share of the star count. 0 keeps only the surface web."},{name:"radius",type:"number",default:"0.4",description:"Radius of the globe, as a fraction of the height."},{name:"originX",type:"number",default:"0.5",description:"Horizontal position of the centre, from 0 (left) to 1 (right)."},{name:"originY",type:"number",default:"0.5",description:"Vertical position of the centre, from 0 (bottom) to 1 (top). Values outside 0–1 let it rise from an edge."},{name:"lineOpacity",type:"number",default:"0.7",description:"Brightness of the connecting lines."},{name:"nodeSize",type:"number",default:"0.8",description:"Size of the stars. Hubs draw slightly larger."},{name:"depthFade",type:"number",default:"0.7",description:"How much the far side of the globe dims. 0 draws both sides equally."},{name:"spin",type:"number",default:"1",description:"Speed and direction of the slow rotation. 0 holds it still."},{name:"tilt",type:"number",default:"18",description:"Forward tilt of the globe, in degrees."},{name:"interactive",type:"boolean",default:"true",description:"Turns every pointer effect on or off: the highlight, the lean, dragging and click pulses."},{name:"draggable",type:"boolean",default:"true",description:"Drag to spin the globe. It keeps its momentum and settles back to its spin."},{name:"hoverRadius",type:"number",default:"0.22",description:"Size of the area the pointer lights, relative to the height."},{name:"hoverBoost",type:"number",default:"1",description:"Strength of the pointer highlight. 0 disables it."},{name:"clickPulse",type:"boolean",default:"true",description:"Each click sends a pulse from the point you clicked across the whole globe. Rapid clicks stack."},{name:"pulseSpeed",type:"number",default:"1.2",description:"How fast pulses travel around the globe."},{name:"seed",type:"number",default:"0",description:"Changes the arrangement of the stars."},{name:"paused",type:"boolean",default:"false",description:"Stops the rotation and the twinkle. Dragging and pulses still work."},{name:"dpr",type:"number",default:"2",description:"Upper bound for the device pixel ratio."},{name:"className",type:"string",default:"—",description:"Classes for the root element. Give it a height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."},{name:"children",type:"ReactNode",default:"—",description:"Content layered above the globe."}],B=()=>{let[e,t]=(0,o.I)(),a=(0,i.Y)(),[s,u]=(0,r.useState)(null),d=s??("dark"===a?"violet":"ink"),[c,h]=(0,r.useState)({}),p={...D[d]??D.violet,...c},[m,v]=(0,r.useState)(2400),[f,g]=(0,r.useState)(4),[x,y]=(0,r.useState)(.2),[b,w]=(0,r.useState)(.85),[S,C]=(0,r.useState)(.35),[M,k]=(0,r.useState)(.4),[F,P]=(0,r.useState)(.5),[j,L]=(0,r.useState)(.5),[A,H]=(0,r.useState)(.7),[R,B]=(0,r.useState)(.8),[X,z]=(0,r.useState)(.7),[I,q]=(0,r.useState)(1),[O,N]=(0,r.useState)(18),[V,$]=(0,r.useState)(.22),[W,_]=(0,r.useState)(1),[G,U]=(0,r.useState)(1.2),[Q,J]=(0,r.useState)(0),[K,Z]=(0,r.useState)(!0),[ee,et]=(0,r.useState)(!0),[ea,en]=(0,r.useState)(!0),[er,ei]=(0,r.useState)(!1),el=e=>t=>h(a=>{let n=[...a.colors??p.colors];return n[e]=t,{...a,colors:n}});return(0,n.jsxs)("div",{children:[(0,n.jsx)(l.Bg,{}),(0,n.jsxs)(l.VX,{children:[(0,n.jsxs)(l.Ec,{children:[(0,n.jsx)(l.Ch,{onRefresh:t,minHeight:600,children:(0,n.jsx)("div",{className:"relative h-full w-full",children:(0,n.jsx)(E,{className:"h-full w-full",colors:p.colors,backgroundColor:p.background,nodes:m,connections:f,reach:x,clustering:b,chords:S,radius:M,originX:F,originY:j,lineOpacity:A,nodeSize:R,depthFade:X,spin:I,tilt:O,interactive:K,draggable:ee,hoverRadius:V,hoverBoost:W,clickPulse:ea,pulseSpeed:G,seed:Q,paused:er},e)})}),(0,n.jsxs)(l.IH,{children:[(0,n.jsx)(l.bg,{title:"Preset",value:d,options:Y,onChange:e=>{u(e),h({})}}),(0,n.jsx)(l.W7,{title:"Background",value:p.background,onChange:e=>h(t=>({...t,background:e}))}),(0,n.jsx)(l.W7,{title:"Network",value:p.colors[0],onChange:el(0)}),(0,n.jsx)(l.W7,{title:"Highlight",value:p.colors[1],onChange:el(1)}),(0,n.jsx)(l.yt,{title:"Nodes",min:100,max:2500,step:50,value:m,onChange:v}),(0,n.jsx)(l.yt,{title:"Connections",min:1,max:8,step:1,value:f,onChange:g}),(0,n.jsx)(l.yt,{title:"Reach",min:.05,max:.5,step:.01,value:x,onChange:y}),(0,n.jsx)(l.yt,{title:"Clustering",min:0,max:1,step:.01,value:b,onChange:w}),(0,n.jsx)(l.yt,{title:"Chords",min:0,max:1.5,step:.05,value:S,onChange:C}),(0,n.jsx)(l.yt,{title:"Radius",min:.1,max:1.2,step:.01,value:M,onChange:k}),(0,n.jsx)(l.yt,{title:"Origin X",min:0,max:1,step:.01,value:F,onChange:P}),(0,n.jsx)(l.yt,{title:"Origin Y",min:-.5,max:1.5,step:.01,value:j,onChange:L}),(0,n.jsx)(l.yt,{title:"Line Opacity",min:0,max:2,step:.05,value:A,onChange:H}),(0,n.jsx)(l.yt,{title:"Node Size",min:0,max:3,step:.05,value:R,onChange:B}),(0,n.jsx)(l.yt,{title:"Depth Fade",min:0,max:1,step:.01,value:X,onChange:z}),(0,n.jsx)(l.yt,{title:"Spin",min:-3,max:3,step:.05,value:I,onChange:q}),(0,n.jsx)(l.yt,{title:"Tilt",min:-60,max:60,step:1,value:O,valueUnit:"\xb0",onChange:N}),(0,n.jsx)(l.yt,{title:"Hover Radius",min:.05,max:.6,step:.01,value:V,onChange:$}),(0,n.jsx)(l.yt,{title:"Hover Boost",min:0,max:3,step:.05,value:W,onChange:_}),(0,n.jsx)(l.yt,{title:"Pulse Speed",min:.2,max:4,step:.05,value:G,onChange:U}),(0,n.jsx)(l.yt,{title:"Seed",min:0,max:20,step:1,value:Q,onChange:J}),(0,n.jsx)(l.tl,{title:"Interactive",checked:K,onChange:Z}),(0,n.jsx)(l.tl,{title:"Draggable",checked:ee,onChange:et}),(0,n.jsx)(l.tl,{title:"Click Pulse",checked:ea,onChange:en}),(0,n.jsx)(l.tl,{title:"Paused",checked:er,onChange:ei})]}),(0,n.jsx)(l.Ub,{data:T})]}),(0,n.jsx)(l.lT,{children:(0,n.jsx)(l.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>n.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>c.CopyButton,IH:()=>i.Customize,gI:()=>m,Dn:()=>f,pi:()=>v,W7:()=>l.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>l.PreviewInput,bg:()=>l.PreviewSelect,yt:()=>l.PreviewSlider,tl:()=>l.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>o.PropTable,VX:()=>n.TabsLayout,bs:()=>p});var n=a(55019);a(27382);var r=a(10236),i=a(69485),l=a(48543),o=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var d=a(95155);a(66729);var c=a(28592),h=a(90650);let p="rounded-lg border bg-background";function m({className:e,children:t,...a}){return(0,d.jsx)("div",{className:(0,h.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function v({className:e,children:t,...a}){return(0,d.jsx)("div",{className:(0,h.cn)(p,e),...a,children:t})}function f({title:e,description:t,className:a,children:n}){return(0,d.jsxs)("section",{className:a,children:[(0,d.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,d.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,d.jsx)("div",{className:"mt-6",children:n})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>o});var n=a(12115),r=a(30701);let i=()=>()=>{},l=()=>"light";function o(){let{resolvedTheme:e}=(0,r.D)();return(0,n.useSyncExternalStore)(i,()=>"dark"===e?"dark":"light",l)}},90761:(e,t,a)=>{a.d(t,{I:()=>r});var n=a(12115);function r(){let[e,t]=(0,n.useState)(0),a=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);