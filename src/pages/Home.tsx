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
    Aperture,
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
    SiAdobeacrobatreader,
    SiDavinciresolve,
    SiAffinitydesigner,
    SiAutodesk
} from 'react-icons/si';
import { projects } from '../data/projects';

// --- Data Types ---
interface Skill {
    name: string;
    icon?: React.ComponentType<{ className?: string }>;
    iconImage?: string;
    url: string;
}

interface SectionHeaderProps {
    title: string;
    subtitle: string;
}



interface StatusItemProps {
    year: string;
    title: string;
    place: React.ReactNode;
}

interface SocialCardProps {
    handle: string;
    label: string;
    description: string;
    url: string;
    image: string;
    previews: string[];
}

// --- Helper Components ---
const SectionHeader = ({ title, subtitle }: SectionHeaderProps) => (
    <div className="mb-16 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-slate-900 dark:text-white transition-colors">{title}</h2>
        <div className="w-12 h-1 bg-purple-500 mx-auto mb-4" />
        <p className="text-slate-600 dark:text-slate-400 transition-colors">{subtitle}</p>
    </div>
);



const StatusItem = ({ year, title, place }: StatusItemProps) => (
    <li className="flex gap-4 items-start">
        <span className="text-purple-600 dark:text-purple-400 font-mono text-sm pt-1 w-12 shrink-0">{year}</span>
        <div>
            <div className="font-semibold text-slate-900 dark:text-white transition-colors">{title}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400 transition-colors">{place}</div>
        </div>
    </li>
);

const SocialCard = ({ handle, label, description, url, image, previews }: SocialCardProps) => (
    <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:border-purple-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 flex flex-col h-full"
    >
        {/* Header */}
        <div className="p-6 flex items-center gap-4 border-b border-slate-100 dark:border-white/5">
            <div className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden border border-slate-200 dark:border-white/10 group-hover:border-purple-500/50 transition-colors">
                <img src={image} alt={handle} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 text-purple-600 dark:text-purple-400">
                    <Instagram size={12} />
                    <span className="text-[10px] font-bold tracking-wider uppercase">{label}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{handle}</h3>
            </div>
            <div className="text-slate-300 dark:text-slate-600 group-hover:text-purple-500 transition-colors">
                <ArrowUp size={18} className="rotate-45" />
            </div>
        </div>

        {/* 3x3 Filter Grid Preview */}
        <div className="p-1 gap-0.5 grid grid-cols-3 bg-slate-50 dark:bg-black/20 flex-1">
            {previews.map((src, i) => (
                <div key={i} className="aspect-square relative overflow-hidden bg-slate-200 dark:bg-white/5">
                    <img src={src} alt="" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                </div>
            ))}
        </div>

        {/* Footer/Description */}
        <div className="p-4 text-center border-t border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 relative z-10">
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{description}</p>
        </div>
    </a>
);

// --- Data ---
const skills: Skill[] = [
    { name: 'Unreal Engine 5', icon: SiUnrealengine, url: 'https://www.unrealengine.com' },
    { name: 'Houdini', icon: SiHoudini, url: 'https://www.sidefx.com' },
    { name: 'Blender', icon: SiBlender, url: 'https://www.blender.org' },
    { name: 'Adobe Suite', icon: SiAdobe, url: 'https://www.adobe.com/creativecloud.html' },
    { name: 'Photoshop', icon: SiAdobephotoshop, url: 'https://www.adobe.com/products/photoshop.html' },
    { name: 'Illustrator', icon: SiAdobeillustrator, url: 'https://www.adobe.com/products/illustrator.html' },
    { name: 'InDesign', icon: SiAdobeindesign, url: 'https://www.adobe.com/products/indesign.html' },
    { name: 'Lightroom', icon: SiAdobelightroomclassic, url: 'https://www.adobe.com/products/photoshop-lightroom.html' },
    { name: 'After Effects', icon: SiAdobeaftereffects, url: 'https://www.adobe.com/products/aftereffects.html' },
    { name: 'Premiere Pro', icon: SiAdobepremierepro, url: 'https://www.adobe.com/products/premiere.html' },
    { name: 'XD', icon: SiAdobexd, url: 'https://helpx.adobe.com/support/xd.html' },
    { name: 'Acrobat', icon: SiAdobeacrobatreader, url: 'https://www.adobe.com/acrobat.html' },
    { name: 'DaVinci Resolve', icon: SiDavinciresolve, url: 'https://www.blackmagicdesign.com/products/davinciresolve' },
    { name: 'Affinity', icon: SiAffinitydesigner, url: 'https://affinity.serif.com' },
    { name: 'Gyroflow', icon: Aperture, url: 'https://gyroflow.xyz' },
    { name: 'V-Ray', iconImage: '/vray.svg', url: 'https://www.chaos.com/vray' },
    { name: '3ds Max', icon: SiAutodesk, url: 'https://www.autodesk.com/products/3ds-max' },
    { name: 'Chaos Phoenix', icon: Flame, url: 'https://www.chaos.com/phoenix' },
    { name: 'tyFlow', iconImage: '/tyflow.svg', url: 'http://docs.tyflow.com/' },
    { name: 'ZBrush', iconImage: '/zbrush.svg', url: 'https://www.maxon.net/en/zbrush' },
    { name: 'MeshLab', iconImage: '/meshlab.svg', url: 'https://www.meshlab.net/' },
    { name: 'MadMapper', iconImage: '/madmapper.svg', url: 'https://madmapper.com/' },
    { name: 'Quad & Drone Pilot', icon: Target, url: 'https://www.dji.com' },
];

