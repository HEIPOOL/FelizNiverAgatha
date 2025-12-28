/* games/game-clicker.js */
/**
 * @file Jogo "Caça aos Brilhos" para o site da Ágatha Sophia
 * @description Jogo de clique/toque em partículas com pontuação e combos
 * @version 1.0.0
 * 
 * Dependências externas:
 * - Sistema de partículas (particles.js) para efeitos visuais
 * 
 * API pública: ClickerGame class
 * Eventos emitidos: agatha:game:score, agatha:game:over, agatha:game:combo
 * localStorage keys: agatha_clicker_highscore, agatha_clicker_stats
 */

class ClickerGame {
    constructor() {
        this.version = '1.0.0';
        this.container = null;
        this.canvas = null;
        this.context = null;
        this.isRunning = false;
        this.isPaused = false;
        this.animationId = null;
        this.lastTime = 0;
        this.score = 0;
        this.highScore = 0;
        this.combo = 0;
        this.comboMultiplier = 1;
        this.comboTimeout = null;
        this.targets = [];
        this.spawnInterval = null;
        this.gameTime = 60000; // 60 segundos
        this.timeLeft = this.gameTime;
        this.gameStartTime = 0;
        
        // Configurações
        this.config = {
            targetCount: 5,
            spawnRate: 1000, // ms
            targetSpeed: 1,
            targetSize: 30,
            comboWindow: 500, // ms para manter combo
            colors: ['#D4AF37', '#4b0f1e', '#ffffff', '#ff6b6b'],
            particleSpawnCount: 5
        };
        
        // Estatísticas
        this.stats = {
            clicks: 0,
            hits: 0,
            misses: 0,
            maxCombo: 0,
            totalTimePlayed: 0,
            gamesPlayed: 0
        };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.start = this.start.bind(this);
        this.pause = this.pause.bind(this);
        this.resume = this.resume.bind(this);
        this.stop = this.stop.bind(this);
        this.getHighscore = this.getHighscore.bind(this);
        this.resetHighscore = this.resetHighscore.bind(this);
        this.animate = this.animate.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleTouch = this.handleTouch.bind(this);
        this.spawnTarget = this.spawnTarget.bind(this);
        this.updateTargets = this.updateTargets.bind(this);
        this.drawTargets = this.drawTargets.bind(this);
        this.checkCollision = this.checkCollision.bind(this);
        this.updateHUD = this.updateHUD.bind(this);
        this.gameOver = this.gameOver.bind(this);
        this.debounce = this.debounce.bind(this);
    }

    /**
     * Inicializa o jogo
     * @param {HTMLElement} container - Container do jogo
     * @param {Object} options - Configurações
     */
    async init(container, options = {}) {
        console.log('🎮 Inicializando Caça aos Brilhos');
        
        // Mesclar configurações
        this.config = { ...this.config, ...options };
        
        // Obter container
        this.container = container;
        if (!this.container) {
            throw new Error('Container do jogo não encontrado');
        }
        
        // Carregar highscore e estatísticas
        this.loadStats();
        
        // Criar canvas
        this.canvas = container.querySelector('.game-canvas') || document.createElement('canvas');
        this.canvas.className = 'game-canvas';
        this.canvas.width = 300;
        this.canvas.height = 300;
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
        
        // Configurar interação
        this.setupInteraction();
        
        // Criar HUD
        this.createHUD();
        
        // Configurar para performance
        this.adjustForPerformance();
        
        console.log('✅ Caça aos Brilhos inicializado');
        
        return this;
    }

