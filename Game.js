// ====== SETUP ======
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
canvas.width = innerWidth;
canvas.height = innerHeight;

const gravity = 0.5;
let gameSpeed = 0;
let scrollOffset = 0;
let lives = 3;
let hearts = []; // for animation
let coinCount = 0; // for coin collection
const dangerY = canvas.height - 150; // if player falls 100px below the screen
let gameOver = false;
let gameWin = false;
let isInvincible = false;
let invincibilityTimer = 0;


// ====== BACKGROUND ======
const BackgroundLayer1 = new Image();
BackgroundLayer1.src = "BackgroundIMG/one.png";
const BackgroundLayer2 = new Image();
BackgroundLayer2.src = "BackgroundIMG/two.png";
const BackgroundLayer3 = new Image();
BackgroundLayer3.src = "BackgroundIMG/three.png";
const BackgroundLayer4 = new Image();
BackgroundLayer4.src = "BackgroundIMG/four.png";

// ====== HEART IMAGE ======
const heartImg = new Image();
heartImg.src = 'Images/Heart.png';

// ====== SOUNDS ======
const jumpSound = new Audio('Music/Jump.mp3');
const coinSound = new Audio('Music/CoinSound.mp3')

// ====== BACKGROUND MUSIC ======
const bgMusics = [
  new Audio('Music/Music1.mp3'),
  new Audio('Music/Music2.mp3'),
  new Audio('Music/Music3.mp3'),
  new Audio('Music/Music4.mp3')
];

let currentTrack = 0;

bgMusics.forEach(music => {
  music.volume = 0.5;
  music.loop = false;
});

function playNextTrack() {
  const music = bgMusics[currentTrack];
  music.play();
  music.onended = () => {
    currentTrack = (currentTrack + 1) % bgMusics.length;
    playNextTrack();
  };
}

// ====== MUSIC MUTE TOGGLE ======
let musicMuted = false;
addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'm') {
    musicMuted = !musicMuted;
    bgMusics.forEach(m => m.muted = musicMuted);
  }
});

class Layer {
  constructor(image, speedModifier) {
    this.x = 0;
    this.y = 0;
    this.width = canvas.width;
    this.height = canvas.height;
    this.image = image;
    this.speedModifier = speedModifier;
  }

  update() {
    this.x -= gameSpeed * this.speedModifier;
    if (this.x <= -this.width) this.x = 0;
  }

  draw() {
    ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    ctx.drawImage(this.image, this.x + this.width, this.y, this.width, this.height);
  }
}

const layers = [
  new Layer(BackgroundLayer1, 0.2),
  new Layer(BackgroundLayer2, 0.4),
  new Layer(BackgroundLayer3, 0.6),
  new Layer(BackgroundLayer4, 1.0)
];

// ====== PLAYER ======
class Player {
  constructor() {
    this.position = { x: 200, y: 100 };
    this.velocity = { x: 0, y: 2 };
    this.width = 130;
    this.height = 130;
    this.image = new Image();
    this.image.src = 'PlayerIMG/IDLE.png';
    this.frameX = 0;
    this.totalFrames = 7;
    this.frameTimer = 0;
    this.frameInterval = 20;
    this.state = 'idle';
    this.facingRight = true;
    this.speed = 3;

    // Hitbox
    this.hitboxOffset = { x: 20, y: 35, width: 90, height: 95 };
  }

  getHitbox() {
    return {
      x: this.position.x + this.hitboxOffset.x,
      y: this.position.y + this.hitboxOffset.y,
      width: this.hitboxOffset.width,
      height: this.hitboxOffset.height
    };
  }

  setState(state) {
    if (this.state !== state) {
      this.state = state;
      this.frameX = 0;
      switch (state) {
        case 'idle':
          this.image.src = 'PlayerIMG/IDLE.png';
          this.totalFrames = 7;
          break;
        case 'run':
          this.image.src = 'PlayerIMG/WALK.png';
          this.totalFrames = 8;
          break;
        case 'jump':
          this.image.src = 'PlayerIMG/JUMP.png';
          this.totalFrames = 5;
          break;
      }
    }
  }

  animateFrames() {
    this.frameTimer++;
    if (this.frameTimer >= this.frameInterval) {
      this.frameTimer = 0;
      this.frameX = (this.frameX + 1) % this.totalFrames;
    }
  }

