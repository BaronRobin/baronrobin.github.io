import { lazy, Suspense, useLayoutEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import SiteNav from './components/SiteNav';
import './i18n';
import { ThemeProvider } from './context/ThemeContext';
import useHtmlLang from './hooks/useHtmlLang';
import { LAUTWASSER_ID } from './data/projects';

// Home is the landing route, so it stays in the main chunk; lazy-loading it
// would just add a round trip before first paint. The rest are split out.
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Lautwasser = lazy(() => import('./pages/lautwasser'));
const Photography = lazy(() => import('./pages/Photography'));
const PhotoSeries = lazy(() => import('./pages/PhotoSeries'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Matches the page background in both themes, so a chunk fetch reads as a beat
// of empty page rather than a flash of white.
const RouteFallback = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors" />
);

// The browser restores scroll on popstate by itself, before the page for that
// history entry has rendered, so it restores onto the wrong page. Home puts
// itself back where you left it instead (see Home), and everything else opens
// at the top.
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

/**
 * Every page but Home opens at the top. A layout effect, so it happens before
 * the new page is painted: the pages' own after-paint scroll showed one frame
 * of the page at the previous page's scroll position first.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    if (pathname !== '/') window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
};

// Using HashRouter for easiest deployment on GitHub Pages without server-side config
const App = () => {
  useHtmlLang();

  return (
    <ThemeProvider>
      <Router>
        <ScrollToTop />
        {/* One header for every page, outside the routes so it never remounts. */}
        <SiteNav />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            {/* Its own page and its slides; the static segment outranks :id. */}
            <Route path={`/project/${LAUTWASSER_ID}/*`} element={<Lautwasser />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
            <Route path="/photography" element={<Photography />} />
            <Route path="/photography/:seriesId" element={<PhotoSeries />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
};

export default App;
