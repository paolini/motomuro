const common = require('../client/game')

class Main {
    constructor() {
        this.timer = null
        this.game = null
        this.connections = []
        this.fps = 0
    }

    add_connection(connection) {
        this.connections.push(connection)
        connection.add_listener((connection,payload) => this.recv(connection, payload))
        if (this.game) {
            const player_id = this.game.players.length
            console.log(`add player_id ${player_id} from connection ${connection.id}`)
            connection.player_id = player_id
            connection.send(['start', 
                player_id,
                this.game.players.length,
                this.game.board.width,
                this.game.board.height
            ])
            connection.send(['board', 
                this.frame_count,
                this.game.players,
                this.game.board.buffer
            ])
            this.sendAll(['add_players', 1])
            this.game.add_players(1)
        }
    }

    sendAll(payload) {
        console.log(`sendAll ${JSON.stringify(payload)}`)
        this.connections.forEach(connection => {
            connection.send(payload)
        })
    }

    recv(connection, payload) {
        if (payload === false) {
            // connection closed!
            this.connections = this.connections.filter(c => (c!==connection))
            return
        }
        let cmd
        try {
            cmd = payload[0]
        } catch(err) {
            console.log(`invalid message ${JSON.stringify(payload)}`)
            return
        }
        if (cmd == 'hello') {
            console.log(`hello from connection`)
        } else if (cmd == 'start') {
            let width, height, fps
            try {
                width = Math.min(1000,Math.max(0, Math.floor(payload[1])))
                height = Math.min(1000,Math.max(0, Math.floor(payload[2])))
                fps = Math.min(60,Math.max(1,Math.floor(payload[3])))
            } catch(err) {
                console.log(`invalid start command ${JSON.stringify(payload)}`)
                return
            }
            this.start(width, height, fps)
        } else if (cmd == 'stop') {
            this.stop()
        } else if (cmd == 'cmd') {
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
            const player_id = connection.player_id
            if (cmd === "left") this.commands.push([player_id, "left"])
            else if (cmd === "right") this.commands.push([player_id, "right"])
            else if (cmd === "spawn") {
                if (this.game.players[player_id][2]<0) {
                    this.commands.push([player_id, "spawn", 
                        Math.floor(Math.random()*this.game.board.width),
                        Math.floor(Math.random()*this.game.board.height)])
                }
            } else {
                console.log(`invalid CMD ${cmd}`)
                return
            }
        } else {
            console.log(`invalid message ${JSON.stringify(payload)}`)
        }
    }

    start(width, height, fps) {
        if (this.game) this.stop()
        this.game = new common.Game({width, height})
        this.fps = fps
        this.timer = setInterval(() => {
            this.update()
        }, 1000 / (parseInt(fps) || 1))
        this.frame_count = 0
        this.commands = []
        const n_players = this.connections.length
        console.log(`starting game with ${n_players} players`)
        this.connections.forEach(connection => {
            const player_id = this.game.players.length
            connection.player_id = player_id
            connection.send(['start', 
                player_id,
                n_players,
                width, height])
            this.game.add_players(1)
        })
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