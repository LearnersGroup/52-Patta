import { removeAlert } from "../../redux/slices/alert";
import React, { useContext, useEffect, useState } from "react";
import { useSelector } from "react-redux";

const Alert = () => {
    const {alerts} = useSelector((state) => state.alert);

    return (
        alerts !== null &&
        alerts.length > 0 &&
        alerts.map((alert) => (
            <div key={alert.id} className={`alert ${alert.alertType}`}>
                {alert.msg}
            </div>
        ))
    );
};

export default Alert;
