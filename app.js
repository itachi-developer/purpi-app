// ==========================================
// 0. GESTIONE BENVENUTO E TEMA
// ==========================================
if(!localStorage.getItem('purpiAppSeen')) {
    document.getElementById('welcome-modal').style.display = 'flex';
}
document.getElementById('btn-welcome-close').addEventListener('click', () => {
    localStorage.setItem('purpiAppSeen', 'true');
    document.getElementById('welcome-modal').style.display = 'none';
});

function applyTheme() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 20) document.body.classList.add('light-theme');
    else document.body.classList.remove('light-theme');
}
applyTheme(); setInterval(applyTheme, 60000);

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        if (isSnakeActive && !isSnakePaused) document.getElementById('pause-snake').click();
        if (isPongActive && !isPongPaused) document.getElementById('pause-pong').click();
    }
});

// ==========================================
// 1. NOMI, STORICO PROFILI E SALVATAGGI
// ==========================================
let playerName1 = localStorage.getItem('octoName1') || 'Giocatore 1';
let playerName2 = localStorage.getItem('octoName2') || 'Giocatore 2';

const inputP1 = document.getElementById('input-p1'); const inputP2 = document.getElementById('input-p2');
inputP1.value = playerName1 !== 'Giocatore 1' ? playerName1 : ''; inputP2.value = playerName2 !== 'Giocatore 2' ? playerName2 : '';

let scores = JSON.parse(localStorage.getItem('octoFinalPro')) || { 
    snake: { easy:0, med:0, hard:0 }, pong: { easy:0, med:0, hard:0 },
    profiles: {} // Nuovo oggetto per salvare le vittorie PER NOME!
};

function addProfileWin(winnerName, gameName) {
    if(!scores.profiles) scores.profiles = {};
    if(!scores.profiles[winnerName]) scores.profiles[winnerName] = { tris: 0, navale: 0, dama: 0 };
    scores.profiles[winnerName][gameName]++;
    saveScores();
}

function updateNames() {
    playerName1 = inputP1.value.trim() || 'Giocatore 1';
    playerName2 = inputP2.value.trim() || 'Giocatore 2';
    localStorage.setItem('octoName1', playerName1); localStorage.setItem('octoName2', playerName2);
    document.querySelectorAll('.name-p1').forEach(el => el.innerText = playerName1);
    document.querySelectorAll('.name-p2').forEach(el => el.innerText = playerName2);
}
inputP1.addEventListener('input', updateNames); inputP2.addEventListener('input', updateNames); updateNames();

function saveScores() { localStorage.setItem('octoFinalPro', JSON.stringify(scores)); updateLeaderboardUI(); }

function updateLeaderboardUI() {
    document.getElementById('lb-snake-easy').innerText = scores.snake.easy; document.getElementById('lb-snake-med').innerText = scores.snake.med; document.getElementById('lb-snake-hard').innerText = scores.snake.hard;
    document.getElementById('lb-pong-easy').innerText = scores.pong.easy; document.getElementById('lb-pong-med').innerText = scores.pong.med; document.getElementById('lb-pong-hard').innerText = scores.pong.hard;
    
    // Genera Lista Profili
    const pContainer = document.getElementById('profiles-container');
    pContainer.innerHTML = '';
    if(!scores.profiles || Object.keys(scores.profiles).length === 0) {
        pContainer.innerHTML = '<p style="font-size:13px; color:gray;">Nessuna partita vinta registrata.</p>';
    } else {
        for (const [name, wins] of Object.entries(scores.profiles)) {
            pContainer.innerHTML += `
                <div class="profile-stat">
                    <strong>${name}</strong>
                    <span>❌ ${wins.tris} | ⚓ ${wins.navale} | 🏁 ${wins.dama}</span>
                </div>
            `;
        }
    }
}
updateLeaderboardUI();

// ==========================================
// 2. NAVIGAZIONE (CON TASTO INDIETRO PWA!)
// ==========================================
const views = document.querySelectorAll('.view');
let isSnakeActive = false, isPongActive = false, isSnakePaused = false, isPongPaused = false;
let snakeAnimReq, pongAnimReq; 

// Inizializza lo stato Home
history.replaceState({page: 'home'}, '', '#home');

