import React from "react";
import { useParams, useSearchParams } from "react-router-dom";

const GamePage = () => {
    let params = useParams();
    console.log(params);
    return <div>GamePage-{params.id}</div>;
};

export default GamePage;
