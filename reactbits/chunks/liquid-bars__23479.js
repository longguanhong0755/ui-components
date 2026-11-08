"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[23479],{23479:(e,t,a)=>{a.r(t),a.d(t,{default:()=>h});var i=a(95155),r=a(12115),n=a(56388),o=a(48543),l=a(90761),s=a(81712),u=a(3907),c=a(2253),v=a(90650);let f=`
  precision highp float;

  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uBarCount;
  uniform float uScale;

  uniform float uWaveComplexity;
  uniform float uWaveAmplitude;
  uniform float uReflectionFrequency;
  uniform float uStreakIntensity;
  uniform float uMetallicContrast;
  uniform float uHighlightWarmth;

  uniform float uRefractionStrength;
  uniform float uEdgeWidth;
  uniform float uEdgeSoftness;
  uniform float uFresnelIntensity;
  uniform float uEdgeHighlight;
  uniform float uGapDarkness;
  uniform float uRefractionWaveSpeed;
  uniform float uRefractionWaveFrequency;

  varying vec2 vUv;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  vec3 getMetallicColor(vec2 uv, vec2 resolution, vec3 color, float time) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= resolution.x / resolution.y;

    p *= uScale;

    float t = time * 0.3;

    float waves = snoise(vec3(p * 1.5, t * 0.5)) * 0.5 * uWaveAmplitude;

    if (uWaveComplexity >= 2.0) {
      waves += snoise(vec3(p * 2.0 + 10.0, t * 0.7)) * 0.35 * uWaveAmplitude;
    }
    if (uWaveComplexity >= 3.0) {
      waves += snoise(vec3(p * 4.0 + 20.0, t * 0.9)) * 0.15 * uWaveAmplitude;
    }
    if (uWaveComplexity >= 4.0) {
      waves += snoise(vec3(p * 6.0 + 30.0, t * 1.1)) * 0.1 * uWaveAmplitude;
    }
    if (uWaveComplexity >= 5.0) {
      waves += snoise(vec3(p * 8.0 + 40.0, t * 1.3)) * 0.05 * uWaveAmplitude;
    }

    float reflection = sin(waves * uReflectionFrequency + p.y * 3.0) * 0.5 + 0.5;
    reflection = pow(reflection, 1.5);

    float streak1 = smoothstep(0.4, 0.5, sin(waves * 12.0 + t)) * uStreakIntensity;
    float streak2 = smoothstep(0.6, 0.7, sin(waves * 8.0 - p.x * 2.0 + t * 1.5)) * uStreakIntensity;

    float darkMult = 0.08 / uMetallicContrast;
    float midMult = 0.5;
    float brightMult = 0.5 + 0.7 * uMetallicContrast;

    vec3 darkColor = color * darkMult;
    vec3 midColor = color * midMult;
    vec3 brightColor = color * brightMult;
    vec3 highlightColor = mix(color, vec3(1.0), 0.7);

    vec3 finalColor = mix(darkColor, midColor, reflection);
    finalColor = mix(finalColor, brightColor, pow(reflection, 2.0));
    finalColor = mix(finalColor, highlightColor, streak1 * 0.6);
    finalColor += highlightColor * streak2 * 0.3;

    finalColor += vec3(0.08, 0.06, 0.03) * pow(reflection, 3.0) * uHighlightWarmth;

    return finalColor;
  }

  void main() {
    vec2 uv = vUv;

    float barWidth = 1.0 / uBarCount;
    float barIndex = floor(uv.x / barWidth);
    float barLocal = mod(uv.x, barWidth) / barWidth;

    float edgeWidth = uEdgeWidth;

    float leftDist = barLocal / edgeWidth;
    float rightDist = (1.0 - barLocal) / edgeWidth;
    float edgeDist = min(leftDist, rightDist);
    float inEdgeZone = 1.0 - clamp(edgeDist, 0.0, 1.0);

    vec2 refractionOffset = vec2(0.0);

    if (barLocal < edgeWidth) {
      float t = 1.0 - barLocal / edgeWidth;
      float curve = t * t * t;
      refractionOffset.x = curve * uRefractionStrength * 0.08;
      refractionOffset.y = sin(uv.y * uRefractionWaveFrequency + uTime * uRefractionWaveSpeed) * curve * uRefractionStrength * 0.015;
    }
    else if (barLocal > 1.0 - edgeWidth) {
      float t = (barLocal - (1.0 - edgeWidth)) / edgeWidth;
      float curve = t * t * t;
      refractionOffset.x = -curve * uRefractionStrength * 0.08;
      refractionOffset.y = sin(uv.y * uRefractionWaveFrequency + uTime * uRefractionWaveSpeed + 3.14159) * curve * uRefractionStrength * 0.015;
    }

    vec2 refractedUV = clamp(uv + refractionOffset, 0.0, 1.0);
    vec3 metallic = getMetallicColor(refractedUV, uResolution, uColor, uTime);

    float barMask = smoothstep(0.0, uEdgeSoftness, barLocal) * smoothstep(1.0, 1.0 - uEdgeSoftness, barLocal);

    float gapDarken = mix(1.0 - uGapDarkness, 1.0, barMask);

    float edgeHighlightVal = inEdgeZone * uEdgeHighlight * barMask;

    float fresnel = pow(inEdgeZone, 2.0) * uFresnelIntensity;

    vec3 finalColor = metallic * gapDarken;
    finalColor += vec3(1.0) * edgeHighlightVal;
    finalColor += uColor * fresnel * 0.3;

    gl_FragColor = vec4(finalColor, uOpacity * barMask);
  }
