import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { ON } from './ui';

/**
 * The scans on a phone: a picker wheel, like the one a clock app sets its
 * alarms with. At rest it shows the scan on screen, underlined, and only a
 * hint of its neighbours above and below. Touch it and it opens to five
 * rows; flick through them and it comes to rest on one.
 *
 * As soon as it's touched an arrow comes in from the edge to point at the
 * middle row: this is the one you'd get. Resting on another scan doesn't load
 * it yet: a scan is a big download, and pausing on one on the way to another
 * mustn't start it. A line draws itself under the row instead. Leave it there
 * until the line is whole and that scan loads; the arrow goes, the line
 * stays, and the wheel closes round it. Move on first and nothing happens.
 *
 * The scrolling is the browser's own, snapped to rows, so it has the phone's
 * real momentum. What opens and closes is a mask: a window with feathered
 * edges whose size is eased (two registered properties in index.css), so rows
 * fade in and out of it rather than being cut off.
 */

/** A row's height, px. Five of them make the open wheel. */
const ROW = 36;
const ROWS = 5;
/** Scrolling has stopped when nothing has moved for this long, ms. */
const REST_MS = 140;
/** A row has to be left in the middle this long, finger off, before its scan loads, ms. */
const PICK_MS = 1200;
/** Open that much longer after coming to rest, so it doesn't snap shut under the thumb, ms. */
const CLOSE_MS = 650;
/** How far the rows move over for the arrow, px. */
const ARROW_ROOM = 24;

export interface WheelItem {
    id: string;
    title: string;
    /** A small tag after the title. */
    tag?: string;
    /** Not a scan but something to do (open a file): resting on it loads nothing, tapping it does it. */
    action?: () => void;
}

interface Props {
    items: WheelItem[];
    /** The scan on screen. */
    current: string;
    /** A row was left in the middle long enough: load it. */
    onPick: (id: string) => void;
    /** It opened, or closed again: what's around it can step back meanwhile. */
    onOpen?: (open: boolean) => void;
    label: string;
    className?: string;
}

