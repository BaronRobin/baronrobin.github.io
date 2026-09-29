import type { Rect } from './geometry';
import type { MediaId } from './media';

/*
 * The deck's content that isn't layout: chapters, how slides arrive, and the
 * figures behind the noise chart. Numbers are the presentation's own.
 */

export type ChapterId = 'titel' | 'herleitung' | 'casefilm' | 'konzept' | 'prozess' | 'ausstellung' | 'fazit' | 'outro';

/** Deck order, for the progress rail. */
export const CHAPTERS: ChapterId[] = ['titel', 'herleitung', 'casefilm', 'konzept', 'prozess', 'ausstellung', 'fazit', 'outro'];

/**
 * How a slide arrives. `dir` is the way the movement goes, as PowerPoint names
 * it: push "u" means the new slide comes up from below and pushes the old one
 * out of the top.
 */
export interface Transition {
    type: 'push' | 'pull' | 'cover' | 'fade';
    dir: 'u' | 'd' | 'l' | 'r';
}

export const PUSH_UP: Transition = { type: 'push', dir: 'u' };
export const COVER: Transition = { type: 'cover', dir: 'l' };
export const PULL_RIGHT: Transition = { type: 'pull', dir: 'r' };
export const PULL_UP: Transition = { type: 'pull', dir: 'u' };
export const FADE: Transition = { type: 'fade', dir: 'l' };

/* The noise chart (slide 4) -------------------------------------------------- */

export type BarColour = 'paper' | 'ink' | 'magenta';

export interface NoiseRow {
    /** Key under lautwasser.decibels.sources. */
    source: string;
    db: string;
    /** For the case study's plain chart: the level the bar stands for. */
    level: number;
    /** Centre line of the bar on the slide, and its segments as [from, to]. */
    y: number;
    bars: [number, number][];
    colour: BarColour;
    dbAt: [number, number];
    sourceAt: [number, number];
}

/**
 * The deck draws each bar as one or two 16pt lines; they keep their overlaps
 * and gaps on the slide, since that is how it reads. Water is in blue, the
 * birds in magenta.
 */
export const NOISE: NoiseRow[] = [
    { source: 'rocket', db: '150dB', level: 150, y: 0.1778, bars: [[-0.0021, 0.296], [0.2317, 0.6968]], colour: 'paper', dbAt: [0.7018, 0.165], sourceAt: [0.8053, 0.1622] },
    { source: 'jet', db: '130dB', level: 130, y: 0.2387, bars: [[0.0549, 0.626]], colour: 'paper', dbAt: [0.6309, 0.2257], sourceAt: [0.8052, 0.225] },
    { source: 'takeoff', db: '120dB', level: 120, y: 0.2984, bars: [[-0.0021, 0.5928]], colour: 'paper', dbAt: [0.5958, 0.2873], sourceAt: [0.8056, 0.2829] },
    { source: 'rock', db: '115dB', level: 115, y: 0.356, bars: [[0.0359, 0.2853], [0.1461, 0.5853]], colour: 'paper', dbAt: [0.5902, 0.3431], sourceAt: [0.8056, 0.3422] },
    { source: 'mower', db: '85dB', level: 85, y: 0.4164, bars: [[-0.0008, 0.5113]], colour: 'paper', dbAt: [0.5163, 0.4029], sourceAt: [0.8056, 0.4029] },
    { source: 'traffic', db: '80dB', level: 80, y: 0.4787, bars: [[0.0083, 0.12], [0.12, 0.5068]], colour: 'paper', dbAt: [0.5106, 0.4607], sourceAt: [0.8324, 0.4606] },
    { source: 'birds', db: '70 - 90dB', level: 90, y: 0.5284, bars: [[0.0143, 0.4779], [0.4838, 0.5321]], colour: 'magenta', dbAt: [0.5346, 0.5126], sourceAt: [0.8324, 0.513] },
    { source: 'tv', db: '60dB', level: 60, y: 0.5809, bars: [[0.1055, 0.3475], [0.3475, 0.4577]], colour: 'paper', dbAt: [0.4621, 0.5669], sourceAt: [0.8083, 0.564] },
    { source: 'talk', db: '50dB', level: 50, y: 0.6352, bars: [[0, 0.4353]], colour: 'paper', dbAt: [0.4363, 0.6223], sourceAt: [0.808, 0.617] },
    { source: 'river', db: '50dB', level: 50, y: 0.692, bars: [[0, 0.296], [0.1913, 0.4341]], colour: 'ink', dbAt: [0.4355, 0.6757], sourceAt: [0.808, 0.674] },
    { source: 'brook', db: '35dB', level: 35, y: 0.7449, bars: [[-0.0021, 0.4156]], colour: 'ink', dbAt: [0.4205, 0.7328], sourceAt: [0.808, 0.7294] },
    { source: 'clock', db: '30dB', level: 30, y: 0.7985, bars: [[0.0359, 0.4106]], colour: 'paper', dbAt: [0.4156, 0.7889], sourceAt: [0.8083, 0.7831] },
    { source: 'tap', db: '20dB', level: 20, y: 0.8541, bars: [[0, 0.389]], colour: 'paper', dbAt: [0.393, 0.8391], sourceAt: [0.8083, 0.8377] },
];

export const BAR_HEX: Record<BarColour, string> = { paper: '#F3F3F3', ink: '#0051F3', magenta: '#EC02FA' };
export const BAR_TEXT: Record<BarColour, string> = { paper: 'text-lw-paper', ink: 'text-lw-ink', magenta: 'text-lw-magenta' };

export const NOISE_SOURCE_URL = 'https://www.variotherm.com/de/service/blog/was-hoeren-wir-wie-laut';

/* The concept (slide 7) ---------------------------------------------------- */

/** The four steps, left to right, each a looping tile with its word over it. */
export const IDEA_STEPS: MediaId[] = ['step-record', 'step-analyse', 'step-visualise', 'step-control'];

/* The stations (slide 9) ----------------------------------------------------- */

/** Where the map sits on the slide. */
export const STATIONS_MAP_AT: Rect = [0.0143, 0.2193, 0.9715, 0.7558];

/** The deck's dots on the map: where the Lauter could still be recorded. Top-left corners. */
export const STATIONS: [number, number][] = [[0.2478, 0.226], [0.2594, 0.3066], [0.3547, 0.8157], [0.4602, 0.8752], [0.3198, 0.5991]];

/** Each dot's box on the slide: a circle, 22 units across in the 1920-wide frame. */
export const STATION_DOT: [number, number] = [0.0116, 0.0206];

/* The moodboard (slide 24) --------------------------------------------------- */

/**
 * The palette as the deck's swatches show it, top to bottom, which is also
 * what the slides use. The deck's own labels name it as it was planned:
 * #0044fd, #b4023f, #121212, #f3f3f3.
 */
export const PALETTE = ['#0051f3', '#ec02fa', '#121212', '#f3f3f3'];

/* The installation's states (slide 23) ------------------------------------------ */

/** Left to right, in the order of lautwasser.slides.logik.states. */
export const STATES: MediaId[] = ['state-interactive', 'state-idle', 'state-cutscene', 'state-transition'];
