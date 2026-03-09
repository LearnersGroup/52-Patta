import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:4000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
