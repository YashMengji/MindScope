import axios from "axios";
import { getToken } from "../services/tokenService";
import { EXPRESS_API_URL } from "../config/endpoints";

const api = axios.create({
  baseURL: EXPRESS_API_URL,
  // Render free instances cold-start (spin down when idle), so the first
  // request after a while can take 30-60s. Keep a generous timeout.
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor → attach token
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
