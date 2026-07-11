# Failure Modes

Use this reference by observable symptom. Prove the cause before applying the repair.

## PowerShell Refuses To Run A Script

- Symptom: `PSSecurityException` says script execution is disabled before any Skill check runs.
- Cause: the current PowerShell execution policy blocks local `.ps1` files.
- Proof: the exception names `about_Execution_Policies`; Node, Remotion, and FFmpeg have not started.
- Repair: launch the command with `powershell -NoProfile -ExecutionPolicy Bypass -File ...`. This applies to that process only. Do not disable Windows Security or change the machine-wide policy.

## Explicit Tool Path Still Reports Missing

- Symptom: a valid executable was supplied, but the self-test reports `NODE_MISSING`, `PNPM_MISSING`, `BROWSER_MISSING`, or `FFMPEG_MISSING`.
- Cause: the caller used a parameter name such as `-FfmpegExe` instead of the supported `-FfmpegPath`, causing positional binding to shift later values.
- Proof: compare the invocation with the script `param(...)` block; rerunning with `-NodePath`, `-PnpmPath`, `-BrowserPath`, `-FfmpegPath`, and `-FfprobePath` resolves the tools.
- Repair: use the exact documented parameter names. Treat the first missing-tool code as a command-interface error until the resolved path is printed and executed.

## Node Or pnpm Missing

- Symptom: `node is not recognized`, `PNPM_MISSING`, or dependency scripts fail after packages download.
- Cause: the portable Node directory is not in the child process `PATH`, or no runtime exists.
- Proof: `bootstrap-windows.ps1 -Json` cannot execute the resolved binary.
- Repair: run bootstrap or pass explicit paths. Add the resolved Node directory only to the install child process, not as a system-wide edit.

## pnpm Update Check Looks Like A Failure

- Symptom: dependency installation finishes, but an earlier `ERR_PNPM_META_FETCH_FAIL` only mentions fetching pnpm metadata or a newer pnpm version.
- Cause: the optional update notifier tried to reach the registry in a restricted network.
- Proof: the locked packages still install and the final pnpm exit code is zero.
- Repair: invoke pnpm with `--config.update-notifier=false`; the helpers already do this. Do not treat a successful locked install as failed.

## Composition Discovery Fails Only In A Deep Folder

- Symptom: identical Skill files pass in a short folder, but preflight reports `COMPOSITION_DISCOVERY_FAILED` from a deeply nested project or temporary path.
- Cause: the project path leaves too little headroom for pnpm and Remotion dependency paths on Windows.
- Proof: file hashes match and the same scaffold passes when its project root is shorter.
- Repair: keep the project near a short workspace root. `test-skill.ps1` uses short session names and automatically falls back to the system temporary directory when the requested test root is too long.

## Browser Download Or EACCES

- Symptom: Remotion attempts to download Chrome Headless Shell, fails with network/EACCES, or Composition discovery never starts.
- Cause: no executable browser was selected before Remotion ran.
- Proof: preflight reports `BROWSER_MISSING` or `BROWSER_INVALID`.
- Repair: use existing Playwright, Chrome, or Edge; set `REMOTION_BROWSER_EXECUTABLE`; rerun Composition discovery.

## MP4 Exists But Browser Preview Fails

- Symptom: a video file is present, but `localhost` or `127.0.0.1` refuses the connection.
- Cause: Studio is a separate long-running service and is not active, or a different port was selected.
- Proof: Studio helper does not report `ready`, or the returned port is not listening.
- Repair: start Studio, use the exact returned `/Main` URL, and keep the process alive. In a restricted agent terminal, request persistent-process approval or run foreground mode.

## Duplicate Path/PATH During Start-Process

- Symptom: `Item has already been added. Key in dictionary: 'Path' ... 'PATH'`.
- Cause: the host supplied duplicate case variants and Windows PowerShell 5.1 cannot build the child environment dictionary.
- Proof: `Start-Process` fails before Studio creates a PID.
- Repair: normalize only the current process environment to one `Path` key immediately before `Start-Process`. Do not change the system environment.

