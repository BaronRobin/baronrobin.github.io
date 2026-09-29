import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { Project } from '../data/projects';

/**
 * The tools card at the foot of a project page: the icons in a row, then the
 * columns of what was done with them. Shared by the standard project page and
 * Lautwasser's own. Column copy lives in i18n under
 * `projects.<id>.technicals.col<n>`; the data only says how many there are.
 */
const ProjectTechnicals = ({ project }: { project: Project }) => {
    const { t } = useTranslation();
    if (!project.technicals) return null;
    const { icons, columns } = project.technicals;

    return (
        <section id="technicals" className="pb-32 container mx-auto px-6 scroll-mt-28">
            <div className="max-w-5xl mx-auto glass-card p-8 md:p-12">
                {/* Icons */}
                <div className="flex flex-wrap justify-center gap-3 md:gap-6 mb-12 border-b border-slate-200 dark:border-white/5 pb-8 transition-colors">
                    {icons.map((Icon, i) => (
                        <div key={i} className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 p-2.5 md:p-4 rounded-lg md:rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all hover:scale-110">
                            <Icon className="w-5 h-5 md:w-10 md:h-10" />
                        </div>
                    ))}
                </div>

                {/* Columns */}
                <div className={`grid gap-8 ${columns.length === 1 ? 'place-items-center text-center' :
                    columns.length === 2 ? 'md:grid-cols-2' :
                        'md:grid-cols-3'
                    }`}>
                    {columns.map((_, colIndex) => {
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
                                        className="text-slate-600 dark:text-slate-300 font-light flex items-start gap-2"
                                    >
                                        {columns.length === 1 ? (
                                            <span className="block">{item}</span>
                                        ) : (
                                            <>
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-500 mt-2 shrink-0 opacity-50" />
                                                <span className="text-slate-600 dark:text-slate-300 transition-colors">{item}</span>
                                            </>
                                        )}
                                    </motion.li>
                                ))}
                            </ul>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default ProjectTechnicals;
