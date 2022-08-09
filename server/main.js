const common = require('../client/game')

class Main {
    constructor() {
        this.timer = null
        this.game = null
        this.connections = []
    }

    add_connection(connection) {
        this.connections.push(connection)
        connection.add_listener(payload => this.recv(payload))
    }

    recv(payload) {
        const cmds = {
            'hello': () => console.log(`hello from connection`),
            'start': () => this.start(payload),
            'stop': () => this.stop(),
            'cmd': (payload) => this.commands.push([0, payload[1]])
        }
        let fn = cmds[payload[0]]
        if (fn) fn(payload)
        else console.log(`invalid command ${payload[0]}`)
    }

    sendAll(payload) {
        this.connections.forEach(connection => {
            connection.send(payload)
        })
    }

    start(payload) {
        if (this.game) this.stop()
        this.game = new common.Game(payload[1])
        this.timer = setInterval(() => {
            this.update()
        }, 1000 / (parseInt(payload[1]['fps']) || 1))
        this.frame_count = 0
        console.log(`sendAll: ${JSON.stringify(payload)}`)
        this.sendAll(payload)
        this.commands = []
    }

    stop() {
        this.sendAll(["stop"])
        clearInterval(this.timer)
        this.timer = null
        this.game = null
    }

    update() {
        const payload = ["update", this.frame_count, this.commands]
        this.commands = []
        this.sendAll(payload)
        this.game.update(payload[2])
        this.frame_count ++
    }
}

exports.Main = Main