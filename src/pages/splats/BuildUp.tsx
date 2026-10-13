import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { INK, ON } from './ui';

/** How long each step shows, and the steps: one dot, two, three, then none. */
const STEP_MS = 420;
const STEPS = [1, 2, 3, 0];

/**
 * Loading, in the wordmark's own full stop: its font and size, dots one after
 * the other, then none, and round again. In the type's colour with its halo
 * (ui.ts), so they read on sky and on night alike; held still for anyone
 * who'd rather not have motion, and stopped while `running` is off.
 */
export const Dots = ({ running = true, className = '' }: { running?: boolean; className?: string }) => {
    const [still] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const [step, setStep] = useState(0);
    useEffect(() => {
        if (still || !running) return;
        const timer = window.setInterval(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS);
        return () => window.clearInterval(timer);
    }, [still, running]);
    const shown = still ? 3 : STEPS[step];
    return (
        <span
            aria-hidden
            className={`font-display text-3xl/none sm:text-4xl/none tracking-tight select-none ${ON} ${className}`}
        >
            {[0, 1, 2].map((i) => (
                <span key={i} className={i < shown ? undefined : 'invisible'}>.</span>
            ))}
        </span>
    );
};

interface Props {
    /** The preview is up and the full scan isn't in yet. */
    active: boolean;
    /** How much of the full scan has arrived, 0–1; null before the first bytes. */
    detail: number | null;
    /** All of it has arrived, and it's going in under the second wave. */
    building: boolean;
    /** How much of the window panels take, when they do (the creation tool). */
    insets?: { right: number; bottom: number };
}

/**
 * The build-up, while the full scan streams in behind the preview and then
 * takes its place: the dots, at the foot of the view between the scans and
 * the controls, gone once the scan is whole. The same on the page, in the
 * tuning panel and in the creation tool, where they keep to the canvas.
 */
const BuildUp = ({ active, detail, building, insets }: Props) => {
    const { t } = useTranslation();
    return (
        <div
            className={`absolute left-0 z-10 flex justify-center pb-4 sm:pb-6 pointer-events-none transition-opacity duration-500 ${INK} ${active ? 'opacity-100' : 'opacity-0'}`}
            style={{ right: insets?.right ?? 0, bottom: insets?.bottom ?? 0 }}
            role="progressbar"
            aria-label={t('splats.detail')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((building ? 1 : detail ?? 0) * 100)}
            aria-hidden={!active}
        >
            <Dots running={active} />
        </div>
    );
};

export default BuildUp;
