import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api', // backend API
  timeout: 5000,
});

export default api;
