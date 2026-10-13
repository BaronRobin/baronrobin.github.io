import { useMemo, useRef } from 'react';
import type { Scale } from './scale';
import { LABEL, ON } from './ui';

/**
 * A lens ring, cut open and laid flat: the scale engraved round a focus ring,
 * unrolled into a strip on the window's edge. You don't move a handle along
 * it. You turn the ring: the scale slides past a fixed index in the middle,
 * and its ends fade out of sight the way a barrel curves away.
 *
 * Like a focus ring's, the scale isn't even: the small values, where the
 * turning matters, get most of the way round, and the far end is crowded.
 *
 * Drag it, scroll over it, or use the arrow keys; a double click or double
 * tap puts it back.
 */

/** The whole scale, end to end, px. Longer than the strip, so there's always more to turn. */
const SPAN = 460;
/** Two taps this close together are a double tap, ms. */
const DOUBLE_MS = 320;
/** A press that moves less than this is a tap, px. */
const TAP_PX = 4;
/** Marks from one number to the next. */
const BETWEEN = 5;

interface Props {
    label: string;
    value: number;
    min: number;
    max: number;
    scale: Scale;
    /** The values engraved with a number, rising; marks are drawn between them. */
    numbers: number[];
    /** A value as the ring reads it. */
    read: (value: number) => string;
    onChange: (value: number) => void;
    onReset: () => void;
    disabled?: boolean;
    /** Lying along the bottom (a phone) rather than upright on the window's edge. */
    lying?: boolean;
}

const Ring = ({ label, value, min, max, scale, numbers, read, onChange, onReset, disabled = false, lying = false }: Props) => {
    const drag = useRef<{ id: number; at: number; from: number; moved: boolean } | null>(null);
    const tapped = useRef(0);
    const k = scale.to(value);
    /** Turn the ring to a place on its scale, 0 to 1. */
    const turn = (travel: number) => onChange(Math.min(max, Math.max(min, scale.from(Math.min(1, Math.max(0, travel))))));

    // The engraving: a number at each value given, and marks between, evenly by value, so they crowd where the scale does.
    const engraving = useMemo(() => numbers.flatMap((number, n) => {
        const next = numbers[n + 1];
        const steps = next === undefined ? 1 : BETWEEN;
        return Array.from({ length: steps }, (_, i) => {
            const at = scale.to(next === undefined ? number : number + (next - number) * (i / BETWEEN)) * SPAN;
            return (
                <span key={`${n}.${i}`}>
                    <span
                        className={`absolute bg-current ${i ? 'opacity-50' : ''} ${lying ? 'bottom-2.5 w-px' : 'right-2.5 h-px'}`}
                        style={lying ? { left: at, height: i ? 5 : 12 } : { top: at, width: i ? 5 : 12 }}
                    />
                    {!i && (
                        <span
                            className={`absolute font-mono text-[9px]/none tabular-nums ${lying ? 'bottom-[26px] -translate-x-1/2' : 'right-[26px] -translate-y-1/2'}`}
                            style={lying ? { left: at } : { top: at }}
                        >
                            {read(number)}
                        </span>
                    )}
                </span>
            );
        });
    }), [numbers, scale, read, lying]);

    return (
        <div data-ink-part className={`flex ${lying ? 'items-center gap-3' : 'flex-col items-center gap-2'} ${disabled ? 'opacity-30' : ''} transition-opacity ${LABEL} ${ON}`}>
            <div className={`flex ${lying ? 'w-[5.5rem] shrink-0 justify-between gap-2' : 'flex-col items-center gap-1'}`}>
                <span className="opacity-60">{label}</span>
                <span className="tabular-nums normal-case">{read(value)}</span>
            </div>
            <div
                role="slider"
                tabIndex={disabled ? -1 : 0}
                aria-label={label}
                aria-orientation={lying ? 'horizontal' : 'vertical'}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={Number(value.toFixed(3))}
                aria-valuetext={read(value)}
                aria-disabled={disabled}
                className={`relative overflow-hidden select-none touch-none outline-none focus-visible:ring-1 focus-visible:ring-current ${disabled ? 'pointer-events-none' : lying ? 'cursor-ew-resize' : 'cursor-ns-resize'} ${lying
                    ? 'h-11 min-w-0 flex-1 [mask-image:linear-gradient(to_right,transparent,black_22%,black_78%,transparent)]'
                    : 'w-12 h-[min(42vh,320px)] [mask-image:linear-gradient(to_bottom,transparent,black_22%,black_78%,transparent)]'}`}
                onPointerDown={(e) => {
                    if (e.button !== 0) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    drag.current = { id: e.pointerId, at: lying ? e.clientX : e.clientY, from: k, moved: false };
                }}
                onPointerMove={(e) => {
                    const d = drag.current;
                    if (!d || d.id !== e.pointerId) return;
                    const by = (lying ? e.clientX : e.clientY) - d.at;
                    if (Math.abs(by) > TAP_PX) d.moved = true;
                    // The scale goes with the hand, so the reading goes the other way.
                    if (d.moved) turn(d.from - by / SPAN);
                }}
                onPointerUp={(e) => {
                    const d = drag.current;
                    if (!d || d.id !== e.pointerId) return;
                    drag.current = null;
                    if (d.moved) return;
                    if (e.timeStamp - tapped.current < DOUBLE_MS) {
                        tapped.current = 0;
                        onReset();
                    } else {
                        tapped.current = e.timeStamp;
                    }
                }}
                onPointerCancel={() => { drag.current = null; }}
                onWheel={(e) => turn(k + ((lying && e.deltaX ? e.deltaX : e.deltaY) / SPAN) * 0.5)}
                onKeyDown={(e) => {
                    const step = (e.shiftKey ? 10 : 1) / 200;
                    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') turn(k + step);
                    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') turn(k - step);
                    else if (e.key === 'Home') turn(0);
                    else if (e.key === 'End') turn(1);
                    else return;
                    e.preventDefault();
                }}
            >
                {/* The grip: knurling the whole way round, turning with the scale. */}
                <span
                    aria-hidden
                    className={`absolute opacity-35 ${lying ? 'inset-x-0 bottom-0 h-1.5' : 'inset-y-0 right-0 w-1.5'}`}
                    style={lying
                        ? { backgroundImage: 'repeating-linear-gradient(to right, currentColor 0 1px, transparent 1px 4px)', backgroundPositionX: -k * SPAN }
                        : { backgroundImage: 'repeating-linear-gradient(to bottom, currentColor 0 1px, transparent 1px 4px)', backgroundPositionY: -k * SPAN }}
                />
                <span
                    aria-hidden
                    className={`absolute ${lying ? 'inset-y-0 left-1/2' : 'inset-x-0 top-1/2'}`}
                    style={{ transform: lying ? `translateX(${-k * SPAN}px)` : `translateY(${-k * SPAN}px)` }}
                >
                    {engraving}
                </span>
                {/* The index the scale is read against. */}
                <span aria-hidden className={`absolute bg-current ${lying ? 'left-1/2 bottom-0 h-7 w-px' : 'top-1/2 right-0 w-7 h-px'}`} />
            </div>
        </div>
    );
};

export default Ring;
