"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[33190],{33190:(e,t,i)=>{i.r(t),i.d(t,{default:()=>v});var n=i(95155),a=i(12115),o=i(56388),r=i(48543),l=i(90761),s=i(12246),c=i(2253),u=i(90650);let d=({width:e="100%",height:t="100%",speed:i=.5,color:o="#FFFFFF",backgroundColor:r="#8B5CF6",waveFrequency:l=.2,waveAmplitude:d=.3,distortion:v=1.5,chromaShift:m=.25,noiseLevel:f=.1,flatness:g=1,opacity:x=1,quality:y="high",className:p,children:h})=>{let z=(0,a.useRef)(null),P=(0,a.useRef)(0),w=(0,a.useRef)(0),C=(0,a.useCallback)(e=>{let t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t?{r:parseInt(t[1],16)/255,g:parseInt(t[2],16)/255,b:parseInt(t[3],16)/255}:{r:1,g:1,b:1}},[]),b=(0,a.useMemo)(()=>C(o),[o,C]),S=(0,a.useMemo)(()=>C(r),[r,C]);(0,a.useEffect)(()=>{if(!z.current)return;let e=z.current,t=e.getBoundingClientRect(),n=t.width,a=t.height,o=new s.WebGLRenderer({antialias:!0,alpha:!0,powerPreference:"high-performance"});o.setClearColor(0,0);let r=1;"low"===y?r=.5:"medium"===y?r=.75:"high"===y&&(r=1);let u=Math.min(window.devicePixelRatio*r,2);o.setSize(n,a,!1),o.setPixelRatio(u),o.domElement.style.width="100%",o.domElement.style.height="100%",o.domElement.style.display="block",e.appendChild(o.domElement);let p=new c.Z58,h=new c.qUd(-1,1,1,-1,0,1),C={iTime:{value:0},iResolution:{value:new c.Pq0(n*u,a*u,1)},uColor:{value:new c.Pq0(b.r,b.g,b.b)},uBackgroundColor:{value:new c.Pq0(S.r,S.g,S.b)},uWaveFrequency:{value:Math.max(.1,Math.min(10,l))},uWaveAmplitude:{value:Math.max(.1,Math.min(5,d))},uDistortion:{value:Math.max(0,Math.min(2,v))},uChromaShift:{value:Math.max(0,Math.min(.5,m))},uNoiseLevel:{value:Math.max(0,Math.min(1,f))},uFlatness:{value:Math.max(0,Math.min(10,g))},uOpacity:{value:Math.max(0,Math.min(1,x))}},F=`
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,j=`
      precision mediump float;

      #define PI 3.1415926538

      uniform float iTime;
      uniform vec3 iResolution;
      uniform vec3 uColor;
      uniform vec3 uBackgroundColor;
      uniform float uWaveFrequency;
      uniform float uWaveAmplitude;
      uniform float uDistortion;
      uniform float uChromaShift;
      uniform float uNoiseLevel;
      uniform float uFlatness;
      uniform float uOpacity;

      vec4 permute(vec4 x) {
        return mod(((x * 34.0) + 1.0) * x, 289.0);
      }

      vec4 taylorInvSqrt(vec4 r) {
        return 1.79284291400159 - 0.85373472095314 * r;
      }

      vec3 fade(vec3 t) {
        return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
      }

      float cnoise(vec3 P) {
        vec3 Pi0 = floor(P);
        vec3 Pi1 = Pi0 + vec3(1.0);
        Pi0 = mod(Pi0, 289.0);
        Pi1 = mod(Pi1, 289.0);
        vec3 Pf0 = fract(P);
        vec3 Pf1 = Pf0 - vec3(1.0);
        vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
        vec4 iy = vec4(Pi0.yy, Pi1.yy);
        vec4 iz0 = Pi0.zzzz;
        vec4 iz1 = Pi1.zzzz;

        vec4 ixy = permute(permute(ix) + iy);
        vec4 ixy0 = permute(ixy + iz0);
        vec4 ixy1 = permute(ixy + iz1);

        vec4 gx0 = ixy0 / 7.0;
        vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
        gx0 = fract(gx0);
        vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
        vec4 sz0 = step(gz0, vec4(0.0));
        gx0 -= sz0 * (step(0.0, gx0) - 0.5);
        gy0 -= sz0 * (step(0.0, gy0) - 0.5);

        vec4 gx1 = ixy1 / 7.0;
        vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
        gx1 = fract(gx1);
        vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
        vec4 sz1 = step(gz1, vec4(0.0));
        gx1 -= sz1 * (step(0.0, gx1) - 0.5);
        gy1 -= sz1 * (step(0.0, gy1) - 0.5);

        vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
        vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
        vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
        vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
        vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
        vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
        vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
        vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

        vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
        g000 *= norm0.x;
        g010 *= norm0.y;
        g100 *= norm0.z;
        g110 *= norm0.w;
        vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
        g001 *= norm1.x;
        g011 *= norm1.y;
        g101 *= norm1.z;
        g111 *= norm1.w;

        float n000 = dot(g000, Pf0);
        float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
        float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
        float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
        float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
        float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
        float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
        float n111 = dot(g111, Pf1);

        vec3 fade_xyz = fade(Pf0);
        vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
        vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
        float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
        return 2.2 * n_xyz;
      }

      float flatSin(float x, float b) {
        float num = 1.0 + b * b;
        float den = 1.0 + b * b * cos(x) * cos(x);
        float y = sqrt(num / den) * cos(x);
        return y * 0.5 + 0.5;
      }

      float rand(vec2 co) {
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        vec2 uv = fragCoord / iResolution.xy;
        vec2 center = vec2(0.5);
        vec2 delta = uv - center;
        float dist = length(delta);

        float timeScale = 0.1;
        float timeDelay = uChromaShift * 0.08;
        float baseTime = iTime * timeScale;

        float bSquared = uFlatness * uFlatness;
        float num = 1.0 + bSquared;

        vec3 intensity;

        for (int i = 0; i < 3; i++) {
          float tOffset = float(i) * timeDelay;

          vec2 distortedUV = uv;
          float dx = cnoise(vec3(1.8 * uv, baseTime + tOffset)) * uDistortion;
          distortedUV.x += dx * 0.8;

          vec2 distortedDelta = distortedUV - center;
          float distortedDist = length(distortedDelta);
          float normalizedDist = 1.0 - distortedDist / 0.70710678;

          float x = uWaveFrequency * 100.0 * normalizedDist * uWaveAmplitude;
          float cosX = cos(x);
          float den = 1.0 + bSquared * cosX * cosX;
          float waveValue = sqrt(num / den) * cosX * 0.5 + 0.5;

          if (uNoiseLevel > 0.01) {
            float noise = rand(distortedUV * 1000.0);
            waveValue = waveValue * (1.0 - uNoiseLevel) + noise * uNoiseLevel;
          }

          intensity[i] = waveValue;
        }

        vec3 finalColor = mix(uBackgroundColor, uColor, intensity);

        float alpha = (intensity.r + intensity.g + intensity.b) * 0.333333 * uOpacity;

        fragColor = vec4(finalColor, alpha);
      }

      void main() {
        vec4 color = vec4(0.0);
        mainImage(color, gl_FragCoord.xy);
        gl_FragColor = color;
      }
    `,q=new c.BKk({uniforms:C,vertexShader:F,fragmentShader:j,transparent:!0}),N=new c.bdM(2,2),M=new c.eaF(N,q);p.add(M),w.current=performance.now();let _=w.current,k=e=>{if(P.current=requestAnimationFrame(k),e-_<16)return;_=e;let t=(e-w.current)*.001*i;C.iTime.value=t,o.render(p,h)};P.current=requestAnimationFrame(k);let E=()=>{let t=e.getBoundingClientRect(),i=t.width,n=t.height;o.setSize(i,n,!1),C.iResolution.value.set(i*u,n*u,1)};return window.addEventListener("resize",E),()=>{window.removeEventListener("resize",E),cancelAnimationFrame(P.current),p.remove(M),N.dispose(),q.dispose(),o.dispose(),o.domElement&&o.domElement.parentNode===e&&e.removeChild(o.domElement)}},[i,l,d,v,m,f,g,x,y,b,S]);let F="number"==typeof e?`${e}px`:e,j="number"==typeof t?`${t}px`:t;return(0,n.jsxs)("div",{className:(0,u.cn)("relative overflow-hidden",p),style:{width:F,height:j},children:[(0,n.jsx)("div",{ref:z,className:"absolute inset-0"}),h&&(0,n.jsx)("div",{className:"relative z-10 w-full h-full pointer-events-none",children:h})]})};d.displayName="ChromaWaves";let v=()=>{let[e,t]=(0,l.I)(),[i,s]=(0,a.useState)(.5),[c,u]=(0,a.useState)("#ffffff"),[v,m]=(0,a.useState)("#8B5CF6"),[f,g]=(0,a.useState)(.2),[x,y]=(0,a.useState)(.3),[p,h]=(0,a.useState)(1.5),[z,P]=(0,a.useState)(.25),[w,C]=(0,a.useState)(.1),[b,S]=(0,a.useState)(1),[F,j]=(0,a.useState)(1);return(0,n.jsxs)("div",{children:[(0,n.jsx)(o.Bg,{}),(0,n.jsxs)(o.VX,{children:[(0,n.jsxs)(o.Ec,{children:[(0,n.jsx)(o.Ch,{onRefresh:t,children:(0,n.jsx)(d,{speed:i,color:c,backgroundColor:v,waveFrequency:f,waveAmplitude:x,distortion:p,chromaShift:z,noiseLevel:w,flatness:b,opacity:F,quality:"medium"},e)}),(0,n.jsxs)(o.IH,{children:[(0,n.jsx)(r.PreviewColor,{title:"Color 1",value:c,onChange:u}),(0,n.jsx)(r.PreviewColor,{title:"Color 2",value:v,onChange:m}),(0,n.jsx)(r.PreviewSlider,{title:"Speed",value:i,onChange:s,min:.1,max:3,step:.1}),(0,n.jsx)(r.PreviewSlider,{title:"Wave Frequency",value:f,onChange:g,min:.1,max:10,step:.1}),(0,n.jsx)(r.PreviewSlider,{title:"Wave Amplitude",value:x,onChange:y,min:.1,max:5,step:.1}),(0,n.jsx)(r.PreviewSlider,{title:"Distortion",value:p,onChange:h,min:0,max:2,step:.1}),(0,n.jsx)(r.PreviewSlider,{title:"Flatness",value:b,onChange:S,min:0,max:10,step:.5}),(0,n.jsx)(r.PreviewSlider,{title:"Chromatic Shift",value:z,onChange:P,min:0,max:5,step:.01}),(0,n.jsx)(r.PreviewSlider,{title:"Noise Level",value:w,onChange:C,min:0,max:1,step:.05}),(0,n.jsx)(r.PreviewSlider,{title:"Opacity",value:F,onChange:j,min:0,max:1,step:.05})]}),(0,n.jsx)(o.Ub,{data:[{name:"width",type:"number | string",default:'"100%"',description:"Width of the component in pixels or CSS value"},{name:"height",type:"number | string",default:'"100%"',description:"Height of the component in pixels or CSS value"},{name:"speed",type:"number",default:"0.5",description:"Animation speed multiplier"},{name:"color",type:"string",default:'"#FFFFFF"',description:"Primary wave color in hex format"},{name:"backgroundColor",type:"string",default:'"#8B5CF6"',description:"Background color in hex format"},{name:"waveFrequency",type:"number",default:"0.2",description:"Wave frequency/count (0.1-10)"},{name:"waveAmplitude",type:"number",default:"0.3",description:"Wave amplitude/height (0.1-5)"},{name:"distortion",type:"number",default:"1.5",description:"Distortion intensity (0-2)"},{name:"chromaShift",type:"number",default:"0.25",description:"Chromatic aberration effect intensity (0-0.5)"},{name:"noiseLevel",type:"number",default:"0.1",description:"Grain/noise level (0-1)"},{name:"flatness",type:"number",default:"1.0",description:"Peak flatness (0-10)"},{name:"opacity",type:"number",default:"1.0",description:"Master opacity control (0-1)"},{name:"quality",type:'"low" | "medium" | "high"',default:'"high"',description:"Rendering quality level"},{name:"className",type:"string",default:'""',description:"Additional CSS classes"},{name:"children",type:"React.ReactNode",default:"undefined",description:"Content to render on top of the effect"}]})]}),(0,n.jsx)(o.lT,{children:(0,n.jsx)(o.Gv,{})})]})]})}},56388:(e,t,i)=>{i.d(t,{Gv:()=>s.CodeExample,lT:()=>n.CodeTab,Bg:()=>c.ComponentHeader,i8:()=>d.CopyButton,IH:()=>o.Customize,gI:()=>f,Dn:()=>x,pi:()=>g,W7:()=>r.PreviewColor,Ch:()=>a.PreviewContainer,UD:()=>r.PreviewInput,bg:()=>r.PreviewSelect,yt:()=>r.PreviewSlider,tl:()=>r.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>l.PropTable,VX:()=>n.TabsLayout,bs:()=>m});var n=i(55019);i(27382);var a=i(10236),o=i(69485),r=i(48543),l=i(87552);i(39260);var s=i(52407),c=i(79901);i(24496);var u=i(95155);i(66729);var d=i(28592),v=i(90650);let m="rounded-lg border bg-background";function f({className:e,children:t,...i}){return(0,u.jsx)("div",{className:(0,v.cn)("rounded-xl border bg-muted/50 p-1",e),...i,children:t})}function g({className:e,children:t,...i}){return(0,u.jsx)("div",{className:(0,v.cn)(m,e),...i,children:t})}function x({title:e,description:t,className:i,children:n}){return(0,u.jsxs)("section",{className:i,children:[(0,u.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,u.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,u.jsx)("div",{className:"mt-6",children:n})]})}},90761:(e,t,i)=>{i.d(t,{I:()=>a});var n=i(12115);function a(){let[e,t]=(0,n.useState)(0),i=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{i()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[i]),[e,i]}}}]);