var next_connection_id = 1

class Connection {
    constructor(ws, req, client) {
        this.id = next_connection_id++
        this.ws = ws
        this.client = client
        this.alive = true
        this.listeners = []
        this.ws.on('message', msg => this.recv(msg))
        this.ws.on('close', () => this.close())
        this.send(["hello"])
        this.heart_beat = setInterval(() => this.ping(), 10000)
    }

    add_listener(callback) {
        this.listeners.push(callback)        
    }

    send(payload) {
        this.ws.send(JSON.stringify(payload))
    }

    recv(msg) {
        console.log(`${this.id} message: ${msg}`)
        const payload = JSON.parse(msg)
        this.listeners.forEach(cb => cb(payload))
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
        this.ws.close()
        console.log(`${this.id} CONNECTION CLOSED`)
    }
}

exports.Connection = Connection
