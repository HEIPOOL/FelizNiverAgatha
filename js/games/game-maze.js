/* games/game-maze.js */
/**
 * @file Jogo "Labirinto Lunar" para o site da Ágatha Sophia
 * @description Labirinto procedural com controles por swipe/toque
 * @version 1.0.0
 * 
 * Dependências externas:
 * - Sistema de partículas (particles.js) para efeitos visuais
 * 
 * API pública: MazeGame class
 * Eventos emitidos: agatha:game:maze:win, agatha:game:maze:move
 * localStorage keys: agatha_maze_besttime, agatha_maze_stats
 */

class MazeGame {
    constructor() {
        this.version = '1.0.0';
        this.container = null;
        this.canvas = null;
        this.context = null;
        this.isRunning = false;
        this.isPaused = false;
        this.animationId = null;
        this.lastTime = 0;
        this.gameStartTime = 0;
        this.elapsedTime = 0;
        this.bestTime = Infinity;
        
        // Configurações do labirinto
        this.config = {
            rows: 15,
            cols: 15,
            cellSize: 30,
            wallWidth: 2,
            seed: null,
            useDeviceTilt: false,
            tiltSensitivity: 0.5,
            swipeThreshold: 30,
            colors: {
                wall: '#4b0f1e',
                path: '#1a1a1a',
                player: '#D4AF37',
                start: '#4b0f1e',
                end: '#D4AF37',
                visited: 'rgba(212, 175, 55, 0.1)'
            }
        };
        
        // Estado do jogo
        this.maze = [];
        this.player = { x: 0, y: 0 };
        this.start = { x: 0, y: 0 };
        this.end = { x: 0, y: 0 };
        this.visited = new Set();
        this.isGenerating = false;
        this.isSolved = false;
        this.touchStart = { x: 0, y: 0 };
        
        // Controles de gyroscope
        this.gyro = {
            alpha: 0,
            beta: 0,
            gamma: 0,
            permission: false
        };
        
        // Estatísticas
        this.stats = {
            gamesPlayed: 0,
            totalTime: 0,
            fastestTime: Infinity,
            moves: 0,
            solves: 0
        };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.generate = this.generate.bind(this);
        this.startGame = this.startGame.bind(this);
        this.reset = this.reset.bind(this);
        this.destroy = this.destroy.bind(this);
        this.animate = this.animate.bind(this);
        this.draw = this.draw.bind(this);
        this.movePlayer = this.movePlayer.bind(this);
        this.checkWin = this.checkWin.bind(this);
        this.handleKeydown = this.handleKeydown.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleDeviceOrientation = this.handleDeviceOrientation.bind(this);
        this.requestGyroPermission = this.requestGyroPermission.bind(this);
    }

    /**
     * Inicializa o jogo
     * @param {HTMLElement} container - Container do jogo
     * @param {Object} options - Configurações
     */
    async init(container, options = {}) {
        console.log('🧩 Inicializando Labirinto Lunar');
        
        // Mesclar configurações
        this.config = { ...this.config, ...options };
        
        // Obter container
        this.container = container;
        if (!this.container) {
            throw new Error('Container do jogo não encontrado');
        }
        
        // Carregar estatísticas
        this.loadStats();
        
        // Criar canvas
        this.canvas = container.querySelector('.game-canvas') || document.createElement('canvas');
        this.canvas.className = 'game-canvas';
        this.canvas.width = this.config.cols * this.config.cellSize;
        this.canvas.height = this.config.rows * this.config.cellSize;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.borderRadius = 'var(--border-radius)';
        this.canvas.style.backgroundColor = 'var(--glass)';
        
        if (!container.contains(this.canvas)) {
            container.appendChild(this.canvas);
        }
        
        // Obter contexto
        this.context = this.canvas.getContext('2d');
        if (!this.context) {
            throw new Error('Contexto 2D não disponível');
        }
        
        // Gerar labirinto
        this.generate();
        
        // Configurar controles
        this.setupControls();
        
        // Configurar HUD
        this.createHUD();
        
        // Configurar gyroscope se solicitado
        if (this.config.useDeviceTilt) {
            await this.requestGyroPermission();
        }
        
        console.log('✅ Labirinto Lunar inicializado');
        
        return this;
    }

