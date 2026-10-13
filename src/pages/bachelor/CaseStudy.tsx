import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Play } from 'lucide-react';
import { BACHELOR_ID, projects } from '../../data/projects';
import ProjectTechnicals from '../../components/ProjectTechnicals';
import SiteFooter from '../../components/SiteFooter';
import { Clip } from '../../deck/Clip';
import SectionIndex from '../../deck/SectionIndex';
import { clipMedia, stillMedia } from './deck';
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

/** A chapter: the deck's red label, the question it asked, the way into its slides. */
const Chapter = ({ id, children }: { id: ChapterId; children: ReactNode }) => {
    const { t } = useTranslation();
    const [from, to] = chapterSlides(id);
    return (
        <section id={id} className="scroll-mt-24 border-t border-black/10">
            <div className="container mx-auto max-w-6xl px-6 py-16 md:py-24">
                <div className="flex items-baseline justify-between gap-6 text-xs uppercase tracking-[0.2em]">
                    <span className="text-grillz-red">{t(`bachelor.chapters.${id}`)}</span>
                    <Link to={`slides/${from}`} className="group inline-flex items-center gap-1.5 text-black/45 hover:text-black transition-colors">
                        {t('bachelor.study.slides', { from, to })}
                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>
                <h2 className="mt-6 mb-10 md:mb-12 text-3xl md:text-5xl leading-tight tracking-tight">{t(`bachelor.study.${id}.heading`)}</h2>
                {children}
            </div>
        </section>
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
            <header id="top" className="container mx-auto max-w-6xl px-6 pt-36 md:pt-44 pb-12 md:pb-16">
                <p className="text-xs uppercase tracking-[0.2em] text-black/50">{t('bachelor.study.kicker')}</p>
                <h1 className="mt-6 text-6xl md:text-8xl tracking-tight">{t(`projects.${BACHELOR_ID}.title`)}</h1>
                <p className="mt-5 max-w-3xl text-xl md:text-3xl leading-snug text-black/70">{t('bachelor.study.subtitle')}</p>
                <div className="mt-10 flex flex-wrap items-center gap-3">
                    <Link
                        to="slides/1"
                        className="inline-flex items-center gap-2 rounded-full bg-black hover:bg-grillz-red px-6 py-3 text-sm uppercase tracking-wider text-white transition-colors"
                    >
                        <Play size={16} className="fill-current" />
                        {t('deck.present')}
                    </Link>
                </div>
            </header>
            <figure className="container mx-auto max-w-6xl px-6 pb-20 md:pb-28">
                <Picture name="image116" alt={t('bachelor.study.heroAlt')} />
            </figure>

            {/* 3-11 */}
            <Chapter id="grillz">
                <Paragraphs k="bachelor.study.grillz.body" />
                <figure className="mt-14">
                    <Row names={['image61', 'image62', 'image63']} />
                    <div className="mt-3 grid gap-1">
                        <Source href="https://de.wikipedia.org/wiki/Grill_(Schmuck)#/media/Datei:Ancient_Egypt_Dentistry2.jpg" />
                        <Source href="https://de.wikipedia.org/wiki/Grill_(Schmuck)#/media/Datei:Copy_of_an_Etruscan_denture,_Europe,_1901-1930_Wellcome_L0058137.jpg" />
                        <Source href="https://de.wikipedia.org/wiki/Grill_(Schmuck)#/media/Datei:Top_and_bottom_custom_grillz_14k_gold.png" />
                    </div>
                </figure>
            </Chapter>

            {/* 12-18 */}
            <Chapter id="idee">
                <Paragraphs k="bachelor.study.idee.body" />
                <figure className="mt-14">
                    <Row names={['image69', 'image70']} />
                </figure>
                <figure className="mt-10 md:mt-14 max-w-md">
                    <Video name="media1" />
                    <Caption>{t('bachelor.study.idee.ring')}</Caption>
                </figure>
            </Chapter>

            {/* 19-25 */}
            <Chapter id="scan">
                <Paragraphs k="bachelor.study.scan.body" />
                <figure className="mt-14">
                    <Video name="media2" />
                </figure>
                <figure className="mt-10 md:mt-14">
                    <Row names={['image81', 'image85']} />
                    <Caption>{t('bachelor.study.scan.credit')}</Caption>
                </figure>
            </Chapter>

            {/* 26-29 */}
            <Chapter id="wissen">
                <Paragraphs k="bachelor.study.wissen.body" />
                <blockquote className="mt-14 border-l-2 border-grillz-red pl-6 md:pl-8">
                    <p className="text-xs uppercase tracking-[0.2em] text-black/50">Learning</p>
                    <p className="mt-3 text-2xl md:text-4xl leading-snug">{t('bachelor.study.wissen.learning')}</p>
                </blockquote>
            </Chapter>

            {/* 30-38 */}
            <Chapter id="modell">
                <Paragraphs k="bachelor.study.modell.body" />
                <figure className="mt-14">
                    <Row names={['image87', 'image90']} />
                    <Caption>{t('bachelor.study.modell.cleanup')}</Caption>
                </figure>
                <div className="mt-10 md:mt-14 grid md:grid-cols-2 gap-3 md:gap-5">
                    <figure>
                        <Video name="media3" />
                        <Caption>{t('bachelor.study.modell.zbrush')}</Caption>
                    </figure>
                    <figure>
                        <Video name="media4" />
                        <Caption>{t('bachelor.study.modell.sculpt')}</Caption>
                    </figure>
                </div>
                <figure className="mt-10 md:mt-14">
                    <Picture name="image95" />
                    <Caption>{t('bachelor.study.modell.boolean')}</Caption>
                </figure>
            </Chapter>

            {/* 39-42 */}
            <Chapter id="prototyp">
                <Paragraphs k="bachelor.study.prototyp.body" />
                <div className="mt-14 grid md:grid-cols-2 gap-3 md:gap-5">
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

            {/* 43-55 */}
            <Chapter id="rendering">
                <Paragraphs k="bachelor.study.rendering.body" />
                <figure className="mt-14">
                    <Row names={['image101', 'image102']} />
                    <Caption>{t('bachelor.study.rendering.setup')}</Caption>
                </figure>
                <figure className="mt-10 md:mt-14 max-w-2xl">
                    <Row names={['image108', 'image106', 'image107']} />
                    <Caption>{t('bachelor.study.rendering.metals')}</Caption>
                </figure>
                <div className="mt-10 md:mt-14 grid sm:grid-cols-2 gap-3 md:gap-5">
                    {['image112', 'image110', 'image111', 'image113', 'image114', 'image115'].map((n) => (
                        <Picture key={n} name={n} />
                    ))}
                </div>
            </Chapter>

            {/* 56-58 */}
            <Chapter id="material">
                <div className="grid md:grid-cols-2 gap-12 md:gap-16">
                    <ul className="space-y-4 text-2xl md:text-3xl leading-snug">
                        {materials.map((m) => <li key={m}>{m}</li>)}
                    </ul>
                    <div>
                        <p className="text-lg md:text-xl leading-relaxed text-black/80">{t('bachelor.study.material.lead')}</p>
                        <ul className="mt-6 space-y-2 text-lg text-black/80">
                            {properties.map((p) => (
                                <li key={p} className="flex gap-3"><span aria-hidden className="text-grillz-red">•</span>{p}</li>
                            ))}
                        </ul>
                        <p className="mt-8 text-2xl">ISO 10993</p>
                    </div>
                </div>
            </Chapter>

            {/* 59-60 */}
            <Chapter id="guss">
                <Paragraphs k="bachelor.study.guss.body" />
                <ol className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-black/10 border border-black/10">
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
