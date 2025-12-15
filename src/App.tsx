import React from 'react';
import { HashRouter as Router, Routes, Route, } from 'react-router-dom';
import Home from './pages/Home';
import ProjectDetail from './pages/ProjectDetail';

// Using HashRouter for easiest deployment on GitHub Pages without server-side config
const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/project/:id" element={<ProjectDetail />} />
      </Routes>
    </Router>
  );
};

export default App;
