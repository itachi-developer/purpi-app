// ==========================================
// 0. TEMA GIORNO E NOTTE
// ==========================================
function applyTheme() {
    const hour = new Date().getHours();
    // Chiari fino alle 20 (Dalle 06:00 alle 19:59)
    if (hour >= 6 && hour < 20) {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}
applyTheme();
setInterval(applyTheme, 60000); // Controlla ogni minuto

// ==========================================
// 1. SISTEMA SALVATAGGIO (Tutti i giochi)
// ==========================================
let scores = JSON.parse(localStorage.getItem('octoProFinal')) || { 
    snake: { easy:0, med:0, hard:0 }, 
    pong:  { easy:0, med:0, hard:0 },
    tris:  { p1: 0, p2: 0 },
    navale:{ p1: 0, p2: 0 },
    dama:  { p1: 0, p2: 0 }
};
function saveScores() { localStorage.setItem('octoProFinal', JSON.stringify(scores)); updateLeaderboardUI(); }

function updateLeaderboardUI() {
    // Snake
    document.getElementById('lb-snake-easy').innerText = scores.snake.easy;
    document.getElementById('lb-snake-med').innerText = scores.snake.med;
    document.getElementById('lb-snake-hard').innerText = scores.snake.hard;
    // Pong
    document.getElementById('lb-pong-easy').innerText = scores.pong.easy;
    document.getElementById('lb-pong-med').innerText = scores.pong.med;
    document.getElementById('lb-pong-hard').innerText = scores.pong.hard;
    // Tris
    document.getElementById('lb-tris-p1').innerText = scores.tris.p1;
    document.getElementById('lb-tris-p2').innerText = scores.tris.p2;
    // Navale
    document.getElementById('lb-navale-p1').innerText = scores.navale.p1;
    document.getElementById('lb-navale-p2').innerText = scores.navale.p2;
    // Dama
    document.getElementById('lb-dama-p1').innerText = scores.dama.p1;
    document.getElementById('lb-dama-p2').innerText = scores.dama.p2;
}
updateLeaderboardUI();

// ==========================================
// 2. NAVIGAZIONE APP
// ==========================================
const views = document.querySelectorAll('.view');
let isSnakeActive = false, isPongActive = false;
let isSnakePaused = false, isPongPaused = false;

document.querySelectorAll('.open-game').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        views.forEach(v => v.classList.remove('active'));
        document.getElementById(target).classList.add('active');
        
        isSnakeActive = (target === 'snake');
        isPongActive = (target === 'pong');
        
        if(target === 'snake') {
            document.getElementById('snake-score').innerText = '0';
            document.getElementById('snake-high').innerText = scores.snake[document.getElementById('snake-diff').value];
            document.getElementById('snake-overlay').style.display = 'none';
        }
    });
});

document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        isSnakeActive = false; isPongActive = false;
        views.forEach(v => v.classList.remove('active'));
        document.getElementById('home').classList.add('active');
    });
});

// ==========================================
// 3. POLPO SNAKE (Con Pausa e Overlay)
// ==========================================
const snakeCanvas = document.getElementById('snakeCanvas'); const sCtx = snakeCanvas.getContext('2d');
const gridSize = 16; const tileCount = 20; 
let snake = []; let dx = 0, dy = 0, foodX, foodY, rocks = [];
let snakeScore = 0, currentDiffS = 'med', gameSpeed = 120, lastRenderTime = 0;

document.getElementById('start-snake').addEventListener('click', () => initSnake());
document.getElementById('retry-snake').addEventListener('click', () => initSnake());

document.getElementById('pause-snake').addEventListener('click', () => {
    if(!isSnakeActive) return;
    isSnakePaused = !isSnakePaused;
    document.getElementById('pause-snake').innerHTML = isSnakePaused ? '<i class="fa-solid fa-play"></i>' : '<i class="fa-solid fa-pause"></i>';
});