function switchAppView(targetID, pushHistory = true) {
    if(pushHistory) history.pushState({page: targetID}, '', '#' + targetID);
    
    views.forEach(v => v.classList.remove('active'));
    document.getElementById(targetID).classList.add('active');
    isSnakeActive = false; isPongActive = false;
    cancelAnimationFrame(snakeAnimReq); cancelAnimationFrame(pongAnimReq);
    
    if(targetID === 'snake') { document.getElementById('snake-score').innerText = '0'; document.getElementById('snake-high').innerText = scores.snake[document.getElementById('snake-diff').value]; document.getElementById('snake-overlay').style.display = 'none'; document.getElementById('snake-menu-panel').style.display = 'flex'; }
    if(targetID === 'pong') { document.getElementById('pong-score-p1').innerText = '0'; document.getElementById('pong-score-cpu').innerText = '0'; document.getElementById('pong-overlay').style.display = 'none'; document.getElementById('pong-menu-panel').style.display = 'flex'; }
}

// Clic su Gioco -> Usa la funzione
document.querySelectorAll('.open-game').forEach(btn => {
    btn.addEventListener('click', () => switchAppView(btn.getAttribute('data-target'), true));
});

// Clic su Indietro Header -> Usa il tasto fisico indietro!
document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => history.back());
});

// Ascolta il tasto indietro nativo del Telefono
window.addEventListener('popstate', (e) => {
    if(e.state && e.state.page) { switchAppView(e.state.page, false); } 
    else { switchAppView('home', false); }
});

// ==========================================
// 3. POLPO SNAKE (Griglia allargata + Polizia/Sigarette)
// ==========================================
const snakeCanvas = document.getElementById('snakeCanvas'); const sCtx = snakeCanvas.getContext('2d');
const gridSize = 17; const tileCount = 20; // 340 / 17 = 20
let snake = [], dx = 0, dy = 0, foodX, foodY, rocks = [], snakeScore = 0, currentDiffS = 'med', gameSpeed = 120, lastRenderTime = 0;

function initSnake() {
    cancelAnimationFrame(snakeAnimReq); document.getElementById('snake-menu-panel').style.display = 'none';
    currentDiffS = document.getElementById('snake-diff').value;
    let numRocks = currentDiffS === 'easy' ? 3 : (currentDiffS === 'med' ? 8 : 15);
    gameSpeed = currentDiffS === 'easy' ? 140 : (currentDiffS === 'med' ? 100 : 70);
    snake = [{ x: 10, y: 10 }]; dx = 0; dy = 0; snakeScore = 0; isSnakePaused = false;
    document.getElementById('pause-snake').innerHTML = '<i class="fa-solid fa-pause"></i> Pausa';
    document.getElementById('snake-score').innerText = snakeScore;
    document.getElementById('snake-high').innerText = scores.snake[currentDiffS];
    document.getElementById('snake-overlay').style.display = 'none';
    
    rocks = [];
    for(let i=0; i<numRocks; i++) {
        let rx, ry, isValid = false;
        while(!isValid) { rx=Math.floor(Math.random()*tileCount); ry=Math.floor(Math.random()*tileCount); if(!(rx>5 && rx<15 && ry>5 && ry<15)) isValid = true; }
        rocks.push({x: rx, y: ry});
    }
    placeFoodS(); isSnakeActive = true; snakeAnimReq = window.requestAnimationFrame(snakeLoop);
}

document.getElementById('start-snake').addEventListener('click', initSnake);
document.getElementById('restart-snake').addEventListener('click', () => { if(isSnakeActive || document.getElementById('snake-overlay').style.display === 'flex' || isSnakePaused) initSnake(); });
document.getElementById('resume-snake').addEventListener('click', () => { isSnakePaused = false; document.getElementById('snake-overlay').style.display = 'none'; document.getElementById('pause-snake').innerHTML = '<i class="fa-solid fa-pause"></i> Pausa'; });

document.getElementById('pause-snake').addEventListener('click', () => {
    if(!isSnakeActive && !isSnakePaused) return; isSnakePaused = true;
    document.getElementById('snake-overlay-title').innerText = "In Pausa"; document.getElementById('snake-final-score').innerText = snakeScore;
    document.getElementById('resume-snake').style.display = 'block'; document.getElementById('snake-overlay').style.display = 'flex';
});

document.getElementById('end-snake').addEventListener('click', () => {
    if(!isSnakeActive && !isSnakePaused) return; isSnakeActive = false; isSnakePaused = false;
    document.getElementById('snake-overlay-title').innerText = "Partita Terminata"; document.getElementById('snake-final-score').innerText = snakeScore;
    document.getElementById('resume-snake').style.display = 'none'; document.getElementById('snake-overlay').style.display = 'flex';
});

