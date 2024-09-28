const mongoose = require('mongoose');
require('dotenv').config()

const connetDB = async () => {
    try {
        const dbName = process.env.MONGO_DB_NAME;
        const username = process.env.MONGO_USERNAME;
        const password = process.env.MONGO_PASSWORD;
        const encodedHost = process.env.MONGO_HOST;
        const host = decodeURIComponent(encodedHost);
        
        await mongoose.connect(host, {
            dbName: dbName,
            user: username,
            pass: password,
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB Connected!')
    } catch (error) {
        console.log(error.message);
        process.exit(1);                // exit process with failure;
    }
}

module.exports = connetDB;