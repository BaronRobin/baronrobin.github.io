import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { LAUTWASSER_ID, projects } from '../../data/projects';
import ProjectTechnicals from '../../components/ProjectTechnicals';
import SiteFooter from '../../components/SiteFooter';
import {
    BAR_HEX, IDEA_STEPS, NOISE, NOISE_SOURCE_URL, PALETTE, STATES, STATION_DOT, STATIONS, STATIONS_MAP_AT,
} from './data';
import { aspectOf, ratioOf, type MediaId } from './media';
import { Clip, DisplayWord, Still } from './parts';
import { PlaybackContext } from './playback';
import SectionIndex from './SectionIndex';

/*
 * The project page: the deck's look, regrouped for reading. Chapters follow
 * the presentation, each opening with the deck's header strip and title word;
 * the prose is the slide text and the speaker notes. The slides themselves
 * are one click away under /slides.
 */

const PROJECT = projects.find((p) => p.id === LAUTWASSER_ID)!;

/** The title slide's scrim, eased off a little: a page hero has to show its video. */
const HERO_SCRIM = 'linear-gradient(to bottom, rgba(0,0,0,.55) 0%, rgba(0,0,0,.45) 25%, rgba(0,0,0,.82) 55%, rgba(0,0,0,.9) 100%)';

/** Sized so the longest word (PERSPECTIVAS, 12.6em) still fits the column. */
const CHAPTER_WORD: CSSProperties = { fontSize: 'clamp(1.5rem, 6.5vw, 5.4rem)' };

/** The moodboard's pictures, in an order that balances the columns. */
const MOOD: MediaId[] = [
    'mood-sea', 'mood-ripple', 'mood-installation', 'mood-turntable', 'mood-wave',
    'mood-headphones', 'mood-poster', 'mood-knobs', 'mood-oscylator',
];

const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/** The deck's header strip: small caps between hairline corner marks. */
const Strip = ({ left, middle, right, light = false }: { left: ReactNode; middle: ReactNode; right?: ReactNode; light?: boolean }) => {
    const { t } = useTranslation();
    const tick = `inline-block w-2.5 h-2.5 border-t border-r mr-2 -translate-y-px ${light ? 'border-black/30' : 'border-lw-paper/25'}`;
    return (
        <div className="grid grid-cols-2 md:grid-cols-[1fr_1fr_auto] gap-x-6 gap-y-1 font-lw font-light uppercase text-[11px] tracking-[0.16em] text-lw-ink">
            <span><span aria-hidden className={tick} />{left}</span>
            <span><span aria-hidden className={tick} />{middle}</span>
            <span className="hidden md:block text-right"><span aria-hidden className={tick} />{right ?? t('lautwasser.course')}</span>
        </div>
    );
};

/** One chapter: its strip, its word in the deck's title face, then the content. */
const Chapter = ({ id, left, middle, word, children }: {
    id: string;
    left: ReactNode;
    middle: ReactNode;
    word?: string;
    children: ReactNode;
}) => (
    <section id={id} className="relative scroll-mt-20">
        <div className="container mx-auto max-w-6xl px-6 py-20 md:py-28">
            <Strip left={left} middle={middle} />
            {word && (
                <h2 className="mt-10 md:mt-14 mb-10 md:mb-14 text-lw-blue" style={CHAPTER_WORD}>
                    <DisplayWord text={word} />
                </h2>
            )}
            {children}
        </div>
    </section>
);

/** A slide's worth within a chapter, under that slide's strip. */
const Block = ({ left, middle, children }: { left: ReactNode; middle: ReactNode; children: ReactNode }) => (
    <div className="mt-20 md:mt-28">
        <Strip left={left} middle={middle} />
        <div className="mt-10">{children}</div>
    </div>
);

const Lead = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <p className={`max-w-3xl font-lw font-light text-lg md:text-2xl leading-relaxed text-lw-paper/90 ${className}`}>{children}</p>
);

const Note = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
    <p className={`max-w-2xl font-lw font-light text-base md:text-lg leading-relaxed text-lw-paper/70 ${className}`}>{children}</p>
);

/** A clip or still in a frame of the deck's hairline, holding its own shape. */
const Framed = ({ ratio, className = '', children }: { ratio: string; className?: string; children: ReactNode }) => (
    <div className={`relative overflow-hidden border border-white/10 ${className}`} style={{ aspectRatio: ratio }}>
        {children}
    </div>
);

