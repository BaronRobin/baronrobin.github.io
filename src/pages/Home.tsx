import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
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

// Data Types
interface Skill {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    url: string;
}

// Data
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
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Smooth scroll
    const scrollTo = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setIsMenuOpen(false);
        }
    };

    // Scroll to hash on mount (for back button)
    useEffect(() => {
        if (location.hash) {
            const element = document.getElementById(location.hash.substring(1));
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
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

                    <div className="hidden md:flex space-x-8 text-sm font-medium text-slate-300">
                        {['About', 'Projects', 'Skills', 'Contact'].map((item) => (
                            <button
                                key={item}
                                onClick={() => scrollTo(item.toLowerCase())}
                                className="hover:text-white transition-colors"
                            >
                                {item}
                            </button>
                        ))}
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
                        {['About', 'Projects', 'Skills', 'Contact'].map((item) => (
                            <button
                                key={item}
                                onClick={() => scrollTo(item.toLowerCase())}
                                className="block w-full text-left px-6 py-3 text-slate-300 hover:bg-white/5 hover:text-white"
                            >
                                {item}
                            </button>
                        ))}
                    </motion.div>
                )}
            </nav>

            {/* Hero Section */}
            <section className="relative h-screen flex items-end justify-center overflow-hidden pb-20">
                {/* Background Image */}
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
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 flex flex-col items-center gap-2"
                >
                    <span className="text-xs uppercase tracking-widest font-light">Scroll</span>
                    <ChevronDown size={32} />
                </motion.div>
            </section>

            {/* About Section */}
            <section id="about" className="py-24 bg-slate-900/50">
                <div className="container mx-auto px-6">
                    <SectionHeader title="About Me" subtitle="The journey so far" />

                    <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-16 items-start">
                        {/* Profile Image - Placeholder */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="relative w-full rounded-2xl overflow-hidden glass-card"
                        >
                            <img
                                src="/profile.webp?v=2"
                                alt="Robin Baron"
                                className="w-full h-auto"
                                onError={(e) => {
                                    // Fallback if image not found
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.classList.add('flex', 'items-center', 'justify-center', 'bg-slate-800', 'aspect-square');
                                    e.currentTarget.parentElement!.innerHTML = '<span class="text-slate-500">profile.webp</span>';
                                }}
                            />
                        </motion.div>

                        <div className="space-y-8 text-slate-300 leading-relaxed text-sm md:text-base">
                            <p>
                                I'm a passionate creator based in Germany, currently pursuing my Bachelor's degree at <a href="https://www.hs-kl.de/" target="_blank" rel="noopener noreferrer" className="text-white font-medium hover:text-purple-400 transition-colors">Hochschule Kaiserslautern</a>.
                            </p>
                            <p>
                                Alongside my studies, I work at <a href="https://relticc.com/" target="_blank" rel="noopener noreferrer" className="text-white font-medium hover:text-purple-400 transition-colors">relticc GmbH</a>, where I apply my skills in real-world scenarios. My focus lies in the intersection of technical implementation and artistic expression.
                            </p>
                            <p>
                                I don't just "use" software; I combine tools like Unreal Engine, Houdini, and the Adobe Suite to craft immersive digital experiences.
                            </p>
                        </div>

                        <div className="glass-card p-6">
                            <h3 className="text-xl font-semibold mb-4 text-white">Current Status</h3>
                            <ul className="space-y-4">
                                <StatusItem year="2025" title="Bachelor Student" place="Hochschule Kaiserslautern" />
                                <StatusItem year="Now" title="Employee" place="relticc GmbH" />
                                <StatusItem year="Goal" title="Expanding Horizons" place="Open to new challenges" />
                            </ul>
                        </div>
                    </div>
                </div>
            </section>



            {/* Skills Section */}
            <section id="skills" className="py-24">
                <div className="container mx-auto px-6">
                    <SectionHeader title="Technical Arsenal" subtitle="Tools I execute with" />

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 max-w-6xl mx-auto">
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
                                className="glass-card p-6 flex flex-col items-center justify-center gap-4 hover:bg-white/10 transition-colors group cursor-pointer"
                            >
                                <div className="w-10 h-10 transition-transform group-hover:scale-110" style={{ color: 'white' }}>
                                    <skill.icon className="w-full h-full" />
                                </div>
                                <span className="text-sm font-medium text-slate-300 text-center">{skill.name}</span>
                            </motion.a>
                        ))}
                    </div>
                </div>
            </section>

            {/* Projects Section */}
            <section id="projects" className="py-24 bg-slate-900/50">
                <div className="container mx-auto px-6">
                    <SectionHeader title="Selected Works" subtitle="A glimpse into my portfolio" />

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {projects.map((project) => (
                            <Link to={`/project/${project.id}`} key={project.id} className="block h-full">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    className="group relative aspect-square overflow-hidden rounded-2xl cursor-pointer"
                                >
                                    <div className="absolute inset-0 w-full h-full transition-transform duration-500 group-hover:scale-110">
                                        {project.media[0]?.type === 'video' ? (
                                            <video
                                                src={project.media[0].url}
                                                muted
                                                loop
                                                playsInline
                                                poster={project.media[0].thumbnail}
                                                className="object-cover w-full h-full"
                                                onMouseEnter={(e) => e.currentTarget.play()}
                                                onMouseLeave={(e) => e.currentTarget.pause()}
                                            />
                                        ) : (
                                            <img
                                                src={project.media[0]?.url}
                                                alt={project.title}
                                                className="object-cover w-full h-full"
                                            />
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none" />

                                    <div className="absolute bottom-0 left-0 p-8 w-full pointer-events-none">
                                        <span className="text-purple-400 text-sm font-medium mb-2 block">{project.category}</span>
                                        <h3 className="text-2xl font-bold mb-2">{project.title}</h3>
                                        <p className="text-slate-300 text-sm opacity-100 transition-opacity duration-300">
                                            {project.description}
                                        </p>
                                    </div>
                                </motion.div>
                            </Link>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-24">
                <div className="container mx-auto px-6 text-center">
                    <SectionHeader title="Get in Touch" subtitle="Let's create something together" />

                    <div className="max-w-xl mx-auto glass-card p-12">
                        <p className="text-xl text-slate-300 mb-8">
                            Have a project in mind or just want to say hi? I'm always open to discussing new opportunities and ideas.
                        </p>
                        <a
                            href="mailto:robinbaron@icloud.com"
                            className="inline-block bg-white text-slate-950 px-8 py-4 rounded-full font-bold hover:bg-slate-200 transition-colors"
                        >
                            Say Hello
                        </a>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-white/5 text-center text-slate-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Robin Baron. All rights reserved.</p>
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

interface SectionHeaderProps {
    title: string;
    subtitle: string;
}

const SectionHeader = ({ title, subtitle }: SectionHeaderProps) => (
    <div className="mb-16 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-4">{title}</h2>
        <div className="w-12 h-1 bg-purple-500 mx-auto mb-4" />
        <p className="text-slate-400">{subtitle}</p>
    </div>
);

interface SocialLinkProps {
    href: string;
    icon: React.ReactNode;
}

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

interface StatusItemProps {
    year: string;
    title: string;
    place: string;
}

const StatusItem = ({ year, title, place }: StatusItemProps) => (
    <li className="flex gap-4 items-start">
        <span className="text-purple-400 font-mono text-sm pt-1 w-12 shrink-0">{year}</span>
        <div>
            <div className="font-semibold text-white">{title}</div>
            <div className="text-sm text-slate-400">{place}</div>
        </div>
    </li>
);

export default Home;
