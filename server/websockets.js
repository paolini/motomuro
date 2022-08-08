var next_connection_id = 1
var connections = []

class Connection {
    constructor(ws, req, client) {
        this.id = next_connection_id++
        this.ws = ws
        this.client = client
        this.alive = true

        this.ws.send(`CON ${this.id}`)
        this.ws.on('message', msg => this.recv(msg))
        this.ws.on('close', () => this.close())
        this.heart_beat = setInterval(() => this.ping(), 10000)

        connections.push(this)
    }

    recv(msg) {
        this.ws.send(`ERR cannot understand message: ${msg}`)
        console.log(`${this.id} invalid message: ${msg}`)
    }

    ping() {
        if (this.alive) {
            this.alive = false
            console.log(`${this.id} PING`)
            this.ws.ping(() => {
                console.log(`${this.id} PONG`)
                this.alive = true
            });
        } else {
            this.close()
        }
    }

    close() {
        clearInterval(this.heart_beat)
        connections = connections.filter(c => (c !== this))
        this.ws.close()
        console.log(`${this.id} CONNECTION CLOSED`)
    }
}

function new_connection(ws, req, client) {
    new Connection(ws, client)
}

exports.Connection = Connection
