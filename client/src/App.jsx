import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ChatOverlay from './components/ChatOverlay';
import AlertOverlay from './components/AlertOverlay';
import SubtitleOverlay from './components/SubtitleOverlay';
import GoalOverlay from './components/GoalOverlay';
import TickerOverlay from './components/TickerOverlay';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/overlay/chat" element={<ChatOverlay />} />
          <Route path="/overlay/alerts" element={<AlertOverlay />} />
          <Route path="/overlay/subtitles" element={<SubtitleOverlay />} />
          <Route path="/overlay/goals" element={<GoalOverlay />} />
          <Route path="/overlay/ticker" element={<TickerOverlay />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