function initSnake() {
    currentDiffS = document.getElementById('snake-diff').value;
    let numRocks = currentDiffS === 'easy' ? 3 : (currentDiffS === 'med' ? 8 : 15);
    gameSpeed = currentDiffS === 'easy' ? 140 : (currentDiffS === 'med' ? 100 : 70);
    snake = [{ x: 10, y: 10 }]; dx = 0; dy = 0; snakeScore = 0; isSnakePaused = false;
    document.getElementById('pause-snake').innerHTML = '<i class="fa-solid fa-pause"></i>';
    document.getElementById('snake-score').innerText = snakeScore;
    document.getElementById('snake-high').innerText = scores.snake[currentDiffS];
    document.getElementById('snake-overlay').style.display = 'none';
    
    rocks = [];
    for(let i=0; i<numRocks; i++) {
        let rx, ry, isValid = false;
        while(!isValid) { rx=Math.floor(Math.random()*tileCount); ry=Math.floor(Math.random()*tileCount); if(!(rx>5 && rx<15 && ry>5 && ry<15)) isValid = true; }
        rocks.push({x: rx, y: ry});
    }
    placeFoodS(); isSnakeActive = true; window.requestAnimationFrame(snakeLoop);
}

function placeFoodS() {
    let valid = false;
    while(!valid) {
        foodX = Math.floor(Math.random()*tileCount); foodY = Math.floor(Math.random()*tileCount);
        valid = !rocks.some(r => r.x===foodX && r.y===foodY) && !snake.some(s => s.x===foodX && s.y===foodY);
    }
}

function snakeLoop(timestamp) {
    if (!isSnakeActive) return; window.requestAnimationFrame(snakeLoop);
    if (isSnakePaused) return; // Se in pausa non aggiornare
    if (timestamp - lastRenderTime < gameSpeed) return; lastRenderTime = timestamp;
    
    if (dx === 0 && dy === 0) { drawSnakeMap(); return; }
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    
    // Morte
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount || snake.some(p => p.x===head.x && p.y===head.y) || rocks.some(r => r.x===head.x && r.y===head.y)) {
        isSnakeActive = false; 
        document.getElementById('snake-final-score').innerText = snakeScore;
        document.getElementById('snake-overlay').style.display = 'flex';
        return;
    }
    snake.unshift(head);
    if (head.x === foodX && head.y === foodY) {
        snakeScore += 10; document.getElementById('snake-score').innerText = snakeScore;
        if(snakeScore > scores.snake[currentDiffS]) { scores.snake[currentDiffS] = snakeScore; document.getElementById('snake-high').innerText = snakeScore; saveScores(); }
        placeFoodS();
    } else { snake.pop(); }
    drawSnakeMap();
}

function drawSnakeMap() {
    sCtx.clearRect(0, 0, snakeCanvas.width, snakeCanvas.height); sCtx.font = "14px Arial";
    rocks.forEach(r => sCtx.fillText('🪨', r.x * gridSize, r.y * gridSize + 13)); sCtx.fillText('🐟', foodX * gridSize, foodY * gridSize + 13);
    snake.forEach((part, i) => {
        if (i === 0) sCtx.fillText('🐙', part.x*gridSize-1, part.y*gridSize+13);
        else { sCtx.fillStyle = '#00e5ff'; sCtx.beginPath(); sCtx.arc(part.x*gridSize+gridSize/2, part.y*gridSize+gridSize/2, gridSize/2.5, 0, Math.PI*2); sCtx.fill(); }
    });
}
function sDir(ndx, ndy) { if(dx!==0 && ndx!==0) return; if(dy!==0 && ndy!==0) return; dx=ndx; dy=ndy; }
['click', 'touchstart'].forEach(evt => {
    document.getElementById('up').addEventListener(evt, e=>{e.preventDefault(); sDir(0,-1);});
    document.getElementById('down').addEventListener(evt, e=>{e.preventDefault(); sDir(0,1);});
    document.getElementById('left').addEventListener(evt, e=>{e.preventDefault(); sDir(-1,0);});
    document.getElementById('right').addEventListener(evt, e=>{e.preventDefault(); sDir(1,0);});
});

