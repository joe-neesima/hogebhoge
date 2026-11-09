(function () {
    "use strict";

    const WIDTH = 420;
    const HEIGHT = 760;
    const controls = { left: false, right: false };
    const scoreElement = document.getElementById("score");
    const bestElement = document.getElementById("best-score");
    const sideBestElement = document.getElementById("side-best");
    const ballsElement = document.getElementById("balls");
    const launchButton = document.getElementById("launch-button");
    const bestKey = "orbit-pinball-best";

    function formatScore(value) {
        return String(value).padStart(6, "0");
    }

    function setBest(value) {
        const best = Math.max(value, Number(localStorage.getItem(bestKey)) || 0);
        localStorage.setItem(bestKey, String(best));
        bestElement.textContent = formatScore(best);
        sideBestElement.textContent = formatScore(best);
    }

    function setControl(name, pressed) {
        controls[name] = pressed;
        document.querySelectorAll('[data-control="' + name + '"]').forEach(function (button) {
            button.classList.toggle("is-pressed", pressed);
        });
    }

    document.querySelectorAll("[data-control]").forEach(function (button) {
        const name = button.dataset.control;
        button.addEventListener("pointerdown", function (event) {
            event.preventDefault();
            button.setPointerCapture(event.pointerId);
            setControl(name, true);
        });
        ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (eventName) {
            button.addEventListener(eventName, function () { setControl(name, false); });
        });
    });

    class PinballScene extends Phaser.Scene {
        constructor() {
            super("PinballScene");
            this.score = 0;
            this.ballsRemaining = 3;
            this.best = Number(localStorage.getItem(bestKey)) || 0;
            this.ballInPlay = false;
            this.launcherExit = false;
            this.gameOver = false;
            this.leftAngle = 0.17;
            this.rightAngle = Math.PI - 0.17;
        }

        create() {
            this.cameras.main.setBackgroundColor("#12211f");
            this.drawTable();
            this.createBumpers();
            this.createBall();
            this.createFlipperGraphics();
            this.createInput();
            setBest(this.best);
            this.updateBallsDisplay();
            this.physics.world.setBounds(24, 18, 372, 700, true, true, true, false);
            this.physics.add.collider(this.ball, this.bumpers, this.hitBumper, null, this);
            this.physics.add.collider(this.ball, this.targets, this.hitTarget, null, this);
            launchButton.addEventListener("click", () => this.launchBall());
            this.drawFlippers();
        }

        drawTable() {
            const graphics = this.add.graphics();
            graphics.fillStyle(0x142522, 1);
            graphics.fillRect(0, 0, WIDTH, HEIGHT);

            graphics.lineStyle(1, 0x25413a, 0.6);
            for (let y = 55; y < 690; y += 28) {
                graphics.lineBetween(32, y, 335, y);
            }
            graphics.lineStyle(2, 0x27483f, 1);
            graphics.strokeRect(35, 40, 300, 608);

            graphics.lineStyle(7, 0x51796a, 1);
            graphics.lineBetween(31, 25, 348, 25);
            graphics.lineBetween(31, 25, 31, 704);
            graphics.lineBetween(389, 25, 389, 704);
            graphics.lineBetween(348, 25, 348, 486);

            graphics.lineStyle(2, 0x80d5bd, 0.8);
            graphics.lineBetween(53, 545, 129, 612);
            graphics.lineBetween(367, 545, 291, 612);
            graphics.lineStyle(1, 0xf0653d, 0.6);
            graphics.lineBetween(61, 554, 126, 609);
            graphics.lineBetween(359, 554, 294, 609);

            graphics.fillStyle(0xf0653d, 0.12);
            graphics.fillCircle(210, 390, 118);
            graphics.lineStyle(1, 0xf0653d, 0.35);
            graphics.strokeCircle(210, 390, 118);
            graphics.lineStyle(1, 0xd7ed69, 0.45);
            graphics.lineBetween(355, 565, 355, 720);
            graphics.lineBetween(369, 565, 369, 720);

            this.add.text(210, 73, "ORBITAL ZONE", {
                fontFamily: "DM Mono, monospace", fontSize: "9px", color: "#78998b", letterSpacing: 3
            }).setOrigin(0.5);
            this.add.text(357, 552, "PULL", {
                fontFamily: "DM Mono, monospace", fontSize: "8px", color: "#d7ed69", letterSpacing: 1
            }).setOrigin(0.5);

            this.add.rectangle(348, 626, 8, 268, 0x51796a).setAlpha(0.95);
        }

        createBumpers() {
            this.bumpers = this.physics.add.staticGroup();
            [
                { x: 135, y: 242, radius: 25, points: 1000, color: 0xf0653d },
                { x: 285, y: 242, radius: 25, points: 1000, color: 0xd7ed69 },
                { x: 210, y: 350, radius: 30, points: 1500, color: 0x80d5bd }
            ].forEach((item) => {
                const bumper = this.add.circle(item.x, item.y, item.radius, item.color);
                bumper.setStrokeStyle(5, 0xfff0c1, 0.9);
                bumper.setData("points", item.points);
                this.physics.add.existing(bumper, true);
                bumper.body.setCircle(item.radius);
                this.bumpers.add(bumper);

                this.add.circle(item.x, item.y, item.radius + 9, 0x000000, 0)
                    .setStrokeStyle(1, item.color, 0.55);
                this.add.circle(item.x, item.y, 5, 0x172a27);
            });

            this.targets = this.physics.add.staticGroup();
            [95, 210, 325].forEach((x) => {
                const target = this.add.circle(x, 455, 10, 0x253e38);
                target.setStrokeStyle(2, 0xd7ed69, 0.95);
                target.setData("points", 250);
                this.physics.add.existing(target, true);
                target.body.setCircle(10);
                this.targets.add(target);
            });
        }

        createBall() {
            this.ball = this.add.circle(368, 680, 10, 0xf5f2d8);
            this.ball.setStrokeStyle(2, 0xffa05d);
            this.physics.add.existing(this.ball);
            this.ball.body.setCircle(10);
            this.ball.body.setBounce(0.88);
            this.ball.body.setMaxVelocity(900, 1050);
            this.ball.body.setAllowGravity(false);
            this.ball.body.setVelocity(0, 0);
        }

        createFlipperGraphics() {
            this.flipperGraphics = this.add.graphics();
            this.leftPivot = { x: 143, y: 651 };
            this.rightPivot = { x: 277, y: 651 };
        }

        createInput() {
            this.input.keyboard.on("keydown", (event) => {
                if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) {
                    event.preventDefault();
                }
                if (event.code === "ArrowLeft" || event.code === "KeyA") setControl("left", true);
                if (event.code === "ArrowRight" || event.code === "KeyD") setControl("right", true);
                if (event.code === "Space" || event.code === "ArrowUp" || event.code === "Enter") this.launchBall();
            });
            this.input.keyboard.on("keyup", (event) => {
                if (event.code === "ArrowLeft" || event.code === "KeyA") setControl("left", false);
                if (event.code === "ArrowRight" || event.code === "KeyD") setControl("right", false);
            });
        }

        launchBall() {
            if (this.ballInPlay || this.ballsRemaining <= 0) return;
            if (this.gameOver) this.restartGame();
            this.ballInPlay = true;
            this.launcherExit = false;
            this.ball.setVisible(true);
            this.ball.body.enable = true;
            this.ball.body.setAllowGravity(true);
            this.ball.body.setGravityY(570);
            this.ball.body.setVelocity(-45, -720);
            launchButton.classList.add("is-pressed");
            window.setTimeout(() => launchButton.classList.remove("is-pressed"), 120);
        }

        hitBumper(ball, bumper) {
            ball.body.velocity.scale(1.045);
            this.addScore(bumper.getData("points"));
            this.flashBumper(bumper);
        }

        hitTarget(ball, target) {
            if (target.getData("lit")) return;
            target.setData("lit", true);
            target.setFillStyle(0xd7ed69);
            target.setScale(1.35);
            this.tweens.add({ targets: target, scale: 1, duration: 150 });
            this.addScore(target.getData("points"));
        }

        flashBumper(bumper) {
            this.tweens.add({
                targets: bumper,
                scale: 1.28,
                duration: 75,
                yoyo: true,
                onComplete: () => bumper.setScale(1)
            });
        }

        addScore(points) {
            this.score += points;
            scoreElement.textContent = formatScore(this.score);
            if (this.score > this.best) {
                this.best = this.score;
                setBest(this.best);
            }
        }

        updateBallsDisplay() {
            ballsElement.textContent = Array.from({ length: 3 }, (_, index) => index < this.ballsRemaining ? "●" : "○").join(" ");
            ballsElement.setAttribute("aria-label", "残りボール " + this.ballsRemaining + " 個");
        }

        update(time, delta) {
            const easing = Math.min(1, delta / 75);
            this.leftAngle += ((controls.left ? -0.58 : 0.17) - this.leftAngle) * easing;
            this.rightAngle += ((controls.right ? Math.PI + 0.58 : Math.PI - 0.17) - this.rightAngle) * easing;
            this.drawFlippers();

            if (!this.ballInPlay) return;
            if (!this.launcherExit && this.ball.y < 520) {
                this.launcherExit = true;
                this.ball.body.setVelocityX(-245);
            }
            this.collideWithFlipper(this.leftPivot, this.leftAngle, controls.left, 1);
            this.collideWithFlipper(this.rightPivot, this.rightAngle, controls.right, -1);
            if (this.ball.y > HEIGHT + 18) this.loseBall();
        }

        drawFlippers() {
            const graphics = this.flipperGraphics;
            graphics.clear();
            this.drawFlipper(this.leftPivot, this.leftAngle);
            this.drawFlipper(this.rightPivot, this.rightAngle);
        }

        drawFlipper(pivot, angle) {
            const graphics = this.flipperGraphics;
            const tipX = pivot.x + Math.cos(angle) * 94;
            const tipY = pivot.y + Math.sin(angle) * 94;
            graphics.lineStyle(22, 0xf0653d, 0.16);
            graphics.lineBetween(pivot.x, pivot.y, tipX, tipY);
            graphics.lineStyle(14, 0xd7ed69, 1);
            graphics.lineBetween(pivot.x, pivot.y, tipX, tipY);
            graphics.fillStyle(0xf7f0d7, 1);
            graphics.fillCircle(pivot.x, pivot.y, 11);
            graphics.fillStyle(0xf0653d, 1);
            graphics.fillCircle(pivot.x, pivot.y, 5);
        }

        collideWithFlipper(pivot, angle, active, direction) {
            const ballBody = this.ball.body;
            const startX = pivot.x;
            const startY = pivot.y;
            const endX = startX + Math.cos(angle) * 94;
            const endY = startY + Math.sin(angle) * 94;
            const segmentX = endX - startX;
            const segmentY = endY - startY;
            const ratio = Phaser.Math.Clamp(((this.ball.x - startX) * segmentX + (this.ball.y - startY) * segmentY) /
                (segmentX * segmentX + segmentY * segmentY), 0, 1);
            const nearX = startX + segmentX * ratio;
            const nearY = startY + segmentY * ratio;
            let normalX = this.ball.x - nearX;
            let normalY = this.ball.y - nearY;
            const distance = Math.hypot(normalX, normalY);
            const minimumDistance = 21;

            if (!this.ballInPlay || distance >= minimumDistance) return;
            if (distance < 0.001) {
                normalX = 0;
                normalY = -1;
            } else {
                normalX /= distance;
                normalY /= distance;
            }

            const velocity = ballBody.velocity;
            const alongNormal = velocity.x * normalX + velocity.y * normalY;
            if (alongNormal < 0 || active) {
                ballBody.setVelocity(
                    velocity.x - 1.8 * Math.min(alongNormal, 0) * normalX + direction * (active ? 65 : 0),
                    Math.min(velocity.y - 1.8 * Math.min(alongNormal, 0) * normalY - (active ? 410 : 0), -230)
                );
                const overlap = minimumDistance - distance;
                this.ball.setPosition(this.ball.x + normalX * overlap, this.ball.y + normalY * overlap);
                if (active) this.addScore(50);
            }
        }

        loseBall() {
            this.ballInPlay = false;
            this.ball.body.enable = false;
            this.ball.setVisible(false);
            this.ballsRemaining -= 1;
            this.updateBallsDisplay();

            if (this.ballsRemaining <= 0) {
                this.gameOver = true;
                this.scoreElement = this.add.text(WIDTH / 2, 385, "GAME OVER\nTAP LAUNCH TO RETRY", {
                    align: "center", color: "#e8f7a8", fontFamily: "DM Mono, monospace", fontSize: "15px", lineSpacing: 9
                }).setOrigin(0.5).setDepth(5);
            } else {
                this.resetBall();
            }
        }

        resetBall() {
            this.ball.setPosition(368, 680);
            this.ball.setVisible(true);
            this.ball.body.enable = true;
            this.ball.body.setAllowGravity(false);
            this.ball.body.setVelocity(0, 0);
        }

        restartGame() {
            this.gameOver = false;
            this.score = 0;
            this.ballsRemaining = 3;
            scoreElement.textContent = formatScore(0);
            this.updateBallsDisplay();
            if (this.scoreElement) this.scoreElement.destroy();
            this.targets.getChildren().forEach((target) => {
                target.setData("lit", false);
                target.setFillStyle(0x253e38);
                target.setScale(1);
            });
            this.resetBall();
        }
    }

    const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: "game-canvas",
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: "#12211f",
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: WIDTH,
            height: HEIGHT
        },
        physics: {
            default: "arcade",
            arcade: { debug: false, gravity: { y: 0 } }
        },
        render: { antialias: true, pixelArt: false },
        scene: [PinballScene]
    });

    window.addEventListener("blur", function () {
        setControl("left", false);
        setControl("right", false);
    });
}());