import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Global handler for Vite dynamic import & chunk preload errors (deployment version mismatch)
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    console.warn('[Vite] Dynamic import preload error detected. Auto-reloading latest version...')
    const reloadKey = 'textileops_vite_preload_reload'
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, 'true')
      if ('caches' in window) {
        window.caches
          .keys()
          .then((keys) => Promise.all(keys.map((k) => window.caches.delete(k))))
          .finally(() => {
            window.location.reload()
          })
      } else {
        window.location.reload()
      }
    }
  })

  // Clear reload guards once page runs smoothly
  window.addEventListener('load', () => {
    setTimeout(() => {
      try {
        sessionStorage.removeItem('textileops_vite_preload_reload')
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('textileops_chunk_reload_')) {
            sessionStorage.removeItem(key)
          }
        })
      } catch {}
    }, 3000)
  })

  // Prevent accidental pinch/gesture zoom on mobile touch devices (Native App Standard)
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false })
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false })
  document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

// Register PWA Service Worker with auto-update
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('PWA ServiceWorker registered with scope:', reg.scope)
        reg.update().catch(() => {})
      })
      .catch((err) => console.warn('PWA ServiceWorker registration error:', err))

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  })
}

