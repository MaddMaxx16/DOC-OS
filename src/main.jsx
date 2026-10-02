import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import StartupApp from './StartupApp.jsx'
import { StatusBar } from '@capacitor/status-bar'

StatusBar.hide().catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StartupApp />
  </StrictMode>,
)
