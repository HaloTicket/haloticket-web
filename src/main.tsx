import "@/i18n";
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './finance-theme.css'
import { initializeBrowserAuth } from '@/services/authBootstrap'
import { getKeycloakSession } from '@/services/keycloakSession'
import { userApi } from '@/services/userApi'

/** Khởi động ứng dụng: khởi tạo xác thực Keycloak trên trình duyệt rồi mới nạp `App` và dựng React. */
async function bootstrap() {
  const session = getKeycloakSession()
  try {
    await initializeBrowserAuth({
      init: session.init,
      syncCurrentUser: userApi.syncCurrentUser,
    })
  } catch {
    // Giữ cho đăng nhập bằng mật khẩu vẫn dùng được khi Keycloak tạm thời ngoại tuyến.
  }

  // Keycloak có thể viết lại tham số callback nên phải khởi tạo trước router.
  const { default: App } = await import('./App.tsx')
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
