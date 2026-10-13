/** A video cut from a deck, as its script lists it. */
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

/** A picture cut from a deck. */
export interface StillMedia {
    src: string;
    w: number;
    h: number;
}

export const isClip = (media: ClipMedia | StillMedia): media is ClipMedia => 'poster' in media;

/**
 * Fetches what a slide shows first, its stills and its clips' posters, so
 * they are in the cache before the slide arrives rather than filling in
 * during its transition.
 */
export const preload = (items: (ClipMedia | StillMedia)[]) => {
    for (const media of items) {
        new Image().src = isClip(media) ? media.poster : media.src;
    }
};
