const path = require('path')
const express = require('express')
const morgan = require('morgan')
const ws = require('ws')
const websockets = require('./websockets')
const Game = require('./game').Game

let game = new Game()

const app = express();

const wsServer = new ws.Server({ noServer: true });
wsServer.on('connection', (ws, req, client) => {
  game.add_connection(new websockets.Connection(ws, req, client))
});
  

app.use(morgan('tiny'));
app.use(express.static('client'));

// app.use('/api/v0', require('./api').router)

const PORT = parseInt(process.env.PORT || "8000");
const server = app.listen(PORT);
server.on('upgrade', (request, socket, head) => {
    wsServer.handleUpgrade(request, socket, head, socket => {
      wsServer.emit('connection', socket, request);
    });
  });

console.log(`server started: http://localhost:${PORT}`);

