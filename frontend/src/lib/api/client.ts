import axios from 'axios';

const client = axios.create({
  baseURL: '/api', 
  
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

client.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

export default client;