function placeFoodS() { let valid=false; while(!valid) { foodX=Math.floor(Math.random()*tileCount); foodY=Math.floor(Math.random()*tileCount); valid = !rocks.some(r=>r.x===foodX&&r.y===foodY)&&!snake.some(s=>s.x===foodX&&s.y===foodY); } }

function snakeLoop(timestamp) {
    if (!isSnakeActive) return; snakeAnimReq = window.requestAnimationFrame(snakeLoop);
    if (isSnakePaused) return; 
    if (timestamp - lastRenderTime < gameSpeed) return; lastRenderTime = timestamp;
    if (dx === 0 && dy === 0) { drawSnakeMap(); return; }
    
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount || snake.some(p => p.x===head.x && p.y===head.y) || rocks.some(r => r.x===head.x && r.y===head.y)) { document.getElementById('end-snake').click(); return; }
    snake.unshift(head);
    if (head.x === foodX && head.y === foodY) {
        snakeScore += 10; document.getElementById('snake-score').innerText = snakeScore;
        if(snakeScore > scores.snake[currentDiffS]) { scores.snake[currentDiffS] = snakeScore; document.getElementById('snake-high').innerText = snakeScore; saveScores(); }
        placeFoodS();
    } else { snake.pop(); }
    drawSnakeMap();
}

function drawSnakeMap() {
    sCtx.clearRect(0, 0, snakeCanvas.width, snakeCanvas.height);
    sCtx.strokeStyle = 'rgba(255,255,255,0.05)'; sCtx.lineWidth = 1;
    for(let i=0; i<tileCount; i++){ for(let j=0; j<tileCount; j++){ sCtx.strokeRect(i*gridSize, j*gridSize, gridSize, gridSize); } }
    
    sCtx.textAlign = "center"; sCtx.textBaseline = "middle"; sCtx.font = "14px Arial";
    rocks.forEach(r => sCtx.fillText('👮', r.x * gridSize + gridSize/2, r.y * gridSize + gridSize/2)); 
    sCtx.fillText('🚬', foodX * gridSize + gridSize/2, foodY * gridSize + gridSize/2);
    snake.forEach((part, i) => { 
        if (i === 0) sCtx.fillText('🐙', part.x*gridSize + gridSize/2, part.y*gridSize + gridSize/2); 
        else { sCtx.fillStyle = '#00e5ff'; sCtx.beginPath(); sCtx.arc(part.x*gridSize+gridSize/2, part.y*gridSize+gridSize/2, gridSize/2.5, 0, Math.PI*2); sCtx.fill(); } 
    });
}
function sDir(ndx, ndy) { if(dx!==0 && ndx!==0) return; if(dy!==0 && ndy!==0) return; dx=ndx; dy=ndy; }
['click', 'touchstart'].forEach(evt => {
    document.getElementById('up').addEventListener(evt, e=>{e.preventDefault(); sDir(0,-1);}); document.getElementById('down').addEventListener(evt, e=>{e.preventDefault(); sDir(0,1);});
    document.getElementById('left').addEventListener(evt, e=>{e.preventDefault(); sDir(-1,0);}); document.getElementById('right').addEventListener(evt, e=>{e.preventDefault(); sDir(1,0);});
});

// ==========================================
// 4. CALCIO PONG
// ==========================================
const pCanvas = document.getElementById('pongCanvas'); const pCtx = pCanvas.getContext('2d');
const pw = 80, ph = 15, netW = 120;
const ball = { x: 170, y: 220, r: 10, dx: 0, dy: 0, speed: 5 };
const giocatore = { x: 130, y: 410, score: 0 }; const cpu = { x: 130, y: 15, score: 0 };
let pongDiff = 'med'; 

function initPong() {
    cancelAnimationFrame(pongAnimReq); document.getElementById('pong-menu-panel').style.display = 'none';
    pongDiff = document.getElementById('pong-diff').value; giocatore.score = 0; cpu.score = 0; 
    document.getElementById('pong-score-p1').innerText = 0; document.getElementById('pong-score-cpu').innerText = 0;
    isPongActive = true; isPongPaused = false;
    document.getElementById('pause-pong').innerHTML = '<i class="fa-solid fa-pause"></i> Pausa'; document.getElementById('pong-overlay').style.display = 'none';
    resetSoccerBall(); pongAnimReq = window.requestAnimationFrame(pongLoop);
}

