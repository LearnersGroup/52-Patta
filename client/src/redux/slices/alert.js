import { createSlice } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";

const initialState = {
    alerts: [],
};

const alertSlice = createSlice({
    name: "alert",
    initialState,
    reducers: {
        setAlert: (state, action) => {
            state.alerts.push(action.payload);
        },
        removeAlert: (state, action) => {
            state.alerts = state.alerts.filter(
                (alert) => alert.id !== action.payload
            );
        },
    },
});

export const { setAlert, removeAlert } = alertSlice.actions;

export function notify(msg, alertType, timeout = 5000) {
    return async (dispatch) => {
        const id = uuidv4();
        dispatch(setAlert({msg, alertType, id}));
        setTimeout(() => dispatch(removeAlert(id)), timeout);
    };
}

export default alertSlice.reducer;
