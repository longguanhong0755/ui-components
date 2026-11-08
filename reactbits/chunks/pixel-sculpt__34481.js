"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[34481],{34481:(e,t,a)=>{a.r(t),a.d(t,{default:()=>j});var l=a(95155),n=a(12115),r=a(30701),i=a(56388),o=a(90761),s=a(81712),u=a(3907),c=a(2253),f=a(90650);let d={raise:0,tilt:1,separate:2},m={none:0,pulse:1,scatter:2,rebuild:3},h={image:0,mono:1,luminance:2},p=`
#define TAU 6.2831853

attribute vec2 aCell;
attribute float aLum;
attribute vec3 aColor;
attribute float aSeed;

uniform float uDepth;
uniform float uGap;
uniform float uRadius;
uniform float uStrength;
uniform float uPointerActive;
uniform vec2 uPointer;
uniform int uHover;
#define MAX_CLICKS 8

uniform vec4 uClicks[MAX_CLICKS];
uniform float uClickStrength;
uniform float uReveal;
uniform float uExtent;

varying vec3 vColor;
varying vec3 vNormal;
varying float vLum;
varying float vHeight;

mat3 tiltAround(vec3 axis, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  float t = 1.0 - c;
  return mat3(
    t * axis.x * axis.x + c, t * axis.x * axis.y + s * axis.z, t * axis.x * axis.z - s * axis.y,
    t * axis.x * axis.y - s * axis.z, t * axis.y * axis.y + c, t * axis.y * axis.z + s * axis.x,
    t * axis.x * axis.z + s * axis.y, t * axis.y * axis.z - s * axis.x, t * axis.z * axis.z + c
  );
}

float bell(float x) {
  float k = clamp(x, 0.0, 1.0);
  return k * k * (3.0 - 2.0 * k);
}

