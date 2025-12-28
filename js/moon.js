/* moon.js */
/**
 * @file Sistema da Lua interativa para o site da Ágatha Sophia
 * @description Lua com parallax, revelação de mensagens e efeitos visuais
 * @version 1.0.0
 * 
 * Dependências externas (CDN):
 * - GSAP (animações): https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js
 * - anime.js (alternativa): https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js
 * 
 * API pública: MoonSystem class
 * Eventos emitidos: agatha:moon:ready, agatha:moon:reveal, agatha:moon:pulse
 * localStorage keys: agatha_prefs (lastMoonReveal)
 */

class MoonSystem {
    constructor() {
        this.version = '1.0.0';
        this.element = null;
        this.container = null;
        this.layers = [];
        this.isInitialized = false;
        this.isAnimating = false;
        this.parallaxIntensity = 0.5;
        this.revealMessages = [];
        this.currentMessageIndex = 0;
        
        // Referências para animação
        this.animation = null;
        this.rafId = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.destroy = this.destroy.bind(this);
        this.revealMessage = this.revealMessage.bind(this);
        this.pulse = this.pulse.bind(this);
        this.setParallaxIntensity = this.setParallaxIntensity.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.animateParallax = this.animateParallax.bind(this);
    }

    /**
     * Inicializa o sistema da lua
     * @param {string|HTMLElement} selector - Seletor ou elemento da lua
     * @param {Object} options - Configurações
     */
    async init(selector, options = {}) {
        console.log('🌙 Inicializando sistema da lua');
        
        // Mesclar opções
        const defaultOptions = {
            parallaxIntensity: 0.5,
            revealMessages: [
                'Feliz 16 anos, Ágatha!',
                'Que todos os seus sonhos se realizem',
                'Sua luz ilumina tudo ao redor',
                'Você é única e especial',
                'O brilho dos seus olhos é como o luar'
            ],
            autoRotate: true,
            rotationSpeed: 0.1,
            glowIntensity: 1
        };
        
        this.config = { ...defaultOptions, ...options };
        this.parallaxIntensity = this.config.parallaxIntensity;
        this.revealMessages = this.config.revealMessages;
        
        // Obter elemento
        this.element = typeof selector === 'string' 
            ? document.querySelector(selector)
            : selector;
            
        if (!this.element) {
            throw new Error('Elemento da lua não encontrado');
        }
        
        this.container = this.element.closest('.moon-container') || this.element.parentElement;
        
        // Carregar último timestamp de revelação
        this.loadLastReveal();
        
        // Configurar camadas de parallax
        this.setupLayers();
        
        // Configurar interações
        this.setupInteractions();
        
        // Iniciar animação de parallax
        this.startParallax();
        
        // Configurar GSAP se disponível
        if (typeof gsap !== 'undefined') {
            this.gsap = gsap;
            console.log('✅ GSAP disponível para animações da lua');
        }
        
        this.isInitialized = true;
        
        // Emitir evento de pronto
        document.dispatchEvent(new CustomEvent('agatha:moon:ready', {
            detail: { 
                version: this.version,
                hasGSAP: !!this.gsap 
            }
        }));
        
        console.log('✅ Sistema da lua inicializado');
        
        return this;
    }

    /**
     * Configura camadas de parallax
     */
    setupLayers() {
        // Limpar camadas existentes
        this.layers = [];
        
        // Criar camadas internas
        const layerCount = 3;
        
        for (let i = 0; i < layerCount; i++) {
            const layer = document.createElement('div');
            layer.className = `moon-layer layer-${i + 1}`;
            layer.style.position = 'absolute';
            layer.style.top = '0';
            layer.style.left = '0';
            layer.style.width = '100%';
            layer.style.height = '100%';
            layer.style.borderRadius = '50%';
            layer.style.pointerEvents = 'none';
            
            // Configurar aparência baseada na camada
            switch(i) {
                case 0: // Camada mais interna (crateras)
                    layer.style.background = 'radial-gradient(circle at 30% 30%, rgba(0,0,0,0.3), transparent 70%)';
                    layer.style.filter = 'blur(2px)';
                    layer.setAttribute('data-depth', '0.2');
                    break;
                case 1: // Camada média (textura)
                    layer.style.background = 'radial-gradient(circle at 70% 70%, rgba(255,255,255,0.1), transparent 60%)';
                    layer.style.filter = 'blur(1px)';
                    layer.setAttribute('data-depth', '0.5');
                    break;
                case 2: // Camada externa (brilho)
                    layer.style.background = 'radial-gradient(circle at 40% 40%, rgba(212,175,55,0.1), transparent 80%)';
                    layer.style.filter = 'blur(3px)';
                    layer.setAttribute('data-depth', '0.8');
                    break;
            }
            
            this.element.appendChild(layer);
            this.layers.push({
                element: layer,
                depth: parseFloat(layer.getAttribute('data-depth'))
            });
        }
        
        console.log(`✅ ${this.layers.length} camadas de parallax criadas`);
    }

