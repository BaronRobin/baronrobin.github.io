import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CSSProperties, KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import type { ProjectMedia } from '../data/projects';

/*
 * The stills are 1658×1080 cut-outs: a screen in its frame, with the frame's
 * shadow on a transparent margin. FRAME is where the frame's outline sits in
 * each picture; it was measured when they were cut out and is the same in all.
 */
const PIC = { w: 1658, h: 1080 };
const FRAME = { x: 58, y: 39.2, w: 1542, h: 964 };
const pct = (n: number) => `${n * 100}%`;

/** Places a picture so its frame fills the viewer's 16:10 box; margin and shadow spill over. */
const picStyle: CSSProperties = {
    left: pct(-FRAME.x / FRAME.w),
    top: pct(-FRAME.y / FRAME.h),
    width: pct(PIC.w / FRAME.w),
    height: pct(PIC.h / FRAME.h),
};

/*
 * The incoming screen is clipped a few px inside the frame's outline, onto the
 * plain bezel, so only the screen fades in. Bezel and shadow stay those of the
 * picture underneath (they are identical in every picture), so the shadow
 * never doubles up during the fade.
 */
const IN = 5; // px inside the outline, at the pictures' full size
const RADIUS = 10; // the clip's corner radius, same scale
const incomingClip = `inset(${pct((FRAME.y + IN) / PIC.h)} ${pct((PIC.w - FRAME.x - FRAME.w + IN) / PIC.w)} ${pct(
    (PIC.h - FRAME.y - FRAME.h + IN) / PIC.h,
)} ${pct((FRAME.x + IN) / PIC.w)} round ${pct(RADIUS / PIC.w)} / ${pct(RADIUS / PIC.h)})`;

/** A quick crossfade, eased in and out. Nothing slides, scales or moves. */
const FADE: KeyframeAnimationOptions = { duration: 180, easing: 'ease-in-out' };

const controlButton =
    'p-2 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors';

interface ProjectSplitProps {
    title: string;
    /** The page's media: the first video and every still are shown. */
    media: ProjectMedia[];
    /** Opens the lightbox on the still at this index, counted among the stills. */
    onExpand: (index: number) => void;
    /**
     * The still the lightbox is on while it's open, null while it's closed. The
     * lightbox has the arrow keys while it's open, and the viewer lands on its
     * last still when it closes.
     */
    openAt: number | null;
}

/**
 * The 'split' project layout: the video on the left, the stills on the right
 * as one viewer that is clicked through. On phones the video sits on top.
 */
const ProjectSplit = ({ title, media, onExpand, openAt }: ProjectSplitProps) => {
    const { t } = useTranslation();
    const keysEnabled = openAt === null;
    const video = media.find((item) => item.type === 'video');
    const screens = media.flatMap((item, index) => (item.type === 'image' ? [{ ...item, index }] : []));
    const count = screens.length;

    // `shown` is the screen on top; `base` the one under it. They differ only
    // while the fade runs.
    const [{ base, shown }, setView] = useState({ base: 0, shown: 0 });
    const pictures = useRef<(HTMLImageElement | null)[]>([]);

    // A step during a fade lands the running one at once and fades the next in over it.
    const step = (by: number) =>
        setView((view) => ({ base: view.shown, shown: (view.shown + by + count) % count }));

    // Before paint, so the incoming screen never shows a frame at full opacity.
    useLayoutEffect(() => {
        if (shown === base) return;
        const fade = pictures.current[shown]?.animate([{ opacity: 0 }, { opacity: 1 }], FADE);
        if (!fade) return;
        fade.onfinish = () => setView((view) => (view.shown === shown ? { base: shown, shown } : view));
        return () => fade.cancel();
    }, [base, shown]);

    // Closing the lightbox leaves the viewer on the still it ended on, without a fade.
    const lastOpen = useRef<number | null>(null);
    useEffect(() => {
        if (openAt !== null) {
            lastOpen.current = openAt;
            return;
        }
        const landing = lastOpen.current;
        lastOpen.current = null;
        if (landing !== null) setView({ base: landing, shown: landing });
    }, [openAt]);

    // Decode every screen up front so the first fade to each one starts on time.
    useEffect(() => {
        pictures.current.forEach((picture) => picture?.decode().catch(() => {}));
    }, []);

    const onKeyDown = (e: KeyboardEvent) => {
        if (!keysEnabled) return;
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            step(1);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            step(-1);
        }
    };

    const layer = (i: number): CSSProperties => {
        if (i === base) return { zIndex: 0 };
        if (i === shown) return { zIndex: 1, clipPath: incomingClip };
        return { opacity: 0 };
    };

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-10 items-start">
            {video && (
                <video
                    src={video.url}
                    poster={video.thumbnail}
                    controls
                    preload="none"
                    className="block w-full aspect-square object-contain bg-black rounded-lg shadow-lg"
                />
            )}

            {count > 0 && (
                <div
                    tabIndex={0}
                    onKeyDown={onKeyDown}
                    role="region"
                    aria-roledescription="carousel"
                    aria-label={title}
                    className="rounded-lg focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-purple-500"
                >
                    <div className="relative aspect-[16/10] cursor-pointer" onClick={() => step(1)}>
                        {screens.map((screen, i) => (
                            <img
                                key={screen.url}
                                ref={(el) => {
                                    pictures.current[i] = el;
                                }}
                                src={screen.url}
                                alt={i === shown ? `${title} - Media ${screen.index + 1}` : ''}
                                aria-hidden={i !== shown}
                                draggable={false}
                                className="absolute max-w-none select-none"
                                style={{ ...picStyle, ...layer(i) }}
                            />
                        ))}
                    </div>

                    <div className="mt-10 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={() => step(-1)} aria-label={t('projects.split.previous')} className={controlButton}>
                                <ChevronLeft size={20} />
                            </button>
                            <span className="min-w-14 text-center font-mono text-sm tabular-nums text-slate-500 dark:text-slate-400" aria-live="polite">
                                {shown + 1} / {count}
                            </span>
                            <button type="button" onClick={() => step(1)} aria-label={t('projects.split.next')} className={controlButton}>
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <button type="button" onClick={() => onExpand(shown)} aria-label={t('projects.split.expand')} className={controlButton}>
                            <Maximize2 size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSplit;
