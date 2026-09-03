import axios from "axios";
import { CONFIG } from "@/config";

const axiosClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: CONFIG.TIMEOUT,
});

// request interceptor: automatically attach the token before sending the API request.
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token && token !== "null" && token !== "undefined" && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// response interceptor: automatically handle errors
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("Unauthorized API call:", error.config?.url);
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