`,d=`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;function m({color:e,opacity:t,speed:a,barCount:n,scale:o,waveComplexity:l,waveAmplitude:u,reflectionFrequency:v,streakIntensity:m,metallicContrast:p,highlightWarmth:h,refractionStrength:g,edgeWidth:x,edgeSoftness:y,fresnelIntensity:C,edgeHighlight:S,gapDarkness:b,refractionWaveSpeed:w,refractionWaveFrequency:W}){let j=(0,r.useRef)(null),{size:k}=(0,s.C)(),R=(0,r.useMemo)(()=>({uTime:{value:0},uResolution:{value:new c.I9Y(100,100)},uColor:{value:new c.Q1f},uOpacity:{value:1},uBarCount:{value:12},uScale:{value:1},uWaveComplexity:{value:3},uWaveAmplitude:{value:1},uReflectionFrequency:{value:8},uStreakIntensity:{value:1},uMetallicContrast:{value:1},uHighlightWarmth:{value:1},uRefractionStrength:{value:1},uEdgeWidth:{value:.12},uEdgeSoftness:{value:.03},uFresnelIntensity:{value:.2},uEdgeHighlight:{value:.12},uGapDarkness:{value:.6},uRefractionWaveSpeed:{value:2},uRefractionWaveFrequency:{value:12.566}}),[]);return(0,s.D)(i=>{if(j.current){let r=j.current.material;r.uniforms.uTime.value=i.clock.elapsedTime*a,r.uniforms.uColor.value=e,r.uniforms.uOpacity.value=t,r.uniforms.uBarCount.value=n,r.uniforms.uScale.value=o,r.uniforms.uWaveComplexity.value=l,r.uniforms.uWaveAmplitude.value=u,r.uniforms.uReflectionFrequency.value=v,r.uniforms.uStreakIntensity.value=m,r.uniforms.uMetallicContrast.value=p,r.uniforms.uHighlightWarmth.value=h,r.uniforms.uRefractionStrength.value=g,r.uniforms.uEdgeWidth.value=x,r.uniforms.uEdgeSoftness.value=y,r.uniforms.uFresnelIntensity.value=C,r.uniforms.uEdgeHighlight.value=S,r.uniforms.uGapDarkness.value=b,r.uniforms.uRefractionWaveSpeed.value=w,r.uniforms.uRefractionWaveFrequency.value=W,r.uniforms.uResolution.value.set(k.width,k.height)}}),(0,i.jsxs)("mesh",{ref:j,children:[(0,i.jsx)("planeGeometry",{args:[2,2]}),(0,i.jsx)("shaderMaterial",{uniforms:R,vertexShader:d,fragmentShader:f,transparent:!0})]})}let p=({width:e="100%",height:t="100%",speed:a=1,color:n="#a855f7",barCount:o=6,scale:l=.4,waveComplexity:s=1,waveAmplitude:f=.6,reflectionFrequency:d=20,streakIntensity:p=.25,metallicContrast:h=2,highlightWarmth:g=.5,refractionStrength:x=5,edgeWidth:y=.3,edgeSoftness:C=.04,fresnelIntensity:S=.2,edgeHighlight:b=.1,gapDarkness:w=.2,refractionWaveSpeed:W=1.4,refractionWaveFrequency:j=20,opacity:k=1,className:R,children:z})=>{let E=(0,r.useMemo)(()=>new c.Q1f(n),[n]),P="number"==typeof e?`${e}px`:e,I="number"==typeof t?`${t}px`:t;return(0,i.jsxs)("div",{className:(0,v.cn)("relative overflow-hidden",R),style:{width:P,height:I},children:[(0,i.jsx)(u.Hl,{className:"absolute inset-0",orthographic:!0,camera:{left:-1,right:1,top:1,bottom:-1,near:0,far:10,position:[0,0,5]},gl:{antialias:!0,alpha:!0},style:{width:"100%",height:"100%"},children:(0,i.jsx)(m,{color:E,opacity:k,speed:a,barCount:o,scale:l,waveComplexity:s,waveAmplitude:f,reflectionFrequency:d,streakIntensity:p,metallicContrast:h,highlightWarmth:g,refractionStrength:x,edgeWidth:y,edgeSoftness:C,fresnelIntensity:S,edgeHighlight:b,gapDarkness:w,refractionWaveSpeed:W,refractionWaveFrequency:j})}),z&&(0,i.jsx)("div",{className:"relative z-10 w-full h-full pointer-events-none",children:z})]})};p.displayName="LiquidBars";let h=()=>{let[e,t]=(0,l.I)(),[a,s]=(0,r.useState)(1),[u,c]=(0,r.useState)("#a855f7"),[v,f]=(0,r.useState)(6),[d,m]=(0,r.useState)(.4),[h,g]=(0,r.useState)(1),[x,y]=(0,r.useState)(1),[C,S]=(0,r.useState)(.6),[b,w]=(0,r.useState)(20),[W,j]=(0,r.useState)(.25),[k,R]=(0,r.useState)(2),[z,E]=(0,r.useState)(.5),[P,I]=(0,r.useState)(5),[M,F]=(0,r.useState)(.3),[q,D]=(0,r.useState)(.04),[H,N]=(0,r.useState)(.2),[A,T]=(0,r.useState)(.1),[_,O]=(0,r.useState)(.2),[L,B]=(0,r.useState)(1.4),[G,U]=(0,r.useState)(20);return(0,i.jsxs)("div",{children:[(0,i.jsx)(n.Bg,{}),(0,i.jsxs)(n.VX,{children:[(0,i.jsxs)(n.Ec,{children:[(0,i.jsx)(n.Ch,{onRefresh:t,minHeight:500,children:(0,i.jsx)(p,{speed:a,color:u,barCount:v,scale:d,opacity:h,waveComplexity:x,waveAmplitude:C,reflectionFrequency:b,streakIntensity:W,metallicContrast:k,highlightWarmth:z,refractionStrength:P,edgeWidth:M,edgeSoftness:q,fresnelIntensity:H,edgeHighlight:A,gapDarkness:_,refractionWaveSpeed:L,refractionWaveFrequency:G},e)}),(0,i.jsxs)(n.IH,{children:[(0,i.jsx)(o.PreviewColor,{title:"Color",value:u,onChange:c}),(0,i.jsx)(o.PreviewSlider,{title:"Bar Count",value:v,onChange:f,min:1,max:20,step:1}),(0,i.jsx)(o.PreviewSlider,{title:"Speed",value:a,onChange:s,min:.1,max:5,step:.1}),(0,i.jsx)(o.PreviewSlider,{title:"Scale",value:d,onChange:m,min:.1,max:10,step:.1}),(0,i.jsx)(o.PreviewSlider,{title:"Opacity",value:h,onChange:g,min:0,max:1,step:.05}),(0,i.jsx)(o.PreviewSlider,{title:"Complexity",value:x,onChange:y,min:1,max:5,step:1}),(0,i.jsx)(o.PreviewSlider,{title:"Amplitude",value:C,onChange:S,min:0,max:2,step:.1}),(0,i.jsx)(o.PreviewSlider,{title:"Reflection Freq",value:b,onChange:w,min:1,max:20,step:1}),(0,i.jsx)(o.PreviewSlider,{title:"Streak Intensity",value:W,onChange:j,min:0,max:1,step:.05}),(0,i.jsx)(o.PreviewSlider,{title:"Metallic Contrast",value:k,onChange:R,min:0,max:2,step:.1}),(0,i.jsx)(o.PreviewSlider,{title:"Highlight Warmth",value:z,onChange:E,min:0,max:1,step:.05}),(0,i.jsx)(o.PreviewSlider,{title:"Strength",value:P,onChange:I,min:0,max:5,step:.1}),(0,i.jsx)(o.PreviewSlider,{title:"Edge Width",value:M,onChange:F,min:.01,max:.5,step:.01}),(0,i.jsx)(o.PreviewSlider,{title:"Edge Softness",value:q,onChange:D,min:.01,max:.2,step:.01}),(0,i.jsx)(o.PreviewSlider,{title:"Fresnel Intensity",value:H,onChange:N,min:0,max:1,step:.05}),(0,i.jsx)(o.PreviewSlider,{title:"Edge Highlight",value:A,onChange:T,min:0,max:1,step:.05}),(0,i.jsx)(o.PreviewSlider,{title:"Gap Darkness",value:_,onChange:O,min:0,max:1,step:.05}),(0,i.jsx)(o.PreviewSlider,{title:"Wave Speed",value:L,onChange:B,min:0,max:5,step:.1}),(0,i.jsx)(o.PreviewSlider,{title:"Wave Frequency",value:G,onChange:U,min:1,max:30,step:1})]}),(0,i.jsx)(n.Ub,{data:[{name:"width",type:"number | string",default:'"100%"',description:"Width of the component in pixels or CSS value"},{name:"height",type:"number | string",default:'"100%"',description:"Height of the component in pixels or CSS value"},{name:"speed",type:"number",default:"1",description:"Animation speed multiplier (0.1-5)"},{name:"color",type:"string",default:'"#a855f7"',description:"Base color in hex format"},{name:"barCount",type:"number",default:"6",description:"Number of vertical bars"},{name:"scale",type:"number",default:"0.4",description:"Scale of the wave pattern (0.1-10) - higher = larger waves"},{name:"waveComplexity",type:"number",default:"1",description:"Wave complexity - number of noise layers (1-5)"},{name:"waveAmplitude",type:"number",default:"0.6",description:"Wave amplitude - intensity of wave displacement (0-2)"},{name:"reflectionFrequency",type:"number",default:"20",description:"Reflection band frequency (1-20)"},{name:"streakIntensity",type:"number",default:"0.25",description:"Streak intensity - brightness of highlight streaks (0-1)"},{name:"metallicContrast",type:"number",default:"2",description:"Metallic contrast - difference between dark and bright areas (0-2)"},{name:"highlightWarmth",type:"number",default:"0.5",description:"Highlight warmth - warm tint on highlights (0-1)"},{name:"refractionStrength",type:"number",default:"5",description:"Refraction strength at bar edges (0-5)"},{name:"edgeWidth",type:"number",default:"0.3",description:"Edge width - width of refraction zone (0.01-0.5)"},{name:"edgeSoftness",type:"number",default:"0.04",description:"Edge softness - blur at bar boundaries (0.01-0.2)"},{name:"fresnelIntensity",type:"number",default:"0.2",description:"Fresnel intensity - edge glow effect (0-1)"},{name:"edgeHighlight",type:"number",default:"0.1",description:"Edge highlight brightness (0-1)"},{name:"gapDarkness",type:"number",default:"0.2",description:"Gap darkness - how dark the gaps between bars are (0-1)"},{name:"refractionWaveSpeed",type:"number",default:"1.4",description:"Refraction wave speed - speed of wavy refraction (0-5)"},{name:"refractionWaveFrequency",type:"number",default:"20",description:"Refraction wave frequency - frequency of edge waves (1-30)"},{name:"opacity",type:"number",default:"1",description:"Master opacity (0-1)"},{name:"className",type:"string",default:'""',description:"Additional CSS classes"},{name:"children",type:"React.ReactNode",default:"undefined",description:"Content to render on top of the effect"}]})]}),(0,i.jsx)(n.lT,{children:(0,i.jsx)(n.Gv,{})})]})]})}},56388:(e,t,a)=>{a.d(t,{Gv:()=>s.CodeExample,lT:()=>i.CodeTab,Bg:()=>u.ComponentHeader,i8:()=>v.CopyButton,IH:()=>n.Customize,gI:()=>m,Dn:()=>h,pi:()=>p,W7:()=>o.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>o.PreviewInput,bg:()=>o.PreviewSelect,yt:()=>o.PreviewSlider,tl:()=>o.PreviewSwitch,Ec:()=>i.PreviewTab,Ub:()=>l.PropTable,VX:()=>i.TabsLayout,bs:()=>d});var i=a(55019);a(27382);var r=a(10236),n=a(69485),o=a(48543),l=a(87552);a(39260);var s=a(52407),u=a(79901);a(24496);var c=a(95155);a(66729);var v=a(28592),f=a(90650);let d="rounded-lg border bg-background";function m({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,f.cn)("rounded-xl border bg-muted/50 p-1",e),...a,children:t})}function p({className:e,children:t,...a}){return(0,c.jsx)("div",{className:(0,f.cn)(d,e),...a,children:t})}function h({title:e,description:t,className:a,children:i}){return(0,c.jsxs)("section",{className:a,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:i})]})}},90761:(e,t,a)=>{a.d(t,{I:()=>r});var i=a(12115);function r(){let[e,t]=(0,i.useState)(0),a=(0,i.useCallback)(()=>{t(e=>e+1)},[]);return(0,i.useEffect)(()=>{let e=new MutationObserver(()=>{a()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[a]),[e,a]}}}]);