// ==========================================
// 4. DYBALA PONG (Con Pausa vera)
// ==========================================
const pCanvas = document.getElementById('pongCanvas'); const pCtx = pCanvas.getContext('2d');
const pw = 70, ph = 15, netW = 120;
const ball = { x: 160, y: 210, r: 10, dx: 0, dy: 0, speed: 4.5 };
const dybala = { x: 125, y: 390, score: 0 }; const cpu = { x: 125, y: 15, score: 0 };
let pongDiff = 'med'; 

document.getElementById('start-pong').addEventListener('click', () => {
    pongDiff = document.getElementById('pong-diff').value; dybala.score = 0; cpu.score = 0; 
    document.getElementById('pong-score-p1').innerText = 0; document.getElementById('pong-score-cpu').innerText = 0;
    isPongActive = true; isPongPaused = false;
    document.getElementById('pong-overlay').style.display = 'none';
    resetSoccerBall(); window.requestAnimationFrame(pongLoop);
});

// Tasto Pausa Navale
document.getElementById('pause-pong').addEventListener('click', () => {
    if(!isPongActive) return;
    isPongPaused = true;
    document.getElementById('pong-final-text').innerText = "In Pausa";
    document.getElementById('pong-overlay').style.display = 'flex';
});
// Riprendi
document.getElementById('resume-pong').addEventListener('click', () => {
    isPongPaused = false;
    document.getElementById('pong-overlay').style.display = 'none';
});

function resetSoccerBall() {
    ball.x = pCanvas.width/2; ball.y = pCanvas.height/2; ball.dx = 0; ball.dy = 0;
    setTimeout(() => { if(!isPongActive || isPongPaused) return; ball.dy = Math.random()>0.5 ? ball.speed : -ball.speed; ball.dx = (Math.random()*4)-2; }, 800);
}

pCanvas.addEventListener('touchmove', e => {
    e.preventDefault(); if(!isPongActive || isPongPaused) return;
    let touchX = e.touches[0].clientX - pCanvas.getBoundingClientRect().left;
    dybala.x = Math.max(0, Math.min(touchX - pw/2, pCanvas.width - pw));
}, {passive: false});

function pongLoop() { if(!isPongActive) return; updateSoccer(); drawSoccer(); window.requestAnimationFrame(pongLoop); }

function updateSoccer() {
    if(isPongPaused) return; // Blocco totale se in pausa
    let cpuSpd = pongDiff==='easy'?0.05 : (pongDiff==='med'?0.1:0.18);
    cpu.x += (ball.x - (cpu.x + pw/2)) * cpuSpd; cpu.x = Math.max(0, Math.min(cpu.x, pCanvas.width-pw));
    
    // Se la palla è ferma al centro non muoverla
    if (ball.dx === 0 && ball.dy === 0) return;
    
    ball.x += ball.dx; ball.y += ball.dy;
    
    if(ball.x-ball.r < 0 || ball.x+ball.r > pCanvas.width) ball.dx = -ball.dx;

    if(ball.y-ball.r < 0) {
        if(ball.x > pCanvas.width/2-netW/2 && ball.x < pCanvas.width/2+netW/2) { dybala.score++; document.getElementById('pong-score-p1').innerText = dybala.score; resetSoccerBall(); }
        else ball.dy = -ball.dy;
    } else if (ball.y+ball.r > pCanvas.height) {
        if(ball.x > pCanvas.width/2-netW/2 && ball.x < pCanvas.width/2+netW/2) { cpu.score++; document.getElementById('pong-score-cpu').innerText = cpu.score; resetSoccerBall(); }
        else ball.dy = -ball.dy;
    }
    
    if(ball.dy>0 && ball.y+ball.r > dybala.y && ball.x+ball.r > dybala.x && ball.x-ball.r < dybala.x+pw) {
        ball.dy = -ball.speed; ball.y = dybala.y-ball.r; ball.dx = ((ball.x-(dybala.x+pw/2))/(pw/2))*4;
    }
    if(ball.dy<0 && ball.y-ball.r < cpu.y+ph && ball.x+ball.r > cpu.x && ball.x-ball.r < cpu.x+pw) {
        ball.dy = ball.speed; ball.y = cpu.y+ph+ball.r; ball.dx = ((ball.x-(cpu.x+pw/2))/(pw/2))*4;
    }
}

