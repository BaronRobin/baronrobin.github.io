import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Just enough of where the visitor has been on this site for "back" to go
 * the right way: whether there's an earlier page of ours to go back to, and
 * which page led to this one.
 */

let current: string | null = null;
let previous: string | null = null;

/** Keeps the record; rendered once, in App. A replaced page doesn't add a step. */
export const PathTracker = () => {
    const { pathname } = useLocation();
    const type = useNavigationType();
    useEffect(() => {
        if (pathname === current) return;
        if (type !== 'REPLACE') previous = current;
        current = pathname;
    }, [pathname, type]);
    return null;
};

/** The page of ours that led to `here`, or null if the visitor arrived at `here` first. */
export const cameFrom = (here: string) => (current === here ? previous : current);

/** Whether the browser's back would stay on this site: the router numbers its history entries from 0. */
export const hasHistory = () => ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0;
