"strict"

const $ = id => document.getElementById(id)
const $new = name => document.createElement(name)

class Main {
    constructor() {
        this.game = null
        this.player_id = -1
        $("name_button").onclick = (evt => {
            this.send(["set_name", $("name_input").value])
        })
        $("game_button").onclick = (evt => {
            this.send(["new_room", $("game_input").value, 100, 100, 20])
        })
        this.socket = null
        this.connect()
        this.players = []
        this.rooms = []

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
        const $connection = $("connection")
        let WS_URL = ((window.location.protocol === "https:" ? "wss://" : "ws://") 
            + window.location.hostname
            + (window.location.port ? ":" + window.location.port : ""));

        $connection.textContent = "connecting..."
        this.socket = new WebSocket(WS_URL);

        // Connection opened
        this.socket.addEventListener('open', event => {
            this.send(['hello']);
            $connection.textContent = "connected"
        })

        this.socket.addEventListener('close', event => {
            $connection.textContent = "disconnected"
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
        if (cmd === "hello") {
            console.log("server said hello")
        } else if (cmd === "update") {
            if (this.game) {
                this.game.update(payload[2])
                this.draw()
            }
        } else if (cmd === "start") {
            this.start(payload)
        } else if (cmd === "stop") {
            this.stop()
        } else if (cmd === "board") {
            this.game.frame_count = payload[1]
            this.game.players = payload[2]
            this.game.board.buffer = payload[3]
            this.draw()
        } else if (cmd === "add_player") {
            this.game.add_player(payload[1])
        } else if (cmd === "players") {
            this.players = payload[1]
            this.update_hall()
        } else if (cmd === "rooms") {
            this.rooms = payload[1]
            this.update_hall()
        } else if (cmd === "room_ready") {
            this.send(["join", payload[1]])
        } else if (cmd === "game") {
            const options = payload[1]
            this.player_id = payload[2]
            const players = payload[3]
            this.game = new Game(options)
            players.forEach(player => this.game.add_player(player))    
        } else {
            console.error(`unknown command from server: ${cmd}`)
        }
    }

    stop() {
    }

    start(payload) {
        const $canvas = $("canvas")
        this.player_id = payload[1]
        console.log(`start ${this.player_id}`)
        this.game = new Game({n_players: payload[2], width: payload[3], height: payload[4]})
        const width = this.game.board.width
        const height = this.game.board.height
        this.pix_x = Math.floor(Math.min(
            $canvas.width / width, 
            $canvas.height / height))
        this.pix_y = this.pix_x
        this.off_x = ($canvas.width - this.pix_x*width) / 2
        this.off_y = ($canvas.height - this.pix_y*height) / 2
        this.ctx = $canvas.getContext("2d")
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

    update_hall() {
        const $hall = $("hall")
        $hall.replaceChildren()
        let $p, $ul
        
        $p = $new("p")
        $hall.appendChild($p)
        $p.textContent = "Games:"
        $ul = $new("ul")
        $hall.appendChild($ul)
        this.rooms.forEach(room => {
            let $li = $new("li")
            $ul.appendChild($li)
            $li.textContent = `${room[1].name} (${room[1].n_players} players) `

            let $button = $new("button")
            $li.appendChild($button)
            if (this.game && room[1].id === this.game.options.id) {
                // ci sono entrato
                $button.textContent = "play!"
                $button.onclick = evt => {
                    this.send(["start"])
                }
                $button = $new("button")
                $li.appendChild($button)
                $button.textContent = "leave"
                $button.onclick = evt => {
                    this.send(["leave"])
                    this.game = null
                    this.player_id = -1
                }
            } else {
                $button.textContent = "join"
                $button.onclick = evt => {
                    this.send(["join", room[1].id])
                }
            }
        })
        if (this.rooms.length === 0) {
            let $li = $new("li")
            $ul.appendChild($li)
            $li.textContent = "no game yet... please create one!"
        }

        $p = $new("p")
        $hall.appendChild($p) 
        $p.textContent = "Players:"
        $ul = $new("ul")
        $hall.appendChild($ul)
        this.players.forEach(player => {
            let $li = $new("li")
            $ul.appendChild($li)
            $li.textContent = player[1]
        })
    }
}

new Main()