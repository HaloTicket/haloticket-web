import axios from "axios";
import { CONFIG } from "@/config";
import { getKeycloakSession } from "@/services/keycloakSession";

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
    const token = await getKeycloakSession().getAccessToken();
    if (token && token !== "null" && token !== "undefined" && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers) {
      if (typeof config.headers.delete === "function") {
        config.headers.delete("Authorization");
        config.headers.delete("authorization");
      } else {
        delete (config.headers as Record<string, any>).Authorization;
        delete (config.headers as Record<string, any>).authorization;
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
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      if (originalRequest.headers) {
        if (typeof originalRequest.headers.delete === "function") {
          originalRequest.headers.delete("Authorization");
          originalRequest.headers.delete("authorization");
        } else {
          delete (originalRequest.headers as Record<string, any>).Authorization;
          delete (originalRequest.headers as Record<string, any>).authorization;
        }
      }
      try {
        const retryRes = await axios({
          ...originalRequest,
          headers: {
            ...originalRequest.headers,
            Authorization: undefined,
            authorization: undefined,
          },
        });
        return retryRes.data;
      } catch (retryErr) {
        console.warn("Unauthorized API call after retry:", originalRequest.url);
        return Promise.reject(retryErr);
      }
    }

    if (error.response?.status === 401) {
      console.warn("Unauthorized API call:", error.config?.url);
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
