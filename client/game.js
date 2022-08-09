class Board {
    constructor(width, height) {
        this.width = width
        this.height = height
        this.buffer = []
        this.clear(0)
    }

    set_pix(x, y, value) {
        const addr = y*this.width + x
        this.buffer[addr] = value
    }

    get_pix(x, y) {
        const addr = y*this.width + x
        return this.buffer[addr]
    }

    clear(value) {
        for(let i=0; i<this.width*this.height; ++i) this.buffer[i] = value
    }
}

class Game {
    constructor(options) {
        let width = options['width'] || 30
        let height = options['height'] || 20
        this.board = new Board(width, height)
        this.players = [[5,5,0]]
    }    

    command_right(player) {
        var d = this.players[player][2]
        d++
        if (d==4) d=0
        this.players[player][2] = d
    }

    command_left(player) {
        var d = this.players[player][2]
        d--
        if (d<0) d=3
        this.players[player][2] = d
    }

    update(commands) {
        commands.forEach(([player, cmd]) => {
            if (cmd == "left") this.command_left(player)
            else if (cmd == "right") this.command_right(player)
        });
        this.players = this.players.map(([x, y, d]) => {
            x += [1, 0, -1, 0][d]
            y += [0, 1, 0, -1][d]
            if (x<0) x = this.board.width-1
            else if (x>=this.board.width) x = 0
            if (y<0) y = this.board.height-1
            else if (y>=this.board.height) y = 0
            this.board.set_pix(x, y, 1)
            return [x, y, d]
        })
    }
}

exports.Game = Game
exports.Board = Board