const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// 在线用户列表
let onlineUsers = new Map();

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 用户加入
  socket.on('join', (username) => {
    onlineUsers.set(socket.id, {
      id: socket.id,
      name: username || '匿名用户',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${socket.id}`
    });
    
    // 通知所有人有新用户加入
    io.emit('userJoined', {
      user: onlineUsers.get(socket.id),
      count: onlineUsers.size,
      users: Array.from(onlineUsers.values())
    });
  });

  // 接收并广播消息
  socket.on('chatMessage', (data) => {
    const user = onlineUsers.get(socket.id);
    if (!user) return;
    
    io.emit('message', {
      id: Date.now(),
      user: user,
      text: data.text,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    });
  });

  // 用户正在输入
  socket.on('typing', (isTyping) => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('typing', { user: user, isTyping });
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    
    if (user) {
      io.emit('userLeft', {
        user: user,
        count: onlineUsers.size,
        users: Array.from(onlineUsers.values())
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 聊天服务器运行在端口 ${PORT}`);
});
