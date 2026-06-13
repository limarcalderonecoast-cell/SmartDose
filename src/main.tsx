import React from 'react';
import { createRoot } from 'react-dom/client';

import AppWeb from './AppWeb';
import './web.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('SmartDose could not find the root element.');
}

createRoot(container).render(
  <React.StrictMode>
    <AppWeb />
  </React.StrictMode>
);
