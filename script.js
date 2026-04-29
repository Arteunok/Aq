const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const hud = {
  level: document.getElementById('level'),
  lives: document.getElementById('lives'),
  score: document.getElementById('score'),
  coins: document.getElementById('coins'),
  distance: document.getElementById('distance')
};

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const overlayBtn = document.getElementById('overlayBtn');

const GRAVITY = 0.9;
const GROUND_Y = 450;
const LEVEL_LENGTH = 7200;

const levelImageFiles = ['level1.jpg', 'level2.jpg', 'level3.jpg'];
const levelBackgrounds = [null, null, null];
const missingBackgrounds = [false, false, false];

function loadLevelBackground(levelIndex, file) {
  const img = new Image();
  img.onload = () => { levelBackgrounds[levelIndex] = img; missingBackgrounds[levelIndex] = false; };
  img.onerror = () => { missingBackgrounds[levelIndex] = true; };
  img.src = file;
}

levelImageFiles.forEach((file, i) => loadLevelBackground(i, file));

const game = {
  running: false,
  paused: false,
  transitioning: false,
  transitionTimer: 0,
  level: 1,
  lives: 3,
  score: 0,
  coins: 0,
  distance: 0,
  speed: 7,
  baseSpeed: 7,
  levelProgress: 0,
  invulnTimer: 0,
  bgOffsetFar: 0,
  bgOffsetMid: 0,
  bgOffsetNear: 0,
  player: { x: 120, y: GROUND_Y - 90, w: 56, h: 90, vy: 0, onGround: true, sliding: false, slideTimer: 0 },
  obstacles: [],
  coinsList: [],
  powerups: [],
  turboTimer: 0,
  shieldTimer: 0,
  magnetTimer: 0,
  spawnTimer: 0
};

function resetGame() {
  Object.assign(game, {
    running: false, paused: false, transitioning: false, transitionTimer: 0,
    level: 1, lives: 3, score: 0, coins: 0, distance: 0,
    speed: game.baseSpeed, levelProgress: 0, invulnTimer: 0,
    bgOffsetFar: 0, bgOffsetMid: 0, bgOffsetNear: 0,
    obstacles: [], coinsList: [], powerups: [],
    turboTimer: 0, shieldTimer: 0, magnetTimer: 0, spawnTimer: 0
  });
  game.player.y = GROUND_Y - 90;
  game.player.vy = 0;
  game.player.onGround = true;
  game.player.sliding = false;
  game.player.slideTimer = 0;
}

function spawnEntities() {
  game.spawnTimer--;
  if (game.spawnTimer > 0) return;
  game.spawnTimer = Math.max(22, 72 - game.level * 8);

  if (Math.random() < 0.63) {
    const types = ['cone', 'barricade', 'tire'];
    const type = types[Math.floor(Math.random() * types.length)];
    const defs = { cone: { w: 34, h: 56 }, barricade: { w: 62, h: 70 }, tire: { w: 54, h: 54 } };
    const d = defs[type];
    game.obstacles.push({ x: canvas.width + 30, y: GROUND_Y - d.h, w: d.w, h: d.h, type });
  }

  if (Math.random() < 0.74) {
    game.coinsList.push({ x: canvas.width + 30, y: GROUND_Y - (80 + Math.random() * 130), r: 12, swirl: Math.random() * Math.PI * 2 });
  }

  if (Math.random() < 0.09) {
    const types = ['turbo', 'shield', 'magnet'];
    game.powerups.push({ x: canvas.width + 30, y: GROUND_Y - 120, r: 14, type: types[Math.floor(Math.random() * types.length)] });
  }
}

const jump = () => { if (game.player.onGround && !game.transitioning) { game.player.vy = -16; game.player.onGround = false; } };
const slide = () => { if (game.player.onGround && !game.player.sliding && !game.transitioning) { game.player.sliding = true; game.player.slideTimer = 28; } };
const rectHit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function circleHitRect(circle, rect) {
  const cx = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
  const dx = circle.x - cx; const dy = circle.y - cy;
  return dx * dx + dy * dy < circle.r * circle.r;
}

