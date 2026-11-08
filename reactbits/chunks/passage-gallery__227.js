"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[227],{227:(e,t,a)=>{a.r(t),a.d(t,{default:()=>A});var l=a(95155),n=a(12115),o=a(56388),i=a(86049),r=a(90761),s=a(12246),u=a(2253),c=a(90650);let d=[{src:"/demo-media/abstract-fuchsia-wave.webp",alt:"Broad fuchsia S-shaped band with a coral gradient across deep plum",title:"Fuchsia wave"},{src:"/demo-media/abstract-coral-fold.webp",alt:"Broad vermilion and orange folded plane over deep plum with fine grain",title:"Coral fold"},{src:"/demo-media/abstract-rose-balance.webp",alt:"Tilted raspberry rounded rectangle and tangerine disc on a rose-pink field",title:"Rose balance"},{src:"/demo-media/abstract-violet-steps.webp",alt:"Three interlocking violet and pink stepped planes with an amber edge",title:"Violet steps"},{src:"/demo-media/abstract-plum-ribbon.webp",alt:"Intersecting pink and plum diagonal ribbons on a coral-magenta field",title:"Plum ribbon"},{src:"/demo-media/abstract-orchid-orbit.webp",alt:"Fuchsia ring and peach crescent on a grainy orchid-purple field",title:"Orchid orbit"},{src:"/demo-media/abstract-amber-loop.webp",alt:"Tilted golden-amber loop on a grainy raspberry-purple field",title:"Amber loop"},{src:"/demo-media/abstract-pink-eclipse.webp",alt:"Coral-pink disc crossing a violet diagonal plane on a grainy purple field",title:"Pink eclipse"}],p=(e,t,a)=>Math.min(a,Math.max(t,e)),v=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},h=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,m={position:"absolute",width:1,height:1,padding:0,margin:-1,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0},f={position:"absolute",inset:0,touchAction:"pan-y",userSelect:"none",WebkitUserSelect:"none",WebkitTouchCallout:"none",outline:"none"},g={position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"},w=`
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,x=`
precision highp float;

uniform vec2 uResolution;
uniform mat4 uCameraMatrix;
uniform mat4 uProjectionInverse;
uniform vec2 uHalf;
uniform float uTravel;
uniform float uShutter;
uniform float uSamples;
uniform float uGap;
uniform float uRadius;
uniform float uLineOpacity;
uniform vec3 uLineColor;
uniform float uFogLength;
uniform vec4 uBackground;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform sampler2D uAtlas;
uniform sampler2D uCells;
uniform vec2 uGrid;
uniform float uInset;
uniform float uLoaded[48];
uniform vec4 uHover;
uniform vec4 uHoverOut;
uniform vec4 uFocus;
uniform float uDim;
uniform float uDpr;

const float PERIOD = 2048.0;

vec3 toOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  l = pow(max(l, 0.0), 1.0 / 3.0);
  m = pow(max(m, 0.0), 1.0 / 3.0);
  s = pow(max(s, 0.0), 1.0 / 3.0);
  return vec3(
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  );
}

