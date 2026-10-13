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