void main() {
  vec2 cell = aCell;
  float height = max(aLum * uDepth, 0.08);


  float spread = length(cell) / max(uExtent, 1.0);
  float reveal = bell((uReveal - spread * 0.6) / 0.4);
  height *= reveal;


  float dist = distance(cell, uPointer);
  vec2 away = dist > 0.0001 ? (cell - uPointer) / dist : vec2(0.0);
  float wave = uPointerActive * uStrength * (1.0 - bell(dist / max(uRadius, 0.001)));

  float raise = 0.0;
  float tiltAmount = 0.0;
  vec2 push = vec2(0.0);
  vec3 offset = vec3(0.0);
  vec3 tiltAxis = vec3(away.y, 0.0, -away.x);

  if (uHover == 0) raise = wave * uDepth * 0.9;
  else if (uHover == 1) tiltAmount = wave * 0.7;
  else push = away * wave * 0.9;


  for (int i = 0; i < MAX_CLICKS; i++) {
    vec4 click = uClicks[i];
    int kind = int(click.w + 0.5);
    if (kind == 0) continue;
    float clickDist = distance(cell, click.xy);
    float age = click.z;
    if (kind == 1) {

      float front = age * 16.0;
      float envelope = exp(-pow((clickDist - front) * 0.16, 2.0)) * exp(-age * 1.3);
      float wave = 0.5 + 0.5 * cos((clickDist - front) * 0.55);
      raise += envelope * wave * uDepth * 0.35 * uClickStrength;
    } else if (kind == 2) {
      float t = age / 2.0;
      float envelope = bell(t / 0.18) * (1.0 - bell((t - 0.3) / 0.7)) * uClickStrength;
      float reachScale = 1.0 - bell(clickDist / (uExtent * 1.1));
      float angle = aSeed * TAU;
      float lift = 4.0 + 8.0 * fract(aSeed * 7.31);
      offset.xz += vec2(cos(angle), sin(angle)) * (2.0 + 6.0 * fract(aSeed * 3.17)) * envelope * reachScale;
      offset.y += lift * envelope * reachScale;
      tiltAmount += envelope * reachScale * (1.0 + 2.0 * aSeed);
      tiltAxis = normalize(vec3(cos(angle * 1.7), 0.2, sin(angle * 1.7)));
    } else if (kind == 3) {
      float t = age / 1.8;
      float local = clamp(t * 1.5 - clickDist / (uExtent * 1.2) * 0.5, 0.0, 1.0);
      float collapse = sin(local * 3.14159265) * clamp(uClickStrength, 0.0, 1.0);
      height *= 1.0 - collapse * collapse;
    }
  }

  float size = 1.0 - clamp(uGap, 0.0, 0.9);
  vec3 local = vec3(position.x * size, position.y * (height + raise), position.z * size);
  vec3 normalLocal = normal;

  if (tiltAmount != 0.0) {
    mat3 rotation = tiltAround(normalize(tiltAxis + vec3(0.0, 0.0001, 0.0)), tiltAmount);
    local = rotation * local;
    normalLocal = rotation * normalLocal;
  }

  vec3 world = local + vec3(cell.x + push.x, 0.0, cell.y + push.y) + offset;

  vColor = aColor;
  vLum = aLum;
  vHeight = (height + raise) / max(uDepth, 0.001);
  vNormal = normalize(normalMatrix * normalLocal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
}
`,v=`
precision highp float;

uniform int uColorMode;
uniform vec3 uBaseColor;

varying vec3 vColor;
varying vec3 vNormal;
varying float vLum;
varying float vHeight;

void main() {
  vec3 tint = vColor;
  if (uColorMode == 1) tint = uBaseColor;
  else if (uColorMode == 2) tint = uBaseColor * mix(0.3, 1.0, vLum);

  vec3 key = normalize(vec3(0.35, 0.75, 0.9));
  vec3 fill = normalize(vec3(-0.6, 0.3, 0.4));
  float lit = max(dot(vNormal, key), 0.0) * 0.42 + max(dot(vNormal, fill), 0.0) * 0.14;
  float ambient = 0.36 + 0.08 * clamp(vHeight, 0.0, 1.0);

  gl_FragColor = vec4(tint * (ambient + lit), 1.0);
  #include <colorspace_fragment>
}
`,x=(e,t,a)=>Math.min(a,Math.max(t,e)),g=e=>{let t=x(e,0,1);return t*t*(3-2*t)},y=null,b=()=>{if(null!==y)return y;if("undefined"==typeof document)return!0;let e=document.createElement("canvas");return y=!!(e.getContext("webgl2")||e.getContext("webgl"))},C=0,w=({field:e,depth:t,gap:a,tileShape:r,interactionRadius:i,interactionStrength:o,hoverEffect:u,colorMode:f,baseColor:y,tilt:b,scale:C,offsetX:w,offsetY:S,rotation:k,autoRotate:M,rotateSpeed:j,clickEffect:E,clickStrength:R})=>{let A=(0,n.useRef)(null),z=(0,n.useRef)(null),{invalidate:P}=(0,s.C)(),I=(0,n.useRef)(""),N=(0,n.useRef)({x:0,y:0,active:!1}),D=(0,n.useRef)({x:0,y:0,active:0}),H=(0,n.useRef)([]),L=(0,n.useRef)(0),T=(0,n.useRef)(0),B=(0,n.useMemo)(()=>{let e;return(e="square"===r?new c.iNn(1,1,1):new c.Ho_(.5,.5,1,"hex"===r?6:20)).translate(0,.5,0),e},[r]);(0,n.useEffect)(()=>()=>B.dispose(),[B]);let U=(0,n.useMemo)(()=>{let t=new c.CmU;return t.index=B.index,t.attributes.position=B.attributes.position,t.attributes.normal=B.attributes.normal,t.instanceCount=e.count,t.setAttribute("aCell",new c.uWO(e.cells,2)),t.setAttribute("aLum",new c.uWO(e.lums,1)),t.setAttribute("aColor",new c.uWO(e.colors,3)),t.setAttribute("aSeed",new c.uWO(e.seeds,1)),t},[e,B]);(0,n.useEffect)(()=>()=>U.dispose(),[U]),(0,n.useEffect)(()=>{L.current=0,H.current=[],P()},[e,P]);let W=(0,n.useMemo)(()=>({uDepth:{value:4},uGap:{value:.15},uRadius:{value:6},uStrength:{value:1},uPointerActive:{value:0},uPointer:{value:new c.I9Y(0,0)},uHover:{value:0},uClicks:{value:Array.from({length:8},()=>new c.IUQ)},uClickStrength:{value:1},uReveal:{value:0},uExtent:{value:1},uColorMode:{value:0},uBaseColor:{value:new c.Q1f("#ffffff")}}),[]);(0,n.useEffect)(()=>{let e=z.current;e&&(((e,t)=>{try{e.setStyle(t,c.Zr2)}catch{return}})(e.uniforms.uBaseColor.value,y),P())},[y,P]),(0,n.useEffect)(()=>{P()},[t,a,i,o,u,f,b,C,w,S,k,P]);let q=(0,n.useCallback)(a=>{let l=A.current,n=a.point.clone();if(!l)return{x:n.x,y:n.z};l.updateMatrixWorld();let r=new c.kn4().copy(l.matrixWorld).invert(),s=a.ray.origin.clone().applyMatrix4(r),f=a.ray.direction.clone().transformDirection(r).normalize(),m=n.applyMatrix4(r),h=Math.max(t,0),p=D.current,v=0===d[u]?p.active*o*h*.9:0,x=h+Math.max(v,0);if(x<=0||1e-6>Math.abs(f.y))return{x:m.x,y:m.z};let y=(x-s.y)/f.y,b=(0-s.y)/f.y,C=Math.max(8,Math.ceil(6*x)),w=(e.columns-1)/2,S=(e.rows-1)/2,k=new c.Pq0;for(let t=0;t<=C;t++){let a=y+(b-y)*t/C;k.copy(f).multiplyScalar(a).add(s);let l=Math.round(k.x+w),n=Math.round(k.z+S);if(l<0||n<0||l>=e.columns||n>=e.rows)continue;let r=e.grid[n*e.columns+l];if(!(r<0)&&Math.max(r*h,.08)+v*(1-g(Math.hypot(k.x-p.x,k.z-p.y)/Math.max(i,.001)))>=k.y)return{x:k.x,y:k.z}}return{x:m.x,y:m.z}},[e,t,u,o,i]),_=(0,n.useCallback)(e=>{let t=q(e);N.current.x=t.x,N.current.y=t.y,N.current.active=!0,P()},[q,P]),F=(0,n.useCallback)(()=>{N.current.active=!1,P()},[P]),O=(0,n.useCallback)(e=>{let t=m[E];if(0===t)return;let a=q(e),l=H.current;l.length>=8&&l.shift(),l.push({kind:t,x:a.x,y:a.y,age:0}),P()},[E,q,P]);return(0,s.D)((l,n)=>{let r=z.current,s=A.current;if(!r||!s)return;let m=Math.min(n,.05),p=!1,v=`${e.id}|${l.size.width}|${l.size.height}|${b}|${t}|${C}`;if(I.current!==v){I.current=v;let a=l.camera,n=e.columns/2+1,r=e.rows/2+1,i=1.2*Math.max(t,0),o=c.cj9.degToRad(x(b,0,80)),s=[];for(let e of[-n,n])for(let t of[-r,r])for(let a of[0,i])s.push(new c.Pq0(e,a,t));let u=new c.Pq0,f=e=>(a.position.set(0,e*Math.cos(o),e*Math.sin(o)),a.near=.05*e,a.far=4*e,a.lookAt(0,0,0),a.updateMatrixWorld(),a.updateProjectionMatrix(),s.every(e=>(u.copy(e).project(a),.94>=Math.abs(u.x)&&.94>=Math.abs(u.y)))),d=Math.hypot(n,r),m=12*d;for(let e=0;e<18;e++){let e=(d+m)/2;f(e)?m=e:d=e}f(m/Math.max(C,.05))}s.position.set(w*e.columns,0,-S*e.rows);let g=r.uniforms;g.uDepth.value=Math.max(t,0),g.uGap.value=x(a,0,.9),g.uRadius.value=Math.max(i,.01),g.uStrength.value=o,g.uHover.value=d[u],g.uColorMode.value=h[f],g.uClickStrength.value=Math.max(R,0),g.uExtent.value=Math.hypot(e.columns,e.rows)/2,L.current<1&&(L.current=Math.min(1,L.current+m/1.4),p=!0),g.uReveal.value=L.current;let y=N.current,E=D.current,B=1-Math.exp(-(10*m));y.active&&(E.x+=(y.x-E.x)*B,E.y+=(y.y-E.y)*B);let U=+!!y.active;E.active+=(U-E.active)*B,Math.abs(E.active-U)>.002||y.active&&Math.hypot(y.x-E.x,y.y-E.y)>.01?p=!0:E.active=U,g.uPointer.value.set(E.x,E.y),g.uPointerActive.value=E.active,H.current.length&&(H.current=H.current.map(e=>({...e,age:e.age+m})).filter(e=>e.age<2.4),p=!0);let W=g.uClicks.value;for(let e=0;e<8;e++){let t=H.current[e];t?W[e].set(t.x,t.y,t.age,t.kind):W[e].set(0,0,0,0)}M&&(T.current+=m*j*(2*Math.PI)/60,p=!0),s.rotation.y=T.current+c.cj9.degToRad(k),p&&P()}),(0,l.jsxs)("group",{ref:A,children:[(0,l.jsxs)("mesh",{rotation:[-Math.PI/2,0,0],onPointerMove:_,onPointerLeave:F,onClick:O,children:[(0,l.jsx)("planeGeometry",{args:[e.columns+4,e.rows+4]}),(0,l.jsx)("meshBasicMaterial",{colorWrite:!1,depthWrite:!1})]}),(0,l.jsx)("mesh",{geometry:U,frustumCulled:!1,children:(0,l.jsx)("shaderMaterial",{ref:z,vertexShader:p,fragmentShader:v,uniforms:W})})]})},S=({src:e,resolution:t=72,depth:a=4,gap:r=.15,tileShape:i="square",interactionRadius:o=6,interactionStrength:s=1,hoverEffect:c="raise",colorMode:d="image",baseColor:m="#ffffff",backgroundColor:h="transparent",invert:p=!1,removeBackground:v=!1,backgroundTolerance:g=.12,tilt:y=32,scale:S=1,offsetX:k=0,offsetY:M=0,rotation:j=0,autoRotate:E=!1,rotateSpeed:R=2,clickEffect:A="pulse",clickStrength:z=1,dpr:P=2,onError:I,className:N,children:D})=>{let H,[L,T]=(0,n.useState)(null),[B,U]=(0,n.useState)(null),W=B===e,q=(H="(prefers-reduced-motion: reduce)",(0,n.useSyncExternalStore)(e=>{let t=window.matchMedia(H);return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},()=>window.matchMedia(H).matches,()=>!1)),_=(0,n.useSyncExternalStore)(()=>()=>{},b,()=>!0),F=(0,n.useRef)(I);(0,n.useEffect)(()=>{F.current=I},[I]);let O=W||q||!_;(0,n.useEffect)(()=>{if(O)return;let a=!0;return new Promise((a,l)=>{let n=new Image;n.crossOrigin="anonymous",n.decoding="async",n.onload=()=>{try{a(function(e,t,a,l,n){let r=e.naturalWidth||e.width,i=e.naturalHeight||e.height;if(!r||!i)throw Error("Image has no dimensions");let o=x(Math.round(t),4,160),s=r/i,u=s>=1?o:Math.max(2,Math.round(o*s)),c=s>=1?Math.max(2,Math.round(o/s)):o,f=document.createElement("canvas");f.width=u,f.height=c;let d=f.getContext("2d",{willReadFrequently:!0});if(!d)throw Error("2D context unavailable");d.imageSmoothingEnabled=!0,d.imageSmoothingQuality="high",d.drawImage(e,0,0,u,c);let m=d.getImageData(0,0,u,c).data;l&&function(e,t,a,l){let n=0,r=0,i=0,o=0,s=t=>{n+=e[4*t],r+=e[4*t+1],i+=e[4*t+2],o++};for(let e=0;e<t;e++)s(e),s((a-1)*t+e);for(let e=1;e<a-1;e++)s(e*t),s(e*t+t-1);n/=o,r/=o,i/=o;let u=255*x(l,0,1)*Math.sqrt(3),c=t=>{let a=4*t;return e[a+3]<128||Math.hypot(e[a]-n,e[a+1]-r,e[a+2]-i)<=u},f=new Uint8Array(t*a),d=[];for(let e=0;e<t;e++)d.push(e,(a-1)*t+e);for(let e=1;e<a-1;e++)d.push(e*t,e*t+t-1);for(;d.length;){let l=d.pop();if(f[l]||!c(l))continue;f[l]=1,e[4*l+3]=0;let n=l%t,r=(l-n)/t;n>0&&d.push(l-1),n<t-1&&d.push(l+1),r>0&&d.push(l-t),r<a-1&&d.push(l+t)}}(m,u,c,n);let h=0;for(let e=3;e<m.length;e+=4)m[e]>=128&&h++;if(0===h)throw Error("Image has no visible pixels");let p=new Float32Array(2*h),v=new Float32Array(h),g=new Float32Array(3*h),y=new Float32Array(h),b=new Float32Array(c*u).fill(-1),w=0;for(let e=0;e<c;e++)for(let t=0;t<u;t++){let l=(e*u+t)*4;if(m[l+3]<128)continue;let n=m[l]/255,r=m[l+1]/255,i=m[l+2]/255,o=.2126*n+.7152*r+.0722*i;p[2*w]=t-(u-1)/2,p[2*w+1]=e-(c-1)/2,v[w]=a?1-o:o,b[e*u+t]=v[w],g[3*w]=n*n,g[3*w+1]=r*r,g[3*w+2]=i*i,y[w]=((0x466f45d*t^0x127409f*e)>>>0)%1e3/1e3,w++}return{id:++C,columns:u,rows:c,cells:p,lums:v,colors:g,seeds:y,grid:b,count:h}}(n,t,p,v,g))}catch(e){l(e instanceof Error?e:Error(String(e)))}},n.onerror=()=>l(Error(`Failed to load ${e}`)),n.src=e}).then(e=>{a&&T(e)}).catch(t=>{a&&(U(e),F.current?.(t))}),()=>{a=!1}},[e,t,p,v,g,O]);let X="transparent"===h||"none"===h||""===h?void 0:h;return(0,l.jsxs)("div",{className:(0,f.cn)("relative overflow-hidden",N),style:{background:X},children:[O?(0,l.jsx)("img",{src:e,alt:"",className:"absolute inset-0 h-full w-full object-contain",draggable:!1}):(0,l.jsx)("div",{className:"absolute inset-0 touch-none",children:(0,l.jsx)(u.Hl,{dpr:[1,x(P,1,3)],frameloop:"demand",camera:{fov:36,position:[0,60,40]},gl:{antialias:!0,alpha:!0,powerPreference:"high-performance"},children:L?(0,l.jsx)(w,{field:L,depth:a,gap:r,tileShape:i,interactionRadius:o,interactionStrength:s,hoverEffect:c,colorMode:d,baseColor:m,tilt:y,scale:S,offsetX:k,offsetY:M,rotation:j,autoRotate:E,rotateSpeed:R,clickEffect:A,clickStrength:z}):null})}),D?(0,l.jsx)("div",{className:"pointer-events-none relative z-10 h-full w-full",children:D}):null]})},k="/images/sculpt/sunflower.webp",M=()=>()=>{},j=()=>{let[e,t]=(0,o.I)(),[a,s]=(0,n.useState)(""),[u,c]=(0,n.useState)(k);(0,n.useEffect)(()=>{let e=a.trim(),t=/^(https?:\/\/|\/|data:image\/)/.test(e.trim())?e:k,l=window.setTimeout(()=>c(t),600);return()=>window.clearTimeout(l)},[a]);let[f,d]=(0,n.useState)(100),[m,h]=(0,n.useState)(8),[p,v]=(0,n.useState)(.05),[x,g]=(0,n.useState)("square"),[y,b]=(0,n.useState)(18),[C,w]=(0,n.useState)(1),[j,E]=(0,n.useState)("raise"),[R,A]=(0,n.useState)("pulse"),[z,P]=(0,n.useState)(2),{resolvedTheme:I}=(0,r.D)(),N=(0,n.useSyncExternalStore)(M,()=>!0,()=>!1),[D,H]=(0,n.useState)(null),[L,T]=(0,n.useState)(null),B=D??"image",U=L??("dark"===I?"#e5e5e5":"#c8c8c8"),[W,q]=(0,n.useState)(!1),[_,F]=(0,n.useState)(!0),[O,X]=(0,n.useState)(.12),[G,$]=(0,n.useState)(45),[Y,V]=(0,n.useState)(1.2),[K,Q]=(0,n.useState)(0),[Z,J]=(0,n.useState)(0),[ee,et]=(0,n.useState)(0),[ea,el]=(0,n.useState)(!1),[en,er]=(0,n.useState)(2);return(0,l.jsxs)("div",{children:[(0,l.jsx)(i.Bg,{}),(0,l.jsxs)(i.VX,{children:[(0,l.jsxs)(i.Ec,{children:[(0,l.jsx)(i.Ch,{onRefresh:t,minHeight:560,children:(0,l.jsx)("div",{className:"relative h-full w-full",children:(0,l.jsx)(S,{className:"h-full w-full",src:u,onError:()=>c(k),resolution:f,depth:m,gap:p,tileShape:x,interactionRadius:y,interactionStrength:C,hoverEffect:j,clickEffect:R,clickStrength:z,colorMode:B,baseColor:U,invert:W,removeBackground:_,backgroundTolerance:O,tilt:G,scale:Y,offsetX:K,offsetY:Z,rotation:ee,autoRotate:ea,rotateSpeed:en},e)})}),(0,l.jsxs)(i.IH,{children:[(0,l.jsx)(i.UD,{title:"Image URL",value:a,placeholder:"Paste an image URL (needs CORS)",onChange:s}),(0,l.jsx)(i.yt,{title:"Resolution",min:16,max:160,step:4,value:f,onChange:d}),(0,l.jsx)(i.yt,{title:"Depth",min:0,max:12,step:.5,value:m,onChange:h}),(0,l.jsx)(i.yt,{title:"Gap",min:0,max:.8,step:.05,value:p,onChange:v}),(0,l.jsx)(i.bg,{title:"Tile Shape",value:x,onChange:e=>g(e),options:[{value:"square",label:"Square"},{value:"round",label:"Round"},{value:"hex",label:"Hex"}]}),(0,l.jsx)(i.bg,{title:"Hover Effect",value:j,onChange:e=>E(e),options:[{value:"raise",label:"Raise"},{value:"tilt",label:"Tilt"},{value:"separate",label:"Separate"}]}),(0,l.jsx)(i.yt,{title:"Interaction Radius",min:1,max:20,step:.5,value:y,onChange:b}),(0,l.jsx)(i.yt,{title:"Interaction Strength",min:0,max:3,step:.05,value:C,onChange:w}),(0,l.jsx)(i.bg,{title:"Click Effect",value:R,onChange:e=>A(e),options:[{value:"pulse",label:"Pulse"},{value:"scatter",label:"Scatter"},{value:"rebuild",label:"Rebuild"},{value:"none",label:"None"}]}),"none"!==R&&(0,l.jsx)(i.yt,{title:"Click Strength",min:0,max:4,step:.1,value:z,onChange:P}),(0,l.jsx)(i.bg,{title:"Color Mode",value:B,onChange:e=>H(e),options:[{value:"image",label:"Image"},{value:"mono",label:"Mono"},{value:"luminance",label:"Luminance"}]}),N&&"image"!==B&&(0,l.jsx)(i.W7,{title:"Base Color",value:U,onChange:T}),(0,l.jsx)(i.tl,{title:"Invert",checked:W,onChange:q}),(0,l.jsx)(i.tl,{title:"Remove Background",checked:_,onChange:F}),_&&(0,l.jsx)(i.yt,{title:"Background Tolerance",min:0,max:.5,step:.01,value:O,onChange:X}),(0,l.jsx)(i.yt,{title:"Tilt",min:0,max:75,step:1,value:G,onChange:$,valueUnit:"\xb0"}),(0,l.jsx)(i.yt,{title:"Scale",min:.3,max:3,step:.05,value:Y,onChange:V}),(0,l.jsx)(i.yt,{title:"Offset X",min:-1,max:1,step:.01,value:K,onChange:Q}),(0,l.jsx)(i.yt,{title:"Offset Y",min:-1,max:1,step:.01,value:Z,onChange:J}),(0,l.jsx)(i.yt,{title:"Rotation",min:-180,max:180,step:1,value:ee,onChange:et,valueUnit:"\xb0"}),(0,l.jsx)(i.tl,{title:"Auto Rotate",checked:ea,onChange:el}),ea&&(0,l.jsx)(i.yt,{title:"Rotate Speed",min:.5,max:10,step:.5,value:en,onChange:er})]}),(0,l.jsx)(i.Ub,{data:[{name:"src",type:"string",default:"—",description:"Image the tiles are sculpted from."},{name:"resolution",type:"number",default:"72",description:"Tiles along the image's longer edge, capped at 160."},{name:"depth",type:"number",default:"4",description:"Height of a fully lit tile, in tile widths."},{name:"gap",type:"number",default:"0.15",description:"Space between tiles as a fraction of a cell."},{name:"tileShape",type:'"square" | "round" | "hex"',default:'"square"',description:"Footprint of each tile."},{name:"interactionRadius",type:"number",default:"6",description:"Radius of the pointer wave, in tiles."},{name:"interactionStrength",type:"number",default:"1",description:"Amplitude of the pointer wave."},{name:"hoverEffect",type:'"raise" | "tilt" | "separate"',default:'"raise"',description:"How tiles respond inside the pointer wave."},{name:"clickEffect",type:'"pulse" | "scatter" | "rebuild" | "none"',default:'"pulse"',description:"What a click on the tiles triggers."},{name:"clickStrength",type:"number",default:"1",description:"Amplitude of the click effect."},{name:"colorMode",type:'"image" | "mono" | "luminance"',default:'"image"',description:"Where tile colour comes from."},{name:"baseColor",type:"string",default:'"#ffffff"',description:"Tile colour for the mono and luminance modes."},{name:"backgroundColor",type:"string",default:'"transparent"',description:"Backdrop behind the tiles."},{name:"invert",type:"boolean",default:"false",description:"Make dark pixels tall instead of bright ones."},{name:"removeBackground",type:"boolean",default:"false",description:"Drop a flat backdrop that touches the image edges, as if it were transparent."},{name:"backgroundTolerance",type:"number",default:"0.12",description:"How far a pixel may stray from the backdrop colour and still be removed, 0 to 1."},{name:"tilt",type:"number",default:"32",description:"Camera angle from straight down, in degrees."},{name:"scale",type:"number",default:"1",description:"Zoom relative to the fitted framing, 1 fills the viewport."},{name:"offsetX",type:"number",default:"0",description:"Horizontal shift as a fraction of the sculpture's width."},{name:"offsetY",type:"number",default:"0",description:"Vertical shift as a fraction of the sculpture's height."},{name:"rotation",type:"number",default:"0",description:"Yaw of the sculpture in degrees; auto-rotation spins on top of it."},{name:"autoRotate",type:"boolean",default:"false",description:"Slowly spin the sculpture."},{name:"rotateSpeed",type:"number",default:"2",description:"Rotation speed in turns per minute."},{name:"dpr",type:"number",default:"2",description:"Upper device pixel ratio bound."},{name:"onError",type:"(error: Error) => void",default:"undefined",description:"Called when the image fails to load or sample."},{name:"className",type:"string",default:"undefined",description:"Extra classes applied to the root."},{name:"children",type:"ReactNode",default:"undefined",description:"Content layered above the effect."}]})]}),(0,l.jsx)(i.lT,{children:(0,l.jsx)(i.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>l.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>f.CopyButton,IH:()=>r.Customize,gI:()=>h,Dn:()=>v,pi:()=>p,W7:()=>i.PreviewColor,Ch:()=>n.PreviewContainer,UD:()=>i.PreviewInput,bg:()=>i.PreviewSelect,yt:()=>i.PreviewSlider,tl:()=>i.PreviewSwitch,Ec:()=>l.PreviewTab,Ub:()=>o.PropTable,VX:()=>l.TabsLayout,bs:()=>m});var l=a(55019);a(27382);var n=a(10236),r=a(69485),i=a(48543),o=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var c=a(95155);a(66729);var f=a(28592),d=a(90650);let m="rounded-lg border bg-background";function h({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,d.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,d.cn)(m,e),...a,children:t})}function v({title:e,description:t,className:a,children:l}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:l})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>n});var l=a(12115);function n(){let[e,t]=(0,l.useState)(0),a=(0,l.useCallback)(()=>{t(e=>e+1)},[]);return(0,l.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);