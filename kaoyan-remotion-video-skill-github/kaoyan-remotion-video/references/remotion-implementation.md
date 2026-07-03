# Remotion Implementation Reference

## Project Discovery

Read these first:

- `package.json`
- `src/Root.tsx`
- `src/Video.tsx`
- `public/` assets

Confirm:

- Composition ids and dimensions.
- `durationInFrames` and `fps`.
- Audio file path.
- Render scripts.
- Whether captions should be present or removed.

## Template Scaffold

If no project exists, copy `assets/remotion-template` with `scripts/scaffold-remotion-project.ps1`.

The template includes:

- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `src/index.ts`
- `src/Root.tsx`
- `src/Video.tsx`

The template excludes:

- `node_modules`
- rendered videos
- preview frames
- logs
- original `voice.mp3`
- original transcript files

After scaffolding, require a `public/voice.mp3` file or update `Root.tsx` default props to the user's audio filename.

## Timing Pattern

- Store stage sections as seconds.
- Derive cues from transcript/timeline.
- Use `visualLeadSeconds` around `0.1` if visuals should appear slightly before speech.
- Keep scene state as deterministic functions of frame/second.
- Avoid stateful animations that depend on previous frames because Remotion renders out of order.

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

## Still Checks

Render stills around:

- Opening hook.
- First section after transition.
- Middle complex scene.
- Final summary.
- Any user-reported problem frame.

Inspect for:

- Text overflow.
- Flicker-prone styles.
- Occlusion.
- Timeline position.
- Harsh contrast.

## Common Fixes

- For text flicker: remove hard text shadows, use stable label backgrounds.
- For harsh contrast: tune palette constants, not one-off colors.
- For stiff transitions: separate primary action from secondary accents, add settle, vary timing.
- For timeline confusion: use continuous fill plus node activation.
- For 4K confusion: explicitly render `Main4K`, not `Main`.
