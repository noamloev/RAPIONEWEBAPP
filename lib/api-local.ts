import axios from "axios";
import { getToken } from "@/lib/auth";

export const localApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_LOCAL_API_URL || "http://127.0.0.1:8000",
  timeout: 1000 * 60 * 15,
});

localApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});