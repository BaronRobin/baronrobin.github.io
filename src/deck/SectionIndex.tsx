import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export interface IndexEntry {
    /** The section's element id on the page. */
    id: string;
    label: string;
}

/** The two looks: white dots over a black page (Lautwasser), black over white (the Bachelor deck). */
const TONES = {
    dark: {
        panel: 'border-white/10 bg-black/75',
        here: 'text-lw-paper',
        other: 'text-lw-paper/55 group-hover/item:text-lw-paper/90',
        dot: 'ring-black/25',
        dotHere: 'bg-white',
        dotOther: 'bg-white/45 group-hover/item:bg-white/80',
    },
    light: {
        panel: 'border-black/10 bg-white/85',
        here: 'text-black',
        other: 'text-black/50 group-hover/item:text-black/85',
        dot: 'ring-white/40',
        dotHere: 'bg-black',
        dotOther: 'bg-black/30 group-hover/item:bg-black/70',
    },
} as const;

/**
 * Where you are on the project page: a dot per section down the right edge,
 * the current one drawn out into a dash. Pointing at the column (or tabbing
 * into it) brings up a panel behind it with the sections' names, and any of
 * them scrolls there.
 *
 * The dots are white with a faint dark ring, which is what keeps them visible
 * over the one light section as well as the black ones; a blend mode can't do
 * it from inside a fixed, stacked element.
 */
const SectionIndex = ({ entries, tone = 'dark', font = 'font-lw' }: {
    entries: IndexEntry[];
    tone?: keyof typeof TONES;
    /** The page's face, for the names. */
    font?: string;
}) => {
    const look = TONES[tone];
    const { t } = useTranslation();
    const reduce = useReducedMotion();
    const [current, setCurrent] = useState(entries[0]?.id);
    const ids = entries.map((e) => e.id).join(' ');

    // The section crossing a thin band just above the middle of the screen is
    // the one being read.
    useEffect(() => {
        const observer = new IntersectionObserver((seen) => {
            for (const entry of seen) if (entry.isIntersecting) setCurrent(entry.target.id);
        }, { rootMargin: '-45% 0px -54% 0px' });
        for (const id of ids.split(' ')) {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        }
        return () => observer.disconnect();
    }, [ids]);

    const go = (id: string) => {
        const behavior = reduce ? 'auto' : 'smooth';
        if (id === entries[0]?.id) window.scrollTo({ top: 0, behavior });
        else document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
    };

    // Shown while the pointer is over the column or keyboard focus is in it.
    // Tap focus doesn't count, or the panel would stay open over the page.
    const revealed = 'group-hover:opacity-100 group-has-[:focus-visible]:opacity-100';

    return (
        <nav aria-label={t('deck.index')} className="group fixed right-2 xl:right-6 top-1/2 -translate-y-1/2 z-40 hidden md:block">
            <div
                aria-hidden
                className={`absolute -inset-y-3 -left-4 -right-2 rounded-xl border backdrop-blur-md ${look.panel} opacity-0 transition-opacity duration-200 pointer-events-none ${revealed}`}
            />
            <ol className="relative flex flex-col">
                {entries.map(({ id, label }) => {
                    const here = id === current;
                    return (
                        <li key={id}>
                            <button
                                type="button"
                                onClick={() => go(id)}
                                aria-current={here ? 'location' : undefined}
                                className="group/item flex w-full items-center justify-end gap-3 py-1.5 pl-2 outline-none"
                            >
                                <span
                                    className={`${font} font-light uppercase text-[11px] tracking-[0.16em] whitespace-nowrap opacity-0 transition-opacity duration-200 ${revealed} ${here ? look.here : look.other}`}
                                >
                                    {label}
                                </span>
                                <span aria-hidden className="flex w-4 justify-end">
                                    <span
                                        className={`block rounded-full ring-1 transition-all duration-300 ${look.dot} ${here ? `w-4 h-0.5 ${look.dotHere}` : `w-1.5 h-1.5 ${look.dotOther}`}`}
                                    />
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default SectionIndex;
