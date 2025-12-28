/* app.js */
/**
 * @file Arquivo principal da aplicação do site de aniversário da Ágatha Sophia
 * @description Gerencia inicialização, roteamento, preferências e integração de módulos
 * @version 1.0.0
 * 
 * Dependências externas (CDN):
 * - Howler.js (áudio): https://cdnjs.cloudflare.com/ajax/libs/howler/2.3.3/howler.min.js
 * - GSAP (animações): https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js (opcional)
 * 
 * API pública: window.AgathaSite
 * Eventos emitidos: agatha:app:ready, agatha:route:change, agatha:audio:toggle
 * localStorage keys: agatha_prefs, agatha_guestbook
 */

class AgathaApp {
    constructor() {
        this.version = '1.0.0';
        this.isInitialized = false;
        this.modules = new Map();
        this.currentRoute = null;
        this.preferences = this.loadPreferences();
        this.audioContext = null;
        this.howler = null;
        
        // Bind methods
        this.init = this.init.bind(this);
        this.destroy = this.destroy.bind(this);
        this.setParticleDensity = this.setParticleDensity.bind(this);
        this.muteAudio = this.muteAudio.bind(this);
        this.saveGuestbookEntry = this.saveGuestbookEntry.bind(this);
        
        // Utilitários expostos
        this.utils = {
            throttle: this.throttle,
            debounce: this.debounce,
            prefersReducedMotion: this.prefersReducedMotion,
            loadImage: this.loadImage
        };
    }

    /**
     * Inicializa a aplicação
     * @param {HTMLElement} rootElement - Elemento raiz da aplicação
     */
    async init(rootElement = document.body) {
        if (this.isInitialized) return;
        
        console.log('🌹 Inicializando AgathaSite v' + this.version);
        
        // Configurar preferências iniciais
        this.applyPreferences();
        
        // Inicializar áudio (se Howler disponível)
        this.initAudio();
        
        // Configurar roteador baseado em hash
        this.setupRouter();
        
        // Inicializar módulos principais
        await this.initModules();
        
        // Configurar eventos globais
        this.setupGlobalEvents();
        
        // Configurar Service Worker (se suportado)
        this.setupServiceWorker();
        
        this.isInitialized = true;
        
        // Emitir evento de pronto
        document.dispatchEvent(new CustomEvent('agatha:app:ready', {
            detail: { version: this.version }
        }));
        
        console.log('✅ AgathaSite inicializado');
        
        return this;
    }

    /**
     * Carrega preferências do localStorage
     */
    loadPreferences() {
        const defaults = {
            muted: true,
            particleDensity: 1,
            lastScore: 0,
            theme: 'dark',
            lastMoonReveal: null,
            guestbookEntries: []
        };
        
        try {
            const saved = localStorage.getItem('agatha_prefs');
            return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
        } catch (e) {
            console.warn('Não foi possível carregar preferências:', e);
            return defaults;
        }
    }

    /**
     * Salva preferências no localStorage
     */
    savePreferences() {
        try {
            localStorage.setItem('agatha_prefs', JSON.stringify(this.preferences));
        } catch (e) {
            console.warn('Não foi possível salvar preferências:', e);
        }
    }

    /**
     * Aplica preferências carregadas
     */
    applyPreferences() {
        // Aplicar densidade de partículas via CSS
        document.documentElement.style.setProperty(
            '--particle-density',
            this.preferences.particleDensity
        );
        
        // Aplicar estado de áudio
        if (this.preferences.muted) {
            document.documentElement.classList.add('is-muted');
        }
        
        // Aplicar tema
        document.documentElement.setAttribute('data-theme', this.preferences.theme);
    }

    /**
     * Inicializa sistema de áudio
     */
    initAudio() {
        // Verificar se Howler.js está disponível globalmente
        if (typeof Howl !== 'undefined') {
            this.howler = Howl;
            
            // Carregar áudio ambiente (placeholder)
            this.ambientSound = new Howl({
                src: ['assets/audio/ambient-sample.mp3'],
                loop: true,
                volume: 0.3,
                autoplay: false,
                onloaderror: () => {
                    console.warn('Áudio ambiente não pôde ser carregado');
                }
            });
            
            console.log('🎵 Sistema de áudio inicializado (Howler.js)');
        } else {
            console.warn('Howler.js não disponível - recursos de áudio limitados');
            
            // Fallback para Audio API nativa
            if ('AudioContext' in window || 'webkitAudioContext' in window) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }
    }

