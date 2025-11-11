import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Router>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/workflow" element={<App />} />
      <Route path="/dashboard" element={<App />} />
      <Route path="/reviews" element={<App />} />
      <Route path="/deployments" element={<App />} />
    </Routes>
  </Router>
);