## Smart App Control Blocks Native Render

- Symptom: Windows reports that part of the app was blocked; stills work but native MP4 fails; compositor, bundled FFmpeg, EPERM, EACCES, or `0xC0E90002` appears.
- Cause: Windows rejects a bundled executable in Remotion's native encoding path.
- Proof: native render report classifies `security-or-compositor-blocked`, while browser still rendering and external FFmpeg execute successfully.
- Repair: keep security enabled. Render a verified image sequence, then mux it with the source audio using executable external FFmpeg.

## Image Sequence Directory Rejected

- Symptom: `The output directory of the image sequence cannot have an extension` even though the path is intended as a folder.
- Cause: a temporary directory starts with a dot, such as `.frames-name`; Remotion interprets it as an extension.
- Proof: error names the dot-prefixed folder.
- Repair: use `frames-<name>-<id>` without a leading dot.

## Missing Or Duplicate Frames

- Symptom: FFmpeg would produce a shortened/frozen video, or chunks left inconsistent names.
- Cause: a chunk failed, repeated a frame number, or frame names were not normalized.
- Proof: `FRAME_SEQUENCE_INCOMPLETE` or `FRAME_SEQUENCE_DUPLICATE` occurs before mux.
- Repair: preserve the frame directory, rerender the failed chunk, normalize to `frame-%06d.jpeg`, and mux only after exact `0..durationInFrames-1` coverage.

## Linked node_modules And EPERM

- Symptom: copied projects produce webpack cache cleanup errors, stale bundles, or `EPERM` inside dependencies.
- Cause: `node_modules` is a junction/symbolic link to another project.
- Proof: preflight reports `NODE_MODULES_LINKED` or file attributes show a reparse point.
- Repair: remove only the linked directory after verifying the target, then install real local dependencies from the lockfile.

## Wrong Content Profile

- Symptom: a planning transcript becomes a news comparison, an information update looks like a progress dashboard, or unsupported course-change text appears.
- Cause: template-specific assumptions replaced evidence-based classification.
- Proof: generated profile evidence does not match transcript terms, or comparison text has no explicit old/new source cues.
- Repair: rerun generation with `planning`, `news`, or `knowledge`; refuse ambiguous auto classification; never invent facts.

## Premature Text Or Highlights

- Symptom: the viewer can read future conclusions before the voiceover says them.
- Cause: stage selection used lead time, or future cards stayed readable at low opacity.
- Proof: inspect frames immediately before each cue.
- Repair: select readable stage with real seconds and do not render future text. Limit anticipation to unlabeled structure.

## Empty Or Double-Exposed Chapter Handoff

- Symptom: the side label changes while the main panel is blank, or old and new Chinese copy become readable on top of each other for several frames.
- Cause: the outgoing stage reaches zero opacity before the incoming stage has visible coverage, or two full panels use transparent cross-fades.
- Proof: inspect boundary frames at `cueStart - 1 frame`, `cueStart`, `cueStart + 3 frames`, and `cueStart + 8 frames`.
- Repair: keep the outgoing stage through the cue frame and use complementary clipping with a restrained seam/rail motion. The two panels must cover exactly 100% of the content area, and incoming readable text must not appear before `cueStart`.

## Overexposure, Overflow, Or Editor Residue

- Symptom: white/yellow dominates, Chinese text is clipped, or dashed/empty boxes look like selection controls.
- Cause: independent component colors, fixed short rows, dense grids, ghost assets, or unexplained placeholders.
- Proof: representative 720p and 4K stills show near-white major surfaces, cropped glyphs, overlap, or ambiguous boxes.
- Repair: use `visualSystem.ts`, local yellow accents, stable boxes, dynamic readable font sizing, and no meaningful placeholder text.

## Output Locked

- Symptom: render cannot overwrite an existing MP4 or reports access denied.
- Cause: the file is open in a player/editor or the directory is not writable.
- Proof: exclusive open fails or preflight reports `OUTPUT_UNWRITABLE`.
- Repair: close the application holding the file or choose a new output path. Do not repeatedly overwrite a locked target.
