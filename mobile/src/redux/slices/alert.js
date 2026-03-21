import { createSlice } from "@reduxjs/toolkit";

let _counter = 0;
const uid = () => `${Date.now()}-${++_counter}`;

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
        const id = uid();
        dispatch(setAlert({msg, alertType, id}));
        setTimeout(() => dispatch(removeAlert(id)), timeout);
    };
}

export default alertSlice.reducer;
