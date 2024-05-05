const express = require('express');
const connectDB = require('./config/db');

const app = express();

// Connect DB
connectDB();

// Init Middleware
app.use(express.json({ extended: false }))

app.get('/', (req,res)=> res.send('API running'));

//define routes
app.use('/api/users', require('./routes/api/users'));               //create user
app.use('/api/auth', require('./routes/api/auth'));                 //auth user
app.use('/api/games', require('./routes/api/games'));               //create game-room
app.use('/api/game-rooms', require('./routes/api/game-rooms'));     //
app.use('/api/mygame', require('./routes/api/mygame'));

const PORT = process.env.PORT || 4000;

app.listen(PORT, ()=> console.log(`server started on port ${PORT}`));