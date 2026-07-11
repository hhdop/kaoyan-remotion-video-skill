---
name: kaoyan-remotion-video
description: Use when a user provides voiceover audio and an SRT or script for a horizontal Chinese postgraduate-exam knowledge video, requests a Remotion browser preview, 720p or 4K export, audio-timed motion repair, Windows environment diagnosis, or fresh-computer portability validation.
---

# Kaoyan Remotion Video

Create horizontal 16:9 postgraduate-exam knowledge videos from locked voiceover audio. The audio and SRT are the timing source; visuals must explain the spoken structure without revealing future conclusions.

## Required Workflow

1. Inspect the audio, SRT, requested output, reference media, and any existing Remotion project.
2. On a new Windows 10/11 computer or fresh project, run the Windows bootstrap and proof-oriented preflight before visual work. First-run internet is allowed for missing user-scoped tools. Never disable Windows Security or Smart App Control.
3. Measure the real audio duration with FFprobe. Keep tail hold at zero unless the user asks for one.
4. Classify the transcript as `planning`, `news`, or `knowledge`. If auto classification is ambiguous, ask for the profile instead of inventing facts.
5. Generate `src/generatedContent.ts` from the real SRT. Never reuse the bundled sample copy as production content.
6. Use real seconds to select readable stages. Only empty structure may anticipate speech by about `0.1s`; text, highlights, stamps, confirmations, and CTA states wait for their cue.
7. Review representative stills for clipping, overlap, premature text, overexposure, empty editor-like boxes, and content-type mismatch. At every major chapter boundary, inspect the frame before the cue, the cue frame, and several frames after it; reject empty content panels and transparent text double-exposure.
8. Start Studio and verify the reported `/Main` URL when browser preview is requested. Studio preview and rendered MP4 are separate deliverables.
9. Render and verify 720p first. Export 4K only after the user accepts the preview direction.
10. Report absolute output paths, render report paths, verification performed, and remaining risks.

## Windows Commands

Run from the installable Skill folder unless a command says otherwise:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\bootstrap-windows.ps1 -ProjectDir "path\to\project"
powershell -ExecutionPolicy Bypass -File scripts\check-remotion-env.ps1 -ProjectDir "path\to\project" -RenderStill
powershell -ExecutionPolicy Bypass -File scripts\start-remotion-studio.ps1 -ProjectDir "path\to\project" -Background
powershell -ExecutionPolicy Bypass -File scripts\render-remotion.ps1 -ProjectDir "path\to\project" -Mode preview
powershell -ExecutionPolicy Bypass -File scripts\render-remotion.ps1 -ProjectDir "path\to\project" -Mode 4k
```

For a new project, scaffold first, place `voice.mp3` and `script.srt` in `public/`, then generate content:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\scaffold-remotion-project.ps1 -SkillDir "." -OutputDir "path\to\project"
powershell -ExecutionPolicy Bypass -File scripts\generate-remotion-content.ps1 -ProjectDir "path\to\project" -Profile auto
```

## Design Rules

- `planning`: priorities, rails, meters, schedules, and review loops.
- `news`: source, explicit change, affected audience, facts, and action. Show before/after only when the transcript contains both sides.
- `knowledge`: question, concept, example, method, and summary nodes.
- Keep major surfaces below the exposure ceiling, use yellow locally, and avoid pure-white cards or dense grids.
- Give each stage one primary action, delayed secondary action, restrained continuous life, and a settle. Use `disney-animation-rule-skill` when motion feels stiff or unclear.
- Use the review roles in `references/review-workflow.md` for major work or publication readiness.

Read `references/remotion-implementation.md`, `references/style-and-motion.md`, and `references/failure-modes.md` before changing rendering, motion, or Windows runtime behavior.
