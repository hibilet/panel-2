import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'

import App from './pages/app'

createRoot(document.body).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
