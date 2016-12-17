defaults = {
    width: 400,
    height: 600,

    backgroundColor: '#C5E9FF',
    paddleColor: 'white',
    ballColor: '#FF00AA',
    aiColor: 'red',

    paddleWidth: 100,
    paddleHeight: 10,

    minSpeed: 30,
    maxSpeed: 40,

    epochHits: 50
}

/////////////
/// Game ///
///////////

var animate = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function(callback) { window.setTimeout(callback, 1000 / 60) };

Game = {
    init: function(options) {
        Game.options = options;

        var canvas = document.createElement('canvas');
        canvas.width = options.width;
        canvas.height = options.height;
        Game.context = canvas.getContext('2d');

        Game.speed = (options.maxSpeed + options.minSpeed) / 2;
        Game.hits = {};
        Game.score = {
            top: 0,
            bottom: 0,
        };
        Game.epoch = 1;

        window.onload = function() {
            Game.initSettings();

            document.getElementById('field').appendChild(canvas);
            document.getElementById('population').innerHTML = Game.ai.evolution.options.population;

            document.getElementById('speedRange').min = options.minSpeed;
            document.getElementById('speedRange').max = options.maxSpeed;

            window.setInterval(function() {
                var dots = document.getElementById("dots");
                if (!dots) {
                    return;
                }

                if (dots.innerHTML.length == 3)
                    dots.innerHTML = "";
                else
                    dots.innerHTML += ".";
                }, 300
            );

            animate(Game.step);
        };

        // Game.player = new Player();
        Game.ai = new NeuroAI();
        Game.computer = new Computer();
        Game.ball = new Ball();
    },

    // updateScore: function() {
    //     document.getElementById('scoreTop').innerHTML = Game.score.top;
    //     document.getElementById('scoreBottom').innerHTML = Game.score.bottom;
    // },

    initSettings: function() {
        document.getElementById('speedRange').addEventListener('change', function(event) {
            Game.speed = this.value * 1;
            // document.getElementById('field').focus();
        });
    },

    step: function() {
        Game.update();
        Game.render();

        if (Game.hits['algo'] == Game.options.epochHits && !Game.ai.trained) {
            var topAIHits = Math.max.apply(Math, Game.hits['ai']) / Game.options.epochHits * 100;
            document.getElementById('ai-hits').innerHTML = Math.floor(topAIHits) + '%';

            var trained = Game.ai.newEpoch();
            Game.hits['algo'] = [0];
            if (!trained) {
                document.getElementById('epoch').innerHTML = ++Game.epoch;
            } else {
                document.getElementById('status').innerHTML = 'Trained!';
            }
        }
        animate(Game.step);
    },

    update: function() {
        Game.ai.update();
        Game.computer.update();
        Game.ball.update();
    },

    render: function() {
        Game.context.fillStyle = "#C5E9FF";
        Game.context.fillRect(0, 0, Game.options.width, Game.options.height);

        Game.ai.render();
        Game.computer.render();
        Game.ball.render();
    }
}

///////////////
/// Paddle ///
/////////////

function Paddle(x, y, color, opacity) {
    this.x = x;
    this.y = y;
    this.width = Game.options.paddleWidth;
    this.height = Game.options.paddleHeight;
    this.xSpeed = 0;
    this.ySpeed = 0;

    this.color = color;
    this.opacity = opacity;

    this.render = function() {
        Game.context.fillStyle = this.color;

        Game.context.globalAlpha = this.opacity;
        Game.context.fillRect(this.x, this.y, this.width, this.height);
        Game.context.globalAlpha = 1.0;
    };

    this.move = function(x, y) {
        this.x += x;
        this.y += y;
        this.xSpeed = x;
        this.ySpeed = y;

        if (this.x < 0) {
            this.x = 0;
            this.xSpeed = 0;
        } else if (this.x + this.width > Game.options.width) {
            this.x = Game.options.width - this.width;
            this.xSpeed = 0;
        }
    }
}

// function Player() {
//     this.paddle = new Paddle(
//         (Game.options.width - Game.options.paddleWidth) / 2,
//         Game.options.height - Game.options.paddleHeight * 2,
//     );
//     this.paddles = [this.paddle];
//
//     this.render = function() {
//         this.paddle.render();
//     };
//
//     this.update = function() {
//         for(var key in keysDown) {
//             var value = Number(key);
//             if(value == 37) {
//                 this.paddle.move(-Game.speed, 0);
//             } else if (value == 39) {
//                 this.paddle.move(Game.speed, 0);
//             } else {
//                 this.paddle.move(0, 0);
//             }
//         }
//     };
//
//     var keysDown = {};
//
//     window.addEventListener("keydown", function(event) {
//         keysDown[event.keyCode] = true;
//     });
//
//     window.addEventListener("keyup", function(event) {
//         delete keysDown[event.keyCode];
//     });
// };

