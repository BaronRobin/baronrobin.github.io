import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { projects } from '../data/projects';

const ProjectDetail = () => {
    const { id } = useParams<{ id: string }>();
    const project = projects.find((p) => p.id === id);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    if (!project) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
                <h2 className="text-2xl font-bold mb-4">Project Not Found</h2>
                <Link to="/" className="text-purple-400 hover:text-purple-300">Back to Home</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-purple-500/30">

            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link to="/" className="text-2xl font-bold tracking-tighter hover:text-purple-400 transition-colors">
                            BARON
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex space-x-6 text-sm font-medium text-slate-300">
                            <Link to="/" className="hover:text-white transition-colors">Home</Link>
                            <Link to="/" className="hover:text-white transition-colors">Projects</Link>
                            <Link to="/" className="hover:text-white transition-colors">About</Link>
                            <Link to="/" className="hover:text-white transition-colors">Contact</Link>
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
                        <Link to="/" className="block w-full text-left px-6 py-3 text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => setIsMenuOpen(false)}>Home</Link>
                        <Link to="/" className="block w-full text-left px-6 py-3 text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => setIsMenuOpen(false)}>Projects</Link>
                        <Link to="/" className="block w-full text-left px-6 py-3 text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => setIsMenuOpen(false)}>About</Link>
                        <Link to="/" className="block w-full text-left px-6 py-3 text-slate-300 hover:bg-white/5 hover:text-white" onClick={() => setIsMenuOpen(false)}>Contact</Link>
                    </motion.div>
                )}
            </nav>

            {/* Back Button */}
            <div className="pt-32 container mx-auto px-6">
                <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Projects</span>
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
                        {project.category}
                    </span>
                    <h1 className="text-4xl md:text-6xl font-bold mb-8">{project.title}</h1>
                    <p className="text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto">
                        {project.description}
                    </p>
                </motion.div>
            </div>

            {/* Technical Details Section */}
            {project.technicals && (
                <section className="pb-16 container mx-auto px-6">
                    <div className="max-w-5xl mx-auto glass-card p-8 md:p-12">

                        {/* Icons */}
                        <div className="flex flex-wrap justify-center gap-6 mb-12 border-b border-white/5 pb-8">
                            {project.technicals.icons.map((Icon, i) => (
                                <div key={i} className="text-slate-300 bg-white/5 p-4 rounded-xl hover:bg-white/10 hover:text-white transition-all hover:scale-110">
                                    <Icon className="w-8 h-8 md:w-10 md:h-10" />
                                </div>
                            ))}
                        </div>

                        {/* Columns */}
                        <div className={`grid gap-8 ${project.technicals.columns.length === 1 ? 'place-items-center text-center' :
                            project.technicals.columns.length === 2 ? 'md:grid-cols-2' :
                                'md:grid-cols-3'
                            }`}>
                            {project.technicals.columns.map((column, colIndex) => (
                                <ul key={colIndex} className="space-y-3">
                                    {column.map((item, itemIndex) => (
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
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Media Gallery */}
            <section className="pb-32 container mx-auto px-6">
                <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    {project.media.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative w-full"
                        >
                            {item.type === 'video' ? (
                                <video
                                    src={item.url}
                                    controls
                                    className="w-full h-auto rounded-xl shadow-lg"
                                    poster={item.thumbnail}
                                />
                            ) : (
                                <img
                                    src={item.url}
                                    alt={`${project.title} - Media ${index + 1}`}
                                    className="w-full h-auto object-contain"
                                />
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Placeholder for no media */}
                {project.media.length === 0 && (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 max-w-4xl mx-auto">
                        <p className="text-slate-400">Media for this project is coming soon.</p>
                        <p className="text-sm text-slate-500 mt-2">Check back later!</p>
                    </div>
                )}
            </section>

            {/* Simple Footer */}
            <footer className="py-8 border-t border-white/5 text-center text-slate-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Robin Baron. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default ProjectDetail;
