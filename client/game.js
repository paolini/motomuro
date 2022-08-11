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
        this.quit = false
    }

    get_state() {
        return [this.died, this.x, this.y, this.d, this.quit]
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
        this.players = []
        this.frame_count = 0
    }    
    
    add_player(name) {
        const id = this.players.length
        this.players.push(new Player(name, id))
        return id
    }

    remove_player(player_id) {
        this.players[player_id].quit = true
    }

    command(cmd) {
        const player_id = cmd[0]
        const verb = cmd[1] 
        let player = this.players[player_id]
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
            if (!player.quit) {
                player.died = true
                player.quit = true
            }
            return
        }
        throw(`invalid command ${JSON.stringify(cmd)}`)
    }

    update(commands) {
        this.frame_count ++
        commands.forEach(payload => this.command(payload))
        let died = []
        this.players.forEach(player => {
            if (player.quit) return
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
                died.push(player)
                console.log(`${player.id} died`)
                player.died = true
            } else {
                this.board.set_pix(player.x, player.y, player.id+1)
            }
        })
        died.forEach(player => this.board.clear_color(player.id + 1))
    }
}

exports.Game = Game
exports.Board = Board