document.getElementById('start-pong').addEventListener('click', initPong);
document.getElementById('restart-pong').addEventListener('click', () => { if(isPongActive || document.getElementById('pong-overlay').style.display === 'flex' || isPongPaused) initPong(); });
document.getElementById('resume-pong').addEventListener('click', () => { isPongPaused = false; document.getElementById('pong-overlay').style.display = 'none'; });

document.getElementById('pause-pong').addEventListener('click', () => {
    if(!isPongActive && !isPongPaused) return; isPongPaused = true;
    document.getElementById('pong-overlay-title').innerText = "In Pausa";
    document.getElementById('resume-pong').style.display = 'block'; document.getElementById('pong-overlay').style.display = 'flex';
});
document.getElementById('end-pong').addEventListener('click', () => {
    if(!isPongActive && !isPongPaused) return; isPongActive = false; isPongPaused = false;
    document.getElementById('pong-overlay-title').innerText = `Fine! Tu: ${giocatore.score} - CPU: ${cpu.score}`;
    document.getElementById('resume-pong').style.display = 'none'; document.getElementById('pong-overlay').style.display = 'flex';
});

function resetSoccerBall() { ball.x=pCanvas.width/2; ball.y=pCanvas.height/2; ball.dx=0; ball.dy=0; setTimeout(() => { if(!isPongActive||isPongPaused) return; ball.dy=Math.random()>0.5?ball.speed:-ball.speed; ball.dx=(Math.random()*4)-2; }, 800); }
pCanvas.addEventListener('touchmove', e => { e.preventDefault(); if(!isPongActive||isPongPaused) return; let touchX = e.touches[0].clientX - pCanvas.getBoundingClientRect().left; giocatore.x = Math.max(0, Math.min(touchX - pw/2, pCanvas.width - pw)); }, {passive: false});

function pongLoop() { if(!isPongActive) return; updateSoccer(); drawSoccer(); pongAnimReq = window.requestAnimationFrame(pongLoop); }

function updateSoccer() {
    if(isPongPaused) return; 
    let cpuSpd = pongDiff==='easy'?0.05 : (pongDiff==='med'?0.1:0.18);
    cpu.x += (ball.x - (cpu.x + pw/2)) * cpuSpd; cpu.x = Math.max(0, Math.min(cpu.x, pCanvas.width-pw));
    
    if (ball.dx === 0 && ball.dy === 0) return;
    ball.x += ball.dx; ball.y += ball.dy;
    
    if(ball.x - ball.r < 0) { ball.x = ball.r; ball.dx = -ball.dx; } else if(ball.x + ball.r > pCanvas.width) { ball.x = pCanvas.width - ball.r; ball.dx = -ball.dx; }

    if(ball.y-ball.r < 0) { if(ball.x > pCanvas.width/2-netW/2 && ball.x < pCanvas.width/2+netW/2) { giocatore.score++; document.getElementById('pong-score-p1').innerText=giocatore.score; resetSoccerBall(); } else ball.dy = -ball.dy; } 
    else if (ball.y+ball.r > pCanvas.height) { if(ball.x > pCanvas.width/2-netW/2 && ball.x < pCanvas.width/2+netW/2) { cpu.score++; document.getElementById('pong-score-cpu').innerText=cpu.score; resetSoccerBall(); } else ball.dy = -ball.dy; }
    
    if(ball.dy>0 && ball.y+ball.r > giocatore.y && ball.x+ball.r > giocatore.x && ball.x-ball.r < giocatore.x+pw) { ball.y = giocatore.y - ball.r; ball.dy = -ball.speed; ball.dx = ((ball.x-(giocatore.x+pw/2))/(pw/2))*4; }
    if(ball.dy<0 && ball.y-ball.r < cpu.y+ph && ball.x+ball.r > cpu.x && ball.x-ball.r < cpu.x+pw) { ball.y = cpu.y + ph + ball.r; ball.dy = ball.speed; ball.dx = ((ball.x-(cpu.x+pw/2))/(pw/2))*4; }
}

