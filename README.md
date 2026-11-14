# UI Components

A free, open collection of **1,400+ React UI components, presets and shader previews** —
animations, canvas effects, text effects, cursors, backgrounds, and more. Every component
is a single self-contained `.tsx` file you can copy straight into your project.

一个免费开源的 **React UI 组件合集**：动画、Canvas 特效、文字效果、光标、背景等，
共 1,400+ 个组件、预设与着色器条目。每个组件都是单个自包含的 `.tsx` 文件，
复制进项目即可使用。

> **第三方声明**：本仓库中的部分组件、演示录像与封面素材由第三方提供，或整理自
> 第三方公开资源；版权与许可归原作者/原站点所有。完整来源列表与下架方式见
> [`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md)。

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
components/          # Originkit 组件源码（.tsx）
  <slug>.tsx             # 基础组件
  <slug>-variant-N.tsx   # 同一组件的外观预设变体
demos/               # Originkit 演示录像与封面素材
reactbits/           # ReactBits Pro 231 个公开预览实现
shaders-pro/         # Shaders Pro 220 组 / 1,000 个预设归档
radiant/             # Radiant Shaders 归档：88 个自包含 HTML、参数表与 MIT LICENSE
third-party/
  magic-ui/             # Magic UI 77 个组件、官方 demo 与 MIT LICENSE
  paper-shaders/        # Paper Shaders 20 个着色器、参数表与 PolyForm Shield LICENSE
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

## 许可与第三方声明 / License & Third-party notice

本仓库是第三方公开组件资源的整理与展示镜像，**部分组件并非本仓库原创**。
`components/`、`demos/`、`reactbits/`、`shaders-pro/`、`radiant/` 与 `third-party/`
中的组件源码、演示录像与封面素材，其版权与许可归原作者/原站点所有；本仓库不对这些
内容重新授权。使用、修改或再分发前，请确认并遵循原始许可。

已确认的第三方来源：

| 来源 | 内容 |
|---|---|
| [Originkit](https://www.originkit.dev) | `components/` 与 `demos/` 中大部分组件源码、演示录像与封面 |
| [ReactBits Pro](https://pro.reactbits.dev) | `reactbits/` 下 231 个公开预览实现 |
| [Shaders / Shader Effects, Inc.](https://shaders.com/pro) | 1,000 个着色器预设与素材；运行时以 MIT 许可发布，独立归档见 [shaders-pro-archive](https://github.com/longguanhong0755/shaders-pro-archive) |
| [Radiant Shaders](https://radiant-shaders.com) | `radiant/` 下 88 个独立着色器（自包含 HTML）、参数表与素材；MIT License，Copyright (c) 2025 Paul Bakaus，上游 [pbakaus/radiant](https://github.com/pbakaus/radiant) |
| [Magic UI](https://magicui.design) | `third-party/magic-ui/` 下 77 个组件、官方 demo、registry 元数据与源码；MIT License，Copyright (c) Magic UI，上游 [magicuidesign/magicui](https://github.com/magicuidesign/magicui) |
| [Paper Shaders](https://shaders.paper.design) | `third-party/paper-shaders/` 下 20 个着色器、参数表与源码；**PolyForm Shield 1.0.0**（允许商用与再分发，但不得用于与 Paper Shaders 竞争的产品），上游 [paper-design/shaders](https://github.com/paper-design/shaders)，`@paper-design/shaders-react@0.0.61` |

本仓库新增的整理脚本、站点代码与文档以 MIT License 发布。
第三方内容的可用性、合法性与适用性由使用者自行判断；本仓库仅作索引、预览与整理，
不代表原作者立场。

若你是版权持有人且不希望相关内容出现在本仓库或展示站，请提交
[issue](https://github.com/longguanhong0755/ui-components/issues)，我们会核实并尽快下架。
详细说明见 [`THIRD-PARTY-NOTICES.md`](./THIRD-PARTY-NOTICES.md)。
