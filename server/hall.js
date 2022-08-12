const Game = require('../client/game').Game
const Room = require('./room.js').Room
const DEBUG = (process.env.NODE_ENV === 'debug')

class Hall {
    constructor() {
        this.connections = []
        this.rooms = []
        this.next_room_id = 0
    }

    cleaning() {
        this.rooms = this.rooms.filter(room => room.unused_time_ms()<60000)
        this.send_rooms()
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
            if (cmd === "chat") {
                const msg = payload[1]
                console.log(`${connection.id} (${connection.player_name}) says: ${msg}`)
                this.connections.forEach(c => {
                    c.send(['chat', connection.player_name, msg])
                })                
                return
            }
            if (cmd === "join") {
                let id = parseInt(payload[1])
                let room = this.rooms.find(room => room.options.id === id)
                room.touch()
                connection.room = room
                connection.player_id = -1
                connection.send(["join", room.info()])
                console.log(`player ${connection.id} (${connection.player_name}) joined room ${room.id} (${room.name})`)
                if (room.game) {
                    room.start_player(connection)
                    room.send_players()
                    connection.send(['board', room.game.get_board()])
                }
                this.send_rooms()
                return
            }
            if (cmd === "leave") {
                if (connection.room) {
                    const room = connection.room
                    room.touch()
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
