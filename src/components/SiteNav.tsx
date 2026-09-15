import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Logo from './Logo';
import { PHOTOGRAPHY_IN_NAV } from '../data/photos';

/**
 * The fixed site header, for pages that are *not* Home.
 *
 * Home keeps its own copy because its links are in-page `scrollTo` buttons
 * that also react to the transparent-over-hero state; every other page just
 * needs these hash links back to Home, so they share this one.
 */

const LINKS = [
    { key: 'projects', to: '/#projects' },
    ...(PHOTOGRAPHY_IN_NAV ? [{ key: 'photography', to: '/photography' }] : []),
    { key: 'about', to: '/#about' },
    { key: 'skills', to: '/#skills' },
    { key: 'contact', to: '/#contact' },
];

interface SiteNavProps {
    /** `nav.*` key of the current page, rendered in the accent colour. */
    active?: string;
}

const SiteNav = ({ active }: SiteNavProps) => {
    const { t, i18n } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const changeLanguage = (lng: string) => i18n.changeLanguage(lng);

    // Frost the bar whenever it's scrolled OR the mobile menu is open, so the
    // header row and the dropdown share one background instead of a
    // transparent strip floating above an opaque panel.
    const solidNav = isScrolled || isMenuOpen;

    const linkClass = (key: string) =>
        `transition-colors ${active === key
            ? 'text-purple-600 dark:text-purple-400'
            : 'hover:text-purple-600 dark:hover:text-white'}`;

    const flags = (size: string) => (
        <>
            <button onClick={() => changeLanguage('en')} className={`${size} hover:scale-110 transition-transform ${i18n.language === 'en' ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100'}`} title="English">🇺🇸</button>
            <button onClick={() => changeLanguage('de')} className={`${size} hover:scale-110 transition-transform ${i18n.language === 'de' ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100'}`} title="Deutsch">🇩🇪</button>
            <button onClick={() => changeLanguage('es')} className={`${size} hover:scale-110 transition-transform ${i18n.language === 'es' ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100'}`} title="Español">🇪🇸</button>
        </>
    );

    return (
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${solidNav ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 py-0' : 'bg-transparent border-transparent py-4'}`}>
            <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                <Link to="/" className="inline-flex" aria-label="Robin Baron, home">
                    <Logo />
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
                    <Link to="/" className={linkClass('home')}>{t('nav.home')}</Link>
                    {LINKS.map(({ key, to }) => (
                        <Link key={key} to={to} className={linkClass(key)}>{t(`nav.${key}`)}</Link>
                    ))}

                    <div className="flex gap-4 border-l border-slate-200 dark:border-white/10 pl-6 ml-2 items-center">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            aria-label="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
                        </button>
                        <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
                        {flags('text-xl')}
                    </div>
                </div>

                {/* Mobile Menu Toggle */}
                <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle Menu">
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
                    <Link to="/" className="block w-full text-left px-6 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-purple-600 dark:hover:text-white transition-colors" onClick={() => setIsMenuOpen(false)}>{t('nav.home')}</Link>
                    {LINKS.map(({ key, to }) => (
                        <Link
                            key={key}
                            to={to}
                            className={`block w-full text-left px-6 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${active === key ? 'text-purple-600 dark:text-purple-400' : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-white'}`}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            {t(`nav.${key}`)}
                        </Link>
                    ))}

                    <div className="flex gap-6 px-6 py-3 border-t border-slate-200 dark:border-white/10 mt-2 items-center">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            aria-label="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
                        </button>
                        <div className="w-px h-6 bg-slate-200 dark:bg-white/10" />
                        {flags('text-2xl')}
                    </div>
                </motion.div>
            )}
        </nav>
    );
};

export default SiteNav;
