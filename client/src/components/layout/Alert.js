import { removeAlert } from "../../redux/slices/alert";
import React, { useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

const Alert = () => {
    const {alerts} = useSelector((state) => state.alert);
    const dispatch = useDispatch();
    
    const handleClose = (alert) => {
        dispatch(removeAlert(alert))
    }

    return (
        alerts !== null &&
        alerts.length > 0 &&
        alerts.map((alert) => (
            <div key={alert.id} className={`alert ${alert.alertType}`}>
                {alert.msg}
                <button onClick={() => handleClose(alert.id)}>x</button>
            </div>
        ))
    );
};

export default Alert;
