(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[13430],{13430:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>d});var n=r(95155),a=r(12115),i=r(56388),l=r(45949),o=r(90761),s=r(21211),c=r.n(s),u=r(90650);let p=({rows:e=[["/demo-media/portrait-sienna.webp","/demo-media/portrait-indigo.webp"],["/demo-media/portrait-olive.webp","/demo-media/portrait-silver.webp","/demo-media/portrait-ochre.webp"],["/demo-media/portrait-rose.webp","/demo-media/portrait-teal.webp","/demo-media/portrait-pearl.webp","/demo-media/portrait-sienna.webp"]],circleSize:t=64,baseRadius:r=120,orbitGap:i=100,rotationDuration:l=20,rowDelay:o=.5,direction:s="clockwise",alternateDirection:p=!1,fadeMode:h="none",fadeBlur:d=!1,showPaths:g=!0,animate:m=!0,animationDuration:f=.6,animationStagger:b=.15,staggerScaleFactor:y=0,className:$})=>{let x=(0,a.useMemo)(()=>e.map(e=>[...e]),[e]),v=(r+(x.length-1)*i+t)*2;return(0,n.jsxs)("div",{style:{width:`${v}px`,height:`${v}px`,animation:m?"circles-container-fade-in 0.8s ease-out":void 0},className:c().dynamic([["32176ae4e8456b31",[x.map((e,t)=>`
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:""};
            }
            60% {
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
            100% {
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
          }
        `).join("\n")]]])+" "+((0,u.cn)("relative",$)||""),children:[(0,n.jsxs)("div",{className:c().dynamic([["32176ae4e8456b31",[x.map((e,t)=>`
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:""};
            }
            60% {
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
            100% {
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
          }
        `).join("\n")]]])+" absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",children:[g&&(0,n.jsx)("svg",{style:{width:`${v}px`,height:`${v}px`,transform:"translate(-50%, -50%)"},className:c().dynamic([["32176ae4e8456b31",[x.map((e,t)=>`
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:""};
            }
            60% {
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
            100% {
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
          }
        `).join("\n")]]])+" absolute left-1/2 top-1/2 pointer-events-none",children:x.map((e,t)=>(0,n.jsx)("circle",{cx:"50%",cy:"50%",r:r+t*i,fill:"none",stroke:"currentColor",strokeWidth:"2",strokeDasharray:"8 8",style:{opacity:.5,animation:m?`circles-path-entrance ${f}s ease-out ${t*b}s backwards`:void 0},className:c().dynamic([["32176ae4e8456b31",[x.map((e,t)=>`
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:""};
            }
            60% {
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
            100% {
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
          }
        `).join("\n")]]])+" stroke-gray-300 dark:stroke-gray-700"},t))}),x.map((e,a)=>{let u=r+a*i,g=l+a*o,$=s;p&&a%2==1&&($="clockwise"===s?"counterclockwise":"clockwise");let v="clockwise"===$?"normal":"reverse";return(0,n.jsx)("ul",{style:{width:`${2*u}px`,height:`${2*u}px`,transform:"translate(-50%, -50%)",animation:`circles-orbit-${a} ${g}s linear infinite ${v}`},className:c().dynamic([["32176ae4e8456b31",[x.map((e,t)=>`
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:""};
            }
            60% {
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
            100% {
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
          }
        `).join("\n")]]])+" absolute left-1/2 top-1/2 list-none p-0 m-0 rounded-full",children:e.map((r,i)=>{let l=(360/e.length*i-90)%360,o=t*(1+a*y);return(0,n.jsx)("li",{style:{width:`${o}px`,height:`${o}px`,margin:`-${o/2}px`,transform:`rotate(${l}deg) translateX(${u}px)`,"--item-angle":`${l}deg`,"--entrance-delay":`${a*b}s`,"--target-opacity":"in"===h?.2+a/(x.length-1)*.8:"out"===h?.2+(x.length-a-1)/(x.length-1)*.8:1,"--target-blur":d&&"none"!==h?"in"===h?`${(x.length-a-1)/(x.length-1)*8}px`:`${a/(x.length-1)*8}px`:"0px"},className:c().dynamic([["32176ae4e8456b31",[x.map((e,t)=>`
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:""};
            }
            60% {
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
            100% {
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
          }
        `).join("\n")]]])+" absolute block left-1/2 top-1/2",children:(0,n.jsx)("div",{style:{animation:m?`circles-entrance-${a} ${f}s cubic-bezier(0.34, 1.56, 0.64, 1) ${a*b}s both, circles-counter-orbit-${a} ${g}s linear infinite ${a*b}s ${v}`:`circles-counter-orbit-${a} ${g}s linear infinite ${v}`},className:c().dynamic([["32176ae4e8456b31",[x.map((e,t)=>`
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:""};
            }
            60% {
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
            100% {
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
          }
        `).join("\n")]]])+" w-full h-full rounded-full overflow-hidden shadow-lg border-2 border-white dark:border-gray-800",children:(0,n.jsx)("img",{src:r,alt:`Circle ${a}-${i}`,loading:"lazy",className:c().dynamic([["32176ae4e8456b31",[x.map((e,t)=>`
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:""};
            }
            60% {
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
            100% {
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
          }
        `).join("\n")]]])+" w-full h-full object-cover"})})},i)})},a)})]}),(0,n.jsx)(c(),{id:"32176ae4e8456b31",dynamic:[x.map((e,t)=>`
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:""};
            }
            60% {
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
            100% {
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
          }
        `).join("\n")],children:`@keyframes circles-container-fade-in{0%{opacity:0}100%{opacity:1}}@keyframes circles-path-entrance{0%{opacity:0;stroke-dashoffset:100}100%{opacity:.5;stroke-dashoffset:0}}${x.map((e,t)=>`
          @keyframes circles-orbit-${t} {
            from {
              transform: translate(-50%, -50%) rotate(0deg);
            }
            to {
              transform: translate(-50%, -50%) rotate(360deg);
            }
          }

          @keyframes circles-counter-orbit-${t} {
            0% {
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
            100% {
              transform: rotate(calc(-1 * var(--item-angle) - 360deg)) scale(1);
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"none"};
            }
          }

          @keyframes circles-entrance-${t} {
            0% {
              opacity: 0;
              transform: rotate(calc(-1 * var(--item-angle))) scale(0.6);
              filter: blur(10px) ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:""};
            }
            60% {
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
            100% {
              opacity: ${"in"===h?.2+t/(x.length-1)*.8:"out"===h?.2+(x.length-t-1)/(x.length-1)*.8:1};
              transform: rotate(calc(-1 * var(--item-angle))) scale(1);
              filter: ${d&&"none"!==h?"in"===h?`blur(${(x.length-t-1)/(x.length-1)*8}px)`:`blur(${t/(x.length-1)*8}px)`:"blur(0px)"};
            }
          }
        `).join("\n")}
      `})]})};p.displayName="Circles";let h=[6,9,15,15,15].map((e,t)=>Array.from({length:e},(e,r)=>l.xb[(r+t)%l.xb.length])),d=()=>{let[e,t]=(0,o.I)(),[r,l]=(0,a.useState)(64),[s,c]=(0,a.useState)(120),[u,d]=(0,a.useState)(100),[g,m]=(0,a.useState)(20),[f,b]=(0,a.useState)(.5),[y,$]=(0,a.useState)("clockwise"),[x,v]=(0,a.useState)(!0),[w,S]=(0,a.useState)("out"),[_,k]=(0,a.useState)(!0),[j,C]=(0,a.useState)(!0),[R,F]=(0,a.useState)(!0),[z,T]=(0,a.useState)(.6),[N,O]=(0,a.useState)(.15),[A,P]=(0,a.useState)(0);return(0,n.jsxs)("div",{children:[(0,n.jsx)(i.Bg,{}),(0,n.jsxs)(i.VX,{children:[(0,n.jsxs)(i.Ec,{children:[(0,n.jsx)(i.Ch,{onRefresh:t,minHeight:600,children:(0,n.jsx)(p,{rows:h,circleSize:r,baseRadius:s,orbitGap:u,rotationDuration:g,rowDelay:f,direction:y,alternateDirection:x,fadeMode:w,fadeBlur:_,showPaths:j,animate:R,animationDuration:z,animationStagger:N,staggerScaleFactor:A},e)}),(0,n.jsxs)(i.IH,{children:[(0,n.jsx)(i.yt,{title:"Circle Size",value:r,onChange:e=>{l(e),t()},min:32,max:128,step:8}),(0,n.jsx)(i.yt,{title:"Base Radius",value:s,onChange:e=>{c(e),t()},min:60,max:300,step:10}),(0,n.jsx)(i.yt,{title:"Orbit Gap",value:u,onChange:e=>{d(e),t()},min:50,max:200,step:10}),(0,n.jsx)(i.yt,{title:"Stagger Scale Factor",value:A,onChange:e=>{P(e),t()},min:-.3,max:.3,step:.05}),(0,n.jsx)(i.tl,{title:"Show Paths",checked:j,onChange:e=>{C(e),t()}}),(0,n.jsx)(i.yt,{title:"Rotation Duration (s)",value:g,onChange:e=>{m(e),t()},min:5,max:60,step:5}),(0,n.jsx)(i.yt,{title:"Row Delay (s)",value:f,onChange:e=>{b(e),t()},min:0,max:2,step:.1}),(0,n.jsx)(i.bg,{title:"Direction",value:y,onChange:e=>{$(e),t()},options:[{label:"Clockwise",value:"clockwise"},{label:"Counterclockwise",value:"counterclockwise"}]}),(0,n.jsx)(i.tl,{title:"Alternate Direction",checked:x,onChange:e=>{v(e),t()}}),(0,n.jsx)(i.bg,{title:"Fade Mode",value:w,onChange:e=>{S(e),t()},options:[{label:"None",value:"none"},{label:"Fade In",value:"in"},{label:"Fade Out",value:"out"}]}),(0,n.jsx)(i.tl,{title:"Fade Blur",checked:_,onChange:e=>{k(e),t()}}),(0,n.jsx)(i.tl,{title:"Entrance Animation",checked:R,onChange:e=>{F(e),t()}}),(0,n.jsx)(i.yt,{title:"Animation Duration (s)",value:z,onChange:e=>{T(e),t()},min:.2,max:2,step:.1}),(0,n.jsx)(i.yt,{title:"Animation Stagger (s)",value:N,onChange:e=>{O(e),t()},min:0,max:.5,step:.05})]}),(0,n.jsx)(i.Ub,{data:[{name:"rows",type:"string[][]",default:"[[...], [...], [...]]",description:"Array of rows, where each row is an array of image URLs. Each row creates a concentric orbit ring with evenly distributed circles."},{name:"circleSize",type:"number",default:"64",description:"Size of each circle/image in pixels"},{name:"baseRadius",type:"number",default:"120",description:"Base radius for the innermost orbit ring in pixels"},{name:"orbitGap",type:"number",default:"100",description:"Gap between each concentric orbit ring in pixels"},{name:"rotationDuration",type:"number",default:"20",description:"Duration of one complete rotation in seconds for the first ring"},{name:"rowDelay",type:"number",default:"0.5",description:"Additional duration added to each subsequent ring's rotation (creates staggered speed)"},{name:"direction",type:'"clockwise" | "counterclockwise"',default:'"clockwise"',description:"Direction of rotation for the orbiting circles"},{name:"alternateDirection",type:"boolean",default:"false",description:"If true, alternates direction for each row (odd rows go opposite direction)"},{name:"fadeMode",type:'"in" | "out" | "none"',default:'"none"',description:"Fade mode for rows. 'in' fades from outside to inside, 'out' fades from inside to outside, 'none' disables fading"},{name:"fadeBlur",type:"boolean",default:"false",description:"Apply incremental blur along with fade effect for more depth"},{name:"showPaths",type:"boolean",default:"true",description:"Whether to show dashed orbital path rings"},{name:"animate",type:"boolean",default:"true",description:"Enable entrance animation on mount with scale and fade"},{name:"animationDuration",type:"number",default:"0.6",description:"Duration of entrance animation in seconds"},{name:"animationStagger",type:"number",default:"0.15",description:"Stagger delay between each row's entrance animation in seconds"},{name:"staggerScaleFactor",type:"number",default:"0",description:"Scale factor for each additional row. Negative values shrink outer rows, positive values grow them. Example: 0.1 = 10% larger per row"},{name:"className",type:"string",default:'""',description:"Additional CSS classes for the container"}]})]}),(0,n.jsx)(i.lT,{children:(0,n.jsx)(i.Gv,{})})]})]})}},21211:(e,t,r)=>{"use strict";e.exports=r(72498).style},45949:(e,t,r)=>{"use strict";r.d(t,{PT:()=>n,ag:()=>l,iL:()=>a,ny:()=>i,xb:()=>o});let n={pinkEclipse:{src:"/demo-media/abstract-pink-eclipse.webp",title:"Pink eclipse",alt:"Coral-pink disc crossing a violet diagonal plane on a grainy purple field",category:"abstract"},orchidOrbit:{src:"/demo-media/abstract-orchid-orbit.webp",title:"Orchid orbit",alt:"Fuchsia ring and peach crescent on a grainy orchid-purple field",category:"abstract"},coralFold:{src:"/demo-media/abstract-coral-fold.webp",title:"Coral fold",alt:"Broad vermilion and orange folded plane over deep plum with fine grain",category:"abstract"},violetSteps:{src:"/demo-media/abstract-violet-steps.webp",title:"Violet steps",alt:"Three interlocking violet and pink stepped planes with an amber edge",category:"abstract"},roseBalance:{src:"/demo-media/abstract-rose-balance.webp",title:"Rose balance",alt:"Tilted raspberry rounded rectangle and tangerine disc on a rose-pink field",category:"abstract"},fuchsiaWave:{src:"/demo-media/abstract-fuchsia-wave.webp",title:"Fuchsia wave",alt:"Broad fuchsia S-shaped band with a coral gradient across deep plum",category:"abstract"},amberLoop:{src:"/demo-media/abstract-amber-loop.webp",title:"Amber loop",alt:"Tilted golden-amber loop on a grainy raspberry-purple field",category:"abstract"},plumRibbon:{src:"/demo-media/abstract-plum-ribbon.webp",title:"Plum ribbon",alt:"Intersecting pink and plum diagonal ribbons on a coral-magenta field",category:"abstract"},irisWindow:{src:"/demo-media/abstract-iris-window.webp",title:"Iris window",alt:"Pink rounded arch framing a warm orange gradient on an iris-purple field",category:"abstract"},citrusSignal:{src:"/demo-media/abstract-citrus-signal.webp",title:"Citrus signal",alt:"Citrus circle intersected by a hot-pink diagonal bar on saturated violet",category:"abstract"},rosePetal:{src:"/demo-media/abstract-rose-petal.webp",title:"Rose petal",alt:"Three overlapping raspberry, plum and coral semicircles on a grainy pink field",category:"abstract"},spectrum:{src:"/demo-media/abstract-spectrum.webp",title:"Spectrum",alt:"Offset violet and pink geometric discs cut by a warm apricot plane",category:"abstract"},spectrumShift:{src:"/demo-media/abstract-spectrum-shift.webp",title:"Spectrum shift",alt:"The same geometric discs and diagonal plane in a vivid coral and violet palette",category:"abstract"},loupeWaldo:{src:"/demo-media/effect-loupe-waldo.webp",title:"Where’s Waldo?",alt:"Where’s Waldo? illustrated crowd scene",category:"effect"},loupeGlass:{src:"/demo-media/effect-loupe-glass.webp",title:"Iridescent glass",alt:"Macro photograph of iridescent pink and violet glass with tiny air bubbles",category:"effect"},pondKoi:{src:"/demo-media/effect-pond-koi.webp",title:"Koi pond",alt:"Orange-and-black koi beneath green lily pads on a reflective pond",category:"effect"},emberPoppy:{src:"/demo-media/effect-ember-poppy.webp",title:"Ember poppy",alt:"Coral-orange poppy with detailed petals against deep wine",category:"effect"},emberDahlia:{src:"/demo-media/effect-ember-dahlia.webp",title:"Burgundy dahlia",alt:"Burgundy dahlia with pink-lit petal edges against dark plum",category:"effect"},emberIris:{src:"/demo-media/effect-ember-iris.webp",title:"Violet iris",alt:"Violet iris petals with a golden throat against deep wine",category:"effect"},portraitSienna:{src:"/demo-media/portrait-sienna.webp",title:"Sienna",alt:"Studio portrait of a woman in a burnt-orange top against warm limestone",category:"portrait"},portraitIndigo:{src:"/demo-media/portrait-indigo.webp",title:"Indigo",alt:"Studio portrait of a man in a cobalt jacket against a cool gray wall",category:"portrait"},portraitOlive:{src:"/demo-media/portrait-olive.webp",title:"Olive",alt:"Studio portrait of a woman in an olive shirt against cream plaster",category:"portrait"},portraitSilver:{src:"/demo-media/portrait-silver.webp",title:"Silver",alt:"Studio portrait of a gray-haired man in black against a silver-gray wall",category:"portrait"},portraitOchre:{src:"/demo-media/portrait-ochre.webp",title:"Ochre",alt:"Studio portrait of a curly-haired man in an ochre knit against cream",category:"portrait"},portraitRose:{src:"/demo-media/portrait-rose.webp",title:"Rose",alt:"Studio portrait of a red-haired woman in burgundy against pale rose",category:"portrait"},portraitTeal:{src:"/demo-media/portrait-teal.webp",title:"Teal",alt:"Studio portrait of a man with a shaved head in a teal jacket",category:"portrait"},portraitPearl:{src:"/demo-media/portrait-pearl.webp",title:"Pearl",alt:"Studio portrait of a long-haired woman in an ivory shirt",category:"portrait"}};n.pinkEclipse,n.orchidOrbit,n.coralFold,n.violetSteps,n.roseBalance,n.fuchsiaWave,n.amberLoop,n.plumRibbon,n.irisWindow,n.citrusSignal,n.rosePetal,n.spectrum,n.spectrumShift;let a=[n.pinkEclipse,n.amberLoop,n.orchidOrbit,n.fuchsiaWave,n.coralFold,n.roseBalance,n.violetSteps,n.plumRibbon],i=[n.portraitSienna,n.portraitIndigo,n.portraitOlive,n.portraitSilver,n.portraitOchre,n.portraitRose,n.portraitTeal,n.portraitPearl];n.loupeWaldo,n.loupeGlass;let l=a.map(({src:e})=>e),o=i.map(({src:e})=>e)},56388:(e,t,r)=>{"use strict";r.d(t,{Gv:()=>s.CodeExample,lT:()=>n.CodeTab,Bg:()=>c.ComponentHeader,i8:()=>p.CopyButton,IH:()=>i.Customize,gI:()=>g,Dn:()=>f,pi:()=>m,W7:()=>l.PreviewColor,Ch:()=>a.PreviewContainer,UD:()=>l.PreviewInput,bg:()=>l.PreviewSelect,yt:()=>l.PreviewSlider,tl:()=>l.PreviewSwitch,Ec:()=>n.PreviewTab,Ub:()=>o.PropTable,VX:()=>n.TabsLayout,bs:()=>d});var n=r(55019);r(27382);var a=r(10236),i=r(69485),l=r(48543),o=r(87552);r(39260);var s=r(52407),c=r(79901);r(24496);var u=r(95155);r(66729);var p=r(28592),h=r(90650);let d="rounded-lg border bg-background";function g({className:e,children:t,...r}){return(0,u.jsx)("div",{className:(0,h.cn)("rounded-xl border bg-muted/50 p-1",e),...r,children:t})}function m({className:e,children:t,...r}){return(0,u.jsx)("div",{className:(0,h.cn)(d,e),...r,children:t})}function f({title:e,description:t,className:r,children:n}){return(0,u.jsxs)("section",{className:r,children:[(0,u.jsx)("h2",{className:"text-xl font-semibold tracking-tight md:text-2xl",children:e}),t&&(0,u.jsx)("p",{className:"mt-1.5 text-sm text-muted-foreground",children:t}),(0,u.jsx)("div",{className:"mt-6",children:n})]})}},61626:()=>{},72498:(e,t,r)=>{"use strict";var n=r(52474);r(61626);var a=r(12115),i=a&&"object"==typeof a&&"default"in a?a:{default:a},l=void 0!==n&&n.env&&!0,o=function(e){return"[object String]"===Object.prototype.toString.call(e)},s=function(){function e(e){var t=void 0===e?{}:e,r=t.name,n=void 0===r?"stylesheet":r,a=t.optimizeForSpeed,i=void 0===a?l:a;c(o(n),"`name` must be a string"),this._name=n,this._deletedRulePlaceholder="#"+n+"-deleted-rule____{}",c("boolean"==typeof i,"`optimizeForSpeed` must be a boolean"),this._optimizeForSpeed=i,this._serverSheet=void 0,this._tags=[],this._injected=!1,this._rulesCount=0;var s="undefined"!=typeof window&&document.querySelector('meta[property="csp-nonce"]');this._nonce=s?s.getAttribute("content"):null}var t,r=e.prototype;return r.setOptimizeForSpeed=function(e){c("boolean"==typeof e,"`setOptimizeForSpeed` accepts a boolean"),c(0===this._rulesCount,"optimizeForSpeed cannot be when rules have already been inserted"),this.flush(),this._optimizeForSpeed=e,this.inject()},r.isOptimizeForSpeed=function(){return this._optimizeForSpeed},r.inject=function(){var e=this;if(c(!this._injected,"sheet already injected"),this._injected=!0,"undefined"!=typeof window&&this._optimizeForSpeed){this._tags[0]=this.makeStyleTag(this._name),this._optimizeForSpeed="insertRule"in this.getSheet(),this._optimizeForSpeed||(l||console.warn("StyleSheet: optimizeForSpeed mode not supported falling back to standard mode."),this.flush(),this._injected=!0);return}this._serverSheet={cssRules:[],insertRule:function(t,r){return"number"==typeof r?e._serverSheet.cssRules[r]={cssText:t}:e._serverSheet.cssRules.push({cssText:t}),r},deleteRule:function(t){e._serverSheet.cssRules[t]=null}}},r.getSheetForTag=function(e){if(e.sheet)return e.sheet;for(var t=0;t<document.styleSheets.length;t++)if(document.styleSheets[t].ownerNode===e)return document.styleSheets[t]},r.getSheet=function(){return this.getSheetForTag(this._tags[this._tags.length-1])},r.insertRule=function(e,t){if(c(o(e),"`insertRule` accepts only strings"),"undefined"==typeof window)return"number"!=typeof t&&(t=this._serverSheet.cssRules.length),this._serverSheet.insertRule(e,t),this._rulesCount++;if(this._optimizeForSpeed){var r=this.getSheet();"number"!=typeof t&&(t=r.cssRules.length);try{r.insertRule(e,t)}catch(t){return l||console.warn("StyleSheet: illegal rule: \n\n"+e+"\n\nSee https://stackoverflow.com/q/20007992 for more info"),-1}}else{var n=this._tags[t];this._tags.push(this.makeStyleTag(this._name,e,n))}return this._rulesCount++},r.replaceRule=function(e,t){if(this._optimizeForSpeed||"undefined"==typeof window){var r="undefined"!=typeof window?this.getSheet():this._serverSheet;if(t.trim()||(t=this._deletedRulePlaceholder),!r.cssRules[e])return e;r.deleteRule(e);try{r.insertRule(t,e)}catch(n){l||console.warn("StyleSheet: illegal rule: \n\n"+t+"\n\nSee https://stackoverflow.com/q/20007992 for more info"),r.insertRule(this._deletedRulePlaceholder,e)}}else{var n=this._tags[e];c(n,"old rule at index `"+e+"` not found"),n.textContent=t}return e},r.deleteRule=function(e){if("undefined"==typeof window)return void this._serverSheet.deleteRule(e);if(this._optimizeForSpeed)this.replaceRule(e,"");else{var t=this._tags[e];c(t,"rule at index `"+e+"` not found"),t.parentNode.removeChild(t),this._tags[e]=null}},r.flush=function(){this._injected=!1,this._rulesCount=0,"undefined"!=typeof window?(this._tags.forEach(function(e){return e&&e.parentNode.removeChild(e)}),this._tags=[]):this._serverSheet.cssRules=[]},r.cssRules=function(){var e=this;return"undefined"==typeof window?this._serverSheet.cssRules:this._tags.reduce(function(t,r){return r?t=t.concat(Array.prototype.map.call(e.getSheetForTag(r).cssRules,function(t){return t.cssText===e._deletedRulePlaceholder?null:t})):t.push(null),t},[])},r.makeStyleTag=function(e,t,r){t&&c(o(t),"makeStyleTag accepts only strings as second parameter");var n=document.createElement("style");this._nonce&&n.setAttribute("nonce",this._nonce),n.type="text/css",n.setAttribute("data-"+e,""),t&&n.appendChild(document.createTextNode(t));var a=document.head||document.getElementsByTagName("head")[0];return r?a.insertBefore(n,r):a.appendChild(n),n},t=[{key:"length",get:function(){return this._rulesCount}}],function(e,t){for(var r=0;r<t.length;r++){var n=t[r];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(e,n.key,n)}}(e.prototype,t),e}();function c(e,t){if(!e)throw Error("StyleSheet: "+t+".")}var u=function(e){for(var t=5381,r=e.length;r;)t=33*t^e.charCodeAt(--r);return t>>>0},p={};function h(e,t){if(!t)return"jsx-"+e;var r=String(t),n=e+r;return p[n]||(p[n]="jsx-"+u(e+"-"+r)),p[n]}function d(e,t){"undefined"==typeof window&&(t=t.replace(/\/style/gi,"\\/style"));var r=e+t;return p[r]||(p[r]=t.replace(/__jsx-style-dynamic-selector/g,e)),p[r]}var g=function(){function e(e){var t=void 0===e?{}:e,r=t.styleSheet,n=void 0===r?null:r,a=t.optimizeForSpeed,i=void 0!==a&&a;this._sheet=n||new s({name:"styled-jsx",optimizeForSpeed:i}),this._sheet.inject(),n&&"boolean"==typeof i&&(this._sheet.setOptimizeForSpeed(i),this._optimizeForSpeed=this._sheet.isOptimizeForSpeed()),this._fromServer=void 0,this._indices={},this._instancesCounts={}}var t=e.prototype;return t.add=function(e){var t=this;void 0===this._optimizeForSpeed&&(this._optimizeForSpeed=Array.isArray(e.children),this._sheet.setOptimizeForSpeed(this._optimizeForSpeed),this._optimizeForSpeed=this._sheet.isOptimizeForSpeed()),"undefined"==typeof window||this._fromServer||(this._fromServer=this.selectFromServer(),this._instancesCounts=Object.keys(this._fromServer).reduce(function(e,t){return e[t]=0,e},{}));var r=this.getIdAndRules(e),n=r.styleId,a=r.rules;if(n in this._instancesCounts){this._instancesCounts[n]+=1;return}var i=a.map(function(e){return t._sheet.insertRule(e)}).filter(function(e){return -1!==e});this._indices[n]=i,this._instancesCounts[n]=1},t.remove=function(e){var t=this,r=this.getIdAndRules(e).styleId;if(function(e,t){if(!e)throw Error("StyleSheetRegistry: "+t+".")}(r in this._instancesCounts,"styleId: `"+r+"` not found"),this._instancesCounts[r]-=1,this._instancesCounts[r]<1){var n=this._fromServer&&this._fromServer[r];n?(n.parentNode.removeChild(n),delete this._fromServer[r]):(this._indices[r].forEach(function(e){return t._sheet.deleteRule(e)}),delete this._indices[r]),delete this._instancesCounts[r]}},t.update=function(e,t){this.add(t),this.remove(e)},t.flush=function(){this._sheet.flush(),this._sheet.inject(),this._fromServer=void 0,this._indices={},this._instancesCounts={}},t.cssRules=function(){var e=this,t=this._fromServer?Object.keys(this._fromServer).map(function(t){return[t,e._fromServer[t]]}):[],r=this._sheet.cssRules();return t.concat(Object.keys(this._indices).map(function(t){return[t,e._indices[t].map(function(e){return r[e].cssText}).join(e._optimizeForSpeed?"":"\n")]}).filter(function(e){return!!e[1]}))},t.styles=function(e){var t,r;return t=this.cssRules(),void 0===(r=e)&&(r={}),t.map(function(e){var t=e[0],n=e[1];return i.default.createElement("style",{id:"__"+t,key:"__"+t,nonce:r.nonce?r.nonce:void 0,dangerouslySetInnerHTML:{__html:n}})})},t.getIdAndRules=function(e){var t=e.children,r=e.dynamic,n=e.id;if(r){var a=h(n,r);return{styleId:a,rules:Array.isArray(t)?t.map(function(e){return d(a,e)}):[d(a,t)]}}return{styleId:h(n),rules:Array.isArray(t)?t:[t]}},t.selectFromServer=function(){return Array.prototype.slice.call(document.querySelectorAll('[id^="__jsx-"]')).reduce(function(e,t){return e[t.id.slice(2)]=t,e},{})},e}(),m=a.createContext(null);m.displayName="StyleSheetContext";var f=i.default.useInsertionEffect||i.default.useLayoutEffect,b="undefined"!=typeof window?new g:void 0;function y(e){var t=b||a.useContext(m);return t&&("undefined"==typeof window?t.add(e):f(function(){return t.add(e),function(){t.remove(e)}},[e.id,String(e.dynamic)])),null}y.dynamic=function(e){return e.map(function(e){return h(e[0],e[1])}).join(" ")},t.style=y},90761:(e,t,r)=>{"use strict";r.d(t,{I:()=>a});var n=r(12115);function a(){let[e,t]=(0,n.useState)(0),r=(0,n.useCallback)(()=>{t(e=>e+1)},[]);return(0,n.useEffect)(()=>{let e=new MutationObserver(()=>{r()});return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class"]}),()=>{e.disconnect()}},[r]),[e,r]}}}]);