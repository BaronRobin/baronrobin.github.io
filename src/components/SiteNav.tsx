import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import Logo from './Logo';
import { PHOTOGRAPHY_IN_NAV } from '../data/photos';
import { LAUTWASSER_ID } from '../data/projects';

/**
 * The site header. There is one, rendered by App outside the routes, so it
 * never remounts on navigation: the mark and the links hold still from page
 * to page, and only their colours change.
 *
 * A reserved bar: plain words, no pills. On Home its items scroll to the
 * sections in place, and over the hero it goes transparent with white type.
 * Anywhere else they lead to Home's sections, and a back arrow slides out
 * from behind the mark.
 * Nothing about its geometry depends on either state: an earlier version
 * padded the bar at the top of a page and not once scrolled, and Home and the
 * other pages each had their own copy with different items, so the mark
 * jumped whenever you crossed from one to the other.
 */

// `to` marks the items that are pages of their own; the rest are Home's sections.
const ITEMS: { key: string; to?: string }[] = [
    { key: 'about' },
    { key: 'skills' },
    ...(PHOTOGRAPHY_IN_NAV ? [{ key: 'photography', to: '/photography' }] : []),
    { key: 'projects' },
    { key: 'contact' },
];

const LAUTWASSER = `/project/${LAUTWASSER_ID}`;

