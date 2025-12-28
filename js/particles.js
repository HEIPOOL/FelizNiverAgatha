/* particles.js */
/**
 * @file Sistema de partículas para o site da Ágatha Sophia
 * @description Engine de partículas 2D/WebGL com efeitos de brilho e interação
 * @version 1.0.0
 * 
 * Dependências externas (CDN):
 * - Three.js (WebGL): https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
 * - GSAP (animações): https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js (opcional)
 * 
 * API pública: ParticlesSystem class
 * Eventos emitidos: agatha:particles:ready, agatha:particles:spawn
 * localStorage keys: agatha_particles_config
 */

class ParticlesSystem {
    constructor() {
        this.version = '1.0.0';
        this.canvas = null;
        this.context = null;
        this.particles = [];
        this.isRunning = false;
        this.animationId = null;
        this.isWebGL = false;
        this.useThreeJS = false;
        this.lastTime = 0;
        this.mouse = { x: 0, y: 0, active: false };
        this.touch = { x: 0, y: 0, active: false };
        
        // Configurações padrão
        this.config = {
            density: 1, // Mapeado para --particle-density do CSS
            maxParticles: 300,
            particleSize: 2,
            glowIntensity: 1, // Mapeado para --glow-intensity do CSS
            colors: ['#D4AF37', '#4b0f1e', '#ffffff'],
            followMouse: true,
            interactionRadius: 100,
            speed: 1,
            opacity: 0.7,
            spawnRate: 0.5
        };
        
        // Referências Three.js (se disponível)
        this.three = {
            scene: null,
            camera: null,
            renderer: null,
            points: null,
            geometry: null,
            material: null
        };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.destroy = this.destroy.bind(this);
        this.pause = this.pause.bind(this);
        this.resume = this.resume.bind(this);
        this.setDensity = this.setDensity.bind(this);
        this.spawnGlitter = this.spawnGlitter.bind(this);
        this.animate = this.animate.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
    }

    /**
     * Inicializa o sistema de partículas
     * @param {string|HTMLElement} container - Seletor ou elemento container
     * @param {Object} options - Configurações do sistema
     */
    async init(container, options = {}) {
        console.log('✨ Inicializando sistema de partículas');
        
        // Mesclar configurações
        this.config = { ...this.config, ...options };
        
        // Carregar configurações salvas
        this.loadConfig();
        
        // Obter elemento container
        const containerEl = typeof container === 'string' 
            ? document.querySelector(container)
            : container;
            
        if (!containerEl) {
            throw new Error('Container não encontrado');
        }
        
        // Verificar capacidade WebGL
        this.checkWebGLCapability();
        
        // Criar canvas
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'particles-canvas';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        
        containerEl.appendChild(this.canvas);
        
        // Configurar canvas
        this.setupCanvas();
        
        // Inicializar Three.js se disponível
        if (this.useThreeJS && window.THREE) {
            await this.initThreeJS();
        } else {
            this.init2D();
        }
        
        // Criar partículas iniciais
        this.createParticles();
        
        // Configurar interação
        this.setupInteraction();
        
        // Iniciar animação
        this.resume();
        
        // Ajustar para performance baseado na conexão
        this.adjustForPerformance();
        
        // Emitir evento de pronto
        document.dispatchEvent(new CustomEvent('agatha:particles:ready', {
            detail: { 
                version: this.version,
                isWebGL: this.isWebGL,
                particleCount: this.particles.length 
            }
        }));
        
        console.log(`✅ Sistema de partículas inicializado (${this.isWebGL ? 'WebGL' : '2D'})`);
        
        return this;
    }

    /**
     * Verifica capacidade WebGL
     */
    checkWebGLCapability() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            this.isWebGL = !!gl;
            this.useThreeJS = this.isWebGL && typeof THREE !== 'undefined';
            
