class Main {
    constructor() {
        this.$canvas = document.getElementById("canvas")
        this.$connection = document.getElementById("connection")
        document.getElementById("start").onclick = (evt => this.send(["start", {
            width: 100,
            height: 100,
            fps: 20
        }]))
        document.getElementById("stop").onclick = (evt => this.send(["stop"]))
        this.socket = null
        this.connect()

        document.onkeydown = evt => {
            if (!this.socket) return
            if (evt.key == "o") this.send(["cmd", "left"])
            else if (evt.key == "p") this.send(["cmd", "right"])
            else if (evt.key == "ArrowLeft") {
                if (this.game.players[0][2]==1) this.send(["cmd", "right"])
                if (this.game.players[0][2]==3) this.send(["cmd", "left"])                
            } else if (evt.key == "ArrowRight") {
                if (this.game.players[0][2]==3) this.send(["cmd", "right"])
                if (this.game.players[0][2]==1) this.send(["cmd", "left"])                
            } else if (evt.key == "ArrowUp") {
                if (this.game.players[0][2]==2) this.send(["cmd", "right"])
                if (this.game.players[0][2]==0) this.send(["cmd", "left"])                
            } else if (evt.key == "ArrowDown") {
                if (this.game.players[0][2]==0) this.send(["cmd", "right"])
                if (this.game.players[0][2]==2) this.send(["cmd", "left"])                
            }
        }
    }
    
    connect() {
        this.$connection.textContent = "connecting..."
        this.socket = new WebSocket('ws://localhost:8000');

        // Connection opened
        this.socket.addEventListener('open', event => {
            this.send(['hello']);
            this.$connection.textContent = "connected"
        })

        this.socket.addEventListener('close', event => {
            this.$connection.textContent = "disconnected"
            setTimeout(() => this.connect(), 5000)
        })

        // Listen for messages
        this.socket.addEventListener('message', event => { this.recv(event.data) })
    }

    send(payload) {
        this.socket.send(JSON.stringify(payload))
    }

    recv(msg) {
        const payload = JSON.parse(msg)
        const cmd = payload[0]
        if (cmd == "hello") {
            console.log("server said hello")
        } else if (cmd == "start") {
            this.start(payload[1])
        } else if (cmd == "stop") {
            this.stop()
        } else if (cmd == "update") {
            console.log(`frame ${payload[1]}`)
            this.game.update(payload[2])
            this.draw()
        } else {
            console.error(`unknown command from server: ${cmd}`)
        }
    }

    stop() {
    }

    start(options) {
        this.game = new Game(options)
        const width = this.game.board.width
        const height = this.game.board.height
        this.pix_x = Math.floor(Math.min(
            this.$canvas.width / width, 
            this.$canvas.height / height))
        this.pix_y = this.pix_x
        this.off_x = (this.$canvas.width - this.pix_x*width) / 2
        this.off_y = (this.$canvas.height - this.pix_y*height) / 2
        this.ctx = this.$canvas.getContext("2d")
        this.palette = ["black", "white", "red", "green"]
        this.game.board.clear(0)
        this.draw()
    }
    
    draw() {
        const ctx = this.ctx
        for (let y=0; y < this.game.board.height; ++y) {
            for (let x=0; x < this.game.board.width; ++x) {
                ctx.fillStyle = this.palette[this.game.board.get_pix(x, y)]
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
        }
    }
}

new Main()