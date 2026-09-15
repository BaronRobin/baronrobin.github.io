import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import {
    Menu,
    X,
    Instagram,
    Mail,
    ChevronDown,
    ArrowUp,
    Target,
    Flame,
    Sun,
    Moon,
} from 'lucide-react';
import {
    SiUnrealengine,
    SiHoudini,
    SiBlender,
    SiAdobe,
    SiAdobephotoshop,
    SiAdobeillustrator,
    SiAdobeindesign,
    SiAdobelightroomclassic,
    SiAdobeaftereffects,
    SiAdobepremierepro,
    SiAdobexd,
    SiDavinciresolve,
    SiAutodesk
} from 'react-icons/si';
import { visibleProjects } from '../data/projects';
import { PHOTOGRAPHY_IN_NAV } from '../data/photos';
import Logo from '../components/Logo';
import CareerTimeline from '../components/CareerTimeline';
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
    { name: 'Unreal Engine 5', icon: SiUnrealengine, url: 'https://www.unrealengine.com', tier: 'core' },
    { name: 'Blender', icon: SiBlender, url: 'https://www.blender.org', tier: 'core' },
    { name: 'After Effects', icon: SiAdobeaftereffects, url: 'https://www.adobe.com/products/aftereffects.html', tier: 'core' },
    { name: 'Premiere Pro', icon: SiAdobepremierepro, url: 'https://www.adobe.com/products/premiere.html', tier: 'core' },
    { name: 'DaVinci Resolve', icon: SiDavinciresolve, url: 'https://www.blackmagicdesign.com/products/davinciresolve', tier: 'core' },
    { name: 'Photoshop', icon: SiAdobephotoshop, url: 'https://www.adobe.com/products/photoshop.html', tier: 'core' },
    // Glyph cropped out of Derivative's official square logo; the wordmark that
    // came with it is unreadable at tile size and the tile is labelled anyway.
    { name: 'TouchDesigner', iconImage: '/touchdesigner.png', url: 'https://derivative.ca/', tier: 'core' },

    // Reached for when a job needs them, clustered by what they belong with.
    { name: 'Adobe Suite', icon: SiAdobe, url: 'https://www.adobe.com/creativecloud.html', tier: 'occasional', group: 'adobe' },
    { name: 'Illustrator', icon: SiAdobeillustrator, url: 'https://www.adobe.com/products/illustrator.html', tier: 'occasional', group: 'adobe' },
    { name: 'InDesign', icon: SiAdobeindesign, url: 'https://www.adobe.com/products/indesign.html', tier: 'occasional', group: 'adobe' },
    { name: 'Lightroom', icon: SiAdobelightroomclassic, url: 'https://www.adobe.com/products/photoshop-lightroom.html', tier: 'occasional', group: 'adobe' },
    { name: 'XD', icon: SiAdobexd, url: 'https://helpx.adobe.com/support/xd.html', tier: 'occasional', group: 'adobe' },

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

import { useTheme } from '../context/ThemeContext';

// `to` marks the items that leave Home; the rest scroll to a section id.
const NAV_ITEMS: { key: string; to?: string }[] = [
    { key: 'about' },
    { key: 'skills' },
    ...(PHOTOGRAPHY_IN_NAV ? [{ key: 'photography', to: '/photography' }] : []),
    { key: 'projects' },
    { key: 'contact' },
];

