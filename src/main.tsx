import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installGtm } from './core/analytics/gtm'
import './index.css'
import App from './App.tsx'

/**
 * Static purpose block in index.html is for no-JS + page source.
 * Official OAuth Application home page should be /home.html (pure HTML).
 * Do not rely on User-Agent bot detection — Google brand checks often use a
 * normal browser UA.
 */
installGtm()

document.documentElement.classList.add('bw-app-ready')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
