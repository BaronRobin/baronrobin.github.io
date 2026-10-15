import type { SlideDef } from '../../deck/types';
import { COVER, FADE, IDEA_STEPS, PULL_RIGHT, PULL_UP, PUSH_UP, STATES, type ChapterId } from './data';
import type { MediaId } from './media';
import {
    Aufbau, Aufnahmen, Casefilm, Datenvis, Effekt, Effekte, Idee, Intro, Laerm, Logik, Moodboard, Outro,
    Personifikation, Perspektive, PiApp, Raum, Spektral24, Spektral32, Stationen, TdEffect, TdNetwork,
    Titel, Umsetzung, Vergleich, Voegel, Weitere, Wellen,
} from './slides';

/*
 * Slides 11-13 share one topic under lautwasser.slides, as do 14 and 17.
 * Slides 20 and 21 are the deck's morph: one group, two phases.
 * The deck's slide 22, the 3D-printed stele, is left out, so from 23 on the
 * presenter counts one lower than the numbers here.
 */

/** The presentation in order, numbered as in the deck. */
export const SLIDES: SlideDef<ChapterId, MediaId>[] = [
    /* 1 */ { id: 'titel', chapter: 'titel', transition: FADE, lead: 'title', media: ['title'], Render: Titel },
    /* 2 */ { id: 'intro', chapter: 'titel', transition: PULL_UP, media: ['intro-wave'], Render: Intro },
    /* 3 */ { id: 'wellen', chapter: 'herleitung', transition: COVER, lead: 'sound', media: ['sound'], Render: Wellen },
    /* 4 */ { id: 'laerm', chapter: 'herleitung', transition: PULL_RIGHT, media: [], Render: Laerm },
    /* 5 */ { id: 'voegel', chapter: 'herleitung', transition: PUSH_UP, media: ['bird-wave', 'bird', 'bird-drawing'], Render: Voegel },
    /* 6 */ { id: 'casefilm', chapter: 'casefilm', transition: COVER, media: ['casefilm'], Render: Casefilm },
    /* 7 */ { id: 'idee', chapter: 'konzept', transition: PULL_RIGHT, media: IDEA_STEPS, Render: Idee },
    /* 8 */ { id: 'datenvis', chapter: 'konzept', transition: PUSH_UP, media: ['bubbles', 'datavis'], Render: Datenvis },
    /* 9 */ { id: 'stationen', chapter: 'prozess', transition: COVER, media: ['stations-map'], Render: Stationen },
    /* 10 */ { id: 'aufnahmen', chapter: 'prozess', transition: PULL_RIGHT, media: ['rec-left', 'rec-main', 'rec-right'], Render: Aufnahmen },
    /* 11 */ { id: 'spektral-24', topic: 'spektral', chapter: 'prozess', transition: PUSH_UP, lead: 'spectral-24', media: ['spectral-24'], Render: Spektral24 },
    /* 12 */ { id: 'spektral-32', topic: 'spektral', chapter: 'prozess', transition: PUSH_UP, lead: 'spectral-32', media: ['spectral-32'], Render: Spektral32 },
    /* 13 */ { id: 'vergleich', topic: 'spektral', chapter: 'prozess', transition: PUSH_UP, lead: 'listen-24', media: ['listen-32', 'listen-24'], Render: Vergleich },
    /* 14 */ { id: 'td-netzwerk', topic: 'td', chapter: 'prozess', transition: PUSH_UP, lead: 'td-network', media: ['td-network'], Render: TdNetwork },
    /* 15 */ { id: 'effekt', chapter: 'prozess', transition: PUSH_UP, lead: 'effect', media: ['effect'], Render: Effekt },
    /* 16 */ { id: 'effekte', chapter: 'prozess', transition: PUSH_UP, media: ['fx-a', 'fx-b', 'fx-c'], Render: Effekte },
    /* 17 */ { id: 'td-effekt', topic: 'td', chapter: 'prozess', transition: PUSH_UP, lead: 'td-effect', media: ['td-effect'], Render: TdEffect },
    /* 18 */ { id: 'perspektive', chapter: 'prozess', transition: PUSH_UP, media: ['persona-phone'], Render: Perspektive },
    /* 19 */ { id: 'personifikation', chapter: 'prozess', transition: PUSH_UP, media: ['persona-face', 'persona-fx'], Render: Personifikation },
    /* 20 */ { id: 'pi', chapter: 'prozess', transition: PUSH_UP, group: 'pi', phase: 0, media: ['pi-pc', 'pi-knob', 'pi-board', 'pi-sketch'], Render: PiApp },
    /* 21 */ { id: 'app', chapter: 'prozess', transition: PUSH_UP, group: 'pi', phase: 1, media: ['pi-pc', 'pi-phone', 'app-ui'], Render: PiApp },
    /* 23 */ { id: 'logik', chapter: 'prozess', transition: PUSH_UP, media: STATES, Render: Logik },
    /* 24 */ {
        id: 'moodboard',
        chapter: 'ausstellung',
        transition: COVER,
        media: ['mood-sea', 'mood-wave', 'mood-knobs', 'mood-poster', 'mood-headphones', 'mood-turntable', 'mood-ripple', 'mood-installation', 'mood-oscylator'],
        Render: Moodboard,
    },
    /* 25 */ { id: 'aufbau', chapter: 'ausstellung', transition: PUSH_UP, media: ['build'], Render: Aufbau },
    /* 26 */ { id: 'umsetzung', chapter: 'ausstellung', transition: PUSH_UP, media: ['room'], Render: Umsetzung },
    /* 27 */ { id: 'raum', chapter: 'ausstellung', transition: PUSH_UP, media: ['showcase'], Render: Raum },
    /* 28 */ { id: 'weitere', chapter: 'fazit', transition: COVER, media: ['outlook-projection', 'outlook-mics', 'outlook-rathaus'], Render: Weitere },
    /* 29 */ { id: 'outro', chapter: 'outro', transition: PULL_RIGHT, lead: 'outro', media: ['outro'], Render: Outro },
];
