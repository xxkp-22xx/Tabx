import axios from 'axios';

const api = axios.create({
  baseURL: '/api',   // thanks to CRA proxy
  headers: { 'Content-Type': 'application/json' },
});

export default api;
