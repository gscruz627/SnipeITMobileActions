import React from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import "./App.css"
import Home from './Home';
import Settings from './Settings';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
};

export default App;