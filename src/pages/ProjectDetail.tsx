import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { projects } from '../data/projects';

const ProjectDetail = () => {
    const { id } = useParams<{ id: string }>();
    const project = projects.find((p) => p.id === id);

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
                    <Link to="/" className="hover:text-purple-400 transition-colors">
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft size={20} />
                            <span className="font-medium">Back</span>
                        </motion.div>
                    </Link>

                    <div className="font-bold tracking-tighter">BARON</div>
                </div>
            </nav>

            {/* Hero Content */}
            <div className="pt-32 pb-16 container mx-auto px-6">
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

            {/* Media Gallery */}
            <section className="pb-32 container mx-auto px-6">
                <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    {project.media.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className={`relative rounded-2xl overflow-hidden glass-card ${
                                // Make the first item span full width if it's the only one or logically the 'hero'
                                index === 0 && project.media.length % 2 !== 0 ? 'md:col-span-2 aspect-video' : 'aspect-[4/3]'
                                }`}
                        >
                            {item.type === 'video' ? (
                                <video
                                    src={item.url}
                                    controls
                                    className="w-full h-full object-cover"
                                    poster={item.thumbnail}
                                />
                            ) : (
                                <img
                                    src={item.url}
                                    alt={`${project.title} - Media ${index + 1}`}
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
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
