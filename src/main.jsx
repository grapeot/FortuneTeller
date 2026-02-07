import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import SharePage from './components/SharePage.jsx'

/**
 * Simple path-based routing:
 * - /share/{id} → SharePage
 * - everything else → App (main fortune teller)
 */
function Router() {
  const path = window.location.pathname
  const shareMatch = path.match(/^\/share\/([a-f0-9]+)$/)

  if (shareMatch) {
    return <SharePage shareId={shareMatch[1]} />
  }

  return <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router />
  </StrictMode>,
)
