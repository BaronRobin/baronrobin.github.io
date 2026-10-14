import { useSyncExternalStore } from 'react';

/**
 * Whether one of the viewer's tools (?tools) is open. For the site's bar,
 * which lives outside the viewer: over an open tool it takes the panels' dark.
 */
let open = false;
const listeners = new Set<() => void>();

export const setToolOpen = (value: boolean) => {
    if (value === open) return;
    open = value;
    for (const listener of listeners) listener();
};

export const useToolOpen = () => useSyncExternalStore(
    (listener) => {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    },
    () => open,
);
