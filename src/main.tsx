import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import LeafletProject from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LeafletProject />
  </StrictMode>,
)
