import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "https://chief-aidan-soulart-e2f4aaf0.koyeb.app/v1",
  withCredentials: true,
});
