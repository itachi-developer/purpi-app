// ==========================================
// 1. SISTEMA SALVATAGGIO AVANZATO (Record per Difficoltà)
// ==========================================
let scores = JSON.parse(localStorage.getItem('octopusArcade')) || {
    snake: { easy: 0, med: 0, hard: 0 },
    pong: { easy: 0, med: 0, hard: 0 }
};
function saveScores() { localStorage.setItem('octopusArcade', JSON.stringify(scores)); }

// ==========================================
// 2. NAVIGAZIONE MENU
// ==========================================
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item');

function switchView(targetID) {
    views.forEach(v => v.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));
    document.getElementById(targetID).classList.add('active');
    let navIcon = document.querySelector(`.nav-item[data-target="${targetID}"]`);
    if(navIcon) navIcon.classList.add('active');

    // Ferma i loop se cambi pagina
    isSnakeActive = (targetID === 'snake');
    isPongActive = (targetID === 'pong');
}

document.querySelectorAll('.menu-card, .nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.getAttribute('data-target')));
});

// ==========================================
// 3. POLPO SNAKE (Con ostacoli e Difficoltà)
// ==========================================
const snakeCanvas = document.getElementById('snakeCanvas');
const sCtx = snakeCanvas.getContext('2d');
const sDiffSelect = document.getElementById('snake-diff');
let isSnakeActive = false;

// Settings di gioco
const gridSize = 20; 
const tileCount = snakeCanvas.width / gridSize; // 400/20 = 20 tiles
let snake = []; let dx = 0; let dy = 0; 
let foodX, foodY; let rocks = [];
let snakeScore = 0; let currentDiffS = 'med';
let gameSpeed = 120; let lastRenderTime = 0;

function startSnake() {
    currentDiffS = sDiffSelect.value;
    // Imposta velocità e rocce in base alla difficoltà
    let numRocks = 0;
    if(currentDiffS === 'easy') { gameSpeed = 150; numRocks = 3; }
    if(currentDiffS === 'med') { gameSpeed = 100; numRocks = 8; }
    if(currentDiffS === 'hard') { gameSpeed = 65; numRocks = 15; }

    snake = [{ x: 10, y: 10 }]; dx = 0; dy = 0; snakeScore = 0;
    document.getElementById('snake-score').innerText = snakeScore;
    document.getElementById('snake-high').innerText = scores.snake[currentDiffS];
    
    generateRocks(numRocks);
    placeFood();
    isSnakeActive = true;
    window.requestAnimationFrame(snakeLoop);
}

document.getElementById('start-snake').addEventListener('click', startSnake);

function generateRocks(num) {
    rocks = [];
    for(let i=0; i<num; i++) {
        let rx, ry, isValid = false;
        while(!isValid) {
            rx = Math.floor(Math.random() * tileCount); ry = Math.floor(Math.random() * tileCount);
            // Non spawnare rocce vicino alla partenza
            if(rx > 5 && rx < 15 && ry > 5 && ry < 15) continue;
            isValid = true;
        }
        rocks.push({x: rx, y: ry});
    }
}

function placeFood() {
    let valid = false;
    while(!valid) {
        foodX = Math.floor(Math.random() * tileCount); foodY = Math.floor(Math.random() * tileCount);
        valid = !rocks.some(r => r.x === foodX && r.y === foodY) && !snake.some(s => s.x === foodX && s.y === foodY);
    }
}

function snakeLoop(timestamp) {
    if (!isSnakeActive) return;
    window.requestAnimationFrame(snakeLoop);
    if (timestamp - lastRenderTime < gameSpeed) return;
    lastRenderTime = timestamp;
    
    updateSnake();
    drawSnakeMap();
}

function updateSnake() {
    if (dx === 0 && dy === 0) return;
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // Controlla collisioni (Muri, Corpo, Rocce)
    let hitWall = head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount;
    let hitBody = snake.some(p => p.x === head.x && p.y === head.y);
    let hitRock = rocks.some(r => r.x === head.x && r.y === head.y);

    if (hitWall || hitBody || hitRock) {
        isSnakeActive = false; // Game Over
        alert(`Game Over! Punti: ${snakeScore}`);
        return;
    }

    snake.unshift(head);
    
    // Mangia il cibo (Pesciolino)
    if (head.x === foodX && head.y === foodY) {
        snakeScore += 10;
        document.getElementById('snake-score').innerText = snakeScore;
        if(snakeScore > scores.snake[currentDiffS]) {
            scores.snake[currentDiffS] = snakeScore;
            document.getElementById('snake-high').innerText = snakeScore;
            saveScores();
        }
        placeFood();
    } else {
        snake.pop();
    }
}