function update() {
  if (!game.running || game.paused) return;

  if (game.transitioning) {
    game.transitionTimer--;
    if (game.transitionTimer <= 0) {
      game.transitioning = false;
      game.level += 1;
      game.levelProgress = 0;
      game.obstacles = []; game.coinsList = []; game.powerups = [];
    }
    return;
  }

  game.speed = game.baseSpeed + (game.level - 1) * 1.45 + (game.turboTimer > 0 ? 3.5 : 0);
  game.levelProgress += game.speed;
  game.distance += game.speed * 0.1;
  game.score += 1;

  game.bgOffsetFar += game.speed * 0.15;
  game.bgOffsetMid += game.speed * 0.35;
  game.bgOffsetNear += game.speed * 0.7;

  if (game.player.sliding && --game.player.slideTimer <= 0) game.player.sliding = false;

  game.player.vy += GRAVITY;
  game.player.y += game.player.vy;
  const pHeight = game.player.sliding ? 54 : 90;
  if (game.player.y >= GROUND_Y - pHeight) {
    game.player.y = GROUND_Y - pHeight;
    game.player.vy = 0;
    game.player.onGround = true;
  }
  game.player.h = pHeight;

  spawnEntities();
  const playerRect = { x: game.player.x, y: game.player.y, w: game.player.w, h: game.player.h };

  game.obstacles.forEach((o) => (o.x -= game.speed));
  game.coinsList.forEach((c) => {
    c.x -= game.speed; c.swirl += 0.15;
    if (game.magnetTimer > 0 && Math.abs(c.x - game.player.x) < 180) {
      c.x += (game.player.x + 20 - c.x) * 0.08;
      c.y += (game.player.y + 20 - c.y) * 0.08;
    }
  });
  game.powerups.forEach((p) => (p.x -= game.speed));

  game.coinsList = game.coinsList.filter((c) => {
    if (circleHitRect({ x: c.x, y: c.y, r: c.r }, playerRect)) { game.coins++; game.score += 25; return false; }
    return c.x > -30;
  });

  game.powerups = game.powerups.filter((p) => {
    if (circleHitRect({ x: p.x, y: p.y, r: p.r }, playerRect)) {
      if (p.type === 'turbo') game.turboTimer = 300;
      if (p.type === 'shield') game.shieldTimer = 300;
      if (p.type === 'magnet') game.magnetTimer = 300;
      game.score += 50; return false;
    }
    return p.x > -30;
  });

  if (game.invulnTimer > 0) game.invulnTimer--;
  game.obstacles = game.obstacles.filter((o) => {
    if (rectHit(o, playerRect) && game.invulnTimer <= 0) {
      if (game.shieldTimer > 0) game.shieldTimer = 0; else game.lives--;
      game.invulnTimer = 60;
      return false;
    }
    return o.x > -70;
  });

  if (game.turboTimer > 0) game.turboTimer--;
  if (game.shieldTimer > 0) game.shieldTimer--;
  if (game.magnetTimer > 0) game.magnetTimer--;

  if (game.levelProgress >= LEVEL_LENGTH) {
    if (game.level < 3) {
      game.transitioning = true;
      game.transitionTimer = 120;
    } else {
      endGame(true);
    }
  }

  if (game.lives <= 0) endGame(false);
  updateHud();
}

function drawCoverImage(img, xOffset = 0, alpha = 1) {
  const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const baseX = (canvas.width - drawW) / 2 + xOffset;
  const baseY = (canvas.height - drawH) / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, baseX, baseY, drawW, drawH);
  if (xOffset !== 0) {
    const repeatX = xOffset > 0 ? baseX - drawW : baseX + drawW;
    ctx.drawImage(img, repeatX, baseY, drawW, drawH);
  }
  ctx.restore();
}

