import { useEffect, useState } from 'react';

/**
 * What the viewer's controls share: plain type straight on the scan, each
 * group of it, and each label in a group, in the ink its ground calls for.
 *
 * The ink is one colour, --ink, set by .splat-ink (index.css): the theme's by
 * default, which is right on the page's own ground, and for a group straight
 * on the scan dark or light by the picture under it (ink.ts). Nothing round
 * the letters: a halo was tried and looked wrong. Whole class names, for
 * Tailwind to find.
 */

/** On each group of controls: sets its ink. */
export const INK = 'splat-ink';
/** Mono labels: the controls' voice. */
export const LABEL = 'font-mono text-[11px] tracking-widest uppercase';
/** A control that's on, and one that isn't. */
export const ON = 'text-[color:var(--ink)]';
export const OFF = 'text-[color:color-mix(in_srgb,var(--ink)_70%,transparent)] hover:text-[color:var(--ink)]';
/** A toggle: underlined while on. */
export const toggle = (on: boolean) => `uppercase underline-offset-4 transition-colors disabled:opacity-30 ${on ? `${ON} underline` : OFF}`;

/**
 * The tools' panels (?tools): white type on a flat, see-through dark, so the
 * scan still shows through. Not inked: on its own dark ground the type is
 * always white.
 */
export const PANEL_BG = 'bg-black/45';
/** The tuning panel's width, px. The rail and the toggles keep clear of it. */
export const TUNE_WIDTH = 320;
/** How much of the scan's light the panels' dark lets through, for the ink of what sits on them (ink.ts). */
export const PANEL_KEEP = 0.55;
export const PANEL_TEXT = 'text-white [color-scheme:dark]';
/** How long the panels take to slide in or out, ms. */
export const SLIDE_MS = 400;
export const SLIDE = 'transition-transform duration-[400ms] ease-in-out motion-reduce:transition-none';

/**
 * Something that slides in and out: mounted while open and for the slide out
 * after, shown one frame after mounting, so the slide in has a start to run from.
 */
export const usePresence = (open: boolean, ms = SLIDE_MS) => {
    const [mounted, setMounted] = useState(open);
    const [shown, setShown] = useState(false);
    useEffect(() => {
        if (open) {
            setMounted(true);
            // Two frames: the first paints it where it starts.
            let second = 0;
            const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setShown(true)); });
            return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
        }
        setShown(false);
        const timer = setTimeout(() => setMounted(false), ms);
        return () => clearTimeout(timer);
    }, [open, ms]);
    return { mounted: mounted || open, shown };
};

/**
 * False on a panel's first paint, true from the next frame: with `shown` from
 * usePresence, a panel whose code was still loading when it was switched on
 * slides in too, rather than appearing where it ends.
 */
export const useEntered = () => {
    const [entered, setEntered] = useState(false);
    useEffect(() => {
        let second = 0;
        const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setEntered(true)); });
        return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
    }, []);
    return entered;
};
