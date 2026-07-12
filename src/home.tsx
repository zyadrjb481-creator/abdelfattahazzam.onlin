/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import HomeApp from './HomeApp.tsx';
import './index.css';

createRoot(document.getElementById('home-root')!).render(
  <StrictMode>
    <HomeApp />
  </StrictMode>,
);
