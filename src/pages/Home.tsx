import React, { useState, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigationType } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import {
    Instagram,
    Mail,
    ChevronDown,
    ArrowUp,
    Target,
    Flame,
} from 'lucide-react';
import {
    SiUnrealengine,
    SiHoudini,
    SiBlender,
    SiAdobecreativecloud,
    SiAdobephotoshop,
    SiAdobeillustrator,
    SiAdobeindesign,
    SiAdobelightroomclassic,
    SiAdobeaftereffects,
    SiAdobepremierepro,
    SiDavinciresolve,
    SiAutodesk,
    SiAdobeaudition,
    SiRaspberrypi,
    SiBambulab
} from 'react-icons/si';
import CareerTimeline from '../components/CareerTimeline';
import SelectedWorks from '../components/SelectedWorks';
import ProfileMedia from '../components/ProfileMedia';
import useDocumentTitle from '../hooks/useDocumentTitle';
import SiteFooter from '../components/SiteFooter';

// --- Data Types ---
interface Skill {
    name: string;
    icon?: React.ComponentType<{ className?: string }>;
    iconImage?: string;
    url: string;
    /**
     * 'core' gets a card and shows by default; everything else sits behind the
     * toggle as a chip. The split is drawn from what the project technicals
     * actually credit. Move a tool between tiers by changing this one field.
     */
    tier: 'core' | 'occasional';
    /** Which cluster an occasional tool is chipped under. */
    group?: SkillGroup;
    /**
     * How a supplied image has to be treated to read on both themes:
     * 'dark' (default) for a dark mark on transparent, 'light' for a light one,
     * 'never' for a full-colour mark that already carries its own ground, and
     * 'mono' to drain a colour mark to greyscale so it sits with the rest of
     * the set. Tailwind composes filters in a fixed order, so 'mono' greyscales
     * before inverting, which is the order that works.
     */
    iconInvert?: 'dark' | 'light' | 'never' | 'mono';
}

/** Render order for the chip clusters. */
const SKILL_GROUPS = ['adobe', 'chaos', 'threeD', 'other'] as const;
type SkillGroup = typeof SKILL_GROUPS[number];

interface SectionHeaderProps {
    title: string;
    /**
     * Tighter bottom margin, for a section whose first element is its own
     * readout rather than content proper. The timeline is the only such case:
     * the line under its heading already says what you are pointing at.
     */
    tight?: boolean;
}

// --- Helper Components ---

/**
 * A section's only heading. The purple rule and the one-line subtitle that used
 * to sit under it are gone: every subtitle restated the heading, and the rule
 * dated the whole page. What is left is the word and the space around it.
 */
const SectionHeader = ({ title, tight = false }: SectionHeaderProps) => (
    <h2 className={`text-center text-3xl md:text-5xl font-bold tracking-tight ${tight ? 'mb-8 md:mb-12' : 'mb-16 md:mb-24'} text-slate-900 dark:text-white transition-colors`}>
        {title}
    </h2>
);

/**
 * The three accounts the Social Hub section used to list. The section was three
 * cards of Instagram thumbnails restating what the Photography pages already
 * show, so it is down to its links, parked at the bottom of Contact.
 */
const INSTAGRAM = [
    { handle: '@stuffmadebyrob', url: 'https://instagram.com/stuffmadebyrob' },
    { handle: '@phtorob', url: 'https://instagram.com/phtorob' },
    { handle: '@35mmfilmbyrob', url: 'https://www.instagram.com/35mmfilmbyrob/' },
];

