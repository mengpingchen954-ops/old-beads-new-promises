# 旧珠新约 · The Bead Atelier

一间把故事重新串起的小店。原创手绘风、Three.js 正交镜头的 2D 顺序解谜游戏。十二份委托、三位顾客、一段有结尾的旧物故事。

## 游玩

- [浏览器直接玩](https://mengpingchen954-ops.github.io/old-beads-new-promises/)
- 鼠标或触屏点选料杆左端的珠子，再点需求相符的手链或空暂存格；亦可拖放。
- 暂存珠只能串入手链，不能放回料杆。用完所有珠子、完成两条手链即可交付。
- 无限撤销与重开，无计时、付费或广告。提示会指出一个可继续完成的行动。
- `Tab` / `Enter` 操作按钮，`Z` 撤销，`Esc` 关闭普通弹窗或取消选择，`F` 全屏。
- 委托进度、当前操作与声音开关保存于此浏览器的本地存储。清除网站数据会丢失进度。

## 本地运行

需要 Node.js 22.12+（或 Vite 8 支持的新版本）。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址；不可直接双击 HTML 启动 ES modules。

```sh
npm test
npm run build
npm run preview
```

`dist/` 是可部署到任意静态站点的生产文件；资源使用相对路径，支持仓库子目录。GitHub Actions 在 main 更新后测试、构建并发布 Pages。

## 测试

`npm test` 检查全部十二关的材料守恒、可解性、非法操作、阻塞、不可变状态与存档输入。

```sh
npx playwright install chromium
node tests/playthrough.mjs
```

浏览器端检查十二关通关、结局、收藏、存档续玩、点选与拖放、手机触屏、重来、撤销、提示、阻塞恢复和尺寸变化。可用 `GAME_URL` 指向预览或公开站点；截图输出到不提交的 `artifacts/`。

## 实现与资产

- `src/model.js`：纯游戏规则与深度优先解法搜索，不依赖 Three.js。
- `src/renderer.js`：单一 Three.js canvas，正交 2D 镜头、纹理珠子、工作台与短动作动画。桌面左右布局、手机竖向布局；静止时不持续重绘，像素比上限 2。
- `src/main.js`：DOM 菜单与无障碍操作层、故事、收藏、保存、合成音效。
- `src/levels.js` / `src/content.js`：固定关卡与原创角色、订单和完整故事。
- `public/art/`：十二个原创 SVG 美术资源，包括六种珠子、三位顾客、桌面、封面和标记。不是临时占位图；可直接用于 Three.js 纹理或网页图像。
- `scripts/create-art.mjs`：可复现的原创矢量绘制源；`scripts/create-levels.mjs`：带解法校验的固定关卡生成源。

最初请求 imagegen，但当前工具不可用；用户随后选择使用统一原创手绘风美术，不调用付费 imagegen CLI。作品没有使用 AI 生成图片，也不声称这些 SVG 来自 imagegen。没有使用外部图片、字体 CDN、角色 IP 或在线游戏服务。

不加入与委托解谜无关的敌人、武器、战斗和掉落系统。交付奖励是实际珠序对应的手链与回访来信，收藏可重看与重玩。

浏览器需支持 WebGL 2。针对 Chromium 桌面与模拟手机进行了验证；尚未覆盖所有实机浏览器，关卡难度和剧情吸引力仍待目标玩家试玩。
