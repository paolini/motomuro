const path = require('path')
const express = require('express')
const morgan = require('morgan')
const ws = require('ws')
const Connection = require('./connection').Connection
const Hall = require('./hall').Hall

let hall = new Hall()
setInterval(() => {
  hall.cleaning()
}, 60000)

const app = express();

const wsServer = new ws.Server({ noServer: true });
wsServer.on('connection', (ws, req, client) => {
  hall.add_connection(new Connection(ws, req, client))
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
console.log(`MOTOMURO (manu-fatto) 2022`)
console.log(`server started: http://localhost:${PORT}`);

