"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[10654],{10654:(e,t,a)=>{a.r(t),a.d(t,{default:()=>S});var n=a(95155),l=a(12115),r=a(30701),i=a(56388),u=a(90761),s=a(81712),o=a(3907),c=a(2253),d=a(90650);let f=`
varying vec2 vPlane;

void main() {
  vPlane = uv;
  gl_Position = vec4(position.xy * 2.0, 0.0, 1.0);
}
`,p=(e,t)=>{let a=new c.Q1f;try{a.setStyle(e,c.Zr2)}catch{a.setStyle(t,c.Zr2)}return a},m=(e,t)=>{try{e.setStyle(t,c.Zr2)}catch{return}},v=(e,t,a)=>Math.min(a,Math.max(t,e)),h=e=>{let t=window.matchMedia("(min-resolution: 2dppx)");return t.addEventListener("change",e),window.addEventListener("resize",e),()=>{t.removeEventListener("change",e),window.removeEventListener("resize",e)}},g=()=>window.devicePixelRatio||1,x=({speed:e,density:t,range:a,twist:r,spin:i,pan:u,panAngle:o,drift:d,wander:h,seam:g,edgeStrength:x,glow:w,glowFalloff:y,ambient:S,pulse:b,pulseRate:C,sweep:j,sweepAngle:P,sweepScale:G,sweepSpeed:R,color:k,accentColor:A,edgeColor:E,gain:M,grain:D,grainRate:F,vignette:N,backgroundColor:H,opacity:B,cursorInteraction:I,cursorGlow:T,cursorRadius:O,paused:z,adaptiveQuality:W,targetFps:L,ceiling:U,readPointer:V})=>{let _=(0,l.useRef)(null),$=(0,l.useRef)(0),Q=(0,l.useRef)({x:0,y:0,lit:0}),X=(0,l.useRef)({frames:0,span:0,wins:0,cap:4}),{gl:Y,size:Z}=(0,s.C)(),q=Math.round(v(a,1,2)),J=(0,l.useMemo)(()=>`
precision highp float;

varying vec2 vPlane;

uniform vec2 uCanvas;
uniform float uClock;
uniform float uDensity;
uniform float uTwist;
uniform float uSpin;
uniform float uPan;
uniform float uPanAngle;
uniform float uDrift;
uniform float uWander;
uniform float uSeam;
uniform float uEdgeGain;
uniform float uGlow;
uniform float uGlowFall;
uniform float uAmbient;
uniform float uPulse;
uniform float uPulseRate;
uniform float uSweep;
uniform float uSweepAngle;
uniform float uSweepScale;
uniform float uSweepSpeed;
uniform vec3 uPanel;
uniform vec3 uAccent;
uniform vec3 uEdge;
uniform float uGain;
uniform float uGrain;
uniform float uGrainRate;
uniform float uVignette;
uniform vec3 uBackdrop;
uniform float uBackdropAlpha;
uniform float uOpacity;
uniform vec2 uPointer;
uniform float uCursorGain;
uniform float uCursorRadius;

const float TAU = 6.2831853;

float scatter(vec2 seed) {
  vec3 drift = fract(vec3(seed.xyx) * vec3(0.1031, 0.1030, 0.0973));
  drift += dot(drift, drift.yzx + 33.33);
  return fract((drift.x + drift.y) * drift.z);
}

vec2 scatter2(vec2 seed) {
  vec3 drift = fract(vec3(seed.xyx) * vec3(0.1031, 0.1030, 0.0973));
  drift += dot(drift, drift.yzx + 33.33);
  return fract((drift.xx + drift.yz) * drift.zy);
}

float facet(vec2 offset, float turn) {
  float crest = -1e5;
  for (int i = 0; i < 3; i++) {
    float lean = turn + float(i) * TAU / 3.0;
    crest = max(crest, dot(offset, vec2(cos(lean), sin(lean))));
  }
  return crest;
}