    /**
     * Gera um novo labirinto
     * @param {number} rows - Linhas (opcional)
     * @param {number} cols - Colunas (opcional)
     * @param {string|number} seed - Semente para geração (opcional)
     */
    generate(rows = this.config.rows, cols = this.config.cols, seed = null) {
        console.log('🏗️ Gerando novo labirinto...');
        
        this.isGenerating = true;
        this.config.rows = rows;
        this.config.cols = cols;
        
        // Usar seed se fornecida
        if (seed !== null) {
            this.config.seed = seed;
            // Implementação simples de seed
            let s = 0;
            for (let i = 0; i < String(seed).length; i++) {
                s += String(seed).charCodeAt(i);
            }
            Math.seed = s;
        }
        
        // Redimensionar canvas
        this.canvas.width = cols * this.config.cellSize;
        this.canvas.height = rows * this.config.cellSize;
        
        // Inicializar grid
        this.maze = Array(rows).fill().map(() => Array(cols).fill().map(() => ({
            top: true,
            right: true,
            bottom: true,
            left: true,
            visited: false
        })));
        
        // Algoritmo de geração: Depth-First Search (DFS) com backtracking
        const stack = [];
        const startRow = Math.floor(Math.random() * rows);
        const startCol = Math.floor(Math.random() * cols);
        
        let current = this.maze[startRow][startCol];
        current.visited = true;
        stack.push([startRow, startCol]);
        
        // Direções possíveis
        const directions = [
            [-1, 0, 'top', 'bottom'], // Up
            [0, 1, 'right', 'left'],   // Right
            [1, 0, 'bottom', 'top'],   // Down
            [0, -1, 'left', 'right']   // Left
        ];
        
        while (stack.length > 0) {
            const [row, col] = stack[stack.length - 1];
            
            // Encontrar vizinhos não visitados
            const neighbors = [];
            
            for (const [dr, dc, wall, opposite] of directions) {
                const newRow = row + dr;
                const newCol = col + dc;
                
                if (newRow >= 0 && newRow < rows && 
                    newCol >= 0 && newCol < cols && 
                    !this.maze[newRow][newCol].visited) {
                    neighbors.push([newRow, newCol, wall, opposite]);
                }
            }
            
            if (neighbors.length > 0) {
                // Escolher vizinho aleatório
                const [newRow, newCol, wall, opposite] = 
                    neighbors[Math.floor(Math.random() * neighbors.length)];
                
                // Remover paredes
                this.maze[row][col][wall] = false;
                this.maze[newRow][newCol][opposite] = false;
                
                // Marcar como visitado
                this.maze[newRow][newCol].visited = true;
                
                // Adicionar à pilha
                stack.push([newRow, newCol]);
            } else {
                // Backtrack
                stack.pop();
            }
        }
        
        // Definir posições de início e fim
        // Início: canto superior esquerdo
        this.start = { x: 0, y: 0 };
        this.player = { ...this.start };
        
        // Fim: canto inferior direito
        this.end = { x: cols - 1, y: rows - 1 };
        
        // Resetar conjunto de visitados
        this.visited.clear();
        this.visited.add(`${this.player.x},${this.player.y}`);
        
        this.isGenerating = false;
        this.isSolved = false;
        
        console.log(`✅ Labirinto gerado: ${rows}x${cols}`);
        
        // Redesenhar
        this.draw();
    }

    /**
     * Inicia o jogo
     */
    startGame() {
        if (this.isRunning) return;
        
        console.log('🚀 Iniciando Labirinto Lunar');
        
        this.isRunning = true;
        this.isPaused = false;
        this.isSolved = false;
        this.elapsedTime = 0;
        this.gameStartTime = Date.now();
        this.stats.moves = 0;
        
        // Resetar posição do jogador
        this.player = { ...this.start };
        this.visited.clear();
        this.visited.add(`${this.player.x},${this.player.y}`);
        
        // Iniciar animação
        this.lastTime = 0;
        this.animationId = requestAnimationFrame(this.animate);
        
        // Atualizar HUD
        this.updateHUD();
        
        // Incrementar contador de jogos
        this.stats.gamesPlayed++;
    }

