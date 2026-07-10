# Remotion Implementation Reference

## Project Discovery

Read these first:

- `package.json`
- `src/Root.tsx`
- `src/Video.tsx`
- `src/generatedContent.ts`
- `public/` assets

Confirm:

- Composition ids and dimensions.
- `durationInFrames` and `fps`.
- Audio file path.
- Render scripts.
- Whether captions should be present or removed.

## Portability Preflight

Run preflight before editing/rendering on a fresh project, a new machine, or a browser-preview request:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-remotion-env.ps1 -ProjectDir "path/to/project"
```

The check should prove:

- Node and pnpm are resolvable from PATH or the Codex runtime, without user-specific hard-coded paths.
- `package.json`, `src/index.ts`, `src/Root.tsx`, `src/Video.tsx`, `src/generatedContent.ts`, a transcript `.srt`, and a voiceover audio file exist.
- `tsconfig.json` exists for TypeScript projects, and `remotion.config.ts` is present when the project needs a pinned browser executable, disabled webpack cache, or other local environment fixes.
- `node_modules` is installed before composition/render checks.
- `Main` and `Main4K` compositions can be listed.
- The requested Studio port is listening only after Studio is intentionally started.

Do not treat webpack cache EPERM warnings as fatal if compositions are listed and renders proceed. Do treat missing Node/pnpm, missing Remotion CLI, failed composition discovery, or an inactive Studio port as root-cause issues to resolve before visual iteration.

Do not junction or symlink `node_modules` from a previous project into a copied deliverable project. Remotion may write and clean webpack cache inside `node_modules`, and linked dependency folders can turn ordinary cache cleanup into `EPERM` or stale-bundle failures. Install real local dependencies for the active project. If `pnpm` lifecycle scripts fail with `node is not recognized`, prepend the resolved Node `bin` directory to `PATH` and rerun the install after packages are downloaded.

## Template Scaffold

If no project exists, copy `assets/remotion-template` with `scripts/scaffold-remotion-project.ps1`.

The template includes:

- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `src/index.ts`
- `src/Root.tsx`
- `src/Video.tsx`
- `src/generatedContent.ts`

The template excludes:

- `node_modules`
- rendered videos
- preview frames
- logs
- original `voice.mp3`
- original transcript files

After scaffolding, copy the user's voiceover and transcript into `public/`. Prefer `voice.mp3` and `script.srt`; otherwise the generator will use the first common audio file and first `.srt` file in `public/`.

Run content generation before preflight and rendering:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-remotion-content.ps1 -ProjectDir "path/to/project" -Title "408 考研快讯"
```

The generator writes `src/generatedContent.ts` from the SRT. `Root.tsx` reads duration, fps, and audio filename from that file; `Video.tsx` renders the generated stage cards and timeline. Do not hand-edit `Root.tsx` for duration in scaffolded projects unless generation is impossible. If text is mojibake, repair SRT encoding or regenerate from a clean transcript before rendering.

## Timing Pattern

- Store stage sections as seconds.
- Derive cues from transcript/timeline and preserve cue `start`/`end` on each rendered point.
- Use `visualLeadSeconds` around `0.1` if visuals should appear slightly before speech.
- Drive `active`, keyword opacity, stamps, CTA state, and hold/progress meters from `point.cueStart` and `point.cueEnd`; fixed index delays are only allowed as tiny secondary-action offsets after the cue time is known.
- Separate stage preparation from cue confirmation: rails, empty shells, or camera/card moves may use `sec + visualLeadSeconds`, but spoken labels and yellow confirmations should evaluate against real `sec`.
- Use real `sec` to choose the active readable stage. Do not call `getStage(sec + visualLeadSeconds)` for the whole scene; it can make the next chapter title and content appear before the voiceover. Apply lead only inside components that render non-readable anticipation.
- For list cues with multiple spoken items in one subtitle block, split the cue interval into item windows before rendering.
- Keep scene state as deterministic functions of frame/second.
- Avoid stateful animations that depend on previous frames because Remotion renders out of order.

## Preferred Code Structure For Rich Motion

For reference-level animation, extract deterministic helpers instead of embedding ad hoc math in every component:

- `src/timeline.ts`: semantic stages, `cueStart/cueEnd`, optional `tailNote`, and acceptance-friendly constants such as `visualLeadSeconds`.
- `src/motion.ts`: pure `phaseProgress`, `cueState`, `stageState`, `settlePulse`, and small drift helpers.
- `src/visualSystem.ts`: palette, tone-to-surface mapping, readable font sizing, and luminance checks.
- `src/Video.tsx`: scene components only. Each stage should choose a distinct visual metaphor and call the shared motion/visual helpers.

When updating an existing project, add small tests for timeline continuity, cue containment, acceptance seconds, motion helper behavior, and palette exposure before large visual refactors.

## Rendering Pattern

Use 720p preview first:

```bash
pnpm run render
```

Use 4K after approval:

```bash
pnpm run render:4k
```

Recommended high-quality 4K script:

```json
"render:4k": "remotion render src/index.ts Main4K out/408-progress-check-4k.mp4 --codec h264 --image-format png --crf 12"
```

