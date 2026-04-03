import axios from "axios";

export const localApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_LOCAL_API_URL,
  timeout: 1000 * 60 * 15, // 15 minutes
});