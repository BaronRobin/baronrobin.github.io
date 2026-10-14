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
import { PlaybackContext } from '../../deck/playback';
import SectionIndex from '../../deck/SectionIndex';

/*
 * The project page: the deck's look, regrouped for reading. Chapters follow
 * the presentation, each opening with the deck's header strip and title word;
 * the prose is the slide text and the speaker notes. The slides themselves
 * are one click away under /slides.
 *
 * The page uses the whole window. On wide screens text either sits in the
 * first four of twelve columns beside its media (Split), or above a band of
 * pictures that runs the full width at one height (Band); prose keeps its
 * measure either way. Phones get one column.
 */

const PROJECT = projects.find((p) => p.id === LAUTWASSER_ID)!;

/** The page's side margins: wide enough on the right to clear the section index. */
const FRAME = 'px-6 md:px-10 xl:px-14';

/** The title slide's scrim, eased off a little: a page hero has to show its video. */
const HERO_SCRIM = 'linear-gradient(to bottom, rgba(0,0,0,.55) 0%, rgba(0,0,0,.45) 25%, rgba(0,0,0,.82) 55%, rgba(0,0,0,.9) 100%)';

/** Sized so the longest word (PERSPECTIVAS, 12.6em) still fits the column. */
const CHAPTER_WORD: CSSProperties = { fontSize: 'clamp(1.5rem, 6.5vw, 5.4rem)' };

/** The case film as wide as the window, but never taller than the screen below the header. */
const FILM_WIDTH = 'min(100%, calc((100svh - 11rem) * 16 / 9))';

/** The moodboard's pictures, in an order that balances the columns. */
const MOOD: MediaId[] = [
    'mood-sea', 'mood-ripple', 'mood-installation', 'mood-turntable', 'mood-wave',
    'mood-headphones', 'mood-poster', 'mood-knobs', 'mood-oscylator',
];

/** On wide screens the moodboard is two rows at one height, split here. */
const MOOD_ROWS = [MOOD.slice(0, 5), MOOD.slice(5)];

const scrollToId = (id: string, block: ScrollLogicalPosition = 'start') => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block });

/** Grid columns as wide as each picture is at a shared height. */
const fr = (...ids: MediaId[]) => ids.map((id) => `${aspectOf(id)}fr`).join(' ');

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
        <div className={`${FRAME} py-20 md:py-28`}>
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

/**
 * A clip or still in a frame of the deck's hairline, holding its own shape;
 * with `fill`, it takes its grid cell's shape on wide screens instead.
 */
