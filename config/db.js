const mongoose = require('mongoose');
const config = require('config');
const db = config.get('mongoURI');
require('dotenv').config()

console.log(process.env.MONGO_URI);

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