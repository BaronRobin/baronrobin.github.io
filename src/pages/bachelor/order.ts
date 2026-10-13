import { CUT, type SlideDef } from '../../deck/types';
import { DECK } from './deck';
import { BachelorSlide } from './slides';

/*
 * The presentation in order, every slide the web version has: all of the
 * deck but 61-92 and 94, which the portfolio leaves out (see SKIP in
 * scripts/bachelor-deck.py).
 * Slides keep their deck number, `n`, for their notes and their chapter; the
 * counter shows their place here.
 *
 * The deck has no chapter slides as such; its questions ("Wo fange ich an?",
 * "Wie geht es weiter?") open each part, and the chapters follow them.
 */

export type ChapterId =
    | 'titel' | 'grillz' | 'idee' | 'scan' | 'wissen' | 'modell' | 'prototyp'
    | 'rendering' | 'material' | 'guss' | 'fazit';

/** Deck order, for the progress rail and the project page. */
export const CHAPTERS: ChapterId[] = [
    'titel', 'grillz', 'idee', 'scan', 'wissen', 'modell', 'prototyp',
    'rendering', 'material', 'guss', 'fazit',
];

/** The deck slide each chapter opens with. */
const CHAPTER_START: Record<ChapterId, number> = {
    titel: 1,
    grillz: 3,
    idee: 12,
    scan: 19,
    wissen: 26,
    modell: 30,
    prototyp: 39,
    rendering: 43,
    material: 56,
    guss: 59,
    fazit: 93,
};

const chapterOf = (n: number) => CHAPTERS.filter((c) => CHAPTER_START[c] <= n).pop()!;

/** A slide's id, by its deck number, which its notes are keyed by: bachelor.notes.s07. */
const slideId = (n: number) => `s${String(n).padStart(2, '0')}`;

export const SLIDES: SlideDef<ChapterId, string>[] = DECK.slides.map((slide, i) => ({
    id: slideId(slide.n),
    chapter: chapterOf(slide.n),
    // The deck cuts from slide to slide.
    transition: CUT,
    phase: i,
    steps: slide.steps,
    media: [...new Set(slide.elements.flatMap((el) => ('media' in el ? [el.media] : [])))],
    Render: BachelorSlide,
}));

/** A chapter's first and last slide, as places in the web version (1-based). */
export const chapterSlides = (chapter: ChapterId): [number, number] => {
    const places = SLIDES.flatMap((s, i) => (s.chapter === chapter ? [i + 1] : []));
    return [places[0], places[places.length - 1]];
};
