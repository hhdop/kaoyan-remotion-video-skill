---
name: kaoyan-remotion-video
description: Create, validate, review, repair, and render audio-first Chinese postgraduate computer-exam knowledge videos with Remotion. Use when a user provides voiceover audio, a script or timeline, asks for 408/CS kaoyan educational animation, wants 720p/4K exports, browser previews, or needs to test whether this reusable skill works on a fresh computer/project.
---

# Kaoyan Remotion Video

Build educational information-flow videos from locked voiceover audio. Treat the audio as the source of truth, then align scene structure, cards, progress timeline, animation accents, review, repair, and export around it.

## Quick Workflow

1. Inspect the provided audio, transcript, timing notes, current Remotion project, and existing renders.
2. For fresh scaffolds, copy the user's audio and SRT into `public/`, then run the content generator so `src/generatedContent.ts` reflects the actual script.
3. Run the portability preflight before implementation or rendering when this is a new machine, new project, fresh scaffold, browser-preview request, or reusable-skill test. For copied projects, use real local `node_modules`; do not junction/symlink an old project's `node_modules` because Remotion may clean webpack cache inside it. Record and fix environment blockers before doing visual iteration.
4. Confirm the target format: default to horizontal 16:9, 1280x720 preview and 3840x2160 final unless the user asks otherwise.
5. Keep the voiceover unchanged. Do not rewrite core oral content unless the user explicitly asks.
6. Classify the content type before choosing motion language. Progress, plan, review-path, and schedule videos can use rails, meters, nodes, and checklists. News or information-update videos need a headline/source/fact/impact/action structure; do not force them into a planning-progress metaphor.
7. Build or update scenes using the current lowered-exposure visual system: parchment grid, deep blue-gray ink, local warm-yellow accents, structured cards, fixed progress timeline.
8. Apply audio-led timing: stage preparation may lead audio by about 0.1s, but keywords, yellow confirmations, stamps, CTA states, and emphasis events must be derived from SRT cue start/end times rather than fixed per-index delays. Unspoken future cues should be invisible or generic placeholders, not low-opacity readable text.
9. For reference-video-level motion requests, give each semantic stage a distinct primary action, delayed secondary action, restrained continuous life, and settle. Do not solve richness by looping unrelated decoration.
10. Review with the multi-agent checklist in `references/review-workflow.md`, including a first-time viewer pass for premature labels, crowded screens, and elements that look like placeholders or editor residue.
11. Repair the highest-impact issues first: audio mismatch, premature highlights, flicker, occlusion, overflow, overexposure, white/black screen, stiff transitions.
12. Before claiming completion, run the delivery quality gate: re-check requirements, paths, playable output, browser preview state when requested, validation evidence, and remaining risks.
13. Render a 720p preview before final output. Render 4K only after the user accepts the preview direction.
14. Return absolute output paths and any remaining known risks.

## Portability Preflight

Use this before substantial work on a fresh project or when validating that another computer can reproduce the workflow:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-remotion-env.ps1 -ProjectDir "path/to/project"
```

The preflight must confirm Node, pnpm, project files, voiceover assets, transcript SRT, generated Remotion content, Remotion CLI installation, composition discovery, and Studio port state. Treat missing Node/pnpm, missing assets, missing `src/generatedContent.ts`, missing `node_modules`, failed composition discovery, or user-specific hard-coded paths as root-cause issues before editing video code. Webpack cache warnings are non-fatal unless they prevent composition discovery or rendering.

## When Using Existing Projects

- Read `src/Root.tsx`, `src/Video.tsx`, `package.json`, and `public/` assets first.
- Preserve unrelated user edits and generated output.
- Prefer scoped changes to scene timing, style constants, animation helpers, and render scripts.
- If captions are present, follow the user's latest preference. If the user says they will add captions later, remove in-video captions and keep visual cues only.
- Use Remotion stills at representative frames to verify layout before full render.

## Design And Motion Standards

Read `references/style-and-motion.md` before changing visual design, typography, progress bars, colors, or transitions.

Use `disney-animation-rule-skill` when motion feels stiff, weightless, repetitive, jumpy, or unclear. Focus on anticipation, readable primary action, secondary-action delay, settle, and deterministic frame evaluation.

Use `ruler-progress-render` only as inspiration or a side experiment for progress-bar language; do not replace the main video with an unrelated template unless the user asks.

## Review And Repair

Read `references/review-workflow.md` when the user asks for review, scoring, subagents, self-check, publication readiness, or iterative optimization.

Read `references/iteration-notes.md` when continuing from prior production work or deciding whether an external workflow should be adopted.

Always prioritize:

1. Audio duration and scene timing correctness.
2. Flicker-free text and stable positions.
3. No overlap or overflow.
4. Strong but not harsh hierarchy.
5. Smooth transitions that serve comprehension.

## Remotion Implementation

Read `references/remotion-implementation.md` before editing code or rendering.

If the user does not already have a Remotion project, scaffold the bundled template:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/scaffold-remotion-project.ps1 -SkillDir "path/to/kaoyan-remotion-video" -OutputDir "path/to/new-project"
```

Then place the user's audio and transcript in the new project's `public/` folder. Prefer `voice.mp3` and `script.srt`, but the generator can also detect the first common audio file and `.srt` file in `public/`. The bundled template intentionally excludes the original user's real audio and rendered outputs.

Generate Remotion content from the actual transcript before rendering:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-remotion-content.ps1 -ProjectDir "path/to/project" -Title "408 考研快讯"
```

The generator writes `src/generatedContent.ts`, including duration, audio filename, semantic stages, timeline labels, and text cards. If the SRT text appears garbled, stop and fix transcript encoding before rendering.

Use the bundled render helper when useful:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/render-remotion.ps1 -ProjectDir "path/to/project" -Mode preview
powershell -ExecutionPolicy Bypass -File scripts/render-remotion.ps1 -ProjectDir "path/to/project" -Mode 4k
```

Use the bundled Studio helper for browser preview. It intentionally runs in the foreground; keep the terminal alive while previewing:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-remotion-studio.ps1 -ProjectDir "path/to/project" -Port 3010
```

Studio preview is different from MP4 rendering. A rendered preview file can exist while `http://localhost:3010` still fails if the Studio process is not running. In Codex desktop, starting a long-running local service, installing dependencies, downloading Chrome Headless Shell, or showing the in-app browser may require approval. First verify the port is listening, then navigate the in-app browser to `http://localhost:3010/Main`.

## Delivery Quality Gate

Before finishing any task with this skill, run this lightweight quality gate. The goal is to raise speed without letting video quality drop.

1. Split complex requests into checkable subtasks before implementation when the user has not already approved a plan.
2. During production, keep checkpoints for content understanding, fact risk, structure, visual style, motion rhythm, Remotion implementation, preview acceptance, and final export.
3. Before delivery, verify the latest user request, modified file paths, playable outputs, render status, known skipped checks, and remaining risks.
4. For video quality issues, use the review roles in `references/review-workflow.md`: director, audio-timing, visual design, motion, and technical review.
5. Do not claim a preview, render, build, or repair is complete without fresh verification evidence.

## Output Contract

For completed work, report:

- Modified files.
- Preview or final render path.
- Validation performed: still frames, preview render, 4K render, or known skipped checks.
- Remaining risks or next iteration priorities.
