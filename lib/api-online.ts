import axios from "axios";
import { getToken } from "@/lib/auth";

export const onlineApi = axios.create({
  baseURL: "https://anuchka.onrender.com",
});

onlineApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});