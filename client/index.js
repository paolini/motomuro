"strict"

const $ = id => document.getElementById(id)
const $new = name => document.createElement(name)

function hide($el) {
    $el.style.display = "none"
}

function show($el) {
    $el.style.display = "block"
}

function input_with_button($input, $button, action, clear=false) {
    $button.onclick = evt => {
        action($input.value)
        if (clear) $input.value = ""
    }
    $input.onkeyup = evt => {
        if (evt.key === 'Enter') {
            action($input.value)
            if (clear) $input.value = ""
        }
    }
}

let i = 0
let rect = null
let map = null

function phaser_preload() {
//        this.load.tilemap('map', 'tile_properties.json');
    this.load.image('tiles', 'colors.png');
}

function phaser_create ()
{   
    rect = this.add.rectangle(100,200,50,50,0x6666ff)

    // Load a map from a 2D array of tile indices
    let level = [
        [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0 ],
        [  0,  1,  2,  3,  0,  0,  0,  1,  2,  3,  0 ],
        [  0,  5,  6,  7,  0,  0,  0,  5,  6,  7,  0 ],
        [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0 ],
        [  0,  0,  0, 14, 13, 14,  0,  0,  0,  0,  0 ],
        [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0 ],
        [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0 ],
        [  0,  0, 14, 14, 14, 14, 14,  0,  0,  0, 15 ],
        [  0,  0,  0,  0,  0,  0,  0,  0,  0, 15, 15 ],
        [ 35, 36, 37,  0,  0,  0,  0,  0, 15, 15, 15 ],
        [ 39, 39, 39, 39, 39, 39, 39, 39, 39, 39, 39 ]
        ]

    // When loading from an array, make sure to specify the tileWidth and tileHeight
    map = this.make.tilemap({ data_: level, width: 60, height: 40, tileWidth: 4, tileHeight: 4 });
    let tiles = map.addTilesetImage('tiles');
    let layer = map.createLayer(0, tiles, 0, 0);
    i = 0
}

function phaser_update ()
{

    rect.x += 10
    if (rect.x >= 600) rect.x = 0
    rect.y += 1
    if (rect.y >= 300) rect.y = 0
    i++
    if (i==8) i=0
    map.putTileAt(i, 3, 2, false, 0)
}

class Main {
    constructor() {
        this.game = null
        this.player_id = -1
        const $canvas = $("canvas")
        this.socket = null
        this.connect()
        this.players = []
        this.rooms = []   
        this.phaser = null

        hide($("game_div"))

        input_with_button($("name_input"), $("name_button"), 
            value => this.send(["set_name", value]))
        input_with_button($("room_input"), $("room_button"),
            value => this.send(["new_room", value, 100, 100, 10]), true)
        input_with_button($("chat_input"), $("chat_button"),
            value => this.send(["chat", $("chat_input").value]), true)

        $("full_screen_button").onclick = (evt => {
            if ($canvas.webkitRequestFullScreen) $canvas.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT); //Chrome
            if ($canvas.mozRequestFullScreen) $canvas.mozRequestFullScreen(); //Firefox
        })
        $("quit_button").onclick = () => this.send(["cmd", "quit"])
        $("left_button").onclick = () => this.send(["cmd", "left"])
        $("right_button").onclick = () => this.send(["cmd", "right"])
        // $('canvas').onmousedown = 
        $('canvas').ontouchstart = 
        (evt) => {
            if (2*evt.offsetX < $('canvas').width) {
                this.send(["cmd", "left"])
            } else {
                this.send(["cmd", "right"])
            }
        }

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
            $connection.textContent = "connected"
        })

        this.socket.addEventListener('close', event => {
            this.room = null
            $connection.textContent = "disconnected"
            this.game = null
            hide($("game_div"))
            show($("name_div"))
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
        
        switch(cmd) {
        case "hello":
            console.log("server said hello")
            return
        case "update":
            if (this.game) {
                this.game.update(payload[3])
                const frame_delay = payload[2]
                if (frame_delay === 0) this.draw()
                if (this.game.players.size>0) {
                    this.send(['cmd', 'done', this.game.frame_count])
                }
            }
            return
        case "start":
            this.start(payload)
            return
        case "board":
            this.game.set_board(payload[1])
            this.draw()
            return
        case "game_players":
            this.game.set_players(payload[1])
            return
        case "players":
            this.players = payload[1]
            this.update_hall()
            return
        case "rooms":
            this.rooms = payload[1]
            this.update_hall()
            return
        case "chat":
            let $p = $new("p")
            let $b = $new("b")
            const name = payload[1]
            const msg = payload[2]
            $b.textContent = `${name}:`
            $p.appendChild($b)
            let $span = $new("span")
            $span.textContent = ` ${msg}`
            $p.appendChild($span)
            setTimeout(() => $p.remove(), 60000)
            $("chat_div").appendChild($p)
            document.title = `${name}: ${msg}`
            return
        case "room_ready":
            this.send(["join", payload[1]])
            return
        case "join":
            this.room = payload[1]
            $("room_input").value = this.room.name
            console.log(`join room`)
            return
        case "quit":
            this.stop()
            return
        default:
            console.error(`unknown command from server: ${cmd}`)
        }
    }

    start(payload) {
        console.log(`start`)
        this.player_id = payload[1]
        this.game = new Game(this.room)
        this.update_hall()
        hide($("name_div"))
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
        this.palette = ["#111", "white", "red", "green", "blue", "magenta", "orange"]
        this.game.board.clear(0)
        this.draw()
        show($("game_div"))

        this.phaser = new Phaser.Game({
            type: Phaser.AUTO,
            width: 800,
            height: 600,
            parent: "phaser",
            backgroundColor: '#2d2d2d',
            scene: {phaser_preload, phaser_create, phaser_update}
        });
    }

    stop() {
        this.phaser.destroy(true, false)
        this.scene = null
        this.phaser = null
        this.game = null
        this.player_id = null
        this.room = null
        hide($("game_div"))
        show($("name_div"))
        console.log(`quit game`)
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
        // $("frame_span").textContent = `${this.game.frame_count} ${this.socket.bufferedAmount} ${this.socket.readyState}`
        const $div = $("score_div")
        $div.replaceChildren()
        $div.textContent = "Score: "
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
                    this.send(["leave"]),
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

let main = new Main()