function drawSoccer() {
    pCtx.clearRect(0,0,pCanvas.width,pCanvas.height);
    pCtx.strokeStyle = 'rgba(255,255,255,0.3)'; pCtx.lineWidth = 2;
    pCtx.beginPath(); pCtx.moveTo(0, pCanvas.height/2); pCtx.lineTo(pCanvas.width, pCanvas.height/2); pCtx.stroke();
    pCtx.beginPath(); pCtx.arc(pCanvas.width/2, pCanvas.height/2, 30, 0, Math.PI*2); pCtx.stroke();
    pCtx.strokeRect(pCanvas.width/2-netW/2, 0, netW, 40); pCtx.strokeRect(pCanvas.width/2-netW/2, pCanvas.height-40, netW, 40);

    pCtx.fillStyle = '#00e5ff'; pCtx.fillRect(dybala.x, dybala.y, pw, ph); 
    pCtx.fillStyle = '#ff2a6d'; pCtx.fillRect(cpu.x, cpu.y, pw, ph); 
    pCtx.font = "18px Arial"; pCtx.fillText('⚽', ball.x-10, ball.y+6);
}

// ==========================================
// 5. TRIS OCEANICO (Niente Alert)
// ==========================================
const tCells = document.querySelectorAll('.tris-board .cell'); const tStatus = document.getElementById('tris-status');
let tBoard = ['', '', '', '', '', '', '', '', '']; let isTrisActive = true; let currentTurn = '🐙';
const winC = [ [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6] ];

document.getElementById('tris-score-p1').innerText = scores.tris.p1;
document.getElementById('tris-score-p2').innerText = scores.tris.p2;

tCells.forEach(cell => cell.addEventListener('click', (e) => {
    let idx = e.target.getAttribute('data-index'); if (tBoard[idx] !== '' || !isTrisActive) return;
    tBoard[idx] = currentTurn; e.target.innerText = currentTurn;
    if (winC.some(c => tBoard[c[0]] && tBoard[c[0]] === tBoard[c[1]] && tBoard[c[0]] === tBoard[c[2]])) {
        tStatus.innerText = `Fine Partita! Vince ${currentTurn === '🐙' ? 'Polpo' : 'Granchio'}`;
        if(currentTurn === '🐙') scores.tris.p1++; else scores.tris.p2++;
        document.getElementById('tris-score-p1').innerText = scores.tris.p1; document.getElementById('tris-score-p2').innerText = scores.tris.p2;
        saveScores(); isTrisActive = false; return;
    }
    if (!tBoard.includes('')) { tStatus.innerText = 'Pareggio!'; isTrisActive = false; return; }
    currentTurn = currentTurn === '🐙' ? '🦀' : '🐙'; tStatus.innerText = `Tocca a: ${currentTurn}`;
}));
document.getElementById('reset-tris').addEventListener('click', () => { tBoard=['','','','','','','','','']; isTrisActive=true; currentTurn='🐙'; tStatus.innerText='Tocca a: 🐙'; tCells.forEach(c=>c.innerText=''); });