vec3 fromOklab(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

bool sameCell(vec4 slot, float wall, float lane, float row) {
  return abs(slot.x - wall) < 0.5 && abs(slot.y - lane) < 0.5 && abs(slot.z - row) < 0.5;
}

vec4 surface(float wall, vec2 cont, vec2 fw, vec2 gx, vec2 gy) {
  float lane = floor(cont.x);
  float row = mod(floor(cont.y), PERIOD);
  vec2 cell = fract(cont);
  vec2 edge = min(cell, 1.0 - cell) / max(fw, vec2(1e-5));
  float cellPx = 1.0 / max(max(fw.x, fw.y), 1e-5);
  float width = 0.5 * uDpr;
  float line = 1.0 - smoothstep(width - 0.5, width + 0.5, min(edge.x, edge.y));
  line *= smoothstep(4.0, 16.0, cellPx / uDpr) * uLineOpacity;
  vec4 result = vec4(uLineColor * line, line);
  int index = (int(row) * 4 + int(wall)) * 16 + int(clamp(lane, 0.0, 15.0));
  vec4 info = texelFetch(uCells, ivec2(index % 512, index / 512), 0);
  float kind = floor(info.r * 255.0 + 0.5);
  if (kind < 0.5) return result;
  float hover = 0.0;
  if (sameCell(uHover, wall, lane, row)) hover = uHover.w;
  if (sameCell(uHoverOut, wall, lane, row)) hover = max(hover, uHoverOut.w);
  float vacant = sameCell(uFocus, wall, lane, row) ? uFocus.w : 0.0;
  float halfSize = 0.5 - uGap * 0.5;
  float grow = hover * min(uGap * 0.35, 0.03);
  vec2 local = cell - 0.5;
  float d = roundBox(local, vec2(halfSize + grow), min(uRadius * 0.5, halfSize));
  float aa = max(fw.x, fw.y) * 0.75;
  float cover = (1.0 - smoothstep(-aa, aa, d)) * (1.0 - vacant);
  vec3 color;
  if (kind < 1.5) {
    float which = floor(info.g * 255.0 + 0.5);
    float span = 2.0 * (halfSize + grow);
    vec2 uv = local / span + 0.5;
    vec2 dx = gx / span;
    vec2 dy = gy / span;
    if (wall > 0.5 && wall < 1.5) {
      uv.y = 1.0 - uv.y;
    } else if (wall > 1.5 && wall < 2.5) {
      uv = uv.yx;
      dx = dx.yx;
      dy = dy.yx;
    } else if (wall > 2.5) {
      uv = vec2(1.0 - uv.y, uv.x);
      dx = dx.yx;
      dy = dy.yx;
    }
    uv = clamp(uv, 0.0, 1.0);
    vec2 slot = vec2(mod(which, uGrid.x), floor(which / uGrid.x));
    float inner = 1.0 - 2.0 * uInset;
    vec2 atlasUv = vec2(
      (slot.x + uInset + uv.x * inner) / uGrid.x,
      1.0 - (slot.y + uInset + (1.0 - uv.y) * inner) / uGrid.y
    );
    vec2 scale = vec2(inner) / uGrid;
    vec3 image = textureGrad(uAtlas, atlasUv, dx * scale, dy * scale).rgb;
    float loaded = uLoaded[int(which)];
    vec3 placeholder = mix(uBackground.rgb, uLineColor, 0.06);
    color = mix(placeholder, image, loaded) * (0.88 + 0.22 * hover);
  } else {
    vec2 uv = local / (2.0 * halfSize) + 0.5;
    float t = clamp(info.b * 0.55 + (uv.x * 0.6 + uv.y * 0.4) * 0.45, 0.0, 1.0);
    color = toSrgb(max(fromOklab(mix(toOklab(uColorA), toOklab(uColorB), t)), 0.0));
    color *= 0.86 + 0.18 * hover;
  }
  return vec4(color * cover, cover) + result * (1.0 - cover);
}

void main() {
  vec2 ndc = gl_FragCoord.xy / uResolution * 2.0 - 1.0;
  vec4 view = uProjectionInverse * vec4(ndc, 1.0, 1.0);
  vec3 dir = normalize((uCameraMatrix * vec4(view.xyz / view.w, 0.0)).xyz);
  vec3 origin = uCameraMatrix[3].xyz;
  vec2 reach = max(abs(dir.xy), vec2(1e-6));
  float tx = (uHalf.x - sign(dir.x) * origin.x) / reach.x;
  float ty = (uHalf.y - sign(dir.y) * origin.y) / reach.y;
  float t = min(tx, ty);
  vec3 hit = origin + dir * t;
  float wall;
  vec2 cont;
  if (tx < ty) {
    wall = dir.x > 0.0 ? 3.0 : 2.0;
    cont = vec2(hit.y + uHalf.y, uTravel - hit.z);
  } else {
    wall = dir.y > 0.0 ? 1.0 : 0.0;
    cont = vec2(hit.x + uHalf.x, uTravel - hit.z);
  }
  vec2 gx = dFdx(cont);
  vec2 gy = dFdy(cont);
  vec2 fw = sqrt(gx * gx + gy * gy);
  float count = max(uSamples, 1.0);
  float jitter = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  vec4 content = vec4(0.0);
  for (int i = 0; i < 12; i++) {
    if (float(i) >= count) break;
    float offset = count > 1.0 ? ((float(i) + jitter) / count - 0.5) * uShutter : 0.0;
    content += surface(wall, cont + vec2(0.0, offset), fw, gx, gy);
  }
  content /= count;
  float haze = 1.0 - exp(-pow(t / uFogLength, 1.5));
  content *= (1.0 - haze) * (1.0 - uDim);
  float alpha = content.a + uBackground.a * (1.0 - content.a);
  vec3 color = content.rgb + uBackground.rgb * uBackground.a * (1.0 - content.a);
  gl_FragColor = vec4(color, alpha);
}
`,y=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,b=`
precision highp float;

uniform sampler2D uImage;
uniform float uImageAspect;
uniform float uPlaneAspect;
uniform float uRadius;
uniform float uOpacity;
uniform float uShade;
varying vec2 vUv;

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uPlaneAspect, 1.0);
  float d = roundBox(p, vec2(uPlaneAspect, 1.0) * 0.5, uRadius);
  float aa = fwidth(d);
  float cover = 1.0 - smoothstep(-aa, aa, d);
  vec2 uv = vUv - 0.5;
  if (uPlaneAspect < uImageAspect) {
    uv.x *= uPlaneAspect / uImageAspect;
  } else {
    uv.y *= uImageAspect / uPlaneAspect;
  }
  vec3 color = texture2D(uImage, uv + 0.5).rgb * uShade;
  float alpha = cover * uOpacity;
  gl_FragColor = vec4(color * alpha, alpha);
}
`,F=(e,t,a,l)=>{let n=2*Math.PI/Math.max(l,.02),o=Math.max(1,Math.ceil(a/(1/120))),i=a/o;for(let a=0;a<o;a++){let a=n*n*(t-e.value)-2*n*e.velocity;e.velocity+=a*i,e.value+=e.velocity*i}return Math.abs(t-e.value)>1e-4||Math.abs(e.velocity)>1e-4},C=(0,n.forwardRef)(function({items:e=d,colors:t=["#5227FF","#FF9FFC"],backgroundColor:a="#0a0a0a",lanes:o=5,gap:i=.1,radius:r=.06,photoFill:C=.3,accentFill:M=.06,lineOpacity:k=.12,fog:S=1,speed:A=.6,boost:j=10,blur:I=1,look:P=1,fov:O=72,hover:L=1,focusOnClick:E=!0,captions:R=!0,wheel:H=!0,interactive:T=!0,seed:B=0,paused:q=!1,dpr:D=2,ariaLabel:z="Photo tunnel. Scroll or drag to travel, hold to speed up, click a photo to view it.",onFocusChange:G,className:U,style:Y,children:W},N){let X=(0,n.useRef)(null),_=(0,n.useRef)(null),Q=(0,n.useRef)(null),V=(0,n.useSyncExternalStore)(v,h,()=>!1),[$,Z]=(0,n.useState)(-1),[K,J]=(0,n.useState)(!1),ee=e.length?e:d,et=(0,n.useRef)(ee),ea={items:ee,colors:t,backgroundColor:a,lanes:o,gap:i,radius:r,photoFill:C,accentFill:M,lineOpacity:k,fog:S,speed:A,boost:j,blur:I,look:P,fov:O,hover:L,focusOnClick:E,captions:R,wheel:H,interactive:T,seed:B,paused:q,dpr:D,onFocusChange:G,reduced:V},el=(0,n.useRef)(ea);(0,n.useEffect)(()=>{el.current=ea,et.current=ee,Q.current?.sync()}),(0,n.useEffect)(()=>{let e=X.current,t=_.current;if(!e||!t)return;let a=((e,t,a,l,n)=>{let o,i=e.ownerDocument,r=i.createElement("canvas");r.style.cssText="position:absolute;inset:0;width:100%;height:100%;display:block";try{o=new s.WebGLRenderer({canvas:r,alpha:!0,antialias:!1,premultipliedAlpha:!0,powerPreference:"high-performance"})}catch{return null}t.appendChild(r),o.setClearColor(0,0);let c=Array(48).fill(0),d={uResolution:{value:new u.I9Y(1,1)},uCameraMatrix:{value:new u.kn4},uProjectionInverse:{value:new u.kn4},uHalf:{value:new u.I9Y(2.5,1.5)},uTravel:{value:0},uShutter:{value:0},uSamples:{value:1},uGap:{value:.1},uRadius:{value:.06},uLineOpacity:{value:.12},uLineColor:{value:new u.Q1f(1,1,1)},uFogLength:{value:12},uBackground:{value:new u.IUQ(0,0,0,1)},uColorA:{value:new u.Q1f},uColorB:{value:new u.Q1f},uAtlas:{value:null},uCells:{value:null},uGrid:{value:new u.I9Y(1,1)},uInset:{value:.004},uLoaded:{value:c},uHover:{value:new u.IUQ(-9,-9,-9,0)},uHoverOut:{value:new u.IUQ(-9,-9,-9,0)},uFocus:{value:new u.IUQ(-9,-9,-9,0)},uDim:{value:0},uDpr:{value:1}},v=new u.BKk({uniforms:d,vertexShader:w,fragmentShader:x,depthTest:!1,depthWrite:!1,blending:u.XIg}),h={uImage:{value:null},uImageAspect:{value:1},uPlaneAspect:{value:1},uRadius:{value:.05},uOpacity:{value:1},uShade:{value:1}},m=new u.BKk({uniforms:h,vertexShader:y,fragmentShader:b,transparent:!0,premultipliedAlpha:!0,depthTest:!1,depthWrite:!1}),f=new u.Z58,g=new u.ubm(72,1,.05,400);g.rotation.order="YXZ";let C=new u.bdM(2,2),M=new u.eaF(C,v);M.frustumCulled=!1,M.renderOrder=0;let k=new u.bdM(1,1),S=new u.eaF(k,m);S.frustumCulled=!1,S.renderOrder=1,S.visible=!1,f.add(M,S);let A=new Uint8Array(524288),j=new u.GYF(A,512,256,u.GWd,u.OUM);j.minFilter=u.hxR,j.magFilter=u.hxR,j.generateMipmaps=!1,d.uCells.value=j;let I=null,P=null,O=[],L=new Map,E="",R="",H=512,T=1,B=1,q=1,D=2.5,z=1.5,G=5,U=3,Y=0,W=0,N=!1,X=!1,_=!1,Q=0,V=0,$="",Z={value:0,velocity:0},K={value:0,velocity:0},J={value:0,velocity:0},ee={value:0,velocity:0},et={value:0,velocity:0},ea={value:0,velocity:0},el={value:0,velocity:0},en={value:0,velocity:0},eo={value:0,velocity:0},ei={x:0,y:0,inside:!1},er=null,es=!1,eu=0,ec=0,ed=-1e9,ep=null,ev=null,eh=Array(48).fill(0),em=(e,t,a)=>{try{a.set(e)}catch{a.set(t)}return a},ef=()=>{let e=a.current,t=`${e.colors[0]}|${e.colors[1]}|${e.backgroundColor}`;if(t===$)return!1;$=t,em(e.colors[0],"#5227FF",d.uColorA.value),em(e.colors[1],"#FF9FFC",d.uColorB.value);let l=e.backgroundColor.trim().toLowerCase(),n="transparent"===l||""===l,o=new u.Q1f(657930);n||em(e.backgroundColor,"#0a0a0a",o);let i={r:0,g:0,b:0};o.getRGB(i,u.er$),d.uBackground.value.set(i.r,i.g,i.b,+!n);let r=.2126*o.r+.7152*o.g+.0722*o.b,s=!n&&r>.35;return d.uLineColor.value.setRGB(+!s,+!s,+!s),!0},eg=()=>{let e,t=a.current,n=Math.min(l.current.length,48),o=[t.photoFill,t.accentFill,t.seed,n].join("|");if(o===R)return!1;R=o;let i=(e=Math.imul(Math.floor(131*t.seed+17)+7,0x9e3779b1)>>>0||1,()=>(e^=e<<13,e^=e>>>17,e^=e<<5,(e>>>=0)/0x100000000)),r=p(t.photoFill,0,1),s=p(t.accentFill,0,1-r),u=[],c=e=>{if(!u.length){u=Array.from({length:n},(e,t)=>t);for(let e=u.length-1;e>0;e--){let t=Math.floor(i()*(e+1));[u[e],u[t]]=[u[t],u[e]]}}for(let t=u.length-1;t>=0;t--)if(!e.has(u[t])||n<=e.size)return u.splice(t,1)[0];return u.pop()??0},d=[];for(let e=0;e<2048;e++)for(let t=0;t<4;t++)for(let a=0;a<16;a++){let l=((4*e+t)*16+a)*4|0,o=i(),u=i();if(n>0&&o<r){let e=c(new Set(d));d.push(e),d.length>Math.min(6,Math.max(0,n-2))&&d.shift(),A[l]=1,A[l+1]=e,A[l+2]=0}else o<r+s?(A[l]=2,A[l+1]=0,A[l+2]=Math.round(255*u)):(A[l]=0,A[l+1]=0,A[l+2]=0);A[l+3]=255}return j.needsUpdate=!0,!0},ew=()=>{L.forEach(e=>e.dispose()),L.clear(),P?.dispose(),P=null,I=null,O=[]},ex=()=>{let e=l.current.slice(0,48),t=e.map(e=>e.src).join("\0");if(t===E)return;E=t,ew(),c.fill(0),eh.fill(0);let a=Math.max(e.length,1);H=a<=12?640:a<=24?512:384;let n=Math.ceil(Math.sqrt(a)),r=Math.ceil(a/n);(I=i.createElement("canvas")).width=n*H,I.height=r*H;let s=I.getContext("2d");s&&(s.fillStyle="#000",s.fillRect(0,0,I.width,I.height)),(P=new u.GOR(I)).colorSpace=u.jf0,P.minFilter=u.$_I,P.magFilter=u.k6q,P.generateMipmaps=!0,P.anisotropy=o.capabilities.getMaxAnisotropy(),d.uAtlas.value=P,d.uGrid.value.set(n,r),d.uInset.value=1.5/H;let p=I;O=e.map((e,t)=>{let a=new Image;return a.crossOrigin="anonymous",a.decoding="async",a.onload=()=>{if(X||I!==p||!s)return;let e=Math.min(a.naturalWidth,a.naturalHeight),l=(a.naturalWidth-e)/2,o=(a.naturalHeight-e)/2,i=t%n,r=Math.floor(t/n);s.drawImage(a,l,o,e,e,i*H,r*H,H,H),P&&(P.needsUpdate=!0),eh[t]=1,eI()},a.src=e.src,a})},ey=()=>{let t=a.current,l=e.getBoundingClientRect(),n=Math.min(window.devicePixelRatio||1,Math.max(t.dpr,.5)),i=Math.max(1,Math.round(l.width)),r=Math.max(1,Math.round(l.height));return(i!==T||r!==B||n!==q)&&(T=i,B=r,q=n,o.setPixelRatio(q),o.setSize(T,B,!1),d.uResolution.value.set(T*q,B*q),d.uDpr.value=q,!0)},eb=()=>12/p(a.current.fog,.05,4)*Math.max(1,Math.hypot(D,z)/2.9),eF=()=>{G=p(Math.round(a.current.lanes),2,16),U=p(Math.round(G/Math.max(T/B,.2)),2,16),D=G/2,z=U/2,d.uHalf.value.set(D,z)},eC=(e,t,a)=>{let l=Y-(a+.5),n=new u.Pq0,o=new u.Pq0,i=new u.Pq0,r=new u.Pq0;return 0===e?(n.set(t+.5-D,-z+.002,l),o.set(1,0,0),i.set(0,0,-1),r.set(0,1,0)):1===e?(n.set(t+.5-D,z-.002,l),o.set(1,0,0),i.set(0,0,1),r.set(0,-1,0)):2===e?(n.set(-D+.002,t+.5-z,l),o.set(0,0,-1),i.set(0,1,0),r.set(1,0,0)):(n.set(D-.002,t+.5-z,l),o.set(0,0,1),i.set(0,1,0),r.set(-1,0,0)),{position:n,quaternion:new u.PTz().setFromRotationMatrix(new u.kn4().makeBasis(o,i,r))}},eM=(e,t)=>{var l;let n,o,i,s,c=r.getBoundingClientRect(),d=new u.Pq0((e-c.left)/c.width*2-1,-((t-c.top)/c.height*2-1),.5);d.unproject(g);let v=g.position,h=d.sub(v).normalize(),m=Math.max(Math.abs(h.x),1e-6),f=Math.max(Math.abs(h.y),1e-6),w=(D-Math.sign(h.x)*v.x)/m,x=(z-Math.sign(h.y)*v.y)/f,y=Math.min(w,x),b=v.clone().addScaledVector(h,y);w<x?(n=h.x>0?3:2,o=b.y+z):(n=+(h.y>0),o=b.x+D);let F=Y-b.z,C=Math.floor(o),M=Math.floor(F),k=a.current,S=o-C-.5,j=.5-.5*p(k.gap,0,.6),I=Math.abs(S)<=j&&Math.abs(F-M-.5)<=j,P=(l=n,{kind:A[s=((4*(i=(M%2048+2048)%2048)+l)*16+p(C,0,15))*4],which:A[s+1],row:i}),O=Math.exp(-Math.pow(y/eb(),1.5));return{wall:n,lane:C,row:M,wrapped:P.row,kind:I?P.kind:0,which:P.which,clear:O,t:y}},ek=e=>{let t=O[e];if(!t||!t.complete||!t.naturalWidth||L.has(e))return;let a=new u.gPd(t);a.colorSpace=u.jf0,a.minFilter=u.$_I,a.magFilter=u.k6q,a.generateMipmaps=!0,a.anisotropy=o.capabilities.getMaxAnisotropy(),a.needsUpdate=!0,L.set(e,a),o.initTexture(a)},eS=()=>{ep&&0!==ep.target&&(ep.target=0,n(-1),eI())},eA=()=>{ev&&(d.uHoverOut.value.copy(d.uHover.value),el.value=ea.value,el.velocity=0,ev=null,ea.value=0,ea.velocity=0,d.uHover.value.set(-9,-9,-9,0)),e.style.cursor=""},ej=(t,l)=>{let n=a.current;if(!n.interactive||ep||er)return void eA();let o=eM(t,l),i=1===o.kind||2===o.kind&&n.hover>0?o:null;i&&ev&&ev.wall===i.wall&&ev.lane===i.lane&&ev.row===i.wrapped||(ev&&(d.uHoverOut.value.copy(d.uHover.value),el.value=ea.value,el.velocity=0),ev=i?{wall:i.wall,lane:i.lane,row:i.wrapped}:null,i&&1===i.kind&&ek(i.which),ea.value=0,ea.velocity=0,i?d.uHover.value.set(i.wall,i.lane,i.wrapped,0):d.uHover.value.set(-9,-9,-9,0)),e.style.cursor=i&&1===i.kind&&n.focusOnClick&&i.clear>.25?"pointer":""},eI=()=>{X||_||!N||Q||(Q=requestAnimationFrame(eP))};function eP(e){if(Q=0,X||_)return;let t=a.current,l=V?Math.min(Math.max((e-V)/1e3,0),.1):1/60;V=e;let n=t.reduced,i=!1;ef()&&(i=!0),eF();let r=n?0:p(t.look,0,3)*(ep?.3:1),s=ei.inside?ei.x:0,v=ei.inside?ei.y:0;i=F(Z,-(.12*s)*r,l,1.1)||i,i=F(K,.08*v*r,l,1.1)||i,i=F(J,.16*s*D*Math.min(r,1),l,1.3)||i,i=F(ee,.16*v*z*Math.min(r,1),l,1.3)||i,i=F(et,es&&!n?1:0,l,es?.9:.7)||i;let m=e-ed<1200,w=n||ep?0:t.speed,x=t.paused||m?0:w,y=x+(Math.max(t.boost,1)*Math.max(Math.abs(w),.3)*Math.sign(w||1)-x)*et.value*(n||ep?0:1);if(!er||!er.moved){let e=ep?.12:.45;W+=(y-W)*(1-Math.exp(-l/e))}if(!er||!er.moved){let e=ec*(1-Math.exp(-l/(n?.02:.16)));1e-4>Math.abs(ec-=e)&&(ec=0),Y+=W*l+e}(Math.abs(W)>1e-4||Math.abs(y)>1e-4)&&(i=!0),(0!==ec||m)&&(i=!0),Y=(Y%2048+2048)%2048,g.fov=p(t.fov,30,110),g.aspect=T/B,g.updateProjectionMatrix(),g.position.set(J.value,ee.value,0),g.rotation.set(K.value,Z.value,0,"YXZ"),g.updateMatrixWorld(),d.uCameraMatrix.value.copy(g.matrixWorld),d.uProjectionInverse.value.copy(g.projectionMatrixInverse),d.uTravel.value=Y;let b=n?0:p(t.blur,0,3),C=Math.min(.03*Math.abs(W)*b,.9);d.uShutter.value=C*Math.sign(W||1),d.uSamples.value=C>.03?Math.min(12,Math.ceil(C/.05)+2):1,d.uGap.value=p(t.gap,0,.6),d.uRadius.value=p(t.radius,0,1),d.uLineOpacity.value=p(t.lineOpacity,0,1),d.uFogLength.value=eb();for(let e=0;e<48;e++)eh[e]&&c[e]<1&&(c[e]=n?1:Math.min(1,c[e]+l/.6),i=!0);if(i=F(ea,ev?p(t.hover,0,2):0,l,.35)||i,i=F(el,0,l,.35)||i,d.uHover.value.w=Math.max(ea.value,0),d.uHoverOut.value.w=Math.max(el.value,0),ep){let e=ep.target;i=F(en,e,l,n?.12:.7)||i,i=F(eo,.72*e,l,.7)||i;let a=p(en.value,0,1.05),o=p(a,0,1),r=eC(ep.wall,ep.lane,ep.row),s=new u.Pq0(0,0,-1).applyQuaternion(g.quaternion),c=g.position.clone().addScaledVector(s,2.2),v=4.4*Math.tan(u.cj9.degToRad(g.fov/2)),m=v*g.aspect,f=h.uImageAspect.value;i=F(ep.aspect,e?f:1,l,.9)||i;let w=.66*v,x=w*f;x>.82*m&&(w=(x=.82*m)/f);let y=1-p(t.gap,0,.6),b=p(ep.aspect.value,Math.min(1,f),Math.max(1,f)),C=(y+(Math.sqrt(x*w)-y)*o)/Math.sqrt(b);S.position.lerpVectors(r.position,c,o);let M=.35*Math.sin(Math.PI*o);S.position.addScaledVector(new u.Pq0(0,0,1).applyQuaternion(r.quaternion),M),S.quaternion.slerpQuaternions(r.quaternion,g.quaternion,o),S.scale.set(C*b,C,1),S.visible=a>5e-4||e>0,h.uPlaneAspect.value=b;let k=Math.min(.5*p(t.radius,0,1),.5*y)/y;h.uRadius.value=k+(.018-k)*o;let A=Math.exp(-Math.pow(eC(ep.wall,ep.lane,ep.row).position.distanceTo(g.position)/eb(),1.5));h.uShade.value=(.88+.12*o)*(A+(1-A)*o)*(1-eo.value*(1-o)),h.uOpacity.value=1,d.uFocus.value.w=+(e>0||a>.002),d.uDim.value=eo.value,0===e&&a<=.002&&.02>Math.abs(en.velocity)&&(ep=null,en.value=0,en.velocity=0,S.visible=!1,d.uFocus.value.set(-9,-9,-9,0))}else i=F(eo,0,l,.7)||i,d.uDim.value=Math.max(eo.value,0);o.render(f,g),i&&eI()}let eO=t=>{if(a.current.interactive){if("touch"!==t.pointerType){let a;ei.inside=!0,a=e.getBoundingClientRect(),ei.x=p((t.clientX-a.left)/a.width*2-1,-1,1),ei.y=p(-((t.clientY-a.top)/a.height*2-1),-1,1)}if(er&&er.id===t.pointerId){let e=t.clientX-er.x,a=t.clientY-er.y;if(!er.moved&&Math.hypot(e,a)>6&&(er.moved=!0,window.clearTimeout(eu),es=!1),er.moved&&!ep){let e=(er.touch?t.clientX-er.lastX:t.clientY-er.lastY)/Math.max(B,1)*6*(er.touch?-1:1);Y+=e;let a=performance.now();for(er.samples.push({t:a,v:e});er.samples.length&&a-er.samples[0].t>90;)er.samples.shift()}er.lastX=t.clientX,er.lastY=t.clientY}else"touch"!==t.pointerType&&ej(t.clientX,t.clientY);eI()}},eL=e=>{if(a.current.interactive&&e.isPrimary&&!(e.button>0)){if(er={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,at:performance.now(),moved:!1,touch:"touch"===e.pointerType,samples:[]},"touch"!==e.pointerType)try{t.setPointerCapture(e.pointerId)}catch{}window.clearTimeout(eu),ep||(eu=window.setTimeout(()=>{!er||er.moved||ep||(es=!0,eA(),eI())},220)),eI()}},eE=(e,l)=>{if(!er||er.id!==e.pointerId)return;let o=a.current,i=er;er=null,window.clearTimeout(eu);let r=es;es=!1;try{t.hasPointerCapture(e.pointerId)&&t.releasePointerCapture(e.pointerId)}catch{}if(i.moved&&!ep){let e=performance.now(),t=i.samples.filter(t=>e-t.t<90);if(t.length>1){let e=Math.max((t[t.length-1].t-t[0].t)/1e3,1/60);W=p(t.reduce((e,t)=>e+t.v,0)/e,-40,40)}}else if(!l&&!i.moved&&!r){if(ep)eS();else if(o.focusOnClick){let t=eM(e.clientX,e.clientY);1===t.kind&&t.clear>.25&&(e=>{let t=O[e.which];if(!t||!t.complete||!t.naturalWidth)return;ek(e.which);let a=L.get(e.which);a&&(h.uImage.value=a,h.uImageAspect.value=t.naturalWidth/t.naturalHeight,ep={wall:e.wall,lane:e.lane,row:e.row,which:e.which,target:1,aspect:{value:1,velocity:0}},d.uFocus.value.set(e.wall,e.lane,e.wrapped,0),n(e.which),eI())})(t)}}"touch"!==e.pointerType&&ej(e.clientX,e.clientY),eI()},eR=e=>eE(e,!1),eH=e=>eE(e,!0),eT=e=>{er&&er.id===e.pointerId||(ei.inside=!1,eA(),eI())},eB=e=>{let t=a.current;if(!t.wheel||!t.interactive)return;e.preventDefault();let l=1===e.deltaMode?16:2===e.deltaMode?B:1,n=p((e.deltaY+e.deltaX)*l,-240,240);ep&&1===ep.target&&eS(),ec+=.012*n,ed=performance.now(),eI()},eq=e=>{a.current.interactive&&("Escape"===e.key?eS():"ArrowUp"===e.key||"ArrowRight"===e.key?(e.preventDefault(),W+=3,eI()):("ArrowDown"===e.key||"ArrowLeft"===e.key)&&(e.preventDefault(),W-=3,eI()))};t.addEventListener("pointerdown",eL),t.addEventListener("pointermove",eO),t.addEventListener("pointerup",eR),t.addEventListener("pointercancel",eH),t.addEventListener("pointerleave",eT),t.addEventListener("wheel",eB,{passive:!1}),e.addEventListener("keydown",eq);let eD=new ResizeObserver(()=>{ey()&&eI()});eD.observe(e);let ez="undefined"==typeof IntersectionObserver?null:new IntersectionObserver(([e])=>{(N=e.isIntersecting)?(V=0,eI()):Q&&(cancelAnimationFrame(Q),Q=0)},{rootMargin:"80px"});ez?ez.observe(e):N=!0;let eG=e=>{e.preventDefault(),_=!0,Q&&cancelAnimationFrame(Q),Q=0},eU=()=>{_=!1,$="",R="",E="",eg(),ex(),eI()};return r.addEventListener("webglcontextlost",eG),r.addEventListener("webglcontextrestored",eU),ey(),eF(),ef(),eg(),ex(),S.visible=!0,o.compile(f,g),S.visible=!1,eI(),{sync:()=>{ey(),eg(),ex(),ep&&ep.which>=l.current.length&&eS(),V=0,eI()},close:eS,travel:e=>{W+=2*e,eI()},destroy:()=>{X=!0,Q&&cancelAnimationFrame(Q),window.clearTimeout(eu),ez?.disconnect(),eD.disconnect(),t.removeEventListener("pointerdown",eL),t.removeEventListener("pointermove",eO),t.removeEventListener("pointerup",eR),t.removeEventListener("pointercancel",eH),t.removeEventListener("pointerleave",eT),t.removeEventListener("wheel",eB),e.removeEventListener("keydown",eq),e.style.cursor="",r.removeEventListener("webglcontextlost",eG),r.removeEventListener("webglcontextrestored",eU),O.forEach(e=>{e&&(e.onload=null)}),ew(),j.dispose(),C.dispose(),k.dispose(),v.dispose(),m.dispose(),o.dispose(),o.getContext().isContextLost()||o.forceContextLoss(),r.remove()}}})(e,t,el,et,e=>{Z(e);let t=e>=0?et.current[e]??null:null;el.current.onFocusChange?.(t,e)});if(!a){let e=requestAnimationFrame(()=>J(!0));return()=>cancelAnimationFrame(e)}return Q.current=a,()=>{a.destroy(),Q.current=null}},[]),(0,n.useImperativeHandle)(N,()=>({close:()=>Q.current?.close(),travel:e=>Q.current?.travel(e)}),[]);let en=a.trim().toLowerCase(),eo="transparent"===en||""===en,ei=$>=0?ee[$]:null,er=!eo&&(e=>{let t=e.replace("#","");if(!/^[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(t))return!1;let a=3===t.length?t.replace(/./g,e=>e+e):t;return(.2126*Number.parseInt(a.slice(0,2),16)+.7152*Number.parseInt(a.slice(2,4),16)+.0722*Number.parseInt(a.slice(4,6),16))/255>.6})(en);return(0,l.jsxs)("div",{ref:X,className:(0,c.cn)("relative h-full min-h-[420px] w-full overflow-hidden",U),style:{backgroundColor:eo?void 0:a,...Y},role:"region","aria-roledescription":"gallery","aria-label":z,tabIndex:0,children:[(0,l.jsx)("div",{ref:_,style:f}),K?(0,l.jsx)("div",{style:{...g,gap:12,flexWrap:"wrap",padding:24,alignContent:"center"},children:ee.slice(0,6).map(e=>(0,l.jsx)("img",{src:e.src,alt:e.alt,style:{width:120,height:120,objectFit:"cover",borderRadius:8}},e.src))}):null,(0,l.jsx)("ul",{style:m,children:ee.map(e=>(0,l.jsx)("li",{children:e.alt},e.src))}),R?(0,l.jsx)("div",{"aria-live":"polite",style:{position:"absolute",left:0,right:0,bottom:"5%",display:"flex",flexDirection:"column",alignItems:"center",gap:4,pointerEvents:"none",opacity:+!!ei,transform:ei?"translateY(0)":"translateY(6px)",transition:ei?"opacity 420ms ease 380ms, transform 520ms cubic-bezier(0.22, 1, 0.36, 1) 380ms":"opacity 160ms ease, transform 160ms ease",color:er?"rgba(10, 10, 10, 0.92)":"rgba(255, 255, 255, 0.92)",fontSize:14,lineHeight:1.4,textAlign:"center"},children:ei?(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)("span",{style:{fontWeight:500},children:ei.title??ei.alt}),(0,l.jsxs)("span",{style:{opacity:.55,fontVariantNumeric:"tabular-nums",fontSize:12},children:[String($+1).padStart(2,"0")," / ",String(ee.length).padStart(2,"0")]})]}):null}):null,W?(0,l.jsx)("div",{style:g,children:(0,l.jsx)("div",{style:{pointerEvents:"auto"},children:W})}):null]})});C.displayName="PassageGallery";let M={night:{colors:["#5227FF","#FF9FFC"],background:{dark:"#0A0A0A",light:"#FAFAFA"},lanes:5,gap:.1,radius:.06,photoFill:.3,accentFill:.06,lineOpacity:.12,fog:1,speed:.6,boost:10,fov:72},gallery:{colors:["#B19EEF","#FF9FFC"],background:{dark:"#F4F4F5",light:"#F4F4F5"},lanes:5,gap:.14,radius:.04,photoFill:.34,accentFill:.02,lineOpacity:.16,fog:1.1,speed:.4,boost:8,fov:68},neon:{colors:["#3D5AFE","#FF2BD6"],background:{dark:"#050505",light:"#050505"},lanes:5,gap:0,radius:0,photoFill:.22,accentFill:.22,lineOpacity:.2,fog:.9,speed:.8,boost:12,fov:74},archive:{colors:["#5227FF","#FF9FFC"],background:{dark:"#0A0A0A",light:"#FAFAFA"},lanes:4,gap:.16,radius:.1,photoFill:.4,accentFill:0,lineOpacity:.07,fog:1.4,speed:.35,boost:8,fov:66},warp:{colors:["#5227FF","#FF9FFC"],background:{dark:"#0A0A0A",light:"#0A0A0A"},lanes:4,gap:.08,radius:.05,photoFill:.3,accentFill:.08,lineOpacity:.14,fog:.8,speed:2.4,boost:6,fov:84},hall:{colors:["#5227FF","#FF9FFC"],background:{dark:"#0A0A0A",light:"#FAFAFA"},lanes:9,gap:.1,radius:.06,photoFill:.24,accentFill:.05,lineOpacity:.1,fog:.7,speed:.45,boost:10,fov:62}},k=[{label:"Night",value:"night"},{label:"Gallery",value:"gallery"},{label:"Neon",value:"neon"},{label:"Archive",value:"archive"},{label:"Warp",value:"warp"},{label:"Hall",value:"hall"}],S=[{name:"items",type:"{ src: string; alt: string; title?: string }[]",default:"built-in scene collection",description:"Photos placed along the walls. Images must allow cross-origin loading. Titles are shown as captions when a photo is opened."},{name:"colors",type:"[string, string]",default:'["#5227FF", "#FF9FFC"]',description:"The two ends of the gradient used for accent tiles."},{name:"backgroundColor",type:"string",default:'"#0a0a0a"',description:'Colour of the walls and of the distance the tunnel fades into. Grid lines adapt to it. Pass "transparent" to show the page behind.'},{name:"lanes",type:"number",default:"5",description:"Tiles across the floor and ceiling. The walls get as many as fit the aspect ratio."},{name:"gap",type:"number",default:"0.1",description:"Space between tiles as a fraction of a cell. 0 makes tiles flush."},{name:"radius",type:"number",default:"0.06",description:"Corner rounding of the tiles, from 0 (square) to 1 (circular)."},{name:"photoFill",type:"number",default:"0.3",description:"Share of cells holding a photo, from 0 to 1."},{name:"accentFill",type:"number",default:"0.06",description:"Share of cells holding a gradient accent tile."},{name:"lineOpacity",type:"number",default:"0.12",description:"Opacity of the hairline grid."},{name:"fog",type:"number",default:"1",description:"How quickly the tunnel fades into the background with distance."},{name:"speed",type:"number",default:"0.6",description:"Cruising speed in cells per second. Negative values travel backwards; 0 stays still."},{name:"boost",type:"number",default:"10",description:"Speed multiplier while the pointer is held down."},{name:"blur",type:"number",default:"1",description:"Strength of the motion blur at high speed. 0 turns it off."},{name:"look",type:"number",default:"1",description:"How far the view turns and shifts toward the pointer."},{name:"fov",type:"number",default:"72",description:"Vertical field of view in degrees. Wider angles exaggerate the depth."},{name:"hover",type:"number",default:"1",description:"Brightening and lift of the tile under the pointer. 0 turns it off."},{name:"focusOnClick",type:"boolean",default:"true",description:"Clicking a photo flies it out of the wall to full view. Click again or press Escape to put it back."},{name:"captions",type:"boolean",default:"true",description:"Show the title and position of an opened photo."},{name:"wheel",type:"boolean",default:"true",description:"Scroll to travel through the tunnel; scrolling while a photo is open puts it back and moves on. Set false to leave page scrolling untouched."},{name:"interactive",type:"boolean",default:"true",description:"Enable pointer look, dragging, holding and clicking. Drag vertically with a mouse or sideways on touch."},{name:"seed",type:"number",default:"0",description:"Changes which cells hold photos and accents."},{name:"paused",type:"boolean",default:"false",description:"Stops cruising. Dragging and holding still work. Reduced-motion users never cruise."},{name:"dpr",type:"number",default:"2",description:"Maximum device pixel ratio for the canvas."},{name:"ariaLabel",type:"string",default:'"Photo tunnel…"',description:"Accessible description of the gallery and how to use it."},{name:"onFocusChange",type:"(item, index) => void",default:"—",description:"Called when a photo is opened, with null and -1 when it is put back."},{name:"ref",type:"{ close, travel }",default:"—",description:"Imperative controls: put an opened photo back, or give the camera a push of a number of cells."},{name:"children",type:"ReactNode",default:"—",description:"Content centred over the tunnel, such as a headline or call to action."},{name:"className",type:"string",default:"—",description:"Classes for the root element. It fills its parent, with a 420px minimum height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."}],A=()=>{let[e,t]=(0,r.I)(),a=(0,i.Y)(),[s,u]=(0,n.useState)("night"),[c,d]=(0,n.useState)(M.night),[p,v]=(0,n.useState)(null),h=e=>t=>d(a=>({...a,[e]:t})),m=p??c.background[a],[f,g]=(0,n.useState)(1),[w,x]=(0,n.useState)(1),[y,b]=(0,n.useState)(1),[F,A]=(0,n.useState)(0),[j,I]=(0,n.useState)(!0),[P,O]=(0,n.useState)(!0),[L,E]=(0,n.useState)(!0),[R,H]=(0,n.useState)(!0),[T,B]=(0,n.useState)(!1);return(0,l.jsxs)("div",{children:[(0,l.jsx)(o.Bg,{}),(0,l.jsxs)(o.VX,{children:[(0,l.jsxs)(o.Ec,{children:[(0,l.jsx)(o.Ch,{onRefresh:t,minHeight:560,enableResponsive:!0,children:(0,l.jsx)("div",{className:"relative h-full w-full",children:(0,l.jsx)(C,{colors:c.colors,backgroundColor:m,lanes:c.lanes,gap:c.gap,radius:c.radius,photoFill:c.photoFill,accentFill:c.accentFill,lineOpacity:c.lineOpacity,fog:c.fog,speed:c.speed,boost:c.boost,blur:f,look:w,fov:c.fov,hover:y,focusOnClick:j,captions:P,wheel:L,interactive:R,seed:F,paused:T},e)})}),(0,l.jsxs)(o.IH,{children:[(0,l.jsx)(o.bg,{title:"Preset",value:s,options:k,onChange:e=>{u(e),d(M[e]??M.night),v(null)}}),(0,l.jsx)(o.W7,{title:"Color A",value:c.colors[0],onChange:e=>h("colors")([e,c.colors[1]])}),(0,l.jsx)(o.W7,{title:"Color B",value:c.colors[1],onChange:e=>h("colors")([c.colors[0],e])}),(0,l.jsx)(o.W7,{title:"Background",value:m,onChange:v}),(0,l.jsx)(o.yt,{title:"Lanes",min:2,max:12,step:1,value:c.lanes,onChange:h("lanes")}),(0,l.jsx)(o.yt,{title:"Gap",min:0,max:.4,step:.01,value:c.gap,onChange:h("gap")}),(0,l.jsx)(o.yt,{title:"Radius",min:0,max:1,step:.01,value:c.radius,onChange:h("radius")}),(0,l.jsx)(o.yt,{title:"Photo Fill",min:0,max:1,step:.01,value:c.photoFill,onChange:h("photoFill")}),(0,l.jsx)(o.yt,{title:"Accent Fill",min:0,max:.6,step:.01,value:c.accentFill,onChange:h("accentFill")}),(0,l.jsx)(o.yt,{title:"Line Opacity",min:0,max:.6,step:.01,value:c.lineOpacity,onChange:h("lineOpacity")}),(0,l.jsx)(o.yt,{title:"Fog",min:.2,max:3,step:.05,value:c.fog,onChange:h("fog")}),(0,l.jsx)(o.yt,{title:"Speed",min:-2,max:4,step:.05,value:c.speed,onChange:h("speed")}),(0,l.jsx)(o.yt,{title:"Boost",min:1,max:20,step:.5,value:c.boost,valueUnit:"\xd7",onChange:h("boost")}),(0,l.jsx)(o.yt,{title:"Blur",min:0,max:3,step:.05,value:f,onChange:g}),(0,l.jsx)(o.yt,{title:"Look",min:0,max:3,step:.05,value:w,onChange:x}),(0,l.jsx)(o.yt,{title:"Field Of View",min:40,max:100,step:1,value:c.fov,valueUnit:"\xb0",onChange:h("fov")}),(0,l.jsx)(o.yt,{title:"Hover",min:0,max:2,step:.05,value:y,onChange:b}),(0,l.jsx)(o.yt,{title:"Seed",min:0,max:20,step:1,value:F,onChange:A}),(0,l.jsx)(o.tl,{title:"Focus On Click",checked:j,onChange:I}),(0,l.jsx)(o.tl,{title:"Captions",checked:P,onChange:O}),(0,l.jsx)(o.tl,{title:"Wheel",checked:L,onChange:E}),(0,l.jsx)(o.tl,{title:"Interactive",checked:R,onChange:H}),(0,l.jsx)(o.tl,{title:"Paused",checked:T,onChange:B})]}),(0,l.jsx)(o.Ub,{data:S})]}),(0,l.jsx)(o.lT,{children:(0,l.jsx)(o.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>l.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>d.CopyButton,IH:()=>o.Customize,gI:()=>h,Dn:()=>f,pi:()=>m,W7:()=>i.PreviewColor,Ch:()=>n.PreviewContainer,UD:()=>i.PreviewInput,bg:()=>i.PreviewSelect,yt:()=>i.PreviewSlider,tl:()=>i.PreviewSwitch,Ec:()=>l.PreviewTab,Ub:()=>r.PropTable,VX:()=>l.TabsLayout,bs:()=>v});var l=a(55019);a(27382);var n=a(10236),o=a(69485),i=a(48543),r=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),p=a(90650);let v="rounded-lg border bg-background";function h({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,p.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,p.cn)(v,e),...a,children:t})}function f({title:e,description:t,className:a,children:l}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:l})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>r});var l=a(12115),n=a(30701);let o=()=>()=>{},i=()=>"light";function r(){let{resolvedTheme:e}=(0,n.D)();return(0,l.useSyncExternalStore)(o,()=>"dark"===e?"dark":"light",i)}},90761:(e,t,a)=>{a.d(t,{I:()=>n});var l=a(12115);function n(){let[e,t]=(0,l.useState)(0),a=(0,l.useCallback)(()=>{t(e=>e+1)},[]);return(0,l.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);