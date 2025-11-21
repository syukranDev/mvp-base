export const BASE_URL = 'http://localhost:5010'

export const API_PATH = {
    AUTH: {
        LOGIN: '/api/v1/auth/login',
        GET_USER_INFO: '/api/v1/auth/getUser',
    },
    USERS: {
        GET_ALL: '/api/v1/users',
        GET_BY_ID: (id) => `/api/v1/users/${id}`,
        CREATE: '/api/v1/users',
        UPDATE: (id) => `/api/v1/users/${id}`,
        DELETE: (id) => `/api/v1/users/${id}`,
    }
}