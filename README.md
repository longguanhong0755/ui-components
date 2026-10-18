# UI Components

A free, open collection of **650+ React UI components** — animations, canvas effects,
text effects, cursors, backgrounds, and more. Every component is a single self-contained
`.tsx` file you can copy straight into your project.

一个免费开源的 **React UI 组件合集**：动画、Canvas 特效、文字效果、光标、背景等，
共 650+ 个基础组件和 450+ 个预设变体。每个组件都是单个自包含的 `.tsx` 文件，
复制进项目即可使用。

## 快速开始 / Quick Start

1. 找到你喜欢的组件，把 `components/<name>.tsx` 复制到你的项目里（例如 `src/components/ui/`）。
2. 安装该组件需要的第三方依赖（见下方常见依赖）。
3. 像普通组件一样导入并使用：

```tsx
import AccretionDisc from "@/components/ui/accretion-disc";

export default function Page() {
  return <AccretionDisc />;
}
```

组件文件顶部都有 `"use client";` 指令，适用于 Next.js App Router；在纯 Vite / CRA
项目中可直接删除该行。

## 目录说明 / Layout

```
components/          # 所有组件源码（.tsx）
  <slug>.tsx             # 基础组件
  <slug>-variant-N.tsx   # 同一组件的外观预设变体
```

## 常见依赖 / Common Dependencies

不同组件用到的库不同，具体以组件文件顶部的 `import` 为准。出现频率较高的：

| 库 | 用途 |
|---|---|
| `framer-motion` | 入场/交互动画 |
| `gsap` | 时间轴动画 |
| `three` + `@react-three/fiber` + `@react-three/drei` | 3D 场景 |
| `motion`（Motion for React） | 动画 |
| `tailwindcss` | 大部分组件使用 Tailwind 类名排版 |

若组件使用了 Tailwind，请确保你的项目已配置 Tailwind CSS。

## 许可 / License

本仓库内容以 MIT License 发布，可自由使用、修改、再分发（含商业用途），无需署名。
