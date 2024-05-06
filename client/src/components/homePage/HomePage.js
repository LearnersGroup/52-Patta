import React, { useEffect, useState } from "react";
import { ConnectionState } from "../websocket/ConnectionState";
import { Events } from "../websocket/Events";
import { ConnectionManager } from "../websocket/ConnectionManager";
import { MyForm } from "../websocket/MyForm";
import { socket } from "../../socket";
import { useAuth } from "../hooks/useAuth";

const HomePage = () => {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [fooEvents, setFooEvents] = useState([]);
    const { logout } = useAuth();

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

    const handleLogout = () => {
        logout();
    };

    return (
        <div>
            <h1>HomePage</h1>
            <ConnectionState isConnected={isConnected} />
            <Events events={fooEvents} />
            <ConnectionManager />
            <MyForm />
        </div>
    );
};

export default HomePage;