    /**
     * Configura roteador baseado em hash
     */
    setupRouter() {
        // Mapeamento de rotas
        this.routes = {
            '#/home': 'home',
            '#/about': 'about',
            '#/games/clicker': 'games',
            '#/games/maze': 'games',
            '#/quiz': 'games',
            '#/gallery': 'gallery',
            '#/letter': 'letter',
            '#/guestbook': 'guestbook'
        };

        // Lidar com mudanças de hash
        const handleHashChange = () => {
            const hash = window.location.hash || '#/home';
            const route = this.routes[hash] || 'home';
            
            if (this.currentRoute !== route) {
                this.currentRoute = route;
                
                // Ativar seção correspondente
                this.activateSection(route);
                
                // Emitir evento de mudança de rota
                document.dispatchEvent(new CustomEvent('agatha:route:change', {
                    detail: { route, hash }
                }));
            }
        };

        // Escutar mudanças de hash
        window.addEventListener('hashchange', handleHashChange);
        
        // Rota inicial
        handleHashChange();
        
        // Adicionar listeners para links internos
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (link) {
                e.preventDefault();
                const href = link.getAttribute('href');
                if (href !== window.location.hash) {
                    window.location.hash = href;
                }
            }
        });
    }

    /**
     * Ativa a seção correspondente à rota
     * @param {string} sectionId - ID da seção
     */
    activateSection(sectionId) {
        // Desativar todas as seções
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Ativar seção atual
        const currentSection = document.getElementById(sectionId);
        if (currentSection) {
            currentSection.classList.add('active');
            
            // Rolar para a seção
            currentSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Atualizar menu de navegação
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Inicializa módulos da aplicação
     */
    async initModules() {
        try {
            // Inicializar partículas
            if (typeof ParticlesSystem !== 'undefined') {
                const particles = new ParticlesSystem();
                await particles.init('.particles-canvas', {
                    density: this.preferences.particleDensity,
                    followMouse: true,
                    colors: ['#D4AF37', '#4b0f1e', '#ffffff']
                });
                this.modules.set('particles', particles);
            }

            // Inicializar lua
            if (typeof MoonSystem !== 'undefined') {
                const moon = new MoonSystem();
                await moon.init('#moon', {
                    parallaxIntensity: 0.5,
                    revealMessages: [
                        'Feliz 16 anos, Ágatha!',
                        'Que sua luz sempre brilhe',
                        'Você é especial'
                    ]
                });
                this.modules.set('moon', moon);
            }

            // Carregar jogos dinamicamente quando necessário
            this.setupGamesLazyLoad();
            
        } catch (error) {
            console.error('Erro ao inicializar módulos:', error);
        }
    }

    /**
     * Configura carregamento preguiçoso de jogos
     */
    setupGamesLazyLoad() {
        const gameContainers = document.querySelectorAll('.game-card');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const container = entry.target;
                    const gameType = container.dataset.gameType;
                    
                    // Carregar jogo correspondente
                    this.loadGame(gameType, container);
                    observer.unobserve(container);
                }
            });
        }, { threshold: 0.1 });
        
        gameContainers.forEach(container => observer.observe(container));
    }

    /**
     * Carrega um jogo específico
     * @param {string} gameType - Tipo do jogo
     * @param {HTMLElement} container - Container do jogo
     */
    async loadGame(gameType, container) {
        try {
            let gameModule;
            
            switch (gameType) {
                case 'clicker':
                    if (typeof ClickerGame !== 'undefined') {
                        gameModule = new ClickerGame();
                        await gameModule.init(container);
                    }
                    break;
                case 'maze':
                    if (typeof MazeGame !== 'undefined') {
                        gameModule = new MazeGame();
                        await gameModule.init(container);
                    }
                    break;
                case 'quiz':
                    if (typeof QuizGame !== 'undefined') {
                        gameModule = new QuizGame();
                        await gameModule.init(container);
                    }
                    break;
            }
            
            if (gameModule) {
                this.modules.set(`game-${gameType}`, gameModule);
            }
        } catch (error) {
            console.error(`Erro ao carregar jogo ${gameType}:`, error);
        }
    }

    /**
     * Configura eventos globais
     */
    setupGlobalEvents() {
        // Controle de visibilidade
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAll();
            } else {
                this.resumeAll();
            }
        });

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            // M = mute/unmute
            if (e.key === 'm' || e.key === 'M') {
                this.muteAudio(!this.preferences.muted);
            }
            
            // P = pausar partículas
            if (e.key === 'p' || e.key === 'P') {
                const particles = this.modules.get('particles');
                if (particles) {
                    if (particles.isPaused) {
                        particles.resume();
                    } else {
                        particles.pause();
                    }
                }
            }
            
            // Esc = fechar modais
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.is-open').forEach(modal => {
                    modal.classList.remove('is-open');
                });
            }
        });

        // Upload de imagens
        const uploadZone = document.getElementById('upload-zone');
        if (uploadZone) {
            const fileInput = uploadZone.querySelector('#file-input');
            
            uploadZone.addEventListener('click', () => fileInput.click());
            
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('dragover');
            });
            
            uploadZone.addEventListener('dragleave', () => {
                uploadZone.classList.remove('dragover');
            });
            
            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                this.handleImageUpload(files);
            });
            
            fileInput.addEventListener('change', (e) => {
                this.handleImageUpload(e.target.files);
            });
        }

        // Menu mobile
        const menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                const navMenu = document.querySelector('.nav-menu');
                navMenu.classList.toggle('is-open');
                menuToggle.setAttribute('aria-expanded', 
                    navMenu.classList.contains('is-open')
                );
            });
        }

        // Botão de entrada
        const enterBtn = document.getElementById('enter-btn');
        if (enterBtn) {
            enterBtn.addEventListener('click', () => {
                // Iniciar áudio após interação do usuário
                this.playAmbient();
                
                // Esconder tela de entrada
                document.querySelector('.entry-section').classList.add('fade-out');
                
                // Mostrar conteúdo principal
                setTimeout(() => {
                    document.querySelector('.main-content').classList.remove('hidden');
                    document.querySelector('.main-content').classList.add('fade-in');
                    
                    // Iniciar partículas na home
                    const particles = this.modules.get('particles');
                    if (particles) {
                        particles.resume();
                    }
                }, 800);
            });
        }

        // Controle de áudio
        const audioToggle = document.getElementById('audio-toggle');
        if (audioToggle) {
            audioToggle.addEventListener('click', () => {
                this.muteAudio(!this.preferences.muted);
            });
        }
    }

    /**
     * Configura Service Worker (se disponível)
     */
    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registrado:', registration);
            } catch (error) {
                console.warn('Falha ao registrar Service Worker:', error);
            }
        }
    }

    /**
     * Lida com upload de imagens
     * @param {FileList} files - Lista de arquivos
     */
    handleImageUpload(files) {
        const galleryGrid = document.getElementById('gallery-grid');
        
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgUrl = e.target.result;
                
                // Criar elemento de galeria
                const galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item new-image';
                galleryItem.innerHTML = `
                    <img src="${imgUrl}" alt="Imagem enviada pelo usuário">
                    <p>${file.name}</p>
                `;
                
                galleryGrid.appendChild(galleryItem);
                
                // Animar entrada
                setTimeout(() => {
                    galleryItem.classList.remove('new-image');
                }, 500);
            };
            
            reader.readAsDataURL(file);
        });
    }

    /**
     * Reproduz áudio ambiente (após interação do usuário)
     */
    playAmbient() {
        if (this.preferences.muted) return;
        
        if (this.ambientSound && this.howler) {
            this.ambientSound.play();
        } else if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        document.documentElement.classList.remove('is-muted');
    }

    /**
     * Alterna estado de mudo do áudio
     * @param {boolean} muted - Se true, muta; se false, desmuta
     */
    muteAudio(muted = true) {
        this.preferences.muted = muted;
        
        if (this.ambientSound) {
            if (muted) {
                this.ambientSound.pause();
            } else {
                this.ambientSound.play();
            }
        }
        
        // Atualizar UI
        if (muted) {
            document.documentElement.classList.add('is-muted');
        } else {
            document.documentElement.classList.remove('is-muted');
        }
        
        // Salvar preferências
        this.savePreferences();
        
        // Emitir evento
        document.dispatchEvent(new CustomEvent('agatha:audio:toggle', {
            detail: { muted }
        }));
    }

    /**
     * Define densidade de partículas
     * @param {number} density - Densidade (0.1 a 3)
     */
    setParticleDensity(density) {
        const clamped = Math.max(0.1, Math.min(3, density));
        this.preferences.particleDensity = clamped;
        
        // Atualizar CSS
        document.documentElement.style.setProperty('--particle-density', clamped);
        
        // Atualizar módulo de partículas se existir
        const particles = this.modules.get('particles');
        if (particles && particles.setDensity) {
            particles.setDensity(clamped);
        }
        
        this.savePreferences();
    }

    /**
     * Salva entrada no guestbook
     * @param {Object} entry - Entrada do guestbook
     */
    saveGuestbookEntry(entry) {
        try {
            // Validar entrada
            if (!entry.name || !entry.message) {
                throw new Error('Nome e mensagem são obrigatórios');
            }
            
            // Carregar entradas existentes
            let entries = [];
            try {
                const saved = localStorage.getItem('agatha_guestbook');
                entries = saved ? JSON.parse(saved) : [];
            } catch (e) {
                console.warn('Não foi possível carregar guestbook:', e);
            }
            
            // Adicionar nova entrada
            const newEntry = {
                ...entry,
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                likes: 0
            };
            
            entries.unshift(newEntry);
            
            // Salvar no localStorage
            localStorage.setItem('agatha_guestbook', JSON.stringify(entries));
            
            // Atualizar preferências
            this.preferences.guestbookEntries = entries;
            this.savePreferences();
            
            // Emitir evento
            document.dispatchEvent(new CustomEvent('agatha:guestbook:submit', {
                detail: newEntry
            }));
            
            return newEntry;
            
        } catch (error) {
            console.error('Erro ao salvar guestbook:', error);
            throw error;
        }
    }

    /**
     * Pausa todos os módulos ativos
     */
    pauseAll() {
        this.modules.forEach(module => {
            if (module.pause) module.pause();
        });
        
        // Pausar áudio
        if (this.ambientSound && this.ambientSound.playing()) {
            this.ambientSound.pause();
        }
    }

    /**
     * Resume todos os módulos pausados
     */
    resumeAll() {
        this.modules.forEach(module => {
            if (module.resume) module.resume();
        });
        
        // Retomar áudio (se não estiver mudo)
        if (!this.preferences.muted && this.ambientSound) {
            this.ambientSound.play();
        }
    }

    /**
     * Destroi a aplicação e limpa recursos
     */
    destroy() {
        // Destruir módulos
        this.modules.forEach(module => {
            if (module.destroy) module.destroy();
        });
        this.modules.clear();
        
        // Parar áudio
        if (this.ambientSound) {
            this.ambientSound.stop();
        }
        
        // Remover listeners
        window.removeEventListener('hashchange', this.handleHashChange);
        
        this.isInitialized = false;
        console.log('👋 AgathaSite destruído');
    }

    /**
     * Utilitário: throttle
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Utilitário: debounce
     */
    debounce(func, delay) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    /**
     * Verifica se o usuário prefere movimento reduzido
     */
    prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /**
     * Carrega uma imagem e retorna uma Promise
     */
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    /**
     * Retorna informações de conexão
     */
    getConnectionInfo() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        return {
            effectiveType: connection ? connection.effectiveType : 'unknown',
            saveData: connection ? connection.saveData : false,
            downlink: connection ? connection.downlink : 0
        };
    }

    /**
     * Ajusta configurações baseadas na conexão
     */
    adjustForConnection() {
        const connection = this.getConnectionInfo();
        
        // Reduzir partículas em conexões lentas
        if (connection.effectiveType.includes('2g') || connection.saveData) {
            this.setParticleDensity(0.3);
            
            // Desativar áudio ambiente
            if (this.ambientSound) {
                this.ambientSound.stop();
                this.preferences.muted = true;
                this.savePreferences();
            }
        }
    }
}

// Exportar instância global
window.AgathaSite = new AgathaApp();

// Inicialização automática quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.AgathaSite.init();
    });
} else {
    window.AgathaSite.init();
}

// Expor utilitários
window.AgathaSiteUtils = {
    throttle: AgathaApp.prototype.throttle,
    debounce: AgathaApp.prototype.debounce,
    loadImage: AgathaApp.prototype.loadImage
};

console.log('✨ AgathaSite carregado. Use window.AgathaSite para a API pública.');