function Computer(godlike) {
    this.paddle = new Paddle(
        (Game.options.width - Game.options.paddleWidth) / 2,
        Game.options.paddleHeight,
        Game.options.paddleColor
    );

    Game.hits['algo'] = [0];

    this.speedCoeff = 0.5;
    if (godlike) {
        this.speedCoeff = 2;
    }

    this.render = function() {
        this.paddle.render();
    };

    this.update = function() {
        var diff = -((this.paddle.x + (this.paddle.width / 2)) - Game.ball.x);
        if(diff < -Game.speed) {
            diff = -Game.speed * this.speedCoeff;
        } else if(diff > Game.speed) {
            diff = Game.speed * this.speedCoeff;
        }
        this.paddle.move(diff, 0);
    };
};

function NeuroAI(options) {
    this.evolution = new Evolution();
    this.paddles = [];
    this.trained = false;

    Game.hits['ai'] = [];
    for (var i = 0; i < this.evolution.options.population; i++) {
        this.paddles.push(
            new Paddle(
                (Game.options.width - Game.options.paddleWidth) / 2,
                Game.options.height - Game.options.paddleHeight * 2,
                Game.options.aiColor,
                (i == 0) ? 0.7 : 0
            )
        );
        Game.hits['ai'].push(0);
    }

    this.render = function() {
        for (var i = 0; i < this.paddles.length; i++) {
            this.paddles[i].render();
        }
    };

    this.update = function() {
        for (var i = 0; i < this.paddles.length; i++) {
            var input = [
                    (this.paddles[i].x + this.paddles[i].width / 2) / Game.options.width,
                    Game.ball.x / Game.options.width
            ];
            var action = this.evolution.generation.genomes[i].action(input)[0];
            if (action < 0.5) {
                diff = -Game.speed;
            } else {
                diff = Game.speed;
            }

            this.paddles[i].move(diff, 0);
        }
    };

    this.newEpoch = function() {
        if (this.trained) {
            return this.trained;
        }

        this.evolution.generation.updateScores(Game.hits['ai']);
        for (var i = 0; i < this.paddles.length; i++) {
            if (Game.hits['ai'][i] >= Game.hits['algo'][0]) {
                this.paddles = [this.paddles[i]];
                this.trained = true;
                this.paddles[0].opacity = 1.0;
            };

            Game.hits['ai'][i] = 0;
        }

        if (this.trained) {
            console.log('Trained for', Game.hits['algo'][0], 'hits');
        } else {
            this.newGeneration();
        }

        return this.trained;
    }

    this.newGeneration = function() {
        this.evolution.newGeneration();
    }
}

/////////////
/// Ball ///
///////////

function Ball() {
    this.radius = 5;

    this.init = function() {
        this.x = Game.options.width / 2;
        this.y = Game.options.height / 2;

        this.xSpeed = Math.random() * 2 - 1;
        this.ySpeed = -Game.speed;
    };

    this.render = function() {
        Game.context.beginPath();
        Game.context.arc(this.x, this.y, this.radius, 2 * Math.PI, false);
        Game.context.fillStyle = Game.options.ballColor;
        Game.context.fill();
    };

    this.update = function() {
        this.x += this.xSpeed;
        this.y += this.ySpeed;

        var topX = this.x - this.radius;
        var topY = this.y - this.radius;

        var bottomX = this.x + this.radius;
        var bottomY = this.y + this.radius;

        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.xSpeed = -this.xSpeed;
            this.xSpeed += Math.random() / 10;
        } else if(this.x + this.radius > Game.options.width) {
            this.x = Game.options.width - this.radius;
            this.xSpeed = -this.xSpeed;
            this.xSpeed -= Math.random() / 10;
        }

        if (this.y < 0 || this.y > Game.options.height) {
            // if (this.y < 0) {
            //     Game.score.bottom += 1;
            // } else {
            //     Game.score.top += 1;
            // }
            // Game.updateScore()
            this.init()

            return;
        }

        var side = 'algo';
        var paddles = [Game.computer.paddle];
        if (topY > Game.options.height / 2) {
            paddles = Game.ai.paddles;
            side = 'ai';
        }

        var didHit = false;
        for (var i = 0; i < paddles.length; i++) {
            if (
                topY < (paddles[i].y + paddles[i].height) && bottomY > paddles[i].y &&
                topX < (paddles[i].x + paddles[i].width) && bottomX > paddles[i].x
            ) {
                if (!didHit) {
                    this.ySpeed = -this.ySpeed;
                    this.xSpeed = (this.xSpeed + (paddles[i].xSpeed / 2)) % Game.speed;
                    this.y += this.ySpeed;

                    didHit = true;
                }
                Game.hits[side][i] += 1;
            }
        }
    };
    this.init();
}

Game.init(defaults);