import { useTheme } from '../context/ThemeContext';

// --- Dynamic Social Images ---
const makerImages = import.meta.glob('../assets/social/maker/*.{jpg,jpeg,png,webp}', { eager: true });
const photoImages = import.meta.glob('../assets/social/photo/*.{jpg,jpeg,png,webp}', { eager: true });
const filmImages = import.meta.glob('../assets/social/film/*.{jpg,jpeg,png,webp}', { eager: true });

const getImages = (glob: Record<string, unknown>) => {
    return Object.values(glob).map((mod: any) => mod.default).slice(0, 9);
};

const Home = () => {
    const { t, i18n } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        console.log("Portfolio v1.1 - Social Hub Internationalized");
    }, []);

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

    // Reset URL to landing page
    const handleLogoClick = () => {
        window.history.pushState({}, '', '/');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Optional: Trigger a re-render or state update if needed, but router usually handles it
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-purple-500/30 transition-colors duration-300">

            {/* Navigation */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 py-0' : 'bg-transparent border-transparent py-4'}`}>
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <Link
                            to="/"
                            onClick={handleLogoClick}
                            className={`text-2xl font-bold tracking-tighter transition-colors ${isScrolled ? 'text-slate-900 dark:text-white' : 'text-white'}`}
                        >
                            BARON
                        </Link>
                    </motion.div>

                    <div className="hidden md:flex items-center space-x-4 text-sm font-medium">
                        {['about', 'projects', 'skills', 'contact'].map((item) => (
                            <button
                                key={item}
                                onClick={() => scrollTo(item)}
                                className={`px-4 py-2 rounded-full transition-all capitalize ${isScrolled
                                    ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-purple-600 dark:hover:text-white'
                                    : 'text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm'
                                    }`}
                            >
                                {t(`nav.${item}`)}
                            </button>
                        ))}
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
                        className={`md:hidden p-2 rounded-full ${!isScrolled ? 'bg-white/10 backdrop-blur-md text-white' : 'text-slate-900 dark:text-white'}`}
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
                        className="md:hidden absolute top-20 left-0 w-full bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-white/10 py-4 shadow-xl"
                    >
                        {['about', 'projects', 'skills', 'contact'].map((item) => (
                            <button
                                key={item}
                                onClick={() => scrollTo(item)}
                                className="block w-full text-left px-6 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-purple-600 dark:hover:text-white capitalize transition-colors"
                            >
                                {t(`nav.${item}`)}
                            </button>
                        ))}
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
            <section id="about" className="py-24 bg-white/50 dark:bg-slate-900/50 transition-colors">
                <div className="container mx-auto px-6">
                    <SectionHeader title={t('about.title')} subtitle={t('about.subtitle')} />

                    <div className="max-w-7xl mx-auto grid md:grid-cols-5 gap-16 items-stretch">
                        {/* Profile Image - 40% Width */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="md:col-span-2 relative w-40 aspect-[3/4] mx-auto md:w-full md:aspect-auto md:h-full rounded-2xl overflow-hidden glass-card md:min-h-[400px]"
                        >
                            <img
                                src="/profile.webp?v=3"
                                alt="Robin Baron"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.classList.add('flex', 'items-center', 'justify-center', 'bg-slate-200', 'dark:bg-slate-800', 'aspect-square');
                                    e.currentTarget.parentElement!.innerHTML = '<span class="text-slate-500">profile.webp</span>';
                                }}
                            />
                        </motion.div>

                        <div className="md:col-span-3 flex flex-col gap-8 justify-between">
                            <div className="space-y-8 text-slate-600 dark:text-slate-300 leading-relaxed text-sm md:text-base transition-colors">
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
                                <p>
                                    {t('about.intro3')}
                                </p>
                            </div>

                            <div className="glass-card p-6">
                                <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white transition-colors">{t('about.statusTitle')}</h3>
                                <ul className="space-y-4">
                                    <StatusItem
                                        year="2025"
                                        title={t('about.status.student')}
                                        place={<a href="https://www.hs-kl.de/" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">Hochschule Kaiserslautern</a>}
                                    />
                                    <StatusItem
                                        year="Now"
                                        title={t('about.status.employee')}
                                        place={<a href="https://relticc.com/" target="_blank" rel="noopener noreferrer" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">relticc GmbH</a>}
                                    />
                                    <StatusItem year="Goal" title={t('about.status.goals')} place={t('about.status.goalsPlace')} />
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Skills Section */}
            <section id="skills" className="py-24">
                <div className="container mx-auto px-6">
                    <SectionHeader title={t('skills.title')} subtitle={t('skills.subtitle')} />

                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-6 max-w-6xl mx-auto">
                        {skills.map((skill, index) => (
                            <motion.a
                                key={skill.name}
                                href={skill.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.05 }}
                                className="glass-card p-3 md:p-6 flex flex-col items-center justify-center gap-2 md:gap-4 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors group cursor-pointer"
                            >
                                <div className="w-8 h-8 md:w-10 md:h-10 transition-transform group-hover:scale-110 flex items-center justify-center text-slate-900 dark:text-white">
                                    {skill.icon ? (
                                        <skill.icon className="w-full h-full" />
                                    ) : (
                                        /* Custom inversion for specific icons requested by user */
                                        <img
                                            src={skill.iconImage}
                                            alt={skill.name}
                                            className={`w-full h-full object-contain transition-all ${['V-Ray', 'tyFlow', 'ZBrush', 'MadMapper'].includes(skill.name)
                                                ? 'invert dark:invert-0'
                                                : 'dark:invert'
                                                }`}
                                        />
                                    )}
                                </div>
                                <span className="text-[10px] md:text-sm font-medium text-slate-600 dark:text-slate-300 text-center leading-tight transition-colors">{skill.name}</span>
                            </motion.a>
                        ))}
                    </div>
                </div>
            </section>


            {/* Projects Section */}
            <section id="projects" className="py-24 bg-white/50 dark:bg-slate-900/50 transition-colors">
                <div className="container mx-auto px-6">
                    <SectionHeader title={t('projects.title')} subtitle={t('projects.subtitle')} />

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {projects.map((project) => (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="group relative aspect-square overflow-hidden rounded-2xl cursor-pointer block h-full"
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
                                <div className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-110">
                                    {project.media[0]?.type === 'video' ? (
                                        <video
                                            src={project.media[0].url}
                                            muted
                                            loop
                                            playsInline
                                            poster={project.media[0].thumbnail}
                                            className="object-cover w-full h-full pointer-events-none"
                                        />
                                    ) : (
                                        <img
                                            src={project.media[0]?.url}
                                            alt={t(`projects.${project.id}.title`)}
                                            className="object-cover w-full h-full pointer-events-none"
                                        />
                                    )}
                                </div>
                                {/* Gradient Overlay - Updated for subtlety */}
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none" />

                                <div className="absolute bottom-0 left-0 p-6 z-10 pointer-events-none translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                    <span className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2 block opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                                        {t(`projects.${project.id}.category`)}
                                    </span>
                                    <h3 className="text-xl font-bold text-white drop-shadow-md">
                                        {t(`projects.${project.id}.title`)}
                                    </h3>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Social Hub */}
            <section className="py-24 relative overflow-hidden">
                <div className="container mx-auto px-6">
                    <SectionHeader title={t('social.title')} subtitle={t('social.subtitle')} />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
                        <SocialCard
                            handle="@stuffmadebyrob"
                            label={t('social.maker.label')}
                            description={t('social.maker.description')}
                            url="https://instagram.com/stuffmadebyrob"
                            image="/stuffmadebyrob.jpeg"
                            previews={getImages(makerImages)}
                        />
                        <SocialCard
                            handle="@phtorob"
                            label={t('social.photo.label')}
                            description={t('social.photo.description')}
                            url="https://instagram.com/phtorob"
                            image="/phtorob.jpeg"
                            previews={getImages(photoImages)}
                        />
                        <SocialCard
                            handle="@35mmfilmbyrob"
                            label={t('social.film.label')}
                            description={t('social.film.description')}
                            url="https://www.instagram.com/35mmfilmbyrob/"
                            image="/35mmfilmbyrob.jpeg"
                            previews={getImages(filmImages)}
                        />
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-24 bg-white/50 dark:bg-slate-900/50 transition-colors">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-8 text-slate-900 dark:text-white">
                        {t('contact.title')}
                    </h2>
                    <a
                        href="mailto:robinbaron@icloud.com"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full font-bold hover:scale-105 transition-transform"
                    >
                        <Mail size={20} />
                        {t('contact.button')}
                    </a>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                <p>&copy; {new Date().getFullYear()} Baron. {t('footer.rights')}</p>
            </footer>
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
