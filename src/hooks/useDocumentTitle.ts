import { useEffect } from 'react';

const SUFFIX = 'Robin Baron';

/**
 * Sets the tab title per route.
 *
 * The app is a HashRouter, so every route serves the same URL to crawlers and
 * per-route OG previews aren't achievable, but humans still read tab titles,
 * history and bookmarks, and those were all identical before this.
 *
 * Pass undefined while data is still resolving to leave the title alone.
 */
const useDocumentTitle = (title?: string) => {
    useEffect(() => {
        if (!title) return;
        const previous = document.title;
        document.title = title === SUFFIX ? SUFFIX : `${title} | ${SUFFIX}`;
        return () => { document.title = previous; };
    }, [title]);
};

export default useDocumentTitle;
