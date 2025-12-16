import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Menu, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { projects } from '../data/projects';

const ProjectDetail = () => {
    const { t, i18n } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const project = projects.find((p) => p.id === id);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    // Filter and Sort Logic
    const processedMedia = project ? project.media.filter(item =>
        !item.url.includes('cover.jpg') && !item.url.includes('cover.webp')
    ).sort((a, b) => {
        if (a.type === 'video' && b.type !== 'video') return -1;
        if (a.type !== 'video' && b.type === 'video') return 1;
        return 0;
    }) : [];

    const openLightbox = (index: number) => setLightboxIndex(index);
    const closeLightbox = () => setLightboxIndex(null);

    const nextImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (lightboxIndex !== null && project) {
            setLightboxIndex((prev) => (prev! + 1) % processedMedia.length);
        }
    };

    const prevImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (lightboxIndex !== null && project) {
            setLightboxIndex((prev) => (prev! - 1 + processedMedia.length) % processedMedia.length);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (lightboxIndex === null) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'ArrowLeft') prevImage();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxIndex]);

    if (!project) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <h2 className="text-2xl font-bold mb-4">{t('projects.notFound')}</h2>
                <Link to="/" className="text-purple-400 hover:text-purple-300">{t('projects.backToHome')}</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-purple-500/30">

            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <Link to="/" className="text-2xl font-bold tracking-tighter hover:text-purple-400 transition-colors">
                        BARON
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
                        <Link to="/" className="hover:text-white transition-colors">{t('nav.home')}</Link>
                        <Link to="/#projects" className="hover:text-white transition-colors">{t('nav.projects')}</Link>
                        <Link to="/#about" className="hover:text-white transition-colors">{t('nav.about')}</Link>
                        <Link to="/#skills" className="hover:text-white transition-colors">{t('nav.skills')}</Link>
                        <Link to="/#contact" className="hover:text-white transition-colors">{t('nav.contact')}</Link>

                        <div className="flex gap-4 border-l border-white/10 pl-6 ml-2">
                            <button onClick={() => changeLanguage('en')} className={`text-xl hover:scale-110 transition-transform ${i18n.language === 'en' ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100'}`} title="English">🇺🇸</button>
                            <button onClick={() => changeLanguage('de')} className={`text-xl hover:scale-110 transition-transform ${i18n.language === 'de' ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100'}`} title="Deutsch">🇩🇪</button>
                            <button onClick={() => changeLanguage('es')} className={`text-xl hover:scale-110 transition-transform ${i18n.language === 'es' ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100'}`} title="Español">🇪🇸</button>
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
                        <Link to="/" className="block w-full text-left px-6 py-3 text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => setIsMenuOpen(false)}>{t('nav.home')}</Link>
                        <Link to="/#projects" className="block w-full text-left px-6 py-3 text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => setIsMenuOpen(false)}>{t('nav.projects')}</Link>
                        <Link to="/#about" className="block w-full text-left px-6 py-3 text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => setIsMenuOpen(false)}>{t('nav.about')}</Link>
                        <Link to="/#skills" className="block w-full text-left px-6 py-3 text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => setIsMenuOpen(false)}>{t('nav.skills')}</Link>
                        <Link to="/#contact" className="block w-full text-left px-6 py-3 text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => setIsMenuOpen(false)}>{t('nav.contact')}</Link>

                        <div className="flex gap-6 px-6 py-3 border-t border-white/10 mt-2">
                            <button onClick={() => changeLanguage('en')} className={`text-2xl transition-all ${i18n.language === 'en' ? 'opacity-100 scale-110' : 'opacity-50'}`}>🇺🇸</button>
                            <button onClick={() => changeLanguage('de')} className={`text-2xl transition-all ${i18n.language === 'de' ? 'opacity-100 scale-110' : 'opacity-50'}`}>🇩🇪</button>
                            <button onClick={() => changeLanguage('es')} className={`text-2xl transition-all ${i18n.language === 'es' ? 'opacity-100 scale-110' : 'opacity-50'}`}>🇪🇸</button>
                        </div>
                    </motion.div>
                )}
            </nav>

            {/* Back Button */}
            <div className="pt-32 container mx-auto px-6">
                <Link to="/#projects" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span>{t('projects.backToProjects')}</span>
                </Link>
            </div>

            {/* Hero Content */}
            <div className="pb-16 container mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl mx-auto text-center"
                >
                    <span className="text-purple-400 font-medium mb-4 block tracking-wide uppercase text-sm">
                        {t(`projects.${project.id}.category`)}
                    </span>
                    <h1 className="text-4xl md:text-6xl font-bold mb-8">{t(`projects.${project.id}.title`)}</h1>
                    <p className="text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto mb-8">
                        {t(`projects.${project.id}.description`)}
                    </p>

                    {project.link && (
                        <a
                            href={project.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-full font-medium transition-colors"
                        >
                            {t('projects.visitLive')}
                        </a>
                    )}
                </motion.div>
            </div>

            {/* Technical Details */}
            {/* Technical Details */}
            {/* Technical Details */}
            {project.technicals && (
                <section className="pb-16 container mx-auto px-6">
                    <div className="max-w-5xl mx-auto glass-card p-8 md:p-12">
                        {/* Icons */}
                        <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-12 border-b border-white/5 pb-8">
                            {project.technicals.icons.map((Icon, i) => (
                                <div key={i} className="text-slate-300 bg-white/5 p-2.5 md:p-4 rounded-lg md:rounded-xl hover:bg-white/10 hover:text-white transition-all hover:scale-110">
                                    <Icon className="w-5 h-5 md:w-10 md:h-10" />
                                </div>
                            ))}
                        </div>

                        {/* Columns */}
                        <div className={`grid gap-8 ${project.technicals.columns.length === 1 ? 'place-items-center text-center' :
                            project.technicals.columns.length === 2 ? 'md:grid-cols-2' :
                                'md:grid-cols-3'
                            }`}>
                            {project.technicals.columns.map((_, colIndex) => {
                                const items = t(`projects.${project.id}.technicals.col${colIndex + 1}`, { returnObjects: true }) as string[];
                                return (
                                    <ul key={colIndex} className="space-y-3">
                                        {Array.isArray(items) && items.map((item, itemIndex) => (
                                            <motion.li
                                                key={itemIndex}
                                                initial={{ opacity: 0, y: 10 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                transition={{ delay: itemIndex * 0.05 }}
                                                className="text-slate-300 font-light flex items-start gap-2"
                                            >
                                                {project.technicals!.columns.length === 1 ? (
                                                    <span className="block">{item}</span>
                                                ) : (
                                                    <>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 shrink-0 opacity-50" />
                                                        <span>{item}</span>
                                                    </>
                                                )}
                                            </motion.li>
                                        ))}
                                    </ul>
                                )
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* Media Gallery */}
            <section className="pb-32 container mx-auto px-6">
                <div className="columns-1 md:columns-2 gap-8 max-w-6xl mx-auto space-y-8">
                    {processedMedia.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative w-full cursor-pointer group break-inside-avoid mb-8"
                            onClick={() => openLightbox(index)}
                        >
                            {item.type !== 'video' && (
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 rounded-xl pointer-events-none">
                                    <ZoomIn className="text-white w-8 h-8" />
                                </div>
                            )}

                            {item.type === 'video' ? (
                                <video
                                    src={item.url}
                                    controls
                                    className="w-full h-auto rounded-xl shadow-lg"
                                    poster={item.thumbnail}
                                    onClick={(e) => e.stopPropagation()} // Let underlying controls work
                                />
                            ) : (
                                <img
                                    src={item.url}
                                    alt={`${t(`projects.${project.id}.title`)} - Media ${index + 1}`}
                                    className="w-full h-auto object-contain rounded-xl"
                                />
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Lightbox Overlay */}
                {lightboxIndex !== null && (
                    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
                        onClick={closeLightbox}>

                        <button onClick={closeLightbox} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
                            <X size={32} />
                        </button>

                        <button onClick={prevImage} className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all">
                            <ChevronLeft size={48} />
                        </button>

                        <button onClick={nextImage} className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all">
                            <ChevronRight size={48} />
                        </button>

                        <div className="max-w-7xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                            {processedMedia[lightboxIndex].type === 'video' ? (
                                <video
                                    src={processedMedia[lightboxIndex].url}
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-[85vh] object-contain mx-auto rounded-lg"
                                />
                            ) : (
                                <img
                                    src={processedMedia[lightboxIndex].url}
                                    alt="Enlarged view"
                                    className="max-w-full max-h-[90vh] object-contain mx-auto rounded-lg shadow-2xl"
                                />
                            )}
                            <div className="text-center text-slate-400 mt-4 font-mono text-sm">
                                {lightboxIndex + 1} / {processedMedia.length}
                            </div>
                        </div>
                    </div>
                )}

                {/* Placeholder for no media */}
                {processedMedia.length === 0 && (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 max-w-4xl mx-auto">
                        <p className="text-slate-400">{t('projects.mediaComingSoon')}</p>
                        <p className="text-sm text-slate-500 mt-2">{t('projects.checkBackLater')}</p>
                    </div>
                )}
            </section>

            {/* Simple Footer */}
            <footer className="py-8 border-t border-white/5 text-center text-slate-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Robin Baron. {t('footer.rights')}</p>
            </footer>
        </div >
    );
};

export default ProjectDetail;
