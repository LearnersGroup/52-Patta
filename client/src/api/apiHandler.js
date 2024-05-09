import apiClient from "./apiClient"

export const user_login = async (username, password) => {
    try {
        const response = await apiClient.post('/auth', {
            email: username,
            password: password,
        });
        return response.data
    } catch (error) {
        throw error.response.data;
    }
}

export const user_register = async (username, useremail, password) => {
    try {
        const response = await apiClient.post('/users', {
            email: useremail,
            name: username,
            password: password,
        });
        return response.data
    } catch (error) {
        throw error.response.data;
    }
}