const mongoose = require('mongoose');
const config = require('config');
const db = config.get('mongoURI');

const connetDB = async () => {
    try {
        await mongoose.connect(db);

        console.log('MongoDB Connected!')
    } catch (error) {
        console.log(error.message);
        process.exit(1);                // exit process with failure;
    }
}

module.exports = connetDB;