    /**
     * Cria HUD (Heads-Up Display)
     */
    createHUD() {
        // Remover HUD existente
        const existingHUD = this.container.querySelector('.clicker-hud');
        if (existingHUD) {
            existingHUD.remove();
        }
        
        // Criar HUD
        this.hud = document.createElement('div');
        this.hud.className = 'clicker-hud';
        this.hud.innerHTML = `
            <div class="hud-score">
                <span class="hud-label">Pontuação:</span>
                <span class="hud-value" id="clicker-score">0</span>
            </div>
            <div class="hud-combo">
                <span class="hud-label">Combo:</span>
                <span class="hud-value" id="clicker-combo">x1</span>
            </div>
            <div class="hud-time">
                <span class="hud-label">Tempo:</span>
                <span class="hud-value" id="clicker-time">60s</span>
            </div>
            <div class="hud-highscore">
                <span class="hud-label">Recorde:</span>
                <span class="hud-value" id="clicker-highscore">${this.highScore}</span>
            </div>
        `;
        
        // Adicionar ao container
        const canvasParent = this.canvas.parentElement;
        if (canvasParent) {
            canvasParent.insertBefore(this.hud, this.canvas);
        } else {
            this.container.insertBefore(this.hud, this.canvas);
        }
        
        // Estilizar HUD
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
        
        // Estilizar elementos HUD
        this.hud.querySelectorAll('.hud-score, .hud-combo, .hud-time, .hud-highscore').forEach(el => {
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
     * Configura interação
     */
    setupInteraction() {
        // Clique do mouse
        this.canvas.addEventListener('click', this.handleClick);
        
        // Touch (com debounce para evitar multi-touch)
        this.canvas.addEventListener('touchstart', this.handleTouch, { passive: false });
        
        // Acessibilidade: teclado
        this.canvas.setAttribute('tabindex', '0');
        this.canvas.setAttribute('role', 'button');
        this.canvas.setAttribute('aria-label', 'Jogo Caça aos Brilhos - clique nas partículas brilhantes');
        
        this.canvas.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                // Simular clique no centro
                const rect = this.canvas.getBoundingClientRect();
                this.handleClick({
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2
                });
            }
        });
        
        // Pausar quando a janela perder foco
        window.addEventListener('blur', () => {
            if (this.isRunning && !this.isPaused) {
                this.pause();
            }
        });
        
        window.addEventListener('focus', () => {
            if (this.isRunning && this.isPaused) {
                this.resume();
            }
        });
    }

    /**
     * Inicia o jogo
     */
    start() {
        if (this.isRunning) return;
        
        console.log('🚀 Iniciando Caça aos Brilhos');
        
        // Resetar estado
        this.score = 0;
        this.combo = 0;
        this.comboMultiplier = 1;
        this.timeLeft = this.gameTime;
        this.targets = [];
        this.gameStartTime = Date.now();
        
        // Limpar timeouts anteriores
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
        }
        if (this.comboTimeout) {
            clearTimeout(this.comboTimeout);
        }
        
        // Iniciar spawn de targets
        this.spawnInterval = setInterval(this.spawnTarget, this.config.spawnRate);
        
        // Spawn inicial
        for (let i = 0; i < this.config.targetCount; i++) {
            setTimeout(() => this.spawnTarget(), i * 200);
        }
        
        // Iniciar animação
        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = 0;
        this.animationId = requestAnimationFrame(this.animate);
        
        // Atualizar HUD
        this.updateHUD();
        
