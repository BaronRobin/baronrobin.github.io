import { PptxSlide } from '../../deck/PptxSlide';
import type { SlideProps } from '../../deck/types';
import { DECK } from './deck';

/** Any slide of the deck: `phase` is its place in the web version (see order.ts). */
export const BachelorSlide = ({ phase = 0, step }: SlideProps) => (
    <PptxSlide slide={DECK.slides[phase]} media={DECK.media} step={step} />
);