  draw() {
    const frameWidth = this.image.width / this.totalFrames;
    const frameHeight = this.image.height;

    ctx.save();
    if (!this.facingRight) {
      ctx.scale(-1, 1);
      ctx.drawImage(
        this.image,
        frameWidth * this.frameX, 0,
        frameWidth, frameHeight,
        this.position.x - this.width, this.position.y,
        this.width, this.height
      );
    } else {
      ctx.drawImage(
        this.image,
        frameWidth * this.frameX, 0,
        frameWidth, frameHeight,
        this.position.x, this.position.y + 35,
        this.width, this.height
      );
    }
    ctx.restore();
  }

  update() {
    this.position.y += this.velocity.y;
    if (this.position.y + this.height + this.velocity.y <= canvas.height)
      this.velocity.y += gravity;
    else
      this.velocity.y = 0;

    this.position.x += this.velocity.x;

    if (this.velocity.y < 0) this.setState('jump');
    else if (keys.left.pressed || keys.right.pressed) this.setState('run');
    else this.setState('idle');

    this.animateFrames();
    this.draw();
  }
}

// ====== PLATFORM ======
const platformImg = new Image();
platformImg.src = 'Images/Tiles/Tile_02.png';

class Platform {
  constructor(x, y, width = 200, height = 20, image = platformImg) {
    this.position = { x, y };
    this.width = width;
    this.height = height;
    this.image = image;
  }

  draw() {
    ctx.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
  }
}

// ====== COINS ======
const coinImg = new Image();
coinImg.src = 'Images/Animation/Coin.png';

class Coin {
  constructor(x, y) {
    this.position = { x, y };
    this.width = 13;
    this.height = 25;
    this.image = coinImg;
    this.frameX = 0;
    this.totalFrames = 4;
    this.frameTimer = 0;
    this.frameInterval = 20;
  }

  draw() {
    const frameWidth = this.image.width / this.totalFrames;
    ctx.drawImage(
      this.image,
      frameWidth * this.frameX,
      0,
      frameWidth,
      this.image.height,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    );
  }

  update() {
    this.frameTimer++;
    if (this.frameTimer % this.frameInterval === 0) {
      this.frameX = (this.frameX + 1) % this.totalFrames;
    }
    this.draw();
  }
}

const coins = [
  new Coin(520, 560),
  new Coin(830, 510),
  new Coin(1150, 460),
  new Coin(1180, 460),
  new Coin(1210, 460),
  new Coin(1450, 560),
  new Coin(1500, 510),
  new Coin(1550, 510),
  new Coin(1800, 500),
  new Coin(2050, 460),
  new Coin(2350, 560),
  new Coin(2650, 510),
  new Coin(2950, 560),
  new Coin(3250, 460),
  new Coin(3550, 510),
  new Coin(3850, 560),
  new Coin(5650, 560),
  new Coin(5680, 560),
  new Coin(5710, 560),
  new Coin(5740, 560),
  new Coin(8330, 560),
  new Coin(8370, 560),
  new Coin(8400, 560),
  new Coin(8430, 560),
  new Coin(8460, 560),
// H
new Coin(1800, 220),
new Coin(1800, 250),
new Coin(1800, 280),
new Coin(1800, 310),
new Coin(1800, 340),

new Coin(1840, 280),
new Coin(1880, 280),

new Coin(1920, 220),
new Coin(1920, 250),
new Coin(1920, 280),
new Coin(1920, 310),
new Coin(1920, 340),

// I
new Coin(1980, 220),
new Coin(1980, 250),
new Coin(1980, 280),
new Coin(1980, 310),
new Coin(1980, 340)


];

// ====== DOOR ======
const doorImg = new Image();
doorImg.src = 'Images/DOORS/Idle.png';

class Door {
  constructor(x, y, width = 50, height = 80) {
    this.position = { x, y };
    this.width = width;
    this.height = height;
    this.image = doorImg;
  }

  draw() {
    ctx.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
  }

  update() {
    this.draw();
  }
}

const door = new Door(8920, 420);

// ====== ENEMY ======
const enemyImg = new Image();
enemyImg.src = 'Images/Skeleton.png'; // 960x64, 10 columns

