const express = require('express');
const connectDB = require('./config/db');

const app = express();

// Connect DB
connectDB();

// Init Middleware
app.use(express.json({ extended: false }))

app.get('/', (req,res)=> res.send('API running'));

//define routes
app.use('/api/users', require('./routes/api/users'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/game-auth', require('./routes/api/game-auth'));
app.use('/api/games', require('./routes/api/games'));
app.use('/api/mygame', require('./routes/api/mygame'));

const PORT = process.env.PORT || 4000;

app.listen(PORT, ()=> console.log(`server started on port ${PORT}`));