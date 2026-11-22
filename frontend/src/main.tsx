import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import PageDock from './components/PageDock.tsx'
import AuthProvider from './context/AuthProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
        <PageDock />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