function drawSnakeMap() {
    sCtx.clearRect(0, 0, snakeCanvas.width, snakeCanvas.height);
    sCtx.font = "18px Arial";
    
    // Rocce
    rocks.forEach(r => sCtx.fillText('🪨', r.x * gridSize, r.y * gridSize + 16));
    // Cibo (Granchio/Pesce)
    sCtx.fillText('🦀', foodX * gridSize, foodY * gridSize + 16);
    
    // Disegna Polpo Snake
    snake.forEach((part, i) => {
        if (i === 0) {
            sCtx.fillText('🐙', part.x * gridSize -2, part.y * gridSize + 16); // Testa polpo
        } else {
            sCtx.fillStyle = '#ff7b54'; // Colore tentacoli
            sCtx.beginPath();
            sCtx.arc(part.x * gridSize + gridSize/2, part.y * gridSize + gridSize/2, gridSize/2.5, 0, Math.PI*2);
            sCtx.fill();
        }
    });
}

// Controlli Snake
function sDir(ndx, ndy) { if(dx!==0 && ndx!==0) return; if(dy!==0 && ndy!==0) return; dx=ndx; dy=ndy; }
['click', 'touchstart'].forEach(evt => {
    document.getElementById('up').addEventListener(evt, e => { e.preventDefault(); sDir(0,-1); });
    document.getElementById('down').addEventListener(evt, e => { e.preventDefault(); sDir(0,1); });
    document.getElementById('left').addEventListener(evt, e => { e.preventDefault(); sDir(-1,0); });
    document.getElementById('right').addEventListener(evt, e => { e.preventDefault(); sDir(1,0); });
});

// ==========================================
// 4. DYBALA PONG (Tema Calcio ⚽)
// ==========================================
const pCanvas = document.getElementById('pongCanvas');
const pCtx = pCanvas.getContext('2d');
let isPongActive = false;
let pongDiff = 'med';

// Immagini giocatori (Sostituisci questi src con vere immagini png nella cartella assets se vuoi!)
const imgDybala = new Image(); imgDybala.src = 'assets/dybala.png'; 
const imgPortiere = new Image(); imgPortiere.src = 'assets/portiere.png';

// Setup Pong
const pw = 80; const ph = 20; // Racchette più larghe
const ball = { x: 200, y: 250, r: 12, dx: 0, dy: 0, speed: 5 };
const dybala = { x: 160, y: 460, score: 0 };
const cpu = { x: 160, y: 20, score: 0 };
const netWidth = 140; // Larghezza della porta in cui fare gol

document.getElementById('start-pong').addEventListener('click', () => {
    pongDiff = document.getElementById('pong-diff').value;
    dybala.score = 0; cpu.score = 0; updatePongScore();
    isPongActive = true; resetSoccerBall();
    window.requestAnimationFrame(pongLoop);
});

function updatePongScore() {
    document.getElementById('pong-score-p1').innerText = dybala.score;
    document.getElementById('pong-score-cpu').innerText = cpu.score;
}

function resetSoccerBall() {
    ball.x = pCanvas.width / 2; ball.y = pCanvas.height / 2;
    ball.dx = 0; ball.dy = 0;
    setTimeout(() => {
        if(!isPongActive) return;
        ball.dy = Math.random() > 0.5 ? ball.speed : -ball.speed;
        ball.dx = (Math.random() * 4) - 2; // Tra -2 e +2
    }, 1000);
}

// Touch Drag Dybala
pCanvas.addEventListener('touchmove', e => {
    e.preventDefault(); if(!isPongActive) return;
    let rect = pCanvas.getBoundingClientRect();
    let touchX = e.touches[0].clientX - rect.left;
    dybala.x = Math.max(0, Math.min(touchX - pw/2, pCanvas.width - pw));
}, {passive: false});

