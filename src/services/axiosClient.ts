import axios from "axios";
import { CONFIG } from "@/config";

const axiosClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: CONFIG.TIMEOUT,
});

// Request Interceptor: Automatically attach the token before sending the API request.
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Automatically handle errors (e.g., token expiration)
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Logic for handling expired token (e.g., redirect to login page)
      console.error("Unauthorized! Token expired.");
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
