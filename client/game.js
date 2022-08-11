"strict"

class Board {
    constructor(width, height) {
        this.width = width
        this.height = height
        this.buffer = []
        this.clear()
    }

    set_pix(x, y, value) {
        const addr = y*this.width + x
        this.buffer[addr] = value
    }

    get_pix(x, y) {
        const addr = y*this.width + x
        return this.buffer[addr]
    }

    clear() {
        for(let i=0; i<this.width*this.height; ++i) this.buffer[i] = 0
    }

    clear_color(value) {
        for(let i=0; i<this.width*this.height; ++i) {
            if (this.buffer[i] == value) this.buffer[i] = 0
        }
    }

}

function new_player(options) {
    return {
        name: "<anonymous>",
        died: true,
        x: 0,
        y: 0,
        d: 0,
        score: 0,
        ...options
    }
}

class Game {
    constructor(options) {
        let width = options['width'] || 30
        let height = options['height'] || 20
        this.board = new Board(width, height)
        this.players = new Map()
        this.frame_count = 0
        this.next_id = 1
        this.on_quit = (() => null)
    }    
    
    add_player(name) {
        const player_id = this.next_id++
        this.players.set(player_id, new_player({name, player_id}))
        return player_id
    }

    get_players() {
        // serialize
        return Array.from(this.players.entries())
    }

    set_players(state) {
        // unserialize
        this.players = new Map()
        state.forEach(([id, player]) => {
            this.players.set(id, player)
        })
    }

    get_board() {
        return [this.frame_count,
            this.next_id,
            this.get_players(),
            this.board.buffer]
    }

    set_board(payload) {
        this.frame_count = payload[0]
        this.next_id = payload[1]
        this.set_players(payload[2])
        this.board.buffer = payload[3]
    }

    remove_player(player_id) {
        this.board.clear_color(player_id)
        this.players.delete(player_id)
    }

    command(cmd) {
        const player_id = cmd[0]
        const verb = cmd[1] 
        let player = this.players.get(player_id)
        if (verb == "right") {
            player.d++
            if (player.d==4) player.d=0
            return
        } 
        if (verb == "left") {
            player.d--
            if (player.d<0) player.d=3
            return
        } 
        if (verb == "spawn") {
            player.died = false
            player.x = cmd[2]
            player.y = cmd[3]
            player.d = 4
            return
        }
        if (verb == "quit") {
            this.remove_player(player_id)
            this.on_quit(player_id)
            return
        }
        throw(`invalid command ${JSON.stringify(cmd)}`)
    }

    update(commands) {
        this.frame_count ++
        commands.forEach(payload => this.command(payload))
        let died_ids = []
        for (let [player_id, player] of this.players) {
            if (player.died) return
            if (player.d < 4) {
                // moving
                player.x += [1, 0, -1, 0][player.d]
                player.y += [0, 1, 0, -1][player.d]
                if (player.x<0) player.x = this.board.width-1
                else if (player.x>=this.board.width) player.x = 0
                if (player.y<0) player.y = this.board.height-1
                else if (player.y>=this.board.height) player.y = 0
            } else {
                // just spawned
                player.d = 0
            }
            const pix_id = this.board.get_pix(player.x, player.y)
            if (pix_id !== 0) {
                // die
                if (pix_id !== player_id) {
                    this.players.get(pix_id).score += 1
                }
                player.score -= 1
                died_ids.push(player_id)
                player.died = true
            } else {
                this.board.set_pix(player.x, player.y, player_id)
            }
        }
        died_ids.forEach(player_id => this.board.clear_color(player_id))
    }
}

exports.Game = Game
exports.Board = Board