import { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, } from 'react-router-dom';
import Home from './pages/Home';
import './i18n';
import { ThemeProvider } from './context/ThemeContext';
import useHtmlLang from './hooks/useHtmlLang';

// Home is the landing route, so it stays in the main chunk; lazy-loading it
// would just add a round trip before first paint. The rest are split out.
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Photography = lazy(() => import('./pages/Photography'));
const PhotoSeries = lazy(() => import('./pages/PhotoSeries'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Matches the page background in both themes, so a chunk fetch reads as a beat
// of empty page rather than a flash of white.
const RouteFallback = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors" />
);

// Using HashRouter for easiest deployment on GitHub Pages without server-side config
const App = () => {
  useHtmlLang();

  return (
    <ThemeProvider>
      <Router>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
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
