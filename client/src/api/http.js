import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
});

export function setToken(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentRole = localStorage.getItem("currentRole");
      const sessions = JSON.parse(localStorage.getItem("sessions") || "{}");
      if (currentRole && sessions[currentRole]) {
        delete sessions[currentRole];
        const nextRole = Object.keys(sessions)[0] || "";
        localStorage.setItem("sessions", JSON.stringify(sessions));
        if (nextRole) {
          localStorage.setItem("currentRole", nextRole);
          localStorage.setItem("token", sessions[nextRole].token);
          localStorage.setItem("user", JSON.stringify(sessions[nextRole].user));
        } else {
          localStorage.removeItem("currentRole");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
      if (window.location.pathname !== "/login") window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

setToken(localStorage.getItem("token"));
