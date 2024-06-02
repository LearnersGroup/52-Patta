const mongoose = require('mongoose');
require('dotenv').config()

const connetDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected!')
    } catch (error) {
        console.log(error.message);
        process.exit(1);                // exit process with failure;
    }
}

module.exports = connetDB;