// ==========================================
// 6. NAVALE OCEANICA (Niente Alert)
// ==========================================
let p1Grid=Array(36).fill(0), p2Grid=Array(36).fill(0), p1Rev=Array(36).fill(false), p2Rev=Array(36).fill(false);
let nTurn=1, nHits1=0, nHits2=0, nPhase='setup1'; const nShips=[3,2,2]; let cShipIdx=0; let isHoriz=true;
let isNavaleOver = false;

function initNavale() {
    p1Grid.fill(0); p2Grid.fill(0); p1Rev.fill(false); p2Rev.fill(false); nTurn=1; nHits1=0; nHits2=0; nPhase='setup1'; cShipIdx=0; isNavaleOver = false;
    document.getElementById('navale-setup').style.display='flex'; document.getElementById('navale-overlay').style.display='none'; drawNavale();
}
document.getElementById('btn-rotate').addEventListener('click', () => { isHoriz=!isHoriz; document.getElementById('btn-rotate').innerText=isHoriz?'Gira Nave ➡️':'Gira Nave ⬇️'; });

function drawNavale() {
    const b = document.getElementById('board-navale'); b.innerHTML='';
    let grid = nPhase==='setup1'?p1Grid:(nPhase==='setup2'?p2Grid:(nTurn===1?p2Grid:p1Grid));
    let rev = nTurn===1?p2Rev:p1Rev;
    for(let i=0;i<36;i++) {
        let div=document.createElement('div'); div.className='cell-navale';
        if(nPhase.includes('setup')) {
            if(grid[i]===1) div.classList.add('ship'); div.addEventListener('click',()=>placeShip(i,grid));
            document.getElementById('navale-status').innerText=`Giocatore ${nPhase==='setup1'?'1':'2'}: Posiziona navi`; document.getElementById('ship-len').innerText=nShips[cShipIdx]||0;
        } else {
            if(rev[i]) { if(grid[i]===1) { div.classList.add('hit'); div.innerText='💥'; } else { div.classList.add('miss'); div.innerText='💧'; } }
            else div.addEventListener('click',()=>shoot(i,grid,rev));
            if(!isNavaleOver) document.getElementById('navale-status').innerText=`Attacca Giocatore ${nTurn===1?'2':'1'}!`;
        }
        b.appendChild(div);
    }
}
function placeShip(idx,grid) {
    if(cShipIdx>=nShips.length) return; let len=nShips[cShipIdx], r=Math.floor(idx/6), c=idx%6;
    if(isHoriz&&c+len>6) return; if(!isHoriz&&r+len>6) return;
    for(let i=0;i<len;i++) if(grid[isHoriz?idx+i:idx+(i*6)]!==0) return;
    for(let i=0;i<len;i++) grid[isHoriz?idx+i:idx+(i*6)]=1;
    cShipIdx++; drawNavale();
    if(cShipIdx>=nShips.length) {
        if(nPhase==='setup1') { nPhase='setup2'; cShipIdx=0; document.getElementById('navale-overlay-title').innerText = "Passa il telefono!"; document.getElementById('navale-overlay').style.display='flex'; }
        else { nPhase='battle'; document.getElementById('navale-setup').style.display='none'; nTurn=1; document.getElementById('navale-overlay-title').innerText = "Battaglia Iniziata!"; document.getElementById('navale-overlay').style.display='flex'; }
    }
}
function shoot(idx,grid,rev) {
    if(isNavaleOver) return;
    if(rev[idx]) return; rev[idx]=true; drawNavale();
    if(grid[idx]===1) { 
        nTurn===1?nHits1++:nHits2++; 
        if(nHits1===7||nHits2===7) { 
            isNavaleOver = true;
            document.getElementById('navale-status').innerText=`Fine Partita! Vince G${nTurn}!`; 
            if(nTurn===1) scores.navale.p1++; else scores.navale.p2++;
            saveScores();
            return; 
        } 
    }
    setTimeout(()=>{ nTurn=nTurn===1?2:1; document.getElementById('navale-overlay-title').innerText = "Passa il telefono!"; document.getElementById('navale-overlay').style.display='flex'; }, 800);
}
document.getElementById('btn-navale-ready').addEventListener('click', ()=>{document.getElementById('navale-overlay').style.display='none'; drawNavale();});
document.getElementById('reset-navale').addEventListener('click', initNavale); initNavale();

