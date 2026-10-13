import type { ClipMedia, StillMedia } from './media';

/*
 * A deck read straight out of PowerPoint (see scripts/bachelor-deck.py), as
 * PptxSlide draws it. Boxes are fractions of the 16:9 frame, as everywhere
 * in src/deck; lengths (type, insets, line widths, shadows) are points on the
 * 960pt-wide slide.
 */

export type Box = [number, number, number, number];

/** How a build brings an element in: at once, or fading over `ms`. */
interface Built {
    /** The click that brings it in; absent when it is there from the start. */
    step?: number;
    fx?: 'appear' | 'fade';
    ms?: number;
}

interface Placed extends Built {
    /** Stable across a morph: the same picture or the same words keep their key. */
    key: string;
    rect: Box;
    /** Degrees clockwise, about the box's centre. */
    rot?: number;
    flipH?: boolean;
    flipV?: boolean;
}

export interface PptxShadow {
    x: number;
    y: number;
    blur: number;
    color: string;
}

export interface PptxPicture extends Placed {
    kind: 'pic' | 'video';
    media: string;
    /** What PowerPoint cropped away: left, top, right, bottom, as fractions of the picture. */
    crop?: [number, number, number, number];
    opacity?: number;
    shadow?: PptxShadow;
    alt?: string;
    loop?: boolean;
    muted?: boolean;
    volume?: number;
}

export interface PptxRun {
    /** A line break is a run of '\n'. */
    text: string;
    size: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    href?: string;
}

/** Line and paragraph spacing: a multiple of single spacing, or points. */
export type Spacing = ['pct' | 'pt', number];

export interface PptxPara {
    align: 'l' | 'ctr' | 'r' | 'just' | 'dist';
    line: Spacing;
    /** The size an empty paragraph takes up. */
    size: number;
    runs: PptxRun[];
    before?: Spacing;
    after?: Spacing;
    bullet?: string;
    marL?: number;
    indent?: number;
    /** A source line: the whole paragraph links there. */
    href?: string;
}

export interface PptxText extends Placed {
    kind: 'text';
    inset: [number, number, number, number];
    anchor: 't' | 'ctr' | 'b';
    wrap: boolean;
    paras: PptxPara[];
}

export interface PptxBox extends Placed {
    kind: 'box';
    fill?: string;
    line?: { w: number; color: string };
}

export interface PptxLine extends Built {
    kind: 'line';
    key: string;
    from: [number, number];
    to: [number, number];
    w: number;
    color: string;
    head?: string;
    tail?: string;
}

export type PptxElement = PptxPicture | PptxText | PptxBox | PptxLine;

export interface PptxSlideData {
    /** Its number in the presentation, which the web version may not show every slide of. */
    n: number;
    bg: string;
    transition: { type: 'cut' } | { type: 'morph'; ms: number };
    steps?: number;
    elements: PptxElement[];
}

export interface PptxDeck {
    slides: PptxSlideData[];
    media: Record<string, ClipMedia | StillMedia>;
}
