# Style And Motion Reference

## Visual Direction

Use a professional Chinese CS kaoyan knowledge-account style:

- Background: warm parchment or light gray-white grid paper.
- Primary ink: deep blue-gray, not pure black.
- Accent: restrained warm yellow for labels, active progress, stamps, and key words.
- Cards: square or lightly rounded, thick structured borders, disciplined hard shadows.
- Avoid cheap PPT habits: random gradients, excessive icons, heavy blur, cluttered decorations, unrelated English labels, and inconsistent component styles.

## Current Proven Palette

Use a lowered-exposure parchment system. Avoid pure white paper and avoid making yellow the largest block on screen.

- Background: around `#eadfc9`
- Ink: `#263648`
- Muted text: around `#68645a`
- Card: around `#eddfc7`
- Surface: around `#f1e6d2`
- Paper: around `#e7d8be`
- Yellow: around `#e0aa24`, used for accents, meters, stamps, and tiny active marks
- Grid: around `#cbbd9f` at low opacity, no dense 8px high-frequency grid
- Red/green/blue: use as local semantic accents, not large fills
- Shadows: blue-gray rgba values around `rgba(38,54,72,0.18-0.32)`

Keep contrast firm enough for mobile viewing, but avoid pure black blocks that make the composition feel harsh. A useful still-frame target is no sampled near-white pixels above RGB 245 in major UI surfaces.

## Layout System

- Top header should state the real topic, such as `408 考研快讯`.
- Secondary labels must be meaningful Chinese study-context labels, not decorative English.
- Center content should be one dominant stage card.
- Bottom progress timeline should sit near the video bottom, remain semi-transparent, and move with video progress.
- In videos with many stages, the bottom timeline should avoid showing every label at once; show the current label and keep inactive tracks quiet.
- Keep each screen focused on one main idea.
- Avoid fixed-height text rows that clip Chinese descenders or long exam phrases; prefer higher line-height or short labels.
- Header badges and brand chips must have fixed dimensions, `box-sizing: border-box`, and single-line text so they cannot collide with neighboring metadata at 720p.
- Do not place ghosted screenshots, cover images, or watermarks behind badges, titles, or the 408 corner mark. If a low-opacity asset creates readable shapes, it is a穿帮 risk, not texture.
- Do not use dashed blue boxes, empty outlined rectangles, unlabeled mini modules, or debugging-style outlines in the program content unless they are clearly explained as part of the lesson. First-time viewers may read them as editor selection boxes or unfinished placeholders.
- Avoid cramped shorthand that forms accidental phrases. Prefer `方向调整` / `复习转向408` / `408体系` over adjacent fragments such as `调` + `408`.
- Do not use low-opacity future text, stamps, checklist labels, or subject cards as placeholders. Before the cue, either hide the readable content or show only neutral structure with no meaningful words.

## Animation Principles

Use motion to clarify the spoken structure:

- Stage transition: 0.3-0.6s, with slight slide/fade and settle.
- Big-section transitions should not cover the main content with a large banner unless the script explicitly pauses for a title card. Prefer a subtle line, rail shift, or scene-frame movement so chapter changes feel smooth instead of interruptive.
- Card reveal: stagger by spoken cue, not by equal arbitrary intervals.
- Keyword emphasis: 0.2-0.4s scale or stamp, then settle.
- Progress timeline: continuous fill plus node activation.
- Avoid making every element use the same fade/scale.

## Content-Type Motion Fit

Choose the motion grammar from the content type before designing scenes:

- Progress, planning, review-path, or schedule videos: rails, meters, nodes, checklists, plan rows, locks, route pins, and staged completion are appropriate.
- News or information-update videos: use a news grammar instead of a planning-progress grammar. Prefer headline cards, source/date tags, official-change fact cards, before/after comparison blocks, affected-audience cards, and a concise action note. Keep checklist/progress metaphors secondary.
- For admissions or policy updates, the audience should first understand "what changed", "source/context", "who is affected", and "what to do next"; route/progress visuals should only appear if the script is explicitly about a learning path.
- If a viewer says the piece feels like a progress/planning video rather than an information update, redesign the scene metaphors before adding more motion density.

## Reference-Level Motion Pass

When a user asks for richer reference-video motion, upgrade from generic card reveals to stage-specific primary actions. Each stage should have one obvious main action, one delayed secondary action, low-intensity continuous life, and a visible settle:

- Announcement: paper or notice sheet drops/pins in, stamp lands after the spoken cue, checklist strips are attached one by one, sweep calms down.
- Change: the old course is pushed aside, `408` travels along a rail and brakes into lock, route summary waits for the route cue before appearing.
- Impact: a pin moves from audience to target to 408, the track bends after the adjustment cue, flags follow with a 3-6 frame delay.
- Subjects: four subject modules insert into a study rail one by one; keep cards to core subject names so text never clips.
- Action: plan rows reorder after the condition cue, `现在抓紧` stamps only after that phrase starts, then the final frame holds quietly.

Do not add unrelated loops to make the scene feel busy. Continuing motion should come from meters, bottom highlights, shadow lag, tiny float, or a settling pulse on elements that are already meaningful.

## Audio-Led Cue Timing

Treat each SRT cue as a semantic event. Store visual points as `{text, cueStart, cueEnd}` and drive active state, meters, card reveals, and emphasis from those times.

- Do not use formulas like `stage.start + index * 0.55` or `(stage.end - stage.start) / points.length` for highlights.
- If one SRT cue contains several spoken list items, split the cue window across the listed items.
- A shell, rail, or placeholder may appear about 0.1s before speech for anticipation. The actual keyword, yellow confirmation, stamp, and CTA must wait until `cueStart`.
- Holds should keep a small progress, float, meter, or secondary action alive; avoid a burst of highlights followed by several seconds of stillness.
- When using reference motion, capture the rhythm as phases: setup, anticipation, reveal, emphasis hold, overlap, settle. Do not copy only the surface style.

For flicker-prone text:

- Avoid hard `textShadow` on small Chinese text.
- Prefer solid label backgrounds and stable line height.
- Avoid animating font size or letter spacing.
- Keep transform changes deterministic and frame-based.

## Publication Bar

The video is publishable when:

- Audio and visuals feel like the same timeline.
- No text flickers, jumps, or overflows.
- No ghosted source material, watermark-like remnants, or accidental overlays are visible.
- No element looks like an editor selection, debug helper, unfinished placeholder, or template residue.
- The visual system feels intentional and consistent.
- Every section has a distinct readable primary action plus restrained secondary motion.
- The final render matches the accepted preview direction.
