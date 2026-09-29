import type { CSSProperties } from 'react';

/*
 * A slide is laid out the way PowerPoint laid it out: every element sits in a
 * box given as fractions of the 16:9 frame, straight from the deck's geometry,
 * and type is sized in `cqw` against the stage, so a slide scales as one piece
 * exactly like the original instead of reflowing.
 */

/** A box on the slide, as fractions of its width and height: x, y, w, h. */
export type Rect = [number, number, number, number];

export const at = ([x, y, w, h]: Rect): CSSProperties => ({
    position: 'absolute',
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: `${w * 100}%`,
    height: `${h * 100}%`,
});

/** PowerPoint points to stage-relative units: the slide is 960pt wide. */
export const pt = (points: number) => `${(points * 100) / 960}cqw`;
