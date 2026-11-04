import React, { useState, useEffect } from 'react';
import { AppShell } from './app/AppShell.jsx';

const h = React.createElement;

function getWindowWidth() {
  if (typeof window !== 'undefined' && Number.isFinite(window.innerWidth)) {
    return window.innerWidth;
  }
  return 390;
}

export function App(props) {
  const [viewportWidth, setViewportWidth] = useState(getWindowWidth);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handleResize = () => setViewportWidth(getWindowWidth());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return h(AppShell, { viewportWidth, ...props });
}

export default App;
