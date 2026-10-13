import mediaJson from './media.json';
import { preload, type ClipMedia, type StillMedia } from '../../deck/media';

/** Every file scripts/lautwasser-media.py cut out of the deck. */
export type MediaId = keyof typeof mediaJson;

const MEDIA = mediaJson as Record<MediaId, ClipMedia | StillMedia>;

export const clipMedia = (id: MediaId) => MEDIA[id] as ClipMedia;
export const stillMedia = (id: MediaId): StillMedia => MEDIA[id];

/** The file's own proportions, as a CSS aspect-ratio. */
export const ratioOf = (id: MediaId) => `${MEDIA[id].w} / ${MEDIA[id].h}`;

/** The same, as a number: width over height. */
export const aspectOf = (id: MediaId) => MEDIA[id].w / MEDIA[id].h;

/** Fetches a slide's stills and posters ahead of it (see src/deck/media.ts). */
export const preloadMedia = (ids: MediaId[]) => preload(ids.map((id) => MEDIA[id]));
