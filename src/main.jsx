import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { StatusBar } from '@capacitor/status-bar'

StatusBar.hide().catch(() => {})

// PERF DIAGNOSTIC 6
// Intentionally bypass App.jsx completely. This establishes the React/Vite/
// WebView baseline with zero DOC OS application state, effects, maps, creator,
// save persistence, or gameplay code mounted.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: '#05080b',
        color: '#66717b',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '11px',
        fontWeight: 800,
        letterSpacing: '.12em',
        textAlign: 'center',
      }}
    >
      DOC OS BASELINE TEST
    </div>
  </StrictMode>,
)