const SiteNav = () => {
    const { t, i18n } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const { pathname, key } = useLocation();
    const navigate = useNavigate();
    const reduce = useReducedMotion();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(() => window.scrollY > 50);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // A menu left open doesn't follow you to the next page.
    const [menuFor, setMenuFor] = useState(pathname);
    if (menuFor !== pathname) {
        setMenuFor(pathname);
        setIsMenuOpen(false);
    }

    // The Lautwasser slides are a full-screen player with their own controls.
    if (pathname.startsWith(`${LAUTWASSER}/slides`)) return null;

    const home = pathname === '/';
    // Lautwasser's page is black whatever the theme: the bar follows it, and
    // its theme switch, which would change nothing there, keeps its place
    // without being shown so the flags beside it don't move.
    const forcedDark = pathname.startsWith(LAUTWASSER);
    const active = pathname.startsWith('/photography') ? 'photography' : pathname.startsWith('/project/') ? 'projects' : undefined;

    // Frost the bar whenever it's scrolled OR the mobile menu is open, so the
    // header row and the dropdown share one background instead of a
    // transparent strip floating above an opaque panel.
    const solid = isScrolled || isMenuOpen;
    const onHero = home && !solid;

    const scrollHome = (section: string) => {
        setIsMenuOpen(false);
        document.getElementById(section)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    };

    // Back where you came from, if that was somewhere on this site. A deep
    // link has nowhere on the site to go back to, so it goes to the projects.
    const goBack = () => {
        if (key !== 'default') navigate(-1);
        else navigate('/', { state: { section: 'projects' } });
    };

    // Over the hero video the words go white, with a soft shadow for the
    // bright frames; elsewhere they take the theme's colours.
    const HERO_TYPE = 'text-white/90 hover:text-white [text-shadow:0_1px_10px_rgb(0_0_0/0.35)]';
    const link = (current: boolean) => `transition-colors ${onHero
        ? HERO_TYPE
        : current
            ? 'text-purple-600 dark:text-purple-400'
            : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-white'}`;

    const menuRow = (current: boolean) => `block w-full text-left px-6 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${current
        ? 'text-purple-600 dark:text-purple-400'
        : 'text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-white'}`;

    const item = ({ key: itemKey, to }: (typeof ITEMS)[number], className: string) => {
        const label = t(`nav.${itemKey}`);
        if (to) return <Link key={itemKey} to={to} className={className}>{label}</Link>;
        if (home) return <button key={itemKey} type="button" onClick={() => scrollHome(itemKey)} className={className}>{label}</button>;
        return <Link key={itemKey} to="/" state={{ section: itemKey }} className={className}>{label}</Link>;
    };

    const flags = (size: string) => (['en', 'de', 'es'] as const).map((lng) => (
        <button
            key={lng}
            type="button"
            onClick={() => i18n.changeLanguage(lng)}
            className={`${size} hover:scale-110 transition-transform ${i18n.language === lng ? 'opacity-100 scale-110' : 'opacity-50 hover:opacity-100'}`}
            title={{ en: 'English', de: 'Deutsch', es: 'Español' }[lng]}
        >
            {{ en: '🇺🇸', de: '🇩🇪', es: '🇪🇸' }[lng]}
        </button>
    ));

    const themeButton = (className: string) => (
        <button
            type="button"
            onClick={toggleTheme}
            className={`${className} ${forcedDark ? 'invisible' : ''}`}
            aria-label="Toggle Theme"
            aria-hidden={forcedDark || undefined}
            tabIndex={forcedDark ? -1 : undefined}
        >
            {theme === 'dark'
                ? <Sun size={20} className={onHero ? 'text-yellow-300' : 'text-yellow-400'} />
                : <Moon size={20} className={onHero ? 'text-white' : 'text-slate-600'} />}
        </button>
    );

    const bar = (
        <nav className={`fixed top-0 w-full z-50 border-b transition-colors duration-300 ${solid ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-slate-200 dark:border-white/5' : 'bg-transparent border-transparent'}`}>
            <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                <div className="relative flex items-center">
                    {/* The back arrow's slot, clipped at the mark's left edge, so the
                        arrow slides out from behind the mark rather than fading in
                        beside it. From sm up there is margin to its left and the
                        slot hangs into it, leaving the mark where it was; on a
                        phone there isn't, so the slot opens and the mark moves over. */}
                    <div className={`flex items-center justify-end overflow-hidden transition-[width] duration-500 ${home ? 'w-0' : 'w-11'} sm:w-11 sm:absolute sm:right-full sm:inset-y-0`}>
                        <AnimatePresence initial={false}>
                            {!home && (
                                <motion.button
                                    key="back"
                                    type="button"
                                    onClick={goBack}
                                    initial={{ x: '110%', opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: '110%', opacity: 0 }}
                                    transition={reduce ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                    className="flex items-center justify-center w-9 h-9 rounded-full text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                    aria-label={t('nav.back')}
                                    title={t('nav.back')}
                                >
                                    <ArrowLeft size={20} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                    <Link
                        to="/"
                        // On Home the mark takes you back up; the route is already right.
                        onClick={() => { if (home) window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }}
                        className="inline-flex"
                        aria-label="Robin Baron, home"
                    >
                        <Logo variant={onHero ? 'onHero' : 'solid'} />
                    </Link>
                </div>

                {/* Desktop */}
                <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                    {ITEMS.map((entry) => item(entry, link(entry.key === active)))}
                    <div className={`flex gap-4 pl-6 ml-2 items-center border-l transition-colors ${onHero ? 'border-white/25' : 'border-slate-200 dark:border-white/10'}`}>
                        {themeButton(`p-2 rounded-full transition-colors ${onHero ? 'hover:bg-white/10' : 'hover:bg-slate-100 dark:hover:bg-white/10'}`)}
                        <div className={`w-px h-4 transition-colors ${onHero ? 'bg-white/25' : 'bg-slate-200 dark:bg-white/10'}`} />
                        {flags('text-xl')}
                    </div>
                </div>

                {/* Mobile menu toggle */}
                <button
                    type="button"
                    className={`md:hidden p-2 rounded-full transition-colors ${onHero ? 'text-white [filter:drop-shadow(0_1px_6px_rgb(0_0_0/0.35))]' : 'text-slate-900 dark:text-white'}`}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle Menu"
                    aria-expanded={isMenuOpen}
                >
                    {isMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile menu */}
            {isMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:hidden absolute top-20 left-0 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 rounded-b-2xl py-4 shadow-xl"
                >
                    {ITEMS.map((entry) => item(entry, menuRow(entry.key === active)))}
                    <div className="flex gap-6 px-6 py-3 border-t border-slate-200 dark:border-white/10 mt-2 items-center">
                        {themeButton('p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors')}
                        <div className="w-px h-6 bg-slate-200 dark:bg-white/10" />
                        {flags('text-2xl')}
                    </div>
                </motion.div>
            )}
        </nav>
    );

    // `dark:` styles apply below a .dark element, not on it: the class goes on a wrapper.
    return forcedDark ? <div className="dark">{bar}</div> : bar;
};

export default SiteNav;