/**
 * Pictures side by side at one height, the way the deck lines them up: each
 * column is as wide as its picture is for that height.
 */
const Row = ({ ids, still = false, className = '' }: { ids: MediaId[]; still?: boolean; className?: string }) => (
    <div className={`grid gap-3 md:gap-5 ${className}`} style={{ gridTemplateColumns: ids.map((id) => `${aspectOf(id)}fr`).join(' ') }}>
        {ids.map((id) => (
            <Framed key={id} ratio={ratioOf(id)}>
                {still ? <Still id={id} /> : <Clip id={id} />}
            </Framed>
        ))}
    </div>
);

/** Looping tiles with a word over each: the concept's four steps, the installation's four states. */
const Tiles = ({ ids, labels, numbered = false }: { ids: MediaId[]; labels: string[]; numbered?: boolean }) => (
    <ol className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
        {ids.map((id, i) => (
            <li key={id} className="relative aspect-square overflow-hidden border border-white/10">
                <Clip id={id} />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 font-lw font-light uppercase text-lw-paper text-center px-2">
                    {numbered && <span className="text-[10px] tracking-[0.2em] text-lw-paper/60">{String(i + 1).padStart(2, '0')}</span>}
                    <span className="text-sm md:text-lg tracking-wide">{labels[i]}</span>
                </div>
            </li>
        ))}
    </ol>
);

/**
 * Slide 4 again, for reading rather than presenting: one row per source, the
 * bar's length its level. The birds keep the deck's break at 70 of their
 * 70-90 dB.
 */
