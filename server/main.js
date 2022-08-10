const common = require('../client/game')

class Room extends common.Game {
    constructor(options) {
        super(options)
    }
}

class Hall {
    constructor() {
        this.connections = []
        this.rooms = []
        this.next_room_id = 0
    }

    add_connection(connection) {
        this.connections.push(connection)
        connection.add_listener((connection,payload) => this.recv(connection, payload))
        connection.player_name = "<anonymous>"
        this.send_players()
        this.send_rooms()
    }

    send_players() {
        const payload = ["players", 
            this.connections.map(connection => [connection.id, connection.player_name])]
        this.connections.forEach(connection => connection.send(payload))
    }

    send_rooms() {
        const payload = ["rooms",
            this.rooms.map(room => [room.id, room.options])]
        this.connections.forEach(connection => connection.send(payload))
    }

    recv(connection, payload) {
        if (payload === false) {
            // connection closed!
            if (connection.room) {
                connection.room.remove_player(connection.player_id)
            }
            this.connections = this.connections.filter(c => (c!==connection))
            this.send_players()
            this.send_rooms()
            return
        }
        let cmd
        try {
            cmd = payload[0]
        } catch(err) {
            console.log(`invalid message ${JSON.stringify(payload)}`)
            return
        }
        if (cmd === "set_name") {
            let name
            try {
                name = payload[1]
            } catch {
                console.log(`invalid command ${JSON.stringify(payload)}`)
                return
            }
            this.connections.forEach(c => {
                if (c === connection) {
                    connection.player_name = name
                }
            })
            this.send_players()
        } if (cmd === "new_room") {
            let name, width, height, fps
            try {
                name = payload[1]
                width = Math.min(1000,Math.max(0, Math.floor(payload[1])))
                height = Math.min(1000,Math.max(0, Math.floor(payload[2])))
                fps = Math.min(60,Math.max(1,Math.floor(payload[3])))
            } catch {
                console.log(`invalid command ${JSON.stringify(payload)}`)
                return
            }
            const id = this.next_room_id++
            if (name === "") name = `game #${id}`
            this.rooms.push(new Room({ name, width, height, fps, id}))
            this.send_rooms()
            connection.send(["room_ready", id])
        } else if (cmd === "join") {
            let room
            try {
                let id = parseInt(payload[1])
                room = this.rooms.find(room => room.options.id === id)
            } catch {
                console.log(`invalid cmd ${JSON.stringify(payload)}`)
                return
            }
            if (connection.room) {
                connection.room.remove_player(connection.player_id)
            }
            const player = [0, 0, -1, connection.player_name]
            connection.player_id = room.add_player(player)
            connection.room = room
            connection.send([ "game", room.options, connection.player_id, room.players ])
            this.connections.forEach(c => {
                if (c.room === connection.room && c != connection) {
                    c.send([ "add_player", player ])
                }
            })
            this.send_rooms()
        } else if (cmd === "leave") {
            if (connection.room) {
                connection.room.remove_player(connection.player_id)
                connection.room = null
                connection.player_id = -1
                this.send_rooms()
            }
        } else {
            console.log(`invalid command ${cmd}`)
        }
    }
}

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
        if (cmd == 'start') {
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
exports.Hall = Hall