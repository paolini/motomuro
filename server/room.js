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
        this.commands = []
        this.last_used = 0
        this.touch()
    }

    touch() {
        this.last_used = (new Date()).getTime()
    }

    unused_time_ms() {
        return (new Date()).getTime() - this.last_used
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
                        connection.send(["quit"])
                        this.hall.send_rooms()
                    }
                return
                }
                if (key === "done") {
                    connection.frame_delay = this.game.frame_count - payload[2]
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

    send_all(payload) {
        this.hall.connections.forEach(connection => {
            if (connection.room && connection.room === this) {
                connection.send(payload)
            }
        })
    }

    start() {
        let timer = null

        let update = () => {
            this.touch()
            this.hall.connections.forEach(connection => {
                if (connection.room && connection.room === this) {
                    connection.send(["update", this.frame_count, 0*connection.frame_delay, this.commands])
                }
            })
            this.game.update(this.commands)
            this.commands = []
            for (let [player_id, player] of this.game.players.entries()) {
                if (player.died) {
                    this.commands.push([player_id, "spawn", 
                        Math.floor(Math.random()*this.game.board.width),
                        Math.floor(Math.random()*this.game.board.height)])
                }
            }
            this.frame_count ++
            if (this.frame_count % this.fps === 0) {
                console.log(`room ${this.id} (${this.name}), ${this.game.players.size} players, frames ${this.frame_count}`)
            }
            if (this.game.players.size === 0) {
                clearInterval(timer)
                this.game = null
                this.hall.send_rooms()
                console.log(`game in room ${this.id} (${this.name}) terminated`)
            }
        }

        this.game = new Game(this.options)
        timer = setInterval(update, 1000 / this.fps)
        this.frame_count = 0
        this.commands = []
        this.hall.connections.forEach(connection => {
            if (connection.room !== this) return
            this.start_player(connection)
        })
        this.send_players()
    }
    
    start_player(connection) {
        connection.player_id = this.game.add_player(connection.player_name)
        connection.send(['start', connection.player_id])
        connection.frame_delay = 0
        console.log(`connection ${connection.id} (${connection.player_name}) started game ${this.id} as player ${connection.player_id}`)
    }

    send_players() {
        this.send_all(["game_players", this.game.get_players()])
    }
}

exports.Room = Room