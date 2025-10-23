import axios from "axios";
import { getToken } from "../services/tokenService";
// import { IP_ADDRESS } from "@env";

const api = axios.create({
  // baseURL: `http://${IP_ADDRESS}:3000/api`, // Replace with your Express server
  baseURL: `http://localhost:3000/api`,
  timeout: 10000,
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
