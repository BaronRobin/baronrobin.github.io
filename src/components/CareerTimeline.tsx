import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    tracks,
    toMonths,
    tracksAt,
    monthToDate,
    positionOf,
    spanOf,
    projectedSpanOf,
    projectedEndMonth,
    isProjected,
    AXIS_START,
    AXIS_SPAN,
    NOW_MONTH,
    type Track,
    type TrackId,
} from '../data/timeline';

/**
 * Career timeline.
 *
 * One timeline, not two. A month ruler runs down the middle; degrees are
 * measured off above it and jobs below, each as an I-----I span. The ruler
 * never goes away; hovering a span brightens the months it covers instead of
 * hiding them, so you keep the "when" while you read the "what".
 */

/** Vertical space reserved per lane, so a span growing on hover never shifts the
 *  page. Sized to hold the gap, the hit area and an open label above it. */
const LANE_H = 92;
/** Gap between the ruler and the near edge of a span's hit area. Enough that
 *  the two lanes read as separate from the ruler rather than crushed onto it. */
const AXIS_GAP = 22;
/** Hit area per span. Tall enough to hold an open cap, and to actually be
 *  pointable; a zero-height button has no hit box at all. */
const HIT_H = 40;
/** How far a span colliding with one already in its lane is pushed out. */
const SUBLANE_OFFSET = 22;

const RULE_H = 4;
const CAP_H = 20;
const CAP_OPEN_H = 32;

/**
 * The scale's labels, sized by arithmetic rather than measurement: they are
 * monospace, whose glyphs are 0.6em wide, so a label's width follows from its
 * text. Years are 12px; NOW is 11px, tracked out by 0.1em.
 */
const YEAR_PX = 12;
const NOW_PX = 11;
const NOW_TRACKING = 0.1;
/** Clear ruler either side of a label. */
const LABEL_GAP = 7;
/** Least room between two labels before the lesser one gives way. */
const LABEL_MIN_SPACE = 6;
/** The arrowhead at the ruler's right end, which a label mustn't sit on. */
const ARROW_W = 7;

/** Half the width the ruler breaks for, around a label's centre. */
const halfBreak = (text: string, px: number, tracking = 0) => (text.length * (0.6 + tracking) * px) / 2 + LABEL_GAP;

const MONTHS = Array.from({ length: AXIS_SPAN + 1 }, (_, i) => AXIS_START + i);

/**
 * Greedy sub-lane packing. Nothing in the current data collides except the
 * Bachelor ending and the Master starting in the same month, but solving it
 * generally beats fudging a date.
 */
const subLaneOf = (track: Track, lane: Track[]) => {
    const start = toMonths(track.start);
    const end = projectedEndMonth(track);
    const taken = lane
        .filter((o) => o !== track && toMonths(o.start) <= end && projectedEndMonth(o) >= start)
        .map((o) => lane.indexOf(o));
    let sub = 0;
    while (taken.includes(sub)) sub += 1;
    return Math.min(sub, 1);
};

interface SpanProps {
    track: Track;
    index: number;
    subLane: number;
    open: boolean;
    /** Clicked: stays open after the pointer leaves, so its links can be reached. */
    pinned: boolean;
    dimmed: boolean;
    still: boolean;
    /** True when the previous span in this lane ends where this one starts. */
    joinLeft: boolean;
    onOpen: (id: TrackId | null) => void;
    onPin: (id: TrackId) => void;
}

/**
 * One entry, drawn as a dimension line: a rule with an end cap at each date.
 *
 * The label only exists while open, so it can't collide with a sibling; it
 * just has to stay inside the container, which is measured rather than guessed
 * (string lengths differ per language, and a fraction-of-axis heuristic knows
 * nothing about pixels).
 */
