const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

io.on("connection", socket => {
  console.log("Jugador conectado:", socket.id);

  socket.on("createRoom", roomId => {
    rooms[roomId] = {};
    rooms[roomId][socket.id] = {
      x: 100,
      y: 100,
      color: "#00ff00",
      hp: 100
    };

    socket.data.roomId = roomId; // ✅ CLAVE
    socket.join(roomId);

    io.to(roomId).emit("updatePlayers", rooms[roomId]);
  });

  socket.on("joinRoom", roomId => {
    if (!rooms[roomId]) return;

    rooms[roomId][socket.id] = {
      x: 300,
      y: 300,
      color: "#ff0000",
      hp: 100
    };

    socket.data.roomId = roomId; // ✅ CLAVE
    socket.join(roomId);

    io.to(roomId).emit("updatePlayers", rooms[roomId]);
  });

  socket.on("move", data => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms[roomId]) return;

    const player = rooms[roomId][socket.id];
    if (!player) return;

    player.x = data.x;
    player.y = data.y;

    io.to(roomId).emit("updatePlayers", rooms[roomId]);
  });

  socket.on("changeColor", data => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms[roomId]) return;

    const player = rooms[roomId][socket.id];
    if (!player) return;

    player.color = data.color;

    io.to(roomId).emit("updatePlayers", rooms[roomId]);
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms[roomId]) return;

    delete rooms[roomId][socket.id];

    io.to(roomId).emit("updatePlayers", rooms[roomId]);
  });
});

server.listen(3000, () => {
  console.log("Servidor activo en puerto 3000");
});