    /**
     * Configura interações
     */
    setupInteractions() {
        // Clique/toque
        this.element.addEventListener('click', this.handleClick);
        this.element.addEventListener('touchstart', this.handleClick, { passive: true });
        
        // Mouse move para parallax
        this.container.addEventListener('mousemove', this.handleMouseMove);
        this.container.addEventListener('mouseleave', () => {
            this.mouseX = null;
            this.mouseY = null;
        });
        
        // Touch move para parallax
        this.container.addEventListener('touchmove', this.handleTouchMove, { passive: true });
        this.container.addEventListener('touchend', () => {
            this.touchX = null;
            this.touchY = null;
        });
        
        // Adicionar cursor pointer
        this.element.style.cursor = 'pointer';
        
        // Tooltip acessível
        this.element.setAttribute('aria-label', 'Clique para revelar mensagens especiais');
        this.element.setAttribute('role', 'button');
        this.element.setAttribute('tabindex', '0');
        
        // Suporte a teclado
        this.element.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleClick(e);
            }
        });
    }

    /**
     * Inicia animação de parallax
     */
    startParallax() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        this.rafId = requestAnimationFrame(this.animateParallax);
    }

    /**
     * Anima camadas com parallax
     */
    animateParallax() {
        if (!this.isInitialized) return;
        
        // Usar posição do mouse ou touch
        let clientX = this.mouseX || this.touchX;
        let clientY = this.mouseY || this.touchY;
        
        if (clientX !== undefined && clientY !== undefined) {
            const rect = this.container.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Calcular deslocamento do centro
            const deltaX = clientX - centerX;
            const deltaY = clientY - centerY;
            
            // Calcular intensidade baseada na distância
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = Math.max(rect.width, rect.height) / 2;
            const intensity = Math.min(distance / maxDistance, 1) * this.parallaxIntensity;
            
            // Aplicar transformações nas camadas
            this.layers.forEach(layer => {
                const depth = layer.depth;
                const translateX = deltaX * depth * intensity * 0.1;
                const translateY = deltaY * depth * intensity * 0.1;
                
                // Usar transformações 3D para performance
                layer.element.style.transform = 
                    `translate3d(${translateX}px, ${translateY}px, 0)`;
            });
            
            // Efeito de inclinação leve na lua principal
            const tiltX = (deltaY / maxDistance) * 5;
            const tiltY = (deltaX / maxDistance) * -5;
            
            this.element.style.transform = 
                `translate3d(0, 0, 0) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        } else {
            // Retorno suave ao centro
            this.layers.forEach(layer => {
                layer.element.style.transform = 'translate3d(0, 0, 0)';
            });
            this.element.style.transform = 'translate3d(0, 0, 0)';
        }
        
        // Continuar animação
        this.rafId = requestAnimationFrame(this.animateParallax);
    }

    /**
     * Manipula movimento do mouse
     */
    handleMouseMove(e) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        this.touchX = null;
        this.touchY = null;
    }

    /**
     * Manipula movimento touch
     */
    handleTouchMove(e) {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.touchX = touch.clientX;
            this.touchY = touch.clientY;
            this.mouseX = null;
            this.mouseY = null;
        }
    }

    /**
     * Manipula clique/toque na lua
     */
    handleClick(e) {
        e.preventDefault();
        
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        // Executar animação de pulso
        this.pulse().then(() => {
            // Revelar próxima mensagem
            this.revealMessage();
            this.isAnimating = false;
        }).catch(() => {
            this.isAnimating = false;
        });
    }

    /**
     * Executa animação de pulso
     */
    async pulse() {
        return new Promise((resolve) => {
            // Adicionar classe de pulso
            this.element.classList.add('pulsing');
            
            // Usar GSAP se disponível
            if (this.gsap) {
                this.gsap.to(this.element, {
                    scale: 1.1,
                    duration: 0.3,
                    ease: "power2.out",
                    onComplete: () => {
                        this.gsap.to(this.element, {
                            scale: 1,
                            duration: 0.5,
                            ease: "elastic.out(1, 0.5)",
                            onComplete: () => {
                                this.element.classList.remove('pulsing');
                                resolve();
                            }
                        });
                    }
                });
            } else {
                // Fallback com CSS animation
                this.element.style.animation = 'pulse-glow 0.8s ease-in-out';
                
                setTimeout(() => {
                    this.element.style.animation = '';
                    this.element.classList.remove('pulsing');
                    resolve();
                }, 800);
            }
            
            // Emitir evento de pulso
            document.dispatchEvent(new CustomEvent('agatha:moon:pulse'));
        });
    }

    /**
     * Revela uma mensagem especial
     * @param {string} customMessage - Mensagem personalizada (opcional)
     */
    async revealMessage(customMessage = null) {
        const message = customMessage || this.getNextMessage();
        
        // Salvar timestamp da revelação
        this.saveRevealTimestamp();
        
        // Criar elemento de mensagem
        const messageEl = document.createElement('div');
        messageEl.className = 'moon-message';
        messageEl.innerHTML = `
            <div class="moon-message-content">
                <div class="moon-message-text">${message}</div>
                <button class="moon-message-close" aria-label="Fechar mensagem">×</button>
            </div>
        `;
        
        // Adicionar ao DOM
        document.body.appendChild(messageEl);
        
        // Spawn de glitter usando sistema de partículas
        if (window.agathaParticles && window.agathaParticles.spawnGlitter) {
            const rect = this.element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            window.agathaParticles.spawnGlitter(centerX, centerY, 30);
        }
        
        // Configurar fechamento
        const closeBtn = messageEl.querySelector('.moon-message-close');
        const closeMessage = () => {
            messageEl.remove();
            document.removeEventListener('keydown', handleEscape);
        };
        
        closeBtn.addEventListener('click', closeMessage);
        
        const handleEscape = (e) => {
            if (e.key === 'Escape') closeMessage();
        };
        document.addEventListener('keydown', handleEscape);
        
        // Auto-fechar após 5 segundos
        setTimeout(closeMessage, 5000);
        
        // Animar entrada
        if (this.gsap) {
            this.gsap.fromTo(messageEl, 
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.7)" }
            );
        } else {
            messageEl.style.animation = 'fade-slide-up 0.5s ease-out forwards';
        }
        
        // Emitir evento de revelação
        document.dispatchEvent(new CustomEvent('agatha:moon:reveal', {
            detail: { 
                message,
                timestamp: new Date().toISOString(),
                index: this.currentMessageIndex
            }
        }));
        
        console.log(`📜 Mensagem revelada: "${message}"`);
    }

    /**
     * Obtém próxima mensagem da sequência
     */
    getNextMessage() {
        if (this.revealMessages.length === 0) {
            return 'Feliz 16 anos, Ágatha!';
        }
        
        const message = this.revealMessages[this.currentMessageIndex];
        this.currentMessageIndex = (this.currentMessageIndex + 1) % this.revealMessages.length;
        
        return message;
    }

    /**
     * Define intensidade do parallax
     * @param {number} intensity - Intensidade (0 a 1)
     */
    setParallaxIntensity(intensity) {
        this.parallaxIntensity = Math.max(0, Math.min(1, intensity));
        
        // Atualizar CSS var
        document.documentElement.style.setProperty(
            '--parallax-intensity',
            this.parallaxIntensity
        );
    }

    /**
     * Carrega último timestamp de revelação
     */
    loadLastReveal() {
        try {
            const prefs = localStorage.getItem('agatha_prefs');
            if (prefs) {
                const parsed = JSON.parse(prefs);
                if (parsed.lastMoonReveal) {
                    console.log('📅 Última revelação da lua:', new Date(parsed.lastMoonReveal).toLocaleString());
                }
            }
        } catch (e) {
            console.warn('Não foi possível carregar último timestamp da lua:', e);
        }
    }

    /**
     * Salva timestamp da revelação
     */
    saveRevealTimestamp() {
        try {
            const prefs = JSON.parse(localStorage.getItem('agatha_prefs') || '{}');
            prefs.lastMoonReveal = new Date().toISOString();
            localStorage.setItem('agatha_prefs', JSON.stringify(prefs));
        } catch (e) {
            console.warn('Não foi possível salvar timestamp da lua:', e);
        }
    }

    /**
     * Destroi o sistema e limpa recursos
     */
    destroy() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        // Remover listeners
        if (this.container) {
            this.container.removeEventListener('mousemove', this.handleMouseMove);
            this.container.removeEventListener('touchmove', this.handleTouchMove);
        }
        
        if (this.element) {
            this.element.removeEventListener('click', this.handleClick);
            this.element.removeEventListener('touchstart', this.handleClick);
            
            // Remover camadas
            this.layers.forEach(layer => {
                if (layer.element.parentNode) {
                    layer.element.parentNode.removeChild(layer.element);
                }
            });
            this.layers = [];
        }
        
        // Remover mensagens abertas
        document.querySelectorAll('.moon-message').forEach(msg => msg.remove());
        
        this.isInitialized = false;
        
        console.log('👋 Sistema da lua destruído');
    }
}

// Exportar para uso global
window.MoonSystem = MoonSystem;

// Inicialização automática se houver elemento da lua
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const moonElement = document.getElementById('moon');
        if (moonElement && !window.agathaMoon) {
            window.agathaMoon = new MoonSystem();
        }
    });
}

console.log('✨ Sistema da lua carregado. Use new MoonSystem() para criar instâncias.');