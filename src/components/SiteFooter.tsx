import { useState, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, ExternalLink } from 'lucide-react';
import { versions, currentVersion } from '../data/versions';

/**
 * The shared footer. It was duplicated near-identically across three pages,
 * which is also why the changelog lives here rather than being pasted about.
 */

/** A version's first number: 2.1.2 and 2.0 are both 2. */
const major = (label: string) => label.split('.')[0];
/**
 * The releases grouped by big version, newest first. The changelog shows one
 * entry per big version, on its latest release; where there's more than one
 * release, buttons on the entry switch between them.
 */
const groups = [...new Set(versions.map((v) => major(v.label)))].map((m) => versions.filter((v) => major(v.label) === m));

/** The boulderapp's hold: the outline its icon and its name on the about page are drawn from. */
const HOLD = 'M144.56 0C142.38 20.9 137.61 41.97 125.95 59.63C114.29 77.29 95.59 95.61 74.59 105.95C53.6 116.28 25.84 120.25 0 121.63C-25.84 123.01 -59.37 124.52 -80.42 114.22C-101.47 103.91 -119.05 78.82 -126.29 59.79C-133.53 40.75 -123.89 19.9 -123.84 0C-123.79 -19.9 -134.19 -41.98 -125.98 -59.64C-117.77 -77.3 -95.58 -96.52 -74.59 -105.93C-53.59 -115.35 -24.35 -116.85 0 -116.12C24.35 -115.4 48.36 -109.97 71.52 -101.58C94.69 -93.19 126.82 -82.73 138.99 -65.8C151.16 -48.87 146.73 -20.9 144.56 0Z';

/**
 * The boulderapp's hold, bolted on at the end of the footer and as faint as
 * its separators: drawn as the app draws it beside its name (the hold in the
 * text's colour, its bolt hole and grip strokes cut out), and it goes there.
 * Nothing else on the site says so.
 */
const BoulderHold = () => {
    // Ids from useId have colons, which a url(#…) doesn't take everywhere.
    const cut = `hold${useId().replace(/:/g, '')}`;
    return (
        <a
            href="https://the-boulderapp.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="the boulderapp"
            title="the boulderapp"
            className="inline-flex text-slate-300 dark:text-slate-700 hover:text-purple-600 dark:hover:text-purple-400 hover:rotate-12 transition-[color,transform] duration-300 ease-in-out"
        >
            <svg viewBox="-170 -150 340 300" width="18" height="16" aria-hidden>
                <mask id={cut}>
                    <g transform="rotate(-8)" strokeLinecap="round" strokeLinejoin="round">
                        <path d={HOLD} fill="#fff" />
                        <path d={HOLD} fill="none" stroke="#fff" strokeWidth={5} transform="translate(3 -2) rotate(1.5)" />
                        <circle cx={0} cy={-14} r={19} fill="none" stroke="#000" strokeWidth={10} />
                        <path d="M-70 78l32 -26M-16 84l32 -26M38 76l30 -24" fill="none" stroke="#000" strokeWidth={10} />
                    </g>
                </mask>
                <rect x={-170} y={-150} width={340} height={300} fill="currentColor" mask={`url(#${cut})`} />
            </svg>
        </a>
    );
};

