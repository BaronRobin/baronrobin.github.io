import mediaJson from './media.json';

/** Every file scripts/lautwasser-media.py cut out of the deck. */
export type MediaId = keyof typeof mediaJson;

export interface ClipMedia {
    src: string;
    poster: string;
    w: number;
    h: number;
    duration: number;
    /** Only set on the clips that kept their sound. */
    audio?: boolean;
    /** The deck's own playback volume for this clip, 0-1. */
    volume?: number;
}

export interface StillMedia {
    src: string;
    w: number;
    h: number;
}

const MEDIA = mediaJson as Record<MediaId, ClipMedia | StillMedia>;

export const clipMedia = (id: MediaId) => MEDIA[id] as ClipMedia;
export const stillMedia = (id: MediaId): StillMedia => MEDIA[id];

/** The file's own proportions, as a CSS aspect-ratio. */
export const ratioOf = (id: MediaId) => `${MEDIA[id].w} / ${MEDIA[id].h}`;

/** The same, as a number: width over height. */
export const aspectOf = (id: MediaId) => MEDIA[id].w / MEDIA[id].h;

/**
 * Fetches what a slide shows first, its stills and its clips' posters, so
 * they are in the cache before the slide arrives rather than filling in
 * during its transition.
 */
export const preloadMedia = (ids: MediaId[]) => {
    for (const id of ids) {
        const media = MEDIA[id];
        new Image().src = 'poster' in media ? media.poster : media.src;
    }
};