function pongLoop() { if (!isPongActive) return; updateSoccer(); drawSoccerField(); window.requestAnimationFrame(pongLoop); }

function updateSoccer() {
    // Intelligenza Portiere (Più veloce se 'hard')
    let cpuSpeed = pongDiff === 'easy' ? 0.05 : (pongDiff === 'med' ? 0.1 : 0.2);
    cpu.x += (ball.x - (cpu.x + pw/2)) * cpuSpeed;
    cpu.x = Math.max(0, Math.min(cpu.x, pCanvas.width - pw));

    ball.x += ball.dx; ball.y += ball.dy;

    // Rimbalzo laterale (Falli laterali)
    if(ball.x - ball.r < 0 || ball.x + ball.r > pCanvas.width) ball.dx = -ball.dx;

    // GOL o RIMBALZO SUL FONDO!
    if(ball.y - ball.r < 0) {
        // Linea alta (CPU). È un Gol per Dybala se la palla entra nella porta (centrale)
        if(ball.x > (pCanvas.width/2 - netWidth/2) && ball.x < (pCanvas.width/2 + netWidth/2)) {
            dybala.score++; updatePongScore(); resetSoccerBall();
        } else {
            ball.dy = -ball.dy; // Fuori dalla porta, rimbalza (palo/cartelloni)
        }
    } 
    else if (ball.y + ball.r > pCanvas.height) {
        // Linea bassa (Dybala). Gol per la CPU
        if(ball.x > (pCanvas.width/2 - netWidth/2) && ball.x < (pCanvas.width/2 + netWidth/2)) {
            cpu.score++; updatePongScore(); resetSoccerBall();
        } else {
            ball.dy = -ball.dy;
        }
    }

    // Collisione con Dybala
    if(ball.dy > 0 && ball.y + ball.r > dybala.y && ball.x + ball.r > dybala.x && ball.x - ball.r < dybala.x + pw) {
        ball.dy = -ball.speed; ball.y = dybala.y - ball.r;
        ball.dx = ((ball.x - (dybala.x + pw/2)) / (pw/2)) * 4;
    }
    // Collisione con Portiere CPU
    if(ball.dy < 0 && ball.y - ball.r < cpu.y + ph && ball.x + ball.r > cpu.x && ball.x - ball.r < cpu.x + pw) {
        ball.dy = ball.speed; ball.y = cpu.y + ph + ball.r;
        ball.dx = ((ball.x - (cpu.x + pw/2)) / (pw/2)) * 4;
    }
}

function drawSoccerField() {
    // Sfondo erba
    pCtx.fillStyle = '#4CAF50'; pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
    
    // Linee del campo bianche
    pCtx.strokeStyle = 'white'; pCtx.lineWidth = 3;
    
    // Centrocampo
    pCtx.beginPath(); pCtx.moveTo(0, pCanvas.height/2); pCtx.lineTo(pCanvas.width, pCanvas.height/2); pCtx.stroke();
    pCtx.beginPath(); pCtx.arc(pCanvas.width/2, pCanvas.height/2, 40, 0, Math.PI*2); pCtx.stroke();
    
    // Porte (Aree di rigore disegnate)
    pCtx.strokeRect(pCanvas.width/2 - netWidth/2, 0, netWidth, 50); // Porta CPU
    pCtx.strokeRect(pCanvas.width/2 - netWidth/2, pCanvas.height - 50, netWidth, 50); // Porta Dybala

    // Dybala (Se l'immagine non carica, disegna una racchetta azzurra)
    if(imgDybala.complete && imgDybala.naturalWidth !== 0) {
        pCtx.drawImage(imgDybala, dybala.x, dybala.y, pw, ph*2);
    } else {
        pCtx.fillStyle = '#00d2ff'; pCtx.fillRect(dybala.x, dybala.y, pw, ph);
    }

    // Portiere (CPU)
    if(imgPortiere.complete && imgPortiere.naturalWidth !== 0) {
        pCtx.drawImage(imgPortiere, cpu.x, cpu.y, pw, ph*2);
    } else {
        pCtx.fillStyle = '#ff4b2b'; pCtx.fillRect(cpu.x, cpu.y, pw, ph);
    }

    // Pallone ⚽
    pCtx.font = "20px Arial";
    pCtx.fillText('⚽', ball.x - 10, ball.y + 7);
}