const NoiseChart = () => {
    const { t } = useTranslation();
    const reduce = useReducedMotion();
    return (
        <figure>
            <div className="grid grid-cols-[4.5rem_1fr] sm:grid-cols-[5.5rem_1fr_15rem] gap-x-4 pb-3 mb-3 border-b border-white/10 font-lw font-light uppercase text-[11px] tracking-[0.16em] text-lw-paper/35">
                <span>dB</span>
                <span>{t('lautwasser.decibels.level')}</span>
                <span className="hidden sm:block">{t('lautwasser.decibels.source')}</span>
            </div>
            <ul className="space-y-2.5 sm:space-y-2">
                {NOISE.map((row, i) => {
                    const colour = BAR_HEX[row.colour];
                    const bar = row.source === 'birds'
                        ? `linear-gradient(to right, ${colour} 0 76.5%, transparent 76.5% 78.5%, ${colour} 78.5%)`
                        : colour;
                    return (
                        <li key={row.source} className="grid grid-cols-[4.5rem_1fr] sm:grid-cols-[5.5rem_1fr_15rem] gap-x-4 items-center font-lw font-light">
                            <span className="tabular-nums text-sm sm:text-base" style={{ color: colour }}>{row.db}</span>
                            <div className="h-3 sm:h-3.5">
                                <motion.div
                                    className="h-full origin-left"
                                    style={{ width: `${(row.level / 150) * 100}%`, background: bar }}
                                    initial={reduce ? false : { scaleX: 0 }}
                                    whileInView={{ scaleX: 1 }}
                                    viewport={{ once: true, margin: '-40px' }}
                                    transition={{ duration: 0.7, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                                />
                            </div>
                            <span className="col-start-2 sm:col-start-auto text-xs sm:text-sm" style={{ color: row.colour === 'paper' ? undefined : colour }}>
                                {t(`lautwasser.decibels.sources.${row.source}`)}
                            </span>
                        </li>
                    );
                })}
            </ul>
            <figcaption className="mt-5 font-lw font-light text-xs text-lw-paper/40">
                <a href={NOISE_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 decoration-white/20 hover:text-lw-paper/70 transition-colors">
                    {t('lautwasser.decibels.credit')}
                </a>
            </figcaption>
        </figure>
    );
};

/** Slide 9's map with its dots, which the deck placed on the slide rather than the map. */
const StationsMap = () => {
    const [mx, my, mw, mh] = STATIONS_MAP_AT;
    const [dw, dh] = STATION_DOT;
    return (
        <Framed ratio={ratioOf('stations-map')}>
            <Still id="stations-map" />
            {STATIONS.map(([x, y]) => (
                <span
                    key={`${x}-${y}`}
                    aria-hidden
                    className="absolute aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full bg-lw-blue ring-1 ring-white"
                    style={{ left: `${((x + dw / 2 - mx) / mw) * 100}%`, top: `${((y + dh / 2 - my) / mh) * 100}%`, width: `${(dw / mw) * 100}%` }}
                />
            ))}
        </Framed>
    );
};

/** The deck's outlined arrow with "OSC" in it: the knob's value travelling to TouchDesigner. */
const OscArrow = () => (
    <div className="relative w-14 sm:w-20 md:w-28 aspect-[7/5] text-lw-paper">
        <svg aria-hidden viewBox="0 0 140 100" className="absolute inset-0 w-full h-full overflow-visible" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M0 25 H90 V0 L140 50 L90 100 V75 H0 Z" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute inset-y-0 left-[9%] flex items-center font-lw font-light text-xs sm:text-sm md:text-lg">OSC</span>
    </div>
);

/** Line art on black needs no frame: the Pi, the knob, the computer. */
const Plain = ({ id }: { id: MediaId }) => (
    <div className="relative" style={{ aspectRatio: ratioOf(id) }}>
        <Still id={id} />
    </div>
);

/** Slide 21's phone, with the app running on its screen where the deck put it. */
const PhoneWithApp = () => (
    <div className="relative" style={{ aspectRatio: ratioOf('pi-phone') }}>
        <Still id="pi-phone" />
        <div className="absolute" style={{ left: '36.3%', top: '9.95%', width: '49.2%', height: '65.9%' }}>
            <Clip id="app-ui" />
        </div>
    </div>
);

const CaseStudy = () => {
    const { t } = useTranslation();
    const [solo, setSolo] = useState<MediaId | null>(null);
    const playback = useMemo(() => ({ active: null, sound: false, solo, setSolo }), [solo]);
    const steps = t('lautwasser.slides.idee.steps', { returnObjects: true }) as string[];
    const states = t('lautwasser.slides.logik.states', { returnObjects: true }) as string[];
    const prozess = t('lautwasser.chapters.prozess');
    const ausstellung = t('lautwasser.chapters.ausstellung');

    // The index down the right edge: every section, named as it reads on the
    // page (the chapter words in plain type rather than the display face).
    const index = [
        { id: 'top', label: t('lautwasser.display.lautwasser') },
        { id: 'intro', label: t('lautwasser.slides.intro.topic') },
        { id: 'herleitung', label: t('lautwasser.display.sound') },
        { id: 'casefilm', label: t('lautwasser.chapters.casefilm') },
        { id: 'konzept', label: t('lautwasser.display.konzept') },
        { id: 'prozess', label: t('lautwasser.display.prozess') },
        { id: 'ausstellung', label: t('lautwasser.display.ausstellung') },
        { id: 'ausblick', label: t('lautwasser.display.ausblick') },
        { id: 'technicals', label: t('lautwasser.study.tools') },
    ];

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <PlaybackContext.Provider value={playback}>
            <div className="min-h-screen bg-black text-lw-paper font-lw selection:bg-lw-blue/60">
                <SectionIndex entries={index} />


                {/* 1 - the title slide as a hero */}
                <header id="top" className="relative h-[100svh] min-h-[560px] overflow-hidden">
                    <Clip id="title" />
                    <div aria-hidden className="absolute inset-0" style={{ background: HERO_SCRIM }} />
                    <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
                        <h1 className="text-lw-blue" style={{ fontSize: 'clamp(1.5rem, 6.5vw, 7rem)' }}>
                            <DisplayWord text={t('lautwasser.display.lautwasser')} />
                        </h1>
                        <p className="mt-5 font-light uppercase tracking-wide text-lw-paper" style={{ fontSize: 'clamp(0.85rem, 1.9vw, 1.5rem)' }}>
                            {t('lautwasser.subtitle')}
                        </p>
                        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                            <Link
                                to="slides/1"
                                className="inline-flex items-center gap-2 rounded-full bg-lw-blue hover:bg-lw-ink px-6 py-3 text-sm uppercase tracking-wider text-white transition-colors"
                            >
                                <Play size={16} className="fill-current" />
                                {t('lautwasser.deck.present')}
                            </Link>
                            <button
                                type="button"
                                onClick={() => scrollToId('casefilm')}
                                className="inline-flex items-center gap-2 rounded-full border border-lw-paper/30 hover:border-lw-paper/70 px-6 py-3 text-sm uppercase tracking-wider text-lw-paper transition-colors"
                            >
                                {t('lautwasser.study.watchFilm')}
                            </button>
                        </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 pb-6">
                        <div className="container mx-auto max-w-6xl px-6">
                            <Strip left={t('lautwasser.team')} middle={t('lautwasser.theme')} />
                        </div>
                    </div>
                </header>

                {/* 2 - the one light slide: what Lautwasser is */}
                <section id="intro" className="relative scroll-mt-20 bg-lw-paper text-lw-line">
                    <div className="container mx-auto max-w-6xl px-6 py-20 md:py-28">
                        <Strip light left={t('lautwasser.program')} middle={t('lautwasser.supervisors')} right={t('lautwasser.semester')} />
                        <div className="mt-12 md:mt-16 grid md:grid-cols-[1fr_1.5fr] gap-10 md:gap-16">
                            <div className="font-lw font-light uppercase text-lw-ink leading-[1.08]" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
                                <p>{t('lautwasser.slides.intro.space')}</p>
                                <p className="mt-6"><span className="font-extrabold">M85</span></p>
                                <p>{t('lautwasser.semester')}</p>
                                <p className="mt-6">{t('lautwasser.theme')}</p>
                            </div>
                            <div>
                                <p className="font-lw font-light text-base md:text-lg leading-relaxed text-justify hyphens-auto">
                                    <em className="not-italic font-normal">{t('lautwasser.slides.intro.title')}</em>
                                    {' '}
                                    {t('lautwasser.slides.intro.body')}
                                </p>
                                <p className="mt-6 font-lw font-light text-sm leading-relaxed text-lw-line/60">{t('lautwasser.study.theme')}</p>
                                <dl className="mt-10 space-y-1 font-lw text-sm">
                                    <dt className="sr-only">Team</dt>
                                    <dd className="font-normal">{t('lautwasser.study.credits.team')}</dd>
                                    <dd className="font-light text-lw-line/70">{t('lautwasser.study.credits.supervised')}</dd>
                                    <dd className="font-light text-lw-line/70">{t('lautwasser.study.credits.course')}</dd>
                                </dl>
                            </div>
                        </div>
                        <Framed ratio={ratioOf('intro-wave')} className="mt-14 md:mt-20 border-black/10">
                            <Still id="intro-wave" />
                        </Framed>
                    </div>
                </section>

                {/* 3-5 - background: sound, noise, birds */}
                <Chapter id="herleitung" left={t('lautwasser.slides.wellen.topic')} middle={t('lautwasser.chapters.herleitung')} word={t('lautwasser.display.sound')}>
                    <Lead>{t('lautwasser.study.herleitung.lead')}</Lead>
                    <Framed ratio={ratioOf('sound')} className="mt-12">
                        <Clip id="sound" />
                    </Framed>

                    <Block left={t('lautwasser.slides.laerm.topic')} middle={t('lautwasser.chapters.herleitung')}>
                        <NoiseChart />
                    </Block>

                    <Block left={t('lautwasser.slides.voegel.topic')} middle={t('lautwasser.chapters.herleitung')}>
                        <p className="font-lw font-extrabold leading-none" style={{ fontSize: 'clamp(1.6rem, 4.4vw, 3.4rem)' }}>
                            {t('lautwasser.slides.voegel.lead')}
                        </p>
                        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] gap-3 md:gap-5 items-stretch">
                            <Framed ratio={ratioOf('bird-drawing')}>
                                <Still id="bird-drawing" />
                            </Framed>
                            <div className="relative w-7 sm:w-10 md:w-14 overflow-hidden border border-white/10">
                                <Clip id="bird-wave" />
                            </div>
                            <Framed ratio={ratioOf('bird')}>
                                <Clip id="bird" />
                            </Framed>
                        </div>
                        <p className="mt-8 text-right font-lw font-extrabold leading-none" style={{ fontSize: 'clamp(1.6rem, 4.4vw, 3.4rem)' }}>
                            {t('lautwasser.slides.voegel.tail')}
                            <br />
                            {t('lautwasser.slides.voegel.tail2')}
                        </p>
                        <Note className="mt-10">{t('lautwasser.study.herleitung.birds')}</Note>
                    </Block>

                    <p className="mt-20 md:mt-28 max-w-4xl font-lw font-light uppercase text-lw-paper" style={{ fontSize: 'clamp(1.6rem, 4vw, 3.2rem)', lineHeight: 1.1 }}>
                        {t('lautwasser.study.herleitung.question')}
                    </p>
                </Chapter>

                {/* 6 - the case film */}
                <section id="casefilm" className="relative scroll-mt-20">
                    <div className="container mx-auto max-w-6xl px-6 pb-20 md:pb-28">
                        <Strip left={t('lautwasser.slides.casefilm.topic')} middle={t('lautwasser.theme')} />
                        <Note className="mt-8">{t('lautwasser.study.casefilm')}</Note>
                        <Framed ratio="16 / 9" className="mt-8">
                            <Clip id="casefilm" film fit="contain" />
                        </Framed>
                    </div>
                </section>

                {/* 7-8 - concept */}
                <Chapter id="konzept" left={t('lautwasser.slides.idee.topic')} middle={t('lautwasser.chapters.konzept')} word={t('lautwasser.display.konzept')}>
                    <Lead>{t('lautwasser.study.konzept.lead')}</Lead>
                    <div className="mt-12">
                        <Tiles ids={IDEA_STEPS} labels={steps} numbered />
                    </div>

                    <Block left={t('lautwasser.slides.datenvis.topic')} middle={t('lautwasser.chapters.konzept')}>
                        <Note>{t('lautwasser.study.konzept.data')}</Note>
                        <Row ids={['datavis', 'bubbles']} className="mt-8" />
                    </Block>
                </Chapter>

                {/* 9-23 - process */}
                <Chapter id="prozess" left={t('lautwasser.slides.stationen.topic')} middle={prozess} word={t('lautwasser.display.prozess')}>
                    <Lead>{t('lautwasser.study.prozess.stations')}</Lead>
                    <div className="mt-12">
                        <StationsMap />
                    </div>
                    <Row ids={['rec-main', 'rec-left', 'rec-right']} className="mt-3 md:mt-5" />

                    <Block left={t('lautwasser.slides.spektral.topic')} middle={prozess}>
                        <Note>{t('lautwasser.study.prozess.spectral')}</Note>
                        <div className="mt-8 grid md:grid-cols-2 gap-5">
                            {(['listen-24', 'listen-32'] as MediaId[]).map((id) => (
                                <figure key={id}>
                                    <Framed ratio={ratioOf('listen-32')}>
                                        <Clip id={id} />
                                    </Framed>
                                    <figcaption className="mt-3 font-lw font-light text-2xl md:text-3xl text-lw-paper">
                                        {id === 'listen-24' ? '24-Bit' : '32-Bit'}
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    </Block>

                    <Block left={t('lautwasser.slides.td.topic')} middle={prozess}>
                        <Note>{t('lautwasser.study.prozess.td')}</Note>
                        <Framed ratio={ratioOf('td-network')} className="mt-8">
                            <Clip id="td-network" />
                        </Framed>
                        <Framed ratio={ratioOf('effect')} className="mt-3 md:mt-5">
                            <Clip id="effect" />
                        </Framed>
                        <Row ids={['fx-a', 'fx-b', 'fx-c']} className="mt-3 md:mt-5" />
                        <Framed ratio={ratioOf('td-effect')} className="mt-3 md:mt-5">
                            <Clip id="td-effect" />
                        </Framed>
                    </Block>

                    <Block left={t('lautwasser.slides.perspektive.topic')} middle={prozess}>
                        <Note>{t('lautwasser.study.prozess.persona')}</Note>
                        <Framed ratio={ratioOf('persona-phone')} className="mt-8">
                            <Still id="persona-phone" />
                            <p className="absolute left-[3%] bottom-[7%] max-w-[65%] font-lw font-light uppercase leading-[1.1] text-lw-paper" style={{ fontSize: 'clamp(1rem, 3.4vw, 2.6rem)' }}>
                                {t('lautwasser.slides.perspektive.quote')}
                            </p>
                        </Framed>
                        <Row ids={['persona-face', 'persona-fx']} className="mt-3 md:mt-5" />
                    </Block>

                    <Block left={t('lautwasser.slides.pi.topic')} middle={prozess}>
                        <Note>{t('lautwasser.study.prozess.control')}</Note>
                        <div
                            className="mt-8 grid items-center gap-3 md:gap-5"
                            style={{ gridTemplateColumns: `${aspectOf('pi-board')}fr ${aspectOf('pi-knob')}fr auto ${aspectOf('pi-pc')}fr` }}
                        >
                            <Plain id="pi-board" />
                            <Plain id="pi-knob" />
                            <OscArrow />
                            <Plain id="pi-pc" />
                        </div>

                        <Note className="mt-12">{t('lautwasser.study.prozess.app')}</Note>
                        <div
                            className="mt-8 grid items-center gap-3 md:gap-5"
                            style={{ gridTemplateColumns: `${aspectOf('pi-pc')}fr auto ${aspectOf('pi-phone')}fr` }}
                        >
                            <Plain id="pi-pc" />
                            <OscArrow />
                            <PhoneWithApp />
                        </div>

                        <Note className="mt-12">{t('lautwasser.study.prozess.stele')}</Note>
                        <Framed ratio={ratioOf('stele-print')} className="mt-8">
                            <Still id="stele-print" />
                        </Framed>
                    </Block>

                    <Block left={t('lautwasser.slides.logik.topic')} middle={prozess}>
                        <Note>{t('lautwasser.study.prozess.logic')}</Note>
                        <div className="mt-8">
                            <Tiles ids={STATES} labels={states} />
                        </div>
                    </Block>
                </Chapter>

                {/* 24-27 - exhibition */}
                <Chapter id="ausstellung" left={t('lautwasser.slides.moodboard.topic')} middle={ausstellung} word={t('lautwasser.display.ausstellung')}>
                    <Lead>{t('lautwasser.study.ausstellung.mood')}</Lead>
                    <div className="mt-12 columns-2 md:columns-3 gap-3 md:gap-5">
                        {MOOD.map((id) => (
                            <div key={id} className="mb-3 md:mb-5 break-inside-avoid overflow-hidden border border-white/10" style={{ aspectRatio: ratioOf(id) }}>
                                <Still id={id} />
                            </div>
                        ))}
                    </div>
                    <ul className="grid grid-cols-4 gap-3 md:gap-5">
                        {PALETTE.map((hex) => (
                            <li
                                key={hex}
                                className={`aspect-[3/2] flex items-end p-2 md:p-3 border border-white/10 font-lw font-light text-[10px] md:text-xs ${hex === '#f3f3f3' ? 'text-lw-line' : 'text-lw-paper'}`}
                                style={{ background: hex }}
                            >
                                {hex}
                            </li>
                        ))}
                    </ul>

                    <Block left={t('lautwasser.slides.aufbau.topic')} middle={ausstellung}>
                        <Note>{t('lautwasser.study.ausstellung.room')}</Note>
                        <Row ids={['build', 'room']} className="mt-8" />
                        <figure className="mt-3 md:mt-5">
                            <Framed ratio={ratioOf('showcase')}>
                                <Clip id="showcase" />
                            </Framed>
                            <figcaption className="mt-3 font-lw font-light uppercase text-2xl md:text-3xl text-lw-paper">
                                {t('lautwasser.slides.raum.caption')}
                            </figcaption>
                        </figure>
                    </Block>
                </Chapter>

                {/* 28 - outlook */}
                <Chapter id="ausblick" left={t('lautwasser.slides.weitere.topic')} middle={t('lautwasser.chapters.fazit')} word={t('lautwasser.display.ausblick')}>
                    <Lead>{t('lautwasser.study.ausblick')}</Lead>
                    <figure className="mt-12">
                        <Framed ratio={ratioOf('outlook-projection')}>
                            <Still id="outlook-projection" />
                        </Framed>
                        <Row ids={['outlook-mics', 'outlook-rathaus']} still className="mt-3 md:mt-5" />
                        <figcaption className="mt-3 text-right font-lw font-light uppercase text-[11px] tracking-[0.16em] text-lw-paper/50">
                            {t('lautwasser.slides.weitere.ai')}
                        </figcaption>
                    </figure>
                </Chapter>

                <div className="relative">
                    <ProjectTechnicals project={PROJECT} />
                </div>

                <SiteFooter />
            </div>
        </PlaybackContext.Provider>
    );
};

export default CaseStudy;