    /**
     * Reseta o jogo atual
     */
    reset() {
        this.isRunning = false;
        this.isSolved = false;
        this.elapsedTime = 0;
        this.stats.moves = 0;
        
        // Resetar posição do jogador
        this.player = { ...this.start };
        this.visited.clear();
        this.visited.add(`${this.player.x},${this.player.y}`);
        
        // Parar animação
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Redesenhar
        this.draw();
        this.updateHUD();
    }

    /**
     * Loop de animação principal
     */
    animate(timestamp) {
        if (!this.isRunning || this.isPaused || this.isSolved) return;
        
        // Calcular tempo decorrido
        if (this.lastTime === 0) {
            this.lastTime = timestamp;
        }
        
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        this.elapsedTime += deltaTime;
        
        // Atualizar HUD a cada segundo
        if (Math.floor(this.elapsedTime / 1000) !== Math.floor((this.elapsedTime - deltaTime) / 1000)) {
            this.updateHUD();
        }
        
        // Continuar animação
        this.animationId = requestAnimationFrame(this.animate);
    }

    /**
     * Desenha o labirinto
     */
    draw() {
        const ctx = this.context;
        const cellSize = this.config.cellSize;
        const wallWidth = this.config.wallWidth;
        const colors = this.config.colors;
        
        // Limpar canvas
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Desenhar caminhos e células visitadas
        for (let y = 0; y < this.config.rows; y++) {
            for (let x = 0; x < this.config.cols; x++) {
                const cell = this.maze[y][x];
                
                // Coordenadas da célula
                const cellX = x * cellSize;
                const cellY = y * cellSize;
                
                // Desenhar fundo da célula
                if (this.visited.has(`${x},${y}`)) {
                    ctx.fillStyle = colors.visited;
                    ctx.fillRect(cellX, cellY, cellSize, cellSize);
                }
                
                // Desenhar paredes
                ctx.strokeStyle = colors.wall;
                ctx.lineWidth = wallWidth;
                ctx.beginPath();
                
                // Parede superior
                if (cell.top) {
                    ctx.moveTo(cellX, cellY);
                    ctx.lineTo(cellX + cellSize, cellY);
                }
                
                // Parede direita
                if (cell.right) {
                    ctx.moveTo(cellX + cellSize, cellY);
                    ctx.lineTo(cellX + cellSize, cellY + cellSize);
                }
                
                // Parede inferior
                if (cell.bottom) {
                    ctx.moveTo(cellX, cellY + cellSize);
                    ctx.lineTo(cellX + cellSize, cellY + cellSize);
                }
                
                // Parede esquerda
                if (cell.left) {
                    ctx.moveTo(cellX, cellY);
                    ctx.lineTo(cellX, cellY + cellSize);
                }
                
                ctx.stroke();
            }
        }
        
        // Desenhar início
        ctx.fillStyle = colors.start;
        const startX = this.start.x * cellSize + cellSize * 0.2;
        const startY = this.start.y * cellSize + cellSize * 0.2;
        const startSize = cellSize * 0.6;
        ctx.fillRect(startX, startY, startSize, startSize);
        
        // Desenhar fim
        ctx.fillStyle = colors.end;
        const endX = this.end.x * cellSize + cellSize * 0.2;
        const endY = this.end.y * cellSize + cellSize * 0.2;
        const endSize = cellSize * 0.6;
        ctx.fillRect(endX, endY, endSize, endSize);
        
        // Adicionar símbolo no fim (lua)
        ctx.fillStyle = 'white';
        ctx.font = `${cellSize * 0.4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌙', endX + endSize / 2, endY + endSize / 2);
        
        // Desenhar jogador
        const playerX = this.player.x * cellSize + cellSize / 2;
        const playerY = this.player.y * cellSize + cellSize / 2;
        const playerRadius = cellSize * 0.3;
        
        // Brilho do jogador
        const gradient = ctx.createRadialGradient(
            playerX, playerY, 0,
            playerX, playerY, playerRadius * 2
        );
        gradient.addColorStop(0, colors.player);
        gradient.addColorStop(0.7, colors.player.replace(')', ', 0.3)').replace('rgb', 'rgba'));
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(playerX, playerY, playerRadius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Jogador
        ctx.fillStyle = colors.player;
        ctx.beginPath();
        ctx.arc(playerX, playerY, playerRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Brilho interno
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(playerX - playerRadius * 0.3, playerY - playerRadius * 0.3, playerRadius * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Move o jogador
     * @param {string} direction - Direção ('up', 'right', 'down', 'left')
     */
    movePlayer(direction) {
        if (!this.isRunning || this.isSolved) return;
        
        const oldX = this.player.x;
        const oldY = this.player.y;
        let newX = oldX;
        let newY = oldY;
        
        const cell = this.maze[oldY][oldX];
        
        // Verificar se a direção é válida (sem parede)
        switch(direction) {
            case 'up':
                if (!cell.top) newY--;
                break;
            case 'right':
                if (!cell.right) newX++;
                break;
            case 'down':
                if (!cell.bottom) newY++;
                break;
            case 'left':
                if (!cell.left) newX--;
                break;
        }
        
        // Verificar limites
        if (newX >= 0 && newX < this.config.cols && 
            newY >= 0 && newY < this.config.rows) {
            
            this.player.x = newX;
            this.player.y = newY;
            
            // Adicionar à lista de visitados
            this.visited.add(`${newX},${newY}`);
            
            // Incrementar contador de movimentos
            this.stats.moves++;
            
            // Redesenhar
            this.draw();
            
            // Atualizar HUD
            this.updateHUD();
            
            // Emitir evento de movimento
            document.dispatchEvent(new CustomEvent('agatha:game:maze:move', {
                detail: {
                    from: { x: oldX, y: oldY },
                    to: { x: newX, y: newY },
                    direction,
                    moves: this.stats.moves
                }
            }));
            
            // Verificar vitória
            this.checkWin();
        }
    }

    /**
     * Verifica se o jogador chegou ao fim
     */
    checkWin() {
        if (this.player.x === this.end.x && this.player.y === this.end.y) {
            this.winGame();
        }
    }

    /**
     * Ação de vitória
     */
    winGame() {
        console.log('🏆 Labirinto resolvido!');
        
        this.isSolved = true;
        this.isRunning = false;
        
        const time = this.elapsedTime;
        
        // Atualizar melhor tempo
        if (time < this.stats.fastestTime) {
            this.stats.fastestTime = time;
        }
        
        this.stats.totalTime += time;
        this.stats.solves++;
        
        // Salvar estatísticas
        this.saveStats();
        
        // Efeitos visuais
        this.createWinEffects();
        
        // Mostrar tela de vitória
        this.showWinScreen(time);
        
        // Emitir evento de vitória
        document.dispatchEvent(new CustomEvent('agatha:game:maze:win', {
            detail: {
                time,
                moves: this.stats.moves,
                bestTime: this.stats.fastestTime
            }
        }));
    }

    /**
     * Cria efeitos visuais de vitória
     */
    createWinEffects() {
        // Spawn de partículas no fim do labirinto
        if (window.agathaParticles && window.agathaParticles.spawnGlitter) {
            const canvasRect = this.canvas.getBoundingClientRect();
            const endX = this.end.x * this.config.cellSize + this.config.cellSize / 2;
            const endY = this.end.y * this.config.cellSize + this.config.cellSize / 2;
            
            const screenX = canvasRect.left + endX;
            const screenY = canvasRect.top + endY;
            
            window.agathaParticles.spawnGlitter(screenX, screenY, 50);
        }
        
        // Animação do jogador
        if (this.canvas) {
            const ctx = this.context;
            const playerX = this.player.x * this.config.cellSize + this.config.cellSize / 2;
            const playerY = this.player.y * this.config.cellSize + this.config.cellSize / 2;
            
            // Anel de expansão
            let radius = 0;
            const animateRing = () => {
                radius += 2;
                
                ctx.strokeStyle = `rgba(212, 175, 55, ${1 - radius / 100})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(playerX, playerY, radius, 0, Math.PI * 2);
                ctx.stroke();
                
                if (radius < 100) {
                    requestAnimationFrame(animateRing);
                }
            };
            