function drawSoccer() {
    pCtx.clearRect(0,0,pCanvas.width,pCanvas.height);
    pCtx.fillStyle = 'rgba(255, 255, 255, 0.15)'; pCtx.fillRect(pCanvas.width/2-netW/2, 0, netW, 40); pCtx.fillRect(pCanvas.width/2-netW/2, pCanvas.height-40, netW, 40);
    pCtx.beginPath(); for(let i=0; i<=netW; i+=15) { pCtx.moveTo(pCanvas.width/2-netW/2+i, 0); pCtx.lineTo(pCanvas.width/2-netW/2+i, 40); pCtx.moveTo(pCanvas.width/2-netW/2+i, pCanvas.height-40); pCtx.lineTo(pCanvas.width/2-netW/2+i, pCanvas.height); } for(let j=0; j<=40; j+=15) { pCtx.moveTo(pCanvas.width/2-netW/2, j); pCtx.lineTo(pCanvas.width/2+netW/2, j); pCtx.moveTo(pCanvas.width/2-netW/2, pCanvas.height-j); pCtx.lineTo(pCanvas.width/2+netW/2, pCanvas.height-j); } pCtx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; pCtx.lineWidth = 1; pCtx.stroke();
    pCtx.strokeStyle = 'rgba(255,255,255,0.4)'; pCtx.lineWidth = 2; pCtx.beginPath(); pCtx.moveTo(0, pCanvas.height/2); pCtx.lineTo(pCanvas.width, pCanvas.height/2); pCtx.stroke(); pCtx.beginPath(); pCtx.arc(pCanvas.width/2, pCanvas.height/2, 30, 0, Math.PI*2); pCtx.stroke(); pCtx.strokeRect(pCanvas.width/2-netW/2, 0, netW, 40); pCtx.strokeRect(pCanvas.width/2-netW/2, pCanvas.height-40, netW, 40);
    let halfW = pw / 2;
    pCtx.fillStyle = '#ffffff'; pCtx.fillRect(giocatore.x, giocatore.y, halfW, ph); pCtx.fillStyle = '#111111'; pCtx.fillRect(giocatore.x+halfW, giocatore.y, halfW, ph);
    pCtx.fillStyle = '#b30000'; pCtx.fillRect(cpu.x, cpu.y, halfW, ph); pCtx.fillStyle = '#000066'; pCtx.fillRect(cpu.x+halfW, cpu.y, halfW, ph);
    pCtx.textAlign = "center"; pCtx.textBaseline = "middle"; pCtx.font = "18px Arial"; pCtx.fillText('⚽', ball.x, ball.y);
}

// ==========================================
// 5. TRIS MAGICO (Con Ritiro)
// ==========================================
const tCells = document.querySelectorAll('.tris-board .cell'); const tStatus = document.getElementById('tris-status');
let tBoard = ['', '', '', '', '', '', '', '', '']; let isTrisActive = true; let currentTurn = '🐙';
const winC = [ [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6] ];

tCells.forEach(cell => {
    cell.addEventListener('click', (e) => {
        let idx = e.target.getAttribute('data-index'); if (tBoard[idx] !== '' || !isTrisActive) return;
        tBoard[idx] = currentTurn; e.target.innerText = currentTurn;
        if (winC.some(c => tBoard[c[0]] && tBoard[c[0]] === tBoard[c[1]] && tBoard[c[0]] === tBoard[c[2]])) {
            let winnerName = currentTurn === '🐙' ? playerName1 : playerName2;
            tStatus.innerText = `Vince ${winnerName} ${currentTurn}!`;
            addProfileWin(winnerName, 'tris'); isTrisActive = false; return;
        }
        if (!tBoard.includes('')) { tStatus.innerText = 'Pareggio!'; isTrisActive = false; return; }
        currentTurn = currentTurn === '🐙' ? '🧙‍♂️' : '🐙'; tStatus.innerText = `Tocca a: ${currentTurn} ${currentTurn==='🐙'?playerName1:playerName2}`;
    });
});
document.getElementById('reset-tris').addEventListener('click', () => { tBoard=['','','','','','','','','']; isTrisActive=true; currentTurn='🐙'; tStatus.innerText=`Tocca a: 🐙 ${playerName1}`; tCells.forEach(c=>c.innerText=''); });
document.getElementById('resign-tris').addEventListener('click', () => {
    if(!isTrisActive) return; let winner = currentTurn === '🐙' ? playerName2 : playerName1;
    tStatus.innerText = `Ritirato! Vince ${winner}`;
    addProfileWin(winner, 'tris'); isTrisActive = false;
});

