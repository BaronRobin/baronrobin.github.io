/**
 * Career timeline. One continuous month axis; tracks may overlap (the relticc
 * job ran alongside the Bachelor, as did both research-assistant posts).
 *
 * Dates live here, prose lives in i18n under `timeline.tracks.<id>`.
 * Rows render in the order below, which is by start date.
 */

export type TrackId =
    | 'bachelor'
    | 'hiwi-vr'
    | 'hiwi-photo'
    | 'relticc-jr'
    | 'relticc'
    | 'master';

export interface Track {
    id: TrackId;
    kind: 'study' | 'work';
    /** 'YYYY-MM', inclusive. */
    start: string;
    /** 'YYYY-MM', inclusive. null means ongoing. */
    end: string | null;
    /**
     * Planned finish for an ongoing track. Drawn as projection, never as
     * history; `end` stays null because it hasn't happened.
     */
    expectedEnd?: string;
    org: string;
    url: string;
}

const HS_KL = 'Hochschule Kaiserslautern';
const HS_KL_URL = 'https://www.hs-kl.de/';

export const tracks: Track[] = [
    // Started 2021; degree awarded April 2026. The October start is the usual
    // winter-semester date; adjust if it was a different intake.
    { id: 'bachelor', kind: 'study', start: '2021-10', end: '2026-04', org: HS_KL, url: HS_KL_URL },

    { id: 'hiwi-vr', kind: 'work', start: '2023-01', end: '2023-08', org: HS_KL, url: HS_KL_URL },
    { id: 'hiwi-photo', kind: 'work', start: '2023-09', end: '2024-08', org: HS_KL, url: HS_KL_URL },

    { id: 'relticc-jr', kind: 'work', start: '2024-10', end: '2025-01', org: 'relticc GmbH', url: 'https://relticc.com/' },
    { id: 'relticc', kind: 'work', start: '2025-02', end: '2026-06', org: 'relticc GmbH', url: 'https://relticc.com/' },

    // Three semesters from an April 2026 start. Solid to today, projected from
    // there to the planned finish.
    { id: 'master', kind: 'study', start: '2026-04', end: null, expectedEnd: '2027-09', org: HS_KL, url: HS_KL_URL },
];

/** Months since epoch, so spans and ticks share one integer axis. */
export const toMonths = (ym: string) => {
    const [y, m] = ym.split('-').map(Number);
    return y * 12 + (m - 1);
};

export const monthToDate = (months: number) =>
    new Date(Math.floor(months / 12), months % 12, 1);

const now = new Date();
export const NOW_MONTH = now.getFullYear() * 12 + now.getMonth();

/** Where a track actually got to. Today, for anything still running. */
export const trackEndMonth = (t: Track) => (t.end ? toMonths(t.end) : NOW_MONTH);

/** Where it's expected to get to. The same thing unless a plan is recorded. */
export const projectedEndMonth = (t: Track) =>
    t.expectedEnd ? toMonths(t.expectedEnd) : trackEndMonth(t);

export const AXIS_START = Math.min(...tracks.map((t) => toMonths(t.start)));
/**
 * A few months past the last thing on the axis so nothing sits flush right.
 * Must clear the furthest projected end by at least one month: spans draw to
 * `end + 1`, so an axis that stops exactly at the projection would let the bar
 * overflow its own container.
 */
export const AXIS_END = Math.max(NOW_MONTH, ...tracks.map(projectedEndMonth)) + 3;
export const AXIS_SPAN = AXIS_END - AXIS_START;

/** 0–1 position of a month on the axis. */
export const positionOf = (months: number) => (months - AXIS_START) / AXIS_SPAN;

/**
 * A track's [left, right] edges as fractions of the axis.
 *
 * The right edge is the month *after* the last one. A month occupies a width on
 * the ruler rather than a point, so a job running Jan–Aug covers eight
 * month-widths and butts up against one starting in September. Drawing it to
 * the August tick instead leaves a phantom one-month gap between roles that
 * were actually back-to-back.
 */
export const spanOf = (t: Track): [number, number] => [
    positionOf(toMonths(t.start)),
    positionOf(trackEndMonth(t) + 1),
];

/**
 * The projected tail, as [left, right] fractions. Null when there's nothing
 * planned beyond what already happened.
 */
export const projectedSpanOf = (t: Track): [number, number] | null => {
    const from = trackEndMonth(t) + 1;
    const to = projectedEndMonth(t) + 1;
    return to > from ? [positionOf(from), positionOf(to)] : null;
};

/**
 * Which tracks cover a given month, planned ones included; otherwise the
 * playhead finds nothing out in 2027.
 */
export const tracksAt = (months: number) =>
    tracks.filter((t) => months >= toMonths(t.start) && months <= projectedEndMonth(t));

/** True when this month is past what the track has actually done. */
export const isProjected = (t: Track, months: number) => months > trackEndMonth(t);
