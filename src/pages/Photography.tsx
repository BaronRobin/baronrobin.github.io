import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { photoSeries, photoUrl } from '../data/photos';
import SiteNav from '../components/SiteNav';
import PhotoFrame from '../components/PhotoFrame';
import useDocumentTitle from '../hooks/useDocumentTitle';
import SiteFooter from '../components/SiteFooter';

const Photography = () => {
    const { t } = useTranslation();

    useDocumentTitle(t('photography.title'));

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-purple-500/30 transition-colors duration-300">
            <SiteNav active="photography" />

            {/* Header */}
            <div className="pt-32 pb-16 container mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-4xl"
                >
                    <span className="text-purple-600 dark:text-purple-400 font-medium mb-4 block tracking-wide uppercase text-sm transition-colors">
                        {t('photography.eyebrow')}
                    </span>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-slate-900 dark:text-white transition-colors">
                        {t('photography.title')}
                    </h1>
                    <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl transition-colors">
                        {t('photography.subtitle')}
                    </p>
                </motion.div>
            </div>

            {/* Series Grid */}
            <section className="pb-32 container mx-auto px-6">
                <div className="grid md:grid-cols-2 gap-8 max-w-6xl">
                    {photoSeries.map((series, index) => (
                        <motion.div
                            key={series.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Link
                                to={`/photography/${series.id}`}
                                className="group block relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 dark:bg-white/5"
                            >
                                <PhotoFrame
                                    src={photoUrl(series, series.cover)}
                                    alt={t(`photography.series.${series.id}.title`)}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    fallbackClassName="w-full h-full rounded-2xl"
                                />

                                {/* Legibility scrim, the caption sits over the photo */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                                <div className="absolute inset-x-0 bottom-0 p-6 flex items-end justify-between gap-4">
                                    <div>
                                        <span className="text-white/70 text-xs tracking-widest uppercase font-medium">
                                            {t(`photography.series.${series.id}.category`)}
                                        </span>
                                        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mt-1">
                                            {t(`photography.series.${series.id}.title`)}
                                        </h2>
                                        <span className="text-white/60 text-sm font-mono mt-1 block">
                                            {t('photography.photoCount', { count: series.photos.length })}
                                        </span>
                                    </div>
                                    <ArrowRight className="text-white shrink-0 mb-1 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </section>

            <SiteFooter />
        </div>
    );
};

export default Photography;