class Enemy {
  constructor(x, y, width = 96, height = 64, speed = 1) {
    this.position = { x, y };
    this.width = width;
    this.height = height;
    this.velocity = { x: speed, y: 0 };
    this.speed = speed;

    this.frameX = 0;
    this.totalFrames = 10;
    this.frameTimer = 0;
    this.frameInterval = 10;
  }

  draw() {
    const frameWidth = enemyImg.width / this.totalFrames;
    const frameHeight = enemyImg.height;

    ctx.drawImage(
      enemyImg,
      frameWidth * this.frameX,
      0,
      frameWidth,
      frameHeight,
      this.position.x,
      this.position.y,
      this.width,
      this.height
    );
  }

  update(platforms, gravity) {
    this.position.x += this.velocity.x;
    this.velocity.y += gravity;
    this.position.y += this.velocity.y;

    // Animate
    this.frameTimer++;
    if (this.frameTimer >= this.frameInterval) {
      this.frameTimer = 0;
      this.frameX = (this.frameX + 1) % this.totalFrames;
    }

    let onPlatform = false;
    platforms.forEach(platform => {
      if (
        this.position.y + this.height >= platform.position.y &&
        this.position.y + this.height <= platform.position.y + this.velocity.y + gravity &&
        this.position.x + this.width > platform.position.x &&
        this.position.x < platform.position.x + platform.width
      ) {
        this.velocity.y = 0;
        this.position.y = platform.position.y - this.height;
        onPlatform = true;
      }
    });

    if (onPlatform) {
      const platformUnder = platforms.find(platform =>
        this.position.x + this.width / 2 > platform.position.x &&
        this.position.x + this.width / 2 < platform.position.x + platform.width &&
        Math.abs(this.position.y + this.height - platform.position.y) < 5
      );

      if (!platformUnder) {
        this.velocity.x = -this.velocity.x;
      }
    }

    this.draw();
  }
}

// ====== FLYING ENEMY ======
const flyingEnemies = [];
const flyingEnemyImg = new Image();
flyingEnemyImg.src = 'Bee/Spritesheets/Bee_walk.png'; // 256x256, 4x4 grid
const FLY_FRAME_SIZE = 64;

function spawnFlyingEnemy() {
  const yPositions = [200, 250, 300, 350];
  const y = yPositions[Math.floor(Math.random() * yPositions.length)];
  flyingEnemies.push({
    position: { x: canvas.width + 100, y: y },
    velocity: { x: -1.5 - Math.random() * 1, y: 0 },
    width: 100,
    height: 100,
    frameX: 1,
    frameY: 1
  });
}

// ====== OBJECTS ======
const player = new Player();

const platforms = [
  new Platform(200, 600),
  new Platform(500, 600),
  new Platform(800, 550),
  new Platform(1100, 500),
  new Platform(1400, 600),
  new Platform(1700, 550),
  new Platform(2000, 500),
  new Platform(2300, 600),
  new Platform(2600, 550),
  new Platform(2900, 600),
  new Platform(3200, 500),
  new Platform(3500, 550),
  new Platform(3800, 600),
  new Platform(4100, 550),
  new Platform(4400, 500),
  new Platform(4700, 580),
  new Platform(5000, 520),
  new Platform(5300, 560),
  new Platform(5600, 600),
  new Platform(5900, 540),
  new Platform(6200, 500),
  new Platform(6500, 550),
  new Platform(6800, 600),
  new Platform(7100, 520),
  new Platform(7400, 560),
  new Platform(7700, 500),
  new Platform(8000, 550),
  new Platform(8300, 600),
  new Platform(8600, 520),
  new Platform(8900, 500)
];

const enemies = [
  new Enemy(600, 500),
  new Enemy(1100, 100),
  new Enemy(1700, 200),
  new Enemy(2000, 450),
  new Enemy(2600, 100),
  new Enemy(3200, 150),
  new Enemy(3800, 100),
  new Enemy(4400, 150),
  new Enemy(5900, 150),
  new Enemy(6500, 150),
  new Enemy(8600, 150),
  
];

const keys = { right: { pressed: false }, left: { pressed: false } };

// ====== DRAW HEARTS ======
function drawHearts() {
  for (let i = 0; i < lives; i++) {
    ctx.drawImage(heartImg, 20 + i * 40, 10, 100, 90);
  }
}

