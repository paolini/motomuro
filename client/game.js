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

class Player {
    constructor(name, id) {
        this.id = id
        this.name = name
        this.died = true
        this.x = 0
        this.y = 0
        this.d = 0
    }

    get_state() {
        return [this.died, this.x, this.y, this.d]
    }

    set_state(state) {
        this.died = state[0]
        this.x = state[1]
        this.y = state[2]
        this.d = state[3]
        this.quit = state[4]
    }
}

class Game {
    constructor(options) {
        console.log(`create game ${JSON.stringify(options)}`)
        let width = options['width'] || 30
        let height = options['height'] || 20
        this.board = new Board(width, height)
        this.players = new Map()
        this.frame_count = 0
        this.next_id = 1
    }    
    
    add_player(name) {
        const player_id = this.next_id++
        this.players.set(player_id, new Player(name, player_id))
        return player_id
    }

    get_players() {
        // serialize
        return Array.from(this.players.entries()).map(([id,player]) => [id, player.get_state()])
    }

    set_players(state) {
        // unserialize
        state.forEach(([id, player_state]) => {
            this.players.get(id).set_state(player_state)
        })
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
            if (this.board.get_pix(player.x, player.y)) {
                // die
                died_ids.push(player_id)
                console.log(`${player_id} died`)
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