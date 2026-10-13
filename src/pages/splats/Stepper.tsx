import { useEffect, useRef } from 'react';
import { OFF, ON } from './ui';

/** Held down, a step repeats: after this long, then this often, ms. */
const HOLD_MS = 350;
const REPEAT_MS = 70;

interface Props {
    /** What it reads, and in what: 72, BPM. */
    value: number;
    unit: string;
    /** A step down and a step up; none at an end of the range. */
    onLess?: () => void;
    onMore?: () => void;
    less: string;
    more: string;
}

/** A number to step: − 72 BPM +. Hold a side to keep going. */
const Stepper = ({ value, unit, onLess, onMore, less, more }: Props) => {
    const timer = useRef(0);
    // The latest handlers, for a hold that outlasts a render.
    const steps = useRef({ onLess, onMore });
    useEffect(() => { steps.current = { onLess, onMore }; });
    const stop = () => window.clearTimeout(timer.current);
    useEffect(() => () => window.clearTimeout(timer.current), []);

    const side = (which: 'onLess' | 'onMore', step: (() => void) | undefined, label: string, sign: string) => (
        <button
            type="button"
            aria-label={label}
            disabled={!step}
            onPointerDown={(e) => {
                if (e.button !== 0) return;
                const again = () => {
                    steps.current[which]?.();
                    timer.current = window.setTimeout(again, REPEAT_MS);
                };
                step?.();
                stop();
                timer.current = window.setTimeout(again, HOLD_MS);
            }}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            // From the keyboard there's no pointer: the click is the step.
            onClick={(e) => { if (e.detail === 0) step?.(); }}
            className={`-my-2 px-1.5 py-2 text-sm/none transition-colors disabled:opacity-30 ${OFF}`}
        >
            {sign}
        </button>
    );

    return (
        <span className="inline-flex items-center gap-1">
            {side('onLess', onLess, less, '−')}
            <span className={`min-w-[4.5rem] text-center tabular-nums ${ON}`}>{value} {unit}</span>
            {side('onMore', onMore, more, '+')}
        </span>
    );
};

export default Stepper;