// ====== DRAW COIN COUNTER ======
// ====== DRAW COIN COUNTER (TOP-RIGHT) ====== 
function drawCoinCounter() {
  ctx.font = "28px 'Press Start 2P', sans-serif";
  ctx.fillStyle = "yellow";
  const text = `Coins: ${coinCount}`;

  // Measure text width so it aligns nicely to the right
  const textWidth = ctx.measureText(text).width;

  // Position: 20px from the right edge, 60px from the top
  ctx.fillText(text, canvas.width - textWidth - 40, 60);
}


// ====== ANIMATE LOOP ======
function animate() {
  requestAnimationFrame(animate);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ===== INVINCIBILITY TIMER (NO FLICKER) =====
if (isInvincible) {
  invincibilityTimer--;
  if (invincibilityTimer <= 0) {
    isInvincible = false;
  }
}


  if (gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Game Over text
    ctx.fillStyle = "white";
    ctx.font = "48px 'Press Start 2P', sans-serif";
    ctx.fillText("GAME OVER!", canvas.width / 2 - 150, canvas.height / 2 - 100);

    // Show coins collected
    ctx.font = "28px 'Press Start 2P', sans-serif";
    ctx.fillStyle = "yellow";
    const coinText = `Coins Collected: ${coinCount}`;
    const textWidth = ctx.measureText(coinText).width;
    ctx.fillText(coinText, canvas.width / 2 - textWidth / 2, canvas.height / 2 - 30);

    // Restart instruction
    ctx.font = "20px 'Press Start 2P', sans-serif";
    ctx.fillStyle = "white";
    const restartText = "Press R to Restart";
    const restartWidth = ctx.measureText(restartText).width;
    ctx.fillText(restartText, canvas.width / 2 - restartWidth / 2, canvas.height / 2 + 50);

    return;
}


if (gameWin) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "48px 'Press Start 2P', sans-serif";
  ctx.fillText("YOU WIN!", canvas.width / 2 - 120, canvas.height / 2 - 100);

  ctx.font = "28px 'Press Start 2P', sans-serif";
  ctx.fillStyle = "yellow";
  const coinText = `Coins Collected: ${coinCount}`;
  const textWidth = ctx.measureText(coinText).width;
  ctx.fillText(coinText, canvas.width / 2 - textWidth / 2, canvas.height / 2 - 30);

  ctx.font = "20px 'Press Start 2P', sans-serif";
  ctx.fillStyle = "white";
  const restartText = "Press CTRL + R to Play Again";
  const restartWidth = ctx.measureText(restartText).width;
  ctx.fillText(restartText, canvas.width / 2 - restartWidth / 2, canvas.height / 2 + 50);

  return;
}



  layers.forEach(layer => { layer.update(); layer.draw(); });

  // Player movement + scrolling
  if (keys.right.pressed) {
    if (player.position.x < 400) {
      player.velocity.x = player.speed;
    } else {
      player.velocity.x = 0;
      scrollOffset += player.speed;
      platforms.forEach(p => p.position.x -= player.speed);
      enemies.forEach(e => e.position.x -= player.speed);
      coins.forEach(c => c.position.x -= player.speed);
      flyingEnemies.forEach(e => e.position.x -= player.speed);
      door.position.x -= player.speed;
      gameSpeed = 2;
    }
  } else if (keys.left.pressed) {
    if (player.position.x > 100) {
      player.velocity.x = -player.speed;
    } else if (scrollOffset > 0) {
      player.velocity.x = 0;
      scrollOffset -= player.speed;
      platforms.forEach(p => p.position.x += player.speed);
      enemies.forEach(e => e.position.x += player.speed);
      coins.forEach(c => c.position.x += player.speed);
      flyingEnemies.forEach(e => e.position.x += player.speed);
      door.position.x += player.speed;
      gameSpeed = -2;
    } else {
      player.velocity.x = -player.speed;
    }
  } else {
    player.velocity.x = 0;
    gameSpeed = 0;
  }

  player.update();

  if (player.position.y > dangerY) gameOver = true;

  platforms.forEach(p => p.draw());
  coins.forEach(c => c.update());

  // Coin collection
  coins.forEach((coin, index) => {
    const hb = player.getHitbox();
    if (
      hb.x < coin.position.x + coin.width &&
      hb.x + hb.width > coin.position.x &&
      hb.y < coin.position.y + coin.height &&
      hb.y + hb.height > coin.position.y
    ) {
      coinSound.currentTime = 0; 
      coinSound.play();          
      coins.splice(index, 1);
      coinCount++;
    }
  });

  // Door collision
 // Door collision (Win condition)
