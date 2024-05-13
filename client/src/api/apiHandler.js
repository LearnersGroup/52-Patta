import apiClient from "./apiClient";

export const setAuthToken = (token) => {
    apiClient.defaults.headers.common['x-auth-token'] = token;
}

export const removeAuthToken = () => {
    delete apiClient.defaults.headers.common['x-auth-token'];
}

export const user_login = async (username, password) => {
    try {
        const response = await apiClient.post("/auth", {
            email: username,
            password: password,
        });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

export const user_register = async (username, useremail, password) => {
    try {
        const response = await apiClient.post("/users", {
            email: useremail,
            name: username,
            password: password,
        });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

export const room_register = async (roomname, roompass, player_count) => {
    try {
        const response = await apiClient.post("/games", {
            roomname: roomname,
            roompass: roompass,
            player_count: player_count,
        });
        return response;
    } catch (error) {
        throw error.response.data;
    }
};

export const room_join = async (roomname, roompass) => {
    try {
        const response = await apiClient.post("/game-rooms", {
            roomname: roomname,
            roompass: roompass,
        });
        return response;
    } catch (error) {
        throw error.response.data;
    }
};

export const room_leave = async () => {
    try {
        const response = await apiClient.delete("/mygame");
        return response;
    } catch (error) {
        throw error.response.data;
    }
};

export const get_all_rooms = async () => {
    try {
        const response = await apiClient.get("/game-rooms");
        
        // console.log(Object.keys(response.data[0]))
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

export const get_current_game = async () => {
    try {
        const response = await apiClient.get("/mygame");
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};