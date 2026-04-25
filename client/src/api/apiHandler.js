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

export const user_register = async (username, useremail, password, avatar) => {
    try {
        const payload = {
            email: useremail,
            password: password,
        };

        if (typeof username !== "undefined" && String(username).trim()) {
            payload.name = String(username).trim();
        }

        if (typeof avatar !== "undefined" && String(avatar).trim()) {
            payload.avatar = avatar;
        }

        const response = await apiClient.post("/users", payload);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

export const get_profile = async () => {
    try {
        const response = await apiClient.get('/auth');
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

export const unlink_provider = async (provider) => {
    try {
        const response = await apiClient.delete(`/auth/providers/${provider}`);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

export const update_profile = async ({ name, avatar }) => {
    try {
        const payload = {};

        if (typeof name !== "undefined") {
            payload.name = name;
        }

        if (typeof avatar !== "undefined") {
            payload.avatar = avatar;
        }

        const response = await apiClient.put('/auth/profile', payload);
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

export const get_my_game_log = async ({ limit = 20, cursor } = {}) => {
    try {
        const params = { limit };
        if (cursor) params.cursor = cursor;
        const response = await apiClient.get("/game-log/me", { params });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const get_series_detail = async (seriesId) => {
    try {
        const response = await apiClient.get(`/game-log/me/${seriesId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const get_room_log = async (roomId) => {
    try {
        const response = await apiClient.get(`/game-log/room/${roomId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const get_all_user_in_room = async (room_id) => {
    try {
        const response = await apiClient.get("/game-rooms/players", {
            params: {
                id: room_id
            }
        });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};