const hb = player.getHitbox();
if (
  hb.x < door.position.x + door.width &&
  hb.x + hb.width > door.position.x &&
  hb.y < door.position.y + door.height &&
  hb.y + hb.height > door.position.y
) {
  gameWin = true;
}
door.update();


  // Platform collision
  platforms.forEach(platform => {
    const hb = player.getHitbox();
    if (
      hb.y + hb.height <= platform.position.y &&
      hb.y + hb.height + player.velocity.y >= platform.position.y &&
      hb.x + hb.width >= platform.position.x &&
      hb.x <= platform.position.x + platform.width
    ) {
      player.velocity.y = 0;
      player.position.y = platform.position.y - player.hitboxOffset.y - player.hitboxOffset.height;
    }
  });

  enemies.forEach(e => e.update(platforms, gravity));

  // Player-enemy collision
enemies.forEach(e => {
  const hb = player.getHitbox();
  if (
    !isInvincible && // only trigger if NOT invincible
    hb.x < e.position.x + e.width &&
    hb.x + hb.width > e.position.x &&
    hb.y < e.position.y + e.height &&
    hb.y + hb.height > e.position.y
  ) {
    lives--;
    if (lives <= 0) {
      gameOver = true;
    } else {
      // Knockback player slightly away from the enemy
      if (player.position.x < e.position.x) {
        player.position.x -= 100; // knock left
      } else {
        player.position.x += 100; // knock right
      }

      player.velocity.y = -10; // bounce up slightly

      // Activate invincibility for 5 seconds 
      isInvincible = true;
      invincibilityTimer = 5 * 60;
    }
  }
});


  // ====== FLYING ENEMIES ======
  flyingEnemies.forEach((enemy, index) => {
    enemy.position.x += enemy.velocity.x;
    ctx.drawImage(
      flyingEnemyImg,
      enemy.frameX * FLY_FRAME_SIZE,
      enemy.frameY * FLY_FRAME_SIZE,
      FLY_FRAME_SIZE,
      FLY_FRAME_SIZE,
      enemy.position.x,
      enemy.position.y,
      enemy.width,
      enemy.height
    );
    if (enemy.position.x + enemy.width < 0) flyingEnemies.splice(index, 1);

    const hb = player.getHitbox();
    if (
      hb.x < enemy.position.x + enemy.width &&
      hb.x + hb.width > enemy.position.x &&
      hb.y < enemy.position.y + enemy.height &&
      hb.y + hb.height > enemy.position.y
    ) {
      lives -= 1;
      flyingEnemies.splice(index, 1);
      if (lives <= 0) gameOver = true;
    }
  });

  // Spawn randomly
  if (Math.random() < 0.003) spawnFlyingEnemy();

  ctx.globalAlpha = 1.0;

  drawHearts();
  drawCoinCounter(); 

}

playNextTrack();
animate();

// ====== CONTROLS ======
addEventListener('keydown', e => {
  switch (e.key.toLowerCase()) {
    case 'a': 
      keys.left.pressed = true; 
      break;
    case 'd': 
      keys.right.pressed = true; 
      break;
    case 'w':
      if (player.velocity.y === 0) {
        player.velocity.y = -20;
        jumpSound.currentTime = 0;
        jumpSound.play();
      }
      break;
    case 'r':
      if (gameOver || gameWin) { 
        restartGame();
      }
      break;
  }
});


addEventListener('keyup', e => {
  if (e.key === 'a') keys.left.pressed = false;
  if (e.key === 'd') keys.right.pressed = false;
});

// ===== Restart Game =====
function restartGame() {
  player.position = { x: 200, y: 100 };
  player.velocity = { x: 0, y: 0 };
  scrollOffset = 0;
  lives = 3;
  gameOver = false;

  bgMusics.forEach(m => {
    m.pause();
    m.currentTime = 0;
  });
  currentTrack = 0;
  playNextTrack();

  flyingEnemies.length = 0;
}
