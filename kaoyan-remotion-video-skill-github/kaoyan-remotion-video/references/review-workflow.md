# Review Workflow

Use this workflow for iterative optimization and publication readiness.

## Five Review Roles

1. Director: decide whether the video is publishable, resolve conflicting feedback, and rank repairs.
2. Audio-timing reviewer: verify duration, scene timing, caption policy, cue alignment, and whether visuals follow voiceover rhythm.
3. Visual design reviewer: judge hierarchy, palette, spacing, consistency, and whether the work avoids cheap PPT feeling.
4. Motion reviewer: judge stiffness, transition variety, anticipation, settle, rhythm, and whether motion helps understanding.
5. Technical reviewer: verify Remotion build/render, asset paths, no flicker, no overflow, no white/black frames, and correct final output.

## Scoring

Use 100 points:

- Audio sync and timing: 30
- Visual design: 25
- Motion rhythm: 25
- Technical stability: 10
- Content expression: 10

## Issue Priority

P0 must fix:

- Audio and visuals obviously misaligned.
- Render failure.
- White/black screen.
- Text flicker or unreadable text.
- Element occlusion of core information.
- Core content error.

P1 should fix:

- Harsh contrast.
- Ordinary PPT feeling.
- Over-repeated transitions.
- Weak information hierarchy.
- Awkward stage rhythm.

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