vec2 siteOf(vec2 cell) {
  float pace = scatter(cell);
  float march = (uClock * uDrift + pace) * (pace * 0.5 + 0.5);
  float leg = floor(march);
  float k = fract(march);
  vec2 from = scatter2(cell + leg);
  vec2 to = scatter2(cell + leg + 1.0);
  vec2 spot = mix(from, to, k * k * (3.0 - 2.0 * k));
  return cell + 0.5 + (spot - 0.5) * uWander;
}

float softClip(float x) {
  float fall = exp(-2.0 * max(x, 0.0));
  return (1.0 - fall) / (1.0 + fall);
}

void main() {
  vec2 pixel = vPlane * uCanvas;
  vec2 field = (pixel - 0.5 * uCanvas) / max(uCanvas.y, 1.0);

  float t = uClock;
  float turn = uTwist + t * uSpin;

  vec2 slide = vec2(cos(uPanAngle), sin(uPanAngle)) * t * uPan;
  vec2 lattice = field * uDensity + slide;
  vec2 home = floor(lattice);

  float best = 1e5;
  vec2 winner = vec2(0.0);
  vec2 winSite = vec2(0.0);

  float runner = 1e5;

  for (int gx = -${q}; gx <= ${q}; gx++) {
    for (int gy = -${q}; gy <= ${q}; gy++) {
      vec2 cell = home + vec2(float(gx), float(gy));
      vec2 site = siteOf(cell);
      float reach = facet(lattice - site, turn);

      if (reach < best) {
        runner = best;
        best = reach;
        winner = cell;
        winSite = site;
      } else if (reach < runner) {
        runner = reach;
      }
    }
  }

  float gap = runner - best;
  float unit = uDensity / max(uCanvas.y, 1.0);
  float slope = max(length(vec2(dFdx(gap), dFdy(gap))), unit * 0.35);
  float span = gap / slope;

  float wide = max(uSeam, 0.1);
  float rim = 1.0 - smoothstep(wide - 1.1, wide + 1.1, span);
  float halo = uGlow * exp(-span / max(uGlowFall, 0.5));

  float tag = scatter(winner + 3.7);

  float breath = 0.5 + 0.5 * sin(t * uPulseRate + tag * TAU);

  vec2 lane = vec2(cos(uSweepAngle), sin(uSweepAngle));
  float travel = dot(winSite, lane) / max(uSweepScale, 0.001) - t * uSweepSpeed;
  float wave = 0.5 + 0.5 * sin(travel);
  wave = wave * wave * (3.0 - 2.0 * wave);
  wave = mix(tag * tag, wave, 0.55);

  vec2 away = ((winSite - slide) / max(uDensity, 0.001)) - uPointer;
  float near = exp(-dot(away, away) / max(uCursorRadius * uCursorRadius, 1e-4));

  float charge = clamp(
    breath * uPulse + wave * uSweep + near * uCursorGain,
    0.0,
    1.0
  );

  float body = max(uAmbient + charge, 0.0);
  float line = rim * uEdgeGain + halo;

  vec3 tone = mix(uPanel, uAccent, charge);
  vec3 tint = (tone * body + uEdge * line) / max(body + line, 1e-4);

  float mass = softClip((body + line) * uGain);

  float vig = smoothstep(1.5, 0.3, length(field));
  float shade = (1.0 - uVignette) + uVignette * vig;
  mass *= shade;

  vec3 rgb = tint * mass;
  float rest = uBackdropAlpha * (1.0 - mass);
  rgb += uBackdrop * rest;
  float alpha = mass + rest;

  float tick = floor(t * max(uGrainRate, 1.0));
  float speck = scatter(pixel + tick * 17.0) - 0.5;
  rgb += speck * uGrain * (0.25 + 0.75 * alpha);
  rgb = clamp(rgb, vec3(0.0), vec3(alpha));

  gl_FragColor = vec4(rgb, alpha) * uOpacity;
}
`,[q]),K=(0,l.useMemo)(()=>({uCanvas:{value:new c.I9Y(1,1)},uClock:{value:0},uDensity:{value:5},uTwist:{value:0},uSpin:{value:0},uPan:{value:0},uPanAngle:{value:.9},uDrift:{value:1},uWander:{value:1},uSeam:{value:1.3},uEdgeGain:{value:1.1},uGlow:{value:.14},uGlowFall:{value:9},uAmbient:{value:.16},uPulse:{value:0},uPulseRate:{value:1.1},uSweep:{value:.75},uSweepAngle:{value:.9},uSweepScale:{value:1.2},uSweepSpeed:{value:.45},uPanel:{value:p("#2a1247","#2a1247")},uAccent:{value:p("#d946ef","#d946ef")},uEdge:{value:p("#f0abfc","#f0abfc")},uGain:{value:1},uGrain:{value:.04},uGrainRate:{value:24},uVignette:{value:.25},uBackdrop:{value:p("#0a0a0a","#0a0a0a")},uBackdropAlpha:{value:1},uOpacity:{value:1},uPointer:{value:new c.I9Y(0,0)},uCursorGain:{value:0},uCursorRadius:{value:.28}}),[]);return(0,l.useEffect)(()=>{let e=_.current;e&&(e.fragmentShader=J,e.needsUpdate=!0)},[J]),(0,l.useEffect)(()=>{let e=_.current;if(!e)return;m(e.uniforms.uPanel.value,k),m(e.uniforms.uAccent.value,A),m(e.uniforms.uEdge.value,E);let t="transparent"===H||"none"===H||""===H;e.uniforms.uBackdropAlpha.value=+!t,t||m(e.uniforms.uBackdrop.value,H)},[k,A,E,H]),(0,s.D)((a,n)=>{let l=_.current;if(!l)return;let s=Math.min(n,.05);z||($.current+=s*e);let c=Y.getPixelRatio(),f=l.uniforms;f.uCanvas.value.set(Z.width*c,Z.height*c),f.uClock.value=$.current,f.uDensity.value=Math.max(t,1),f.uTwist.value=r,f.uSpin.value=i,f.uPan.value=u,f.uPanAngle.value=o,f.uDrift.value=d,f.uWander.value=h,f.uSeam.value=g,f.uEdgeGain.value=x,f.uGlow.value=w,f.uGlowFall.value=Math.max(y,.1),f.uAmbient.value=S,f.uPulse.value=b,f.uPulseRate.value=C,f.uSweep.value=j,f.uSweepAngle.value=P,f.uSweepScale.value=G,f.uSweepSpeed.value=R,f.uGain.value=M,f.uGrain.value=D,f.uGrainRate.value=F,f.uVignette.value=N,f.uOpacity.value=B,f.uCursorRadius.value=Math.max(O,.01);let p=V(),m=1-Math.exp(-(10*s)),v=Z.width/Math.max(Z.height,1),k=(p.x-.5)*v,A=p.y-.5,E=I&&p.inside?T:0;if(Q.current.x+=(k-Q.current.x)*m,Q.current.y+=(A-Q.current.y)*m,Q.current.lit+=(E-Q.current.lit)*m,f.uPointer.value.set(Q.current.x,Q.current.y),f.uCursorGain.value=Q.current.lit,!W)return;let H=X.current;if(H.frames+=1,H.span+=n,H.span<.75)return;let q=H.frames/H.span;H.frames=0,H.span=0;let J=Math.min(U,H.cap);q<.85*L&&c>.6?(H.wins=0,H.cap=Math.max(.6,.9*c),Y.setPixelRatio(Math.max(.6,.75*c))):q>.98*L&&c<J-.01?(H.wins+=1,H.wins>=3&&(H.wins=0,Y.setPixelRatio(Math.min(J,1.25*c)))):H.wins=0}),(0,n.jsxs)("mesh",{frustumCulled:!1,children:[(0,n.jsx)("planeGeometry",{args:[1,1]}),(0,n.jsx)("shaderMaterial",{ref:_,vertexShader:f,fragmentShader:J,uniforms:K,transparent:!0,depthTest:!1,depthWrite:!1,premultipliedAlpha:!0})]})},w=({speed:e=1,density:t=5,range:a=2,twist:r=0,spin:i=0,pan:u=0,panAngle:s=.9,drift:c=1,wander:f=1,seam:p=1.3,edgeStrength:m=1.1,glow:w=.14,glowFalloff:y=9,ambient:S=.16,pulse:b=0,pulseRate:C=1.1,sweep:j=.75,sweepAngle:P=.9,sweepScale:G=1.2,sweepSpeed:R=.45,color:k="#2a1247",accentColor:A="#d946ef",edgeColor:E="#f0abfc",gain:M=1,grain:D=.04,grainRate:F=24,vignette:N=.25,backgroundColor:H="#0a0a0a",opacity:B=1,cursorInteraction:I=!0,cursorGlow:T=.45,cursorRadius:O=.28,paused:z=!1,adaptiveQuality:W=!0,targetFps:L=60,dpr:U=1.75,className:V,children:_})=>{let $=(0,l.useRef)(null),Q=(0,l.useRef)({x:.5,y:.5,inside:!1}),[X,Y]=(0,l.useState)(!0),Z=Math.min((0,l.useSyncExternalStore)(h,g,()=>1),Math.max(U,.5)),q=(0,l.useCallback)(()=>Q.current,[]);return(0,l.useEffect)(()=>{let e=$.current;if(!e||"undefined"==typeof IntersectionObserver)return;let t=new IntersectionObserver(([e])=>Y(e.isIntersecting),{threshold:0});return t.observe(e),()=>t.disconnect()},[]),(0,l.useEffect)(()=>{let e=$.current;if(!e||!I)return;let t=t=>{let a=e.getBoundingClientRect();a.width&&a.height&&(Q.current.x=v((t.clientX-a.left)/a.width,0,1),Q.current.y=v(1-(t.clientY-a.top)/a.height,0,1),Q.current.inside=!0)},a=()=>{Q.current.inside=!1};return e.addEventListener("pointermove",t),e.addEventListener("pointerleave",a),()=>{e.removeEventListener("pointermove",t),e.removeEventListener("pointerleave",a)}},[I]),(0,n.jsxs)("div",{ref:$,className:(0,d.cn)("relative overflow-hidden",V),children:[(0,n.jsx)("div",{className:"absolute inset-0",children:(0,n.jsx)(o.Hl,{orthographic:!0,dpr:Z,frameloop:X?"always":"demand",gl:{antialias:!1,alpha:!0,powerPreference:"high-performance"},children:(0,n.jsx)(x,{speed:e,density:t,range:a,twist:r,spin:i,pan:u,panAngle:s,drift:c,wander:f,seam:p,edgeStrength:m,glow:w,glowFalloff:y,ambient:S,pulse:b,pulseRate:C,sweep:j,sweepAngle:P,sweepScale:G,sweepSpeed:R,color:k,accentColor:A,edgeColor:E,gain:M,grain:D,grainRate:F,vignette:N,backgroundColor:H,opacity:B,cursorInteraction:I,cursorGlow:T,cursorRadius:O,paused:z,adaptiveQuality:W,targetFps:L,ceiling:Z,readPointer:q})})}),_?(0,n.jsx)("div",{className:"relative z-10 h-full w-full",children:_}):null]})},y=()=>()=>{},S=()=>{let[e,t]=(0,u.I)(),{resolvedTheme:a}=(0,r.D)(),s=!(0,l.useSyncExternalStore)(y,()=>!0,()=>!1)||"light"!==a,[o,c]=(0,l.useState)(1),[d,f]=(0,l.useState)(5),[p,m]=(0,l.useState)(2),[v,h]=(0,l.useState)(0),[g,x]=(0,l.useState)(0),[S,b]=(0,l.useState)(0),[C,j]=(0,l.useState)(.9),[P,G]=(0,l.useState)(1),[R,k]=(0,l.useState)(1),[A,E]=(0,l.useState)(1.3),[M,D]=(0,l.useState)(1.1),[F,N]=(0,l.useState)(.14),[H,B]=(0,l.useState)(9),[I,T]=(0,l.useState)(.16),[O,z]=(0,l.useState)(0),[W,L]=(0,l.useState)(1.1),[U,V]=(0,l.useState)(.75),[_,$]=(0,l.useState)(.9),[Q,X]=(0,l.useState)(1.2),[Y,Z]=(0,l.useState)(.45),[q,J]=(0,l.useState)(1),[K,ee]=(0,l.useState)(.04),[et,ea]=(0,l.useState)(24),[en,el]=(0,l.useState)(.25),[er,ei]=(0,l.useState)(1),[eu,es]=(0,l.useState)(!0),[eo,ec]=(0,l.useState)(.45),[ed,ef]=(0,l.useState)(.28),[ep,em]=(0,l.useState)(!1),[ev,eh]=(0,l.useState)(null),[eg,ex]=(0,l.useState)(null),[ew,ey]=(0,l.useState)(null),[eS,eb]=(0,l.useState)(null),eC=(0,l.useMemo)(()=>null!==ev?ev:s?"#2a1247":"#ece6f6",[s,ev]),ej=(0,l.useMemo)(()=>null!==eg?eg:s?"#d946ef":"#c026d3",[s,eg]),eP=(0,l.useMemo)(()=>null!==ew?ew:s?"#f0abfc":"#7e22ce",[s,ew]),eG=(0,l.useMemo)(()=>null!==eS?eS:s?"#0a0a0a":"#ffffff",[s,eS]);return(0,n.jsxs)("div",{children:[(0,n.jsx)(i.Bg,{}),(0,n.jsxs)(i.VX,{children:[(0,n.jsxs)(i.Ec,{children:[(0,n.jsx)(i.Ch,{onRefresh:t,minHeight:520,children:(0,n.jsx)("div",{className:"relative h-full w-full",children:(0,n.jsx)(w,{className:"h-full w-full",speed:o,density:d,range:p,twist:v,spin:g,pan:S,panAngle:C,drift:P,wander:R,seam:A,edgeStrength:M,glow:F,glowFalloff:H,ambient:I,pulse:O,pulseRate:W,sweep:U,sweepAngle:_,sweepScale:Q,sweepSpeed:Y,color:eC,accentColor:ej,edgeColor:eP,gain:q,grain:K,grainRate:et,vignette:en,backgroundColor:eG,opacity:er,cursorInteraction:eu,cursorGlow:eo,cursorRadius:ed,paused:ep},e)})}),(0,n.jsxs)(i.IH,{children:[(0,n.jsx)(i.bg,{title:"Range",value:String(p),onChange:e=>m(Number(e)),options:[{value:"1",label:"Fast"},{value:"2",label:"Clean"}]}),(0,n.jsx)(i.yt,{title:"Speed",min:0,max:3,step:.05,value:o,onChange:c}),(0,n.jsx)(i.yt,{title:"Density",min:2,max:14,step:.5,value:d,onChange:f}),(0,n.jsx)(i.yt,{title:"Twist",min:0,max:3.14,step:.01,value:v,onChange:h}),(0,n.jsx)(i.yt,{title:"Spin",min:-.5,max:.5,step:.01,value:g,onChange:x}),(0,n.jsx)(i.yt,{title:"Pan",min:0,max:1,step:.01,value:S,onChange:b}),(0,n.jsx)(i.yt,{title:"Pan Angle",min:0,max:6.28,step:.01,value:C,onChange:j}),(0,n.jsx)(i.yt,{title:"Drift",min:0,max:2,step:.01,value:P,onChange:G}),(0,n.jsx)(i.yt,{title:"Wander",min:0,max:1,step:.01,value:R,onChange:k}),(0,n.jsx)(i.yt,{title:"Seam",min:.4,max:5,step:.1,value:A,onChange:E}),(0,n.jsx)(i.yt,{title:"Edge Strength",min:0,max:3,step:.05,value:M,onChange:D}),(0,n.jsx)(i.yt,{title:"Glow",min:0,max:1,step:.01,value:F,onChange:N}),(0,n.jsx)(i.yt,{title:"Glow Falloff",min:1,max:20,step:.5,value:H,onChange:B}),(0,n.jsx)(i.yt,{title:"Ambient",min:0,max:1,step:.01,value:I,onChange:T}),(0,n.jsx)(i.yt,{title:"Pulse",min:0,max:1,step:.01,value:O,onChange:z}),(0,n.jsx)(i.yt,{title:"Pulse Rate",min:0,max:4,step:.05,value:W,onChange:L}),(0,n.jsx)(i.yt,{title:"Sweep",min:0,max:1.5,step:.01,value:U,onChange:V}),(0,n.jsx)(i.yt,{title:"Sweep Angle",min:0,max:6.28,step:.01,value:_,onChange:$}),(0,n.jsx)(i.yt,{title:"Sweep Scale",min:.5,max:10,step:.1,value:Q,onChange:X}),(0,n.jsx)(i.yt,{title:"Sweep Speed",min:0,max:5,step:.05,value:Y,onChange:Z}),(0,n.jsx)(i.yt,{title:"Gain",min:.2,max:3,step:.05,value:q,onChange:J}),(0,n.jsx)(i.yt,{title:"Grain",min:0,max:.2,step:.005,value:K,onChange:ee}),(0,n.jsx)(i.yt,{title:"Grain Rate",min:1,max:60,step:1,value:et,onChange:ea}),(0,n.jsx)(i.yt,{title:"Vignette",min:0,max:1,step:.01,value:en,onChange:el}),(0,n.jsx)(i.yt,{title:"Opacity",min:0,max:1,step:.01,value:er,onChange:ei}),(0,n.jsx)(i.yt,{title:"Cursor Glow",min:0,max:2,step:.05,value:eo,onChange:ec}),(0,n.jsx)(i.yt,{title:"Cursor Radius",min:.05,max:1.5,step:.05,value:ed,onChange:ef}),(0,n.jsx)(i.W7,{title:"Panel",value:eC,onChange:eh}),(0,n.jsx)(i.W7,{title:"Accent",value:ej,onChange:ex}),(0,n.jsx)(i.W7,{title:"Edge",value:eP,onChange:ey}),(0,n.jsx)(i.W7,{title:"Background",value:eG,onChange:eb}),(0,n.jsx)(i.tl,{title:"Cursor Interaction",checked:eu,onChange:es}),(0,n.jsx)(i.tl,{title:"Paused",checked:ep,onChange:em})]}),(0,n.jsx)(i.Ub,{data:[{name:"speed",type:"number",default:"1",description:"Overall animation rate."},{name:"density",type:"number",default:"5",description:"How many panels fit across the shorter side."},{name:"range",type:"number",default:"2",description:"Neighbour rings searched per pixel, 1 is faster."},{name:"twist",type:"number",default:"0",description:"Resting rotation of the panels, in radians."},{name:"spin",type:"number",default:"0",description:"How fast the panels rotate."},{name:"pan",type:"number",default:"0",description:"How fast the whole wall glides across the frame."},{name:"panAngle",type:"number",default:"0.9",description:"Direction the wall glides, in radians."},{name:"drift",type:"number",default:"1",description:"How often each panel picks a new anchor."},{name:"wander",type:"number",default:"1",description:"How far a panel can travel inside its cell, 0 to 1."},{name:"seam",type:"number",default:"1.3",description:"Seam thickness in pixels."},{name:"edgeStrength",type:"number",default:"1.1",description:"Brightness of the seam."},{name:"glow",type:"number",default:"0.14",description:"Softness of the light bleeding off the seam."},{name:"glowFalloff",type:"number",default:"9",description:"How far the seam light reaches."},{name:"ambient",type:"number",default:"0.16",description:"Brightness of an idle panel."},{name:"pulse",type:"number",default:"0",description:"How much each panel breathes on its own, 0 keeps them steady."},{name:"pulseRate",type:"number",default:"1.1",description:"How fast panels breathe."},{name:"sweep",type:"number",default:"0.75",description:"Strength of the wave that lights panels in sequence."},{name:"sweepAngle",type:"number",default:"0.9",description:"Direction the sweep travels, in radians."},{name:"sweepScale",type:"number",default:"1.2",description:"How many panels the sweep spans."},{name:"sweepSpeed",type:"number",default:"0.45",description:"How fast the sweep travels."},{name:"color",type:"string",default:'"#2a1247"',description:"Colour of a resting panel."},{name:"accentColor",type:"string",default:'"#d946ef"',description:"Colour of a lit panel."},{name:"edgeColor",type:"string",default:'"#f0abfc"',description:"Colour of the seams."},{name:"gain",type:"number",default:"1",description:"Overall exposure."},{name:"grain",type:"number",default:"0.04",description:"Film grain strength, 0 to 1."},{name:"grainRate",type:"number",default:"24",description:"Grain refresh rate, in hertz."},{name:"vignette",type:"number",default:"0.25",description:"Darkening toward the corners, 0 to 1."},{name:"backgroundColor",type:"string",default:'"#0a0a0a"',description:"Colour behind the wall, or transparent."},{name:"opacity",type:"number",default:"1",description:"Opacity of the whole layer."},{name:"cursorInteraction",type:"boolean",default:"true",description:"Let the pointer light up nearby panels."},{name:"cursorGlow",type:"number",default:"0.45",description:"How brightly panels answer the pointer."},{name:"cursorRadius",type:"number",default:"0.28",description:"Radius the pointer reaches, in screen heights."},{name:"paused",type:"boolean",default:"false",description:"Freeze the animation."},{name:"adaptiveQuality",type:"boolean",default:"true",description:"Scale resolution down when frames get expensive."},{name:"targetFps",type:"number",default:"60",description:"Frame rate the quality scaler aims for."},{name:"dpr",type:"number",default:"1.75",description:"Upper device pixel ratio bound."},{name:"className",type:"string",default:"undefined",description:"Extra classes for the wrapper."},{name:"children",type:"ReactNode",default:"undefined",description:"Content layered above the wall."}]})]}),(0,n.jsx)(i.lT,{children:(0,n.jsx)(i.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>n.CodeTab,Bg:()=>o.ComponentHeader,i8:()=>d.CopyButton,IH:()=>r.Customize,gI:()=>m,Dn:()=>h,pi:()=>v,W7:()=>i.PreviewColor,Ch:()=>l.PreviewContainer,UD:()=>i.PreviewInput,bg:()=>i.PreviewSelect,yt:()=>i.PreviewSlider,tl:()=>i.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>u.PropTable,VX:()=>n.TabsLayout,bs:()=>p});var n=a(55019);a(27382);var l=a(10236),r=a(69485),i=a(48543),u=a(87552);a(39260);var s=a(52407),o=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),f=a(90650);let p="rounded-lg border bg-background";function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,f.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function v({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,f.cn)(p,e),...a,children:t})}function h({title:e,description:t,className:a,children:n}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:n})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>l});var n=a(12115);function l(){let[e,t]=(0,n.useState)(0),a=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);