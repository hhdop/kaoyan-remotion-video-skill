# Style And Motion Reference

## Visual Direction

Use a professional Chinese CS kaoyan knowledge-account style:

- Background: warm parchment or light gray-white grid paper.
- Primary ink: deep blue-gray, not pure black.
- Accent: restrained warm yellow for labels, active progress, and key words.
- Cards: square or lightly rounded, thick structured borders, disciplined hard shadows.
- Avoid cheap PPT habits: random gradients, excessive icons, heavy blur, cluttered decorations, unrelated English labels, and inconsistent component styles.

## Current Proven Palette

- Background: `#f4eddf`
- Ink: `#263648`
- Muted text: `#756f64`
- Card: `#fff9ec`
- Yellow: `#f0bd32`
- Grid: `#ded3bd`
- Red accent only for rare marks: `#ef3b2d`
- Shadows: blue-gray rgba values around `rgba(38,54,72,0.32-0.58)`

Keep contrast firm enough for mobile viewing, but avoid pure black blocks that make the composition feel harsh.

## Layout System

- Top header should state the real topic, such as `408考研进度自查`.
- Secondary labels must be meaningful Chinese study-context labels, not decorative English.
- Center content should be one dominant stage card.
- Bottom progress timeline should sit near the video bottom, remain semi-transparent, and move with video progress.
- Keep each screen focused on one main idea.

## Animation Principles

Use motion to clarify the spoken structure:

- Stage transition: 0.3-0.6s, with slight slide/fade and settle.
- Card reveal: stagger by spoken cue, not by equal arbitrary intervals.
- Keyword emphasis: 0.2-0.4s scale or stamp, then settle.
- Progress timeline: continuous fill plus node activation.
- Avoid making every element use the same fade/scale.

For flicker-prone text:

- Avoid hard `textShadow` on small Chinese text.
- Prefer solid label backgrounds and stable line height.
- Avoid animating font size or letter spacing.
- Keep transform changes deterministic and frame-based.

## Publication Bar

The video is publishable when:

- Audio and visuals feel like the same timeline.
- No text flickers, jumps, or overflows.
- The visual system feels intentional and consistent.
- Every section has at least one readable visual action.
- The final render matches the accepted preview direction.