const SiteFooter = ({ bordered = true }: { bordered?: boolean }) => {
    const { t, i18n } = useTranslation();
    const [open, setOpen] = useState(false);
    // Which release each big version's entry shows; the latest unless one is picked.
    const [picked, setPicked] = useState<Record<string, string>>({});
    const openChangelog = () => {
        setPicked({});
        setOpen(true);
    };

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const monthYear = (ym: string) => {
        const [y, m] = ym.split('-').map(Number);
        return new Date(y, m - 1).toLocaleDateString(i18n.language, { year: 'numeric', month: 'short' });
    };

    return (
        <>
            <footer className={`py-8 text-center text-slate-500 dark:text-slate-400 text-sm transition-colors ${bordered ? 'border-t border-slate-200 dark:border-white/5' : ''}`}>
                <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                    <span>&copy; {new Date().getFullYear()} Robin Baron. {t('footer.rights')}</span>
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden>·</span>
                    <button
                        type="button"
                        onClick={openChangelog}
                        className="font-mono text-xs tracking-wide underline underline-offset-4 decoration-slate-300 dark:decoration-white/20 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    >
                        v{currentVersion.label}
                    </button>
                    <BoulderHold />
                </p>
            </footer>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setOpen(false)}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                        role="dialog" aria-modal="true" aria-label={t('changelog.title')}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 p-7 text-left shadow-2xl"
                        >
                            <button
                                type="button" onClick={() => setOpen(false)} aria-label={t('changelog.close')}
                                className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{t('changelog.title')}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-7">{t('changelog.intro')}</p>

                            <ol className="space-y-6">
                                {groups.map((group) => {
                                    const m = major(group[0].label);
                                    const v = group.find((x) => x.id === picked[m]) ?? group[0];
                                    return (
                                        <li key={m} className="relative pl-5 border-l-2 border-slate-200 dark:border-white/10">
                                            <span className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${group.some((x) => x.archive === null) ? 'bg-purple-500 dark:bg-purple-400' : 'bg-slate-300 dark:bg-white/20'}`} />
                                            {/* Its releases, newest first, where it has more than one. */}
                                            {group.length > 1 && (
                                                <div role="tablist" aria-label={`${t('changelog.majors')} ${m}`} className="flex flex-wrap gap-1 -mt-0.5 mb-2">
                                                    {group.map((x) => (
                                                        <button
                                                            key={x.id}
                                                            type="button"
                                                            role="tab"
                                                            aria-selected={x.id === v.id}
                                                            onClick={() => setPicked((p) => ({ ...p, [m]: x.id }))}
                                                            className={`font-mono text-[11px] px-2 py-0.5 rounded-full transition-colors ${x.id === v.id
                                                                ? 'bg-slate-200/80 dark:bg-white/10 text-slate-900 dark:text-white'
                                                                : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                                                        >
                                                            v{x.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <motion.div
                                                key={v.id}
                                                role={group.length > 1 ? 'tabpanel' : undefined}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                            >
                                                <div className="flex items-baseline gap-2.5 flex-wrap">
                                                    {/* Where the buttons are, the picked one already says which. */}
                                                    {group.length === 1 && <span className="font-mono text-xs text-slate-400 dark:text-slate-600">v{v.label}</span>}
                                                    <span className="font-medium text-slate-900 dark:text-white">{t(`changelog.versions.${v.id}.title`)}</span>
                                                    <span className="font-mono text-[11px] text-slate-400 dark:text-slate-600">{monthYear(v.date)}</span>
                                                </div>
                                                {/* What changed, as a list of facts. */}
                                                <ul className="mt-1.5 pl-4 list-disc marker:text-slate-300 dark:marker:text-slate-600 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                                    {(t(`changelog.versions.${v.id}.points`, { returnObjects: true }) as string[]).map((point) => (
                                                        <li key={point}>{point}</li>
                                                    ))}
                                                </ul>
                                                {v.archive ? (
                                                    <a
                                                        href={v.archive} target="_blank" rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline underline-offset-4"
                                                    >
                                                        {t('changelog.view')} <ExternalLink size={12} />
                                                    </a>
                                                ) : (
                                                    <span className="inline-block mt-2.5 text-xs font-medium text-slate-400 dark:text-slate-600">
                                                        {t('changelog.current')}
                                                    </span>
                                                )}
                                            </motion.div>
                                        </li>
                                    );
                                })}
                            </ol>

                            <p className="mt-7 pt-5 border-t border-slate-200 dark:border-white/10 text-xs text-slate-400 dark:text-slate-600 leading-relaxed">
                                {t('changelog.caveat')}
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default SiteFooter;