// ==========================================
// 6. NAVALE (Con Ritiro)
// ==========================================
let p1Grid=Array(36).fill(0), p2Grid=Array(36).fill(0), p1Rev=Array(36).fill(false), p2Rev=Array(36).fill(false);
let nTurn=1, nHits1=0, nHits2=0, nPhase='setup1', nShips=[3,2,2], cShipIdx=0, isHoriz=true, isNavaleOver=false, nWaiting=false;

function initNavale() { 
    p1Grid.fill(0); p2Grid.fill(0); p1Rev.fill(false); p2Rev.fill(false); 
    nTurn=1; nHits1=0; nHits2=0; nPhase='setup1'; cShipIdx=0; isNavaleOver=false; nWaiting=false;
    document.getElementById('navale-setup').style.display='flex'; document.getElementById('navale-overlay').style.display='none'; drawNavale(); 
}
document.getElementById('btn-rotate').addEventListener('click', () => { isHoriz=!isHoriz; document.getElementById('btn-rotate').innerText=isHoriz?'Gira Nave ➡️':'Gira Nave ⬇️'; });

function drawNavale() { 
    const b=document.getElementById('board-navale'); b.innerHTML=''; let grid=nPhase==='setup1'?p1Grid:(nPhase==='setup2'?p2Grid:(nTurn===1?p2Grid:p1Grid)); let rev=nTurn===1?p2Rev:p1Rev; 
    for(let i=0;i<36;i++){ 
        let div=document.createElement('div'); div.className='cell-navale'; 
        if(nPhase.includes('setup')){ 
            if(grid[i]===1) div.classList.add('ship'); div.addEventListener('click',()=>placeShip(i,grid)); 
            document.getElementById('navale-status').innerText=`${nPhase==='setup1'?playerName1:playerName2}: Posiziona`; document.getElementById('ship-len').innerText=nShips[cShipIdx]||0; 
        } else { 
            if(rev[i]){ if(grid[i]===1){div.classList.add('hit'); div.innerText='💥';}else{div.classList.add('miss'); div.innerText='💧';} } else { div.addEventListener('click',()=>shoot(i,grid,rev)); }
            if(!isNavaleOver) document.getElementById('navale-status').innerText=`Attacca ${nTurn===1?playerName2:playerName1}!`; 
        } 
        b.appendChild(div); 
    } 
}
function placeShip(idx,grid){ 
    if(cShipIdx>=nShips.length || nWaiting) return; let len=nShips[cShipIdx], r=Math.floor(idx/6), c=idx%6; 
    if(isHoriz&&c+len>6) return; if(!isHoriz&&r+len>6) return; 
    for(let i=0;i<len;i++) if(grid[isHoriz?idx+i:idx+(i*6)]!==0) return; 
    for(let i=0;i<len;i++) grid[isHoriz?idx+i:idx+(i*6)]=1; cShipIdx++; drawNavale(); 
    if(cShipIdx>=nShips.length){ nWaiting = true; setTimeout(() => { if(nPhase==='setup1'){ nPhase='setup2'; cShipIdx=0; document.getElementById('navale-overlay-title').innerText="Passa il telefono!"; document.getElementById('navale-overlay').style.display='flex'; } else{ nPhase='battle'; document.getElementById('navale-setup').style.display='none'; nTurn=1; document.getElementById('navale-overlay-title').innerText="Battaglia Iniziata!"; document.getElementById('navale-overlay').style.display='flex'; } nWaiting = false; }, 300); } 
}
function shoot(idx,grid,rev){ 
    if(isNavaleOver || rev[idx] || nWaiting) return; nWaiting = true; rev[idx]=true; drawNavale(); 
    if(grid[idx]===1){ nTurn===1?nHits1++:nHits2++; if(nHits1===7||nHits2===7){ isNavaleOver=true; nWaiting=false; let vince=nTurn===1?playerName1:playerName2; document.getElementById('navale-status').innerText=`Vince ${vince}!`; addProfileWin(vince, 'navale'); return; } } 
    setTimeout(()=>{ nTurn=nTurn===1?2:1; document.getElementById('navale-overlay-title').innerText="Passa il telefono!"; document.getElementById('navale-overlay').style.display='flex'; nWaiting=false; }, 800); 
}
document.getElementById('btn-navale-ready').addEventListener('click', ()=>{ document.getElementById('navale-overlay').style.display='none'; drawNavale(); }); 
document.getElementById('reset-navale').addEventListener('click', initNavale); 
document.getElementById('resign-navale').addEventListener('click', () => {
    if(isNavaleOver || nPhase.includes('setup')) return; isNavaleOver = true; let vince = nTurn === 1 ? playerName2 : playerName1;
    document.getElementById('navale-status').innerText = `Ritirato! Vince ${vince}`; addProfileWin(vince, 'navale');
});