const Home = () => {
    const { t, i18n } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showMoreSkills, setShowMoreSkills] = useState(false);

    useDocumentTitle('Robin Baron');

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    // Smooth scroll
    const scrollTo = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setIsMenuOpen(false);
        }
    };

    // Scroll to hash on mount
    useEffect(() => {
        if (location.hash) {
            const scrollToHash = () => {
                const element = document.getElementById(location.hash.substring(1));
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            };
            scrollToHash();
            setTimeout(scrollToHash, 100);
            setTimeout(scrollToHash, 500);
        }
    }, [location.hash]);

    // Scroll Listener for Navbar & Back to Top
    const [isScrolled, setIsScrolled] = useState(false);
    const [showBackToTop, setShowBackToTop] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            setIsScrolled(scrollY > 50);
            setShowBackToTop(scrollY > 500);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    // Give the nav its solid/frosted look whenever it's scrolled OR the mobile
    // menu is open, so the header row and the dropdown share one background
    // instead of a transparent strip floating above an opaque panel.
    const solidNav = isScrolled || isMenuOpen;

    // The <Link to="/"> already handles the route; this just returns you to the
    // top. (It used to also call history.pushState('/') directly, which tore
    // the hash out from under HashRouter.)
    const handleLogoClick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-purple-500/30 transition-colors duration-300">

            {/* Navigation */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${solidNav ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 py-0' : 'bg-transparent border-transparent py-4'}`}>
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <Link to="/" onClick={handleLogoClick} className="inline-flex" aria-label="Robin Baron, home">
                            <Logo variant={solidNav ? 'solid' : 'onHero'} />
                        </Link>
                    </motion.div>

                    <div className="hidden md:flex items-center space-x-4 text-sm font-medium">
                        {NAV_ITEMS.map(({ key, to }) => {
                            const className = `px-4 py-2 rounded-full transition-all capitalize ${isScrolled
                                ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-purple-600 dark:hover:text-white'
                                : 'text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm'
                                }`;
                            // Photography is its own route; everything else scrolls in-page.
                            return to ? (
                                <Link key={key} to={to} className={className}>{t(`nav.${key}`)}</Link>
                            ) : (
                                <button key={key} onClick={() => scrollTo(key)} className={className}>
                                    {t(`nav.${key}`)}
                                </button>
                            );
                        })}
                        <div className={`flex gap-4 pl-6 ml-2 items-center border-l transition-colors ${isScrolled ? 'border-slate-200 dark:border-white/10' : 'border-white/20'}`}>
                            <button
                                onClick={toggleTheme}
                                className={`p-2 rounded-full transition-colors ${isScrolled
                                    ? 'hover:bg-slate-100 dark:hover:bg-white/10'
                                    : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white'
                                    }`}
                                aria-label="Toggle Theme"
                            >
                                {theme === 'dark' ? <Sun size={20} className={isScrolled ? "text-yellow-400" : "text-yellow-300"} /> : <Moon size={20} className={isScrolled ? "text-slate-600" : "text-white"} />}
                            </button>
                            <div className={`w-px h-4 ${isScrolled ? 'bg-slate-200 dark:bg-white/10' : 'bg-white/20'}`} />

                            {/* Language Buttons with "pill" style when transparent */}
                            <div className={`flex gap-2 ${!isScrolled && 'bg-white/10 backdrop-blur-sm rounded-full px-3 py-1'}`}>
                                <button onClick={() => changeLanguage('en')} className={`text-xl hover:scale-110 transition-transform ${i18n.language === 'en' ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100'}`} title="English">🇺🇸</button>
                                <button onClick={() => changeLanguage('de')} className={`text-xl hover:scale-110 transition-transform ${i18n.language === 'de' ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100'}`} title="Deutsch">🇩🇪</button>
                                <button onClick={() => changeLanguage('es')} className={`text-xl hover:scale-110 transition-transform ${i18n.language === 'es' ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100'}`} title="Español">🇪🇸</button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        className={`md:hidden p-2 rounded-full transition-colors ${!solidNav ? 'bg-white/10 backdrop-blur-md text-white' : 'text-slate-900 dark:text-white'}`}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="md:hidden absolute top-20 left-0 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 rounded-b-2xl py-4 shadow-xl"
                    >
                        {NAV_ITEMS.map(({ key, to }) => {
                            const className = "block w-full text-left px-6 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-purple-600 dark:hover:text-white capitalize transition-colors";
                            return to ? (
                                <Link key={key} to={to} className={className} onClick={() => setIsMenuOpen(false)}>
                                    {t(`nav.${key}`)}
                                </Link>
                            ) : (
                                <button key={key} onClick={() => scrollTo(key)} className={className}>
                                    {t(`nav.${key}`)}
                                </button>
                            );
                        })}
                        <div className="flex gap-4 border-l border-slate-200 dark:border-white/10 pl-6 ml-2 mt-4 items-center">
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            >
                                {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
                            </button>
                            <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
                            <button onClick={() => changeLanguage('en')} className={`text-xl hover:scale-110 transition-transform ${i18n.language === 'en' ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100'}`} title="English">🇺🇸</button>
                            <button onClick={() => changeLanguage('de')} className={`text-xl hover:scale-110 transition-transform ${i18n.language === 'de' ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100'}`} title="Deutsch">🇩🇪</button>
                            <button onClick={() => changeLanguage('es')} className={`text-xl hover:scale-110 transition-transform ${i18n.language === 'es' ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100'}`} title="Español">🇪🇸</button>
                        </div>
                    </motion.div>
                )}
            </nav>

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

                    {/* A mosaic rather than a grid of identical squares. Cards
                        carry a column and row span each, so a card's shape is
                        close to the shape of the work inside it instead of
                        cropping every piece to the same box. One column on
                        mobile, where a mosaic would just be small. */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-5 md:auto-rows-[6.5rem] max-w-6xl mx-auto">
                        {visibleProjects.map((project, index) => (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 24 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: '-60px' }}
                                transition={{ duration: 0.5, delay: (index % 2) * 0.08 }}
                                className={`group relative overflow-hidden rounded-2xl cursor-pointer aspect-[4/3] md:aspect-auto ${PROJECT_SPANS[index]}`}
                                onMouseEnter={(e) => {
                                    const video = e.currentTarget.querySelector('video');
                                    if (video) video.play();
                                }}
                                onMouseLeave={(e) => {
                                    const video = e.currentTarget.querySelector('video');
                                    if (video) video.pause();
                                }}
                            >
                                <Link
                                    to={`/project/${project.id}`}
                                    className="absolute inset-0 z-20"
                                    aria-label={t(`projects.${project.id}.title`)}
                                />
                                <div className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-105">
                                    {project.media[0]?.type === 'video' ? (
                                        <video
                                            src={project.media[0].url}
                                            muted
                                            loop
                                            playsInline
                                            // Every video tile has a poster, so
                                            // nothing needs fetching until a
                                            // hover actually asks for playback.
                                            preload="none"
                                            poster={project.media[0].thumbnail}
                                            className="object-cover w-full h-full pointer-events-none"
                                        />
                                    ) : (
                                        <img
                                            src={project.media[0]?.url}
                                            alt=""
                                            loading="lazy"
                                            className="object-cover w-full h-full pointer-events-none"
                                        />
                                    )}
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
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="pt-12 md:pt-16 pb-32 md:pb-48 bg-slate-100/80 dark:bg-slate-900/80 transition-colors">
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
                            <div className="flex flex-wrap justify-center gap-2">
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
