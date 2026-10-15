import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, List, RectangleHorizontal } from 'lucide-react';
import { visibleProjects, type Project } from '../data/projects';

/**
 * The projects on the home page, three ways: across the whole window, as
 * many to a row as fit, so they take a fraction of the height; the mosaic in
 * the page's column; or a list with each project's category, description and
 * tools. The choice is remembered per browser. A new view's items come in
 * the way they do when the page first loads. A phone has the list only.
 */

type View = 'wide' | 'mosaic' | 'list';
const VIEWS: { id: View; Icon: typeof List }[] = [
    { id: 'wide', Icon: RectangleHorizontal },
    { id: 'mosaic', Icon: LayoutDashboard },
    { id: 'list', Icon: List },
];
const VIEW_KEY = 'works.view';

const readView = (): View => {
    try {
        const saved = localStorage.getItem(VIEW_KEY);
        if (VIEWS.some((v) => v.id === saved)) return saved as View;
    } catch {
        // Nothing remembered: the mosaic.
    }
    return 'mosaic';
};

/**
 * Card spans for the project mosaic, as [columns, rows] on a six-column grid.
 *
 * Rows are defined in pairs whose columns add up to six and which share a row
 * span. That is what keeps the mosaic gap-free: a row can never leave a hole
 * for the next card to fall into. The pattern repeats for as many projects as
 * there are, and an odd one left at the end takes the full width instead.
 */
const MOSAIC_ROWS: [number, number][][] = [
    [[4, 4], [2, 4]],
    [[2, 3], [4, 3]],
    [[3, 3], [3, 3]],
];

/** Written out rather than interpolated so Tailwind can see the class names. */
const SPAN_CLASS: Record<string, string> = {
    '4,4': 'md:col-span-4 md:row-span-4',
    '2,4': 'md:col-span-2 md:row-span-4',
    '2,3': 'md:col-span-2 md:row-span-3',
    '4,3': 'md:col-span-4 md:row-span-3',
    '3,3': 'md:col-span-3 md:row-span-3',
    '6,4': 'md:col-span-6 md:row-span-4',
};

const mosaicSpans = (count: number): string[] => {
    const spans: [number, number][] = [];
    for (let row = 0; count - spans.length >= 2; row++) {
        spans.push(...MOSAIC_ROWS[row % MOSAIC_ROWS.length]);
    }
    if (spans.length < count) spans.push([6, 4]);
    return spans.map(([c, r]) => SPAN_CLASS[`${c},${r}`]);
};

const PROJECT_SPANS = mosaicSpans(visibleProjects.length);

/**
 * A video plays while the pointer is over its card, and stops when it leaves.
 * Leaving before it has started cancels the play() on its way; that's fine.
 */
const hover = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.querySelector('video')?.play().catch(() => {}); },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.querySelector('video')?.pause(); },
};

/** A project's first picture, or its video behind a poster. */
const Preview = ({ project }: { project: Project }) => {
    const media = project.media[0];
    return media?.type === 'video' ? (
        <video
            src={media.url}
            muted
            loop
            playsInline
            // Every video tile has a poster, so nothing needs fetching until a
            // hover actually asks for playback.
            preload="none"
            poster={media.thumbnail}
            className="object-cover w-full h-full pointer-events-none"
        />
    ) : (
        <img src={media?.url} alt="" loading="lazy" className="object-cover w-full h-full pointer-events-none" />
    );
};

/** A project as a card: its picture, its title over it, and its category on hover. */
const Tile = ({ project, index, className = '' }: { project: Project; index: number; className?: string }) => {
    const { t } = useTranslation();
    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: (index % 2) * 0.08 }}
            className={`group relative overflow-hidden rounded-2xl cursor-pointer ${className}`}
            {...hover}
        >
            <Link
                to={`/project/${project.id}`}
                className="absolute inset-0 z-20"
                aria-label={t(`projects.${project.id}.title`)}
            />
            <div className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-105">
                <Preview project={project} />
            </div>

            {/* The title stays legible without a hover,
                which is the only state a touch screen has.
                The category is what the hover reveals, and
                it holds its space so the title cannot jump. */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-5 md:p-6 pointer-events-none bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-purple-300 mb-1 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                    {t(`projects.${project.id}.category`)}
                </span>
                <h3 className="text-lg md:text-xl font-bold text-white drop-shadow-md">
                    {t(`projects.${project.id}.title`)}
                </h3>
            </div>
        </motion.div>
    );
};

/** The mosaic, in the page's column. */
const Mosaic = () => (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-5 md:auto-rows-[6.5rem] max-w-6xl mx-auto">
        {visibleProjects.map((project, index) => (
            <Tile key={project.id} project={project} index={index} className={`aspect-[4/3] md:aspect-auto ${PROJECT_SPANS[index]}`} />
        ))}
    </div>
);

/** No card narrower than this across the whole window, px (17rem). */
const WIDE_MIN = 272;
const WIDE_GAP = 20;

/**
 * Across the whole window: as many cards to a row as fit, all one height, so
 * the lot takes a fraction of the mosaic's height. Where the last row would
 * end short, the first cards take two columns instead, so the rows end flush.
 */
