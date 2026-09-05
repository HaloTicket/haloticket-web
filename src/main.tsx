import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initializeBrowserAuth } from '@/services/authBootstrap'
import { getKeycloakSession } from '@/services/keycloakSession'
import { userApi } from '@/services/userApi'

async function bootstrap() {
  const session = getKeycloakSession()
  try {
    await initializeBrowserAuth({
      init: session.init,
      syncCurrentUser: userApi.syncCurrentUser,
    })
  } catch {
    // Keep password authentication available when Keycloak is temporarily offline.
  }

  // Keycloak may rewrite callback parameters, so initialize it before the router.
  const { default: App } = await import('./App.tsx')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
