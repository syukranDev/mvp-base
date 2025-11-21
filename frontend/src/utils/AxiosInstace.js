import axios from 'axios'
import { BASE_URL } from './ApiPath'

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    }
})

axiosInstance.interceptors.request.use((config) => {
    const accessToken = localStorage.getItem('token')
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
}, (error) => {
    Promise.reject(error)
});

axiosInstance.interceptors.response.use((response) => {
    return response
}, (error) => {
    // Don't redirect on 401 for auth endpoints (login/getUser) - let the component handle the error
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                          error.config?.url?.includes('/auth/getUser')
    
    if (error.response?.status === 401 && !isAuthEndpoint) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
    } else if (error.response?.status === 500) {
        console.error('Internal server error, please try again later')
    } else if (error.code === 'ECONNABORTED') {
        console.error('Request timed out')
    }
    return Promise.reject(error)
});

export default axiosInstance