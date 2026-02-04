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
      players: {}
    };

    rooms[roomId].players[socket.id] = {
      x: 300,
      y: 300,
      color,
      hp: 100
    };

    socket.join(roomId);
    socket.emit("roomCreated", roomId);
  });

  socket.on("joinRoom", ({ roomId, color }) => {
    if (!rooms[roomId] || Object.keys(rooms[roomId].players).length >= 4) {
      socket.emit("errorMsg", "Sala inválida o llena");
      return;
    }

    rooms[roomId].players[socket.id] = {
      x: 300,
      y: 300,
      color,
      hp: 100
    };

    socket.join(roomId);
    io.to(roomId).emit("updatePlayers", rooms[roomId].players);
  });

  socket.on("move", ({ roomId, x, y }) => {
    if (rooms[roomId]) {
      rooms[roomId].players[socket.id].x = x;
      rooms[roomId].players[socket.id].y = y;
      io.to(roomId).emit("updatePlayers", rooms[roomId].players);
    }
  });

  socket.on("leaveRoom", (roomId) => {
    if (rooms[roomId]) {
      delete rooms[roomId].players[socket.id];

      if (Object.keys(rooms[roomId].players).length < 2) {
        delete rooms[roomId];
        io.to(roomId).emit("roomClosed");
      } else {
        io.to(roomId).emit("updatePlayers", rooms[roomId].players);
      }
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      if (rooms[roomId].players[socket.id]) {
        delete rooms[roomId].players[socket.id];
        if (Object.keys(rooms[roomId].players).length < 2) {
          delete rooms[roomId];
          io.to(roomId).emit("roomClosed");
        }
      }
    }
  });

});

server.listen(3000, () => {
  console.log("Servidor en http://localhost:3000");
});
