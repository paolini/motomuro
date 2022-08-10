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
        this.send(["hello", this.id])
        if (false) {
            this.heart_beat = setInterval(() => this.ping(), 10000)
        }
    }

    add_listener(callback) {
        this.listeners.push(callback)        
    }

    remove_listener(callback) {
        this.listeners = this.listeners.filter(cb => (cb !== callback))
    }

    send(payload) {
        console.log(`send to ${this.id} msg ${JSON.stringify(payload)}`)
        this.ws.send(JSON.stringify(payload))
    }

    recv(msg) {
        console.log(`${this.id} message: ${msg}`)
        let cmd, payload
        try {
            payload = JSON.parse(msg)
            cmd = payload[0]
        } catch(err) {
            console.log(`connection ${this.id} invalid msg: ${msg}`)
            return
        }
        if (cmd === 'hello') {
            console.log(`hello from connection ${this.id}`)
            return // listeners are not interested
        }
        this.listeners.forEach(cb => cb(this, payload))
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
        this.listeners.forEach(cb => cb(this, false))
    }
}

exports.Connection = Connection
