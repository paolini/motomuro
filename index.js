class Board {
    constructor(canvas, width, height) {
        this.width = width
        this.height = height
        this.pix_x = Math.floor(Math.min(canvas.width / width, canvas.height / height))
        this.pix_y = this.pix_x
        this.off_x = (canvas.width - this.pix_x*width) / 2
        this.off_y = (canvas.height - this.pix_y*height) / 2
        this.ctx = canvas.getContext("2d")
        this.buffer = []
        this.queue = []
        this.palette = ["black", "white", "red", "green"]
        this.clear(0)
    }

    set_pix(x, y, value) {
        const addr = y*this.width + x
        if (this.buffer[addr] != value) {
            this.queue.push([x, y, value])
            this.buffer[addr] = value
        }
    }

    get_pix(x, y) {
        const addr = y*this.width + x
        return this.buffer[addr]
    }

    clear(value) {
        this.queue.length = 0
        this.queue.push([-1,-1,value])
        for(let i=0; i<this.width*this.height; ++i) this.buffer[i] = value
    }

    draw() {
        const ctx = this.ctx
        this.queue.forEach(([x, y, value]) => {
            ctx.fillStyle = this.palette[value]
            if (x == -1) { // clear
                ctx.beginPath()
                ctx.moveTo(this.off_x, this.off_y)
                ctx.lineTo(this.off_x + this.pix_x*this.width, this.off_y)
                ctx.lineTo(this.off_x + this.pix_x*this.width, this.off_y + this.pix_y*this.height)
                ctx.lineTo(this.off_x, this.off_y + this.pix_y*this.height)
                ctx.closePath()
                ctx.fill()
            } else {
                ctx.beginPath()
                const pix_x = this.off_x + this.pix_x*x
                const pix_y = this.off_y + this.pix_y*y
                ctx.moveTo(pix_x, pix_y)
                ctx.lineTo(pix_x + this.pix_x, pix_y)
                ctx.lineTo(pix_x + this.pix_x, pix_y + this.pix_y)
                ctx.lineTo(pix_x, pix_y + this.pix_y)
                ctx.closePath()
                ctx.fill()
            }
        })
        this.queue.length = 0
    }
}

class Game {
    constructor(canvas_id) {
        this.canvas = document.getElementById(canvas_id)
        this.board = new Board(canvas, 30, 20)
        this.players = [[5,5,0]] // [ [x, y, dir]]
    }    

    update() {
        this.players = this.players.map(([x, y, d]) => {
            x += [1, 0, -1, 0][d]
            y += [0, 1, 0, -1][d]
            if (x<0) x = this.board.width
            else if (x>=this.board.width) x = 0
            if (y<0) y = this.board.height
            else if (y>=this.board.height) y = 0
            this.board.set_pix(x, y, 1)
            return [x, y, d]
        })
    }

    draw() {
        this.board.draw()
    }
}

const game = new Game("canvas")
game.draw()
setInterval(() => {
    game.update()
    game.draw()
}, 500)