# Third-Party Notices / 第三方内容声明

本仓库包含的组件、演示素材与着色器内容，**部分由第三方提供，或整理自第三方公开资源**。
以下列表用于说明来源；版权与许可归各自权利人所有，本仓库不对其重新授权。

## 1. Originkit

- 站点：https://www.originkit.dev
- 内容：`components/` 下大部分组件源码（含 458 个预设变体）、`demos/` 下对应的
  演示录像与封面素材。
- 说明：本仓库仅做镜像整理与展示；使用、修改或再分发前，请遵循原站点/原作者的
  许可条款。本仓库不主张这些内容的版权。

## 2. ReactBits Pro

- 站点：https://pro.reactbits.dev
- 内容：`reactbits/` 下 231 个公开预览实现，包括原始公开 chunk（`chunks/`）与
  提取后的入口模块（`components/`）。
- 说明：仅用于归档与预览，版权归 ReactBits / 原作者所有。

## 3. Shaders / Shader Effects, Inc.

- 站点：https://shaders.com/pro
- 内容：1,000 个着色器预设、预览封面与引用素材，分成 220 组同源预设。
- 运行时：`shaders@4.0.7` 以 MIT License 发布，
  Copyright (c) 2026 Shader Effects Inc.
- 独立归档：https://github.com/longguanhong0755/shaders-pro-archive
- 说明：该归档使用公开可访问的内容制作，仅用于保存与配套展示；着色器预设
  与预览素材的版权归原站点/原作者所有。

## 4. Radiant Shaders

- 站点：https://radiant-shaders.com
- 上游：https://github.com/pbakaus/radiant（归档提交 `59e9f48c0ad9a3db2fbeb8898b4390d5a1eabb40`）
- 内容：`radiant/` 下 88 个独立着色器（自包含 HTML，含 Canvas 2D 与 WebGL）、
  `shaders.ts` 参数表、原始 README 与 MIT LICENSE。
- 许可：MIT License，Copyright (c) 2025 Paul Bakaus。完整许可文本见
  [`radiant/LICENSE`](./radiant/LICENSE)。
- 说明：仅归档公开可访问的成品着色器与参数表，用于保存与配套展示；单个 HTML
  可离线运行，参数通过 `postMessage` 修改。着色器创意与代码版权归 Paul Bakaus 所有。

## 5. Magic UI

- 站点：https://magicui.design
- 上游：https://github.com/magicuidesign/magicui
  （归档提交 `6f7b531e77659855d4bc1bec8e20fdb0c8199b20`）
- 内容：`third-party/magic-ui/` 下 77 个组件源码、官方 demo、registry 元数据、
  `LICENSE-MagicUI.md` 与 `MANIFEST.json`；站点预览宿主位于
  `showcase/src/vendor/magicui/`。
- 许可：MIT License，Copyright (c) Magic UI。完整许可文本见
  [`third-party/magic-ui/LICENSE.md`](./third-party/magic-ui/LICENSE.md)。
- 演示素材：图片来自 Unsplash（Unsplash License），图标来自 Simple Icons
  （CC0 1.0），头像由 avatar.vercel.sh 生成，海面演示视频来自 Magic UI CDN；
  均已落到本地 `third-party/magic-ui/media/`，仅用于离线预览。
- 说明：本站对 Magic UI 源码做了少量运行兼容处理（导入路径、Tailwind v4→v3
  类名转换、素材本地化），组件逻辑与版权仍归 Magic UI 作者所有。

## 6. Paper Shaders

- 站点：https://shaders.paper.design
- 上游：https://github.com/paper-design/shaders
  （归档提交 `0747060cfc0776526e4226ff8c304f6eb788664c`）
- 内容：`third-party/paper-shaders/` 下 20 个 WebGL 着色器的站内实现、214 项参数
  元数据、源码归档与封面；运行时使用 `@paper-design/shaders-react@0.0.61`。
- 许可：**PolyForm Shield License 1.0.0**，不是 Apache-2.0。完整许可文本见
  [`third-party/paper-shaders/LICENSE`](./third-party/paper-shaders/LICENSE)。
  该许可允许商业与非商业使用、修改与再分发，但**不得用于与 Paper / Paper Shaders
  直接竞争的产品或服务**；再分发时须保留许可文本与必要声明。
- 说明：本站仅作技术预览、参数展示与源码索引，不提供 Paper Shaders 的托管服务，
  也不代表 Paper 官方立场。使用前请自行确认你的场景符合 PolyForm Shield 条款。

## 7. 其他第三方依赖

组件源码可能引用 `framer-motion`、`three`、`gsap`、`motion`、`ogl`、`d3-geo`、
`matter-js` 等第三方库。这些库分别遵循其各自的许可，详见对应依赖包的 LICENSE。

## 下架请求 / Takedown

若你是版权持有人，且不希望相关内容出现在本仓库或展示站，请提交
[GitHub issue](https://github.com/longguanhong0755/ui-components/issues)。
请附上具体组件、文件或页面的地址以及权利证明；我们会核实并尽快下架。
