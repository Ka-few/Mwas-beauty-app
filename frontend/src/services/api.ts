import axios from 'axios';

// Use 127.0.0.1 for maximum Windows compatibility (avoids IPv6 localhost issues)
const baseURL = import.meta.env.DEV ? '/api' : 'http://127.0.0.1:3001/api';

const api = axios.create({
  baseURL,
  timeout: 10000, // Increased timeout for Windows systems
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorInfo = `[${error.code || 'UNKNOWN'}] to ${baseURL}`;
    if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
      console.error('Network Error:', errorInfo);
      error.message = `Cannot connect to server at ${baseURL}. Error: ${error.code}. Please ensure the app is running correctly.`;
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request Timeout:', errorInfo);
      error.message = 'Request timed out. Please try again.';
    }
    return Promise.reject(error);
  }
);

export default api;
