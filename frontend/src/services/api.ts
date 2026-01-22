import axios from 'axios';

const baseURL = import.meta.env.DEV ? '/api' : 'http://127.0.0.1:3001/api';

const api = axios.create({
  baseURL,
  timeout: 5000,
});

export default api;
