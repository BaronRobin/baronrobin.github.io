import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { BACHELOR_ID, projects } from '../../data/projects';
import ProjectTechnicals from '../../components/ProjectTechnicals';
import SiteFooter from '../../components/SiteFooter';
import { Clip } from '../../deck/Clip';
import SectionIndex from '../../deck/SectionIndex';
import { clipMedia, preloadMedia, stillMedia } from './deck';
import { CHAPTERS, chapterSlides, type ChapterId } from './order';

/*
 * The project page: the deck regrouped for reading, in the deck's own look,
 * Helvetica on white with its one red. Each chapter opens with the question
 * the deck asked there, and links to its slides. The prose is the deck's
 * text and speaker notes; pictures that aren't Robin's carry their source,
 * as they did on the slides.
 */

const PROJECT = projects.find((p) => p.id === BACHELOR_ID)!;

/** The chapters the page has a section for, in deck order. The title is the hero. */
const SECTIONS = CHAPTERS.filter((c) => c !== 'titel');

type Crop = [number, number, number, number];

/** Crops the deck applied that the page keeps: the material spheres (slide 47), cut out of editor screenshots. */
const CROPS: Record<string, Crop> = {
    image106: [0.4031, 0.1489, 0.4148, 0.4857],
    image107: [0.4031, 0.1489, 0.4148, 0.4857],
    image108: [0.4031, 0.1489, 0.4148, 0.4857],
};

/** Width over height, as the picture is shown. */
const ratio = (name: string) => {
    const media = stillMedia(name);
    const [l, t, r, b] = CROPS[name] ?? [0, 0, 0, 0];
    return (media.w * (1 - l - r)) / (media.h * (1 - t - b));
};

/** A picture from the deck at its own proportions, cropped where the deck cropped it for good. */
const Picture = ({ name, alt = '' }: { name: string; alt?: string }) => {
    const media = stillMedia(name);
    const crop = CROPS[name];
    const img = (style?: CSSProperties) => (
        <img src={media.src} width={media.w} height={media.h} alt={alt} loading="lazy" decoding="async" style={style} className={crop ? 'absolute max-w-none' : 'block w-full h-auto'} />
    );
    if (!crop) return img();
    const [l, t, r, b] = crop;
    const w = 1 - l - r;
    const h = 1 - t - b;
    return (
        <div className="relative overflow-hidden" style={{ aspectRatio: ratio(name) }}>
            {img({ left: `${(-l / w) * 100}%`, top: `${(-t / h) * 100}%`, width: `${100 / w}%`, height: `${100 / h}%` })}
        </div>
    );
};

const Video = ({ name }: { name: string }) => {
    const media = clipMedia(name);
    return (
        <div className="relative" style={{ aspectRatio: `${media.w} / ${media.h}` }}>
            <Clip id={name} media={media} />
        </div>
    );
};

/** Side by side at one height, each as wide as its picture is at that height, as the deck lines them up. */
const Row = ({ names, videos = [], className = '' }: { names: string[]; videos?: string[]; className?: string }) => (
    <div className={`grid gap-3 md:gap-5 ${className}`} style={{ gridTemplateColumns: names.map((n) => `${ratio(n)}fr`).join(' ') }}>
        {names.map((n) => (videos.includes(n) ? <Video key={n} name={n} /> : <Picture key={n} name={n} />))}
    </div>
);

