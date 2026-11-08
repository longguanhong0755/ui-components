"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[64487],{56388:(e,t,i)=>{i.d(t,{Gv:()=>u.CodeExample,lT:()=>s.CodeTab,Bg:()=>l.ComponentHeader,i8:()=>h.CopyButton,IH:()=>o.Customize,gI:()=>p,Dn:()=>f,pi:()=>m,W7:()=>n.PreviewColor,Ch:()=>r.PreviewContainer,UD:()=>n.PreviewInput,bg:()=>n.PreviewSelect,yt:()=>n.PreviewSlider,tl:()=>n.PreviewSwitch,Ec:()=>s.PreviewTab,Ub:()=>a.PropTable,VX:()=>s.TabsLayout,bs:()=>d});var s=i(55019);i(27382);var r=i(10236),o=i(69485),n=i(48543),a=i(87552);i(39260);var u=i(52407),l=i(79901);i(24496);var c=i(95155);i(66729);var h=i(28592),v=i(90650);let d="rounded-lg border bg-background";function p({className:e,children:t,...i}){return(0,c.jsx)("div",{className:(0,v.cn)("rounded-xl border bg-muted/50 p-1",e),...i,children:t})}function m({className:e,children:t,...i}){return(0,c.jsx)("div",{className:(0,v.cn)(d,e),...i,children:t})}function f({title:e,description:t,className:i,children:s}){return(0,c.jsxs)("section",{className:i,children:[(0,c.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,c.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,c.jsx)("div",{className:"mt-6",children:s})]})}},64487:(e,t,i)=>{i.r(t),i.d(t,{default:()=>c});var s=i(95155),r=i(12115),o=i(56388),n=i(90761),a=i(12246),u=i(2253);let l=({frontImage:e,backImage:t,mouseForce:i=50,cursorSize:o=250,resolution:n=.5,isViscous:l=!0,viscous:c=30,iterationsViscous:h=24,iterationsPoisson:v=28,dt:d=.014,BFECC:p=!0,isBounce:m=!1,autoDemo:f=!0,autoSpeed:y=.55,autoIntensity:x=2.2,takeoverDuration:g=.25,autoResumeDelay:b=1200,autoRampDuration:S=.6,revealStrength:w=.75,revealSoftness:_=1,style:D,className:C=""})=>{let T=(0,r.useRef)(null),U=(0,r.useRef)(null),k=(0,r.useRef)(null),z=(0,r.useRef)(null),R=(0,r.useRef)(null),I=(0,r.useRef)(null),F=(0,r.useRef)(!0),E=(0,r.useRef)(null),M=(0,r.useRef)(null);return(0,r.useEffect)(()=>{let s=T.current;if(!s)return;let r=!1;class D{init(e){this.container=e,this.pixelRatio=Math.min(window.devicePixelRatio||1,2),this.resize(),this.renderer=new a.WebGLRenderer({antialias:!0,alpha:!0}),this.renderer.autoClear=!0,this.renderer.setClearColor(0,0),this.renderer.setPixelRatio(this.pixelRatio),this.renderer.setSize(this.width,this.height);let t=this.renderer.domElement;t.style.width="100%",t.style.height="100%",t.style.display="block",t.style.borderRadius="inherit",this.clock=new u.zD7,this.clock.start()}resize(){if(!this.container)return;let e=this.container.getBoundingClientRect();this.width=Math.max(1,Math.floor(e.width)),this.height=Math.max(1,Math.floor(e.height)),this.aspect=this.width/this.height,this.renderer&&this.renderer.setSize(this.width,this.height,!1)}update(){this.clock&&(this.delta=this.clock.getDelta(),this.time+=this.delta)}constructor(){this.width=0,this.height=0,this.aspect=1,this.pixelRatio=1,this.container=null,this.renderer=null,this.clock=null,this.time=0,this.delta=0}}let C=new D;class j{init(e){this.container=e,this.docTarget=e.ownerDocument||null;let t=this.docTarget?.defaultView||window;t&&(this.listenerTarget=t,this.listenerTarget.addEventListener("mousemove",this._onMouseMove),this.listenerTarget.addEventListener("touchstart",this._onTouchStart,{passive:!0}),this.listenerTarget.addEventListener("touchmove",this._onTouchMove,{passive:!0}),this.listenerTarget.addEventListener("touchend",this._onTouchEnd),this.docTarget?.addEventListener("mouseleave",this._onDocumentLeave))}dispose(){this.listenerTarget&&(this.listenerTarget.removeEventListener("mousemove",this._onMouseMove),this.listenerTarget.removeEventListener("touchstart",this._onTouchStart),this.listenerTarget.removeEventListener("touchmove",this._onTouchMove),this.listenerTarget.removeEventListener("touchend",this._onTouchEnd)),this.docTarget&&this.docTarget.removeEventListener("mouseleave",this._onDocumentLeave),this.listenerTarget=null,this.docTarget=null,this.container=null}isPointInside(e,t){if(!this.container)return!1;let i=this.container.getBoundingClientRect();return 0!==i.width&&0!==i.height&&e>=i.left&&e<=i.right&&t>=i.top&&t<=i.bottom}updateHoverState(e,t){return this.isHoverInside=this.isPointInside(e,t),this.isHoverInside}setCoordsFromClient(e,t){if(!this.container)return;let i=this.container.getBoundingClientRect();if(0===i.width||0===i.height)return;let s=(e-i.left)/i.width,r=(t-i.top)/i.height;this.coords.set(2*s-1,-(2*r-1))}setNormalized(e,t){this.coords.set(e,t)}onDocumentMouseMove(e){if(this.updateHoverState(e.clientX,e.clientY)){if(this.onInteract&&this.onInteract(),this.isAutoActive&&!this.hasUserControl&&!this.takeoverActive){if(!this.container)return;let t=this.container.getBoundingClientRect(),i=(e.clientX-t.left)/t.width,s=(e.clientY-t.top)/t.height;this.takeoverFrom.copy(this.coords),this.takeoverTo.set(2*i-1,-(2*s-1)),this.takeoverStartTime=performance.now(),this.takeoverActive=!0,this.hasUserControl=!0,this.isAutoActive=!1;return}this.setCoordsFromClient(e.clientX,e.clientY),this.hasUserControl=!0}}onDocumentTouchStart(e){if(1!==e.touches.length)return;let t=e.touches[0];this.updateHoverState(t.clientX,t.clientY)&&(this.onInteract&&this.onInteract(),this.setCoordsFromClient(t.clientX,t.clientY),this.hasUserControl=!0)}onDocumentTouchMove(e){if(1!==e.touches.length)return;let t=e.touches[0];this.updateHoverState(t.clientX,t.clientY)&&(this.onInteract&&this.onInteract(),this.setCoordsFromClient(t.clientX,t.clientY))}onTouchEnd(){this.isHoverInside=!1}onDocumentLeave(){this.isHoverInside=!1}update(){if(this.takeoverActive){let e=(performance.now()-this.takeoverStartTime)/(1e3*this.takeoverDuration);e>=1?(this.takeoverActive=!1,this.coords.copy(this.takeoverTo),this.coords_old.copy(this.coords),this.diff.set(0,0)):this.coords.copy(this.takeoverFrom).lerp(this.takeoverTo,e*e*(3-2*e))}this.diff.subVectors(this.coords,this.coords_old),this.coords_old.copy(this.coords)}constructor(){this.coords=new u.I9Y(0,0),this.coords_old=new u.I9Y(0,0),this.diff=new u.I9Y(0,0),this.container=null,this.docTarget=null,this.listenerTarget=null,this.isHoverInside=!1,this.hasUserControl=!1,this.isAutoActive=!1,this.autoIntensity=2,this.takeoverActive=!1,this.takeoverStartTime=0,this.takeoverDuration=.25,this.takeoverFrom=new u.I9Y,this.takeoverTo=new u.I9Y,this.onInteract=null,this._onMouseMove=this.onDocumentMouseMove.bind(this),this._onTouchStart=this.onDocumentTouchStart.bind(this),this._onTouchMove=this.onDocumentTouchMove.bind(this),this._onTouchEnd=this.onTouchEnd.bind(this),this._onDocumentLeave=this.onDocumentLeave.bind(this)}}let A=new j;class P{constructor(e,t,i){this.active=!0,this.current=new u.I9Y,this.target=new u.I9Y,this.lastTime=performance.now(),this.activationTime=performance.now(),this.margin=.2,this._tmpDir=new u.I9Y,this.mouse=e,this.manager=t,this.enabled=i.enabled,this.speed=i.speed,this.resumeDelay=i.resumeDelay||3e3,this.rampDurationMs=1e3*(i.rampDuration||0);const s=Math.random;this.current.set((2*s()-1)*(1-this.margin),(2*s()-1)*(1-this.margin)),this.pickNewTarget();const r=this._tmpDir.subVectors(this.target,this.current).normalize();this.mouse.coords_old.set(this.current.x-.05*r.x,this.current.y-.05*r.y),this.mouse.setNormalized(this.current.x,this.current.y),this.mouse.isAutoActive=!0}pickNewTarget(){let e=Math.random;this.target.set((2*e()-1)*(1-this.margin),(2*e()-1)*(1-this.margin))}forceStop(){this.active=!1,this.mouse.isAutoActive=!1}update(){if(!this.enabled)return;let e=performance.now();if(e-this.manager.lastUserInteraction<this.resumeDelay||this.mouse.isHoverInside){this.active&&this.forceStop();return}this.active||(this.active=!0,this.current.copy(this.mouse.coords),this.lastTime=e,this.activationTime=e,this.pickNewTarget()),this.mouse.isAutoActive=!0;let t=(e-this.lastTime)/1e3;this.lastTime=e,t>.2&&(t=.016);let i=this._tmpDir.subVectors(this.target,this.current),s=i.length();if(s<.01)return void this.pickNewTarget();i.normalize();let r=1;if(this.rampDurationMs>0){let t=Math.min(1,(e-this.activationTime)/this.rampDurationMs);r=t*t*(3-2*t)}let o=Math.min(this.speed*t*r,s);this.current.addScaledVector(i,o),this.mouse.setNormalized(this.current.x,this.current.y)}}let B=`
      precision highp float;
      attribute vec3 position;
      varying vec2 vUv;
      uniform vec2 boundarySpace;
      void main() {
        vec3 pos = position;
        vec2 scale = 1.0 - boundarySpace * 2.0;
        pos.xy = pos.xy * scale;
        vUv = vec2(0.5) + pos.xy * 0.5;
        gl_Position = vec4(pos, 1.0);
      }
    `,Y=`
      precision highp float;
      attribute vec3 position;
      attribute vec2 uv;
      varying vec2 vUv;
      uniform vec2 center;
      uniform vec2 scale;
      uniform vec2 px;
      void main() {
        vec2 pos = position.xy * scale * 2.0 * px + center;
        vUv = uv;
        gl_Position = vec4(pos, 0.0, 1.0);
      }
    `,V=`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D velocity;
      uniform float dt;
      uniform bool isBFECC;
      uniform vec2 fboSize;
      uniform vec2 px;

      void main() {
        vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;

        if (!isBFECC) {
          vec2 vel = texture2D(velocity, vUv).xy;
          vec2 uv2 = vUv - vel * dt * ratio;
          vec2 newVel = texture2D(velocity, uv2).xy;
          gl_FragColor = vec4(newVel, 0.0, 0.0);
        } else {
          vec2 spot_new = vUv;
          vec2 vel_old = texture2D(velocity, vUv).xy;
          vec2 spot_old = spot_new - vel_old * dt * ratio;
          vec2 vel_new1 = texture2D(velocity, spot_old).xy;
          vec2 spot_new2 = spot_old + vel_new1 * dt * ratio;
          vec2 error = spot_new2 - spot_new;
          vec2 spot_new3 = spot_new - error / 2.0;
          vec2 vel_2 = texture2D(velocity, spot_new3).xy;
          vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio;
          vec2 newVel2 = texture2D(velocity, spot_old2).xy;
          gl_FragColor = vec4(newVel2, 0.0, 0.0);
        }
      }
    `,N=`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D velocity;
      uniform float dt;
      uniform vec2 px;

      void main() {
        float x0 = texture2D(velocity, vUv - vec2(px.x, 0.0)).x;
        float x1 = texture2D(velocity, vUv + vec2(px.x, 0.0)).x;
        float y0 = texture2D(velocity, vUv - vec2(0.0, px.y)).y;
        float y1 = texture2D(velocity, vUv + vec2(0.0, px.y)).y;
        float divergence = (x1 - x0 + y1 - y0) * 0.5;
        gl_FragColor = vec4(divergence / dt);
      }
    `,L=`
      precision highp float;
      varying vec2 vUv;
      uniform vec2 force;
      uniform vec2 center;
      uniform vec2 scale;
      uniform vec2 px;

      void main() {
        vec2 circle = (vUv - 0.5) * 2.0;
        float d = 1.0 - min(length(circle), 1.0);
        d *= d;
        gl_FragColor = vec4(force * d, 0.0, 1.0);
      }
    `,H=`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D pressure;
      uniform sampler2D divergence;
      uniform vec2 px;

      void main() {
        float p0 = texture2D(pressure, vUv + vec2(px.x * 2.0, 0.0)).r;
        float p1 = texture2D(pressure, vUv - vec2(px.x * 2.0, 0.0)).r;
        float p2 = texture2D(pressure, vUv + vec2(0.0, px.y * 2.0)).r;
        float p3 = texture2D(pressure, vUv - vec2(0.0, px.y * 2.0)).r;
        float div = texture2D(divergence, vUv).r;
        float newP = (p0 + p1 + p2 + p3) / 4.0 - div;
        gl_FragColor = vec4(newP);
      }
    `,X=`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D pressure;
      uniform sampler2D velocity;
      uniform vec2 px;
      uniform float dt;

      void main() {
        float step = 1.0;
        float p0 = texture2D(pressure, vUv + vec2(px.x * step, 0.0)).r;
        float p1 = texture2D(pressure, vUv - vec2(px.x * step, 0.0)).r;
        float p2 = texture2D(pressure, vUv + vec2(0.0, px.y * step)).r;
        float p3 = texture2D(pressure, vUv - vec2(0.0, px.y * step)).r;
        vec2 v = texture2D(velocity, vUv).xy;
        vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5;
        v = v - gradP * dt;
        gl_FragColor = vec4(v, 0.0, 1.0);
      }
    `,O=`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D velocity;
      uniform sampler2D velocity_new;
      uniform float v;
      uniform vec2 px;
      uniform float dt;

      void main() {
        vec2 old = texture2D(velocity, vUv).xy;
        vec2 new0 = texture2D(velocity_new, vUv + vec2(px.x * 2.0, 0.0)).xy;
        vec2 new1 = texture2D(velocity_new, vUv - vec2(px.x * 2.0, 0.0)).xy;
        vec2 new2 = texture2D(velocity_new, vUv + vec2(0.0, px.y * 2.0)).xy;
        vec2 new3 = texture2D(velocity_new, vUv - vec2(0.0, px.y * 2.0)).xy;
        vec2 newv = 4.0 * old + v * dt * (new0 + new1 + new2 + new3);
        newv /= 4.0 * (1.0 + v * dt);
        gl_FragColor = vec4(newv, 0.0, 0.0);
      }
    `,$=`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D tDye;
      uniform sampler2D tVelocity;
      uniform float dt;
      uniform vec2 fboSize;
      uniform float dissipation;

      void main() {
        vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
        vec2 vel = texture2D(tVelocity, vUv).xy;
        vec2 coord = vUv - vel * dt * ratio;
        vec4 dye = texture2D(tDye, coord);
        dye *= dissipation;
        gl_FragColor = dye;
      }
    `,q=`
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D tDye;
      uniform vec2 center;
      uniform float radius;
      uniform float strength;

      void main() {
        vec4 base = texture2D(tDye, vUv);

        float dist = length(vUv - center);
        float r = radius;
        float falloff = exp(- (dist * dist) / (r * r + 1e-6));

        float added = strength * falloff;
        float v = clamp(base.r + added, 0.0, 1.0);

        gl_FragColor = vec4(v, v, v, 1.0);
      }
    `,W=`
      precision highp float;
      varying vec2 vUv;

      uniform sampler2D frontTex;
      uniform sampler2D backTex;
      uniform sampler2D tDye;

      uniform float revealStrength;
      uniform float revealSoftness;

      uniform vec2 frontTexResolution;
      uniform vec2 backTexResolution;
      uniform vec2 canvasResolution;

      vec2 getCoverUv(vec2 uv, vec2 texRes, vec2 canvasRes) {
        vec2 ratio = vec2(
          min((canvasRes.x / canvasRes.y) / (texRes.x / texRes.y), 1.0),
          min((canvasRes.y / canvasRes.x) / (texRes.y / texRes.x), 1.0)
        );

        vec2 newUv = vec2(
          uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
          uv.y * ratio.y + (1.0 - ratio.y) * 0.5
        );

        return newUv;
      }

      void main() {
        float dye = texture2D(tDye, vUv).r;

        float m = dye * revealStrength;
        float mask = smoothstep(0.0, revealSoftness, m);
        mask = clamp(mask, 0.0, 1.0);

        vec2 frontUv = getCoverUv(vUv, frontTexResolution, canvasResolution);
        vec2 backUv = getCoverUv(vUv, backTexResolution, canvasResolution);

        vec4 front = texture2D(frontTex, frontUv);
        vec4 back = texture2D(backTex, backUv);

        vec4 color = mix(front, back, mask);
        float alpha = max(color.a, max(front.a, back.a));

        gl_FragColor = vec4(color.rgb, alpha);
      }
    `;class Q{constructor(e){this.scene=null,this.camera=null,this.material=null,this.geometry=null,this.plane=null,this.props=e||{},this.uniforms=this.props.material?.uniforms}init(){this.scene=new u.Z58,this.camera=new u.i7d,this.uniforms&&(this.material=new u.D$Q(this.props.material),this.geometry=new u.bdM(2,2),this.plane=new u.eaF(this.geometry,this.material),this.scene.add(this.plane))}update(){C.renderer&&this.scene&&this.camera&&(C.renderer.setRenderTarget(this.props.output||null),C.renderer.render(this.scene,this.camera),C.renderer.setRenderTarget(null))}}class Z extends Q{constructor(e){super({material:{vertexShader:B,fragmentShader:V,uniforms:{boundarySpace:{value:e.cellScale},px:{value:e.cellScale},fboSize:{value:e.fboSize},velocity:{value:e.src.texture},dt:{value:e.dt},isBFECC:{value:!0}}},output:e.dst}),this.uniforms=this.props.material.uniforms,this.init()}update(e){e?this.uniforms&&("number"==typeof e.dt&&(this.uniforms.dt.value=e.dt),"boolean"==typeof e.BFECC&&(this.uniforms.isBFECC.value=e.BFECC),super.update()):super.update()}}class G extends Q{constructor(e){super({output:e.dst}),this.init(e)}init(e){this.scene=new u.Z58,this.camera=new u.i7d;let t=new u.bdM(1,1),i=new u.D$Q({vertexShader:Y,fragmentShader:L,blending:u.EZo,depthWrite:!1,uniforms:{px:{value:e.cellScale},force:{value:new u.I9Y(0,0)},center:{value:new u.I9Y(0,0)},scale:{value:new u.I9Y(e.cursor_size,e.cursor_size)}}});this.mouseMesh=new u.eaF(t,i),this.scene.add(this.mouseMesh)}update(e){if(!e)return;let t=this.mouseMesh.material.uniforms,i=e.mouse_force||20,s=e.cellScale||new u.I9Y,r=e.cursor_size||100,o=A.diff.x/2*i,n=A.diff.y/2*i,a=r*s.x,l=r*s.y,c=Math.min(Math.max(A.coords.x,-1+a+2*s.x),1-a-2*s.x),h=Math.min(Math.max(A.coords.y,-1+l+2*s.y),1-l-2*s.y);t.force.value.set(o,n),t.center.value.set(c,h),t.scale.value.set(r,r),super.update()}}class J extends Q{constructor(e){super({material:{vertexShader:B,fragmentShader:O,uniforms:{boundarySpace:{value:e.boundarySpace},velocity:{value:e.src.texture},velocity_new:{value:e.dst_.texture},v:{value:e.viscous},px:{value:e.cellScale},dt:{value:e.dt}}},output:e.dst,output0:e.dst_,output1:e.dst}),this.init()}update(e){if(!e)return null;if(!this.uniforms)return;let t=e.viscous??30,i=e.iterations??32,s=e.dt??.014;this.uniforms.v.value=t;let r=null,o=null;for(let e=0;e<i;e++)e%2==0?(r=this.props.output0,o=this.props.output1):(r=this.props.output1,o=this.props.output0),r&&(this.uniforms.velocity_new.value=r.texture,this.props.output=o,this.uniforms.dt.value=s,super.update());return o}}class K extends Q{constructor(e){super({material:{vertexShader:B,fragmentShader:N,uniforms:{boundarySpace:{value:e.boundarySpace},velocity:{value:e.src.texture},px:{value:e.cellScale},dt:{value:e.dt}}},output:e.dst}),this.init()}update(e){e&&e.vel&&(this.uniforms&&(this.uniforms.velocity.value=e.vel.texture),super.update())}}class ee extends Q{constructor(e){super({material:{vertexShader:B,fragmentShader:H,uniforms:{boundarySpace:{value:e.boundarySpace},pressure:{value:e.dst_.texture},divergence:{value:e.src.texture},px:{value:e.cellScale}}},output:e.dst,output0:e.dst_,output1:e.dst}),this.init()}update(e){let t,i;if(!e)return null;let s=e.iterations??32;t=this.props.output0,i=this.props.output1;for(let e=0;e<s;e++)e%2==0?(t=this.props.output0,i=this.props.output1):(t=this.props.output1,i=this.props.output0),t&&(this.uniforms&&(this.uniforms.pressure.value=t.texture),this.props.output=i,super.update());return i||null}}class et extends Q{constructor(e){super({material:{vertexShader:B,fragmentShader:X,uniforms:{boundarySpace:{value:e.boundarySpace},pressure:{value:e.src_p.texture},velocity:{value:e.src_v.texture},px:{value:e.cellScale},dt:{value:e.dt}}},output:e.dst}),this.init()}update(e){e&&e.vel&&e.pressure&&(this.uniforms&&(this.uniforms.velocity.value=e.vel.texture,this.uniforms.pressure.value=e.pressure.texture),super.update())}}class ei extends Q{constructor(e){super({material:{vertexShader:B,fragmentShader:$,uniforms:{boundarySpace:{value:e.cellScale},tDye:{value:e.src.texture},tVelocity:{value:e.velocity.texture},dt:{value:e.dt},fboSize:{value:e.fboSize},dissipation:{value:e.dissipation}}},output:e.dst}),this.init()}update(e){e&&e.src&&e.velocity&&this.uniforms&&(this.uniforms.tDye.value=e.src.texture,this.uniforms.tVelocity.value=e.velocity.texture,this.uniforms.dt.value=e.dt,this.uniforms.dissipation.value=e.dissipation,super.update())}}class es extends Q{constructor(e){super({material:{vertexShader:B,fragmentShader:q,uniforms:{boundarySpace:{value:e.cellScale},tDye:{value:e.src.texture},center:{value:new u.I9Y(.5,.5)},radius:{value:e.radius},strength:{value:e.strength}}},output:e.dst}),this.init()}update(e){if(!e||!e.src||!this.uniforms)return;let t=this.uniforms;t.tDye.value=e.src.texture;let i=new u.I9Y((A.coords.x+1)*.5,(A.coords.y+1)*.5);t.center.value.copy(i),t.radius.value=e.radius,t.strength.value=e.strength,super.update()}}class er{constructor(e){this.fbos={vel_0:null,vel_1:null,vel_viscous0:null,vel_viscous1:null,div:null,pressure_0:null,pressure_1:null,dye_0:null,dye_1:null},this.fboSize=new u.I9Y,this.cellScale=new u.I9Y,this.boundarySpace=new u.I9Y,this.dyeDissipation=.985,this.options={iterations_poisson:v,iterations_viscous:h,mouse_force:i,resolution:n,cursor_size:o,viscous:c,isBounce:m,dt:d,isViscous:l,BFECC:p,...e},this.init()}getFloatType(){return/(iPad|iPhone|iPod)/i.test(navigator.userAgent)?u.ix0:u.RQf}calcSize(){let e=Math.max(1,Math.round(this.options.resolution*C.width)),t=Math.max(1,Math.round(this.options.resolution*C.height));this.cellScale.set(1/e,1/t),this.fboSize.set(e,t)}createAllFBO(){let e={type:this.getFloatType(),depthBuffer:!1,stencilBuffer:!1,minFilter:u.k6q,magFilter:u.k6q,wrapS:u.ghU,wrapT:u.ghU};for(let t of Object.keys(this.fbos))this.fbos[t]=new u.nWS(this.fboSize.x,this.fboSize.y,e)}createShaderPasses(){this.advection=new Z({cellScale:this.cellScale,fboSize:this.fboSize,dt:this.options.dt,src:this.fbos.vel_0,dst:this.fbos.vel_1}),this.externalForce=new G({cellScale:this.cellScale,cursor_size:this.options.cursor_size,dst:this.fbos.vel_1}),this.viscousPass=new J({cellScale:this.cellScale,boundarySpace:this.boundarySpace,viscous:this.options.viscous,src:this.fbos.vel_1,dst:this.fbos.vel_viscous1,dst_:this.fbos.vel_viscous0,dt:this.options.dt}),this.divergence=new K({cellScale:this.cellScale,boundarySpace:this.boundarySpace,src:this.fbos.vel_viscous0,dst:this.fbos.div,dt:this.options.dt}),this.poisson=new ee({cellScale:this.cellScale,boundarySpace:this.boundarySpace,src:this.fbos.div,dst:this.fbos.pressure_1,dst_:this.fbos.pressure_0}),this.pressure=new et({cellScale:this.cellScale,boundarySpace:this.boundarySpace,src_p:this.fbos.pressure_0,src_v:this.fbos.vel_viscous0,dst:this.fbos.vel_0,dt:this.options.dt}),this.dyeAdvection=new ei({cellScale:this.cellScale,src:this.fbos.dye_0,velocity:this.fbos.vel_0,dt:this.options.dt,fboSize:this.fboSize,dissipation:this.dyeDissipation,dst:this.fbos.dye_1}),this.dyeSplat=new es({cellScale:this.cellScale,src:this.fbos.dye_1,radius:.25,strength:1,dst:this.fbos.dye_0})}init(){this.calcSize(),this.createAllFBO(),this.createShaderPasses()}resize(){for(let e of(this.calcSize(),Object.keys(this.fbos)))this.fbos[e].setSize(this.fboSize.x,this.fboSize.y)}update(){this.options.isBounce?this.boundarySpace.set(0,0):this.boundarySpace.copy(this.cellScale),this.advection.update({dt:this.options.dt,BFECC:this.options.BFECC}),this.externalForce.update({mouse_force:this.options.mouse_force,cellScale:this.cellScale,cursor_size:this.options.cursor_size});let e=this.fbos.vel_1;this.options.isViscous&&(e=this.viscousPass.update({viscous:this.options.viscous,iterations:this.options.iterations_viscous,dt:this.options.dt})),this.divergence.update({vel:e||this.fbos.vel_1});let t=this.poisson.update({iterations:this.options.iterations_poisson});this.pressure.update({vel:e||this.fbos.vel_1,pressure:t||this.fbos.pressure_0}),this.dyeAdvection.update({src:this.fbos.dye_0,velocity:this.fbos.vel_0,dt:this.options.dt,dissipation:this.dyeDissipation});let i=A.diff.length(),s=.3*u.cj9.clamp(1.8*i,.4,3);this.dyeSplat.update({src:this.fbos.dye_1,radius:o/120*.08,strength:s,cellScale:this.cellScale})}}class eo{constructor(e,t){this.simulation=new er,this.scene=new u.Z58,this.camera=new u.i7d,this.uniforms={frontTex:{value:e},backTex:{value:t},tDye:{value:this.simulation.fbos.dye_0.texture},boundarySpace:{value:new u.I9Y},revealStrength:{value:w},revealSoftness:{value:_},frontTexResolution:{value:new u.I9Y(e.image?.width||e.source?.data?.width||1,e.image?.height||e.source?.data?.height||1)},backTexResolution:{value:new u.I9Y(t.image?.width||t.source?.data?.width||1,t.image?.height||t.source?.data?.height||1)},canvasResolution:{value:new u.I9Y(C.width,C.height)}};const i=new u.D$Q({vertexShader:B,fragmentShader:W,transparent:!0,depthWrite:!1,uniforms:this.uniforms});this.mesh=new u.eaF(new u.bdM(2,2),i),this.scene.add(this.mesh)}resize(){this.simulation.resize(),this.uniforms.canvasResolution.value.set(C.width,C.height)}update(){this.simulation.update()}render(){C.renderer&&(C.renderer.setRenderTarget(null),C.renderer.render(this.scene,this.camera))}}class en{constructor(e){this.lastUserInteraction=performance.now()-1e4,this.running=!1,this._loop=this.loop.bind(this),this._resize=this.resize.bind(this),this.props=e,C.init(e.$wrapper),A.init(e.$wrapper),A.autoIntensity=x,A.takeoverDuration=g,A.onInteract=()=>{this.lastUserInteraction=performance.now(),this.autoDriver&&this.autoDriver.forceStop()},this.init(),window.addEventListener("resize",this._resize),this._onVisibility=()=>{document.hidden?this.pause():F.current&&this.start()},document.addEventListener("visibilitychange",this._onVisibility)}init(){if(C.renderer){if(this.props.$wrapper.prepend(C.renderer.domElement),this.output=new eo(this.props.frontTex,this.props.backTex),this.autoDriver=new P(A,this,{enabled:f,speed:y,resumeDelay:b,rampDuration:S}),this.autoDriver&&this.autoDriver.enabled)for(let e=0;e<3;e++)this.autoDriver.update(),A.update(),this.output.update();this.start()}}resize(){C.resize(),this.output.resize()}render(){this.autoDriver&&this.autoDriver.update(),A.update(),C.update(),this.output.update(),this.output.render()}loop(){this.running&&(this.render(),R.current=requestAnimationFrame(this._loop))}start(){this.running||(this.running=!0,this._loop())}pause(){this.running=!1,null!=R.current&&(cancelAnimationFrame(R.current),R.current=null)}dispose(){try{if(window.removeEventListener("resize",this._resize),this._onVisibility&&document.removeEventListener("visibilitychange",this._onVisibility),A.dispose(),C.renderer){let e=C.renderer.domElement;e&&e.parentNode&&e.parentNode.removeChild(e),C.renderer.dispose()}this.output.mesh.geometry.dispose(),this.output.mesh.material.dispose()}catch{}}}s.style.position=s.style.position||"relative",s.style.overflow=s.style.overflow||"hidden";let ea=new u.Tap;ea.crossOrigin="anonymous";let eu=e=>new Promise((t,i)=>{ea.load(e,e=>{e.wrapS=u.ghU,e.wrapT=u.ghU,e.minFilter=u.k6q,e.magFilter=u.k6q,t(e)},void 0,e=>i(e))});return(async()=>{try{let[i,o]=await Promise.all([eu(e),eu(t)]);if(r){i.dispose(),o.dispose();return}E.current=i,M.current=o;let n=new en({$wrapper:s,frontTex:i,backTex:o});n.start(),U.current=n;let a=new IntersectionObserver(e=>{let t=e[0],i=t.isIntersecting&&t.intersectionRatio>0;F.current=i,U.current&&(i&&!document.hidden?U.current.start():U.current.pause())},{threshold:[0,.01,.1]});a.observe(s),z.current=a;let u=new ResizeObserver(()=>{U.current&&(I.current&&cancelAnimationFrame(I.current),I.current=requestAnimationFrame(()=>{U.current&&U.current.resize()}))});u.observe(s),k.current=u}catch{}})(),()=>{if(r=!0,null!=R.current&&cancelAnimationFrame(R.current),k.current)try{k.current.disconnect()}catch{}if(z.current)try{z.current.disconnect()}catch{}U.current&&U.current.dispose(),U.current=null,E.current&&(E.current.dispose(),E.current=null),M.current&&(M.current.dispose(),M.current=null)}},[e,t,i,o,n,l,c,h,v,d,p,m,f,y,x,g,b,S,w,_]),(0,s.jsx)("div",{ref:T,className:`relative w-full h-full overflow-hidden ${C||""}`,style:D})},c=()=>{let[e,t]=(0,n.I)(),[i,a]=(0,r.useState)(50),[u,c]=(0,r.useState)(250),[h,v]=(0,r.useState)(.5),[d,p]=(0,r.useState)(!0),[m,f]=(0,r.useState)(30),[y]=(0,r.useState)(24),[x]=(0,r.useState)(28),[g]=(0,r.useState)(.014),[b,S]=(0,r.useState)(!0),[w,_]=(0,r.useState)(!1),[D,C]=(0,r.useState)(!0),[T,U]=(0,r.useState)(.55),[k,z]=(0,r.useState)(2.2),[R]=(0,r.useState)(.25),[I]=(0,r.useState)(1200),[F]=(0,r.useState)(.6),[E,M]=(0,r.useState)(.75),[j,A]=(0,r.useState)(1);return(0,s.jsxs)("div",{children:[(0,s.jsx)(o.Bg,{}),(0,s.jsxs)(o.VX,{children:[(0,s.jsxs)(o.Ec,{children:[(0,s.jsx)(o.Ch,{minHeight:600,onRefresh:t,children:(0,s.jsx)("div",{className:"w-full h-full p-4 rounded-2xl overflow-hidden",role:"img","aria-label":"A feathered metal helmet gives way to the portrait beneath as you move the pointer",children:(0,s.jsx)(l,{className:"rounded-md brightness-125",frontImage:"/images/over.webp",backImage:"/images/under.webp",mouseForce:i,cursorSize:u,resolution:h,isViscous:d,viscous:m,iterationsViscous:y,iterationsPoisson:x,dt:g,BFECC:b,isBounce:w,autoDemo:D,autoSpeed:T,autoIntensity:k,takeoverDuration:R,autoResumeDelay:I,autoRampDuration:F,revealStrength:E,revealSoftness:j},e)})}),(0,s.jsxs)(o.IH,{children:[(0,s.jsx)(o.yt,{title:"Mouse Force",value:i,onChange:a,min:0,max:100,step:1}),(0,s.jsx)(o.yt,{title:"Cursor Size",value:u,onChange:c,min:50,max:300,step:10}),(0,s.jsx)(o.yt,{title:"Resolution",value:h,onChange:v,min:.25,max:1,step:.05}),(0,s.jsx)(o.yt,{title:"Reveal Strength",value:E,onChange:M,min:0,max:10,step:.1}),(0,s.jsx)(o.yt,{title:"Reveal Softness",value:j,onChange:A,min:0,max:2,step:.05}),(0,s.jsx)(o.tl,{title:"Auto Demo",checked:D,onChange:C}),(0,s.jsx)(o.yt,{title:"Auto Speed",value:T,onChange:U,min:.1,max:2,step:.05}),(0,s.jsx)(o.yt,{title:"Auto Intensity",value:k,onChange:z,min:.5,max:5,step:.1}),(0,s.jsx)(o.tl,{title:"Viscous",checked:d,onChange:p}),(0,s.jsx)(o.yt,{title:"Viscous Strength",value:m,onChange:f,min:0,max:100,step:5}),(0,s.jsx)(o.tl,{title:"BFECC Advection",checked:b,onChange:S}),(0,s.jsx)(o.tl,{title:"Boundary Bounce",checked:w,onChange:_})]}),(0,s.jsx)(o.Ub,{data:[{name:"frontImage",type:"string",default:'""',description:"URL of the front (covering) image texture"},{name:"backImage",type:"string",default:'""',description:"URL of the back (revealed) image texture"},{name:"mouseForce",type:"number",default:"50",description:"Strength of fluid impulse from mouse/touch interactions"},{name:"cursorSize",type:"number",default:"250",description:"Effective radius of the cursor interaction area"},{name:"resolution",type:"number",default:"0.5",description:"Simulation resolution multiplier (0.25-1.0, lower = better performance)"},{name:"isViscous",type:"boolean",default:"true",description:"Enable viscosity in the fluid simulation"},{name:"viscous",type:"number",default:"30",description:"Viscosity strength (higher = thicker fluid)"},{name:"iterationsViscous",type:"number",default:"24",description:"Number of viscosity solver iterations (higher = more accurate)"},{name:"iterationsPoisson",type:"number",default:"28",description:"Number of pressure solver iterations (higher = more accurate)"},{name:"dt",type:"number",default:"0.014",description:"Time delta for simulation step (lower = more stable)"},{name:"BFECC",type:"boolean",default:"true",description:"Enable BFECC advection (higher quality, slightly slower)"},{name:"isBounce",type:"boolean",default:"false",description:"Enable boundary bounce behavior"},{name:"autoDemo",type:"boolean",default:"true",description:"Enable automatic motion when idle"},{name:"autoSpeed",type:"number",default:"0.55",description:"Speed of automatic cursor movement"},{name:"autoIntensity",type:"number",default:"2.2",description:"Intensity multiplier for automatic interactions"},{name:"takeoverDuration",type:"number",default:"0.25",description:"Transition time when user takes control (seconds)"},{name:"autoResumeDelay",type:"number",default:"1200",description:"Delay before auto-demo resumes after user interaction (ms)"},{name:"autoRampDuration",type:"number",default:"0.6",description:"Ramp-up time when auto-demo resumes (seconds)"},{name:"revealStrength",type:"number",default:"0.75",description:"How strongly the dye field controls the reveal effect"},{name:"revealSoftness",type:"number",default:"1",description:"Softness of the reveal edge transition"},{name:"style",type:"React.CSSProperties",default:"undefined",description:"Inline styles applied to the container"},{name:"className",type:"string",default:'""',description:"Additional CSS classes for the container"}]}),(0,s.jsx)("p",{className:"text-sm text-muted-foreground mt-4 mb-16",children:"Demo image by Alex Suprun @ unsplash.com, not part of the React Bits Pro offer."})]}),(0,s.jsx)(o.lT,{children:(0,s.jsx)(o.Gv,{})})]})]})}},90761:(e,t,i)=>{i.d(t,{I:()=>r});var s=i(12115);function r(){let[e,t]=(0,s.useState)(0),i=(0,s.useCallback)(()=>{t(e=>e+1)},[]);return(0,s.useEffect)(()=>{let e=new MutationObserver(()=>{i()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[i]),[e,i]}}}]);