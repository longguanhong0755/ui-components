"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[38907],{38907:(e,t,a)=>{a.r(t),a.d(t,{default:()=>L});var l=a(95155),r=a(12115),u=a(86049),o=a(56388),i=a(90761),n=a(81712),s=a(3907),c=a(2253),d=a(90650);let v=["#5227FF","#FF9FFC"],p=" .:~+*#%@",h='ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace',f=`
void main() {
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,m=`
precision highp float;

uniform vec2 uSize;
uniform vec2 uView;

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 e = b - a;
  float t = clamp(dot(p - a, e) / max(dot(e, e), 1e-4), 0.0, 1.0);
  return length(p - a - e * t);
}
`,x=`${m}
uniform sampler2D uVelocity;
uniform float uDt;
uniform float uDecay;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform vec2 uBrushVelocity;
uniform float uRadius;
uniform float uBlend;

void main() {
  vec2 uv = gl_FragCoord.xy / uSize;
  vec2 p = uv * uView - uView * 0.5;
  vec2 v = texture2D(uVelocity, uv).xy;
  vec2 carried = texture2D(uVelocity, uv - v * uDt / uView).xy * uDecay;
  float d = segment(p, uFrom, uTo) / uRadius;
  float w = clamp(exp(-d * d) * uBlend, 0.0, 1.0);
  gl_FragColor = vec4(mix(carried, uBrushVelocity, w), 0.0, 1.0);
}
`,g=`${m}
uniform sampler2D uVelocity;

void main() {
  vec2 texel = 1.0 / uSize;
  vec2 uv = gl_FragCoord.xy * texel;
  vec2 h = uView / uSize;
  float l = texture2D(uVelocity, uv - vec2(texel.x, 0.0)).x;
  float r = texture2D(uVelocity, uv + vec2(texel.x, 0.0)).x;
  float b = texture2D(uVelocity, uv - vec2(0.0, texel.y)).y;
  float t = texture2D(uVelocity, uv + vec2(0.0, texel.y)).y;
  gl_FragColor = vec4(0.5 * ((r - l) / h.x + (t - b) / h.y), 0.0, 0.0, 1.0);
}
`,y=`${m}
uniform sampler2D uPressure;
uniform sampler2D uDivergence;

void main() {
  vec2 texel = 1.0 / uSize;
  vec2 uv = gl_FragCoord.xy * texel;
  vec2 h = uView / uSize;
  float l = texture2D(uPressure, uv - vec2(texel.x, 0.0)).x;
  float r = texture2D(uPressure, uv + vec2(texel.x, 0.0)).x;
  float b = texture2D(uPressure, uv - vec2(0.0, texel.y)).x;
  float t = texture2D(uPressure, uv + vec2(0.0, texel.y)).x;
  float ax = 1.0 / (h.x * h.x);
  float ay = 1.0 / (h.y * h.y);
  float divergence = texture2D(uDivergence, uv).x;
  gl_FragColor = vec4(((l + r) * ax + (b + t) * ay - divergence) / (2.0 * (ax + ay)), 0.0, 0.0, 1.0);
}
`,w=`${m}
uniform sampler2D uPressure;
uniform sampler2D uVelocity;

void main() {
  vec2 texel = 1.0 / uSize;
  vec2 uv = gl_FragCoord.xy * texel;
  vec2 h = uView / uSize;
  float l = texture2D(uPressure, uv - vec2(texel.x, 0.0)).x;
  float r = texture2D(uPressure, uv + vec2(texel.x, 0.0)).x;
  float b = texture2D(uPressure, uv - vec2(0.0, texel.y)).x;
  float t = texture2D(uPressure, uv + vec2(0.0, texel.y)).x;
  vec2 v = texture2D(uVelocity, uv).xy - 0.5 * vec2((r - l) / h.x, (t - b) / h.y);
  gl_FragColor = vec4(v, 0.0, 1.0);
}
`,b=`${m}
uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform float uDt;
uniform vec2 uDecay;
uniform float uOffsetDecay;
uniform float uMaxOffset;
uniform float uPush;
uniform vec4 uSplash;
uniform float uSpread;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uRadius;
uniform float uStrength;

void main() {
  vec2 texel = 1.0 / uSize;
  vec2 uv = gl_FragCoord.xy * texel;
  vec2 p = uv * uView - uView * 0.5;
  vec2 v = texture2D(uVelocity, uv).xy;
  vec2 back = uv - v * uDt / uView;
  vec4 center = texture2D(uDye, back);
  vec2 around = (
    texture2D(uDye, back + vec2(texel.x, 0.0)).xy +
    texture2D(uDye, back - vec2(texel.x, 0.0)).xy +
    texture2D(uDye, back + vec2(0.0, texel.y)).xy +
    texture2D(uDye, back - vec2(0.0, texel.y)).xy
  ) * 0.25;
  vec2 dye = mix(center.xy, around, uSpread) * uDecay;
  vec2 offset = center.zw * uOffsetDecay + v * uDt * uPush;
  vec2 fromSplash = p - uSplash.xy;
  float r = length(fromSplash);
  float g = exp(-r * r / (uSplash.w * uSplash.w)) * smoothstep(0.0, uSplash.w * 0.25, r);
  offset += fromSplash / max(r, 1e-3) * g * uSplash.z * uDt;
  float reach = length(offset);
  if (reach > uMaxOffset) offset *= uMaxOffset / reach;
  float d = segment(p, uFrom, uTo) / uRadius;
  float paint = clamp(exp(-d * d) * uStrength, 0.0, 1.0);
  gl_FragColor = vec4(max(dye, vec2(paint)), offset);
}
`,C=`
precision highp float;

#define MAX_RIPPLES 24

uniform vec2 uGrid;
uniform vec2 uCell;
uniform vec2 uView;
uniform float uTime;
uniform float uClock;
uniform float uScale;
uniform vec2 uSeed;
uniform float uLevel;
uniform float uRange;
uniform float uPeriod;
uniform float uWaves;
uniform float uFoam;
uniform float uContours;
uniform float uWet;
uniform float uDepthFade;
uniform float uCount;
uniform vec4 uRipples[MAX_RIPPLES];
uniform float uRippleSize;
uniform sampler2D uDye;
uniform float uWakeGain;

float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

vec2 gradient(vec2 i) {
  float a = hash(i + 19.19) * 6.2831853;
  return vec2(cos(a), sin(a));
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(gradient(i), f);
  float b = dot(gradient(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(gradient(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(gradient(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float terrain(vec2 q) {
  vec2 w = vec2(noise(q * 0.55 + uSeed), noise(q * 0.55 + uSeed + 13.7));
  q += w * 0.85;
  float h = 0.5 + 0.62 * noise(q * 0.8 + uSeed * 0.7) + 0.26 * noise(q * 1.9 - uSeed) + 0.09 * noise(q * 4.3 + 3.1);
  float channel = clamp(1.0 - abs(noise(q * 0.7 + uSeed * 1.3 + 7.0)) * 2.6, 0.0, 1.0);
  return h - 0.13 * pow(channel, 6.0);
}

void main() {
  vec2 cell = floor(gl_FragCoord.xy);
  float rowFromTop = uGrid.y - 1.0 - cell.y;
  vec2 p = vec2((cell.x + 0.5) * uCell.x - uView.x * 0.5, uView.y * 0.5 - (rowFromTop + 0.5) * uCell.y);
  float unit = 430.0 * uScale;
  vec2 q = p / unit;
  vec4 stream = texture2D(uDye, (p + uView * 0.5) / uView);
  float trail = pow(clamp(stream.x, 0.0, 1.0), 0.9) * uWakeGain * smoothstep(0.05, 0.16, stream.x);
  float trailHeat = max(clamp(stream.y, 0.0, 1.0), 0.72 * sqrt(clamp(stream.x, 0.0, 1.0)));
  float shift = length(stream.zw);
  vec2 moved = (p - stream.zw * smoothstep(3.0, 8.0, shift)) / unit;
  float h = terrain(moved);
  float e = 0.75 * uCell.x / unit;
  float hx = (terrain(moved + vec2(e, 0.0)) - terrain(moved - vec2(e, 0.0))) / (2.0 * e);
  float hy = (terrain(moved + vec2(0.0, e)) - terrain(moved - vec2(0.0, e))) / (2.0 * e);
  float slope = max(length(vec2(hx, hy)) / unit, 1e-5);

  float phase = uTime / max(uPeriod, 1.0) * 6.2831853;
  float swing = 0.085 * uRange;
  float level = uLevel + swing * sin(phase);
  float lapAmount = 0.007 * uWaves;
  float lap = lapAmount * (0.6 * sin(dot(moved, vec2(0.8, 0.6)) * 7.0 - uTime * 1.3) + 0.4 * sin(dot(moved, vec2(-0.45, 0.9)) * 10.5 - uTime * 1.9));

  float ripple = 0.0;
  float rippleWidth = uCell.y * 0.55;
  float rippleSpeed = 120.0 * uRippleSize;
  for (int i = 0; i < MAX_RIPPLES; i++) {
    vec4 source = uRipples[i];
    float age = uClock - source.z;
    if (source.w <= 0.0 || age < 0.0 || age > 4.0) continue;
    float r = length((p - source.xy) * vec2(1.0, uCell.x / uCell.y * 1.9));
    float front = age * rippleSpeed;
    float x = (r - front) / rippleWidth;
    float y = (r - front + uCell.y * 1.6) / rippleWidth;
    float crest = exp(-x * x) + 0.45 * exp(-y * y);
    ripple = max(ripple, source.w * crest * exp(-age * 0.9) * smoothstep(0.0, uCell.y, r) / (1.0 + front / 420.0));
  }

  float surface = level + lap;
  float depth = surface - h;
  float reach = depth / slope;
  float light = 0.0;
  float heat = 0.0;
  float neutral = 0.0;

  if (depth > 0.0) {
    float edge = exp(-reach / (uCell.y * 0.8));
    float breakup = 0.5 + 0.5 * noise(moved * 16.0 + vec2(uTime * 0.22, -uTime * 0.15));
    float lace = smoothstep(0.05, 0.4, noise(moved * 20.0 + vec2(uTime * 0.16, -uTime * 0.1))) * exp(-reach / (uCell.y * 3.6));
    float foam = (edge * (0.5 + 0.7 * breakup) + lace * 0.4) * uFoam;
    float drift = noise(moved * 1.3 + vec2(uTime * 0.03, uTime * 0.018));
    float swell = 0.5 + 0.5 * sin(dot(moved, vec2(0.22, 0.975)) * 40.0 - uTime * 1.2 + drift * 5.0 + depth * 10.0);
    float ring = clamp(ripple, 0.0, 1.0);
    float deep = smoothstep(0.0, 0.2, depth);
    float shallow = exp(-reach / (uCell.y * 6.0));
    float body = 0.05 + 0.26 * swell * swell * swell * uWaves + 0.08 * shallow;
    body = max(body * (1.0 - uDepthFade * deep * 0.5), 0.62 * ring);
    light = max(max(body, clamp(foam, 0.0, 1.0) * 0.72), trail);
    heat = clamp(max(max(foam * 1.15, ring * 0.75), trailHeat * 0.95), 0.0, 1.0);
  } else {
    float wetBack = phase - uWet * 1.2;
    float peak = 1.5707963 + ceil((wetBack - 1.5707963) / 6.2831853) * 6.2831853;
    float high = peak <= phase ? uLevel + swing : max(level, uLevel + swing * sin(wetBack));
    high += lapAmount;
    float wet = clamp((high - h) / max(high - surface, 1e-4), 0.0, 1.0);
    float sheen = wet * wet * step(0.001, uWet);
    float contourH = abs(fract(h * 6.0 + 0.5) - 0.5) / 6.0;
    float line = (1.0 - smoothstep(uCell.y * 0.3, uCell.y * 0.55, contourH / slope)) * uContours;
    float grain = step(0.975, hash(cell + uSeed * 3.1));
    float tremor = clamp(ripple, 0.0, 1.0);
    light = max(max(0.075 * line, 0.05 * grain), 0.1 * sheen * step(hash(cell * 1.93 + 2.0), 0.55));
    light = max(max(light, 0.2 * tremor), trail);
    heat = trailHeat * 0.95;
    neutral = (1.0 - sheen * 0.5) * (1.0 - smoothstep(0.04, 0.3, trail));
  }

  float ramp = pow(clamp(light, 0.0, 1.0), 0.8);
  float index = light > 0.025 ? max(floor(ramp * (uCount - 1.0) + 0.5), 1.0) : 0.0;
  if (trail > 0.025 && trail >= light - 1e-4) index = min(index, floor((uCount - 1.0) * 0.625 + 0.5));
  index = clamp(index, 0.0, uCount - 1.0);
  gl_FragColor = vec4(index / 255.0, light, heat, neutral);
}
`,S=`
precision highp float;

uniform sampler2D uField;
uniform sampler2D uAtlas;
uniform vec2 uCellPx;
uniform vec2 uGrid;
uniform vec2 uResolution;
uniform float uBrightness;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uBackground;
uniform float uInk;
uniform float uTransparent;

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec2 frag = floor(gl_FragCoord.xy);
  float fromTop = uResolution.y - 1.0 - frag.y;
  vec2 cell = vec2(floor(frag.x / uCellPx.x), floor(fromTop / uCellPx.y));
  vec2 inside = vec2(frag.x - cell.x * uCellPx.x, fromTop - cell.y * uCellPx.y);
  vec4 field = texelFetch(uField, ivec2(cell.x, uGrid.y - 1.0 - cell.y), 0);
  float index = floor(field.r * 255.0 + 0.5);
  float mask = index > 0.5 ? texelFetch(uAtlas, ivec2(index * uCellPx.x + inside.x, inside.y), 0).r : 0.0;
  float light = field.g * uBrightness;

  vec3 neutral = mix(vec3(0.72, 0.72, 0.78), uColorA, 0.22);
  vec3 tone = mix(uColorA, uColorB, smoothstep(0.1, 0.8, field.b));
  tone = mix(tone, vec3(1.0), smoothstep(0.75, 1.0, field.b) * 0.35);
  tone = mix(tone, neutral, field.a);

  if (uInk > 0.5) {
    vec3 ink = mix(uColorA, uColorB, smoothstep(0.1, 0.8, field.b));
    ink = mix(ink, vec3(0.12, 0.12, 0.14), field.a * 0.7);
    vec3 color = mix(uBackground, ink, clamp(mask * light * 2.6, 0.0, 1.0));
    gl_FragColor = vec4(toSrgb(color), 1.0);
    return;
  }

  vec3 emission = tone * mask * light * 1.7;
  if (uTransparent > 0.5) {
    vec3 glow = 1.0 - exp(-emission * 1.1);
    float alpha = clamp(max(max(glow.r, glow.g), glow.b), 0.0, 1.0);
    gl_FragColor = vec4(toSrgb(glow), alpha);
    return;
  }
  vec3 color = 1.0 - exp(-(uBackground + emission) * 1.1);
  gl_FragColor = vec4(toSrgb(color), 1.0);
}
`,k=(e,t,a)=>Math.min(a,Math.max(t,e)),F=e=>{let t=e.trim().toLowerCase();return"transparent"===t||(/^#[0-9a-f]{8}$/.test(t)?t.endsWith("00"):/^#[0-9a-f]{4}$/.test(t)?t.endsWith("0"):null!==t.match(/^(?:rgba?|hsla?)\(.*[,/]\s*(0|0?\.0+|0%)\s*\)$/))},D=(e,t,a)=>{let l=t.trim();try{e.set(/^#[0-9a-f]{8}$/i.test(l)?l.slice(0,7):l)}catch{e.set(a)}return e},R=e=>{let t=window.matchMedia("(min-resolution: 2dppx)");return t.addEventListener("change",e),window.addEventListener("resize",e),()=>{t.removeEventListener("change",e),window.removeEventListener("resize",e)}},V=()=>window.devicePixelRatio||1,M=e=>{let t=window.matchMedia("(prefers-reduced-motion: reduce)");return t.addEventListener("change",e),()=>t.removeEventListener("change",e)},P=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches,j=(e,t)=>new c.nWS(e,t,{type:c.ix0,format:c.GWd,minFilter:c.k6q,magFilter:c.k6q,depthBuffer:!1,stencilBuffer:!1}),T=(e,t)=>new c.BKk({vertexShader:f,fragmentShader:e,uniforms:t,depthTest:!1,depthWrite:!1}),B=(e,t,a,l,r,u)=>{e.width=Math.max(1,t.length*a),e.height=Math.max(1,l);let o=e.getContext("2d");o&&(o.fillStyle="#000",o.fillRect(0,0,e.width,e.height),o.fillStyle="#fff",o.textAlign="center",o.textBaseline="middle",o.font=`${r}px ${u}`,t.forEach((e,t)=>{""!==e.trim()&&o.fillText(e,t*a+a/2,l/2+.04*r)}))},E=({settings:e,pointerRef:t,wakeRef:a})=>{let{gl:u,size:o,viewport:i,invalidate:s}=(0,n.C)(),d=(0,r.useRef)(null),m=(0,r.useRef)(null),R=(0,r.useRef)(null),V=(0,r.useRef)(null),M=(0,r.useMemo)(()=>({uField:{value:null},uAtlas:{value:null},uCellPx:{value:new c.I9Y(8,16)},uGrid:{value:new c.I9Y(1,1)},uResolution:{value:new c.I9Y(1,1)},uBrightness:{value:1},uColorA:{value:new c.Q1f},uColorB:{value:new c.Q1f},uBackground:{value:new c.Q1f},uInk:{value:0},uTransparent:{value:0}}),[]),P=e.colors.join("|"),{backgroundColor:E,characters:z,fontFamily:Y}=e,W=i.dpr,I=k(e.fontSize,6,48),L=Math.max(3,Math.round(.6*I*W)),A=Math.max(5,Math.round(1.15*I*W)),X=Math.max(1,Math.ceil(o.width*W/L)),q=Math.max(1,Math.ceil(o.height*W/A)),_=Math.max(8,Math.ceil(X*L/W/6)),G=Math.max(8,Math.ceil(q*A/W/6));return(0,r.useEffect)(()=>{let e,t,a,l,r,u,o,i,n,d=(e=new c.nWS(X,q,{type:c.ix0,format:c.GWd,minFilter:c.hxR,magFilter:c.hxR,depthBuffer:!1,stencilBuffer:!1}),t=()=>({uSize:{value:new c.I9Y(_,G)},uView:{value:new c.I9Y(1,1)}}),l={velocity:T(x,{...(a=()=>({...t(),uDt:{value:0},uFrom:{value:new c.I9Y},uTo:{value:new c.I9Y},uRadius:{value:12}}))(),uVelocity:{value:null},uDecay:{value:1},uBrushVelocity:{value:new c.I9Y},uBlend:{value:0}}),divergence:T(g,{...t(),uVelocity:{value:null}}),pressure:T(y,{...t(),uPressure:{value:null},uDivergence:{value:null}}),project:T(w,{...t(),uPressure:{value:null},uVelocity:{value:null}}),dye:T(b,{...a(),uDye:{value:null},uVelocity:{value:null},uDecay:{value:new c.I9Y(1,1)},uOffsetDecay:{value:1},uMaxOffset:{value:30},uPush:{value:1},uSplash:{value:new c.IUQ(0,0,0,1)},uSpread:{value:0},uStrength:{value:0}})},r=new c.BKk({vertexShader:f,fragmentShader:C,uniforms:{uGrid:{value:new c.I9Y(X,q)},uCell:{value:new c.I9Y(8,16)},uView:{value:new c.I9Y(1,1)},uTime:{value:0},uClock:{value:0},uScale:{value:1},uSeed:{value:new c.I9Y},uLevel:{value:.5},uRange:{value:1},uPeriod:{value:36},uWaves:{value:1},uFoam:{value:1},uContours:{value:1},uWet:{value:1},uDepthFade:{value:.6},uCount:{value:p.length},uRipples:{value:Array.from({length:24},()=>new c.IUQ(0,0,-99,0))},uRippleSize:{value:1},uDye:{value:null},uWakeGain:{value:.95}},depthTest:!1,depthWrite:!1}),u=new c.Z58,o=new c.qUd(-1,1,1,-1,0,1),(i=new c.eaF(new c.bdM(2,2),r)).frustumCulled=!1,u.add(i),{target:e,velocity:(n=()=>[j(_,G),j(_,G)])(),pressure:n(),divergence:j(_,G),dye:n(),flip:0,scene:u,camera:o,material:r,passes:l,quad:i,columns:X,rows:q,fluidWidth:_,fluidHeight:G});return m.current=d,s(),()=>{m.current=null,d.target.dispose(),[...d.velocity,...d.pressure,d.divergence,...d.dye].forEach(e=>e.dispose()),d.material.dispose(),Object.values(d.passes).forEach(e=>e.dispose()),d.quad.geometry.dispose()}},[X,q,_,G,s]),(0,r.useEffect)(()=>{let e=Array.from(z.length>1?z:p),t=document.createElement("canvas"),a=Math.round(I*W),l=Y.trim()||h;B(t,e,L,A,a,l);let r=new c.GOR(t);r.flipY=!1,r.minFilter=c.hxR,r.magFilter=c.hxR,r.generateMipmaps=!1,r.needsUpdate=!0;let u={texture:r,count:e.length};R.current=u,s();let o=!0;return"undefined"!=typeof document&&document.fonts&&document.fonts.load(`${a}px ${l}`).then(()=>{o&&(B(t,e,L,A,a,l),r.needsUpdate=!0,s())}).catch(()=>void 0),()=>{o=!1,R.current===u&&(R.current=null),r.dispose()}},[z,Y,I,W,L,A,s]),(0,r.useEffect)(()=>(a.current=s,()=>{a.current=null}),[s,a]),(0,r.useEffect)(()=>{let e=d.current;if(!e)return;let t=e.uniforms,a=P?P.split("|"):v;D(t.uColorA.value,a[0]??v[0],v[0]),D(t.uColorB.value,a[1]??a[0]??v[1],v[1]);let l=F(E);D(t.uBackground.value,l?"#000000":E,"#000000");let r=t.uBackground.value,u=.2126*r.r+.7152*r.g+.0722*r.b;t.uInk.value=+(!l&&u>.2),t.uTransparent.value=+!!l,s()},[P,E,s]),(0,r.useEffect)(()=>{s()},[e,o,s]),(0,n.D)((a,l)=>{let r=d.current,i=m.current,n=R.current;if(!r||!i||!n)return;let v=r.uniforms,p=t.current,h=Math.min(Math.max(l,0),.1),f=!e.paused&&!e.reduced,x=k(e.tidePeriod,4,240);V.current||(V.current={time:.38*x,clock:0,tracking:!1,brushX:0,brushY:0,brushVX:0,brushVY:0,energy:0,lastPaint:-99,splashX:0,splashY:0,splashTime:-99,presses:p.presses,next:0,ripples:Array.from({length:24},()=>new c.IUQ(0,0,-99,0))});let g=V.current;f&&(g.time+=h*k(e.speed,0,4)),e.reduced||(g.clock+=h);let y=L/W,w=A/W,b=i.columns*y,C=i.rows*w,S=e.interactive&&!e.reduced&&p.inside,F=p.x-b/2,D=C/2-p.y;S&&!g.tracking&&(g.brushX=F,g.brushY=D,g.brushVX=0,g.brushVY=0),g.tracking=S;let M=g.brushX,P=g.brushY;if(S&&h>0){let e=Math.max(2,Math.ceil(h/.008)),t=h/e;for(let a=0;a<e;a++)g.brushVX+=((F-g.brushX)*256-2*g.brushVX*16)*t,g.brushVY+=((D-g.brushY)*256-2*g.brushVY*16)*t,g.brushX+=g.brushVX*t,g.brushY+=g.brushVY*t}else g.brushVX=0,g.brushVY=0;let j=Math.hypot(g.brushVX,g.brushVY),T=S?1-Math.exp(-j/260):0,B=T>g.energy?.05:.18;if(g.energy+=(T-g.energy)*(1-Math.exp(-h/B)),g.energy>.01&&(g.lastPaint=g.clock),p.presses!==g.presses&&(g.presses=p.presses,e.clickRipples&&e.interactive&&!e.reduced)){var E,z;let e;E=p.pressX,z=p.pressY,e=g.next,g.next=(e+1)%24,g.ripples[e].set(E-b/2,C/2-z,g.clock,1.7),g.splashX=p.pressX-b/2,g.splashY=C/2-p.pressY,g.splashTime=g.clock}let Y=i.material.uniforms;Y.uGrid.value.set(i.columns,i.rows),Y.uCell.value.set(y,w),Y.uView.value.set(b,C),Y.uTime.value=g.time,Y.uClock.value=g.clock,Y.uScale.value=k(e.scale,.2,5),Y.uSeed.value.set(17.13*e.seed,-9.71*e.seed),Y.uLevel.value=k(e.level,0,1),Y.uRange.value=k(e.tideRange,0,3),Y.uPeriod.value=x,Y.uWaves.value=k(e.waves,0,3),Y.uFoam.value=k(e.foam,0,3),Y.uContours.value=k(e.contours,0,3),Y.uWet.value=k(e.wetSand,0,4),Y.uDepthFade.value=k(e.depthFade,0,1),Y.uCount.value=n.count,Y.uRippleSize.value=k(e.rippleSize,.3,3);let I=!1,X=Y.uRipples.value;for(let e=0;e<24;e++)X[e].copy(g.ripples[e]),g.ripples[e].w>0&&g.clock-g.ripples[e].z<5&&(I=!0);let q=k(e.wake,0,3),_=k(e.wakeLength,.2,10),G=k(e.cursorRadius,8,600),H=k(e.cursorStrength,0,3),N=1-Math.exp(-j/900),O=k(.1*G,4,40)*(.9+.3*N),U=g.clock-g.splashTime,$=g.clock-g.lastPaint<Math.max(5*_,8)||U<8,Q=i.passes,K=i.quad,Z=(e,t)=>{K.material=e,u.setRenderTarget(t),u.render(i.scene,i.camera)},J=(e,t)=>{let a=e.uniforms;return a.uSize.value.set(i.fluidWidth,i.fluidHeight),a.uView.value.set(b,C),t&&(a.uFrom.value.set(M,P),a.uTo.value.set(g.brushX,g.brushY),a.uDt.value=h,a.uRadius.value=O),a},ee=u.getRenderTarget();if($&&h>0){let e=i.flip,t=1-e,a=J(Q.velocity,!0);a.uVelocity.value=i.velocity[0].texture,a.uDecay.value=Math.exp(-h/(.22*_)),a.uRadius.value=.5*G,a.uBrushVelocity.value.set(.55*g.brushVX,.55*g.brushVY),a.uBlend.value=(1-Math.exp(-h/.05))*g.energy*Math.min(q,1),Z(Q.velocity,i.velocity[1]),J(Q.divergence,!1).uVelocity.value=i.velocity[1].texture,Z(Q.divergence,i.divergence);let l=J(Q.pressure,!1);l.uDivergence.value=i.divergence.texture,u.setRenderTarget(i.pressure[0]),u.clearColor();for(let e=0;e<10;e++)l.uPressure.value=i.pressure[e%2].texture,Z(Q.pressure,i.pressure[1-e%2]);let r=J(Q.project,!1);r.uPressure.value=i.pressure[0].texture,r.uVelocity.value=i.velocity[1].texture,Z(Q.project,i.velocity[0]);let o=J(Q.dye,!0);o.uDye.value=i.dye[e].texture,o.uVelocity.value=i.velocity[0].texture,o.uDecay.value.set(Math.exp(-h/(.42*_)),Math.exp(-h/(.45*_))),o.uOffsetDecay.value=Math.exp(-h/(.5*_)),o.uMaxOffset.value=.75*G*H,o.uPush.value=1.8*H,o.uSplash.value.set(g.splashX,g.splashY,U<.2?2.2*G*H:0,1.1*G),o.uSpread.value=1-Math.exp(-h/.35),o.uStrength.value=g.energy*Math.min(q,1),Z(Q.dye,i.dye[t]),i.flip=t}Y.uDye.value=i.dye[i.flip].texture,Y.uWakeGain.value=.95*Math.sqrt(Math.max(q,1)),K.material=i.material,u.setRenderTarget(i.target),u.render(i.scene,i.camera),u.setRenderTarget(ee),v.uField.value=i.target.texture,v.uAtlas.value=n.texture,v.uCellPx.value.set(L,A),v.uGrid.value.set(i.columns,i.rows),v.uResolution.value.set(o.width*W,o.height*W),v.uBrightness.value=k(e.brightness,0,3),!f&&!e.reduced&&(I||S||$)&&s()}),(0,l.jsxs)("mesh",{frustumCulled:!1,children:[(0,l.jsx)("planeGeometry",{args:[2,2]}),(0,l.jsx)("shaderMaterial",{ref:d,vertexShader:f,fragmentShader:S,uniforms:M,depthTest:!1,depthWrite:!1})]})},z=({colors:e=v,backgroundColor:t="#0a0a0a",characters:a=p,fontSize:u=11,fontFamily:o=h,scale:i=1,level:n=.5,tideRange:c=1,tidePeriod:f=36,waves:m=1,foam:x=1,contours:g=1,wetSand:y=.6,depthFade:w=.6,brightness:b=1,speed:C=1,interactive:S=!0,cursorRadius:k=80,cursorStrength:D=1,wake:j=1,wakeLength:T=2,rippleSize:B=1,clickRipples:z=!0,seed:Y=0,paused:W=!1,dpr:I=2,className:L,style:A,children:X})=>{let q=(0,r.useRef)(null),_=(0,r.useRef)({x:0,y:0,inside:!1,presses:0,pressX:0,pressY:0}),G=(0,r.useRef)(null),[H,N]=(0,r.useState)(!0),O=(0,r.useSyncExternalStore)(M,P,()=>!1),U=Math.min((0,r.useSyncExternalStore)(R,V,()=>1),Math.max(I,.5)),$=!W&&!O,Q=F(t);return(0,r.useEffect)(()=>{let e=q.current;if(!e||"undefined"==typeof IntersectionObserver)return;let t=new IntersectionObserver(([e])=>N(e.isIntersecting),{rootMargin:"80px"});return t.observe(e),()=>t.disconnect()},[]),(0,r.useEffect)(()=>{let e=q.current;if(!e)return;let t=t=>{let a=e.getBoundingClientRect(),l=_.current;l.x=t.clientX-a.left,l.y=t.clientY-a.top,l.inside=!0},a=e=>{t(e),G.current?.()},l=e=>{t(e);let a=_.current;a.pressX=a.x,a.pressY=a.y,a.presses+=1,G.current?.()},r=()=>{_.current.inside=!1,G.current?.()};return e.addEventListener("pointermove",a,{passive:!0}),e.addEventListener("pointerdown",l,{passive:!0}),e.addEventListener("pointerleave",r,{passive:!0}),e.addEventListener("pointercancel",r,{passive:!0}),()=>{e.removeEventListener("pointermove",a),e.removeEventListener("pointerdown",l),e.removeEventListener("pointerleave",r),e.removeEventListener("pointercancel",r)}},[]),(0,l.jsxs)("div",{ref:q,className:(0,d.cn)("relative isolate overflow-hidden",L),style:{backgroundColor:Q?void 0:t,...A},children:[(0,l.jsx)("div",{className:"absolute inset-0","aria-hidden":"true",children:(0,l.jsx)(s.Hl,{dpr:U,frameloop:H&&$?"always":"demand",gl:{antialias:!1,alpha:!0,premultipliedAlpha:!0,powerPreference:"high-performance"},style:{pointerEvents:"none"},children:(0,l.jsx)(E,{settings:{colors:e,backgroundColor:t,characters:a,fontSize:u,fontFamily:o,scale:i,level:n,tideRange:c,tidePeriod:f,waves:m,foam:x,contours:g,wetSand:y,depthFade:w,brightness:b,speed:C,interactive:S,cursorRadius:k,cursorStrength:D,wake:j,wakeLength:T,rippleSize:B,clickRipples:z,seed:Y,paused:W,reduced:O},pointerRef:_,wakeRef:G})})}),X?(0,l.jsx)("div",{className:"relative z-10 h-full w-full",children:X}):null]})},Y={violet:{colors:["#5227FF","#FF9FFC"],background:"#0a0a0a"},lagoon:{colors:["#0E9FB5","#C8FFF6"],background:"#0a0a0a"},moonlit:{colors:["#5B6B9A","#FFFFFF"],background:"#0a0a0a"},ember:{colors:["#E2531B","#FFD9A8"],background:"#0a0a0a"},ink:{colors:["#5227FF","#C026D3"],background:"#FAFAFA"},paper:{colors:["#52525B","#18181B"],background:"#F4F4F5"}},W=[{label:"Violet",value:"violet"},{label:"Lagoon",value:"lagoon"},{label:"Moonlit",value:"moonlit"},{label:"Ember",value:"ember"},{label:"Ink",value:"ink"},{label:"Paper",value:"paper"}],I=[{name:"colors",type:"string[]",default:'["#5227FF", "#FF9FFC"]',description:"Two colours: the water, then the foam along the waterline and the ripples. The bare flats use a neutral tint of the first."},{name:"backgroundColor",type:"string",default:'"#0a0a0a"',description:'Colour behind the glyphs. Light backgrounds switch to ink glyphs. Pass "transparent" to show the page.'},{name:"characters",type:"string",default:'" .:~+*#%@"',description:"Glyph ramp from lightest to heaviest. The first character is used for empty cells, so it is usually a space."},{name:"fontSize",type:"number",default:"11",description:"Glyph size in pixels. Smaller values make a finer, denser map."},{name:"fontFamily",type:"string",default:'"ui-monospace, …"',description:"Monospace font stack used to draw the glyphs."},{name:"scale",type:"number",default:"1",description:"Size of the landscape. Larger values give broader flats and bigger pools."},{name:"level",type:"number",default:"0.5",description:"Average water level, from 0 (dry flats) to 1 (almost fully flooded)."},{name:"tideRange",type:"number",default:"1",description:"How far the tide rises and falls around the average level. 0 holds the water still."},{name:"tidePeriod",type:"number",default:"36",description:"Seconds for one full rise and fall of the tide."},{name:"waves",type:"number",default:"1",description:"Strength of the swell rolling across the water and lapping at the shore."},{name:"foam",type:"number",default:"1",description:"Brightness and width of the foam line along the water's edge."},{name:"contours",type:"number",default:"1",description:"Visibility of the dotted contour lines on the exposed flats. 0 hides them."},{name:"wetSand",type:"number",default:"0.6",description:"How long the sand stays darkened and glistening after the tide pulls back. 0 disables it."},{name:"depthFade",type:"number",default:"0.6",description:"How much deeper water quietens compared with the shallows, from 0 to 1."},{name:"brightness",type:"number",default:"1",description:"Overall brightness of the glyphs."},{name:"speed",type:"number",default:"1",description:"Pace of the tide and the swell. 0 holds them still."},{name:"interactive",type:"boolean",default:"true",description:"The pointer moves through the map like a hand through water: it drags the tide and its shorelines along, leaves a glowing liquid trail, and everything flows back behind it."},{name:"cursorRadius",type:"number",default:"80",description:"Radius of the pointer's reach in pixels: how wide a band of water it drags and how thick its trail is."},{name:"cursorStrength",type:"number",default:"1",description:"How far the pointer pushes the water and shorelines before they flow back. 0 leaves the map untouched and only draws the trail."},{name:"wake",type:"number",default:"1",description:"Brightness of the liquid trail behind the moving pointer. 0 hides it."},{name:"wakeLength",type:"number",default:"2",description:"How long the trail lingers and the pushed water takes to settle, roughly in seconds."},{name:"rippleSize",type:"number",default:"1",description:"Speed and reach of the ripple each click sends across the map."},{name:"clickRipples",type:"boolean",default:"true",description:"Each click splashes the water outward and sends a ripple across the map. Rapid clicks stack."},{name:"seed",type:"number",default:"0",description:"Changes the shape of the landscape."},{name:"paused",type:"boolean",default:"false",description:"Freezes the tide and the swell. Ripples still work."},{name:"dpr",type:"number",default:"2",description:"Upper bound for the device pixel ratio."},{name:"className",type:"string",default:"—",description:"Classes for the root element. Give it a height."},{name:"style",type:"CSSProperties",default:"—",description:"Inline styles for the root element."},{name:"children",type:"ReactNode",default:"—",description:"Content layered above the map."}],L=()=>{let[e,t]=(0,i.I)(),a=(0,u.Y)(),[n,s]=(0,r.useState)(null),c=n??("dark"===a?"violet":"ink"),[d,v]=(0,r.useState)({}),p={...Y[c]??Y.violet,...d},[h,f]=(0,r.useState)(" .:~+*#%@"),[m,x]=(0,r.useState)(11),[g,y]=(0,r.useState)(1),[w,b]=(0,r.useState)(.5),[C,S]=(0,r.useState)(1),[k,F]=(0,r.useState)(36),[D,R]=(0,r.useState)(1),[V,M]=(0,r.useState)(1),[P,j]=(0,r.useState)(1),[T,B]=(0,r.useState)(.6),[E,L]=(0,r.useState)(.6),[A,X]=(0,r.useState)(1),[q,_]=(0,r.useState)(1),[G,H]=(0,r.useState)(80),[N,O]=(0,r.useState)(1),[U,$]=(0,r.useState)(1),[Q,K]=(0,r.useState)(2),[Z,J]=(0,r.useState)(1),[ee,et]=(0,r.useState)(0),[ea,el]=(0,r.useState)(!0),[er,eu]=(0,r.useState)(!0),[eo,ei]=(0,r.useState)(!1),en=e=>t=>v(a=>{let l=[...a.colors??p.colors];return l[e]=t,{...a,colors:l}});return(0,l.jsxs)("div",{children:[(0,l.jsx)(o.Bg,{}),(0,l.jsxs)(o.VX,{children:[(0,l.jsxs)(o.Ec,{children:[(0,l.jsx)(o.Ch,{onRefresh:t,minHeight:600,children:(0,l.jsx)("div",{className:"relative h-full w-full",children:(0,l.jsx)(z,{className:"h-full w-full",colors:p.colors,backgroundColor:p.background,characters:h,fontSize:m,scale:g,level:w,tideRange:C,tidePeriod:k,waves:D,foam:V,contours:P,wetSand:T,depthFade:E,brightness:A,speed:q,interactive:ea,cursorRadius:G,cursorStrength:N,wake:U,wakeLength:Q,rippleSize:Z,clickRipples:er,seed:ee,paused:eo},e)})}),(0,l.jsxs)(o.IH,{children:[(0,l.jsx)(o.bg,{title:"Preset",value:c,options:W,onChange:e=>{s(e),v({})}}),(0,l.jsx)(o.W7,{title:"Background",value:p.background,onChange:e=>v(t=>({...t,background:e}))}),(0,l.jsx)(o.W7,{title:"Water",value:p.colors[0],onChange:en(0)}),(0,l.jsx)(o.W7,{title:"Foam",value:p.colors[1],onChange:en(1)}),(0,l.jsx)(o.UD,{title:"Characters",value:h,onChange:f}),(0,l.jsx)(o.yt,{title:"Font Size",min:7,max:24,step:1,value:m,valueUnit:"px",onChange:x}),(0,l.jsx)(o.yt,{title:"Scale",min:.3,max:3,step:.05,value:g,onChange:y}),(0,l.jsx)(o.yt,{title:"Level",min:0,max:1,step:.01,value:w,onChange:b}),(0,l.jsx)(o.yt,{title:"Tide Range",min:0,max:3,step:.05,value:C,onChange:S}),(0,l.jsx)(o.yt,{title:"Tide Period",min:6,max:120,step:1,value:k,valueUnit:"s",onChange:F}),(0,l.jsx)(o.yt,{title:"Waves",min:0,max:2,step:.05,value:D,onChange:R}),(0,l.jsx)(o.yt,{title:"Foam",min:0,max:2,step:.05,value:V,onChange:M}),(0,l.jsx)(o.yt,{title:"Contours",min:0,max:2,step:.05,value:P,onChange:j}),(0,l.jsx)(o.yt,{title:"Wet Sand",min:0,max:2,step:.05,value:T,onChange:B}),(0,l.jsx)(o.yt,{title:"Depth Fade",min:0,max:1,step:.01,value:E,onChange:L}),(0,l.jsx)(o.yt,{title:"Brightness",min:.2,max:2.5,step:.05,value:A,onChange:X}),(0,l.jsx)(o.yt,{title:"Speed",min:0,max:4,step:.05,value:q,onChange:_}),(0,l.jsx)(o.yt,{title:"Cursor Radius",min:20,max:240,step:2,value:G,valueUnit:"px",onChange:H}),(0,l.jsx)(o.yt,{title:"Cursor Strength",min:0,max:2.5,step:.05,value:N,onChange:O}),(0,l.jsx)(o.yt,{title:"Wake",min:0,max:2,step:.05,value:U,onChange:$}),(0,l.jsx)(o.yt,{title:"Wake Length",min:.5,max:6,step:.1,value:Q,valueUnit:"s",onChange:K}),(0,l.jsx)(o.yt,{title:"Ripple Size",min:.4,max:2.5,step:.05,value:Z,onChange:J}),(0,l.jsx)(o.yt,{title:"Seed",min:0,max:20,step:1,value:ee,onChange:et}),(0,l.jsx)(o.tl,{title:"Interactive",checked:ea,onChange:el}),(0,l.jsx)(o.tl,{title:"Click Ripples",checked:er,onChange:eu}),(0,l.jsx)(o.tl,{title:"Paused",checked:eo,onChange:ei})]}),(0,l.jsx)(o.Ub,{data:I})]}),(0,l.jsx)(o.lT,{children:(0,l.jsx)(o.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>n.CodeExample,lT:()=>l.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>d.CopyButton,IH:()=>u.Customize,gI:()=>h,Dn:()=>m,pi:()=>f,W7:()=>o.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>o.PreviewInput,bg:()=>o.PreviewSelect,yt:()=>o.PreviewSlider,tl:()=>o.PreviewSwitch,Ec:()=>l.PreviewTab,Ub:()=>i.PropTable,VX:()=>l.TabsLayout,bs:()=>p});var l=a(55019);a(27382);var r=a(10236),u=a(69485),o=a(48543),i=a(87552);a(39260);var n=a(52407),s=a(79901);a(24496);var c=a(95155);a(66729);var d=a(28592),v=a(90650);let p="rounded-lg border bg-background";function h({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,v.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function f({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,v.cn)(p,e),...a,children:t})}function m({title:e,description:t,className:a,children:l}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:l})]})}},86049:(e,t,a)=>{a.d(t,{Y:()=>i});var l=a(12115),r=a(30701);let u=()=>()=>{},o=()=>"light";function i(){let{resolvedTheme:e}=(0,r.D)();return(0,l.useSyncExternalStore)(u,()=>"dark"===e?"dark":"light",o)}},90761:(e,t,a)=>{a.d(t,{I:()=>r});var l=a(12115);function r(){let[e,t]=(0,l.useState)(0),a=(0,l.useCallback)(()=>{t(e=>e+1)},[]);return(0,l.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);