/** Where a picture that isn't Robin's comes from, as the slide said. */
const Source = ({ href }: { href: string }) => {
    const { t } = useTranslation();
    return (
        <a href={href} target="_blank" rel="noreferrer" className="block truncate text-xs text-black/45 hover:text-black transition-colors">
            {t('bachelor.study.source')}: {href.replace(/^https?:\/\//, '')}
        </a>
    );
};

const Caption = ({ children }: { children: ReactNode }) => (
    <figcaption className="mt-3 text-sm text-black/55">{children}</figcaption>
);

const Paragraphs = ({ k }: { k: string }) => {
    const { t } = useTranslation();
    const paras = t(k, { returnObjects: true }) as string[];
    return (
        <div className="max-w-3xl space-y-5 text-lg md:text-xl leading-relaxed text-black/80">
            {paras.map((p) => <p key={p}>{p}</p>)}
        </div>
    );
};

/*
 * The page runs the width of the window. The margin keeps clear of the
 * section dots on the right (right-2, xl:right-6).
 * From lg up the hero and each chapter are a 12-column grid: the words at a
 * reading measure, the pictures beside them.
 */
const FRAME = 'px-6 md:px-10 xl:px-14';
const GRID = 'lg:grid lg:grid-cols-12 lg:gap-x-8 xl:gap-x-10 2xl:gap-x-12';
const WORDS = 'lg:col-span-6 xl:col-span-5 2xl:col-span-4';
const PICTURES = 'lg:col-span-6 xl:col-span-7 2xl:col-span-8';

/**
 * A chapter: the deck's red label, the question it asked, the way into its slides.
 * On wide screens the label, heading and `text` stay in view while the
 * pictures (`children`) pass beside them, if the window is tall enough to
 * hold them; `flip` puts the pictures on the left. `wide` runs the full width
 * underneath, outside the grid, so the words stop before it. On a phone it
 * all stacks, words first.
 */
const Chapter = ({ id, text, children, wide, flip = false, side = '' }: {
    id: ChapterId;
    text?: ReactNode;
    children?: ReactNode;
    wide?: ReactNode;
    flip?: boolean;
    /** Extra classes for the pictures' column, e.g. how it sits against the words. */
    side?: string;
}) => {
    const { t } = useTranslation();
    const [from, to] = chapterSlides(id);
    return (
        <section id={id} className="scroll-mt-24 border-t border-black/10">
            <div className={`${FRAME} py-16 md:py-20`}>
                <div className={GRID}>
                    <div className={`${WORDS} lg:self-start lg:[@media(min-height:640px)]:sticky lg:top-28`}>
                        <div className="flex items-baseline justify-between gap-6 text-xs uppercase tracking-[0.2em]">
                            <span className="text-grillz-red">{t(`bachelor.chapters.${id}`)}</span>
                            <Link to={`slides/${from}`} className="group inline-flex items-center gap-1.5 text-black/45 hover:text-black transition-colors">
                                {t('bachelor.study.slides', { from, to })}
                                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                        <h2 className="mt-6 text-3xl md:text-5xl leading-tight tracking-tight text-balance">{t(`bachelor.study.${id}.heading`)}</h2>
                        {text && <div className="mt-10 md:mt-12 lg:mt-8">{text}</div>}
                    </div>
                    {children && (
                        // lg:mt-10 is the label row and its gap, so the pictures start level with the heading.
                        <div className={`${text ? 'mt-14' : 'mt-10 md:mt-12'} lg:mt-10 ${PICTURES} ${flip ? 'lg:order-first' : ''} space-y-10 md:space-y-14 lg:space-y-10 ${side}`}>
                            {children}
                        </div>
                    )}
                </div>
                {wide && <div className="mt-10 md:mt-14">{wide}</div>}
            </div>
        </section>
    );
};

/** The renders, in the deck's order. */
const RENDERS = ['image112', 'image110', 'image111', 'image113', 'image114', 'image115'];

const FADE = { duration: 400, easing: 'ease-in-out' } as const;

/**
 * One render in the viewer. It waits, transparent, until its picture has
 * loaded and decoded, then fades in over whatever is under it and says so.
 */
const Slide = ({ name, onShown }: { name: string; onShown: () => void }) => {
    const media = stillMedia(name);
    const reduce = useReducedMotion();
    const ref = useRef<HTMLImageElement>(null);
    const started = useRef(false);
    const [shown, setShown] = useState(false);

    const fadeIn = useCallback((img: HTMLImageElement) => {
        if (started.current) return;
        started.current = true;
        img.decode().catch(() => { /* drawn anyway */ }).then(() => {
            if (reduce) {
                setShown(true);
                onShown();
                return;
            }
            // Started before the class flips, so the picture never shows at full strength first.
            const fade = img.animate([{ opacity: 0 }, { opacity: 1 }], FADE);
            setShown(true);
            fade.finished.then(onShown, () => { /* taken off the page first */ });
        });
    }, [reduce, onShown]);

    // A picture already in the cache may have loaded before React was listening.
    useLayoutEffect(() => {
        const img = ref.current;
        if (img?.complete && img.naturalWidth > 0) fadeIn(img);
    }, [fadeIn]);

    return (
        <img
            ref={ref}
            src={media.src}
            width={media.w}
            height={media.h}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={(e) => fadeIn(e.currentTarget)}
            className={`absolute inset-0 h-full w-full object-contain ${shown ? 'opacity-100' : 'opacity-0'}`}
        />
    );
};

/**
 * The six renders, one at a time across the full width. The arrows, a swipe,
 * the dots, or ← → while the viewer is in view or focused step through them,
 * round and round. Each new render fades in over the last (400 ms, eased in
 * and out); the ones under it go once it's fully there, so stepping quickly
 * never drops to black. Pictures load lazily, then only the neighbours ahead.
 *
 * The renders are on black, so the frame is black too: on a wide, short
 * window it stays within the screen and the picture sits in the middle of it.
 */
const Viewer = ({ names }: { names: string[] }) => {
    const { t } = useTranslation();
    const count = names.length;
    const root = useRef<HTMLDivElement>(null);
    const keys = useRef(1);
    const [layers, setLayers] = useState([{ key: 0, at: 0 }]);
    const [warm, setWarm] = useState(false);
    const index = layers[layers.length - 1].at;

    const go = useCallback((to: (from: number) => number) => {
        setLayers((ls) => {
            const from = ls[ls.length - 1].at;
            const at = (to(from) + count) % count;
            return at === from ? ls : [...ls, { key: keys.current++, at }];
        });
    }, [count]);
    const step = useCallback((by: number) => go((from) => from + by), [go]);

    // A layer that has fully faded in covers everything under it.
    const shown = useCallback((key: number) => {
        setWarm(true);
        setLayers((ls) => {
            const i = ls.findIndex((l) => l.key === key);
            return i > 0 ? ls.slice(i) : ls;
        });
    }, []);

    useEffect(() => {
        if (warm) preloadMedia([names[(index + 1) % count], names[(index - 1 + count) % count]]);
    }, [warm, index, names, count]);

    // ← → step while at least half the viewer is on screen, or while focus is in
    // it and some of it is. Never once it's scrolled away, even if a button in
    // it kept focus from a click.
    useEffect(() => {
        const el = root.current;
        if (!el) return;
        let seen = 0;
        const observer = new IntersectionObserver(([entry]) => { seen = entry.isIntersecting ? entry.intersectionRatio : 0; }, { threshold: [0, 0.5] });
        observer.observe(el);
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
            const focused = el.contains(document.activeElement);
            if (!(seen >= 0.5 || (focused && seen > 0))) return;
            if (!focused && (e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable="true"]')) return;
            e.preventDefault();
            step(e.key === 'ArrowRight' ? 1 : -1);
        };
        window.addEventListener('keydown', onKey);
        return () => {
            observer.disconnect();
            window.removeEventListener('keydown', onKey);
        };
    }, [step]);

    // A swipe: a mostly sideways move of 40 px or more. Vertical moves still scroll the page.
    const touch = useRef<{ id: number; x: number; y: number } | null>(null);
    const onPointerDown = (e: ReactPointerEvent) => {
        if (e.pointerType !== 'mouse') touch.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: ReactPointerEvent) => {
        const start = touch.current;
        touch.current = null;
        if (!start || start.id !== e.pointerId) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    };

    // On a phone the arrows are small enough to stay in the black either side of the model.
    const arrow = 'absolute top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 md:h-12 md:w-12 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/70';
    const chevron = 'h-[18px] w-[18px] md:h-[22px] md:w-[22px]';

    return (
        <div ref={root} role="region" aria-label={t('bachelor.study.rendering.viewer.label')}>
            <div
                className="relative w-full overflow-hidden bg-black select-none"
                style={{ aspectRatio: '16 / 9', maxHeight: 'calc(100svh - 10rem)', touchAction: 'pan-y' }}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                onPointerCancel={() => { touch.current = null; }}
            >
                {layers.map((l) => <Slide key={l.key} name={names[l.at]} onShown={() => shown(l.key)} />)}
                <button type="button" onClick={() => step(-1)} aria-label={t('bachelor.study.rendering.viewer.previous')} className={`${arrow} left-1.5 md:left-5`}>
                    <ChevronLeft aria-hidden className={chevron} />
                </button>
                <button type="button" onClick={() => step(1)} aria-label={t('bachelor.study.rendering.viewer.next')} className={`${arrow} right-1.5 md:right-5`}>
                    <ChevronRight aria-hidden className={chevron} />
                </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
                <div className="-ml-1.5 flex items-center">
                    {names.map((n, i) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => go(() => i)}
                            aria-label={t('bachelor.study.rendering.viewer.show', { n: i + 1, total: count })}
                            aria-current={i === index ? 'true' : undefined}
                            className="group flex h-7 w-7 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-black/40 rounded-full"
                        >
                            <span
                                aria-hidden
                                className={`block rounded-full transition-all duration-300 ease-in-out ${i === index ? 'h-0.5 w-4 bg-black' : 'h-1.5 w-1.5 bg-black/25 group-hover:bg-black/60'}`}
                            />
                        </button>
                    ))}
                </div>
                <p aria-live="polite" className="text-xs tabular-nums tracking-[0.2em] text-black/45">
                    {index + 1} / {count}
                </p>
            </div>
        </div>
    );
};

