//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from "./utils/AuthContext";
import './styles/global.css'
import './styles/variables.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
)
