// Central API configuration (root src copy)
const BASE_API_URL = import.meta.env.VITE_API_BASE_URL || 'https://contextly-backend-production.up.railway.app';

export function apiUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_API_URL}${normalized}`;
}

export async function apiFetch(path: string, options?: RequestInit) {
  const url = apiUrl(path);
  const res = await fetch(url, options);
  return res;
}

export default BASE_API_URL;
