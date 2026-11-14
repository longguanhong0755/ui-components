import type { COBEOptions } from "cobe";
import { Globe } from "@/registry/magicui/globe";

// 舞台固定 1200×675，演示容器 512px 宽；Globe 组件按 2× 像素比绘制，
// 用 2 可保证 cobe 的 canvas 尺寸与着色器画布一致（DPR 1 会只画出四分之一）。
const CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777], size: 0.1 },
    { location: [23.8103, 90.4125], size: 0.05 },
    { location: [30.0444, 31.2357], size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333], size: 0.1 },
    { location: [19.4326, -99.1332], size: 0.1 },
    { location: [40.7128, -74.006], size: 0.1 },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784], size: 0.06 },
  ],
};

export default function GlobeDemo() {
  return (
    // 宿主样式 .magic-demo>*{max-width:100%} 会覆盖 max-w-lg，这里用内联样式
    // 保住官方 demo 的 512px 卡片宽度，否则 1200px 宽的舞台上地球会被放大到溢出。
    <div
      className="bg-background relative flex h-full w-full items-start justify-center overflow-hidden rounded-lg border px-40 pb-40 pt-24 md:pb-60"
      style={{ maxWidth: "32rem", marginInline: "auto" }}
    >
      <span className="pointer-events-none relative z-10 whitespace-pre-wrap bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-8xl font-semibold leading-none text-transparent dark:from-white dark:to-slate-900/10">
        Globe
      </span>
      <Globe className="top-40" config={CONFIG} />
      <div className="pointer-events-none absolute inset-0 h-full bg-[radial-gradient(circle_at_50%_200%,rgba(0,0,0,0.2),rgba(255,255,255,0))]" />
    </div>
  );
}
