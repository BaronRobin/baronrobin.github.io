/**
 * Every version of this site that has existed, newest first.
 *
 * `archive` is the path a past version is served from under public/archive/.
 * null marks the one you're currently looking at.
 *
 * Copy lives in i18n under `changelog.versions.<id>`; only dates and paths
 * belong here.
 *
 * Two deliberate departures from byte-faithfulness:
 *
 * 1. Archives load media by absolute path, so they pull from the *current*
 *    library rather than carrying their own copy; duplicating hundreds of
 *    megabytes per version wasn't worth it.
 * 2. v1 is rebuilt with the withdrawn projects removed. An archive shouldn't be
 *    a back door to work that was deliberately pulled, and leaving them in also
 *    left broken images where their media had moved.
 *
 * Archiving the outgoing version (how v2 was done): extract its commit with
 * `git archive <commit> | tar -x -C <dir>`, link node_modules in, and build
 * with a config that spreads vite.config.ts and sets `base: '/archive/vN/'`
 * and `publicDir: false` (code only, since media comes from the live library).
 * Copy the output to public/archive/vN/.
 */

export interface SiteVersion {
    id: string;
    label: string;
    /** 'YYYY-MM', rendered in the viewer's locale. */
    date: string;
    /**
     * Points at index.html rather than the directory. A bare directory URL is
     * served by GitHub Pages but swallowed by Vite's SPA fallback in dev, which
     * makes the archive silently render as the current site.
     */
    archive: string | null;
}

export const versions: SiteVersion[] = [
    { id: 'v2-1', label: '2.1', date: '2026-09', archive: null },
    { id: 'v2', label: '2.0', date: '2026-09', archive: '/archive/v2/index.html' },
    { id: 'v1', label: '1.0', date: '2025-12', archive: '/archive/v1/index.html' },
    { id: 'v0', label: '0.1', date: '2021-11', archive: '/archive/v0/index.html' },
];

export const currentVersion = versions.find((v) => v.archive === null) ?? versions[0];