Prefer the bundled helper in portable skill workflows because it resolves Node/pnpm dynamically and calls the Remotion JS CLI directly, which avoids Windows `.CMD` wrapper issues in non-ASCII project paths:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/render-remotion.ps1 -ProjectDir "path/to/project" -Mode preview
powershell -ExecutionPolicy Bypass -File scripts/render-remotion.ps1 -ProjectDir "path/to/project" -Mode 4k
```

If FFmpeg reports `Permission denied` when opening an output MP4, check whether the file is open in a media player or whether the sandbox requires approval to write the output. Re-run with a new `-OutputPath` if the file is locked.

When composition discovery or still rendering tries to download Chrome Headless Shell and fails due to network, EACCES, or Windows security restrictions, locate an existing installed Chrome/Playwright headless shell and set it explicitly in `remotion.config.ts`:

```ts
import {Config} from '@remotion/cli/config';

Config.setBrowserExecutable('C:\\path\\to\\chrome-headless-shell.exe');
```

## Windows FFmpeg And Smart App Control

If Remotion can render stills or image sequences but full MP4 render fails when probing audio, do not keep retrying the same render command. Check these red flags:

- Windows Security says "Smart App Control blocked part of this app".
- Remotion bundled `remotion.exe`, `ffmpeg.exe`, or `ffprobe.exe` exits immediately with code `-1058471934` / `0xC0E90002`.
- Direct `ffprobe public/voice.mp3` fails, but a system or portable FFmpeg can read the file.

Correct fallback:

1. Install or locate a trusted portable FFmpeg outside `node_modules`.
2. Verify it with `ffmpeg -version` and `ffprobe voice.mp3`.
3. Render Remotion as a muted image sequence:

```powershell
node node_modules\@remotion\cli\remotion-cli.js render src\index.ts Main "path\frames" --sequence --muted --image-format=jpeg --jpeg-quality=90
```

4. Combine frames and voiceover with the trusted FFmpeg:

```powershell
ffmpeg -y -framerate 30 -i "path\frames\element-%04d.jpeg" -i "public\voice.mp3" -t 30.67 -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "path\preview.mp4"
```

5. Verify both video and audio streams with `ffprobe`.

Do not tell the user to disable all Windows Security. If needed, explain that Remotion already uses FFmpeg; the external FFmpeg is only replacing the blocked bundled binary.

For browser preview, start Studio with a foreground process and keep it alive:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-remotion-studio.ps1 -ProjectDir "path/to/project" -Port 3010
```

Only open `http://localhost:3010/Main` after the terminal says `Server ready` or `netstat` shows port `3010` listening. If the browser shows `ERR_CONNECTION_REFUSED`, the Studio server is not running; debug the server process instead of changing video code.

In Codex desktop, foreground commands are stopped when the shell tool times out, so Studio may need an approved long-running process launch. Treat these separately:

- `pnpm install` `EACCES`: network sandbox blocked dependency downloads; rerun with approval.
- Chrome Headless Shell download `EACCES`: render/composition checks may need network approval, but Studio preview can still work if port `3010` is listening.
- `CreateProcessAsUserW failed: 5` or WMI access denied: Windows blocked background process launch; request approval or ask the user to run the foreground Studio helper in their terminal.
- `Start-Process` fails with duplicate `Path`/`PATH`: temporarily clear one process-level variable before launch, then restore it. Do not conclude Studio is broken before checking this shell environment issue.
- Browser still on an error page while port is listening: reload or navigate the in-app browser to `http://localhost:3010/Main`.
- Rendered MP4 preview is not the same deliverable as browser preview. If the user asks why the browser is not open, start Studio, verify the port after startup, then navigate the in-app browser and capture a screenshot. Do not answer with only an MP4 path.

Before saying browser preview is ready, prove all three:

- Studio process is alive after startup.
- `netstat` shows the target port is listening.
- The in-app browser is on `http://localhost:<port>/Main` and the page is not `ERR_CONNECTION_REFUSED`.

## Still Checks

Render stills around:

- Opening hook.
- First section after transition.
- Middle complex scene.
- Final summary.
- Any user-reported problem frame.

For audio-led 408 change videos, also render the exact acceptance frames derived from the script, for example `0/75/153/234/345/540/705/765/876` at 30fps when those frames map to the current cue boundaries.

Inspect for:

- Text overflow.
- Flicker-prone styles.
- Occlusion.
- Timeline position.
- Harsh contrast.
- Premature summary labels or CTA stamps.
- Yellow becoming the largest visual mass.
- Non-informational ghost images, watermark-like overlays, or decorative assets that sit behind badges/text and look like leaked source material.

## Common Fixes

- For text flicker: remove hard text shadows, use stable label backgrounds.
- For harsh contrast: tune palette constants, not one-off colors.
- For stiff transitions: separate primary action from secondary accents, add settle, vary timing.
- For timeline confusion: use continuous fill plus node activation.
- For 4K confusion: explicitly render `Main4K`, not `Main`.
- For badge-area穿帮: remove decorative background images entirely; do not merely lower opacity if the asset has recognizable text or shapes.