// ==========================================
// 7. DAMA UFFICIALE E PEDINE GIRATE
// ==========================================
let dGrid=[], turnD=1, selPos=null, p1Pieces=12, p2Pieces=12, isDamaActive=true, mustJumpPiece=null;

function initDama() { dGrid=Array(64).fill(0); turnD=1; selPos=null; mustJumpPiece=null; p1Pieces=12; p2Pieces=12; isDamaActive=true; document.getElementById('dama-overlay').style.display='none'; for(let r=0;r<8;r++) for(let c=0;c<8;c++) if((r+c)%2!==0){ if(r<3) dGrid[r*8+c]=1; else if(r>4) dGrid[r*8+c]=2; } updateDScore(); drawDama(); }
function updateDScore() { document.getElementById('dama-cap-p1').innerText=12-p2Pieces; document.getElementById('dama-cap-p2').innerText=12-p1Pieces; document.getElementById('dama-status').style.color = turnD===1?'#00e5ff':'#ff2a6d'; document.getElementById('dama-status').innerText=`Tocca a: ${turnD===1?'🐙 '+playerName1:'🧙‍♂️ '+playerName2}`; }

function isEnemy(p, target) { if(target===0) return false; let c1 = (p===1||p===3)?1:2; let c2 = (target===1||target===3)?1:2; return c1!==c2; }
function isKing(p) { return p===3||p===4; }
function getJumps(idx, grid) { let jumps = []; let p = grid[idx]; if(p===0) return jumps; let r = Math.floor(idx/8), c = idx%8; let dirs = []; if(p===1 || isKing(p)) dirs.push([1,-1], [1,1]); if(p===2 || isKing(p)) dirs.push([-1,-1], [-1,1]); for(let d of dirs) { let r1 = r+d[0], c1 = c+d[1], r2 = r+d[0]*2, c2 = c+d[1]*2; if(r2>=0 && r2<8 && c2>=0 && c2<8) { let mIdx = r1*8+c1, eIdx = r2*8+c2; let midP = grid[mIdx]; if(isEnemy(p, midP) && grid[eIdx]===0) { if((p===1||p===2) && isKing(midP)) continue; jumps.push({to: eIdx, mid: mIdx}); } } } return jumps; }
function getMoves(idx, grid) { let moves = []; let p = grid[idx]; if(p===0) return moves; let r = Math.floor(idx/8), c = idx%8; let dirs = []; if(p===1 || isKing(p)) dirs.push([1,-1], [1,1]); if(p===2 || isKing(p)) dirs.push([-1,-1], [-1,1]); for(let d of dirs) { let r1 = r+d[0], c1 = c+d[1]; if(r1>=0 && r1<8 && c1>=0 && c1<8) { let eIdx = r1*8+c1; if(grid[eIdx]===0) moves.push({to: eIdx}); } } return moves; }
function getAllJumps(player, grid) { let all = []; for(let i=0; i<64; i++) { let p = grid[i]; if((player===1 && (p===1||p===3)) || (player===2 && (p===2||p===4))) { let j = getJumps(i, grid); if(j.length>0) all.push({from: i, jumps: j}); } } return all; }

function drawDama() {
    const b = document.getElementById('dama-board'); b.innerHTML='';
    let allJumps = getAllJumps(turnD, dGrid); let mandSources = allJumps.map(j=>j.from);
    let valids = []; if(selPos!==null) { valids = getJumps(selPos, dGrid).map(j=>j.to); if(valids.length===0 && mustJumpPiece===null) valids = getMoves(selPos, dGrid).map(m=>m.to); }

    for(let i=0;i<64;i++){
        let div=document.createElement('div'); let r=Math.floor(i/8), c=i%8; div.className=`dama-cell ${(r+c)%2===0?'white':'black'}`;
        if(selPos===i) div.classList.add('selected'); if(valids.includes(i)) div.classList.add('valid-move'); if(selPos===null && mandSources.includes(i)) div.classList.add('must-jump');
        
        if(dGrid[i]!==0){ 
            let p=document.createElement('div'); p.className='piece'; 
            if(dGrid[i]===1 || dGrid[i]===3) p.classList.add('p1'); // Polpi girati!
            if(isKing(dGrid[i])) p.classList.add('king'); 
            p.innerText=(dGrid[i]===1||dGrid[i]===3)?'🐙':'🧙‍♂️'; div.appendChild(p); 
        }
        div.addEventListener('click',()=>handleDamaClick(i)); b.appendChild(div);
    }
}