const Wide = () => {
    const ref = useRef<HTMLDivElement>(null);
    // A first guess from the window (less the page's padding), measured properly once it's up.
    const [columns, setColumns] = useState(() => Math.max(1, Math.floor((window.innerWidth - 48 + WIDE_GAP) / (WIDE_MIN + WIDE_GAP))));
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const measure = () => setColumns(Math.max(1, Math.floor((el.clientWidth + WIDE_GAP) / (WIDE_MIN + WIDE_GAP))));
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        measure();
        return () => observer.disconnect();
    }, []);
    const count = visibleProjects.length;
    // Cells left over in the last row, if any: that many cards go double, from the front.
    const spare = columns > 1 ? (columns - (count % columns)) % columns : 0;
    const doubles = Math.min(spare, count);
    return (
        <div
            ref={ref}
            className="grid grid-flow-row-dense auto-rows-[13rem] xl:auto-rows-[15rem]"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: WIDE_GAP }}
        >
            {visibleProjects.map((project, index) => (
                <Tile key={project.id} project={project} index={index} className={index < doubles ? 'col-span-2' : ''} />
            ))}
        </div>
    );
};

/**
 * One band per project: its picture fading out to one side, and on the faded
 * part, inside the picture, what it is, what it's about and what it was made
 * with. On a phone the picture fades downwards and the words sit at its foot.
 */
const Lines = () => {
    const { t } = useTranslation();
    return (
        <ul className="max-w-6xl mx-auto flex flex-col gap-4 md:gap-5">
            {visibleProjects.map((project, index) => (
                <motion.li
                    key={project.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.4, delay: Math.min(index, 4) * 0.04 }}
                >
                    <Link
                        to={`/project/${project.id}`}
                        className="group relative block h-56 md:h-48 overflow-hidden rounded-2xl"
                        {...hover}
                    >
                        <div className="absolute inset-0 md:right-[58%] [mask-image:linear-gradient(to_bottom,#000_25%,transparent_80%)] md:[mask-image:linear-gradient(to_right,#000,transparent_80%)]">
                            <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105">
                                <Preview project={project} />
                            </div>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:w-[74%] flex items-end md:items-center gap-6 p-5 md:p-8 md:pl-0">
                            <div className="min-w-0 flex-1">
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-1">
                                    {t(`projects.${project.id}.category`)}
                                </span>
                                <h3 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                    {t(`projects.${project.id}.title`)}
                                </h3>
                                <p className="hidden sm:block mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                                    {t(`projects.${project.id}.description`)}
                                </p>
                            </div>
                            {project.technicals && (
                                <div className="hidden lg:flex shrink-0 items-center gap-3 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors" aria-hidden>
                                    {project.technicals.icons.map((Icon, i) => <Icon key={i} className="w-5 h-5" />)}
                                </div>
                            )}
                        </div>
                    </Link>
                </motion.li>
            ))}
        </ul>
    );
};

/** At least a tablet's width: where there's room for the card views. */
const ROOMY = '(min-width: 768px)';
const useRoomy = () => {
    const [roomy, setRoomy] = useState(() => window.matchMedia(ROOMY).matches);
    useEffect(() => {
        const media = window.matchMedia(ROOMY);
        const change = () => setRoomy(media.matches);
        media.addEventListener('change', change);
        return () => media.removeEventListener('change', change);
    }, []);
    return roomy;
};

const SelectedWorks = () => {
    const { t } = useTranslation();
    const [chosen, setView] = useState(readView);
    const roomy = useRoomy();
    // On a phone, the list: the cards would be one column of pictures there.
    const view: View = roomy ? chosen : 'list';
    useEffect(() => {
        try {
            localStorage.setItem(VIEW_KEY, chosen);
        } catch {
            // Private window or blocked storage: it just won't be remembered.
        }
    }, [chosen]);


    return (
        <>
            {/* Over the right edge of whichever view is up; not on a phone, which has the list only. */}
            {roomy && <div className={view === 'wide' ? 'px-6' : 'container mx-auto px-6'}>
                <div role="radiogroup" aria-label={t('projects.view.label')} className={`${view === 'wide' ? '' : 'max-w-6xl mx-auto'} mb-4 md:mb-6 flex justify-end gap-1`}>
                    {VIEWS.map(({ id, Icon }) => (
                        <button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={view === id}
                            aria-label={t(`projects.view.${id}`)}
                            title={t(`projects.view.${id}`)}
                            onClick={() => setView(id)}
                            className={`inline-flex p-2 rounded-full transition-colors ${view === id
                                ? 'text-purple-600 dark:text-purple-400 bg-slate-100 dark:bg-white/10'
                                : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                            <Icon size={18} />
                        </button>
                    ))}
                </div>
            </div>}
            {/* Keyed by the view, so a new one's items come in afresh. */}
            <div key={view} className={view === 'wide' ? 'px-6' : 'container mx-auto px-6'}>
                {view === 'list' ? <Lines /> : view === 'wide' ? <Wide /> : <Mosaic />}
            </div>
        </>
    );
};

export default SelectedWorks;
