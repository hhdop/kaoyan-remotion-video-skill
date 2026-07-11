# Review Workflow

Use this workflow for iterative optimization and publication readiness.

## Six Review Roles

1. Director: decide whether the video is publishable, resolve conflicting feedback, and rank repairs.
2. Audio-timing reviewer: verify duration, scene timing, caption policy, cue alignment, and whether visuals follow voiceover rhythm.
3. Visual design reviewer: judge hierarchy, palette, spacing, consistency, and whether the work avoids cheap PPT feeling.
4. Motion reviewer: judge stiffness, transition variety, anticipation, settle, rhythm, and whether motion helps understanding.
5. Technical reviewer: verify preflight codes, Composition discovery, Studio URL when requested, render report, FFprobe streams, asset paths, no flicker, no overflow, no white/black frames, and correct final output.
6. User-view reviewer: watch as a first-time kaoyan student, flag anything that looks like editor residue, unfinished placeholders, confusing shorthand, a type mismatch such as news feeling like a planning-progress video, or a visual that can be misread before the script explains it.

## Scoring

Use 100 points:

- Audio sync and timing: 30
- Visual design: 25
- Motion rhythm: 25
- Technical stability: 10
- Content expression and user clarity: 10

## Issue Priority

P0 must fix:

- Audio and visuals obviously misaligned.
- Render failure.
- White/black screen.
- Empty main-content panel or accidental paper-color flash at a chapter boundary.
- Text flicker or unreadable text.
- Element occlusion of core information.
- Core content error.
- Missing audio stream, wrong dimensions/FPS, duration mismatch, or incomplete frame sequence.

P1 should fix:

- Harsh contrast.
- Ordinary PPT feeling.
- Over-repeated transitions.
- Weak information hierarchy.
- Awkward stage rhythm.
- Content-type mismatch, such as using route/checklist/progress grammar for a news-style information update where headline/source/fact/impact grammar would be clearer.
- Visuals that look like selection boxes, empty placeholders, debug overlays, or accidental editing artifacts.
- Transparent old/new chapter text overlapping during a handoff.
- Shorthand labels that can combine into misleading phrases such as "调408" when a full phrase is needed.

P2 optional:

- Extra micro-interactions.
- Small decorative refinements.
- More memorable but nonessential transitions.

## Issue Format

For each issue include:

- Time or screen position.
- Problem.
- Evidence.
- Repair.
- Acceptance standard.

## Iteration Rule

When a user reports a problem, repair both the current video and the reusable standard when the lesson generalizes. Examples:

- Flickering text means update style rules to avoid small-text hard shadows.
- Confusing export means update output contract and render naming.
- Stiff transitions means update motion principles and helper patterns.
- A user asking whether a selected region is wrong means add a user-view review pass and repair both the ambiguous local visual and the general rule that allowed it.
- A user says a style fits progress/planning but not news means record a content-type motion-fit rule and redesign future news videos around headline, source, fact, impact, and action beats.