// --- Data ---
const skills: Skill[] = [
    // The tools the work is actually made with, per the project technicals.
    { name: 'Unreal Engine', icon: SiUnrealengine, url: 'https://www.unrealengine.com', tier: 'core' },
    { name: 'Blender', icon: SiBlender, url: 'https://www.blender.org', tier: 'core' },
    { name: 'After Effects', icon: SiAdobeaftereffects, url: 'https://www.adobe.com/products/aftereffects.html', tier: 'core' },
    { name: 'Premiere Pro', icon: SiAdobepremierepro, url: 'https://www.adobe.com/products/premiere.html', tier: 'core' },
    { name: 'Photoshop', icon: SiAdobephotoshop, url: 'https://www.adobe.com/products/photoshop.html', tier: 'core' },
    // Glyph cropped out of Derivative's official square logo; the wordmark that
    // came with it is unreadable at tile size and the tile is labelled anyway.
    { name: 'TouchDesigner', iconImage: '/touchdesigner.png', url: 'https://derivative.ca/', tier: 'core' },
    { name: 'DaVinci Resolve', icon: SiDavinciresolve, url: 'https://www.blackmagicdesign.com/products/davinciresolve', tier: 'core' },

    // Reached for when a job needs them, clustered by what they belong with.
    { name: 'Creative Cloud', icon: SiAdobecreativecloud, url: 'https://www.adobe.com/creativecloud.html', tier: 'occasional', group: 'adobe' },
    { name: 'Illustrator', icon: SiAdobeillustrator, url: 'https://www.adobe.com/products/illustrator.html', tier: 'occasional', group: 'adobe' },
    { name: 'InDesign', icon: SiAdobeindesign, url: 'https://www.adobe.com/products/indesign.html', tier: 'occasional', group: 'adobe' },
    { name: 'Lightroom', icon: SiAdobelightroomclassic, url: 'https://www.adobe.com/products/photoshop-lightroom.html', tier: 'occasional', group: 'adobe' },
    { name: 'Audition', icon: SiAdobeaudition, url: 'https://www.adobe.com/products/audition.html', tier: 'occasional', group: 'adobe' },

    { name: '3ds Max', icon: SiAutodesk, url: 'https://www.autodesk.com/products/3ds-max', tier: 'occasional', group: 'chaos' },
    { name: 'V-Ray', iconInvert: 'light', iconImage: '/vray.svg', url: 'https://www.chaos.com/vray', tier: 'occasional', group: 'chaos' },
    { name: 'Chaos Phoenix', icon: Flame, url: 'https://www.chaos.com/phoenix', tier: 'occasional', group: 'chaos' },
    { name: 'tyFlow', iconInvert: 'light', iconImage: '/tyflow.svg', url: 'http://docs.tyflow.com/', tier: 'occasional', group: 'chaos' },

    { name: 'Houdini', icon: SiHoudini, url: 'https://www.sidefx.com', tier: 'occasional', group: 'threeD' },
    { name: 'ZBrush', iconInvert: 'light', iconImage: '/zbrush.svg', url: 'https://www.maxon.net/en/zbrush', tier: 'occasional', group: 'threeD' },
    // Agisoft's mark, cropped to content. It ships on opaque white and its own
    // interior is light, so the background can't be keyed out without punching
    // holes in the logo; greyscale instead, which also sits it with the set.
    { name: 'Metashape', iconImage: '/metashape.webp', iconInvert: 'mono', url: 'https://www.agisoft.com/', tier: 'occasional', group: 'threeD' },
    { name: 'MeshLab', iconImage: '/meshlab.svg', url: 'https://www.meshlab.net/', tier: 'occasional', group: 'threeD' },

    { name: 'Affinity', iconImage: '/affinity.svg', iconInvert: 'mono', url: 'https://affinity.serif.com', tier: 'occasional', group: 'other' },
    { name: 'MadMapper', iconInvert: 'light', iconImage: '/madmapper.svg', url: 'https://madmapper.com/', tier: 'occasional', group: 'other' },
    { name: 'Gyroflow', iconImage: '/gyroflow.svg', iconInvert: 'light', url: 'https://gyroflow.xyz', tier: 'occasional', group: 'other' },
    { name: 'Raspberry Pi', icon: SiRaspberrypi, url: 'https://www.raspberrypi.com/', tier: 'occasional', group: 'other' },
    { name: 'Bambu Lab', icon: SiBambulab, url: 'https://bambulab.com/', tier: 'occasional', group: 'other' },
    { name: 'Quad & Drone Pilot', icon: Target, url: 'https://www.dji.com', tier: 'occasional', group: 'other' },
];