const Wheel = ({ items, current, onPick, onOpen, label, className = '' }: Props) => {
    const scroller = useRef<HTMLDivElement>(null);
    const rows = useRef<(HTMLButtonElement | null)[]>([]);
    const [open, setOpen] = useState(false);
    /** The row in the middle. */
    const [middle, setMiddle] = useState(() => Math.max(0, items.findIndex((item) => item.id === current)));
    /** At rest on another scan, and counting down to loading it. */
    const [pending, setPending] = useState(false);
    /** The scan the count ran out on, underlined from then on, before the page has caught up. */
    const [chosen, setChosen] = useState<string | null>(null);
    const touching = useRef(false);
    const rest = useRef(0);
    const choose = useRef(0);
    const close = useRef(0);
    const frame = useRef(0);
    /** The arrow: there from the first touch until a scan is taken, or the wheel closes with nothing changed. */
    const arrow = open && chosen === null;
    const latest = useRef({ items, current, onPick, onOpen });
    useEffect(() => { latest.current = { items, current, onPick, onOpen }; });
    useEffect(() => { latest.current.onOpen?.(open); }, [open]);

    /** Each row by how far it is from the middle: smaller, fainter, and tipped back like the side of a drum. */
    const shape = useCallback(() => {
        const el = scroller.current;
        if (!el) return;
        const at = el.scrollTop / ROW;
        rows.current.forEach((row, i) => {
            if (!row) return;
            const away = i - at;
            const far = Math.min(Math.abs(away), 2.5);
            row.style.opacity = String(Math.max(0.3, 1 - 0.5 * far));
            row.style.transform = `perspective(320px) rotateX(${-away * 14}deg) scale(${1 - 0.07 * far})`;
        });
        setMiddle(Math.min(latest.current.items.length - 1, Math.max(0, Math.round(at))));
    }, []);

    /**
     * Nothing moving and no finger down. On the scan that's showing, or on
     * something to do, just close. On another scan, wait: if it's still there
     * when the time is up, take it. Any touch or movement meanwhile calls it off.
     */
    const settle = useCallback(() => {
        window.clearTimeout(rest.current);
        window.clearTimeout(choose.current);
        rest.current = window.setTimeout(() => {
            const el = scroller.current;
            if (!el || touching.current) return;
            // By id: the list is made afresh whenever the page renders, as it does all through a load.
            const at = () => {
                const { items: list } = latest.current;
                return list[Math.min(list.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)))];
            };
            const item = at();
            const shut = (ms: number) => {
                window.clearTimeout(close.current);
                close.current = window.setTimeout(() => setOpen(false), ms);
            };
            if (!item || item.action || item.id === latest.current.current) {
                shut(CLOSE_MS);
                return;
            }
            setPending(true);
            choose.current = window.setTimeout(() => {
                setPending(false);
                shut(CLOSE_MS / 2);
                if (touching.current || at()?.id !== item.id) return;
                setChosen(item.id);
                latest.current.onPick(item.id);
            }, PICK_MS - REST_MS);
        }, REST_MS);
    }, []);

    const wake = () => {
        window.clearTimeout(close.current);
        window.clearTimeout(choose.current);
        setPending(false);
        setChosen(null);
        setOpen(true);
    };

    // Round to the scan on screen: at once to begin with, eased when it changes from outside.
    // By its row, not by the list, which is made afresh on every render of the page.
    const row = items.findIndex((item) => item.id === current);
    const first = useRef(true);
    useLayoutEffect(() => {
        const el = scroller.current;
        if (!el || row < 0) return;
        const still = first.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        first.current = false;
        if (Math.abs(el.scrollTop - row * ROW) > 1) el.scrollTo({ top: row * ROW, behavior: still ? 'auto' : 'smooth' });
        shape();
    }, [row, shape]);

    useEffect(() => () => {
        window.clearTimeout(rest.current);
        window.clearTimeout(choose.current);
        window.clearTimeout(close.current);
        cancelAnimationFrame(frame.current);
    }, []);

    return (
        <nav
            aria-label={label}
            // Only the rows take a touch: the wheel's room overlaps what's above it.
            className={`wheel-mask pointer-events-none relative ${ON} ${className}`}
            style={{
                height: ROW * ROWS,
                // At rest the window is one row, feathered far enough for the next ones to show through faintly.
                '--wheel-open': `${open ? ROW * 1.5 : ROW * 0.5}px`,
                '--wheel-feather': `${open ? ROW : ROW * 0.85}px`,
            } as CSSProperties}
        >
            {/* In from beyond the screen's edge, and out again; the rows move over for it. */}
            <ArrowRight
                aria-hidden
                size={18}
                className={`absolute left-0 top-1/2 -mt-[9px] transition duration-300 ease-in-out motion-reduce:transition-none ${arrow ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0'}`}
            />
            <div
                ref={scroller}
                className="pointer-events-auto h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{
                    paddingBlock: ROW * 2,
                    // Closed, only the three middle rows take a touch: the rest is the scan's.
                    clipPath: open ? undefined : `inset(${ROW}px 0)`,
                }}
                onScroll={() => {
                    wake();
                    cancelAnimationFrame(frame.current);
                    frame.current = requestAnimationFrame(shape);
                    settle();
                }}
                onTouchStart={() => { touching.current = true; wake(); }}
                onTouchEnd={() => { touching.current = false; settle(); }}
                onTouchCancel={() => { touching.current = false; settle(); }}
                onPointerDown={wake}
                onPointerUp={settle}
            >
                {items.map((item, i) => {
                    const here = i === middle;
                    // Underlined: the scan that's showing, and the one being counted down to, as its line draws.
                    const settled = here && !item.action && (item.id === current || item.id === chosen);
                    const counting = here && pending;
                    return (
                        <button
                            key={item.id}
                            ref={(el) => { rows.current[i] = el; }}
                            type="button"
                            // Its own ink (ink.ts): the rows run over different parts of the scan.
                            data-ink-part
                            aria-current={item.id === current ? 'true' : undefined}
                            onClick={() => {
                                if (here) item.action?.();
                                else scroller.current?.scrollTo({ top: i * ROW, behavior: 'smooth' });
                            }}
                            className={`block w-full origin-left snap-center text-left text-base ${here ? 'font-medium' : ''}`}
                            style={{ height: ROW }}
                        >
                            <span
                                className="relative inline-block max-w-full truncate align-middle transition-transform duration-300 ease-in-out motion-reduce:transition-none"
                                style={{ transform: `translateX(${arrow ? ARROW_ROOM : 0}px)` }}
                            >
                                {item.title}
                                {item.tag && <span className="ml-2 font-mono text-[9px] tracking-widest uppercase opacity-60">{item.tag}</span>}
                                <span
                                    aria-hidden
                                    className="absolute inset-x-0 bottom-0 h-px origin-left bg-current transition-transform ease-linear"
                                    style={{
                                        transform: `scaleX(${settled || counting ? 1 : 0})`,
                                        transitionDuration: `${counting && !settled ? PICK_MS - REST_MS : 0}ms`,
                                    }}
                                />
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default Wheel;
