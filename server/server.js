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

    socket.data.roomId = roomId;
    socket.join(roomId);

    socket.emit("roomJoined", { roomId, owner: socket.id });
    io.to(roomId).emit("updatePlayers", rooms[roomId].players);
  });

  socket.on("joinRoom", ({ roomId, color }) => {
    if (!rooms[roomId] || Object.keys(rooms[roomId].players).length >= 4) return;

    rooms[roomId].players[socket.id] = {
      x: 400,
      y: 300,
      color,
      hp: 100
    };

    socket.data.roomId = roomId;
    socket.join(roomId);

    socket.emit("roomJoined", {
      roomId,
      owner: rooms[roomId].owner
    });

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