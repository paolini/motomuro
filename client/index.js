class Main {
    constructor() {
        this.$canvas = document.getElementById("canvas")
        this.$connection = document.getElementById("connection")
        this.$name = document.getElementById("name")
        this.game = null
        this.player_id = -1

        if (!this.$name.value) {
            this.$name.value = `${Math.floor(Math.random()*100000)}`
        }
        document.getElementById("start").onclick = (evt => this.send(["start", 100, 100, 20]))
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
            } else if (evt.key == "s") {
                this.send(["cmd", "spawn"])
            } else {
                console.log(`key ${evt.key} pressed`)
            }
        }
    }
    
    connect() {
        let WS_URL = ((window.location.protocol === "https:" ? "wss://" : "ws://") 
            + window.location.hostname
            + (window.location.port ? ":" + window.location.port : ""));

        this.$connection.textContent = "connecting..."
        this.socket = new WebSocket(WS_URL);

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
        console.log(`send(${JSON.stringify(payload)})`)
        this.socket.send(JSON.stringify(payload))
    }

    recv(msg) {
        // console.log(`recv(${msg})`)
        const payload = JSON.parse(msg)
        const cmd = payload[0]
        if (cmd == "hello") {
            console.log("server said hello")
        } else if (cmd == "start") {
            this.start(payload)
        } else if (cmd == "stop") {
            this.stop()
        } else if (cmd == "update") {
            if (this.game) {
                this.game.update(payload[2])
                this.draw()
            }
        } else if (cmd == "board") {
            this.game.frame_count = payload[1]
            this.game.players = payload[2]
            this.game.board.buffer = payload[3]
            this.draw()
        } else if (cmd == "add_players") {
            this.game.add_players(payload[1])
        } else {
            console.error(`unknown command from server: ${cmd}`)
        }
    }

    stop() {
    }

    start(payload) {
        this.player_id = payload[1]
        console.log(`start ${this.player_id}`)
        this.game = new Game({n_players: payload[2], width: payload[3], height: payload[4]})
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
                let idx = this.game.board.get_pix(x,y);
                if (idx >= this.palette.length) idx=(idx-1)%(this.palette.length-1)+1 
                ctx.fillStyle = this.palette[idx]
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