const Framed = ({ ratio, fill = false, className = '', children }: { ratio: string; fill?: boolean; className?: string; children: ReactNode }) => (
    <div
        className={`relative overflow-hidden border border-white/10 aspect-[var(--ratio)] ${fill ? 'xl:aspect-auto' : ''} ${className}`}
        style={{ '--ratio': ratio } as CSSProperties}
    >
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

/**
 * Text beside its media on wide screens: the text in the first four of twelve
 * columns, the media in the other eight. Stacked below that, `space` apart.
 */
const Split = ({ text, space = 'mt-8', className = '', children }: {
    text: ReactNode;
    space?: string;
    className?: string;
    children: ReactNode;
}) => (
    <div className={`xl:grid xl:grid-cols-12 xl:gap-x-5 ${className}`}>
        <div className="xl:col-span-4 xl:pr-8">{text}</div>
        <div className={`${space} xl:mt-0 xl:col-span-8`}>{children}</div>
    </div>
);

/**
 * Pictures in one grid, each column as wide as its picture is at the row's
 * height: `cols` as the page stacks them, `wide` across the full width on
 * large screens.
 */
const Band = ({ cols, wide, className = '', children }: { cols: string; wide: string; className?: string; children: ReactNode }) => (
    <div
        className={`grid gap-3 md:gap-5 [grid-template-columns:var(--cols)] xl:[grid-template-columns:var(--wide)] ${className}`}
        style={{ '--cols': cols, '--wide': wide } as CSSProperties}
    >
        {children}
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
const StationsMap = ({ className = '' }: { className?: string }) => {
    const [mx, my, mw, mh] = STATIONS_MAP_AT;
    const [dw, dh] = STATION_DOT;
    return (
        <Framed ratio={ratioOf('stations-map')} className={className}>
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
    const [solo, setSolo] = useState<string | null>(null);
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
                                {t('deck.present')}
                            </Link>
                            <button
                                type="button"
                                onClick={() => scrollToId('casefilm-film', 'center')}
                                className="inline-flex items-center gap-2 rounded-full border border-lw-paper/30 hover:border-lw-paper/70 px-6 py-3 text-sm uppercase tracking-wider text-lw-paper transition-colors"
                            >
                                {t('lautwasser.study.watchFilm')}
                            </button>
                        </div>
                    </div>
                    {/* Raised clear of the title video's speaker button, which sits in the corner the strip now reaches. */}
                    <div className={`absolute inset-x-0 bottom-0 pb-12 ${FRAME}`}>
                        <Strip left={t('lautwasser.team')} middle={t('lautwasser.theme')} />
                    </div>
                </header>

                {/* 2 - the one light slide: what Lautwasser is */}
                <section id="intro" className="relative scroll-mt-20 bg-lw-paper text-lw-line">
                    <div className={`${FRAME} py-20 md:py-28`}>
                        <Strip light left={t('lautwasser.program')} middle={t('lautwasser.supervisors')} right={t('lautwasser.semester')} />
                        {/* Wide screens: the big type and, under it, the credits on the left; the text in two columns and the wave on the right. */}
                        <div className="mt-12 md:mt-16 grid md:grid-cols-[1fr_1.5fr] xl:grid-cols-12 gap-y-6 md:gap-x-16 xl:gap-x-5 xl:gap-y-10">
                            <div className="font-lw font-light uppercase text-lw-ink leading-[1.08] xl:col-span-4 xl:pr-8" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
                                <p>{t('lautwasser.slides.intro.space')}</p>
                                <p className="mt-6"><span className="font-extrabold">M85</span></p>
                                <p>{t('lautwasser.semester')}</p>
                                <p className="mt-6">{t('lautwasser.theme')}</p>
                            </div>
                            <p className="mt-4 md:mt-0 md:col-start-2 xl:col-start-5 xl:col-span-8 xl:columns-2 xl:gap-x-10 font-lw font-light text-base md:text-lg leading-relaxed text-justify hyphens-auto">
                                <em className="not-italic font-normal">{t('lautwasser.slides.intro.title')}</em>
                                {' '}
                                {t('lautwasser.slides.intro.body')}
                            </p>
                            <div className="md:col-start-2 xl:col-start-1 xl:col-span-4 xl:row-start-2 xl:self-end xl:pr-8">
                                <p className="font-lw font-light text-sm leading-relaxed text-lw-line/60">{t('lautwasser.study.theme')}</p>
                                <dl className="mt-10 space-y-1 font-lw text-sm">
                                    <dt className="sr-only">Team</dt>
                                    <dd className="font-normal">{t('lautwasser.study.credits.team')}</dd>
                                    <dd className="font-light text-lw-line/70">{t('lautwasser.study.credits.supervised')}</dd>
                                    <dd className="font-light text-lw-line/70">{t('lautwasser.study.credits.course')}</dd>
                                </dl>
                            </div>
                            <Framed ratio={ratioOf('intro-wave')} className="mt-8 md:mt-14 xl:mt-0 md:col-span-2 xl:col-start-5 xl:col-span-8 xl:row-start-2 border-black/10">
                                <Still id="intro-wave" />
                            </Framed>
                        </div>
                    </div>
                </section>

                {/* 3-5 - background: sound, noise, birds */}
                <Chapter id="herleitung" left={t('lautwasser.slides.wellen.topic')} middle={t('lautwasser.chapters.herleitung')} word={t('lautwasser.display.sound')}>
                    <Split space="mt-12" text={<Lead>{t('lautwasser.study.herleitung.lead')}</Lead>}>
                        <Framed ratio={ratioOf('sound')}>
                            <Clip id="sound" />
                        </Framed>
                    </Split>

                    <Block left={t('lautwasser.slides.laerm.topic')} middle={t('lautwasser.chapters.herleitung')}>
                        <NoiseChart />
                    </Block>

                    <Block left={t('lautwasser.slides.voegel.topic')} middle={t('lautwasser.chapters.herleitung')}>
                        {/* Wide screens: the lead top left and the note under it, the pictures beside them, the tail under the pictures. */}
                        <div className="xl:grid xl:grid-cols-12 xl:grid-rows-[auto_1fr_auto] xl:gap-x-5">
                            <p className="xl:col-span-4 xl:row-start-1 xl:pr-8 font-lw font-extrabold leading-none" style={{ fontSize: 'clamp(1.6rem, 4.4vw, 3.4rem)' }}>
                                {t('lautwasser.slides.voegel.lead')}
                            </p>
                            <div className="mt-8 xl:mt-0 xl:col-start-5 xl:col-span-8 xl:row-start-1 xl:row-span-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 md:gap-5 items-stretch">
                                {/* w-full: stretched to the row's height, a framed picture would otherwise take its width from it and spill out of its column. */}
                                <Framed ratio={ratioOf('bird-drawing')} className="w-full">
                                    <Still id="bird-drawing" />
                                </Framed>
                                <div className="relative w-7 sm:w-10 md:w-14 overflow-hidden border border-white/10">
                                    <Clip id="bird-wave" />
                                </div>
                                <Framed ratio={ratioOf('bird')} className="w-full">
                                    <Clip id="bird" />
                                </Framed>
                            </div>
                            <p className="mt-8 xl:mt-5 xl:col-start-5 xl:col-span-8 xl:row-start-3 text-right font-lw font-extrabold leading-none" style={{ fontSize: 'clamp(1.6rem, 4.4vw, 3.4rem)' }}>
                                {t('lautwasser.slides.voegel.tail')}
                                <br />
                                {t('lautwasser.slides.voegel.tail2')}
                            </p>
                            <Note className="mt-10 xl:mt-8 xl:col-start-1 xl:col-span-4 xl:row-start-2 xl:self-end xl:pr-8">{t('lautwasser.study.herleitung.birds')}</Note>
                        </div>
                    </Block>

                    <p className="mt-20 md:mt-28 max-w-4xl font-lw font-light uppercase text-lw-paper" style={{ fontSize: 'clamp(1.6rem, 4vw, 3.2rem)', lineHeight: 1.1 }}>
                        {t('lautwasser.study.herleitung.question')}
                    </p>
                </Chapter>

                {/* 6 - the case film */}
                <section id="casefilm" className="relative scroll-mt-20">
                    <div className={`${FRAME} pb-20 md:pb-28`}>
                        <Strip left={t('lautwasser.slides.casefilm.topic')} middle={t('lautwasser.theme')} />
                        <Note className="mt-8">{t('lautwasser.study.casefilm')}</Note>
                        <div id="casefilm-film" className="mt-8 mx-auto" style={{ width: FILM_WIDTH }}>
                            <Framed ratio="16 / 9">
                                <Clip id="casefilm" film fit="contain" />
                            </Framed>
                        </div>
                    </div>
                </section>

                {/* 7-8 - concept */}
                <Chapter id="konzept" left={t('lautwasser.slides.idee.topic')} middle={t('lautwasser.chapters.konzept')} word={t('lautwasser.display.konzept')}>
                    <Lead>{t('lautwasser.study.konzept.lead')}</Lead>
                    <div className="mt-12">
                        <Tiles ids={IDEA_STEPS} labels={steps} numbered />
                    </div>

                    <Block left={t('lautwasser.slides.datenvis.topic')} middle={t('lautwasser.chapters.konzept')}>
                        <Split text={<Note>{t('lautwasser.study.konzept.data')}</Note>}>
                            <Row ids={['datavis', 'bubbles']} />
                        </Split>
                    </Block>
                </Chapter>

                {/* 9-23 - process */}
                <Chapter id="prozess" left={t('lautwasser.slides.stationen.topic')} middle={prozess} word={t('lautwasser.display.prozess')}>
                    <Lead>{t('lautwasser.study.prozess.stations')}</Lead>
                    {/* The map with the recordings beside it on wide screens, above them otherwise. */}
                    <Band className="mt-12" cols={fr('rec-main', 'rec-left', 'rec-right')} wide={fr('stations-map', 'rec-main', 'rec-left', 'rec-right')}>
                        <StationsMap className="col-span-3 xl:col-span-1" />
                        {(['rec-main', 'rec-left', 'rec-right'] as MediaId[]).map((id) => (
                            <Framed key={id} ratio={ratioOf(id)}>
                                <Clip id={id} />
                            </Framed>
                        ))}
                    </Band>

                    <Block left={t('lautwasser.slides.spektral.topic')} middle={prozess}>
                        <Split text={<Note>{t('lautwasser.study.prozess.spectral')}</Note>}>
                            <div className="grid md:grid-cols-2 gap-5">
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
                        </Split>
                    </Block>

                    <Block left={t('lautwasser.slides.td.topic')} middle={prozess}>
                        <Note>{t('lautwasser.study.prozess.td')}</Note>
                        {/* Wide screens: the network beside the effect, then the three effects beside the effect network. */}
                        <div className="mt-8 space-y-3 md:space-y-5">
                            <Band cols="1fr" wide={fr('td-network', 'effect')}>
                                <Framed ratio={ratioOf('td-network')}>
                                    <Clip id="td-network" />
                                </Framed>
                                <Framed ratio={ratioOf('effect')}>
                                    <Clip id="effect" />
                                </Framed>
                            </Band>
                            <Band cols={fr('fx-a', 'fx-b', 'fx-c')} wide={fr('fx-a', 'fx-b', 'fx-c', 'td-effect')}>
                                {(['fx-a', 'fx-b', 'fx-c'] as MediaId[]).map((id) => (
                                    <Framed key={id} ratio={ratioOf(id)}>
                                        <Clip id={id} />
                                    </Framed>
                                ))}
                                <Framed ratio={ratioOf('td-effect')} className="col-span-3 xl:col-span-1">
                                    <Clip id="td-effect" />
                                </Framed>
                            </Band>
                        </div>
                    </Block>

                    <Block left={t('lautwasser.slides.perspektive.topic')} middle={prozess}>
                        <Note>{t('lautwasser.study.prozess.persona')}</Note>
                        {/* One row on wide screens; the quote is sized by its picture, so it shrinks with it. */}
                        <Band className="mt-8" cols={fr('persona-face', 'persona-fx')} wide={fr('persona-phone', 'persona-face', 'persona-fx')}>
                            <Framed ratio={ratioOf('persona-phone')} className="col-span-2 xl:col-span-1 [container-type:inline-size]">
                                <Still id="persona-phone" />
                                <p className="absolute left-[3%] bottom-[7%] max-w-[65%] font-lw font-light uppercase leading-[1.1] text-lw-paper" style={{ fontSize: 'clamp(1rem, 3.8cqw, 2.6rem)' }}>
                                    {t('lautwasser.slides.perspektive.quote')}
                                </p>
                            </Framed>
                            {(['persona-face', 'persona-fx'] as MediaId[]).map((id) => (
                                <Framed key={id} ratio={ratioOf(id)}>
                                    <Clip id={id} />
                                </Framed>
                            ))}
                        </Band>
                    </Block>

                    <Block left={t('lautwasser.slides.pi.topic')} middle={prozess}>
                        <Split text={<Note>{t('lautwasser.study.prozess.control')}</Note>}>
                            <div
                                className="grid items-center gap-3 md:gap-5"
                                style={{ gridTemplateColumns: `${aspectOf('pi-board')}fr ${aspectOf('pi-knob')}fr auto ${aspectOf('pi-pc')}fr` }}
                            >
                                <Plain id="pi-board" />
                                <Plain id="pi-knob" />
                                <OscArrow />
                                <Plain id="pi-pc" />
                            </div>
                        </Split>

                        <Split className="mt-12" text={<Note>{t('lautwasser.study.prozess.app')}</Note>}>
                            <div
                                className="grid items-center gap-3 md:gap-5"
                                style={{ gridTemplateColumns: `${aspectOf('pi-pc')}fr auto ${aspectOf('pi-phone')}fr` }}
                            >
                                <Plain id="pi-pc" />
                                <OscArrow />
                                <PhoneWithApp />
                            </div>
                        </Split>

                        <Split className="mt-12" text={<Note>{t('lautwasser.study.prozess.stele')}</Note>}>
                            <Framed ratio={ratioOf('stele-print')}>
                                <Still id="stele-print" />
                            </Framed>
                        </Split>
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
                    {/* Columns on smaller screens; on wide ones two rows at one height, the way the deck lines pictures up. */}
                    <div className="mt-12 columns-2 md:columns-3 xl:columns-auto gap-3 md:gap-5 xl:space-y-5">
                        {MOOD_ROWS.map((row) => (
                            <div key={row[0]} className="contents xl:flex xl:gap-5">
                                {row.map((id) => (
                                    <div
                                        key={id}
                                        className="mb-3 md:mb-5 xl:mb-0 xl:min-w-0 xl:[flex:var(--grow)_1_0%] break-inside-avoid overflow-hidden border border-white/10"
                                        style={{ aspectRatio: ratioOf(id), '--grow': aspectOf(id) } as CSSProperties}
                                    >
                                        <Still id={id} />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <ul className="grid grid-cols-4 gap-3 md:gap-5 xl:mt-5">
                        {PALETTE.map((hex) => (
                            <li
                                key={hex}
                                className={`aspect-[3/2] xl:aspect-[3/1] flex items-end p-2 md:p-3 border border-white/10 font-lw font-light text-[10px] md:text-xs ${hex === '#f3f3f3' ? 'text-lw-line' : 'text-lw-paper'}`}
                                style={{ background: hex }}
                            >
                                {hex}
                            </li>
                        ))}
                    </ul>

                    <Block left={t('lautwasser.slides.aufbau.topic')} middle={ausstellung}>
                        <Note>{t('lautwasser.study.ausstellung.room')}</Note>
                        {/* Wide screens: the build and the room stacked on the left, the finished room large beside them. */}
                        <Band className="mt-8" cols={fr('build', 'room')} wide="repeat(12, minmax(0, 1fr))">
                            <Framed ratio={ratioOf('build')} fill className="xl:col-span-4 xl:row-start-1">
                                <Clip id="build" />
                            </Framed>
                            <Framed ratio={ratioOf('room')} fill className="xl:col-span-4 xl:row-start-2">
                                <Clip id="room" />
                            </Framed>
                            <figure className="col-span-2 xl:contents">
                                <Framed ratio={ratioOf('showcase')} className="xl:col-start-5 xl:col-span-8 xl:row-start-1 xl:row-span-2">
                                    <Clip id="showcase" />
                                </Framed>
                                <figcaption className="mt-3 xl:mt-0 xl:col-start-5 xl:col-span-8 xl:row-start-3 font-lw font-light uppercase text-2xl md:text-3xl text-lw-paper">
                                    {t('lautwasser.slides.raum.caption')}
                                </figcaption>
                            </figure>
                        </Band>
                    </Block>
                </Chapter>

                {/* 28 - outlook */}
                <Chapter id="ausblick" left={t('lautwasser.slides.weitere.topic')} middle={t('lautwasser.chapters.fazit')} word={t('lautwasser.display.ausblick')}>
                    <Split space="mt-12" text={<Lead>{t('lautwasser.study.ausblick')}</Lead>}>
                        <figure>
                            <Framed ratio={ratioOf('outlook-projection')}>
                                <Still id="outlook-projection" />
                            </Framed>
                            <Row ids={['outlook-mics', 'outlook-rathaus']} still className="mt-3 md:mt-5" />
                            <figcaption className="mt-3 text-right font-lw font-light uppercase text-[11px] tracking-[0.16em] text-lw-paper/50">
                                {t('lautwasser.slides.weitere.ai')}
                            </figcaption>
                        </figure>
                    </Split>
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
