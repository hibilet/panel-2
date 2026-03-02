import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'

import { TourProvider } from '@reactour/tour'
import { AppProvider } from './context'
import App from './pages/app'
import { dashboardTourSteps } from './components/tours/DashboardTour'

createRoot(document.body).render(
  <StrictMode>
    <AppProvider>
      <TourProvider steps={dashboardTourSteps}>
        <App />
      </TourProvider>
    </AppProvider>
  </StrictMode>,
)