            // Verificar preferência do usuário por redução de movimento
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                this.useThreeJS = false; // Three.js pode ser mais pesado
            }
            
        } catch (e) {
            this.isWebGL = false;
            this.useThreeJS = false;
        }
    }

    /**
     * Configura canvas com dimensionamento adequado
     */
    setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        if (this.context) {
            this.context.scale(dpr, dpr);
        }
        
        // Redimensionar quando a janela mudar
        window.addEventListener('resize', this.debounce(() => {
            this.resizeCanvas();
        }, 250));
    }

    /**
     * Redimensiona canvas
     */
    resizeCanvas() {
        if (!this.canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        if (this.context) {
            this.context.scale(dpr, dpr);
        }
        
        // Atualizar Three.js se estiver usando
        if (this.useThreeJS && this.three.camera && this.three.renderer) {
            this.three.camera.aspect = rect.width / rect.height;
            this.three.camera.updateProjectionMatrix();
            this.three.renderer.setSize(rect.width, rect.height);
        }
    }

    /**
     * Inicializa Three.js para partículas WebGL
     */
    async initThreeJS() {
        try {
            const THREE = window.THREE;
            const rect = this.canvas.getBoundingClientRect();
            
            // Cena
            this.three.scene = new THREE.Scene();
            
            // Câmera
            this.three.camera = new THREE.PerspectiveCamera(
                75,
                rect.width / rect.height,
                0.1,
                1000
            );
            this.three.camera.position.z = 5;
            
            // Renderer
            this.three.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                alpha: true,
                antialias: true
            });
            this.three.renderer.setSize(rect.width, rect.height);
            this.three.renderer.setPixelRatio(window.devicePixelRatio);
            
            // Material customizado para glow
            const vertexShader = `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `;
            
            const fragmentShader = `
                varying vec3 vColor;
                
                void main() {
                    float r = distance(gl_PointCoord, vec2(0.5, 0.5));
                    if (r > 0.5) discard;
                    
                    float alpha = 1.0 - smoothstep(0.0, 0.5, r);
                    gl_FragColor = vec4(vColor, alpha * 0.7);
                }
            `;
            
            this.three.material = new THREE.ShaderMaterial({
                uniforms: {},
                vertexShader,
                fragmentShader,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthTest: false
            });
            
            console.log('✅ Three.js inicializado para partículas');
            
        } catch (error) {
            console.error('Erro ao inicializar Three.js:', error);
            this.useThreeJS = false;
            this.init2D();
        }
    }

    /**
     * Inicializa sistema 2D (fallback)
     */
    init2D() {
        this.context = this.canvas.getContext('2d');
        
        if (!this.context) {
            throw new Error('Contexto 2D não disponível');
        }
        
        console.log('✅ Modo 2D ativado para partículas');
    }

    /**
     * Cria partículas iniciais
     */
    createParticles() {
        const count = Math.floor(this.config.maxParticles * this.config.density);
        
        // Limpar partículas existentes
        this.particles = [];
        
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle());
        }
        
        // Atualizar CSS var
        document.documentElement.style.setProperty(
            '--particle-density',
            this.config.density
        );
    }

    /**
     * Cria uma partícula individual
     */
    createParticle(isGlitter = false) {
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        
        const colorIndex = Math.floor(Math.random() * this.config.colors.length);
        const color = this.config.colors[colorIndex];
        
        return {
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * this.config.speed,
            vy: (Math.random() - 0.5) * this.config.speed,
            radius: isGlitter 
                ? Math.random() * 3 + 1 
                : Math.random() * this.config.particleSize + 1,
            color: color,
            opacity: isGlitter ? 1 : Math.random() * this.config.opacity + 0.3,
            life: isGlitter ? 1 : Infinity, // Glitter tem vida curta
            maxLife: isGlitter ? 60 : Infinity, // 60 frames para glitter
            isGlitter: isGlitter,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.05
        };
    }

    /**
     * Configura interação com mouse/touch
     */
    setupInteraction() {
        if (this.config.followMouse) {
            // Mouse
            document.addEventListener('mousemove', this.handleMouseMove);
            document.addEventListener('mouseleave', () => {
                this.mouse.active = false;
            });
            document.addEventListener('mouseenter', () => {
                this.mouse.active = true;
            });
            
            // Touch
            document.addEventListener('touchmove', this.handleTouchMove, { passive: true });
            document.addEventListener('touchend', () => {
                this.touch.active = false;
            });
            document.addEventListener('touchstart', () => {
                this.touch.active = true;
            });
        }
        
        // Interação por clique (spawn glitter)
        this.canvas.style.pointerEvents = 'auto';
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.spawnGlitter(x, y, 15);
        });
        
        // Touch para glitter
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            this.spawnGlitter(x, y, 10);
        }, { passive: false });
    }

    /**
     * Manipula movimento do mouse
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        this.mouse.active = true;
    }

    /**
     * Manipula movimento touch
     */
    handleTouchMove(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            this.touch.x = touch.clientX - rect.left;
            this.touch.y = touch.clientY - rect.top;
            this.touch.active = true;
        }
    }

    /**
     * Loop de animação principal
     */
    animate(timestamp) {
        if (!this.isRunning) return;
        
        // Calcular delta time
        const deltaTime = this.lastTime ? timestamp - this.lastTime : 16;
        this.lastTime = timestamp;
        
        // Limpar canvas/frame
        if (this.useThreeJS) {
            this.renderThreeJS();
        } else {
            this.render2D();
        }
        
        // Atualizar partículas
        this.updateParticles(deltaTime);
        
        // Solicitar próximo frame
        this.animationId = requestAnimationFrame(this.animate);
    }

    /**
     * Renderiza usando Three.js
     */
    renderThreeJS() {
        if (!this.useThreeJS || !this.three.renderer) return;
        
        // Atualizar geometria se necessário
        this.updateThreeGeometry();
        
        // Renderizar
        this.three.renderer.render(this.three.scene, this.three.camera);
    }

    /**
     * Atualiza geometria Three.js
     */
    updateThreeGeometry() {
        if (!this.useThreeJS || !this.three.material) return;
        
        // Criar arrays de atributos
        const positions = new Float32Array(this.particles.length * 3);
        const colors = new Float32Array(this.particles.length * 3);
        const sizes = new Float32Array(this.particles.length);
        
        // Preencher arrays
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const idx = i * 3;
            
            // Converter posições 2D para 3D
            positions[idx] = (p.x / this.canvas.width) * 10 - 5;
            positions[idx + 1] = -(p.y / this.canvas.height) * 10 + 5;
            positions[idx + 2] = Math.sin(Date.now() * 0.001 + i) * 2;
            
            // Cor
            const color = this.hexToRgb(p.color);
            colors[idx] = color.r / 255;
            colors[idx + 1] = color.g / 255;
            colors[idx + 2] = color.b / 255;
            
            // Tamanho
            sizes[i] = p.radius * 2;
        }
        
        // Atualizar ou criar geometria
        if (!this.three.geometry) {
            this.three.geometry = new THREE.BufferGeometry();
        }
        
        this.three.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.three.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.three.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Criar ou atualizar sistema de pontos
        if (!this.three.points) {
            this.three.points = new THREE.Points(this.three.geometry, this.three.material);
            this.three.scene.add(this.three.points);
        }
    }

    /**
     * Renderiza modo 2D
     */
    render2D() {
        if (!this.context) return;
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Limpar com desvanecimento sutil
        this.context.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.context.fillRect(0, 0, width, height);
        
        // Desenhar partículas
        this.particles.forEach(particle => {
            this.drawParticle2D(particle);
        });
    }

    /**
     * Desenha uma partícula em 2D
     */
    drawParticle2D(particle) {
        if (!this.context) return;
        
        const ctx = this.context;
        const dpr = window.devicePixelRatio || 1;
        
        ctx.save();
        ctx.scale(1/dpr, 1/dpr); // Ajustar para DPR
        
        // Configurar estilo
        ctx.globalAlpha = particle.opacity;
        
        if (particle.isGlitter) {
            // Brilho mais intenso para glitter
            const gradient = ctx.createRadialGradient(
                particle.x * dpr, particle.y * dpr, 0,
                particle.x * dpr, particle.y * dpr, particle.radius * dpr * 3
            );
            
            gradient.addColorStop(0, particle.color);
            gradient.addColorStop(0.5, particle.color.replace(')', ', 0.5)').replace('rgb', 'rgba'));
            gradient.addColorStop(1, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(particle.x * dpr, particle.y * dpr, particle.radius * dpr * 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Partícula normal
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x * dpr, particle.y * dpr, particle.radius * dpr, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    /**
     * Atualiza estado das partículas
     */
    updateParticles(deltaTime) {
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        const interactionPoint = this.touch.active ? this.touch : this.mouse;
        
        this.particles.forEach((particle, index) => {
            // Atualizar posição
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Rotação
            particle.rotation += particle.rotationSpeed;
            
            // Interação com mouse/touch
            if (interactionPoint.active && this.config.followMouse) {
                const dx = interactionPoint.x - particle.x;
                const dy = interactionPoint.y - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.config.interactionRadius) {
                    const force = (this.config.interactionRadius - distance) / this.config.interactionRadius;
                    const angle = Math.atan2(dy, dx);
                    
                    // Repulsão suave
                    particle.vx -= Math.cos(angle) * force * 0.1;
                    particle.vy -= Math.sin(angle) * force * 0.1;
                }
            }
            
            // Limitar velocidade
            const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            if (speed > 2) {
                particle.vx = (particle.vx / speed) * 2;
                particle.vy = (particle.vy / speed) * 2;
            }
            
            // Rebater nas bordas
            if (particle.x < 0 || particle.x > width) particle.vx *= -0.9;
            if (particle.y < 0 || particle.y > height) particle.vy *= -0.9;
            
            // Manter dentro dos limites
            particle.x = Math.max(0, Math.min(width, particle.x));
            particle.y = Math.max(0, Math.min(height, particle.y));
            
            // Atualizar glitter (vida finita)
            if (particle.isGlitter) {
                particle.life -= 1;
                particle.opacity = particle.life / particle.maxLife;
                
                // Remover glitter morto
                if (particle.life <= 0) {
                    this.particles.splice(index, 1);
                }
            }
            
            // Adicionar atrito
            particle.vx *= 0.99;
            particle.vy *= 0.99;
        });
        
        // Spawn de novas partículas ocasionais
        if (Math.random() < this.config.spawnRate && this.particles.length < this.config.maxParticles) {
            this.particles.push(this.createParticle());
        }
    }

    /**
     * Spawn de glitter em uma posição específica
     * @param {number} x - Posição X
     * @param {number} y - Posição Y
     * @param {number} count - Quantidade de glitter
     */
    spawnGlitter(x, y, count = 10) {
        for (let i = 0; i < count; i++) {
            const glitter = this.createParticle(true);
            glitter.x = x;
            glitter.y = y;
            glitter.vx = (Math.random() - 0.5) * 10;
            glitter.vy = (Math.random() - 0.5) * 10 - 5; // Leve para cima
            
            this.particles.push(glitter);
        }
        
        // Emitir evento
        document.dispatchEvent(new CustomEvent('agatha:particles:spawn', {
            detail: { x, y, count, type: 'glitter' }
        }));
    }

    /**
     * Pausa animação
     */
    pause() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Resume animação
     */
    resume() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = 0;
        this.animationId = requestAnimationFrame(this.animate);
    }

    /**
     * Define densidade de partículas
     * @param {number} density - Nova densidade (0.1 a 3)
     */
    setDensity(density) {
        this.config.density = Math.max(0.1, Math.min(3, density));
        
        // Atualizar CSS var
        document.documentElement.style.setProperty(
            '--particle-density',
            this.config.density
        );
        
        // Recriar partículas
        this.createParticles();
        
        // Salvar configuração
        this.saveConfig();
    }

    /**
     * Ajusta configurações baseadas na performance
     */
    adjustForPerformance() {
        const connection = navigator.connection;
        
        if (connection) {
            // Reduzir em conexões lentas
            if (connection.effectiveType === '2g' || connection.saveData) {
                this.setDensity(0.3);
                this.config.maxParticles = 50;
            }
            
            // Reduzir em dispositivos móveis
            if (/Mobi|Android/i.test(navigator.userAgent)) {
                this.config.maxParticles = 100;
                this.config.spawnRate = 0.2;
            }
        }
        
        // Respeitar prefers-reduced-motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.setDensity(0.1);
            this.pause();
        }
    }

    /**
     * Carrega configurações do localStorage
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem('agatha_particles_config');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = { ...this.config, ...parsed };
            }
        } catch (e) {
            console.warn('Não foi possível carregar configurações de partículas:', e);
        }
    }

    /**
     * Salva configurações no localStorage
     */
    saveConfig() {
        try {
            localStorage.setItem('agatha_particles_config', JSON.stringify(this.config));
        } catch (e) {
            console.warn('Não foi possível salvar configurações de partículas:', e);
        }
    }

    /**
     * Converte hex para RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
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
     * Destroi o sistema e limpa recursos
     */
    destroy() {
        this.pause();
        
        // Remover listeners
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('touchmove', this.handleTouchMove);
        
        // Remover canvas
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        // Limpar Three.js
        if (this.useThreeJS) {
            if (this.three.renderer) {
                this.three.renderer.dispose();
            }
            this.three = {};
        }
        
        // Limpar array
        this.particles = [];
        
        console.log('👋 Sistema de partículas destruído');
    }
}

// Exportar para uso global
window.ParticlesSystem = ParticlesSystem;

// Inicialização automática se houver canvas de partículas
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const canvas = document.querySelector('.particles-canvas');
        if (canvas && !window.agathaParticles) {
            window.agathaParticles = new ParticlesSystem();
        }
    });
}

console.log('✨ Sistema de partículas carregado. Use new ParticlesSystem() para criar instâncias.');