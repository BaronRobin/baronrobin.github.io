import { createContext } from 'react';

export interface Playback {
    /**
     * In the deck: whether this slide is the one on screen. Null on a project
     * page, where every clip watches its own visibility instead.
     */
    active: boolean | null;
    /** In the deck: the sound switch. A project page has no global switch. */
    sound: boolean;
    /**
     * The one clip allowed to be heard, by media id. Several clips on a slide
     * can carry sound (Lautwasser's 24/32-bit comparison is two), and hearing
     * them at once would defeat the comparison.
     */
    solo: string | null;
    setSolo: (id: string | null) => void;
}

export const PlaybackContext = createContext<Playback>({
    active: null,
    sound: false,
    solo: null,
    setSolo: () => {},
});
