"use strict";

class Main {
    constructor() {
        this.game = null
        this.game_options = {width: 40, height: 40}
        this.active_loop_count = 0
        this.canvas = document.getElementById('canvas')
        this.startBtn = document.getElementById('start')
        this.stopBtn = document.getElementById('stop')
        this.startBtn.onclick = () => this.start()
        this.stopBtn.onclick = () => this.stop()
    }

    start() {
        if (this.game) this.stop()
        this.game = new Game(this.game_options)
        this.ctx = canvas.getContext('2d')
        if (this.active_loop_count <= 0) {
            
            const game_loop = timestamp => {
                if (this.game === null) {
                    // stop loop
                    this.active_loop_count--
                } else {
                    this.draw(timestamp)
                    // reinstantiate
                    window.requestAnimationFrame(game_loop)
                }
            } 
            
            window.requestAnimationFrame(game_loop)
            this.active_loop_count++
        }
    }

    stop() {
        this.game = null
    }

    draw(timestamp) {
        let randomColor = Math.random() > 0.5? '#ff8080' : '#0099b0';
        this.ctx.fillStyle = "black"
        this.ctx.fillRect(0, 0, 640, 480);
        this.ctx.fillStyle = "blue"
        let x = (timestamp % 5000)/5 - 50
        this.ctx.fillRect(x, 50, 50, 50);
    }
}

new Main()