import { createContext } from 'react';
import type { MediaId } from './media';

export interface Playback {
    /**
     * In the deck: whether this slide is the one on screen. Null on the case
     * study, where every clip watches its own visibility instead.
     */
    active: boolean | null;
    /** In the deck: the sound switch. The case study has no global switch. */
    sound: boolean;
    /**
     * The one clip allowed to be heard. Several clips on a slide can carry
     * sound (the 24/32-bit comparison is two), and hearing them at once would
     * defeat the comparison.
     */
    solo: MediaId | null;
    setSolo: (id: MediaId | null) => void;
}

export const PlaybackContext = createContext<Playback>({
    active: null,
    sound: false,
    solo: null,
    setSolo: () => {},
});
