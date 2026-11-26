import React from 'react';
import { createRoot } from 'react-dom/client';
import Dashboard from './Dashboard.jsx';
import '../styles/global.css';

const root = createRoot(document.getElementById('dashboard-root'));
root.render(<Dashboard />);
