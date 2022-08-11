"strict"

const $ = id => document.getElementById(id)
const $new = name => document.createElement(name)

function hide($el) {
    $el.style.display = "none"
}

function show($el) {
    $el.style.display = "block"
}

class Main {
    constructor() {
        this.game = null
        this.player_id = -1
        hide($("game_div"))
        $("name_button").onclick = (evt => {
            this.send(["set_name", $("name_input").value])
        })
        $("room_button").onclick = (evt => {
            this.send(["new_room", $("room_input").value, 100, 100, 15])
        })
        this.socket = null
        this.connect()
        this.players = []
        this.rooms = []

        document.onkeydown = evt => {
            if (!this.socket) return
            if (!this.game) return
            if (evt.key == "o") this.send(["cmd", "left"])
            else if (evt.key == "p") this.send(["cmd", "right"])
            else if (evt.key == "ArrowLeft") {
                const d = this.game.players.get(this.player_id).d
                if (d===1) this.send(["cmd", "right"])
                if (d===3) this.send(["cmd", "left"])                
            } else if (evt.key == "ArrowRight") {
                const d = this.game.players.get(this.player_id).d
                if (d===3) this.send(["cmd", "right"])
                if (d===1) this.send(["cmd", "left"])                
            } else if (evt.key == "ArrowUp") {
                const d = this.game.players.get(this.player_id).d
                if (d===2) this.send(["cmd", "right"])
                if (d===0) this.send(["cmd", "left"])                
            } else if (evt.key == "ArrowDown") {
                const d = this.game.players.get(this.player_id).d
                if (d===0) this.send(["cmd", "right"])
                if (d===2) this.send(["cmd", "left"])                
            } else if (evt.key == "q") {
                this.send(["cmd", "quit"])
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
            this.room = null
            $connection.textContent = "disconnected"
            this.game = null
            hide($("game_div"))
            this.players = []
            this.rooms = []
            this.update_hall
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
            this.game.set_board(payload[1])
            this.draw()
        } else if (cmd === "game_players") {
            this.game.set_players(payload[1])
        } else if (cmd === "players") {
            this.players = payload[1]
            this.update_hall()
        } else if (cmd === "rooms") {
            this.rooms = payload[1]
            this.update_hall()
        } else if (cmd === "room_ready") {
            this.send(["join", payload[1]])
        } else if (cmd === "join") {
            this.room = payload[1]
            $("room_input").value = this.room.name
            console.log(`join room`)
        } else if (cmd === "quit") {
            this.game = null
            this.player_id = null
            this.room = null
            hide($("game_div"))
            console.log(`quit game`)
        } else {
            console.error(`unknown command from server: ${cmd}`)
        }
    }

    start(payload) {
        console.log(`start`)
        this.player_id = payload[1]
        this.game = new Game(this.room)
        const width = this.game.board.width
        const height = this.game.board.height
        const $canvas = $("canvas")
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
        show($("game_div"))
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
        const $div = $("score_div")
        $div.replaceChildren()
        for(let player of this.game.players.values()) {
            let $li = $new("li")
            $div.appendChild($li)
            $li.textContent=`${player.name}: ${player.score}`
        }
    }


    update_hall() {
        const $hall = $("hall")
        $hall.replaceChildren()
        if (this.game) return

        function add_button($container, name, cb) {
            let $button = $new("button")
            $button.textContent = name
            $button.onclick = cb
            $container.appendChild($button)
        }

        let $p, $ul, $li        
        $p = $new("p")
        $hall.appendChild($p)
        $p.textContent = "Games:"
        $ul = $new("ul")
        $hall.appendChild($ul)
        this.rooms.forEach(room => {
            $li = $new("li")
            $ul.appendChild($li)
            $li.textContent = `${room.name} (${room.n_players} players) `

            if (this.room && this.room.id === room.id) {
                // ci sono dentro
                add_button($li, "leave", () => {
                    this.send["leave"],
                    this.room = null
                    })                    
                add_button($li, "play", () => {this.send(["play"])})
            } else {
                // non sono in questa stanza
                add_button($li, room.running ? "play" : "join", () => {this.send(["join", room.id])})
            }
        })

        if (this.rooms.length === 0) {
            $li = $new("li")
            $ul.appendChild($li)
            $li.textContent = "no game yet... please create one!"
        }

        $p = $new("p")
        $hall.appendChild($p) 
        $p.textContent = "Players:"
        $ul = $new("ul")
        $hall.appendChild($ul)
        this.players.forEach(player => {
            $li = $new("li")
            $ul.appendChild($li)
            $li.textContent = player[1]
        })
    }
}

new Main()