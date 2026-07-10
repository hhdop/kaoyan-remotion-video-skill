# Iteration Notes

Use this file to record reusable lessons from real video production.

## 2026-07-02

- Installed and inspected `disney-animation-rule-skill`: useful for reviewing stiff or unclear procedural motion.
- Installed and inspected `ruler-progress-render`: useful as inspiration for progress/timeline animation, not a replacement for the main educational video.
- Attempted to clone/download `vibe-motion/skills` to inspect audio-input workflows. GitHub API was rate limited, `git clone` was reset, and zip download ended early. Do not assume full audio-to-video support until repository inspection succeeds.
- Current working assumption: keep this skill audio-first and Remotion-based. Treat vibe-motion skills as optional review/render helpers.
- Generalized flicker lesson: avoid hard `textShadow` on small Chinese text; use solid label backgrounds with fixed line height.

## 2026-07-08

- Mistake: treated a rendered MP4 preview as enough while the user expected live browser preview. Fix: when browser preview is requested or questioned, start Studio, verify the port, open `http://localhost:<port>/Main` in the in-app browser, and screenshot/inspect it.
- Mistake: repeatedly retried Remotion render even though Windows Smart App Control blocked bundled `remotion.exe/ffmpeg.exe/ffprobe.exe`. Fix: recognize exit `0xC0E90002`, verify with external FFmpeg, render muted image sequence, then mux frames plus voiceover with trusted FFmpeg.
- Mistake: allowed a low-opacity `cover.jpg` ghost layer near the 408 corner badge, causing a visible穿帮. Fix: remove non-informational ghost assets; still/crop-check corners and badge areas after visual changes.
- Mistake: did not account for duplicate `Path`/`PATH` in the Codex PowerShell environment before starting Studio. Fix: if `Start-Process` throws duplicate key errors, temporarily clear one process-level path variable, start Studio, then restore it.
- Mistake: judged a route diagram as semantically correct while a first-time viewer could read its dashed/empty boxes and cramped `调` + `408` labels as editor residue or unfinished placeholders. Fix: add a user-view review role, replace ambiguous fragments with full labels, avoid blank module previews, and drive route motion with cue hold progress instead of completing on cue entry.
- Feedback: the rail/checklist/meter style works better for progress, planning, review-path, and schedule videos than for news or information-update videos. Fix: classify content type before design; for news-style updates, use headline/source/fact/impact/action beats instead of making the whole video feel like a plan tracker.
- Mistake: copied a project and tried to lean on an old/junctioned `node_modules`, which made Remotion webpack cache cleanup and dependency scripts fragile. Fix: install real local dependencies for each deliverable project; if `pnpm` postinstall cannot find `node`, prepend the bundled Node `bin` directory to `PATH` and rerun offline after packages are present.
- Mistake: let Chrome Headless Shell discovery/download become a late render blocker. Fix: during preflight, locate an installed Chrome/Playwright headless shell and set `Config.setBrowserExecutable(...)` before composition, still, or render checks when network or permission restrictions exist.
- Mistake: used `getStage(sec + visualLeadSeconds)` to drive the whole readable scene. This made a new chapter appear before the voiceover arrived. Fix: choose readable stage content with real `sec`; reserve `sec + visualLeadSeconds` only for non-text anticipation such as shells, camera/card motion, or empty rails.
- Mistake: treated low-opacity future labels, rows, cards, or stamps as acceptable placeholders. Viewers read them as clutter or premature conclusions. Fix: hide future readable text entirely; if the layout needs stability, use blank structure with no meaningful words or leave the area empty until the cue.
- Mistake: used a large chapter-transition banner and all bottom rail labels in a long planning video, making big-section switches feel hard and the screen too full. Fix: use a light transition accent, soften or shorten chapter wipes, and show only the current bottom rail label when many stages exist.
- Mistake: allowed the left stage summary to accumulate all prior cue labels, which made late scenes feel packed. Fix: show only the current cue/subpoint on the left, while the numeric counter communicates progress.
