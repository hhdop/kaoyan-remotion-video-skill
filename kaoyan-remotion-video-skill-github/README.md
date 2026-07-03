# Kaoyan Remotion Video Skill

一个用于制作考研类知识讲解视频的 Codex skill。它适用于在职考研、普通考研、管综、MBA、MPA、MEM、MPAcc、院校政策、报考条件、择校择专业、备考规划、学员经验、考研热点资讯等口播驱动型知识视频。

它沉淀了一个音频优先的视频生产流程：从口播音频、文稿时间线、Remotion 动画排版、审片返修，到 720p 预览和 4K 导出。

## What It Includes

- `kaoyan-remotion-video/`：可安装的 Codex skill。
- `references/style-and-motion.md`：考研类知识讲解视频的视觉与动效标准。
- `references/review-workflow.md`：五角色审片、评分、P0/P1/P2 返修机制。
- `references/remotion-implementation.md`：Remotion 项目结构、时间轴、渲染与验收规则。
- `references/iteration-notes.md`：真实制作过程中的迭代经验，包含 408 暑期进度自查示例沉淀；408 只是示例，不代表 Skill 只服务 408。
- `assets/remotion-template/`：不含真实音频和渲染产物的通用 Remotion 模板。
- `scripts/scaffold-remotion-project.ps1`：从模板复制新项目。
- `scripts/render-remotion.ps1`：统一执行 720p / 4K 渲染。

## Install

把 `kaoyan-remotion-video` 文件夹复制到本机 Codex skills 目录：

```text
C:\Users\<your-name>\.codex\skills\kaoyan-remotion-video
```

然后重启 Codex。

也可以用 Codex 的 skill installer 从 GitHub 仓库路径安装：

```text
Use $skill-installer to install kaoyan-remotion-video from <owner>/<repo>/kaoyan-remotion-video
```

## Usage

示例提示词：

```text
使用 $kaoyan-remotion-video，根据我的口播音频和文稿，生成一条横屏 16:9 的考研类知识讲解视频。先做 720p 预览，确认后导出 4K。
```

更多可用场景：

- 根据 MBA 报考条件口播音频，生成一条在职考研政策讲解视频。
- 根据院校招生简章解读音频，生成一条院校政策讲解视频。
- 根据 408 暑期进度自查音频，生成一条计算机考研备考规划视频。
- 根据高分学员经验稿，生成一条上岸经验讲解视频。

如果没有现成 Remotion 项目，可以先让 Codex 用内置模板创建：

```powershell
powershell -ExecutionPolicy Bypass -File kaoyan-remotion-video\scripts\scaffold-remotion-project.ps1 `
  -SkillDir "path\to\kaoyan-remotion-video" `
  -OutputDir "path\to\new-remotion-project"
```

然后把自己的 `voice.mp3` 放到新项目的 `public/` 目录。

## Scope

适用范围：

- 考研类知识讲解视频
- 口播音频驱动的视频
- 政策解读类视频
- 备考规划类视频
- 院校信息类视频
- 学员经验外化类视频
- 资讯热点解释类视频
- 横屏 16:9 或竖屏 9:16 的 Remotion 动画视频

不适用范围：

- 真人出镜精剪
- 高度剧情化短片
- 强广告特效片
- 纯图文轮播
- 没有口播稿、没有字幕稿、只靠音频盲猜内容的高精度视频
- 需要大量真实素材剪辑的探校 / vlog / 采访类视频

## Production Philosophy

- 音频是锁定源，画面和节奏跟随音频。
- 考研内容准确性优先于视觉包装。
- 政策类、院校类、报考条件类内容必须提醒核对官方信源。
- 视频目标是提高团队内容生产效率，不是替代专业事实审核。
- 默认风格是专业、清楚、可信、年轻化的教育知识账号风格。
- 先 720p 预览，再 4K 成片。
- 每次返修都要沉淀成可复用规则。
- 动效服务理解，不堆无意义特效。

## Accuracy Note

对于院校政策、招生简章、报考条件、考试科目调整、国家线、复试线、学制、学费等内容，Skill 只负责视频生成和表达优化，不负责凭空判断事实。用户必须提供经过核对的口播稿或官方信源摘要。涉及政策事实的内容，生成前应先完成事实核查。

## Current Status

This skill has passed Codex `quick_validate.py`.

It is still intended to evolve through real production feedback.
