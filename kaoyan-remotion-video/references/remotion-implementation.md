# Remotion Implementation Reference

## Supported Runtime

- Windows 10/11.
- PowerShell 5.1 or newer.
- Node 24.x and pnpm 11.x, resolved by `KaoyanRuntime.psm1`.
- Remotion and every `@remotion/*` package pinned to the same exact version.
- Real project-local `node_modules`; no junctions or symbolic links.
- Existing Chrome, Edge, or Playwright Headless Shell set through `REMOTION_BROWSER_EXECUTABLE`.
- Executable FFmpeg and FFprobe pair.

First-run internet may install missing tools into a user-scoped runtime. Never require users to disable Windows Security.

## Project Contract

A generated project must contain:

```text
package.json
pnpm-lock.yaml
tsconfig.json
remotion.config.ts
public/voice.mp3
public/script.srt
src/index.ts
src/Root.tsx
src/Video.tsx
src/generatedContent.ts
src/timeline.ts
src/motion.ts
src/visualSystem.ts
```

`Main` is 1280x720. `Main4K` is 3840x2160. Both render the same 1280x720 design canvas; 4K scales it by three.

## Duration And Timeline

1. Measure audio duration with FFprobe.
2. Parse SRT as UTF-8 or common Chinese encodings and reject invalid timecodes.
3. Set `durationInFrames = ceil((audioDuration + tailHold) * fps)`.
4. Default `tailHold` to zero.
5. Normalize stage coverage so gaps hold the preceding stage.
6. Select readable stages with real `sec`, not `sec + visualLeadSeconds`.
7. Future cue text is absent from the rendered DOM. Empty rails may anticipate by about `0.1s`.
8. The final stage holds through the last frame instead of fading to an empty surface.

All motion is a pure function of frame/time and explicit cue inputs. Remotion may render frames out of order.

## Content Generation

```powershell
powershell -ExecutionPolicy Bypass -File scripts\generate-remotion-content.ps1 `
  -ProjectDir "path\to\project" `
  -Profile auto
```

Valid profiles are `planning`, `news`, and `knowledge`. Auto mode must refuse ambiguous evidence. Before/after course comparison is legal only when the transcript explicitly contains both sides.

## Proof-Oriented Preflight

```powershell
powershell -ExecutionPolicy Bypass -File scripts\check-remotion-env.ps1 `
  -ProjectDir "path\to\project" `
  -RenderStill
```

The preflight verifies executable tools, complete scaffold, SRT parsing, FFprobe audio duration, generated-duration tolerance, writable output, local dependencies, `Main`/`Main4K`, and optional still output. `-Json` returns stable codes. Do not begin visual iteration while failures remain.

`STUDIO_NOT_RUNNING` is a warning during render work. It is a failure of the requested experience only when the user asked for browser preview.

## Studio Preview

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-remotion-studio.ps1 `
  -ProjectDir "path\to\project" `
  -Background `
  -Json
```

Foreground is the default. Background mode chooses a free port, starts a hidden process, records PID/log paths, polls the exact socket and `/Main`, and reports `ready` only after HTTP succeeds. In restricted agent sandboxes, persistent local services may require execution approval even when the helper itself is correct.

Studio and MP4 are separate. A rendered video does not keep Studio alive.

## Verified Rendering

```powershell
# 720p acceptance render
powershell -ExecutionPolicy Bypass -File scripts\render-remotion.ps1 `
  -ProjectDir "path\to\project" `
  -Mode preview

# 4K only after preview acceptance
powershell -ExecutionPolicy Bypass -File scripts\render-remotion.ps1 `
  -ProjectDir "path\to\project" `
  -Mode 4k
```

`-Renderer auto` is the default:

1. Attempt native Remotion H.264.
2. Verify output with external FFprobe.
3. If native rendering fails, render JPEG frame chunks with an explicit frame pattern.
4. Reject missing or duplicate frames.
5. Mux frames plus source audio using external FFmpeg: H.264, `yuv420p`, AAC 192k, faststart.
6. Verify dimensions, FPS, duration tolerance, H.264 and an audio stream.
7. Delete frames only after verification unless `-KeepFrames` is set.

Each output gets `<video>.render-report.json`. External-render failures retain frames for diagnosis.

Generic names derive from the project directory:

```text
<project>-720p-preview.mp4
<project>-4k.mp4
```

Use `-OutputBaseName` or `-OutputPath` when the user specifies naming.

## Windows Rules

- Never retry a blocked native render indefinitely.
- Never tell the user to turn off all security protection.
- Do not hard-code a browser, Node, FFmpeg, user directory, drive letter, or old project name.
- Invoke project-local Remotion CLI from the exact `ProjectDir`.
- If pnpm cannot find Node, prepend the resolved portable Node directory only for that child operation.
- If output is open in another app, stop with `OUTPUT_LOCKED` rather than deleting or overwriting unpredictably.

See `failure-modes.md` for symptom-to-repair guidance.