// ==========================================
// 7. DAMA MARINA (Niente Alert)
// ==========================================
let dGrid=[], turnD=1, selPos=null, p1Pieces=12, p2Pieces=12;
let isDamaActive = true;

document.getElementById('dama-score-p1').innerText = scores.dama.p1;
document.getElementById('dama-score-p2').innerText = scores.dama.p2;

function initDama() {
    dGrid=Array(64).fill(0); turnD=1; selPos=null; p1Pieces=12; p2Pieces=12; isDamaActive = true;
    document.getElementById('dama-overlay').style.display = 'none';
    for(let r=0;r<8;r++) for(let c=0;c<8;c++) if((r+c)%2!==0) { if(r<3) dGrid[r*8+c]=1; else if(r>4) dGrid[r*8+c]=2; }
    updateDScore(); drawDama();
}
function updateDScore() { document.getElementById('dama-status').innerText = `Tocca a: ${turnD===1?'🐚 Conchiglie':'⭐ Stelle'}`; }

function drawDama() {
    const b = document.getElementById('dama-board'); b.innerHTML='';
    for(let i=0;i<64;i++) {
        let div=document.createElement('div'); let r=Math.floor(i/8), c=i%8; div.className=`dama-cell ${(r+c)%2===0?'white':'black'}`;
        if(selPos===i) div.classList.add('selected');
        if(dGrid[i]!==0) { let p=document.createElement('div'); p.className='piece'; p.innerText=dGrid[i]===1?'🐚':'⭐'; div.appendChild(p); }
        div.addEventListener('click',()=>handleDamaClick(i)); b.appendChild(div);
    }
}
function handleDamaClick(idx) {
    if(!isDamaActive) return;
    let r=Math.floor(idx/8), c=idx%8; if((r+c)%2===0) return;
    if(selPos===null) { if(dGrid[idx]===turnD) { selPos=idx; drawDama(); } }
    else {
        if(selPos===idx) { selPos=null; drawDama(); return; }
        let sr=Math.floor(selPos/8), sc=selPos%8, dr=r-sr, dc=Math.abs(c-sc), dir=turnD===1?1:-1;
        if(dr===dir && dc===1 && dGrid[idx]===0) { dGrid[idx]=turnD; dGrid[selPos]=0; turnD=turnD===1?2:1; selPos=null; }
        else if(dr===dir*2 && dc===2 && dGrid[idx]===0) {
            let midIdx=(sr+dir)*8 + (c>sc?sc+1:sc-1);
            if(dGrid[midIdx]!==0 && dGrid[midIdx]!==turnD) { dGrid[idx]=turnD; dGrid[selPos]=0; dGrid[midIdx]=0; turnD===1?p2Pieces--:p1Pieces--; turnD=turnD===1?2:1; selPos=null; } else selPos=null;
        } else selPos=null;
        updateDScore(); drawDama();
        
        if(p1Pieces===0 || p2Pieces===0) {
            isDamaActive = false;
            let vince = p1Pieces===0 ? "Stelle ⭐" : "Conchiglie 🐚";
            if(p1Pieces===0) scores.dama.p2++; else scores.dama.p1++;
            saveScores();
            document.getElementById('dama-overlay-title').innerText = `Fine Partita!\nVince: ${vince}`;
            document.getElementById('dama-overlay').style.display = 'flex';
        }
    }
}
document.getElementById('reset-dama').addEventListener('click', initDama); 
document.getElementById('retry-dama').addEventListener('click', initDama); 
initDama();