import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:4000/api';      // package.json - proxy handles the BE URL
console.log('BASE_URL:', BASE_URL);


const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // You can add other headers like authorization token here
  },
});

export default apiClient;