"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[57996],{56388:(e,t,a)=>{a.d(t,{Gv:()=>i.CodeExample,lT:()=>o.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>d.CopyButton,IH:()=>r.Customize,gI:()=>v,Dn:()=>f,pi:()=>p,W7:()=>l.PreviewColor,Ch:()=>n.PreviewContainer,UD:()=>l.PreviewInput,bg:()=>l.PreviewSelect,yt:()=>l.PreviewSlider,tl:()=>l.PreviewSwitch,Ec:()=>o.PreviewTab,Ub:()=>u.PropTable,VX:()=>o.TabsLayout,bs:()=>m});var o=a(55019);a(27382);var n=a(10236),r=a(69485),l=a(48543),u=a(87552);a(39260);var i=a(52407),s=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),h=a(90650);let m="rounded-lg border bg-background";function v({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,h.cn)(m,e),...a,children:t})}function f({title:e,description:t,className:a,children:o}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:o})]})}},57996:(e,t,a)=>{a.r(t),a.d(t,{default:()=>j});var o=a(95155),n=a(12115),r=a(56388),l=a(86049),u=a(90761),i=a(12246),s=a(2253),c=a(90650);let d=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},h=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,m=(e,t,a)=>Math.min(a,Math.max(t,e)),v=null,p=(e,t)=>{if(v||(v=document.createElement("canvas").getContext("2d")),!v)return t;v.fillStyle="#010203",v.fillStyle=e;let a=String(v.fillStyle);if("#010203"===a&&"#010203"!==e.trim().toLowerCase())return t;if(a.startsWith("#")){let e=a.slice(1);return[parseInt(e.slice(0,2),16)/255,parseInt(e.slice(2,4),16)/255,parseInt(e.slice(4,6),16)/255]}let o=a.match(/[\d.]+/g);return!o||o.length<3?t:[Number(o[0])/255,Number(o[1])/255,Number(o[2])/255]},f=e=>e<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4),g=(e,t)=>{let[a,o,n]=e.map(f);if(!t)return[a,o,n];let r=Math.cbrt(.4122214708*a+.5363325363*o+.0514459929*n),l=Math.cbrt(.2119034982*a+.6806995451*o+.1073969566*n),u=Math.cbrt(.0883024619*a+.2817188376*o+.6299787005*n),i=.2104542553*r+.793617785*l-.0040720468*u,s=1.9779984951*r-2.428592205*l+.4505937099*u,c=.0259040371*r+.7827717662*l-.808675766*u,d=Math.hypot(s,c),h=Math.atan2(c,s)+t,m=d*Math.cos(h),v=d*Math.sin(h),p=Math.pow(i+.3963377774*m+.2158037573*v,3),g=Math.pow(i-.1055613458*m-.0638541728*v,3),x=Math.pow(i-.0894841775*m-1.291485548*v,3);return[Math.max(0,4.0767416621*p-3.3077115913*g+.2309699292*x),Math.max(0,-1.2684380046*p+2.6097574011*g-.3413193965*x),Math.max(0,-.0041960863*p-.7034186147*g+1.707614701*x)]},x=`
out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,b=`
precision highp float;
uniform vec2 uResolution;
uniform vec2 uCenter;
uniform vec2 uAxis;
uniform float uEdge;
uniform float uPixelRatio;
uniform float uLineCount;
uniform float uThickness;
uniform float uSpread;
uniform float uGhost;
uniform float uSweep;
uniform float uBreath;
uniform float uTime;
uniform float uEnergy;
uniform vec3 uLine;
uniform vec3 uCore;
uniform float uFlare;
in vec2 vUv;
out vec4 fragColor;

void main() {
  float unit = 0.5 * uResolution.y;
  vec2 offset = (gl_FragCoord.xy - uCenter) / unit;
  vec2 p = vec2(dot(offset, uAxis), dot(offset, vec2(-uAxis.y, uAxis.x)));
  float spread = uSpread * uBreath;
  float kmax = 2.0 * spread / (uEdge * uEdge + spread * spread);
  float r2 = dot(p, p) + 1e-7;
  float k = 2.0 * p.y / r2 / kmax;
  float phase = k * uLineCount * 0.5 - uSweep;
  float fw = max(fwidth(phase), 1e-5);
  float d = abs(fract(phase + 0.5) - 0.5);
  float widthPx = uThickness * uPixelRatio;
  float line = 1.0 - smoothstep(0.5 * widthPx - 0.5, 0.5 * widthPx + 0.6, d / fw);
  line = mix(line, min(widthPx * fw, 8.0), smoothstep(0.2, 0.5, fw));
  float ak = abs(k);
  float kappaEdge = kmax * 0.92;
  float cx = min(abs(p.x) * kappaEdge, 1.0);
  float edgePx = (1.0 - sqrt(1.0 - cx * cx)) / kappaEdge * unit;
  float yPx = abs(p.y) * unit;
  float cover = clamp(max(edgePx, 0.5 * widthPx) + 0.5 - yPx, 0.0, 1.0);
  float window = cover * (1.0 - smoothstep(0.82, 1.12, yPx / max(edgePx, 4.0)));
  float reach = abs(p.x) / uEdge;
  float ghost = (1.0 - smoothstep(1.0, 2.6, ak)) * smoothstep(0.75, 1.1, ak) * 0.045 * uGhost * smoothstep(0.15, 0.5, reach);
  float heat = exp(-reach * 3.2);
  vec3 tint = mix(uLine, uCore, clamp(heat * (1.3 + uFlare * 0.6), 0.0, 1.0));
  float gain = 1.4 * (1.0 + uEnergy * 0.35 * heat) * (1.0 + uFlare * 0.45);
  float body = line * (window + ghost);
  fragColor = vec4(tint * body * gain, body * gain);
}
`,w=`
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uThreshold;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 c = texture(uSource, vUv + uTexel * vec2(-0.5, -0.5));
  c += texture(uSource, vUv + uTexel * vec2(0.5, -0.5));
  c += texture(uSource, vUv + uTexel * vec2(-0.5, 0.5));
  c += texture(uSource, vUv + uTexel * vec2(0.5, 0.5));
  c *= 0.25;
  float knee = 0.45;
  float soft = clamp(c.a - uThreshold + knee, 0.0, 2.0 * knee);
  soft = soft * soft / (4.0 * knee);
  c *= max(soft, c.a - uThreshold) / max(c.a, 1e-4);
  fragColor = c;
}
`,y=`
precision highp float;
uniform sampler2D uSource;
uniform vec2 uStep;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec4 sum = texture(uSource, vUv) * 0.1964825502;
  sum += (texture(uSource, vUv + uStep * 1.4117647059) + texture(uSource, vUv - uStep * 1.4117647059)) * 0.2969069647;
  sum += (texture(uSource, vUv + uStep * 3.2941176471) + texture(uSource, vUv - uStep * 3.2941176471)) * 0.0944703979;
  sum += (texture(uSource, vUv + uStep * 5.1764705882) + texture(uSource, vUv - uStep * 5.1764705882)) * 0.0103813624;
  fragColor = sum;
}
`,C=`
precision highp float;
uniform sampler2D uLines;
uniform sampler2D uGlow;
uniform sampler2D uWide;
uniform vec3 uBackground;
uniform vec3 uInk;
uniform float uGlowAmount;
uniform float uExposure;
uniform float uMode;
in vec2 vUv;
out vec4 fragColor;

vec3 encode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void main() {
  vec4 lineSample = texture(uLines, vUv);
  vec4 bloomSample = texture(uGlow, vUv) * 0.8 + texture(uWide, vUv) * 0.18;
  vec3 lines = lineSample.rgb;
  vec3 bloom = bloomSample.rgb;
  vec3 light = lines + bloom * uGlowAmount;
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;
  vec3 color;
  if (uMode < 0.5) {
    vec3 exposed = 1.0 - exp(-light * uExposure);
    color = uBackground + (1.0 - uBackground) * exposed;
  } else {
    float energy = lineSample.a + bloomSample.a * uGlowAmount * 0.4;
    vec3 hue = (lines + bloom * uGlowAmount * 0.4) / max(energy, 1e-4);
    float cover = clamp(1.0 - exp(-energy * uExposure * 1.6), 0.0, 0.94);
    color = mix(uBackground, hue * uInk, cover);
  }
  fragColor = vec4(encode(color) + grain, 1.0);
}
`,S=(0,n.forwardRef)(function({colors:e=["#B19EEF","#FF9FFC"],backgroundColor:t="#0A0A0A",mode:a="auto",lineCount:r=18,thickness:l=1,spread:u=.36,ghost:v=.6,glow:S=1,intensity:k=1,speed:M=1,breathe:E=.4,angle:F=0,centerY:A=.5,hueShift:j=0,colorCycle:P=0,surge:T=1,clickSurge:L=!0,hoverBoost:B=.5,interactive:I=!0,paused:U=!1,quality:R=1,className:G,style:N,children:W},q){let _=(0,n.useRef)(null),D=(0,n.useRef)(null),Y=(0,n.useSyncExternalStore)(d,h,()=>!1),H=(0,n.useRef)({colors:e,backgroundColor:t,mode:a,lineCount:r,thickness:l,spread:u,ghost:v,glow:S,intensity:k,speed:M,breathe:E,angle:F,centerY:A,hueShift:j,colorCycle:P,surge:T,clickSurge:L,hoverBoost:B,interactive:I,paused:U,quality:R,reduced:Y});return(0,n.useEffect)(()=>{H.current={colors:e,backgroundColor:t,mode:a,lineCount:r,thickness:l,spread:u,ghost:v,glow:S,intensity:k,speed:M,breathe:E,angle:F,centerY:A,hueShift:j,colorCycle:P,surge:T,clickSurge:L,hoverBoost:B,interactive:I,paused:U,quality:R,reduced:Y},D.current?.sync()}),(0,n.useEffect)(()=>{let e=_.current;if(!e)return;let t=((e,t)=>{let a,o=document.createElement("canvas");o.setAttribute("aria-hidden","true"),o.style.position="absolute",o.style.inset="0",o.style.width="100%",o.style.height="100%",o.style.display="block",o.style.pointerEvents="none",e.prepend(o);try{a=new i.WebGLRenderer({canvas:o,alpha:!1,antialias:!1,powerPreference:"high-performance"})}catch{return o.remove(),null}if(!a.capabilities.isWebGL2)return a.dispose(),o.remove(),null;a.autoClear=!1;let n=a.extensions.has("EXT_color_buffer_float")||a.extensions.has("EXT_color_buffer_half_float")?s.ix0:s.OUM,r=new s.qUd(-1,1,1,-1,0,1),l=new s.bdM(2,2),u=(e,t)=>new s.BKk({glslVersion:s.Wdf,uniforms:t,vertexShader:x,fragmentShader:e,depthTest:!1,depthWrite:!1,blending:s.XIg}),c=u(b,{uResolution:{value:new s.I9Y(1,1)},uCenter:{value:new s.I9Y(0,0)},uAxis:{value:new s.I9Y(1,0)},uEdge:{value:1.6},uPixelRatio:{value:1},uLineCount:{value:22},uThickness:{value:1},uSpread:{value:.36},uGhost:{value:1},uSweep:{value:0},uBreath:{value:1},uTime:{value:0},uEnergy:{value:0},uLine:{value:new s.Pq0(1,1,1)},uCore:{value:new s.Pq0(1,1,1)},uFlare:{value:0}}),d=u(w,{uSource:{value:null},uTexel:{value:new s.I9Y(1,1)},uThreshold:{value:.6}}),h=u(y,{uSource:{value:null},uStep:{value:new s.I9Y}}),v=u(C,{uLines:{value:null},uGlow:{value:null},uWide:{value:null},uBackground:{value:new s.Pq0(0,0,0)},uInk:{value:new s.Pq0(1,1,1)},uGlowAmount:{value:1},uExposure:{value:1.2},uMode:{value:0}}),S=new s.eaF(l,c);S.frustumCulled=!1;let k=new s.Z58;k.add(S);let M=(e,t)=>new s.nWS(Math.max(1,e),Math.max(1,t),{type:n,format:s.GWd,minFilter:s.k6q,magFilter:s.k6q,depthBuffer:!1,stencilBuffer:!1,generateMipmaps:!1}),E=null,F=null,A=null,j=null,P=null,T=!1,L=0,B=0,I=!0,U=0,R=0,G=0,N=!1,W=0,q=0,_=1,D=1,Y=1,H=()=>{[E,F,A,j,P].forEach(e=>e?.dispose()),E=F=A=j=P=null},z=(e,t)=>{S.material=e,a.setRenderTarget(t),a.render(k,r)},O=(e,t,a)=>{let o=h.uniforms;o.uSource.value=e.texture,o.uStep.value.set(a/e.width,0),z(h,t),o.uSource.value=t.texture,o.uStep.value.set(0,a/e.height),z(h,e)},V=e=>{q+=9*m(e,0,3)},X=()=>{let e,a,o,n,r,l,u,i,s,h,x,b,w,y,C,S,k,M,T,L,B;if(!E||!F||!A||!j||!P)return;e=t.current,a=c.uniforms,o=!e.paused&&!e.reduced,n=U*e.colorCycle*.45,r=o&&e.colorCycle>0?.35+.95*Math.sin(n)-.35*Math.cos(n):0,l=e.hueShift*Math.PI/180+r,u=g(p(e.colors[0],[.69,.62,.94]),l),i=g(p(e.colors[1],[1,.62,.99]),l),h=.2126*(s=p(e.backgroundColor,[.04,.04,.04]))[0]+.7152*s[1]+.0722*s[2],x="ink"===e.mode||"auto"===e.mode&&h>.5,a.uLine.value.set(...u),a.uCore.value.set(...i),b=_*Y,w=D*Y,C=Math.cos(y=e.angle*Math.PI/180),S=Math.sin(y),k=w*(1-m(e.centerY,0,1)),M=Math.abs(C)>1e-4?b/2/Math.abs(C):1/0,T=Math.abs(S)>1e-4?Math.max(k,w-k)/Math.abs(S):1/0,a.uResolution.value.set(b,w),a.uCenter.value.set(b/2,k),a.uAxis.value.set(C,S),a.uEdge.value=Math.max(1.35,Math.min(M,T)/(.5*w)),a.uPixelRatio.value=Y,a.uLineCount.value=m(Math.round(e.lineCount),2,160),a.uThickness.value=m(e.thickness,.25,6),a.uSpread.value=m(e.spread,.02,3),a.uGhost.value=m(e.ghost,0,3),a.uSweep.value=R,L=o?1+.12*m(e.breathe,0,2)*Math.sin(.23*U):1,a.uBreath.value=L*(1+.22*W),a.uTime.value=U,a.uEnergy.value=G,a.uFlare.value=m(W,0,2),(B=v.uniforms).uBackground.value.set(...s.map(f)),B.uInk.value.set(.62,.62,.62),B.uGlowAmount.value=m(e.glow,0,3)*(1+.25*G),B.uExposure.value=1.2*m(e.intensity,0,4),B.uMode.value=+!!x,z(c,E);let I=d.uniforms;I.uSource.value=E.texture,I.uTexel.value.set(1/E.width,1/E.height),I.uThreshold.value=.6,z(d,F),O(F,A,1),Y>1.4&&O(F,A,1),I.uSource.value=F.texture,I.uTexel.value.set(4/E.width,4/E.height),I.uThreshold.value=0,z(d,j),O(j,P,1),O(j,P,1);let N=v.uniforms;N.uLines.value=E.texture,N.uGlow.value=F.texture,N.uWide.value=j.texture,z(v,null)},K=e=>{if(L=0,T)return;let a=Math.min(.05,Math.max(0,(e-B)/1e3));B=e,(e=>{let a=t.current,o=!a.paused&&!a.reduced,n=N&&a.interactive&&!a.reduced?m(a.hoverBoost,0,2):0;G+=(n-G)*(1-Math.exp(-e/(n>G?.35:.9)));let r=Math.max(1,Math.ceil(e/(1/240))),l=e/r;for(let e=0;e<r;e++)q+=(-36*W-6*q)*l,W+=q*l;o&&(U+=e,R+=e*m(a.speed,-5,5)*(1+1.4*G+2.5*Math.max(W,0)))})(a),X();let o=t.current,n=!o.paused&&!o.reduced,r=N&&o.interactive&&!o.reduced?o.hoverBoost:0,l=Math.abs(G-r)>.002||Math.abs(W)>.001||Math.abs(q)>.001;I&&!document.hidden&&(n||l)&&(L=requestAnimationFrame(K))},Z=()=>{T||L||!I||(B=performance.now(),L=requestAnimationFrame(K))},J=()=>{let o=e.getBoundingClientRect();_=Math.max(1,o.width),D=Math.max(1,o.height),Y=Math.min(window.devicePixelRatio||1,2)*m(t.current.quality,.25,1),a.setPixelRatio(Y),a.setSize(_,D,!1);let n=Math.round(_*Y),r=Math.round(D*Y);H(),E=M(n,r),F=M(n>>1,r>>1),A=M(n>>1,r>>1),j=M(n>>3,r>>3),P=M(n>>3,r>>3),X(),Z()},Q=e=>{"touch"!==e.pointerType&&(N=!0,Z())},$=()=>{N=!1,Z()},ee=e=>{let a=t.current;0===e.button&&a.interactive&&a.clickSurge&&!a.reduced&&(V(a.surge),Z())};e.addEventListener("pointerenter",Q),e.addEventListener("pointerleave",$),e.addEventListener("pointercancel",$),e.addEventListener("pointerdown",ee);let et=new ResizeObserver(J);et.observe(e);let ea=new IntersectionObserver(e=>{(I=e.some(e=>e.isIntersecting))&&Z()},{rootMargin:"80px"});ea.observe(e);let eo=()=>{document.hidden||Z()};document.addEventListener("visibilitychange",eo);let en=e=>e.preventDefault();return o.addEventListener("webglcontextlost",en),J(),{sync:()=>{Math.abs(Math.min(window.devicePixelRatio||1,2)*m(t.current.quality,.25,1)-Y)>.001?J():X(),Z()},destroy:()=>{T=!0,cancelAnimationFrame(L),e.removeEventListener("pointerenter",Q),e.removeEventListener("pointerleave",$),e.removeEventListener("pointercancel",$),e.removeEventListener("pointerdown",ee),document.removeEventListener("visibilitychange",eo),o.removeEventListener("webglcontextlost",en),et.disconnect(),ea.disconnect(),H(),l.dispose(),[c,d,h,v].forEach(e=>e.dispose()),a.dispose(),a.forceContextLoss(),o.remove()},surge:e=>{t.current.reduced||(V(e),Z())}}})(e,H);return D.current=t,()=>{t?.destroy(),D.current=null}},[]),(0,n.useImperativeHandle)(q,()=>({surge:(e=1)=>D.current?.surge(e)}),[]),(0,o.jsx)("div",{ref:_,className:(0,c.cn)("relative isolate h-full min-h-[240px] w-full overflow-hidden",G),style:{backgroundColor:t,...N},children:W&&(0,o.jsx)("div",{className:"relative z-10 h-full w-full",children:W})})});S.displayName="ConcentricTides";let k={dark:["#B19EEF","#FF9FFC"],light:["#5227FF","#E0409A"],lineCount:18,thickness:1,spread:.36,ghost:.6,glow:1,speed:1,breathe:.4,colorCycle:0},M={aurora:k,mono:{...k,dark:["#FFFFFF","#FFFFFF"],light:["#0A0A0A","#0A0A0A"]},prism:{...k,dark:["#7A8CFF","#8FF6FF"],light:["#2B45E0","#00A3C4"],colorCycle:.5},ember:{...k,dark:["#FF7A45","#FFD27A"],light:["#D14A12","#E08A00"],glow:1.3,speed:.7},dense:{...k,lineCount:44,thickness:.75,spread:.5,ghost:1,glow:.8,speed:.6},still:{...k,lineCount:14,thickness:1.25,spread:.3,ghost:.3,speed:.2,breathe:.1}},E=[{label:"Aurora",value:"aurora"},{label:"Mono",value:"mono"},{label:"Prism",value:"prism"},{label:"Ember",value:"ember"},{label:"Dense",value:"dense"},{label:"Still",value:"still"}],F=[{label:"Auto",value:"auto"},{label:"Glow",value:"glow"},{label:"Ink",value:"ink"}],A=[{name:"colors",type:"[string, string]",default:'["#B19EEF", "#FF9FFC"]',description:"Colour of the arcs and colour of the glowing waist where they converge. The brightest point burns toward white."},{name:"backgroundColor",type:"string",default:'"#0A0A0A"',description:"Colour behind the arcs."},{name:"mode",type:'"auto" | "glow" | "ink"',default:'"auto"',description:"glow adds light for dark backgrounds, ink draws coloured lines for light ones. auto picks from the background brightness."},{name:"lineCount",type:"number",default:"18",description:"Number of bright arcs in the fan. More arcs merge into a longer glowing waist."},{name:"thickness",type:"number",default:"1",description:"Width of each arc in pixels."},{name:"spread",type:"number",default:"0.36",description:"How far the fan opens at the left and right edges, as a fraction of the height."},{name:"ghost",type:"number",default:"0.6",description:"Visibility of the faint outer arcs that sweep off toward the corners, from 0 to 3."},{name:"glow",type:"number",default:"1",description:"Bloom around the converging waist, from 0 (crisp lines only) to 3."},{name:"intensity",type:"number",default:"1",description:"Overall exposure."},{name:"speed",type:"number",default:"1",description:"How fast the arcs sweep through the fan. Negative values sweep the other way."},{name:"breathe",type:"number",default:"0.4",description:"Slow opening and closing of the fan, like a tide, from 0 to 2."},{name:"angle",type:"number",default:"0",description:"Rotation of the whole composition in degrees."},{name:"centerY",type:"number",default:"0.5",description:"Vertical position of the waist, from 0 (top) to 1 (bottom). Useful for leaving room for a headline."},{name:"hueShift",type:"number",default:"0",description:"Rotates both colours around the colour wheel, in degrees."},{name:"colorCycle",type:"number",default:"0",description:"Speed at which both colours drift back and forth around the colour wheel. 0 keeps them fixed."},{name:"surge",type:"number",default:"1",description:"Strength of a surge: the fan swells open, brightens and speeds up, then settles back on a spring."},{name:"clickSurge",type:"boolean",default:"true",description:"Clicking the background sends a surge."},{name:"hoverBoost",type:"number",default:"0.5",description:"How much the sweep quickens and the waist brightens while the pointer is over the component, from 0 to 2."},{name:"interactive",type:"boolean",default:"true",description:"Respond to hover and clicks."},{name:"paused",type:"boolean",default:"false",description:"Freeze the sweep. Reduced-motion users always get a still frame."},{name:"quality",type:"number",default:"1",description:"Resolution scale from 0.25 to 1. Lower values are cheaper on large screens."},{name:"ref",type:"{ surge }",default:"—",description:"surge(strength) sends a surge from code, for example when a form is submitted."},{name:"children",type:"ReactNode",default:"—",description:"Content placed over the background."},{name:"className",type:"string",default:"—",description:"Classes for the root element. It fills its parent, with a 240px minimum height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."}],j=()=>{let[e,t]=(0,u.I)(),a="dark"===(0,l.Y)(),[i,s]=(0,n.useState)("aurora"),[c,d]=(0,n.useState)(k),h=e=>t=>d(a=>({...a,[e]:t})),[m,v]=(0,n.useState)(null),p=m??(a?c.dark:c.light),f=e=>t=>{let a=[...p];a[e]=t,v(a)},[g,x]=(0,n.useState)(null),b=g??(a?"#0A0A0A":"#FFFFFF"),[w,y]=(0,n.useState)("auto"),[C,j]=(0,n.useState)(1),[P,T]=(0,n.useState)(0),[L,B]=(0,n.useState)(.5),[I,U]=(0,n.useState)(0),[R,G]=(0,n.useState)(1),[N,W]=(0,n.useState)(.5),[q,_]=(0,n.useState)(!0),[D,Y]=(0,n.useState)(!0),[H,z]=(0,n.useState)(!1);return(0,o.jsxs)("div",{children:[(0,o.jsx)(r.Bg,{}),(0,o.jsxs)(r.VX,{children:[(0,o.jsxs)(r.Ec,{children:[(0,o.jsx)(r.Ch,{onRefresh:t,minHeight:560,enableResponsive:!0,children:(0,o.jsx)("div",{className:"relative h-full w-full",children:(0,o.jsx)(S,{colors:p,backgroundColor:b,mode:w,lineCount:c.lineCount,thickness:c.thickness,spread:c.spread,ghost:c.ghost,glow:c.glow,intensity:C,speed:c.speed,breathe:c.breathe,angle:P,centerY:L,hueShift:I,colorCycle:c.colorCycle,surge:R,clickSurge:q,hoverBoost:N,interactive:D,paused:H},e)})}),(0,o.jsxs)(r.IH,{children:[(0,o.jsx)(r.bg,{title:"Preset",value:i,options:E,onChange:e=>{s(e),d(M[e]??k),v(null)}}),(0,o.jsx)(r.bg,{title:"Mode",value:w,options:F,onChange:e=>y(e)}),(0,o.jsx)(r.W7,{title:"Arcs",value:p[0],onChange:f(0)}),(0,o.jsx)(r.W7,{title:"Waist",value:p[1],onChange:f(1)}),(0,o.jsx)(r.W7,{title:"Background",value:b,onChange:x}),(0,o.jsx)(r.yt,{title:"Lines",min:4,max:80,step:1,value:c.lineCount,onChange:h("lineCount")}),(0,o.jsx)(r.yt,{title:"Thickness",min:.5,max:3,step:.05,value:c.thickness,valueUnit:"px",onChange:h("thickness")}),(0,o.jsx)(r.yt,{title:"Spread",min:.1,max:1.2,step:.01,value:c.spread,onChange:h("spread")}),(0,o.jsx)(r.yt,{title:"Ghost",min:0,max:3,step:.05,value:c.ghost,onChange:h("ghost")}),(0,o.jsx)(r.yt,{title:"Glow",min:0,max:3,step:.05,value:c.glow,onChange:h("glow")}),(0,o.jsx)(r.yt,{title:"Intensity",min:.2,max:3,step:.05,value:C,onChange:j}),(0,o.jsx)(r.yt,{title:"Speed",min:-3,max:3,step:.05,value:c.speed,onChange:h("speed")}),(0,o.jsx)(r.yt,{title:"Breathe",min:0,max:2,step:.05,value:c.breathe,onChange:h("breathe")}),(0,o.jsx)(r.yt,{title:"Angle",min:-90,max:90,step:1,value:P,valueUnit:"\xb0",onChange:T}),(0,o.jsx)(r.yt,{title:"Center Y",min:.1,max:.9,step:.01,value:L,onChange:B}),(0,o.jsx)(r.yt,{title:"Hue Shift",min:-180,max:180,step:1,value:I,valueUnit:"\xb0",onChange:U}),(0,o.jsx)(r.yt,{title:"Color Cycle",min:0,max:2,step:.05,value:c.colorCycle,onChange:h("colorCycle")}),(0,o.jsx)(r.yt,{title:"Surge",min:0,max:3,step:.05,value:R,onChange:G}),(0,o.jsx)(r.yt,{title:"Hover Boost",min:0,max:2,step:.05,value:N,onChange:W}),(0,o.jsx)(r.tl,{title:"Click Surge",checked:q,onChange:_}),(0,o.jsx)(r.tl,{title:"Interactive",checked:D,onChange:Y}),(0,o.jsx)(r.tl,{title:"Paused",checked:H,onChange:z})]}),(0,o.jsx)(r.Ub,{data:A})]}),(0,o.jsx)(r.lT,{children:(0,o.jsx)(r.Gv,{})})]})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>u});var o=a(12115),n=a(30701);let r=()=>()=>{},l=()=>"light";function u(){let{resolvedTheme:e}=(0,n.D)();return(0,o.useSyncExternalStore)(r,()=>"dark"===e?"dark":"light",l)}},90761:(e,t,a)=>{a.d(t,{I:()=>n});var o=a(12115);function n(){let[e,t]=(0,o.useState)(0),a=(0,o.useCallback)(()=>{t(e=>e+1)},[]);return(0,o.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);