const coreSkills = skills.filter((s) => s.tier === 'core');
const moreSkills = skills.filter((s) => s.tier === 'occasional');
const groupedSkills = SKILL_GROUPS
    .map((group) => ({ group, items: moreSkills.filter((s) => s.group === group) }))
    .filter((g) => g.items.length > 0);

const INVERT_CLASS = {
    dark: 'dark:invert',
    light: 'invert dark:invert-0',
    never: '',
    mono: 'grayscale dark:invert',
} as const;

const SkillIcon = ({ skill, className }: { skill: Skill; className?: string }) =>
    skill.icon ? (
        <skill.icon className={className} />
    ) : (
        <img
            src={skill.iconImage}
            alt=""
            className={`${className} object-contain transition-all ${INVERT_CLASS[skill.iconInvert ?? 'dark']}`}
        />
    );

/** Where Home was scrolled to when you left it, for when you come back. */
const SCROLL_KEY = 'home-scroll';
/** Any of these means the visitor is scrolling themselves. */
const USER_SCROLL = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

const Home = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigationType = useNavigationType();
    const [showMoreSkills, setShowMoreSkills] = useState(false);

    useDocumentTitle('Robin Baron');

    // Arriving at Home, before it is painted: back (or forward) to it lands
    // where you left it; a link to one of its sections from another page lands
    // on that section; anything else starts at the top. No smooth scrolling:
    // the page used to load at the top and then glide down to the section.
    useLayoutEffect(() => {
        const section = (location.state as { section?: string } | null)?.section ?? location.hash.slice(1);
        const saved = Number(sessionStorage.getItem(SCROLL_KEY));
        if (navigationType === 'POP' && saved) {
            window.scrollTo({ top: saved, behavior: 'instant' });
            if (Math.abs(window.scrollY - saved) <= 1) return;
            // Pictures above that haven't loaded yet can leave the page too
            // short to scroll that far. Keep at it while it grows, for a
            // moment, unless someone starts scrolling for themselves.
            const until = performance.now() + 1500;
            let frame = 0;
            const stop = () => {
                cancelAnimationFrame(frame);
                for (const type of USER_SCROLL) window.removeEventListener(type, stop);
            };
            const retry = () => {
                window.scrollTo({ top: saved, behavior: 'instant' });
                if (Math.abs(window.scrollY - saved) > 1 && performance.now() < until) frame = requestAnimationFrame(retry);
                else stop();
            };
            for (const type of USER_SCROLL) window.addEventListener(type, stop, { passive: true });
            frame = requestAnimationFrame(retry);
            return stop;
        }
        if (section) document.getElementById(section)?.scrollIntoView({ behavior: 'instant', block: 'start' });
        else window.scrollTo({ top: 0, behavior: 'instant' });
    }, [location.key, location.state, location.hash, navigationType]);

    // Remember the position on the way out. The cleanup of a layout effect
    // runs before the page is taken down, while the scroll is still Home's.
    useLayoutEffect(() => () => sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)), []);

    // Scroll listener for the back-to-top button
    const [showBackToTop, setShowBackToTop] = useState(false);

    useEffect(() => {
        // Not once the footer is in view: on a phone the button would sit on its version and the hold.
        const handleScroll = () => setShowBackToTop(
            window.scrollY > 500 && window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 80,
        );
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-purple-500/30 transition-colors duration-300">


            {/* Hero Section */}
            <section className="relative h-screen flex items-end justify-center overflow-hidden pb-10">
                <div className="absolute inset-0 z-0">
                    <video
                        src="/hero.webm"
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                        poster="/hero.jpg"
                    />
                    {/* Updated Gradient: Lighter in light mode as requested */}
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-50/10 via-slate-50/5 to-slate-50/60 dark:from-slate-950/30 dark:via-slate-950/20 dark:to-slate-950/90 transition-colors duration-500" />
                    {/* A faint shade under the header: its words are white over the
                        video, and in the light theme the sky behind them is too. */}
                    <div aria-hidden className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/30 to-transparent" />
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="absolute bottom-10 right-6 md:right-10 flex gap-4 z-20"
                >
                    {/* Social Icons in Hero: Forced to glass/dark style even in light mode for subtlety */}
                    <a
                        href="https://www.instagram.com/phtorob"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 text-white transition-colors"
                    >
                        <Instagram />
                    </a>
                    <a
                        href="mailto:robinbaron@icloud.com"
                        className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 text-white transition-colors"
                    >
                        <Mail />
                    </a>
                </motion.div>

                <motion.div
                    animate={{ y: [0, 15, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="relative z-20 text-slate-900 dark:text-white/50 flex flex-col items-center gap-2"
                >
                    <span className="text-xs uppercase tracking-widest font-light pl-[0.1em]">{t('hero.scroll')}</span>
                    <ChevronDown size={32} />
                </motion.div>
            </section>

            {/* About Section */}
            <section id="about" className="pt-20 md:pt-32 pb-12 md:pb-16 bg-white/50 dark:bg-slate-900/50 transition-colors">
                <div className="container mx-auto px-6">
                    <SectionHeader title={t('about.title')} />

                    {/* One column of three for the portrait, two for the copy.
                        The portrait used to be two fifths of a wider container
                        and stretched to whatever height the copy ran to; this
                        keeps it to a fixed 4:5 box without shrinking it away. */}
                    <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-10 md:gap-16 items-start">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="relative w-44 sm:w-56 md:w-full mx-auto aspect-[4/5] rounded-2xl overflow-hidden glass-card"
                        >
                            <ProfileMedia />
                        </motion.div>

                        <div className="md:col-span-2 space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed text-base md:text-lg transition-colors">
                            <p>
                                <Trans
                                    i18nKey="about.intro1"
                                    components={{ 0: <a href="https://www.hs-kl.de/" target="_blank" rel="noopener noreferrer" className="text-slate-900 dark:text-white font-medium hover:text-purple-600 dark:hover:text-purple-400 transition-colors" /> }}
                                />
                            </p>
                            <p>
                                <Trans
                                    i18nKey="about.intro2"
                                    components={{ 0: <a href="https://relticc.com/" target="_blank" rel="noopener noreferrer" className="text-slate-900 dark:text-white font-medium hover:text-purple-600 dark:hover:text-purple-400 transition-colors" /> }}
                                />
                            </p>
                            <p>{t('about.intro3')}</p>
                            {/* In the words of the people I worked for: a line from each reference. */}
                            <figure className="space-y-5 pt-2">
                                {(t('about.quotes', { returnObjects: true }) as { text: string; by: string }[]).map((quote) => (
                                    <blockquote key={quote.by} className="border-l-2 border-purple-600/40 dark:border-purple-400/40 pl-5">
                                        <p className="text-slate-800 dark:text-slate-100">{quote.text}</p>
                                        <footer className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{quote.by}</footer>
                                    </blockquote>
                                ))}
                                <figcaption className="text-xs text-slate-400 dark:text-slate-500">{t('about.quotesNote')}</figcaption>
                            </figure>
                        </div>
                    </div>
                </div>
            </section>

            {/* Career Timeline */}
            <section id="timeline" className="pb-12 md:pb-16 bg-white/50 dark:bg-slate-900/50 transition-colors">
                <div className="container mx-auto px-6">
                    {/* No subtitle: the timeline's own readout sits here instead. */}
                    <SectionHeader title={t('timeline.title')} tight />
                    <CareerTimeline />
                </div>
            </section>

            {/* Skills Section */}
            <section id="skills" className="pt-16 md:pt-20 pb-12 md:pb-16">
                <div className="container mx-auto px-6">
                    <SectionHeader title={t('skills.title')} />

                    {/* The tools the work is actually made with get a card each. */}
                    <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3 md:gap-4 max-w-5xl mx-auto">
                        {coreSkills.map((skill, index) => (
                            <motion.a
                                key={skill.name}
                                href={skill.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.04 }}
                                // aspect-square so the tiles stay square however
                                // much width the grid hands them.
                                className="glass-card aspect-square w-24 sm:w-28 lg:w-32 p-2 sm:p-3 flex flex-col items-center justify-center gap-1.5 sm:gap-2 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors group cursor-pointer"
                            >
                                <div className="w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10 shrink-0 transition-transform group-hover:scale-110 flex items-center justify-center text-slate-900 dark:text-white">
                                    <SkillIcon skill={skill} className="w-full h-full" />
                                </div>
                                <span className="text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 text-center leading-tight transition-colors">{skill.name}</span>
                            </motion.a>
                        ))}
                    </div>

                    {/* Everything else is a chip behind a toggle: same information,
                        a tenth of the visual weight. */}
                    <div className="max-w-5xl mx-auto mt-8">
                        <button
                            type="button"
                            onClick={() => setShowMoreSkills((v) => !v)}
                            aria-expanded={showMoreSkills}
                            className="mx-auto flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                        >
                            {t('skills.also', { count: moreSkills.length })}
                            <ChevronDown size={16} className={`transition-transform duration-300 ${showMoreSkills ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence initial={false}>
                            {showMoreSkills && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-6 space-y-5">
                                        {groupedSkills.map(({ group, items }) => (
                                            <div key={group}>
                                                <div className="text-[10px] font-mono tracking-widest uppercase text-slate-400 dark:text-slate-600 text-center mb-2">
                                                    {t(`skills.groups.${group}`)}
                                                </div>
                                                <div className="flex flex-wrap justify-center gap-2">
                                                    {items.map((skill) => (
                                                        <a
                                                            key={skill.name}
                                                            href={skill.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:border-purple-500/50 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                                        >
                                                            <span className="w-4 h-4 shrink-0 flex items-center justify-center text-slate-900 dark:text-white">
                                                                <SkillIcon skill={skill} className="w-full h-full" />
                                                            </span>
                                                            {skill.name}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </section>

            {/* Projects Section */}
            <section id="projects" className="pt-16 md:pt-20 pb-8 md:pb-10 bg-white/50 dark:bg-slate-900/50 transition-colors">
                <div className="container mx-auto px-6">
                    <SectionHeader title={t('projects.title')} />
                </div>
                <SelectedWorks />
            </section>

            {/* Contact Section */}
            <section id="contact" className="pt-12 md:pt-16 pb-12 md:pb-16 bg-slate-100/80 dark:bg-slate-900/80 transition-colors">
                <div className="container mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="max-w-2xl mx-auto"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">
                            {t('contact.title')}
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-slate-300 mb-12 leading-relaxed font-light">
                            {t('contact.description')}
                        </p>

                        <a
                            href="mailto:robinbaron@icloud.com"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-bold hover:scale-105 transition-transform shadow-lg group"
                        >
                            <Mail size={20} className="group-hover:rotate-12 transition-transform" />
                            {t('contact.cta')}
                        </a>

                        <div className="mt-14 flex flex-col items-center gap-4">
                            <span className="text-[11px] uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                {t('contact.socialHint')}
                            </span>
                            {/* Stacked on a phone, each its own width; in a row where there's room. */}
                            <div className="flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-2">
                                {INSTAGRAM.map(({ handle, url }) => (
                                    <a
                                        key={handle}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-white/10 px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:border-purple-500/50 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                    >
                                        <Instagram size={13} />
                                        {handle}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <SiteFooter bordered={false} />
            {/* Back to Top */}
            <AnimatePresence>
                {showBackToTop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        onClick={scrollToTop}
                        className="fixed bottom-8 right-8 p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg z-50 transition-colors"
                    >
                        <ArrowUp size={24} />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Home;
