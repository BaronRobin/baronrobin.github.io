import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertOctagon, ArrowLeft } from 'lucide-react';
import useDocumentTitle from '../hooks/useDocumentTitle';

const NotFound = () => {
    const { t } = useTranslation();

    useDocumentTitle(t('notFoundPage.title'));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-purple-500/30 flex items-center justify-center relative overflow-hidden transition-colors duration-300">
            {/* Background Image Similar to Home */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/hero.jpg"
                    alt=""
                    aria-hidden
                    className="w-full h-full object-cover opacity-10 dark:opacity-20 blur-sm"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/80 to-slate-50/60 dark:from-slate-950 dark:via-slate-950/80 dark:to-slate-950/60" />
            </div>

            <div className="container mx-auto px-6 relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-lg mx-auto glass-card p-12"
                >
                    <div className="mb-6 text-purple-500 flex justify-center">
                        <AlertOctagon size={64} />
                    </div>

                    <h1 className="text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
                        {t('notFoundPage.title')}
                    </h1>

                    <h2 className="text-2xl font-semibold mb-6 text-slate-900 dark:text-white transition-colors">
                        {t('notFoundPage.subtitle')}
                    </h2>

                    <p className="text-slate-600 dark:text-slate-400 mb-10 leading-relaxed transition-colors">
                        {t('notFoundPage.description')}
                    </p>

                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 bg-slate-900 text-white dark:bg-white dark:text-slate-950 px-8 py-4 rounded-full font-bold hover:bg-purple-600 hover:text-white dark:hover:bg-purple-400 dark:hover:text-white transition-all duration-300 group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        {t('notFoundPage.button')}
                    </Link>
                </motion.div>
            </div>
        </div>
    );
};

export default NotFound;
