import deckJson from './deck.json';
import { preload, type ClipMedia, type StillMedia } from '../../deck/media';
import type { PptxDeck } from '../../deck/pptx';

/** The deck as scripts/bachelor-deck.py read it out of the presentation. */
export const DECK = deckJson as unknown as PptxDeck;

export const clipMedia = (name: string) => DECK.media[name] as ClipMedia;
export const stillMedia = (name: string): StillMedia => DECK.media[name];

/** Fetches a slide's pictures and posters ahead of it. */
export const preloadMedia = (names: string[]) => preload(names.flatMap((name) => (DECK.media[name] ? [DECK.media[name]] : [])));