        // Incrementar contador de jogos
        this.stats.gamesPlayed++;
    }

    /**
     * Pausa o jogo
     */
    pause() {
        if (!this.isRunning || this.isPaused) return;
        
        this.isPaused = true;
        
        // Pausar spawn
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
        
        // Pausar combo timeout
        if (this.comboTimeout) {
            clearTimeout(this.comboTimeout);
            this.comboTimeout = null;
        }
        
        console.log('⏸️ Jogo pausado');
    }

    /**
     * Retoma o jogo
     */
    resume() {
        if (!this.isRunning || !this.isPaused) return;
        
        this.isPaused = false;
        
        // Retomar spawn
        this.spawnInterval = setInterval(this.spawnTarget, this.config.spawnRate);
        
        // Retomar animação
        this.lastTime = 0;
        this.animationId = requestAnimationFrame(this.animate);
        
        console.log('▶️ Jogo retomado');
    }

    /**
     * Para o jogo
     */
    stop() {
        console.log('🛑 Parando jogo');
        
        this.isRunning = false;
        this.isPaused = false;
        
        // Limpar intervalos
        if (this.spawnInterval) {
            clearInterval(this.spawnInterval);
            this.spawnInterval = null;
        }
        
        if (this.comboTimeout) {
            clearTimeout(this.comboTimeout);
            this.comboTimeout = null;
        }
        
        // Parar animação
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Limpar targets
        this.targets = [];
        
        // Limpar canvas
        if (this.context) {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Loop de animação principal
     */
    animate(timestamp) {
        if (!this.isRunning || this.isPaused) return;
        
        // Calcular delta time
        const deltaTime = this.lastTime ? timestamp - this.lastTime : 16;
        this.lastTime = timestamp;
        
        // Atualizar tempo restante
        this.timeLeft -= deltaTime;
        
        // Verificar fim do jogo
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.gameOver();
            return;
        }
        
        // Limpar canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Atualizar e desenhar targets
        this.updateTargets(deltaTime);
        this.drawTargets();
        
        // Atualizar HUD periodicamente
        if (timestamp % 16 < 8) { // ~60fps
            this.updateHUD();
        }
        
        // Continuar animação
        this.animationId = requestAnimationFrame(this.animate);
    }

    /**
     * Spawn de um novo target
     */
    spawnTarget() {
        if (!this.isRunning || this.isPaused) return;
        
        const size = this.config.targetSize * (0.8 + Math.random() * 0.4);
        const color = this.config.colors[Math.floor(Math.random() * this.config.colors.length)];
        
        // Escolher lado de spawn (fora da tela)
        const side = Math.floor(Math.random() * 4);
        let x, y, vx, vy;
        
        switch(side) {
            case 0: // Topo
                x = Math.random() * this.canvas.width;
                y = -size;
                vx = (Math.random() - 0.5) * this.config.targetSpeed;
                vy = Math.random() * this.config.targetSpeed;
                break;
            case 1: // Direita
                x = this.canvas.width + size;
                y = Math.random() * this.canvas.height;
                vx = -Math.random() * this.config.targetSpeed;
                vy = (Math.random() - 0.5) * this.config.targetSpeed;
                break;
            case 2: // Fundo
                x = Math.random() * this.canvas.width;
                y = this.canvas.height + size;
                vx = (Math.random() - 0.5) * this.config.targetSpeed;
                vy = -Math.random() * this.config.targetSpeed;
                break;
            case 3: // Esquerda
                x = -size;
                y = Math.random() * this.canvas.height;
                vx = Math.random() * this.config.targetSpeed;
                vy = (Math.random() - 0.5) * this.config.targetSpeed;
                break;
        }
        
        this.targets.push({
            x, y, vx, vy,
            size,
            color,
            alpha: 1,
            life: 300, // frames de vida
            maxLife: 300,
            isGlowing: true,
            glowPhase: Math.random() * Math.PI * 2
        });
    }

    /**
     * Atualiza estado dos targets
     */
    updateTargets(deltaTime) {
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            
            // Atualizar posição
            target.x += target.vx;
            target.y += target.vy;
            
            // Atualizar fase do brilho
            target.glowPhase += deltaTime * 0.01;
            
            // Atualizar vida
            target.life -= 1;
            target.alpha = target.life / target.maxLife;
            
            // Remover se saiu da tela ou morreu
            const margin = target.size * 2;
            if (target.life <= 0 || 
                target.x < -margin || target.x > this.canvas.width + margin ||
                target.y < -margin || target.y > this.canvas.height + margin) {
                
                this.targets.splice(i, 1);
                this.stats.misses++;
            }
        }
    }

    /**
     * Desenha targets no canvas
     */
    drawTargets() {
        this.targets.forEach(target => {
            const ctx = this.context;
            const glowSize = target.size * (1.2 + Math.sin(target.glowPhase) * 0.3);
            
            // Brilho externo
            const gradient = ctx.createRadialGradient(
                target.x, target.y, target.size,
                target.x, target.y, glowSize
            );
            
            gradient.addColorStop(0, target.color);
            gradient.addColorStop(0.7, target.color.replace(')', ', 0.3)').replace('rgb', 'rgba'));
            gradient.addColorStop(1, 'transparent');
            
            // Corpo do target
            ctx.globalAlpha = target.alpha;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(target.x, target.y, glowSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Núcleo
            ctx.fillStyle = target.color;
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.size * 0.7, 0, Math.PI * 2);
            ctx.fill();
            
            // Brilho interno
            ctx.fillStyle = 'white';
            ctx.globalAlpha = target.alpha * 0.5;
            ctx.beginPath();
            ctx.arc(
                target.x - target.size * 0.3,
                target.y - target.size * 0.3,
                target.size * 0.2,
                0, Math.PI * 2
            );
            ctx.fill();
            
            ctx.globalAlpha = 1;
        });
    }

    /**
     * Manipula clique do mouse
     */
    handleClick(e) {
        if (!this.isRunning || this.isPaused) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.processClick(x, y);
    }

    /**
     * Manipula toque
     */
    handleTouch(e) {
        if (!this.isRunning || this.isPaused) return;
        
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        this.processClick(x, y);
        
        // Debounce para evitar multi-touch
        this.canvas.style.pointerEvents = 'none';
        setTimeout(() => {
            this.canvas.style.pointerEvents = 'auto';
        }, 100);
    }

    /**
     * Processa clique/toque
     */
    processClick(x, y) {
        this.stats.clicks++;
        
        let hit = false;
        
        // Verificar colisão com targets
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            
            if (this.checkCollision(x, y, target)) {
                // Remover target
                this.targets.splice(i, 1);
                
                // Atualizar combo
                this.updateCombo();
                
                // Calcular pontos
                const points = Math.floor(100 * this.comboMultiplier * (target.size / this.config.targetSize));
                this.score += points;
                
                // Spawn de partículas
                if (window.agathaParticles && window.agathaParticles.spawnGlitter) {
                    window.agathaParticles.spawnGlitter(x, y, this.config.particleSpawnCount);
                }
                
                // Efeito visual
                this.createClickEffect(x, y, target.color);
                
                this.stats.hits++;
                hit = true;
                
                // Emitir evento de score
                document.dispatchEvent(new CustomEvent('agatha:game:score', {
                    detail: {
                        game: 'clicker',
                        score: this.score,
                        points,
                        combo: this.combo,
                        multiplier: this.comboMultiplier,
                        x,
                        y
                    }
                }));
                
                break; // Um clique acerta apenas um target
            }
        }
        
        // Se errou, resetar combo
        if (!hit) {
            this.resetCombo();
        }
        
        // Atualizar HUD
        this.updateHUD();
    }

    /**
     * Verifica colisão ponto-círculo
     */
    checkCollision(x, y, target) {
        const dx = x - target.x;
        const dy = y - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= target.size;
    }

    /**
     * Atualiza combo
     */
    updateCombo() {
        this.combo++;
        
        // Atualizar multiplicador
        if (this.combo >= 10) this.comboMultiplier = 4;
        else if (this.combo >= 7) this.comboMultiplier = 3;
        else if (this.combo >= 4) this.comboMultiplier = 2;
        else this.comboMultiplier = 1;
        
        // Atualizar máximo combo
        if (this.combo > this.stats.maxCombo) {
            this.stats.maxCombo = this.combo;
        }
        
        // Resetar timeout do combo
        if (this.comboTimeout) {
            clearTimeout(this.comboTimeout);
        }
        
        this.comboTimeout = setTimeout(() => {
            this.resetCombo();
        }, this.config.comboWindow);
        
        // Emitir evento de combo
        if (this.combo > 3) {
            document.dispatchEvent(new CustomEvent('agatha:game:combo', {
                detail: {
                    game: 'clicker',
                    combo: this.combo,
                    multiplier: this.comboMultiplier
                }
            }));
        }
    }

    /**
     * Reseta combo
     */
    resetCombo() {
        this.combo = 0;
        this.comboMultiplier = 1;
        
        if (this.comboTimeout) {
            clearTimeout(this.comboTimeout);
            this.comboTimeout = null;
        }
    }

    /**
     * Cria efeito visual no clique
     */
    createClickEffect(x, y, color) {
        const ctx = this.context;
        
        // Anel de expansão
        const ring = {
            x, y,
            radius: 0,
            maxRadius: 30,
            alpha: 0.8,
            color
        };
        
        const animateRing = () => {
            ring.radius += 3;
            ring.alpha -= 0.05;
            
            if (ring.alpha > 0) {
                ctx.strokeStyle = color.replace(')', `, ${ring.alpha})`).replace('rgb', 'rgba');
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
                ctx.stroke();
                
                requestAnimationFrame(animateRing);
            }
        };
        
        animateRing();
    }

    /**
     * Atualiza HUD
     */
    updateHUD() {
        if (!this.hud) return;
        
        // Atualizar valores
        const scoreEl = this.hud.querySelector('#clicker-score');
        const comboEl = this.hud.querySelector('#clicker-combo');
        const timeEl = this.hud.querySelector('#clicker-time');
        const highscoreEl = this.hud.querySelector('#clicker-highscore');
        
        if (scoreEl) scoreEl.textContent = this.score;
        if (comboEl) comboEl.textContent = `x${this.comboMultiplier} (${this.combo})`;
        if (timeEl) timeEl.textContent = `${Math.ceil(this.timeLeft / 1000)}s`;
        if (highscoreEl) highscoreEl.textContent = this.highScore;
        
        // Destacar combo alto
        if (comboEl) {
            if (this.combo >= 7) {
                comboEl.style.color = '#ffd700';
                comboEl.style.textShadow = '0 0 10px #ffd700';
            } else if (this.combo >= 4) {
                comboEl.style.color = '#ff6b6b';
                comboEl.style.textShadow = '0 0 5px #ff6b6b';
            } else {
                comboEl.style.color = '';
                comboEl.style.textShadow = '';
            }
        }
    }

    /**
     * Fim do jogo
     */
    gameOver() {
        console.log('🎯 Fim do jogo! Pontuação:', this.score);
        
        this.stop();
        
        // Atualizar highscore
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.saveStats();
        }
        
        // Atualizar estatísticas
        this.stats.totalTimePlayed += this.gameTime - this.timeLeft;
        this.saveStats();
        
        // Criar tela de game over
        this.showGameOverScreen();
        
        // Emitir evento de game over
        document.dispatchEvent(new CustomEvent('agatha:game:over', {
            detail: {
                game: 'clicker',
                score: this.score,
                highScore: this.highScore,
                time: this.gameTime - this.timeLeft,
                stats: this.stats
            }
        }));
    }

    /**
     * Mostra tela de game over
     */
    showGameOverScreen() {
        // Criar overlay
        const overlay = document.createElement('div');
        overlay.className = 'game-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            border-radius: var(--border-radius);
        `;
        
        // Conteúdo
        overlay.innerHTML = `
            <h3 style="color: var(--gold); margin-bottom: 1rem;">🎯 Fim do Jogo!</h3>
            <div style="text-align: center; margin-bottom: 2rem;">
                <p style="font-size: 3rem; color: var(--gold); font-weight: bold; margin: 0.5rem 0;">
                    ${this.score}
                </p>
                <p style="color: var(--muted);">Pontuação Final</p>
                
                ${this.score === this.highScore ? 
                    '<p style="color: #ffd700; font-weight: bold;">🎊 Novo Recorde!</p>' : 
                    `<p style="color: var(--muted);">Recorde: ${this.highScore}</p>`
                }
                
                <div style="margin-top: 1.5rem; color: var(--muted); font-size: 0.9rem;">
                    <p>Acertos: ${this.stats.hits} / Cliques: ${this.stats.clicks}</p>
                    <p>Maior Combo: ${this.stats.maxCombo}</p>
                    <p>Precisão: ${this.stats.clicks > 0 ? Math.round((this.stats.hits / this.stats.clicks) * 100) : 0}%</p>
                </div>
            </div>
            <div style="display: flex; gap: 1rem;">
                <button class="btn-gold" id="restart-clicker">Jogar Novamente</button>
                <button class="btn-neon" id="close-gameover">Fechar</button>
            </div>
        `;
        
        // Adicionar ao container
        this.container.appendChild(overlay);
        
        // Configurar botões
        overlay.querySelector('#restart-clicker').addEventListener('click', () => {
            overlay.remove();
            this.start();
        });
        
        overlay.querySelector('#close-gameover').addEventListener('click', () => {
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
     * Obtém highscore
     */
    getHighscore() {
        return this.highScore;
    }

    /**
     * Reseta highscore
     */
    resetHighscore() {
        this.highScore = 0;
        this.saveStats();
        this.updateHUD();
    }

    /**
     * Carrega estatísticas do localStorage
     */
    loadStats() {
        try {
            // Highscore
            const highscore = localStorage.getItem('agatha_clicker_highscore');
            this.highScore = highscore ? parseInt(highscore) : 0;
            
            // Estatísticas
            const stats = localStorage.getItem('agatha_clicker_stats');
            if (stats) {
                this.stats = { ...this.stats, ...JSON.parse(stats) };
            }
        } catch (e) {
            console.warn('Não foi possível carregar estatísticas do jogo:', e);
        }
    }

    /**
     * Salva estatísticas no localStorage
     */
    saveStats() {
        try {
            localStorage.setItem('agatha_clicker_highscore', this.highScore.toString());
            localStorage.setItem('agatha_clicker_stats', JSON.stringify(this.stats));
        } catch (e) {
            console.warn('Não foi possível salvar estatísticas do jogo:', e);
        }
    }

    /**
     * Ajusta para performance
     */
    adjustForPerformance() {
        // Reduzir em dispositivos móveis
        if (/Mobi|Android/i.test(navigator.userAgent)) {
            this.config.targetCount = 3;
            this.config.spawnRate = 1500;
        }
        
        // Respeitar prefers-reduced-motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.config.targetSpeed = 0.5;
            this.config.spawnRate = 2000;
        }
    }

    /**
     * Debounce utility
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Destroi o jogo
     */
    destroy() {
        this.stop();
        
        // Remover listeners
        if (this.canvas) {
            this.canvas.removeEventListener('click', this.handleClick);
            this.canvas.removeEventListener('touchstart', this.handleTouch);
        }
        
        // Remover HUD
        if (this.hud && this.hud.parentNode) {
            this.hud.parentNode.removeChild(this.hud);
        }
        
        // Remover overlay de game over
        const overlay = this.container.querySelector('.game-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        console.log('👋 Caça aos Brilhos destruído');
    }
}

// Exportar para uso global
window.ClickerGame = ClickerGame;

// Inicialização automática se houver container
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const clickerContainers = document.querySelectorAll('[data-game-type="clicker"]');
        clickerContainers.forEach(container => {
            if (!container.agathaClickerGame) {
                const game = new ClickerGame();
                game.init(container);
                container.agathaClickerGame = game;
            }
        });
    });
}

console.log('✨ Caça aos Brilhos carregado. Use new ClickerGame() para criar instâncias.');