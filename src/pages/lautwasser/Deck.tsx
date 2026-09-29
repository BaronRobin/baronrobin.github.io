import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useIsPresent, useReducedMotion, type Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Captions, CaptionsOff, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';
import { LAUTWASSER_ID } from '../../data/projects';
import { CHAPTERS, type Transition } from './data';
import { SLIDES, type SlideDef } from './order';
import { preloadMedia, type MediaId } from './media';
import { DisplayWord } from './parts';
import { PlaybackContext } from './playback';

/*
 * The presentation, one slide at a time, at /project/11-lautwasser/slides/<n>.
 *
 * Navigation follows PhotoSeries: arrows, space, one wheel gesture per step,
 * a swipe, or a tap on the slide. Slides arrive with the transition the deck
 * gave them and leave in reverse when you go back.
 *
 * Nobody presents on the web, so each slide can carry what would have been
 * said over it: lautwasser.notes.<id>, shown under the stage (N) and always
 * in the phone caption.
 */

const notesKey = (id: string) => `lautwasser.notes.${id}`;

const BASE = `/project/${LAUTWASSER_ID}`;

/** One swipe is one slide; the lock is extended while the gesture's inertia keeps firing. */
const WHEEL_LOCK_MS = 700;
const WHEEL_QUIET_MS = 180;
const SWIPE_THRESHOLD = 50;
/** Full screen hides the chrome after this long without the pointer moving. */
const IDLE_MS = 2500;

interface Travel {
    transition: Transition;
    back: boolean;
    reduce: boolean;
}

const VECTOR = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] } as const;

/** Going back undoes a transition: what covered now pulls away, and the reverse. */
const reverse = (type: Transition['type']): Transition['type'] =>
    type === 'cover' ? 'pull' : type === 'pull' ? 'cover' : type;

/**
 * PowerPoint's three moves. push: both slides travel together. cover: the new
 * slide slides in over the old, which stays put. pull: the old slide slides
 * away and uncovers the new one, which was underneath all along.
 */
const variants: Variants = {
    enter: ({ transition, back, reduce }: Travel) => {
        if (reduce || transition.type === 'fade') return { opacity: 0, x: 0, y: 0, zIndex: 1 };
        const type = back ? reverse(transition.type) : transition.type;
        if (type === 'pull') return { opacity: 1, x: 0, y: 0, zIndex: 0 };
        const [dx, dy] = VECTOR[transition.dir];
        const s = back ? -1 : 1;
        return { opacity: 1, x: `${-dx * s * 100}%`, y: `${-dy * s * 100}%`, zIndex: 2 };
    },
    center: { opacity: 1, x: 0, y: 0, zIndex: 1 },
    exit: ({ transition, back, reduce }: Travel) => {
        if (reduce || transition.type === 'fade') return { opacity: 0, zIndex: 0 };
        const type = back ? reverse(transition.type) : transition.type;
        if (type === 'cover') return { opacity: 1, x: 0, y: 0, zIndex: 0 };
        const [dx, dy] = VECTOR[transition.dir];
        const s = back ? -1 : 1;
        return { opacity: 1, x: `${dx * s * 100}%`, y: `${dy * s * 100}%`, zIndex: type === 'pull' ? 2 : 1 };
    },
};

/**
 * One slide in the stage. Its media plays only while it is the slide on
 * screen: a slide that is on its way out keeps rendering for the length of
 * the transition, but falls silent at once.
 */
const SlideFrame = ({ slide, sound, solo, setSolo }: {
    slide: SlideDef;
    sound: boolean;
    solo: MediaId | null;
    setSolo: (id: MediaId | null) => void;
}) => {
    const present = useIsPresent();
    const playback = useMemo(() => ({ active: present, sound, solo, setSolo }), [present, sound, solo, setSolo]);
    return (
        <PlaybackContext.Provider value={playback}>
            <slide.Render phase={slide.phase} />
        </PlaybackContext.Provider>
    );
};