            animateRing();
        }
    }

    /**
     * Configura controles
     */
    setupControls() {
        // Controles de teclado
        document.addEventListener('keydown', this.handleKeydown);
        
        // Controles de toque/swipe
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        
        // Controles de botão (se existirem)
        const buttons = this.container.querySelectorAll('.control-button');
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const direction = e.target.textContent;
                switch(direction) {
                    case '↑': this.movePlayer('up'); break;
                    case '→': this.movePlayer('right'); break;
                    case '↓': this.movePlayer('down'); break;
                    case '←': this.movePlayer('left'); break;
                }
            });
        });
        
        // Acessibilidade
        this.canvas.setAttribute('tabindex', '0');
        this.canvas.setAttribute('role', 'application');
        this.canvas.setAttribute('aria-label', 'Labirinto Lunar - use as setas para mover');
    }

    /**
     * Manipula teclas pressionadas
     */
    handleKeydown(e) {
        if (!this.isRunning || this.isSolved) return;
        
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                e.preventDefault();
                this.movePlayer('up');
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                e.preventDefault();
                this.movePlayer('right');
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                e.preventDefault();
                this.movePlayer('down');
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                e.preventDefault();
                this.movePlayer('left');
                break;
        }
    }

    /**
     * Manipula início do toque
     */
    handleTouchStart(e) {
        if (!this.isRunning || this.isSolved) return;
        
        const touch = e.touches[0];
        this.touchStart = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        };
    }

    /**
     * Manipula movimento do toque (swipe)
     */
    handleTouchMove(e) {
        if (!this.isRunning || this.isSolved || !this.touchStart.x) return;
        
        e.preventDefault();
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStart.x;
        const deltaY = touch.clientY - this.touchStart.y;
        
        // Verificar se o movimento superou o threshold
        if (Math.abs(deltaX) > this.config.swipeThreshold || 
            Math.abs(deltaY) > this.config.swipeThreshold) {
            
            // Determinar direção principal
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                // Horizontal
                this.movePlayer(deltaX > 0 ? 'right' : 'left');
            } else {
                // Vertical
                this.movePlayer(deltaY > 0 ? 'down' : 'up');
            }
            
            // Resetar touch start
            this.touchStart = { x: 0, y: 0 };
        }
    }

    /**
     * Manipula orientação do dispositivo (gyroscope)
     */
    handleDeviceOrientation(e) {
        if (!this.config.useDeviceTilt || !this.gyro.permission || !this.isRunning || this.isSolved) {
            return;
        }
        
        // Atualizar valores do gyroscope
        this.gyro.alpha = e.alpha || 0;
        this.gyro.beta = e.beta || 0;
        this.gyro.gamma = e.gamma || 0;
        
        // Usar gamma (inclinação lateral) e beta (inclinação frontal)
        // Mapear para direções
        const sensitivity = this.config.tiltSensitivity;
        let direction = null;
        
        // Verificar inclinação significativa
        if (Math.abs(this.gyro.gamma) > 15 * sensitivity) {
            direction = this.gyro.gamma > 0 ? 'right' : 'left';
        } else if (Math.abs(this.gyro.beta - 90) > 15 * sensitivity) {
            direction = (this.gyro.beta - 90) > 0 ? 'down' : 'up';
        }
        
        // Mover se houver direção
        if (direction) {
            // Debounce para evitar movimentos muito rápidos
            const now = Date.now();
            if (!this.lastGyroMove || now - this.lastGyroMove > 300) {
                this.movePlayer(direction);
                this.lastGyroMove = now;
            }
        }
    }

    /**
     * Solicita permissão para gyroscope
     */
    async requestGyroPermission() {
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    this.gyro.permission = true;
                    window.addEventListener('deviceorientation', this.handleDeviceOrientation);
                    console.log('✅ Permissão de gyroscope concedida');
                } else {
                    console.warn('Permissão de gyroscope negada');
                }
            } catch (error) {
                console.warn('Erro ao solicitar permissão de gyroscope:', error);
            }
        } else if ('DeviceOrientationEvent' in window) {
            // Dispositivos que não requerem permissão
            this.gyro.permission = true;
            window.addEventListener('deviceorientation', this.handleDeviceOrientation);
            console.log('✅ Gyroscope ativado (sem permissão necessária)');
        } else {
            console.warn('Gyroscope não disponível neste dispositivo');
        }
    }

    /**
     * Cria HUD
     */
    createHUD() {
        // Remover HUD existente
        const existingHUD = this.container.querySelector('.maze-hud');
        if (existingHUD) {
            existingHUD.remove();
        }
        
        // Criar HUD
        this.hud = document.createElement('div');
        this.hud.className = 'maze-hud';
        this.hud.innerHTML = `
            <div class="hud-time">
                <span class="hud-label">Tempo:</span>
                <span class="hud-value" id="maze-time">0s</span>
            </div>
            <div class="hud-moves">
                <span class="hud-label">Movimentos:</span>
                <span class="hud-value" id="maze-moves">0</span>
            </div>
            <div class="hud-best">
                <span class="hud-label">Melhor:</span>
                <span class="hud-value" id="maze-best">--</span>
            </div>
            <div class="hud-size">
                <span class="hud-label">Tamanho:</span>
                <span class="hud-value" id="maze-size">${this.config.rows}x${this.config.cols}</span>
            </div>
        `;
        
        // Adicionar ao container
        const canvasParent = this.canvas.parentElement;
        if (canvasParent) {
            canvasParent.insertBefore(this.hud, this.canvas);
        } else {
            this.container.insertBefore(this.hud, this.canvas);
        }
        
        // Estilizar HUD (estilos inline para simplicidade)
        this.hud.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.5rem;
            margin-bottom: 1rem;
            padding: 0.75rem;
            background: var(--glass);
            border-radius: var(--border-radius-sm);
            border: 1px solid rgba(255,255,255,0.05);
            font-family: var(--font-body);
            font-size: var(--font-size-sm);
        `;
        
        this.hud.querySelectorAll('.hud-time, .hud-moves, .hud-best, .hud-size').forEach(el => {
            el.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.25rem 0.5rem;
                background: rgba(0,0,0,0.2);
                border-radius: 4px;
            `;
        });
        
        this.hud.querySelectorAll('.hud-label').forEach(el => {
            el.style.cssText = `
                color: var(--muted);
                font-weight: 500;
            `;
        });
        
        this.hud.querySelectorAll('.hud-value').forEach(el => {
            el.style.cssText = `
                color: var(--gold);
                font-weight: 700;
                font-family: var(--font-heading);
            `;
        });
    }

    /**
     * Atualiza HUD
     */
    updateHUD() {
        if (!this.hud) return;
        
        const timeEl = this.hud.querySelector('#maze-time');
        const movesEl = this.hud.querySelector('#maze-moves');
        const bestEl = this.hud.querySelector('#maze-best');
        const sizeEl = this.hud.querySelector('#maze-size');
        
        if (timeEl) {
            const seconds = Math.floor(this.elapsedTime / 1000);
            timeEl.textContent = `${seconds}s`;
        }
        
        if (movesEl) movesEl.textContent = this.stats.moves;
        if (bestEl) {
            bestEl.textContent = this.stats.fastestTime === Infinity ? 
                '--' : `${Math.floor(this.stats.fastestTime / 1000)}s`;
        }
        if (sizeEl) sizeEl.textContent = `${this.config.rows}x${this.config.cols}`;
    }

    /**
     * Mostra tela de vitória
     */
    showWinScreen(time) {
        // Criar overlay
        const overlay = document.createElement('div');
        overlay.className = 'game-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.85);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            border-radius: var(--border-radius);
        `;
        
        // Formatar tempo
        const seconds = Math.floor(time / 1000);
        const milliseconds = Math.floor((time % 1000) / 10);
        const timeFormatted = `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
        
        // Verificar se é recorde
        const isRecord = time < this.stats.fastestTime;
        
        // Conteúdo
        overlay.innerHTML = `
            <h3 style="color: var(--gold); margin-bottom: 1rem;">🏆 Labirinto Concluído!</h3>
            <div style="text-align: center; margin-bottom: 2rem;">
                <p style="font-size: 2.5rem; color: var(--gold); font-weight: bold; margin: 0.5rem 0;">
                    ${timeFormatted}
                </p>
                <p style="color: var(--muted);">Tempo</p>
                
                <div style="margin: 1.5rem 0; color: var(--muted);">
                    <p>Movimentos: ${this.stats.moves}</p>
                    <p>Células visitadas: ${this.visited.size} / ${this.config.rows * this.config.cols}</p>
                    ${isRecord ? 
                        '<p style="color: #ffd700; font-weight: bold; margin-top: 1rem;">🎊 Novo Recorde!</p>' : 
                        `<p style="color: var(--muted);">Melhor tempo: ${this.stats.fastestTime === Infinity ? '--' : 
                            Math.floor(this.stats.fastestTime / 1000) + 's'}</p>`
                    }
                </div>
            </div>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center;">
                <button class="btn-gold" id="maze-restart">Jogar Novamente</button>
                <button class="btn-neon" id="maze-new">Novo Labirinto</button>
                <button class="btn" id="maze-close">Fechar</button>
            </div>
            <div style="margin-top: 1.5rem; font-size: 0.8rem; color: var(--muted);">
                <p>Dica: Tente resolver em menos movimentos!</p>
            </div>
        `;
        
        // Adicionar ao container
        this.container.appendChild(overlay);
        
        // Configurar botões
        overlay.querySelector('#maze-restart').addEventListener('click', () => {
            overlay.remove();
            this.startGame();
        });
        
        overlay.querySelector('#maze-new').addEventListener('click', () => {
            overlay.remove();
            this.generate();
            this.startGame();
        });
        
        overlay.querySelector('#maze-close').addEventListener('click', () => {
            overlay.remove();
        });
        
        // Fechar com ESC
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    }

    /**
     * Carrega estatísticas do localStorage
     */
    loadStats() {
        try {
            const stats = localStorage.getItem('agatha_maze_stats');
            if (stats) {
                const parsed = JSON.parse(stats);
                this.stats = { ...this.stats, ...parsed };
                this.bestTime = this.stats.fastestTime;
            }
        } catch (e) {
            console.warn('Não foi possível carregar estatísticas do labirinto:', e);
        }
    }

    /**
     * Salva estatísticas no localStorage
     */
    saveStats() {
        try {
            localStorage.setItem('agatha_maze_stats', JSON.stringify(this.stats));
        } catch (e) {
            console.warn('Não foi possível salvar estatísticas do labirinto:', e);
        }
    }

    /**
     * Destroi o jogo
     */
    destroy() {
        // Parar animação
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Remover listeners
        document.removeEventListener('keydown', this.handleKeydown);
        window.removeEventListener('deviceorientation', this.handleDeviceOrientation);
        
        if (this.canvas) {
            this.canvas.removeEventListener('touchstart', this.handleTouchStart);
            this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        }
        
        // Remover HUD
        if (this.hud && this.hud.parentNode) {
            this.hud.parentNode.removeChild(this.hud);
        }
        
        // Remover overlay
        const overlay = this.container.querySelector('.game-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        console.log('👋 Labirinto Lunar destruído');
    }
}

// Exportar para uso global
window.MazeGame = MazeGame;

// Inicialização automática se houver container
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const mazeContainers = document.querySelectorAll('[data-game-type="maze"]');
        mazeContainers.forEach(container => {
            if (!container.agathaMazeGame) {
                const game = new MazeGame();
                game.init(container);
                container.agathaMazeGame = game;
                
                // Botão de iniciar
                const startBtn = container.querySelector('#start-maze');
                if (startBtn) {
                    startBtn.addEventListener('click', () => game.startGame());
                }
            }
        });
    });
}

console.log('✨ Labirinto Lunar carregado. Use new MazeGame() para criar instâncias.');