function drawLevelBackground(level) {
  const image = levelBackgrounds[level - 1];

  if (image) {
    const farOffset = -(game.bgOffsetFar % canvas.width) * 0.2;
    const nearOffset = -(game.bgOffsetNear % canvas.width) * 0.5;
    drawCoverImage(image, farOffset, 0.72);
    drawCoverImage(image, nearOffset, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = '#0b1533';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (missingBackgrounds[level - 1]) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Falta ${levelImageFiles[level - 1]}`, canvas.width / 2, canvas.height / 2 - 8);
      ctx.font = '18px Arial';
      ctx.fillText('Sube level1.jpg, level2.jpg y level3.jpg junto a index.html', canvas.width / 2, canvas.height / 2 + 24);
    }
  }

  ctx.fillStyle = '#2d2f33';
  ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
}

function drawObstacle(o) {
  if (o.type === 'cone') {
    ctx.fillStyle = '#f57a21'; ctx.beginPath(); ctx.moveTo(o.x + o.w / 2, o.y); ctx.lineTo(o.x, o.y + o.h); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.fill();
    ctx.strokeStyle = '#fff4cf'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(o.x + 8, o.y + o.h - 18); ctx.lineTo(o.x + o.w - 8, o.y + o.h - 18); ctx.stroke();
  } else if (o.type === 'barricade') {
    ctx.fillStyle = '#d84e2a'; ctx.fillRect(o.x, o.y + 12, o.w, o.h - 12);
    ctx.fillStyle = '#fff3ce'; ctx.fillRect(o.x + 8, o.y + 20, o.w - 16, 10);
    ctx.fillRect(o.x + 8, o.y + 40, o.w - 16, 10);
  } else {
    ctx.fillStyle = '#1f1f1f'; ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#515151'; ctx.beginPath(); ctx.arc(o.x + o.w / 2, o.y + o.h / 2, o.w / 4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawCoin(c) {
  ctx.fillStyle = '#ffc933'; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffea95'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, c.r - 3, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#a56500'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 2; a += 0.3) {
    const rr = (c.r - 7) + a * 0.6;
    const x = c.x + Math.cos(a + c.swirl) * rr * 0.2;
    const y = c.y + Math.sin(a + c.swirl) * rr * 0.2;
    if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function draw() {
  drawLevelBackground(game.level);

  game.obstacles.forEach(drawObstacle);
  game.coinsList.forEach(drawCoin);

  game.powerups.forEach((p) => {
    const colors = { turbo: '#29f0ff', shield: '#7dff78', magnet: '#c679ff' };
    ctx.fillStyle = colors[p.type]; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#102030'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
    ctx.fillText(p.type[0].toUpperCase(), p.x, p.y + 4);
  });

  ctx.fillStyle = game.shieldTimer > 0 ? '#79ffd6' : '#ffffff';
  ctx.fillRect(game.player.x, game.player.y, game.player.w, game.player.h);

  if (game.turboTimer > 0) { ctx.fillStyle = '#00d4ff'; ctx.fillRect(game.player.x - 18, game.player.y + 12, 12, 20); }

  if (game.transitioning) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 48px Arial'; ctx.textAlign = 'center';
    ctx.fillText('Nivel completado', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '24px Arial';
    ctx.fillText(`Preparando nivel ${game.level + 1}...`, canvas.width / 2, canvas.height / 2 + 24);
  }
}

function loop() { update(); draw(); requestAnimationFrame(loop); }

function updateHud() {
  hud.level.textContent = String(game.level);
  hud.lives.textContent = String(game.lives);
  hud.score.textContent = String(game.score);
  hud.coins.textContent = String(game.coins);
  const levelRemaining = Math.max(0, Math.ceil((LEVEL_LENGTH - game.levelProgress) / 10));
  hud.distance.textContent = `${Math.floor(game.distance)}m · ${levelRemaining}m nivel`;
}
function showOverlay(title, text, btnText) {
  overlayTitle.textContent = title; overlayText.textContent = text; overlayBtn.textContent = btnText; overlay.classList.remove('hidden');
}
function endGame(win) {
  game.running = false;
  showOverlay(win ? '¡Meta final en Calacoto!' : 'Run Failed', win ? `Final: ${game.score} pts | ${game.coins} monedas` : 'Out of lives. Try again.', 'Play Again');
}

overlayBtn.addEventListener('click', () => {
  resetGame(); game.running = true; game.paused = false; overlay.classList.add('hidden'); updateHud();
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') jump();
  if (e.code === 'ArrowDown') slide();
  if (e.code === 'KeyP') game.paused = !game.paused;
  if (e.code === 'KeyR') { resetGame(); game.running = true; overlay.classList.add('hidden'); }
});

updateHud();
showOverlay('VORTEX RUN: LA PAZ', 'Usa level1.jpg, level2.jpg y level3.jpg como fondos reales.', 'Start Run');
loop();
