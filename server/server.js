const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

function generateRoomId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

io.on("connection", socket => {

  socket.on("createRoom", (color) => {
    const roomId = generateRoomId();

    rooms[roomId] = {
      owner: socket.id,
      mode: "lobby",
      players: {}
    };

    rooms[roomId].players[socket.id] = {
      x: 400,
      y: 300,
      color,
      hp: 100
    };

    socket.data.roomId = roomId; // ✅ CLAVE
    socket.join(roomId);

    socket.emit("roomCreated", { roomId, owner: socket.id });
    io.to(roomId).emit("updatePlayers", rooms[roomId].players);
  });

  socket.on("joinRoom", ({ roomId, color }) => {
    if (!rooms[roomId] || Object.keys(rooms[roomId].players).length >= 4) {
      socket.emit("errorMsg", "Sala inválida o llena");
      return;
    }

    rooms[roomId].players[socket.id] = {
      x: 400,
      y: 300,
      color,
      hp: 100
    };

    socket.data.roomId = roomId; // ✅ CLAVE
    socket.join(roomId);

    io.to(roomId).emit("updatePlayers", rooms[roomId].players);
  });

  socket.on("move", ({ x, y }) => {
    const roomId = socket.data.roomId;
    if (!rooms[roomId]?.players[socket.id]) return;

    rooms[roomId].players[socket.id].x = x;
    rooms[roomId].players[socket.id].y = y;

    io.to(roomId).emit("updatePlayers", rooms[roomId].players);
  });

  socket.on("changeColor", ({ color }) => {
    const roomId = socket.data.roomId;
    if (!rooms[roomId]?.players[socket.id]) return;

    rooms[roomId].players[socket.id].color = color;
    io.to(roomId).emit("updatePlayers", rooms[roomId].players);
  });

  socket.on("shoot", ({ targetId, damage }) => {
    const roomId = socket.data.roomId;
    const room = rooms[roomId];
    if (!room || !room.players[targetId]) return;

    room.players[targetId].hp = Math.max(0, room.players[targetId].hp - damage);
    io.to(roomId).emit("updatePlayers", room.players);
  });

  socket.on("startGame", ({ mode }) => {
    const roomId = socket.data.roomId;
    if (rooms[roomId]?.owner === socket.id) {
      rooms[roomId].mode = mode;
      io.to(roomId).emit("gameStarted", mode);
    }
  });

  socket.on("leaveRoom", () => {
    const roomId = socket.data.roomId;
    if (!rooms[roomId]) return;

    delete rooms[roomId].players[socket.id];

    if (Object.keys(rooms[roomId].players).length < 2) {
      delete rooms[roomId];
      io.to(roomId).emit("roomClosed");
    } else {
      io.to(roomId).emit("updatePlayers", rooms[roomId].players);
    }
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!rooms[roomId]) return;

    delete rooms[roomId].players[socket.id];
    io.to(roomId).emit("updatePlayers", rooms[roomId].players);
  });
});

server.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});