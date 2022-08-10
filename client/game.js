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

class Game {
    constructor(options) {
        let width = options['width'] || 30
        let height = options['height'] || 20
        let n_players = options['n_players'] || 0
        this.board = new Board(width, height)
        this.players = []
        this.add_players(n_players)
    }    
    
    add_players(n) {
        for(let i=0; i<n; ++i) this.players.push([0,0,-1])
    }

    command(cmd) {
        const player_id = cmd[0]
        const verb = cmd[1] 
        let player = this.players[player_id]
        if (player[2] < 0) {
            // not spawned
            if (verb == "spawn") {
                [player[0], player[1], player[2]] = [cmd[2], cmd[3], 4]
            }
        } else if (player[2] < 4) {
            // moving
            if (verb == "right") {
                player[2]++
                if (player[2]==4) player[2]=0
            } else if (verb == "left") {
                player[2]--
                if (player[2]<0) player[2]=3
            }
        }
    }

    update(commands) {
        commands.forEach(payload => this.command(payload))
        let died = []
        this.players = this.players.map(([x, y, d], player_id) => {
            if (d<0) {
                // not spawned                
            } else if (d<4) {
                // moving
                x += [1, 0, -1, 0][d]
                y += [0, 1, 0, -1][d]
                if (x<0) x = this.board.width-1
                else if (x>=this.board.width) x = 0
                if (y<0) y = this.board.height-1
                else if (y>=this.board.height) y = 0
            } else if (d==4) {
                // just spawned
                d = 0
            }
            if (d>=0) {
                if (this.board.get_pix(x, y)) {
                    // die
                    died.push(player_id)
                    console.log(`${player_id} died`)
                    return [0, 0, -1]
                } else {
                    this.board.set_pix(x, y, player_id+1)
                }
            }
            return [x, y, d]
        })
        died.forEach(player_id => this.board.clear_color(player_id+1))
    }
}

exports.Game = Game
exports.Board = Board