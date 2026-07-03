---
name: kaoyan-remotion-video
description: Create, review, repair, and render audio-first Chinese postgraduate computer-exam knowledge videos with Remotion. Use when a user provides voiceover audio, a script or timeline, asks for 408/CS kaoyan educational video animation, wants Douyin/Bilibili-style professional knowledge-card visuals, asks to remove or sync captions, requests 720p/4K exports, or wants the current production workflow turned into a reusable skill.
---

# Kaoyan Remotion Video

Build educational information-flow videos from locked voiceover audio. Treat the audio as the source of truth, then align scene structure, cards, progress timeline, animation accents, review, repair, and export around it.

## Quick Workflow

1. Inspect the provided audio, transcript, timing notes, current Remotion project, and existing renders.
2. Confirm the target format: default to horizontal 16:9, 1280x720 preview and 3840x2160 final unless the user asks otherwise.
3. Keep the voiceover unchanged. Do not rewrite core oral content unless the user explicitly asks.
4. Build or update scenes using the current visual system: parchment grid, deep blue-gray ink, warm yellow emphasis, structured cards, fixed progress timeline.
5. Apply audio-led timing: visual state changes may lead audio by about 0.1s, but do not drift from spoken meaning.
6. Review with the multi-agent checklist in `references/review-workflow.md`.
7. Repair the highest-impact issues first: audio mismatch, flicker, occlusion, overflow, white/black screen, stiff transitions.
8. Render a 720p preview before final output. Render 4K only after the user accepts the preview direction.
9. Return absolute output paths and any remaining known risks.

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

Then ask the user to place their own `voice.mp3` and transcript in the new project's `public/` folder or copy provided files there. The bundled template intentionally excludes the original user's real audio and rendered outputs.

Use the bundled render helper when useful:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/render-remotion.ps1 -ProjectDir "path/to/project" -Mode preview
powershell -ExecutionPolicy Bypass -File scripts/render-remotion.ps1 -ProjectDir "path/to/project" -Mode 4k
```

## Output Contract

For completed work, report:

- Modified files.
- Preview or final render path.
- Validation performed: still frames, preview render, 4K render, or known skipped checks.
- Remaining risks or next iteration priorities.