const CaseStudy = () => {
    const { t } = useTranslation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const index = [
        { id: 'top', label: t(`projects.${BACHELOR_ID}.title`) },
        ...SECTIONS.map((id) => ({ id, label: t(`bachelor.chapters.${id}`) })),
        { id: 'technicals', label: t('bachelor.study.tools') },
    ];

    const pipeline = t('bachelor.study.fazit.steps', { returnObjects: true }) as string[];
    const materials = t('bachelor.study.material.metals', { returnObjects: true }) as string[];
    const properties = t('bachelor.study.material.properties', { returnObjects: true }) as string[];
    const casting = t('bachelor.study.guss.steps', { returnObjects: true }) as string[];

    return (
        <div className="min-h-screen bg-white text-black font-grillz selection:bg-grillz-red/20">
            <SectionIndex entries={index} tone="light" font="font-grillz" />

            {/* 1-2: the title slides as a hero */}
            <header id="top" className={`${FRAME} pt-36 md:pt-44 lg:pt-36 pb-20 md:pb-28 lg:pb-20 ${GRID} lg:items-end`}>
                <div className={WORDS}>
                    <p className="text-xs uppercase tracking-[0.2em] text-balance text-black/50">{t('bachelor.study.kicker')}</p>
                    <h1 className="mt-6 text-6xl md:text-8xl tracking-tight">{t(`projects.${BACHELOR_ID}.title`)}</h1>
                    <p className="mt-5 max-w-3xl text-xl md:text-3xl leading-snug text-balance text-black/70">{t('bachelor.study.subtitle')}</p>
                    <div className="mt-10 flex flex-wrap items-center gap-3">
                        <Link
                            to="slides/1"
                            className="inline-flex items-center gap-2 rounded-full bg-black hover:bg-grillz-red px-6 py-3 text-sm uppercase tracking-wider text-white transition-colors"
                        >
                            <Play size={16} className="fill-current" />
                            {t('deck.present')}
                        </Link>
                    </div>
                </div>
                <figure className={`mt-12 md:mt-16 lg:mt-0 ${PICTURES}`}>
                    <Picture name="image116" alt={t('bachelor.study.heroAlt')} />
                </figure>
            </header>

            {/* 3-11 */}
            <Chapter id="grillz" flip text={<Paragraphs k="bachelor.study.grillz.body" />}>
                <figure>
                    <Row names={['image61', 'image62', 'image63']} />
                    <div className="mt-3 grid gap-1">
                        <Source href="https://de.wikipedia.org/wiki/Grill_(Schmuck)#/media/Datei:Ancient_Egypt_Dentistry2.jpg" />
                        <Source href="https://de.wikipedia.org/wiki/Grill_(Schmuck)#/media/Datei:Copy_of_an_Etruscan_denture,_Europe,_1901-1930_Wellcome_L0058137.jpg" />
                        <Source href="https://de.wikipedia.org/wiki/Grill_(Schmuck)#/media/Datei:Top_and_bottom_custom_grillz_14k_gold.png" />
                    </div>
                </figure>
            </Chapter>

            {/*
              * 12-18. On wide screens the two 4:3 photos stack beside the square
              * ring, their column as wide as makes the stack exactly as tall as
              * the ring: 2 × ¾a + gap = width − gap − a.
              */}
            <Chapter id="idee" text={<Paragraphs k="bachelor.study.idee.body" />}>
                <div className="lg:grid lg:grid-cols-[calc((100%-40px)/2.5)_1fr] lg:gap-5 lg:items-start">
                    <figure className="grid grid-cols-2 lg:grid-cols-1 gap-3 md:gap-5">
                        <Picture name="image69" />
                        <Picture name="image70" />
                    </figure>
                    <figure className="mt-10 md:mt-14 lg:mt-0 max-w-md lg:max-w-none">
                        <Video name="media1" />
                        <Caption>{t('bachelor.study.idee.ring')}</Caption>
                    </figure>
                </div>
            </Chapter>

            {/* 19-25 */}
            <Chapter id="scan" flip text={<Paragraphs k="bachelor.study.scan.body" />}>
                <figure>
                    <Video name="media2" />
                </figure>
                <figure>
                    <Row names={['image81', 'image85']} />
                    <Caption>{t('bachelor.study.scan.credit')}</Caption>
                </figure>
            </Chapter>

            {/* 26-29 */}
            <Chapter id="wissen" text={<Paragraphs k="bachelor.study.wissen.body" />} side="lg:self-center">
                <blockquote className="border-l-2 border-grillz-red pl-6 md:pl-8">
                    <p className="text-xs uppercase tracking-[0.2em] text-black/50">Learning</p>
                    <p className="mt-3 text-2xl md:text-4xl leading-snug">{t('bachelor.study.wissen.learning')}</p>
                </blockquote>
            </Chapter>

            {/* 30-38 */}
            <Chapter id="modell" flip text={<Paragraphs k="bachelor.study.modell.body" />}>
                <figure>
                    <Row names={['image87', 'image90']} />
                    <Caption>{t('bachelor.study.modell.cleanup')}</Caption>
                </figure>
                <div className="grid md:grid-cols-2 gap-3 md:gap-5">
                    <figure>
                        <Video name="media3" />
                        <Caption>{t('bachelor.study.modell.zbrush')}</Caption>
                    </figure>
                    <figure>
                        <Video name="media4" />
                        <Caption>{t('bachelor.study.modell.sculpt')}</Caption>
                    </figure>
                </div>
                <figure>
                    <Picture name="image95" />
                    <Caption>{t('bachelor.study.modell.boolean')}</Caption>
                </figure>
            </Chapter>

            {/* 39-42 */}
            <Chapter id="prototyp" text={<Paragraphs k="bachelor.study.prototyp.body" />}>
                <div className="grid md:grid-cols-2 gap-3 md:gap-5">
                    <figure>
                        <Picture name="image98" />
                        <Caption>{t('bachelor.study.prototyp.slicer')}</Caption>
                    </figure>
                    <figure>
                        <Video name="media5" />
                        <Caption>{t('bachelor.study.prototyp.print')}</Caption>
                    </figure>
                </div>
            </Chapter>

            {/* 43-55: the renders, one at a time across the full width under the setup */}
            <Chapter id="rendering" flip text={<Paragraphs k="bachelor.study.rendering.body" />} wide={<Viewer names={RENDERS} />}>
                <figure>
                    <Row names={['image101', 'image102']} />
                    <Caption>{t('bachelor.study.rendering.setup')}</Caption>
                </figure>
                <figure className="max-w-2xl">
                    <Row names={['image108', 'image106', 'image107']} />
                    <Caption>{t('bachelor.study.rendering.metals')}</Caption>
                </figure>
            </Chapter>

            {/* 56-58: the metals under the heading, what they have to meet beside them */}
            <Chapter
                id="material"
                text={
                    <ul className="space-y-4 text-2xl md:text-3xl leading-snug">
                        {materials.map((m) => <li key={m}>{m}</li>)}
                    </ul>
                }
                side="max-w-3xl"
            >
                <div>
                    <p className="text-lg md:text-xl leading-relaxed text-black/80">{t('bachelor.study.material.lead')}</p>
                    <ul className="mt-6 space-y-2 text-lg text-black/80">
                        {properties.map((p) => (
                            <li key={p} className="flex gap-3"><span aria-hidden className="text-grillz-red">•</span>{p}</li>
                        ))}
                    </ul>
                    <p className="mt-8 text-2xl">ISO 10993</p>
                </div>
            </Chapter>

            {/* 59-60 */}
            <Chapter id="guss" text={<Paragraphs k="bachelor.study.guss.body" />}>
                <ol className="grid sm:grid-cols-2 2xl:grid-cols-4 gap-px bg-black/10 border border-black/10">
                    {casting.map((step, i) => (
                        <li key={step} className="bg-white p-6">
                            <span className="text-xs tabular-nums text-grillz-red">{String(i + 1).padStart(2, '0')}</span>
                            <p className="mt-3 text-lg leading-snug">{step}</p>
                        </li>
                    ))}
                </ol>
            </Chapter>

            {/* 93 and 95 */}
            <Chapter id="fazit">
                <ol className="space-y-3">
                    {pipeline.map((step, i) => (
                        <li key={step} className="flex items-baseline gap-5 text-xl md:text-2xl" style={{ paddingLeft: `${i * 1.5}%` }}>
                            <span className="w-8 shrink-0 text-xs tabular-nums text-grillz-red">{String(i + 1).padStart(2, '0')}</span>
                            {step}
                        </li>
                    ))}
                </ol>
            </Chapter>

            <div id="technicals" className="relative border-t border-black/10">
                <ProjectTechnicals project={PROJECT} />
            </div>

            <SiteFooter />
        </div>
    );
};

export default CaseStudy;
