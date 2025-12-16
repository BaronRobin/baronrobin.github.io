import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import {
    Menu,
    X,
    Instagram,
    Mail,
    ChevronDown,
    ArrowUp,
    Target
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
    SiDavinciresolve
} from 'react-icons/si';
import { projects } from '../data/projects';

// --- Data Types ---
interface Skill {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    url: string;
}

interface SectionHeaderProps {
    title: string;
    subtitle: string;
}

interface SocialLinkProps {
    href: string;
    icon: React.ReactNode;
}

interface StatusItemProps {
    year: string;
    title: string;
    place: string;
}

interface SocialCardProps {
    handle: string;
    label: string;
    url: string;
    image: string;
}

// --- Helper Components ---
const SectionHeader = ({ title, subtitle }: SectionHeaderProps) => (
    <div className="mb-16 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-4">{title}</h2>
        <div className="w-12 h-1 bg-purple-500 mx-auto mb-4" />
        <p className="text-slate-400">{subtitle}</p>
    </div>
);

const SocialLink = ({ href, icon }: SocialLinkProps) => (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="p-3 bg-white/5 rounded-full hover:bg-white/10 hover:text-purple-400 transition-colors"
    >
        {icon}
    </a>
);

const StatusItem = ({ year, title, place }: StatusItemProps) => (
    <li className="flex gap-4 items-start">
        <span className="text-purple-400 font-mono text-sm pt-1 w-12 shrink-0">{year}</span>
        <div>
            <div className="font-semibold text-white">{title}</div>
            <div className="text-sm text-slate-400">{place}</div>
        </div>
    </li>
);

const SocialCard = ({ handle, label, url, image }: SocialCardProps) => (
    <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative overflow-hidden rounded-2xl aspect-square flex items-end p-6 glass-card hover:bg-white/10 transition-all duration-500"
    >
        <div className="absolute inset-0 z-0">
            <img src={image} alt={handle} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 group-hover:scale-110 transition-all duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
        </div>

        <div className="relative z-10 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
            <div className="flex items-center gap-2 mb-1 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -translate-y-2 group-hover:translate-y-0">
                <Instagram size={16} />
                <span className="text-xs font-medium tracking-wider uppercase">Instagram</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{handle}</h3>
            <p className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</p>
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
    { name: 'Quad & Drone Pilot', icon: Target, url: 'https://www.dji.com' },
];

