import React, { useEffect, useState } from "react";
import { ConnectionState } from "../websocket/ConnectionState";
import { Events } from "../websocket/Events";
import { ConnectionManager } from "../websocket/ConnectionManager";
import { MyForm } from "../websocket/MyForm";
import { socket } from "../../socket";
import { useAuth } from "../hooks/useAuth";
import { useQuery } from "react-query";
import { get_all_rooms, removeAuthToken } from "../../api/apiHandler";
import AllGameRooms from "./AllGameRooms/AllGameRooms";

const HomePage = () => {
    //hooks
    const { logout } = useAuth();
    //other state
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [fooEvents, setFooEvents] = useState([]);

    const handleLogout = () => {
        removeAuthToken();
        logout();
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
            console.log(value);
            setFooEvents((previous) => [...previous, value]);
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("message", onFooEvent);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("message", onFooEvent);
        };
    }, []);

    return (
        <div className="home-page">
            <h1 className="title">HomePage</h1>
            <button onClick={handleLogout}>Logout</button>
            <AllGameRooms/>
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
