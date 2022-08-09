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
            'cmd': () => this.cmd(payload)
        }
        let fn = null
        try {
            fn = cmds[payload[0]]
        } catch(err) {
            console.log(`invalid message ${JSON.stringify(payload)}`)
            return
        }
        if (fn) fn(payload)
        else console.log(`invalid command ${payload[0]}`)
}

    sendAll(payload) {
        this.connections.forEach(connection => {
            connection.send(payload)
        })
    }

    cmd(payload) {
        if (!this.game) {
            console.log(`CMD when game is not started`)
            return
        }
        let cmd = null
        try {
            cmd = payload[1]
        } catch (err) {
            console.log(`invalid payload ${JSON.stringify(payload)}`)
            return
        }
        if (cmd === "left") this.commands.push([0, "left"])
        else if (cmd === "right") this.commands.push([0, "right"])
        else if (cmd === "spawn") {
            this.commands.push([0, "spawn", 
                Math.floor(Math.random()*this.game.board.width),
                Math.floor(Math.random()*this.game.board.height)])
        } else {
            console.log(`invalid CMD ${cmd}`)
            return
        }
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