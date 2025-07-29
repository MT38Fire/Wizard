import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

//const API_BASE_URL = "http://192.168.1.64:8080/api";

const apiService = {
  // Authentication
  login: async (username, password) => {
    return axios.post(`${API_BASE_URL}/auth/login`, { username, password });
  },
  
  register: async (username, password) => {
    return axios.post(`${API_BASE_URL}/auth/register`, { username, password });
  },
  
  // Room management
  getRooms: async () => {
    return axios.get(`${API_BASE_URL}/rooms`);
  },
  
  createRoom: async (roomData) => {
    return axios.post(`${API_BASE_URL}/rooms/createRoom`, roomData);
  },
  
  joinRoom: async (roomId, username) => {
    return axios.post(`${API_BASE_URL}/rooms/${roomId}/join`, {username});
  },

  getUserProfile: async (username) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/profile/${username}`);
      return response;
    } catch (error) {
      throw error;
    }
  }
};

export default apiService;