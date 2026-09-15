import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import { photoSeries, photoUrl } from '../data/photos';
import SiteNav from '../components/SiteNav';
import PhotoFrame from '../components/PhotoFrame';
import useDocumentTitle from '../hooks/useDocumentTitle';

const pad = (n: number) => String(n).padStart(2, '0');

/** One wheel gesture should advance one photo, not the whole roll. */
const WHEEL_LOCK_MS = 400;
/** How far a touch drag must travel before it counts as a swipe. */
const SWIPE_THRESHOLD = 60;

const PhotoSeriesPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { seriesId } = useParams<{ seriesId: string }>();
    const series = photoSeries.find((s) => s.id === seriesId);

    useDocumentTitle(series ? t(`photography.series.${series.id}.title`) : undefined);

    const [activeIndex, setActiveIndex] = useState(0);
    const [direction, setDirection] = useState(1);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const stageRef = useRef<HTMLDivElement>(null);
    const stripRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const wheelLockedUntil = useRef(0);

    // An object-contain photo is only as wide as its own proportions allow, so
    // the caption underneath has to be measured rather than assumed: track the
    // frame's box and each file's natural ratio, and derive the visible width.
    const [frame, setFrame] = useState({ w: 0, h: 0 });
    const [ratios, setRatios] = useState<Record<string, number>>({});

    const total = series?.photos.length ?? 0;

    const step = useCallback((delta: number) => {
        if (total === 0) return;
        setDirection(delta > 0 ? 1 : -1);
        setActiveIndex((prev) => (prev + delta + total) % total);
    }, [total]);

    const goTo = useCallback((index: number) => {
        setDirection(index > activeIndex ? 1 : -1);
        setActiveIndex(index);
    }, [activeIndex]);

    // Navigating straight from one series to another reuses this component, so
    // reset during render rather than in an effect (avoids a frame showing the
    // previous series' index against the new roll).
    const [renderedSeriesId, setRenderedSeriesId] = useState(seriesId);
    if (renderedSeriesId !== seriesId) {
        setRenderedSeriesId(seriesId);
        setActiveIndex(0);
        setLightboxOpen(false);
    }

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [seriesId]);

    // Keyboard: step through the roll, Escape backs out one level.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowRight': step(1); break;
                case 'ArrowLeft': step(-1); break;
                case 'Home': setDirection(-1); setActiveIndex(0); break;
                case 'End': setDirection(1); setActiveIndex(Math.max(total - 1, 0)); break;
                case 'Escape':
                    if (lightboxOpen) setLightboxOpen(false);
                    else navigate('/photography');
                    break;
                default: return;
            }
            e.preventDefault();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [step, total, lightboxOpen, navigate]);

    // Wheel over the stage steps the roll. Registered non-passively so the
    // page behind the fixed stage doesn't scroll along with it.
    useEffect(() => {
        const el = stageRef.current;
        if (!el || lightboxOpen) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const now = Date.now();
            if (now < wheelLockedUntil.current) return;
            const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (Math.abs(delta) < 4) return;
            wheelLockedUntil.current = now + WHEEL_LOCK_MS;
            step(delta > 0 ? 1 : -1);
        };

        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, [step, lightboxOpen]);

    // Keep the active thumbnail centred as you navigate by key or wheel.
    // Driving `scrollLeft` on the strip rather than calling scrollIntoView on
    // the thumb matters: scrollIntoView also scrolls every scrollable ancestor,
    // which on mobile drags the whole page down to meet the filmstrip.
    useEffect(() => {
        const strip = stripRef.current;
        const thumb = thumbRefs.current[activeIndex];
        if (!strip || !thumb) return;
        strip.scrollTo({
            left: thumb.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2,
            behavior: 'smooth',
        });
    }, [activeIndex]);

    useEffect(() => {
        const el = frameRef.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setFrame({ w: width, h: height });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // Warm the neighbours so stepping feels instant.
    useEffect(() => {
        if (!series || total === 0) return;
        [1, -1].forEach((offset) => {
            const neighbour = series.photos[(activeIndex + offset + total) % total];
            if (neighbour) new Image().src = photoUrl(series, neighbour.file);
        });
    }, [activeIndex, series, total]);

    if (!series) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-900 dark:text-white transition-colors">
                <h2 className="text-2xl font-bold mb-4">{t('photography.seriesNotFound')}</h2>
                <Link to="/photography" className="text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300">
                    {t('photography.backToIndex')}
                </Link>
            </div>
        );
    }

    const photo = series.photos[activeIndex];
    const seriesTitle = t(`photography.series.${series.id}.title`);

    const meta: [string, string | undefined][] = [
        [t('photography.meta.camera'), photo?.camera],
        [t('photography.meta.lens'), photo?.lens],
        [t('photography.meta.film'), photo?.film],
    ];

    // How wide the active photo actually renders inside its frame. Undefined
    // until the file has decoded, in which case the caption just spans the
    // column, the same thing it did before it could be measured.
    const activeRatio = photo ? ratios[photo.file] : undefined;
    const captionWidth = activeRatio && frame.h && frame.w
        ? Math.min(frame.w, frame.h * activeRatio)
        : undefined;

    return (
        <div className="min-h-screen md:h-screen md:overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-purple-500/30 transition-colors duration-300">
            <SiteNav active="photography" />

            {/* pt-28 clears the nav at its tallest: un-scrolled it carries py-4
                on top of the h-20 row, and this page doesn't scroll on desktop
                so it never shrinks. */}
            <div className="pt-28 md:h-full md:flex md:flex-col">

                {/* Close Gallery */}
                <div className="container mx-auto px-6 pt-4 pb-2 shrink-0">
                    <Link
                        to="/photography"
                        className="inline-flex items-center gap-2 text-xs tracking-widest uppercase font-medium text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors group"
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        {t('photography.closeGallery')}
                    </Link>
                </div>

                {/* Stage */}
                <div
                    ref={stageRef}
                    className="container mx-auto px-6 grid md:grid-cols-2 gap-8 md:gap-12 items-center md:items-stretch md:flex-1 md:min-h-0 py-6 md:py-4"
                >
                    {/* Title + metadata */}
                    <div className="order-2 md:order-1 md:h-full md:min-h-0 md:flex md:flex-col md:justify-center">
                        <div className="font-mono text-sm mb-4 md:mb-6 shrink-0">
                            <span className="font-bold text-slate-900 dark:text-white">{pad(activeIndex + 1)}</span>
                            <span className="text-slate-400 dark:text-slate-600"> / {pad(total)}</span>
                        </div>

                        {/* Sized off viewport *height* as well as width: on a short
                            landscape window a fixed text-7xl would push the metadata
                            into the filmstrip. */}
                        <h1 className="text-4xl sm:text-5xl md:text-[clamp(2.25rem,4vh+1.75vw,4.5rem)] font-bold tracking-tighter leading-[0.85] uppercase mb-6 md:mb-8 shrink-0 text-slate-900 dark:text-white transition-colors">
                            {seriesTitle}
                        </h1>

                        <AnimatePresence mode="wait">
                            <motion.dl
                                key={activeIndex}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-1.5 text-sm shrink-0"
                            >
                                {meta.map(([label, value]) => value && (
                                    <div key={label} className="flex gap-3">
                                        <dt className="w-16 shrink-0 text-slate-400 dark:text-slate-600 uppercase tracking-wider text-[11px] pt-0.5">{label}</dt>
                                        <dd className="text-slate-600 dark:text-slate-300 font-light">{value}</dd>
                                    </div>
                                ))}
                            </motion.dl>
                        </AnimatePresence>

                        {/* Nicety, not navigation; first thing to go when the
                            window is too short to hold everything comfortably. */}
                        <p className="hidden md:[@media(min-height:820px)]:block mt-8 shrink-0 text-[11px] tracking-widest uppercase text-slate-400 dark:text-slate-600">
                            {t('photography.navHint')}
                        </p>
                    </div>

                    {/* Active photo */}
                    <div className="order-1 md:order-2 min-w-0 md:h-full md:min-h-0 md:flex md:flex-col">
                        {/* md: take whatever the row has left rather than a fixed
                            vh, so the photo shrinks instead of colliding with the
                            filmstrip below. */}
                        <div ref={frameRef} className="relative flex items-center justify-center h-[45vh] md:h-auto md:flex-1 md:min-h-0">
                            <AnimatePresence mode="wait" custom={direction}>
                                <motion.div
                                    key={activeIndex}
                                    custom={direction}
                                    initial={{ opacity: 0, x: direction * 40 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: direction * -40 }}
                                    transition={{ duration: 0.28, ease: 'easeOut' }}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.15}
                                    onDragEnd={(_, info) => {
                                        if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) step(info.offset.x < 0 ? 1 : -1);
                                    }}
                                    className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                                >
                                    {photo && (
                                        <PhotoFrame
                                            src={photoUrl(series, photo.file)}
                                            alt={`${seriesTitle}, ${pad(activeIndex + 1)}`}
                                            loading="eager"
                                            className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl shadow-lg pointer-events-none select-none"
                                            fallbackClassName="w-full h-full rounded-xl"
                                            onRatio={(r) => setRatios((prev) => (prev[photo.file] === r ? prev : { ...prev, [photo.file]: r }))}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Caption row, width-matched to the photo above it, so a
                            portrait frame doesn't get a caption hanging off both
                            sides. Falls back to the full column while undecoded. */}
                        <div
                            style={captionWidth ? { width: `${captionWidth}px` } : undefined}
                            className="flex items-center justify-between gap-4 mt-4 mx-auto w-full shrink-0 text-xs tracking-widest uppercase transition-[width] duration-300">
                            <span className="text-slate-500 dark:text-slate-400 truncate">
                                {[photo?.location, photo?.date].filter(Boolean).join('  /  ')}
                            </span>
                            <button
                                onClick={() => setLightboxOpen(true)}
                                className="inline-flex items-center gap-2 shrink-0 text-slate-900 dark:text-white underline underline-offset-4 decoration-slate-300 dark:decoration-white/30 hover:decoration-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                            >
                                <Maximize2 size={12} />
                                {t('photography.viewFull')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filmstrip */}
                <div className="shrink-0 border-t border-slate-200 dark:border-white/5 mt-6 md:mt-0">
                    <div
                        ref={stripRef}
                        className="container mx-auto px-6 py-5 flex gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    >
                        {series.photos.map((item, index) => (
                            <button
                                key={item.file}
                                ref={(el) => { thumbRefs.current[index] = el; }}
                                onClick={() => goTo(index)}
                                className="shrink-0 group text-left"
                                aria-label={`${seriesTitle} ${pad(index + 1)}`}
                                aria-current={index === activeIndex}
                            >
                                <span className={`block font-mono text-xs mb-2 transition-colors ${index === activeIndex
                                    ? 'font-bold text-slate-900 dark:text-white'
                                    : 'text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400'}`}>
                                    {pad(index + 1)}
                                </span>
                                {/* Uniform height, natural width. Cropping every
                                    frame into one portrait tile would show ~28% of
                                    a panorama; a contact sheet should show the
                                    shape of the shot. */}
                                <PhotoFrame
                                    src={photoUrl(series, item.file)}
                                    alt=""
                                    className={`h-20 md:h-24 w-auto max-w-none min-w-[2.5rem] object-contain rounded-md transition-all duration-300 ${index === activeIndex
                                        ? 'opacity-100 ring-2 ring-purple-500'
                                        : 'opacity-40 grayscale group-hover:opacity-75 group-hover:grayscale-0'}`}
                                    fallbackClassName={`w-16 h-20 md:w-24 md:h-24 rounded-md transition-all duration-300 ${index === activeIndex ? 'ring-2 ring-purple-500' : 'opacity-50'}`}
                                />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Lightbox */}
            {lightboxOpen && photo && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
                    onClick={() => setLightboxOpen(false)}
                >
                    <button onClick={() => setLightboxOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors" aria-label="Close">
                        <X size={32} />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); step(-1); }}
                        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all"
                        aria-label="Previous"
                    >
                        <ChevronLeft size={48} />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); step(1); }}
                        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all"
                        aria-label="Next"
                    >
                        <ChevronRight size={48} />
                    </button>

                    <div className="max-w-7xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <PhotoFrame
                            src={photoUrl(series, photo.file)}
                            alt={`${seriesTitle}, ${pad(activeIndex + 1)}`}
                            loading="eager"
                            className="max-w-full max-h-[85vh] object-contain mx-auto rounded-lg shadow-2xl"
                            fallbackClassName="w-[60vw] h-[60vh] rounded-lg"
                        />
                        <div className="text-center text-slate-400 mt-4 font-mono text-sm">
                            {pad(activeIndex + 1)} / {pad(total)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoSeriesPage;
