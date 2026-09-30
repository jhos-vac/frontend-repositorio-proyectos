import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyTheme, useThemeStore } from './store/themeStore'

applyTheme(useThemeStore.getState().mode)
import App from './App.tsx'
import { BrowserRouter } from 'react-router-dom'
import { TooltipProvider } from './components/ui/tooltip'

// El símbolo '!' asegura a TypeScript que el elemento 'root' existe en tu index.html
createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <StrictMode>
      {/* TooltipProvider envuelve la app para habilitar tooltips globales de shadcn */}
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </StrictMode>
  </BrowserRouter>
)