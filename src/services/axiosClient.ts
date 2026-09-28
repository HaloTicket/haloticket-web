import axios from "axios";
import { CONFIG } from "@/config";
import { getKeycloakSession } from "@/services/keycloakSession";

interface AuthRequestMetadata {
  _retry?: boolean;
  _hadAuthSession?: boolean;
}

const axiosClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: CONFIG.TIMEOUT,
});

// request interceptor: automatically attach the token before sending the API request.
axiosClient.interceptors.request.use(
  async (config) => {
    const session = getKeycloakSession();
    const authConfig = config as typeof config & AuthRequestMetadata;
    authConfig._hadAuthSession = session.isAuthenticated();
    const token = await session.getAccessToken();
    if (token && token !== "null" && token !== "undefined" && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers) {
      if (typeof config.headers.delete === "function") {
        config.headers.delete("Authorization");
        config.headers.delete("authorization");
      } else {
        delete (config.headers as Record<string, unknown>).Authorization;
        delete (config.headers as Record<string, unknown>).authorization;
      }
    }
    if (config.data instanceof FormData && config.headers) {
      if (typeof config.headers.delete === "function") {
        config.headers.delete("Content-Type");
        config.headers.delete("content-type");
      } else {
        delete (config.headers as Record<string, unknown>)["Content-Type"];
        delete (config.headers as Record<string, unknown>)["content-type"];
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// response interceptor: automatically handle errors and retry public calls if token expired
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config as
      (typeof error.config & AuthRequestMetadata) | undefined;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      const session = getKeycloakSession();
      if (originalRequest._hadAuthSession) {
        const newToken = await session.forceRefreshAccessToken();
        if (newToken) {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          try {
            const retryRes = await axios(originalRequest);
            return retryRes.data;
          } catch (retryErr: any) {
            if (retryErr.response?.status === 401) {
              console.warn(
                "Unauthorized API call after token refresh:",
                originalRequest.url,
              );
              window.dispatchEvent(new CustomEvent("session-expired"));
            }
            return Promise.reject(retryErr);
          }
        } else {
          // could not refresh token, session is truly expired
          console.warn(
            "Session expired during token refresh for:",
            originalRequest.url,
          );
          window.dispatchEvent(new CustomEvent("session-expired"));
          return Promise.reject(error);
        }
      } else {
        console.warn(
          "Unauthorized API call for public endpoint:",
          originalRequest.url,
        );
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401) {
      console.warn("Unauthorized API call:", error.config?.url);
      if (
        originalRequest?._hadAuthSession ||
        getKeycloakSession().isAuthenticated()
      ) {
        window.dispatchEvent(new CustomEvent("session-expired"));
      }
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
