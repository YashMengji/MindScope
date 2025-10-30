import api from "../api/axiosConfig";
import { saveToken } from "./tokenService";
import axios from "axios";
import { getToken } from "./tokenService";

export const getProfile = async () => {
  const token = await getToken();
  const response = await axios.get("http://localhost:3000/api/user/profile", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const signup = async (userData) => {
  const response = await api.post("/user/signup", userData);
  const token = response.headers["authorization"]?.replace("Bearer ", "");

  if (token) {
    console.log("token received ✅");
    await saveToken(token);
  } else {
    console.log("token was not received from express ❌");
  }

  return response.data;
};

export const login = async (credentials) => {
  console.log(credentials);
  const response = await api.post("/user/login", credentials);
  const token = response.headers["authorization"]?.replace("Bearer ", "");

  if (token) {
    console.log("token received ✅ : ", token);
    await saveToken(token);
    console.log("token saved !");
  } else {
    console.log("token was not received from express ❌");
  }

  return response.data;
};
