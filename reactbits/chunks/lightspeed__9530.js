"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[9530],{9530:(e,t,r)=>{r.r(t),r.d(t,{default:()=>m});var n=r(95155),o=r(12115),a=r(56388),i=r(48543),l=r(90761),u=r(12246),s=r(2253),d=r(90650);let c=({width:e="100%",height:t="100%",speed:r=1,primaryColor:a="#FF5722",secondaryColor:i="#2196F3",tertiaryColor:l="#4CAF50",streakCount:c=128,stretchFactor:m=.05,intensity:f=1,interactionEnabled:p=!0,rotation:v=0,fadePower:h=2,opacity:C=1,quality:x="medium",maxFPS:g=60,pauseWhenOffscreen:y=!0,className:w,children:b})=>{let S=(0,o.useRef)(null),P=(0,o.useRef)(0),F=(0,o.useRef)(0),k=(0,o.useRef)(0),R=(0,o.useRef)(!1),j=(0,o.useRef)(!0),E=(0,o.useRef)(0),I=(0,o.useRef)(0);(0,o.useEffect)(()=>{if(!S.current)return;let e=S.current,t=e=>{let t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t?{r:parseInt(t[1],16)/255,g:parseInt(t[2],16)/255,b:parseInt(t[3],16)/255}:{r:1,g:.4,b:.13}},n=t(a),o=t(i),d=t(l),w=e.getBoundingClientRect(),b=w.width,T=w.height,M={low:{pixelRatio:1,antialias:!1},medium:{pixelRatio:Math.min(window.devicePixelRatio,2),antialias:!0},high:{pixelRatio:Math.min(window.devicePixelRatio,3),antialias:!0}}[x],z=new u.WebGLRenderer({antialias:M.antialias,alpha:!0,powerPreference:"high-performance",stencil:!1,depth:!1});z.setClearColor(0,0);let O=M.pixelRatio;z.setSize(b,T,!1),z.setPixelRatio(O),z.domElement.style.width="100%",z.domElement.style.height="100%",z.domElement.style.display="block",e.appendChild(z.domElement);let V=new s.Z58,L=new s.qUd(-1,1,1,-1,0,1),N={iTime:{value:0},iResolution:{value:new s.I9Y(b*O,T*O)},iMouse:{value:new s.IUQ(0,0,0,0)},uCompression:{value:0},uColor1:{value:new s.Pq0(n.r,n.g,n.b)},uColor2:{value:new s.Pq0(o.r,o.g,o.b)},uColor3:{value:new s.Pq0(d.r,d.g,d.b)},uStreakCount:{value:c},uStretchFactor:{value:m},uIntensity:{value:f},uSpeed:{value:r},uRotation:{value:v},uFadePower:{value:h},uOpacity:{value:C}},B=`
      void main() {
        gl_Position = vec4(position, 1.0);
      }
    `,q=`
      #define PI 3.14159265359

      uniform float iTime;
      uniform vec2 iResolution;
      uniform vec4 iMouse;
      uniform float uCompression;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform float uStreakCount;
      uniform float uStretchFactor;
      uniform float uIntensity;
      uniform float uSpeed;
      uniform float uRotation;
      uniform float uFadePower;
      uniform float uOpacity;

      float computeStreak(vec2 coord, float timeOffset) {
        coord.x = coord.x * uStreakCount;
        float horizontalPos = fract(coord.x);
        float columnIndex = floor(coord.x);

        coord.y *= uStretchFactor;

        float randomOffset = sin(columnIndex * 215.4);

        float speedVariation = cos(columnIndex * 33.1) * 0.3 + 0.7;

        float dynamicTrail = mix(95.0, 35.0, speedVariation);

        float animatedY = fract(coord.y + timeOffset * speedVariation + randomOffset);
        float streakValue = animatedY * dynamicTrail;

        streakValue = 1.0 / streakValue;
        streakValue = smoothstep(0.0, 1.0, streakValue * streakValue);
        streakValue = sin(streakValue * PI) * (speedVariation * 5.0);

        float horizontalFalloff = sin(horizontalPos * PI);

        return streakValue * (horizontalFalloff * horizontalFalloff);
      }

      void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution) / iResolution.y;

        float distFromCenter = length(uv) + 0.1;

        float angle = atan(uv.x, uv.y) / PI + uRotation;
        float radius = 2.5 / distFromCenter;
        vec2 polarCoord = vec2(angle, radius);

        float compressionFactor = mix(1.0, 0.5, uCompression);
        polarCoord.y *= compressionFactor;

        float animTime = iTime * 0.4 * uSpeed;

        vec3 finalColor = vec3(0.0);
        finalColor += uColor1 * computeStreak(polarCoord, animTime);
        finalColor += uColor2 * computeStreak(polarCoord, animTime + 0.33);
        finalColor += uColor3 * computeStreak(polarCoord, animTime + 0.66);

        finalColor *= uIntensity;
        float distanceFade = pow(distFromCenter, uFadePower);
        finalColor *= distanceFade;

        finalColor *= uOpacity;

        float alpha = max(max(finalColor.r, finalColor.g), finalColor.b);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,A=new s.BKk({uniforms:N,vertexShader:B,fragmentShader:q,transparent:!0,blending:s.EZo}),_=new s.bdM(2,2),W=new s.eaF(_,A);V.add(W);let H=t=>{let r=e.getBoundingClientRect();N.iMouse.value.x=t.clientX-r.left,N.iMouse.value.y=T-(t.clientY-r.top)},U=()=>{R.current=!0,E.current=1,N.iMouse.value.z=1},Y=()=>{R.current=!1,E.current=0,N.iMouse.value.z=0},X=t=>{if(t.touches.length>0){let r=t.touches[0],n=e.getBoundingClientRect();N.iMouse.value.x=r.clientX-n.left,N.iMouse.value.y=T-(r.clientY-n.top),E.current=1,N.iMouse.value.z=1}},D=()=>{E.current=0,N.iMouse.value.z=0};p&&(e.addEventListener("mousemove",H),e.addEventListener("mousedown",U),e.addEventListener("mouseup",Y),e.addEventListener("touchstart",X),e.addEventListener("touchend",D));let G=null;y&&(G=new IntersectionObserver(e=>{j.current=e[0].isIntersecting},{threshold:0})).observe(e);let Q=1e3/g,$=e=>{P.current=requestAnimationFrame($),F.current||(F.current=e,k.current=e);let t=e-k.current;t<Q||(k.current=e-t%Q,(!y||j.current)&&(N.iTime.value=(e-F.current)*.001,I.current+=(E.current-I.current)*4*(.001*t),N.uCompression.value=I.current,N.uColor1.value.set(n.r,n.g,n.b),N.uColor2.value.set(o.r,o.g,o.b),N.uColor3.value.set(d.r,d.g,d.b),N.uStreakCount.value=c,N.uStretchFactor.value=m,N.uIntensity.value=f,N.uSpeed.value=r,N.uRotation.value=v,N.uFadePower.value=h,N.uOpacity.value=C,z.render(V,L)))};P.current=requestAnimationFrame($);let Z=()=>{let t=e.getBoundingClientRect(),r=t.width,n=t.height;z.setSize(r,n,!1),N.iResolution.value.set(r*O,n*O)};return window.addEventListener("resize",Z),()=>{window.removeEventListener("resize",Z),P.current&&cancelAnimationFrame(P.current),p&&(e.removeEventListener("mousemove",H),e.removeEventListener("mousedown",U),e.removeEventListener("mouseup",Y),e.removeEventListener("touchstart",X),e.removeEventListener("touchend",D)),G&&G.disconnect(),_.dispose(),A.dispose(),z.dispose(),e.contains(z.domElement)&&e.removeChild(z.domElement)}},[a,i,l,c,m,f,r,v,h,C,p,x,g,y]);let T="number"==typeof e?`${e}px`:e,M="number"==typeof t?`${t}px`:t;return(0,n.jsx)("div",{ref:S,className:(0,d.cn)("relative overflow-hidden",w),style:{width:T,height:M},children:b&&(0,n.jsx)("div",{className:"pointer-events-none absolute inset-0 z-10 flex items-center justify-center",children:b})})},m=()=>{let[e,t]=(0,l.I)(),[r,u]=(0,o.useState)(.5),[s,d]=(0,o.useState)("#5227FF"),[m,f]=(0,o.useState)("#FF9FFC"),[p,v]=(0,o.useState)("#B19EEF"),[h,C]=(0,o.useState)(128),[x,g]=(0,o.useState)(.05),[y,w]=(0,o.useState)(1),[b,S]=(0,o.useState)(!0),[P,F]=(0,o.useState)(0),[k,R]=(0,o.useState)(2),[j,E]=(0,o.useState)(1),[I,T]=(0,o.useState)("medium"),[M,z]=(0,o.useState)(60),[O,V]=(0,o.useState)(!0);return(0,n.jsxs)("div",{children:[(0,n.jsx)(a.Bg,{}),(0,n.jsxs)(a.VX,{children:[(0,n.jsxs)(a.Ec,{children:[(0,n.jsx)(a.Ch,{onRefresh:t,children:(0,n.jsx)(c,{width:"100%",height:"100%",speed:r,primaryColor:s,secondaryColor:m,tertiaryColor:p,streakCount:h,stretchFactor:x,intensity:y,interactionEnabled:b,rotation:P,fadePower:k,opacity:j,quality:I,maxFPS:M,pauseWhenOffscreen:O},e)}),(0,n.jsxs)(a.IH,{children:[(0,n.jsx)(i.PreviewSlider,{title:"Speed",value:r,onChange:u,min:.1,max:3,step:.1}),(0,n.jsx)(i.PreviewSlider,{title:"Intensity",value:y,onChange:w,min:0,max:3,step:.1}),(0,n.jsx)(i.PreviewSlider,{title:"Rotation",value:P,onChange:F,min:-3.14,max:3.14,step:.1}),(0,n.jsx)(i.PreviewSlider,{title:"Opacity",value:j,onChange:E,min:0,max:1,step:.1}),(0,n.jsx)(i.PreviewSwitch,{title:"Interaction Enabled",checked:b,onChange:S}),(0,n.jsx)(i.PreviewSlider,{title:"Streak Count",value:h,onChange:C,min:32,max:256,step:8}),(0,n.jsx)(i.PreviewSlider,{title:"Stretch Factor",value:x,onChange:g,min:.01,max:.2,step:.01}),(0,n.jsx)(i.PreviewSlider,{title:"Fade Power",value:k,onChange:R,min:2.5,max:4,step:.1}),(0,n.jsx)(i.PreviewColor,{title:"Primary Color",value:s,onChange:d}),(0,n.jsx)(i.PreviewColor,{title:"Secondary Color",value:m,onChange:f}),(0,n.jsx)(i.PreviewColor,{title:"Tertiary Color",value:p,onChange:v}),(0,n.jsx)(i.PreviewSelect,{title:"Quality",value:I,options:[{label:"Low",value:"low"},{label:"Medium",value:"medium"},{label:"High",value:"high"}],onChange:e=>T(e)}),(0,n.jsx)(i.PreviewSlider,{title:"Max FPS",value:M,onChange:z,min:15,max:120,step:5}),(0,n.jsx)(i.PreviewSwitch,{title:"Pause When Offscreen",checked:O,onChange:V})]}),(0,n.jsx)(a.Ub,{data:[{name:"width",type:"number | string",default:'"100%"',description:"Width of the component in pixels or CSS value"},{name:"height",type:"number | string",default:'"100%"',description:"Height of the component in pixels or CSS value"},{name:"speed",type:"number",default:"1.0",description:"Animation speed multiplier"},{name:"primaryColor",type:"string",default:'"#FF5722"',description:"Primary streak color in hex format"},{name:"secondaryColor",type:"string",default:'"#2196F3"',description:"Secondary streak color in hex format"},{name:"tertiaryColor",type:"string",default:'"#4CAF50"',description:"Tertiary streak color in hex format"},{name:"streakCount",type:"number",default:"128",description:"Number of horizontal streak columns"},{name:"stretchFactor",type:"number",default:"0.05",description:"Vertical stretch factor of streaks"},{name:"intensity",type:"number",default:"1.0",description:"Overall intensity/brightness multiplier"},{name:"interactionEnabled",type:"boolean",default:"true",description:"Enable compression on mouse click"},{name:"rotation",type:"number",default:"0",description:"Rotation angle in radians"},{name:"fadePower",type:"number",default:"2.0",description:"Distance-based fade multiplier"},{name:"opacity",type:"number",default:"1.0",description:"Overall opacity (0-1)"},{name:"quality",type:'"low" | "medium" | "high"',default:'"medium"',description:"Quality preset for performance/visual tradeoff"},{name:"maxFPS",type:"number",default:"60",description:"Maximum frames per second cap"},{name:"pauseWhenOffscreen",type:"boolean",default:"true",description:"Pause rendering when component is off-screen"},{name:"className",type:"string",default:'""',description:"Additional CSS classes"},{name:"children",type:"React.ReactNode",default:"undefined",description:"Content to render on top of the effect"}]})]}),(0,n.jsx)(a.lT,{children:(0,n.jsx)(a.Gv,{})})]})]})}},56388:(e,t,r)=>{r.d(t,{Gv:()=>u.CodeExample,lT:()=>n.CodeTab,Bg:()=>s.ComponentHeader,i8:()=>c.CopyButton,IH:()=>a.Customize,gI:()=>p,Dn:()=>h,pi:()=>v,W7:()=>i.PreviewColor,Ch:()=>o.PreviewContainer,UD:()=>i.PreviewInput,bg:()=>i.PreviewSelect,yt:()=>i.PreviewSlider,tl:()=>i.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>l.PropTable,VX:()=>n.TabsLayout,bs:()=>f});var n=r(55019);r(27382);var o=r(10236),a=r(69485),i=r(48543),l=r(87552);r(39260);var u=r(52407),s=r(79901);r(24496);var d=r(95155);r(66729);var c=r(28592),m=r(90650);let f="rounded-lg border bg-background";function p({className:e,children:t,...r}){return(0,d.jsx)("div",{className:(0,m.cn)("rounded-xl border bg-muted/50 p-1",e),...r,children:t})}function v({className:e,children:t,...r}){return(0,d.jsx)("div",{className:(0,m.cn)(f,e),...r,children:t})}function h({title:e,description:t,className:r,children:n}){return(0,d.jsxs)("section",{className:r,children:[(0,d.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,d.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,d.jsx)("div",{className:"mt-6",children:n})]})}},90761:(e,t,r)=>{r.d(t,{I:()=>o});var n=r(12115);function o(){let[e,t]=(0,n.useState)(0),r=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{r()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[r]),[e,r]}}}]);