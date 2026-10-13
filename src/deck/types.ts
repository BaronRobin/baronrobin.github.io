import type { ComponentType, ReactNode } from 'react';

/* What a deck hands the presenter (Deck.tsx). */

/**
 * How a slide arrives. `dir` is the way the movement goes, as PowerPoint names
 * it: push "u" means the new slide comes up from below and pushes the old one
 * out of the top. A cut has no movement at all.
 */
export interface Transition {
    type: 'push' | 'pull' | 'cover' | 'fade' | 'cut';
    dir: 'u' | 'd' | 'l' | 'r';
}

export const CUT: Transition = { type: 'cut', dir: 'l' };

export interface SlideProps {
    /** Within a group: which of its slides this is. */
    phase?: number;
    /** How many of the slide's builds are in. */
    step: number;
}

export interface SlideDef<Chapter extends string = string, Media extends string = string> {
    /** Unique in the deck. Its speaker notes, once written, are <ns>.notes.<id>. */
    id: string;
    /** Its key under <ns>.slides, for the phone caption, where that isn't the id. */
    topic?: string;
    chapter: Chapter;
    /** How the slide arrives, from the deck. Going back plays it in reverse. */
    transition: Transition;
    /** The clip that speaks once sound is switched on. */
    lead?: Media;
    /**
     * Slides that are one picture in several states, as a morph shows them:
     * they share a group, so the stage keeps them mounted from one to the
     * next, and Render animates to the phase it is given.
     */
    group?: string;
    phase?: number;
    /** Clicks before the slide is complete. */
    steps?: number;
    /** Stills and posters to fetch before the slide comes up. */
    media: Media[];
    Render: ComponentType<SlideProps>;
}

/**
 * The deck's chrome, as class lists: every colour the presenter draws with
 * sits here, so that each deck can wear its own.
 */
export interface DeckTheme {
    /** The whole view: background, type colour and face. */
    root: string;
    /** Behind the slide, seen while one slides over another. */
    stage: string;
    /** The way back to the project page. */
    link: string;
    counter: string;
    /** The round buttons: sound, notes, full screen. */
    button: string;
    /** The current chapter's name, on the rail and in the phone caption. */
    accent: string;
    /** The other chapters' names on the rail. */
    chapter: string;
    /** The notes line and the phone caption's notes. */
    notes: string;
    /** The key hints under the rail. */
    faint: string;
    /** The phone's "turn your phone" hint. */
    hint: string;
    bar: {
        current: string;
        seen: string;
        ahead: string;
    };
}

export interface DeckConfig<Chapter extends string, Media extends string> {
    /** Where the deck's copy lives: <ns>.chapters.*, <ns>.slides.<topic>.topic, <ns>.notes.<id>. */
    ns: string;
    /** The project page; the slides are under <base>/slides. */
    base: string;
    slides: SlideDef<Chapter, Media>[];
    /** Deck order, for the progress rail. */
    chapters: Chapter[];
    theme: DeckTheme;
    /** The mark in the middle of the top bar. */
    brand?: ReactNode;
    preload: (media: Media[]) => void;
    /** Whether any clip has sound worth a switch; without, the deck shows none. */
    sound?: boolean;
}
