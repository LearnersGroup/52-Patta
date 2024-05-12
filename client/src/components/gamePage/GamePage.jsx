import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { room_leave } from "../../api/apiHandler";

const GamePage = () => {
    let params = useParams();
    console.log(params);
    const navigate = useNavigate();

    const handleLeave = async () => {
        const {status} = await room_leave();
        if(status === 200){
            navigate('/')
        }else{
            alert('Something went wrong while removing player')
        }
    }

    return <div>
        <p>GamePage-{params.id}</p>
        <button onClick={() => navigate('/')}>Home</button>
        <button onClick={() => handleLeave()}>Leave</button>
    </div>;
};

export default GamePage;