function handleDamaClick(idx) {
    if(!isDamaActive) return; let r=Math.floor(idx/8), c=idx%8; if((r+c)%2===0) return;
    let possibleJumps = getAllJumps(turnD, dGrid); let hasJumps = possibleJumps.length > 0;
    
    if(selPos===null) {
        let p = dGrid[idx]; let isOwner = (turnD===1 && (p===1||p===3)) || (turnD===2 && (p===2||p===4));
        if(isOwner) { if(hasJumps && !possibleJumps.some(j=>j.from===idx)) { document.getElementById('dama-status').innerText = "Devi mangiare! 🛑"; return; } selPos=idx; drawDama(); }
    } else {
        if(selPos===idx && mustJumpPiece===null) { selPos=null; updateDScore(); drawDama(); return; }
        let jList = getJumps(selPos, dGrid); let isJump = jList.find(j=>j.to===idx); let mList = getMoves(selPos, dGrid); let isMove = mList.find(m=>m.to===idx);
        
        if(isJump) {
            let p = dGrid[selPos]; dGrid[idx] = p; dGrid[selPos] = 0; dGrid[isJump.mid] = 0; turnD===1 ? p2Pieces-- : p1Pieces--;
            let promoted = false; let rT = Math.floor(idx/8);
            if(p===1 && rT===7) { dGrid[idx] = 3; promoted=true; } if(p===2 && rT===0) { dGrid[idx] = 4; promoted=true; }
            let nextJumps = promoted ? [] : getJumps(idx, dGrid);
            if(nextJumps.length > 0) { selPos = idx; mustJumpPiece = idx; document.getElementById('dama-status').innerText = "Doppio salto! ⚔️"; drawDama(); return; } 
            else endDamaTurn();
        } else if(isMove && !hasJumps && mustJumpPiece===null) {
            let p = dGrid[selPos]; dGrid[idx] = p; dGrid[selPos] = 0;
            let rT = Math.floor(idx/8); if(p===1 && rT===7) dGrid[idx]=3; if(p===2 && rT===0) dGrid[idx]=4;
            endDamaTurn();
        } else { if(hasJumps) document.getElementById('dama-status').innerText = "Devi mangiare! 🛑"; }
    }
}

function endDamaTurn() {
    selPos=null; mustJumpPiece=null; turnD = turnD===1?2:1; updateDScore(); drawDama();
    if(p1Pieces===0||p2Pieces===0) {
        isDamaActive=false; let vince = p1Pieces===0 ? playerName2 : playerName1; addProfileWin(vince, 'dama');
        document.getElementById('dama-overlay-title').innerText=`Vince:\n${vince}`; document.getElementById('dama-overlay').style.display='flex';
    } else {
        let jumps = getAllJumps(turnD, dGrid); let moves = [];
        for(let i=0;i<64;i++) { let p=dGrid[i]; if((turnD===1&&(p===1||p===3)) || (turnD===2&&(p===2||p===4))) moves = moves.concat(getMoves(i, dGrid)); }
        if(jumps.length===0 && moves.length===0) {
            isDamaActive=false; let vince = turnD===1 ? playerName2 : playerName1; addProfileWin(vince, 'dama');
            document.getElementById('dama-overlay-title').innerText=`Senza Mosse!\nVince:\n${vince}`; document.getElementById('dama-overlay').style.display='flex';
        }
    }
}
document.getElementById('reset-dama').addEventListener('click', initDama); document.getElementById('retry-dama').addEventListener('click', initDama); 
document.getElementById('resign-dama').addEventListener('click', () => {
    if(!isDamaActive) return; isDamaActive = false; let vince = turnD === 1 ? playerName2 : playerName1;
    document.getElementById('dama-status').innerText = `Ritirato! Vince ${vince}`; addProfileWin(vince, 'dama');
});
initDama();