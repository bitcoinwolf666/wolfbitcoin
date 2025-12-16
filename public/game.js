const WIDTH = 900;
const HEIGHT = 520;

const state = {
  speed: 260,
  score: 0,
  best: Number(localStorage.getItem("wolfrun_best") || 0),
  totalBTC: Number(localStorage.getItem("wolfrun_totalbtc") || 0),
  isGameOver: false,
  dashReadyAt: 0
};

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

class MainScene extends Phaser.Scene {
  constructor() { super("main"); }

  create() {
    // Background
    this.cameras.main.setBackgroundColor("#0b0f17");
    this.stars = this.add.group();

    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, WIDTH);
      const y = Phaser.Math.Between(0, HEIGHT);
      const r = Phaser.Math.Between(1, 2);
      const s = this.add.circle(x, y, r, 0xffffff, 0.12);
      s.speed = Phaser.Math.FloatBetween(10, 40);
      this.stars.add(s);
    }

    // Ground
    this.groundY = HEIGHT - 90;
    this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);

    this.ground = this.add.rectangle(WIDTH/2, this.groundY + 40, WIDTH, 140, 0x0f1626, 1);
    this.physics.add.existing(this.ground, true);

    // Wolf (simple shapes)
    this.wolf = this.add.container(140, this.groundY - 40);
    const body = this.add.rectangle(0, 0, 54, 34, 0x9aa6b2, 1);
    const head = this.add.rectangle(34, -10, 28, 22, 0xb0bac4, 1);
    const ear = this.add.triangle(40, -26, 0, 14, 10, 0, 20, 14, 0xc2ccd6, 1);
    const eye = this.add.circle(42, -12, 3, 0x0b0f17, 1);
    const tail = this.add.triangle(-34, -2, 0, 0, 16, -8, 16, 8, 0x7f8a96, 1);

    this.wolf.add([tail, body, head, ear, eye]);
    this.physics.add.existing(this.wolf);
    this.wolf.body.setSize(110, 60);
    this.wolf.body.setOffset(-55, -30);
    this.wolf.body.setCollideWorldBounds(true);
    this.wolf.body.setGravityY(1300);

    this.physics.add.collider(this.wolf, this.ground);

    // Pools
    this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
    this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });

    // UI text
    this.hud = this.add.text(16, 16, "", { fontSize: "18px", color: "#ffffff" });
    this.tip = this.add.text(16, 42, "Collect ₿ • Avoid spikes • Dash (Shift)", { fontSize: "14px", color: "rgba(255,255,255,0.75)" });

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // Collisions
    this.physics.add.overlap(this.wolf, this.coins, (_, coin) => this.collectCoin(coin));
    this.physics.add.overlap(this.wolf, this.obstacles, () => this.gameOver());

    // Spawners
    this.coinTimer = 0;
    this.obsTimer = 0;

    // Premium cosmetics (simple neon trail)
    this.ent = window.WolfRunUI?.getEntitlements?.() || {};
    this.trail = this.add.rectangle(this.wolf.x - 40, this.wolf.y, 60, 16, 0x00ffcc, this.ent.premium ? 0.22 : 0);
  }

  collectCoin(coin) {
    coin.destroy();
    state.score += 1;
    state.totalBTC += 1;
    localStorage.setItem("wolfrun_totalbtc", String(state.totalBTC));
  }

  gameOver() {
    if (state.isGameOver) return;
    state.isGameOver = true;

    state.best = Math.max(state.best, state.score);
    localStorage.setItem("wolfrun_best", String(state.best));

    this.add.text(WIDTH/2, HEIGHT/2 - 30,
      `Game Over\nScore: ${state.score}   Best: ${state.best}\nPress R to Restart`,
      { fontSize: "22px", color: "#ffffff", align: "center" }
    ).setOrigin(0.5);

    const rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    rKey.once("down", () => {
      state.speed = 260;
      state.score = 0;
      state.isGameOver = false;
      this.scene.restart();
    });
  }

  spawnCoin() {
    const x = WIDTH + 30;
    const y = Phaser.Math.Between(this.groundY - 220, this.groundY - 120);

    const coin = this.add.circle(x, y, 12, 0xffd54a, 1);
    const btc = this.add.text(x - 7, y - 10, "₿", { fontSize: "18px", color: "#0b0f17" });

    const container = this.add.container(0, 0, [coin, btc]);
    this.physics.add.existing(container);
    container.body.setCircle(12, x-12, y-12);
    container.body.setAllowGravity(false);
    container.body.setVelocityX(-state.speed);
    container.body.setImmovable(true);

    this.coins.add(container);
  }

  spawnObstacle() {
    const x = WIDTH + 40;
    const h = Phaser.Math.Between(30, 60);
    const y = this.groundY - (h/2);

    const spike = this.add.triangle(x, y, 0, h, 18, 0, 36, h, 0xff4d6d, 1);
    this.physics.add.existing(spike);
    spike.body.setAllowGravity(false);
    spike.body.setVelocityX(-state.speed);
    spike.body.setImmovable(true);

    this.obstacles.add(spike);
  }

  update(time, dt) {
    // background parallax
    this.stars.getChildren().forEach(s => {
      s.x -= (s.speed * dt) / 1000;
      if (s.x < -10) s.x = WIDTH + 10;
    });

    if (!state.isGameOver) {
      // speed ramps up
      state.speed += (dt / 1000) * 8;
      state.speed = clamp(state.speed, 260, 980);
    }

    // movement / controls
    const onGround = this.wolf.body.blocked.down;

    if (!state.isGameOver) {
      if ((Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keySpace)) && onGround) {
        this.wolf.body.setVelocityY(-560);
      }

      // slide
      if (this.cursors.down.isDown && onGround) {
        this.wolf.body.setSize(110, 40);
      } else {
        this.wolf.body.setSize(110, 60);
      }

      // dash
      if (Phaser.Input.Keyboard.JustDown(this.keyShift) && time > state.dashReadyAt) {
        state.dashReadyAt = time + 1800; // cooldown
        state.speed += 220;
      }

      // Trail visibility if premium
      const premium = !!window.WolfRunUI?.getEntitlements?.().premium;
      this.trail.x = this.wolf.x - 46;
      this.trail.y = this.wolf.y + 8;
      this.trail.alpha = premium ? 0.22 : 0;
    }

    // Spawn logic
    if (!state.isGameOver) {
      this.coinTimer -= dt;
      this.obsTimer -= dt;

      if (this.coinTimer <= 0) {
        this.spawnCoin();
        this.coinTimer = Phaser.Math.Between(260, 520);
      }
      if (this.obsTimer <= 0) {
        this.spawnObstacle();
        this.obsTimer = Phaser.Math.Between(600, 1100);
      }
    }

    // Update velocities and cleanup
    this.coins.getChildren().forEach(c => {
      c.body.setVelocityX(-state.speed);
      if (c.x < -80) c.destroy();
    });
    this.obstacles.getChildren().forEach(o => {
      o.body.setVelocityX(-state.speed);
      if (o.x < -80) o.destroy();
    });

    // HUD
    this.hud.setText(
      `₿ ${state.score}   Best ${state.best}   Total ₿ ${state.totalBTC}   Speed ${Math.floor(state.speed)}`
    );
  }
}

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: "game",
  physics: { default: "arcade", arcade: { debug: false } },
  scene: [MainScene]
};

new Phaser.Game(config);
