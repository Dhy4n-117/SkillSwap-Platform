const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Connect Database
connectDB();

// Init Middleware
app.use(express.json({ extended: false }));
app.use(cors());

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/skills', require('./routes/skills'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/messages', require('./routes/messages'));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../client')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Socket.io logic
const Message = require('./models/Message');

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join', (room) => {
    socket.join(room);
    console.log('User joined room:', room);
  });

  socket.on('sendMessage', async ({ sender, receiver, text, conversationId }) => {
    try {
      const newMessage = new Message({ sender, receiver, text, conversationId });
      await newMessage.save();
      io.to(conversationId).emit('message', newMessage);
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
