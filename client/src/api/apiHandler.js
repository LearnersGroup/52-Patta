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