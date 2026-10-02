import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          theme="light"
          position="top-right"
          richColors
          toastOptions={{
            style: {
              background: '#FBFAF7',
              border: '1px solid rgba(17,17,17,.12)',
                            fontFamily: 'Inter, sans-serif',
              color: '#111111',
              borderRadius: '16px',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