const Deck = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { n } = useParams<{ n?: string }>();
    const reduce = Boolean(useReducedMotion());

    const total = SLIDES.length;
    const parsed = n === undefined ? 1 : Number(n);
    const valid = Number.isInteger(parsed) && parsed >= 1 && parsed <= total;
    const index = valid ? parsed - 1 : 0;
    const slide = SLIDES[index];

    const [travel, setTravel] = useState<Travel>({ transition: slide.transition, back: false, reduce });
    const [sound, setSound] = useState(false);
    const [solo, setSolo] = useState<MediaId | null>(slide.lead ?? null);
    const [fullscreen, setFullscreen] = useState(false);
    const [idle, setIdle] = useState(false);
    // Full screen is for presenting: it starts without the notes.
    const [notesOn, setNotesOn] = useState(true);

    const notes = i18n.exists(notesKey(slide.id)) ? t(notesKey(slide.id)) : '';
    const anyNotes = SLIDES.some((s) => i18n.exists(notesKey(s.id)));

    const rootRef = useRef<HTMLDivElement>(null);
    const wheelLockedUntil = useRef(0);
    const pointerStart = useRef<{ x: number; y: number } | null>(null);

    // Each slide starts with its own voice.
    const [soloFor, setSoloFor] = useState(index);
    if (soloFor !== index) {
        setSoloFor(index);
        setSolo(slide.lead ?? null);
    }

    const go = useCallback((to: number) => {
        if (to < 0 || to >= total || to === index) return;
        const back = to < index;
        setTravel({ transition: back ? SLIDES[index].transition : SLIDES[to].transition, back, reduce });
        navigate(`${BASE}/slides/${to + 1}`, { replace: true });
    }, [index, total, navigate, reduce]);

    const step = useCallback((delta: number) => go(index + delta), [go, index]);

    const toggleFullscreen = useCallback(() => {
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        else rootRef.current?.requestFullscreen().catch(() => {});
    }, []);

    useEffect(() => {
        const sync = () => {
            const on = document.fullscreenElement !== null;
            setFullscreen(on);
            setNotesOn(!on);
        };
        document.addEventListener('fullscreenchange', sync);
        return () => document.removeEventListener('fullscreenchange', sync);
    }, []);

    // The slides either side are one keypress away: have their pictures ready.
    useEffect(() => {
        for (const neighbour of [SLIDES[index + 1], SLIDES[index - 1]]) {
            if (neighbour) preloadMedia(neighbour.media);
        }
    }, [index]);

    // The deck owns the whole viewport; the page underneath must not scroll.
    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target as HTMLElement;
            // A focused button or video keeps its own space and enter.
            const owned = target.closest('button, a, video, input') !== null;
            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                case 'PageDown':
                    step(1);
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                case 'PageUp':
                    step(-1);
                    break;
                case ' ':
                case 'Enter':
                    if (owned) return;
                    step(e.shiftKey ? -1 : 1);
                    break;
                case 'Home':
                    go(0);
                    break;
                case 'End':
                    go(total - 1);
                    break;
                case 'f':
                case 'F':
                    toggleFullscreen();
                    break;
                case 'm':
                case 'M':
                    setSound((s) => !s);
                    break;
                case 'n':
                case 'N':
                    setNotesOn((on) => !on);
                    break;
                case 'Escape':
                    // In full screen the browser takes Escape itself.
                    if (!document.fullscreenElement) navigate(BASE);
                    break;
                default:
                    return;
            }
            e.preventDefault();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [step, go, total, toggleFullscreen, navigate]);

    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const now = performance.now();
            if (now < wheelLockedUntil.current) {
                wheelLockedUntil.current = Math.max(wheelLockedUntil.current, now + WHEEL_QUIET_MS);
                return;
            }
            const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (Math.abs(delta) < 6) return;
            wheelLockedUntil.current = now + WHEEL_LOCK_MS;
            step(delta > 0 ? 1 : -1);
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [step]);

    // Full screen, like a projector: the controls step aside when nothing moves.
    useEffect(() => {
        if (!fullscreen) return;
        let timer = window.setTimeout(() => setIdle(true), IDLE_MS);
        const wake = () => {
            setIdle(false);
            window.clearTimeout(timer);
            timer = window.setTimeout(() => setIdle(true), IDLE_MS);
        };
        window.addEventListener('pointermove', wake);
        window.addEventListener('keydown', wake);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener('pointermove', wake);
            window.removeEventListener('keydown', wake);
        };
    }, [fullscreen]);

    const onPointerDown = (e: ReactPointerEvent) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: ReactPointerEvent) => {
        const start = pointerStart.current;
        pointerStart.current = null;
        if (!start || e.button !== 0) return;
        if ((e.target as HTMLElement).closest('button, a, video[controls]')) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
        else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) step(1);
    };

    if (!valid) return <Navigate to={`${BASE}/slides/1`} replace />;

    const chrome = `transition-opacity duration-500 ${fullscreen && idle ? 'opacity-0 pointer-events-none' : 'opacity-100'}`;
    const counter = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

    return (
        <div
            ref={rootRef}
            className={`fixed inset-0 z-[60] flex flex-col bg-black text-lw-paper font-lw ${fullscreen && idle ? 'cursor-none' : ''}`}
        >
            {/* Top bar */}
            <div className={`shrink-0 h-14 px-4 md:px-6 flex items-center justify-between gap-4 text-xs uppercase tracking-wider ${chrome}`}>
                <Link to={BASE} className="inline-flex items-center gap-2 text-lw-paper/70 hover:text-lw-paper transition-colors group">
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="hidden sm:inline">{t('lautwasser.deck.caseStudy')}</span>
                </Link>
                <div className="hidden md:flex items-center gap-3 text-lw-ink" style={{ fontSize: '1.1rem' }}>
                    <DisplayWord text={t('lautwasser.display.lautwasser')} />
                </div>
                <div className="flex items-center gap-1">
                    <span className="font-mono tabular-nums text-lw-paper/80 mr-2" aria-live="polite" aria-label={t('lautwasser.deck.counter', { n: index + 1, total })}>
                        {counter}
                    </span>
                    <button
                        type="button"
                        onClick={() => setSound((s) => !s)}
                        aria-pressed={sound}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                        title={sound ? t('lautwasser.deck.soundOff') : t('lautwasser.deck.soundOn')}
                        aria-label={t('lautwasser.deck.sound')}
                    >
                        {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </button>
                    {anyNotes && (
                        <button
                            type="button"
                            onClick={() => setNotesOn((on) => !on)}
                            aria-pressed={notesOn}
                            className="hidden md:inline-flex p-2 rounded-full hover:bg-white/10 transition-colors"
                            title={notesOn ? t('lautwasser.deck.notesOff') : t('lautwasser.deck.notesOn')}
                            aria-label={t('lautwasser.deck.notes')}
                        >
                            {notesOn ? <Captions size={18} /> : <CaptionsOff size={18} />}
                        </button>
                    )}
                    {document.fullscreenEnabled && (
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors"
                            aria-label={fullscreen ? t('lautwasser.deck.exitFullscreen') : t('lautwasser.deck.fullscreen')}
                            title={fullscreen ? t('lautwasser.deck.exitFullscreen') : t('lautwasser.deck.fullscreen')}
                        >
                            {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Stage: as large as a 16:9 frame can be in what's left. */}
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center [container-type:size]">
                <div
                    className="relative aspect-video overflow-hidden bg-black touch-pan-y"
                    style={{ width: 'min(100cqw, calc(100cqh * 16 / 9))' }}
                    onPointerDown={onPointerDown}
                    onPointerUp={onPointerUp}
                    role="region"
                    aria-roledescription="slide"
                    aria-label={t('lautwasser.deck.counter', { n: index + 1, total })}
                >
                    <AnimatePresence initial={false} custom={travel}>
                        <motion.div
                            // A group stays mounted from one of its slides to the next and animates within.
                            key={slide.group ?? slide.id}
                            custom={travel}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: travel.reduce || travel.transition.type === 'fade' ? 0.35 : 0.6, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute inset-0"
                        >
                            <SlideFrame slide={slide} sound={sound} solo={solo} setSolo={setSolo} />
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Phones held upright get the slide's labels at a size they can read. */}
                <div className={`md:hidden w-full px-6 pt-5 text-center ${chrome}`}>
                    <div className="text-[11px] uppercase tracking-widest text-lw-ink">
                        {t(`lautwasser.chapters.${slide.chapter}`)}
                    </div>
                    <div className="mt-1 text-base font-light uppercase tracking-wide">
                        {t(`lautwasser.slides.${slide.topic ?? slide.id}.topic`)}
                    </div>
                    {notes && (
                        <p className="mt-4 mx-auto max-w-md text-sm font-light leading-relaxed text-lw-paper/80">{notes}</p>
                    )}
                    <p className="mt-6 text-[11px] uppercase tracking-widest text-lw-paper/40 portrait:block landscape:hidden">
                        {t('lautwasser.deck.rotate')}
                    </p>
                </div>
            </div>

            {/* What would have been said over the slide. */}
            {notesOn && notes && (
                <p className="hidden md:block shrink-0 mx-auto max-w-3xl px-6 pt-4 text-center text-base font-light leading-relaxed text-lw-paper/80" aria-live="polite">
                    {notes}
                </p>
            )}

            {/* Progress, grouped by chapter. */}
            <div className={`shrink-0 px-4 md:px-6 pb-4 pt-3 ${chrome}`}>
                <div className="flex items-end gap-3">
                    {CHAPTERS.map((chapter) => {
                        const members = SLIDES.map((s, i) => ({ s, i })).filter(({ s }) => s.chapter === chapter);
                        if (members.length === 0) return null;
                        return (
                            <div key={chapter} className="flex-1 min-w-0" style={{ flexGrow: members.length }}>
                                {/* A one-slide chapter is one bar wide, too narrow for some names: they truncate, in full on hover. */}
                                <div
                                    title={t(`lautwasser.chapters.${chapter}`)}
                                    className={`hidden md:block mb-1.5 text-[10px] uppercase tracking-widest truncate ${slide.chapter === chapter ? 'text-lw-ink' : 'text-lw-paper/30'}`}
                                >
                                    {t(`lautwasser.chapters.${chapter}`)}
                                </div>
                                <div className="flex gap-1">
                                    {members.map(({ s, i }) => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => go(i)}
                                            aria-label={t('lautwasser.deck.counter', { n: i + 1, total })}
                                            aria-current={i === index ? 'step' : undefined}
                                            className="group flex-1 py-2"
                                        >
                                            <span className={`block h-[3px] rounded-full transition-colors ${i === index ? 'bg-lw-blue' : i < index ? 'bg-lw-paper/50 group-hover:bg-lw-paper/80' : 'bg-lw-paper/15 group-hover:bg-lw-paper/40'}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="hidden md:block mt-1 text-right text-[10px] uppercase tracking-widest text-lw-paper/30">
                    {t('lautwasser.deck.keys')}
                    {anyNotes && ` · ${t('lautwasser.deck.keysNotes')}`}
                </div>
            </div>
        </div>
    );
};

export default Deck;
