import axios from "axios";
import { getToken, getUser } from "@/lib/auth";

export const onlineApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

onlineApi.interceptors.request.use((config) => {
  const token = getToken();
  const user = getUser();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (user?.company_id) {
    config.headers["X-Company-Id"] = String(user.company_id);
  }

  return config;
});