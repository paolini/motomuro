const Game = require('../client/game').Game
const DEBUG = (process.env.NODE_ENV === 'debug')

class Room {
    constructor(hall, options) {
        this.options = options
        this.hall = hall
        this.id = options.id
        this.fps = options.fps || 20
        this.name = options.name || "<room>"
        this.game = null
        this.timer = null
        this.commands = []
    }

    info() {
        return {
            'id': this.id, 
            'name': this.name,
            'width': this.options.width, 
            'height': this.options.height, 
            'fps': this.fps,
            'n_players': this.hall.connections.filter(c => c.room === this).length,
            'running': (this.game !== null)
         }
    }

    recv(connection, payload) {
        let cmd
        try {
            cmd = payload[0]
            if (cmd === "cmd") {
                let key = payload[1]
                if (key === "left" || key === "right" || key === "quit") {
                    this.commands.push([connection.player_id, key])
                    if (key === "quit") {
                        connection.room = null
                        connection.player_id = -1
                        this.hall.send_rooms()
                    }
                return
                }
            }
        } catch(err) {
            if (DEBUG) throw(err)
            console.error(err)
        }
        console.log(`invalid message ${JSON.stringify(payload)}`)
        if (DEBUG) throw("halting for DEBUG")
    }

    send_all_running(payload) {
//        console.log(`sendAll room ${this.id} msg ${JSON.stringify(payload)}`)
        this.hall.connections.forEach(connection => {
            if (connection.room && connection.room.game 
                && connection.room === this) connection.send(payload)
        })
    }

    start() {
        this.game = new Game(this.options)
        this.timer = setInterval(() => {
            this.update()
        }, 1000 / this.fps)
        this.frame_count = 0
        this.commands = []
        this.hall.connections.forEach(connection => {
            if (connection.room !== this) return
            this.start_player(connection)
        })
    }

    start_player(connection) {
        connection.player_id = this.game.add_player(connection.player_name)
        connection.send(['start', connection.player_id])

        // add players already in game
        this.game.players.forEach((player, id) => {
            connection.send(['add_player', player.name])
        })

        console.log(`player ${connection.id} (${connection.player_name}) started game ${this.id} as player ${connection.player_id}`)

        // notify other players
        this.hall.connections.forEach(c => {
            if (c.room !== this) return // not in this room
            if (c.player_id < 0) return // not yet added to play
            if (c === connection) return // already notified
            c.send(['add_player', connection.player_name])
        })
    }

    update() {
        const payload = ["update", this.frame_count, this.commands]
        this.commands = []
        this.send_all_running(payload)
        this.game.update(payload[2])
        this.game.players.forEach(player => {
            if (player.died && !player.quit) {
                this.commands.push([player.id, "spawn", 
                    Math.floor(Math.random()*this.game.board.width),
                    Math.floor(Math.random()*this.game.board.height)])
            }
        })
        this.frame_count ++
    }

}

class Hall {
    constructor() {
        this.connections = []
        this.rooms = []
        this.next_room_id = 0
    }

    add_connection(connection) {
        console.log(`${Date()}`)
        console.log(`new connection ${connection.id}`)
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
            this.rooms.map(room => room.info())]
        this.connections.forEach(connection => connection.send(payload))
    }

    recv(connection, payload) {
        if (payload === false) {
            // connection closed!
            if (connection.room && connection.room.game) {
                connection.room.game.remove_player(connection.player_id)
                connection.room.commands.push([connection.player_id, "quit"])
            }
            connection.room = null
            this.connections = this.connections.filter(c => (c!==connection))
            this.send_players()
            this.send_rooms()
            console.log(`connection ${connection.id} (${connection.player_name}) closed`)
            return
        }

        if (connection.room && connection.room.game) return connection.room.recv(connection, payload)

        console.log(`${Date()} ${connection.id} (${connection.player_name}) ${JSON.stringify(payload)}`)

        try {
            let cmd = payload[0]
            if (cmd === "set_name") {
                let name = payload[1]
                connection.player_name = name
                this.send_players()
                console.log(`connection ${connection.id} set name "${connection.player_name}"`)
                return
            } 
            if (cmd === "new_room") {
                let name = payload[1]
                let width = Math.min(1000,Math.max(0, Math.floor(payload[2])))
                let height = Math.min(1000,Math.max(0, Math.floor(payload[3])))
                let fps = Math.min(60,Math.max(1,Math.floor(payload[4])))
                const id = this.next_room_id++
                if (name === "") name = `game #${id}`
                const room = new Room(this, { id, name, width, height, fps })
                this.rooms.push(room)
                this.send_rooms()
                connection.send(["room_ready", id])
                console.log(`new room ${room.id} (${room.name})`)
                return
            } 
            if (cmd === "join") {
                let id = parseInt(payload[1])
                let room = this.rooms.find(room => room.options.id === id)
                connection.room = room
                connection.player_id = -1
                connection.send(["join", room.info()])
                console.log(`player ${connection.id} (${connection.player_name}) joined room ${room.id} (${room.name})`)
                if (room.game) {
                    room.start_player(connection)
                    connection.send(['board', 
                        room.game.frame_count, 
                        room.game.players.map(player => player.get_state()),
                        room.game.board.buffer
                    ])
                }
                this.send_rooms()
                return
            }
            if (cmd === "leave") {
                if (connection.room) {
                    const room = connection.room
                    connection.room = null
                    connection.player_id = -1
                    this.send_rooms()
                    console.log(`player ${connection.id} (${connection.player_name}) left room ${room.id} (${room.name})`)
                    return
                }
            }
            if (cmd === "play") {
                if (connection.room) {
                    connection.room.start()
                    console.log(`player ${connection.id} (${connection.player_name}) started game`)
                    return
                }
            }
        } catch(err) {
            if (DEBUG) {
                throw(err)
            } else {
                console.error(err)
            }
        }
        console.log(`invalid msg ${JSON.stringify(payload)}`)
        if (DEBUG) throw(`halting for DEBUG`)
    }
}

exports.Hall = Hall