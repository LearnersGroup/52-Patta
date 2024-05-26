import React, { useContext, useEffect, useState } from "react";
import { ConnectionState } from "../websocket/ConnectionState";
import { Events } from "../websocket/Events";
import { ConnectionManager } from "../websocket/ConnectionManager";
import { MyForm } from "../websocket/MyForm";
import { socket } from "../../socket";
import { useAuth } from "../hooks/useAuth";
import { get_all_rooms, removeAuthToken } from "../../api/apiHandler";
import AllGameRooms from "./AllGameRooms/AllGameRooms";
import { WsSendUserName } from "../../api/wsEmitters";
import { Sq } from "@letele/playing-cards";
import { useDispatch, useSelector } from "react-redux";
import { notify, setAlert } from "../../redux/slices/alert";

const HomePage = () => {
    const dispatch = useDispatch();
    //hooks
    const { logout, user } = useAuth();
    //other state
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [fooEvents, setFooEvents] = useState([]);

    const handleLogout = () => {
        removeAuthToken();
        logout();
    };

    const handleClick = () => {
        notify("test", "success", 100000)(dispatch)
    };

    //websocket logic
    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        function onFooEvent(value) {
            setFooEvents((previous) => [...previous, value]);
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("message", onFooEvent);
        WsSendUserName(user.user_name);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("message", onFooEvent);
        };
    }, []);

    return (
        <div className="home-page">
            <h1 className="title">HomePage</h1>
            <p>Current User - {user.user_name}</p>
            <button onClick={handleLogout}>Logout</button>
            <button onClick={handleClick}>Alert</button>
            <AllGameRooms />
            <Sq style={{ height: "100px", width: "100px" }} />
            <div className="webhooks">
                <ConnectionState isConnected={isConnected} />
                <Events events={fooEvents} />
                <ConnectionManager />
                <MyForm />
            </div>
        </div>
    );
};

export default HomePage;