const Span = ({ track, index, subLane, open, pinned, dimmed, still, joinLeft, onOpen, onPin }: SpanProps) => {
    const { t, i18n } = useTranslation();
    const spanRef = useRef<HTMLButtonElement>(null);
    const labelRef = useRef<HTMLSpanElement>(null);
    const [shift, setShift] = useState(0);

    const above = track.kind === 'study';
    const [left, solidRight] = spanOf(track);
    const projected = projectedSpanOf(track);
    const right = projected ? projected[1] : solidRight;
    // Where the solid part ends, as a fraction of the button's own width. A
    // track that starts after today has no width yet, and 0/0 would write NaN
    // into its style until the month comes round.
    const solidFraction = right > left ? (solidRight - left) / (right - left) : 1;

    useEffect(() => {
        const el = spanRef.current;
        const label = labelRef.current;
        if (!open || !el || !label) return;

        const measure = () => {
            const parent = el.offsetParent as HTMLElement | null;
            if (!parent) return;
            const half = label.offsetWidth / 2;
            const centre = el.offsetLeft + el.offsetWidth / 2;
            const clamped = Math.min(Math.max(centre, half), parent.clientWidth - half);
            setShift(clamped - centre);
        };

        const observer = new ResizeObserver(measure);
        observer.observe(el);
        observer.observe(label);
        return () => observer.disconnect();
    }, [open, i18n.language]);

    const ink = above
        ? 'bg-purple-600 dark:bg-purple-400'
        : 'bg-slate-500 dark:bg-slate-400';
    // currentColor drives the hatch, so the gradient itself needs no variants.
    const hatchInk = above
        ? 'text-purple-600 dark:text-purple-400'
        : 'text-slate-500 dark:text-slate-400';

    const motionProps = still
        ? { transition: { duration: 0 } }
        : { transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } };

    return (
        <motion.button
            ref={spanRef}
            type="button"
            initial={{ opacity: 0, scaleX: 0.86 }}
            whileInView={{ opacity: 1, scaleX: 1 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            // Staggered so the timeline draws itself once, on first view. No
            // scroll scrubbing: the section must not own the scrollbar.
            transition={still ? { duration: 0 } : { duration: 0.55, delay: index * 0.09, ease: [0.22, 1, 0.36, 1] }}
            style={{
                left: `${left * 100}%`,
                width: `${Math.max(right - left, 0.004) * 100}%`,
                originX: 0,
                [above ? 'bottom' : 'top']: AXIS_GAP + subLane * SUBLANE_OFFSET,
                height: HIT_H,
            }}
            className="absolute min-w-[12px] outline-none group rounded focus-visible:ring-2 focus-visible:ring-purple-500"
            onPointerEnter={(e) => { if (e.pointerType !== 'touch') onOpen(track.id); }}
            // Without this, moving off a span but staying inside the timeline left
            // it highlighted; only leaving the whole container cleared it. Guarded
            // on `open` so a leave can't cancel the span the pointer just entered.
            onPointerLeave={(e) => { if (e.pointerType !== 'touch' && open) onOpen(null); }}
            // :focus-visible, not plain focus: tapping a button focuses it, so a
            // bare onFocus opens the span before the click arrives and the click
            // then toggles it straight back shut.
            onFocus={(e) => { if (e.target.matches(':focus-visible')) onOpen(track.id); }}
            onBlur={() => { if (open) onOpen(null); }}
            // Hover only previews; a click (or tap, or Enter) pins the span
            // open, so the pointer can leave it for the links in the readout.
            onClick={() => onPin(track.id)}
            aria-label={t(`timeline.tracks.${track.id}.title`)}
            aria-pressed={pinned}
            data-span
        >
            {/* The rule, only across what actually happened. Its weight is
                constant in every state: a dimension line that thickens when you
                point at it has stopped being one. The caps carry the emphasis. */}
            <motion.span
                animate={{ opacity: dimmed ? 0.35 : 1 }}
                {...motionProps}
                style={{ right: `${(1 - solidFraction) * 100}%`, height: RULE_H }}
                className={`absolute left-0 top-1/2 -translate-y-1/2 ${ink}`}
            />

            {/* The projection: the same band, carried on. Identical height to the
                solid rule and square-ended at both joins, so the two read as one
                continuous line rather than a line and a box; the diagonal hatch
                is what says "planned, not done". */}
            {projected && (
                <motion.span
                    animate={{ opacity: dimmed ? 0.35 : 1 }}
                    {...motionProps}
                    style={{
                        left: `${solidFraction * 100}%`,
                        height: RULE_H,
                        backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0 2px, transparent 2px 5px)',
                    }}
                    className={`absolute right-0 top-1/2 -translate-y-1/2 ${hatchInk}`}
                />
            )}

            {/* End caps: the I---I that makes the start and end dates explicit.
                A span that starts where the previous one ended drops its left cap:
                the two would sit on the same pixel and read as one doubled mark
                rather than a single clean divider. */}
            {(joinLeft
                ? ([['right', 'right-0']] as const)
                : ([['left', 'left-0'], ['right', 'right-0']] as const)
            ).map(([side, cls]) => (
                <motion.span
                    key={side}
                    animate={{ height: open ? CAP_OPEN_H : CAP_H, opacity: dimmed ? 0.35 : 1 }}
                    {...motionProps}
                    className={`absolute ${cls} top-1/2 -translate-y-1/2 w-[2px] ${ink}`}
                />
            ))}

            {open && (
                <span
                    ref={labelRef}
                    // The clamp goes on `left`, not a transform: a transform moves
                    // the text but leaves the layout box behind, and it's the box
                    // that extends the page's scrollWidth.
                    style={{ left: `calc(50% + ${shift}px)` }}
                    className={`absolute -translate-x-1/2 whitespace-nowrap text-sm font-semibold tracking-wide uppercase text-slate-900 dark:text-white pointer-events-none ${above ? 'bottom-full mb-2' : 'top-full mt-2'}`}
                >
                    <motion.span
                        initial={still ? false : { opacity: 0, y: above ? 4 : -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={still ? { duration: 0 } : { duration: 0.2, delay: 0.04 }}
                        className="block"
                    >
                        {t(`timeline.tracks.${track.id}.title`)}
                    </motion.span>
                </span>
            )}
        </motion.button>
    );
};

const CareerTimeline = () => {
    const { t, i18n } = useTranslation();
    /** The span under the pointer or keyboard focus. */
    const [openTrack, setOpenTrack] = useState<TrackId | null>(null);
    /** The span last clicked, shown whenever nothing else is being previewed. */
    const [pinned, setPinned] = useState<TrackId | null>(null);
    const [focusedMonth, setFocusedMonth] = useState<number | null>(null);
    const [still, setStill] = useState(false);
    const [coarse, setCoarse] = useState(false);
    /** The ruler's length in px: whether two labels fit side by side is a question of pixels. */
    const [axisWidth, setAxisWidth] = useState(0);
    const lanesRef = useRef<HTMLDivElement>(null);
    /** Where a touch went down, so a drag can be told from a tap. */
    const touchStartX = useRef<number | null>(null);
    const draggingRef = useRef(false);

    useEffect(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
        const touch = window.matchMedia('(hover: none), (pointer: coarse)');
        const sync = () => { setStill(reduce.matches); setCoarse(touch.matches); };
        sync();
        reduce.addEventListener('change', sync);
        touch.addEventListener('change', sync);
        return () => {
            reduce.removeEventListener('change', sync);
            touch.removeEventListener('change', sync);
        };
    }, []);

    // A layout effect so the observer is attached before first paint; its
    // first report comes straight after, with the initial width.
    useLayoutEffect(() => {
        const el = lanesRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => setAxisWidth(el.clientWidth));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const openDash = useCallback((id: TrackId | null) => setOpenTrack(id), []);
    const pin = useCallback((id: TrackId) => setPinned((current) => (current === id ? null : id)), []);
    const release = useCallback(() => { setPinned(null); setOpenTrack(null); }, []);

    // Escape lets go of a pinned span wherever focus happens to be.
    useEffect(() => {
        if (pinned === null) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') release(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [pinned, release]);

    // Sweeping the timeline moves a playhead: whatever it crosses was running
    // at that moment, which is how concurrency becomes readable without having
    // to hover each span in turn.
    const trackPointer = useCallback((clientX: number) => {
        const box = lanesRef.current?.getBoundingClientRect();
        if (!box || box.width === 0) return;
        const f = (clientX - box.left) / box.width;
        if (f < 0 || f > 1) { setFocusedMonth(null); return; }
        setFocusedMonth(Math.min(AXIS_START + Math.round(f * AXIS_SPAN), AXIS_START + AXIS_SPAN));
    }, []);

    const studyLane = tracks.filter((tr) => tr.kind === 'study');
    const workLane = tracks.filter((tr) => tr.kind === 'work');

    const activeId = openTrack ?? pinned;
    const active = activeId ? tracks.find((tr) => tr.id === activeId) ?? null : null;
    const activeFrom = active ? toMonths(active.start) : 0;
    const activeTo = active ? projectedEndMonth(active) : 0;

    // On a touch device the playhead rests at today even before anyone drags it,
    // so the handle is visible and obviously grabbable. Nothing dims until it
    // actually moves, though; see `anyLit`.
    const playhead = active !== null ? null : focusedMonth ?? (coarse ? NOW_MONTH : null);
    const atPlayhead = playhead !== null ? tracksAt(playhead) : [];
    const isLit = (id: TrackId) =>
        active ? active.id === id : atPlayhead.some((tr) => tr.id === id);
    const anyLit = active !== null || focusedMonth !== null;

    const monthName = (m: number) =>
        monthToDate(m).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short' });

    const running = tracksAt(NOW_MONTH);
    const readoutTracks = active ? [active] : focusedMonth !== null ? atPlayhead : running;

    // Only label years whose January sits on the axis; the first year starts
    // mid-way (the Bachelor began in October), so its label would be drawn off
    // the left edge of the ruler.
    const years = Array.from(new Set(MONTHS.map((m) => Math.floor(m / 12))))
        .filter((y) => y * 12 >= AXIS_START && y * 12 <= AXIS_START + AXIS_SPAN);

    // NOW outranks the years: a year that would touch it, or the year before
    // it on a narrow screen, is left out rather than drawn on top. So is one
    // that would hang off either end, or sit on the arrowhead.
    const nowLabel = t('timeline.now');
    const nowAt = positionOf(NOW_MONTH + 1);
    const nowHalf = halfBreak(nowLabel, NOW_PX, NOW_TRACKING);
    const yearHalf = halfBreak('0000', YEAR_PX);
    const shownYears = years.reduce<number[]>((kept, year) => {
        if (axisWidth === 0) return [...kept, year];
        const x = positionOf(year * 12) * axisWidth;
        // The text may reach a few px past the ruler's start, into the page's
        // margin; nothing may reach the arrowhead.
        const inside = x - (yearHalf - LABEL_GAP) >= -LABEL_GAP && x + yearHalf <= axisWidth - ARROW_W;
        const clearOfNow = Math.abs(x - nowAt * axisWidth) >= yearHalf + nowHalf + LABEL_MIN_SPACE;
        const last = kept[kept.length - 1];
        const clearOfLast = last === undefined || x - positionOf(last * 12) * axisWidth >= 2 * yearHalf + LABEL_MIN_SPACE;
        return inside && clearOfNow && clearOfLast ? [...kept, year] : kept;
    }, []);

    // The ruler breaks around each label. A mask rather than a patch of
    // background behind the text: the section is translucent, so no solid
    // colour matches it, and a mismatched patch reads as a box. Stops are
    // positioned in % of the axis, widened by each label's half-width in px.
    const breaks = [
        ...shownYears.map((year) => [positionOf(year * 12), yearHalf] as const),
        [nowAt, nowHalf] as const,
    ].sort((a, b) => a[0] - b[0]);
    const rulerMask = `linear-gradient(to right, ${[
        '#000 0',
        ...breaks.flatMap(([at, half]) => [
            `#000 calc(${at * 100}% - ${half}px)`,
            `transparent calc(${at * 100}% - ${half}px)`,
            `transparent calc(${at * 100}% + ${half}px)`,
            `#000 calc(${at * 100}% + ${half}px)`,
        ]),
        '#000 100%',
    ].join(', ')})`;

    return (
        <div
            className="max-w-6xl mx-auto"
            onPointerLeave={(e) => { if (e.pointerType !== 'touch') openDash(null); }}
            onClick={(e) => {
                // A click on empty timeline lets go of the pinned span; one on a
                // link in the readout is what pinning was for, so it doesn't.
                if (!(e.target as HTMLElement).closest('[data-span], a')) release();
            }}
        >
            {/* Readout, directly under the section heading. It replaced a static
                subtitle, so the line under the title now says what you're pointing
                at instead of describing the section. */}
            <div className="mb-10 min-h-[5.5rem] text-center">
                <div className="font-mono text-xs tracking-widest uppercase text-slate-400 dark:text-slate-600 mb-2">
                    {active
                        ? `${activeFrom === activeTo ? monthName(activeFrom) : `${monthName(activeFrom)} – ${monthName(activeTo)}`}${activeTo > NOW_MONTH ? ` (${t('timeline.expected')})` : ''}`
                        : monthToDate(focusedMonth ?? NOW_MONTH).toLocaleDateString(i18n.language, { year: 'numeric', month: 'long' })}
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-sm">
                    {readoutTracks.map((track, i) => (
                        <span key={track.id} className="flex items-center gap-3">
                            {i > 0 && <span className="hidden sm:inline text-slate-300 dark:text-slate-700">·</span>}
                            <span>
                                <span className="text-slate-900 dark:text-white font-medium">
                                    {t(`timeline.tracks.${track.id}.title`)}
                                </span>
                                {/* Only when the playhead is driving. With a span open
                                    the date range already carries the marker, and the
                                    container's pointer-move keeps focusedMonth set
                                    even then. */}
                                {active === null && focusedMonth !== null && isProjected(track, focusedMonth) && (
                                    <span className="text-slate-400 dark:text-slate-600">
                                        {' '}({t('timeline.expected')})
                                    </span>
                                )}
                                <span className="text-slate-500 dark:text-slate-400">
                                    {' · '}{t(`timeline.tracks.${track.id}.role`)}
                                </span>
                                {/* The organisation is the longest part of the line and
                                    the least load-bearing; at 390px two concurrent
                                    entries with it wrapped to 128px and shoved the
                                    whole timeline down. With one entry (a pinned
                                    span) it fits, and it is the link people pin for. */}
                                <span className={`${readoutTracks.length === 1 ? 'inline' : 'hidden sm:inline'} text-slate-500 dark:text-slate-400`}>
                                    {' @ '}
                                    <a
                                        href={track.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline underline-offset-2 decoration-slate-300 dark:decoration-white/20 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                    >
                                        {track.org}
                                    </a>
                                </span>
                            </span>
                        </span>
                    ))}
                    {readoutTracks.length === 0 && (
                        <span className="text-slate-400 dark:text-slate-600">·</span>
                    )}
                </div>
            </div>

            <div
                ref={lanesRef}
                className="relative"
                // pan-y, not none: a vertical swipe still scrolls the page past
                // the section, while a horizontal one comes here as a scrub.
                // Taking the whole gesture would be scroll-jacking on mobile.
                style={{ height: LANE_H * 2, touchAction: 'pan-y' }}
                onPointerMove={(e) => {
                    if (e.pointerType !== 'touch') { trackPointer(e.clientX); return; }
                    if (touchStartX.current === null) return;
                    // A few px of slop so a tap on a span isn't read as a scrub.
                    if (!draggingRef.current && Math.abs(e.clientX - touchStartX.current) < 8) return;
                    draggingRef.current = true;
                    release();
                    trackPointer(e.clientX);
                }}
                onPointerDown={(e) => {
                    if (e.pointerType !== 'touch') return;
                    touchStartX.current = e.clientX;
                    draggingRef.current = false;
                }}
                onPointerUp={() => { touchStartX.current = null; }}
                onPointerCancel={() => { touchStartX.current = null; draggingRef.current = false; }}
                onPointerLeave={(e) => { if (e.pointerType !== 'touch') setFocusedMonth(null); }}
            >
                {/* Study lane, measured off above the ruler */}
                <div className="absolute inset-x-0" style={{ top: 0, height: LANE_H }}>
                    <div className="relative w-full h-full">
                        {studyLane.map((track, i) => (
                            <Span
                                key={track.id}
                                track={track}
                                joinLeft={i > 0 && toMonths(track.start) === projectedEndMonth(studyLane[i - 1]) + 1}
                                index={i}
                                subLane={subLaneOf(track, studyLane)}
                                open={activeId === track.id}
                                pinned={pinned === track.id}
                                dimmed={anyLit && !isLit(track.id)}
                                still={still}
                                onOpen={openDash}
                                onPin={pin}
                            />
                        ))}
                    </div>
                </div>

                {/* The axis: one line, running out of the past and carrying on
                    past the last thing on it, which is what the arrowhead says.
                    This was seventy-five month ticks. At that density they read
                    as a picket fence rather than a scale, and lighting forty of
                    them at once to mark a hovered span turned the whole axis
                    into a block of colour. The years carry the same information
                    and the lit range below says the same thing in one mark. */}
                <div className="absolute inset-x-0" style={{ top: LANE_H }}>
                    <div className="relative w-full">
                        {/* The line, and the stretch of it an open span covers (one
                            segment in place of the forty-odd ticks that used to
                            light), both broken around the labels by the mask. The
                            box is a few px tall because a mask also clips whatever
                            hangs outside the element it is on. */}
                        <div
                            aria-hidden
                            style={{ maskImage: rulerMask, WebkitMaskImage: rulerMask }}
                            className="absolute inset-x-0 top-0 h-2 -translate-y-1/2"
                        >
                            <div className="absolute inset-x-0 top-1/2 h-px bg-slate-300 dark:bg-white/20" />
                            {active !== null && (
                                <div
                                    data-lit-range
                                    style={{
                                        left: `${positionOf(activeFrom) * 100}%`,
                                        width: `${(positionOf(activeTo + 1) - positionOf(activeFrom)) * 100}%`,
                                    }}
                                    className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-purple-500 dark:bg-purple-400 transition-all duration-200"
                                />
                            )}
                        </div>
                        {/* Borders rather than an SVG: an arrowhead is three
                            numbers, and this way it inherits the line's colour. */}
                        <span
                            aria-hidden
                            style={{ borderLeftWidth: ARROW_W }}
                            className="absolute right-0 top-0 -translate-y-1/2 w-0 h-0 border-y-4 border-y-transparent border-l-slate-300 dark:border-l-white/20"
                        />

                        {/* The scale sits *on* the line, in the gaps the mask leaves. */}
                        {shownYears.map((year) => (
                            <span
                                key={year}
                                style={{ left: `${positionOf(year * 12) * 100}%` }}
                                className="absolute top-0 -translate-x-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 dark:text-slate-500"
                            >
                                {year}
                            </span>
                        ))}
                        <span
                            style={{ left: `${nowAt * 100}%` }}
                            className="absolute top-0 -translate-x-1/2 -translate-y-1/2 text-[11px] font-mono tracking-widest uppercase text-purple-500 dark:text-purple-400"
                        >
                            {nowLabel}
                        </span>
                    </div>
                </div>

                {/* Work lane, measured off below */}
                <div className="absolute inset-x-0" style={{ top: LANE_H, height: LANE_H }}>
                    <div className="relative w-full h-full">
                        {workLane.map((track, i) => (
                            <Span
                                key={track.id}
                                track={track}
                                joinLeft={i > 0 && toMonths(track.start) === projectedEndMonth(workLane[i - 1]) + 1}
                                index={studyLane.length + i}
                                subLane={subLaneOf(track, workLane)}
                                open={activeId === track.id}
                                pinned={pinned === track.id}
                                dimmed={anyLit && !isLit(track.id)}
                                still={still}
                                onOpen={openDash}
                                onPin={pin}
                            />
                        ))}
                    </div>
                </div>
                {/* Today. Fixed and permanent, unlike the playhead, which is
                    transient and follows the pointer. Drawn in two pieces that
                    stop short of the ruler, so it doesn't run through NOW. */}
                <span
                    aria-hidden
                    style={{ left: `${nowAt * 100}%`, height: LANE_H - 9 }}
                    className="absolute top-0 w-px -translate-x-1/2 bg-purple-500/25 dark:bg-purple-400/25 pointer-events-none"
                >
                    <motion.span
                        animate={still ? { opacity: 1 } : { opacity: [1, 0.35, 1] }}
                        transition={still ? { duration: 0 } : { repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                        className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400"
                    />
                </span>
                <span
                    aria-hidden
                    style={{ left: `${nowAt * 100}%`, top: LANE_H + 9 }}
                    className="absolute bottom-0 w-px -translate-x-1/2 bg-purple-500/25 dark:bg-purple-400/25 pointer-events-none"
                />

                {playhead !== null && (
                    <span
                        aria-hidden
                        style={{ left: `${positionOf(playhead) * 100}%` }}
                        // z-20: the active indicator reads over everything.
                        className="absolute inset-y-0 w-px -translate-x-1/2 pointer-events-none z-20"
                    >
                        {/* In two pieces that stop short of the ruler, like today's
                            line: at rest on a phone it stands right beside NOW. */}
                        <span className="absolute top-0 inset-x-0 bg-purple-500 dark:bg-purple-400" style={{ height: LANE_H - 9 }} />
                        <span className="absolute bottom-0 inset-x-0 bg-purple-500 dark:bg-purple-400" style={{ top: LANE_H + 9 }} />
                        {/* Grip, touch only. Purely an affordance; the drag is handled
                            on the container, so grabbing anywhere along the timeline
                            works just as well as grabbing the handle itself. It hangs
                            from the foot of the playhead rather than sitting on the
                            ruler, where at rest (today) it covered NOW and the year
                            beside it. */}
                        {coarse && (
                            <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full bg-purple-500 dark:bg-purple-400 shadow-md" style={{ top: '100%' }}>
                                <span className="block w-3 h-3 border-x-2 border-white/80" />
                            </span>
                        )}
                    </span>
                )}
            </div>

        </div>
    );
};

export default CareerTimeline;