const Home = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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

    // Back to Top Logic
    const [showBackToTop, setShowBackToTop] = useState(false);
    useEffect(() => {
        const handleScroll = () => {
            setShowBackToTop(window.scrollY > 500);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-purple-500/30">

            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-2xl font-bold tracking-tighter"
                    >
                        BARON
                    </motion.div>

                    <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
                        {['about', 'projects', 'skills', 'contact'].map((item) => (
                            <button
                                key={item}
                                onClick={() => scrollTo(item)}
                                className="hover:text-white transition-colors capitalize"
                            >
                                {t(`nav.${item}`)}
                            </button>
                        ))}
                        <div className="flex gap-2 ml-4 border-l border-white/10 pl-4">
                            <button onClick={() => changeLanguage('en')} className={`hover:text-white transition-colors ${i18n.language === 'en' ? 'text-white font-bold' : ''}`}>EN</button>
                            <span>/</span>
                            <button onClick={() => changeLanguage('de')} className={`hover:text-white transition-colors ${i18n.language === 'de' ? 'text-white font-bold' : ''}`}>DE</button>
                            <span>/</span>
                            <button onClick={() => changeLanguage('es')} className={`hover:text-white transition-colors ${i18n.language === 'es' ? 'text-white font-bold' : ''}`}>ES</button>
                        </div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="md:hidden absolute top-20 left-0 w-full bg-slate-950 border-b border-white/10 py-4"
                    >
                        {['about', 'projects', 'skills', 'contact'].map((item) => (
                            <button
                                key={item}
                                onClick={() => scrollTo(item)}
                                className="block w-full text-left px-6 py-3 text-slate-300 hover:bg-white/5 hover:text-white capitalize"
                            >
                                {t(`nav.${item}`)}
                            </button>
                        ))}
                        <div className="flex gap-4 px-6 py-3 border-t border-white/10 mt-2">
                            <button onClick={() => changeLanguage('en')} className={`hover:text-white transition-colors ${i18n.language === 'en' ? 'text-white font-bold' : 'text-slate-400'}`}>EN</button>
                            <span className="text-slate-600">/</span>
                            <button onClick={() => changeLanguage('de')} className={`hover:text-white transition-colors ${i18n.language === 'de' ? 'text-white font-bold' : 'text-slate-400'}`}>DE</button>
                            <span className="text-slate-600">/</span>
                            <button onClick={() => changeLanguage('es')} className={`hover:text-white transition-colors ${i18n.language === 'es' ? 'text-white font-bold' : 'text-slate-400'}`}>ES</button>
                        </div>
                    </motion.div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="relative h-screen flex items-end justify-center overflow-hidden pb-10">
                <div className="absolute inset-0 z-0">
                    <img
                        src="/hero.jpg"
                        alt="Hero Background"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/20 to-slate-950/90" />
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="absolute bottom-10 right-6 md:right-10 flex gap-4 z-20"
                >
                    <SocialLink href="https://www.instagram.com/phtorob" icon={<Instagram />} />
                    <SocialLink href="mailto:robinbaron@icloud.com" icon={<Mail />} />
                </motion.div>

                <motion.div
                    animate={{ y: [0, 15, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="relative z-20 text-white/50 flex flex-col items-center gap-2"
                >
                    <span className="text-xs uppercase tracking-widest font-light pl-[0.1em]">{t('hero.scroll')}</span>
                    <ChevronDown size={32} />
                </motion.div>
            </section>

            {/* About Section */}
            <section id="about" className="py-24 bg-slate-900/50">
                <div className="container mx-auto px-6">
                    <SectionHeader title={t('about.title')} subtitle={t('about.subtitle')} />

                    <div className="max-w-7xl mx-auto grid md:grid-cols-5 gap-16 items-stretch">
                        {/* Profile Image - 40% Width */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="md:col-span-2 relative w-full h-full rounded-2xl overflow-hidden glass-card min-h-[400px]"
                        >
                            <img
                                src="/profile.webp?v=2"
                                alt="Robin Baron"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.classList.add('flex', 'items-center', 'justify-center', 'bg-slate-800', 'aspect-square');
                                    e.currentTarget.parentElement!.innerHTML = '<span class="text-slate-500">profile.webp</span>';
                                }}
                            />
                        </motion.div>

                        <div className="md:col-span-3 flex flex-col gap-8 justify-between">
                            <div className="space-y-8 text-slate-300 leading-relaxed text-sm md:text-base">
                                <p>
                                    <Trans
                                        i18nKey="about.intro1"
                                        components={{ 0: <a href="https://www.hs-kl.de/" target="_blank" rel="noopener noreferrer" className="text-white font-medium hover:text-purple-400 transition-colors" /> }}
                                    />
                                </p>
                                <p>
                                    <Trans
                                        i18nKey="about.intro2"
                                        components={{ 0: <a href="https://relticc.com/" target="_blank" rel="noopener noreferrer" className="text-white font-medium hover:text-purple-400 transition-colors" /> }}
                                    />
                                </p>
                                <p>
                                    {t('about.intro3')}
                                </p>
                            </div>

                            <div className="glass-card p-6">
                                <h3 className="text-xl font-semibold mb-4 text-white">{t('about.statusTitle')}</h3>
                                <ul className="space-y-4">
                                    <StatusItem year="2025" title={t('about.status.student')} place="Hochschule Kaiserslautern" />
                                    <StatusItem year="Now" title={t('about.status.employee')} place="relticc GmbH" />
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
                                className="glass-card p-3 md:p-6 flex flex-col items-center justify-center gap-2 md:gap-4 hover:bg-white/10 transition-colors group cursor-pointer"
                            >
                                <div className="w-8 h-8 md:w-10 md:h-10 transition-transform group-hover:scale-110" style={{ color: 'white' }}>
                                    <skill.icon className="w-full h-full" />
                                </div>
                                <span className="text-[10px] md:text-sm font-medium text-slate-300 text-center leading-tight">{skill.name}</span>
                            </motion.a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Projects Section */}
            <section id="projects" className="py-24 bg-slate-900/50">
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
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80 z-10 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 p-6 z-10 pointer-events-none">
                                    <span className="text-purple-400 text-xs font-bold uppercase tracking-wider mb-2 block">
                                        {t(`projects.${project.id}.category`)}
                                    </span>
                                    <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                                        {t(`projects.${project.id}.title`)}
                                    </h3>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Social Hub - NEW SECTION */}
            <section className="py-24">
                <div className="container mx-auto px-6">
                    <SectionHeader title="Social Hub" subtitle="Follow my creative journey" />

                    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        <SocialCard
                            handle="@stuffmadebyrob"
                            label="Maker Portfolio"
                            url="https://instagram.com/stuffmadebyrob"
                            image="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=800&auto=format&fit=crop"
                        />
                        <SocialCard
                            handle="@phtorob"
                            label="Photography"
                            url="https://instagram.com/phtorob"
                            image="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop"
                        />
                        <SocialCard
                            handle="@35mmfilmbyrob"
                            label="Analog Film"
                            url="https://www.instagram.com/35mmfilmbyrob/"
                            image="https://images.unsplash.com/photo-1495121605193-b116b5b9c5fe?q=80&w=800&auto=format&fit=crop"
                        />
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-24 bg-slate-900/50">
                <div className="container mx-auto px-6 text-center">
                    <SectionHeader title={t('contact.title')} subtitle={t('contact.subtitle')} />

                    <div className="max-w-xl mx-auto glass-card p-12">
                        <p className="text-xl text-slate-300 mb-8">
                            {t('contact.message')}
                        </p>
                        <a
                            href="mailto:robinbaron@icloud.com"
                            className="inline-block bg-white text-slate-950 px-8 py-4 rounded-full font-bold hover:bg-slate-200 transition-colors"
                        >
                            {t('contact.cta')}
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-white/5 text-center text-slate-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Robin Baron. {t('footer.rights')}</p>
            </footer>

            {/* Back to Top */}
            <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: showBackToTop ? 1 : 0, scale: showBackToTop ? 1 : 0.8 }}
                onClick={scrollToTop}
                className="fixed bottom-8 right-8 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-500 transition-colors z-40"
            >
                <ArrowUp size={24} />
            </motion.button>
        </div>
    );
};

export default Home;
