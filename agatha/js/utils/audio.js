/* audio.js */
/**
 * @file Gerenciador de áudio para o site da Ágatha Sophia
 * @description Controla trilha sonora ambiente, efeitos sonoros com fallbacks sintéticos
 * @version 1.0.0
 * 
 * API pública: AudioManager class
 * Eventos emitidos: agatha:audio:ready, agatha:audio:play, agatha:audio:pause, agatha:audio:volume, agatha:audio:mute
 * localStorage keys: agatha_prefs (muted, volume)
 */

class AudioManager {
    constructor() {
        this.version = '1.0.0';
        this.isInitialized = false;
        this.isMuted = true; // Começa mutado por padrão (requisito de autoplay)
        this.masterVolume = 0.7;
        this.sounds = new Map();
        this.audioContext = null;
        this.userInteracted = false;
        this.isSuspended = true;
        this.effectsEnabled = false;
        
        // Configuração de áudios com fallbacks
        this.audioConfig = {
            ambient: {
                src: ['assets/audio/ambient-sample.mp3'],
                volume: 0.3,
                loop: true,
                preload: true,
                autoplay: false
            },
            effects: {
                click: {
                    volume: 0.4,
                    duration: 0.1,
                    frequency: 800,
                    type: 'sine'
                },
                glitter: {
                    volume: 0.3,
                    duration: 0.5,
                    frequency: 1200,
                    type: 'sine',
                    vibrato: 20
                },
                win: {
                    volume: 0.5,
                    duration: 1.5,
                    frequency: [523.25, 659.25, 783.99], // C5, E5, G5
                    type: 'sine'
                },
                moon: {
                    volume: 0.4,
                    duration: 2,
                    frequency: 329.63, // E4
                    type: 'sine',
                    reverb: true
                },
                error: {
                    volume: 0.4,
                    duration: 0.8,
                    frequency: 200,
                    type: 'sawtooth',
                    filterFrequency: 400
                }
            }
        };
        
        // Estatísticas de uso
        this.stats = {
            soundsPlayed: 0,
            totalPlayTime: 0,
            effectsPlayed: 0,
            ambientPlayTime: 0
        };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.destroy = this.destroy.bind(this);
        this.playAmbient = this.playAmbient.bind(this);
        this.pauseAmbient = this.pauseAmbient.bind(this);
        this.stopAmbient = this.stopAmbient.bind(this);
        this.playEffect = this.playEffect.bind(this);
        this.setMute = this.setMute.bind(this);
        this.setVolume = this.setVolume.bind(this);
        this.fadeIn = this.fadeIn.bind(this);
        this.fadeOut = this.fadeOut.bind(this);
        this.userInteraction = this.userInteraction.bind(this);
        this.checkAudioSupport = this.checkAudioSupport.bind(this);
        this.createFallbackSounds = this.createFallbackSounds.bind(this);
    }

    /**
     * Inicializa o gerenciador de áudio
     * @param {Object} options - Configurações de áudio
     */
    async init(options = {}) {
        if (this.isInitialized) return;
        
        console.log('🎵 Inicializando gerenciador de áudio');
        
        // Mesclar configurações
        if (options.ambient) {
            this.audioConfig.ambient = { ...this.audioConfig.ambient, ...options.ambient };
        }
        if (options.effects) {
            this.audioConfig.effects = { ...this.audioConfig.effects, ...options.effects };
        }
        
        // Carregar preferências
        this.loadPreferences();
        
        // Verificar suporte a áudio
        await this.checkAudioSupport();
        
        // Configurar eventos de interação do usuário
        this.setupUserInteraction();
        
        // Criar sons sintéticos (fallback)
        this.createFallbackSounds();
        
        // Configurar suspensão automática
        this.setupAutoSuspend();
        
        this.isInitialized = true;
        
        // Emitir evento de pronto
        document.dispatchEvent(new CustomEvent('agatha:audio:ready', {
            detail: { 
                version: this.version,
                hasWebAudio: !!this.audioContext,
                isMuted: this.isMuted
            }
        }));
        
        console.log('✅ Gerenciador de áudio inicializado (modo sintético)');
        
        return this;
    }

    /**
     * Verifica suporte a APIs de áudio
     */
    async checkAudioSupport() {
        // Verificar Web Audio API
        if ('AudioContext' in window || 'webkitAudioContext' in window) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('✅ Web Audio API disponível');
            } catch (error) {
                console.warn('Web Audio API não disponível:', error);
            }
        }
        
        // Verificar suporte a formatos de áudio
        this.audioFormats = {
            mp3: this.canPlayType('audio/mpeg'),
            ogg: this.canPlayType('audio/ogg'),
            wav: this.canPlayType('audio/wav'),
            m4a: this.canPlayType('audio/mp4')
        };
        
        console.log('Formatos suportados:', this.audioFormats);
    }

    /**
     * Verifica se o navegador pode reproduzir um tipo MIME
     */
    canPlayType(type) {
        const audio = document.createElement('audio');
        return !!(audio.canPlayType && audio.canPlayType(type));
    }

    /**
     * Configura eventos de interação do usuário
     */
    setupUserInteraction() {
        // Eventos que contam como interação do usuário
        const interactionEvents = [
            'click', 'touchstart', 'touchend', 'keydown', 
            'mousedown', 'pointerdown'
        ];
        
        const handleInteraction = () => {
            if (!this.userInteracted) {
                this.userInteracted = true;
                this.userInteraction();
                
                // Remover listeners após primeira interação
                interactionEvents.forEach(event => {
                    document.removeEventListener(event, handleInteraction);
                });
                
                console.log('👤 Interação do usuário detectada - áudio liberado');
            }
        };
        
        // Adicionar listeners para todos os eventos de interação
        interactionEvents.forEach(event => {
            document.addEventListener(event, handleInteraction, { 
                once: true,
                passive: true 
            });
        });
        
        // Também permitir interação via botões específicos
        const audioButtons = document.querySelectorAll('.audio-button, .btn-neon, #enter-btn');
        audioButtons.forEach(button => {
            button.addEventListener('click', handleInteraction, { once: true });
        });
    }

    /**
     * Manipula interação do usuário (requisito de autoplay)
     */
    userInteraction() {
        // Resumir AudioContext se estiver suspenso
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                this.isSuspended = false;
                console.log('🔊 AudioContext retomado após interação do usuário');
                
                // Habilitar efeitos sonoros
                this.effectsEnabled = true;
                
                // Se não estiver mudo, iniciar áudio ambiente
                if (!this.isMuted) {
                    setTimeout(() => {
                        this.playAmbient();
                    }, 500);
                }
            }).catch(error => {
                console.warn('Erro ao retomar AudioContext:', error);
            });
        } else {
            // Se não há AudioContext, ainda habilitar efeitos
            this.effectsEnabled = true;
        }
    }

    /**
     * Cria efeitos sonoros de fallback (sintetizados)
     */
    createFallbackSounds() {
        if (!this.audioContext) {
            console.warn('AudioContext não disponível - efeitos sonoros desativados');
            return;
        }
        
        console.log('🎹 Criando efeitos sonoros sintéticos (fallback)');
        
        // Efeito de clique
        this.createFallbackEffect('click', this.audioConfig.effects.click);
        
        // Efeito de glitter
        this.createFallbackEffect('glitter', this.audioConfig.effects.glitter);
        
        // Efeito de vitória
        this.createFallbackEffect('win', this.audioConfig.effects.win);
        
        // Efeito de lua
        this.createFallbackEffect('moon', this.audioConfig.effects.moon);
        
        // Efeito de erro
        this.createFallbackEffect('error', this.audioConfig.effects.error);
        
        // Áudio ambiente sintético
        this.createFallbackAmbient();
    }

    /**
     * Cria um efeito sonoro sintético individual
     */
    createFallbackEffect(name, config) {
        try {
            this.sounds.set(name, {
                play: () => {
                    if (this.isMuted || !this.effectsEnabled || !this.audioContext) return;
                    
                    const now = this.audioContext.currentTime;
                    const oscillator = this.audioContext.createOscillator();
                    const gainNode = this.audioContext.createGain();
                    
                    // Configurar oscilador
                    oscillator.type = config.type || 'sine';
                    
                    if (Array.isArray(config.frequency)) {
                        // Sequência de frequências (para vitória)
                        let currentTime = now;
                        config.frequency.forEach((freq, index) => {
                            oscillator.frequency.setValueAtTime(freq, currentTime);
                            currentTime += config.duration / config.frequency.length;
                        });
                    } else {
                        oscillator.frequency.value = config.frequency || 440;
                        
                        // Vibrato
                        if (config.vibrato) {
                            const vibrato = this.audioContext.createOscillator();
                            const vibratoGain = this.audioContext.createGain();
                            vibrato.frequency.value = 5;
                            vibratoGain.gain.value = config.vibrato;
                            vibrato.connect(vibratoGain);
                            vibratoGain.connect(oscillator.frequency);
                            vibrato.start(now);
                            vibrato.stop(now + config.duration);
                        }
                    }
                    
                    // Configurar envelope ADSR
                    const attack = config.attack || 0.01;
                    const decay = config.decay || config.duration * 0.5;
                    
                    gainNode.gain.setValueAtTime(0, now);
                    gainNode.gain.linearRampToValueAtTime(config.volume * this.masterVolume, now + attack);
                    gainNode.gain.exponentialRampToValueAtTime(0.001, now + decay);
                    
                    // Filtro (se especificado)
                    if (config.filterFrequency) {
                        const filter = this.audioContext.createBiquadFilter();
                        filter.type = 'lowpass';
                        filter.frequency.value = config.filterFrequency;
                        oscillator.connect(filter);
                        filter.connect(gainNode);
                    } else {
                        oscillator.connect(gainNode);
                    }
                    
                    // Reverb (se especificado)
                    if (config.reverb) {
                        const convolver = this.audioContext.createConvolver();
                        const reverbTime = 2;
                        const sampleRate = this.audioContext.sampleRate;
                        const length = sampleRate * reverbTime;
                        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
                        
                        for (let channel = 0; channel < 2; channel++) {
                            const channelData = impulse.getChannelData(channel);
                            for (let i = 0; i < length; i++) {
                                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
                            }
                        }
                        
                        convolver.buffer = impulse;
                        gainNode.connect(convolver);
                        convolver.connect(this.audioContext.destination);
                    } else {
                        gainNode.connect(this.audioContext.destination);
                    }
                    
                    // Iniciar e parar
                    oscillator.start(now);
                    oscillator.stop(now + config.duration);
                    
                    // Estatísticas
                    this.stats.effectsPlayed++;
                    this.stats.soundsPlayed++;
                    
                    // Emitir evento
                    document.dispatchEvent(new CustomEvent('agatha:audio:play', {
                        detail: { sound: name, type: 'effect' }
                    }));
                }
            });
            
        } catch (error) {
            console.warn(`Não foi possível criar efeito sintético ${name}:`, error);
        }
    }

    /**
     * Cria áudio ambiente de fallback (sintetizado)
     */
    createFallbackAmbient() {
        if (!this.audioContext) return;
        
        try {
            // Criar osciladores para áudio ambiente sintético
            const oscillator1 = this.audioContext.createOscillator();
            const oscillator2 = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            // Configurar osciladores
            oscillator1.type = 'sine';
            oscillator1.frequency.value = 220; // Lá 3
            oscillator2.type = 'sine';
            oscillator2.frequency.value = 277.18; // Dó# 4
            
            // Configurar filtro
            filter.type = 'lowpass';
            filter.frequency.value = 800;
            filter.Q.value = 1;
            
            // Configurar ganho (volume)
            gainNode.gain.value = this.isMuted ? 0 : 0.1 * this.masterVolume;
            
            // Conectar nós
            oscillator1.connect(filter);
            oscillator2.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Armazenar referências
            this.fallbackAmbient = {
                oscillator1,
                oscillator2,
                gainNode,
                filter,
                isPlaying: false,
                start: () => {
                    if (!this.fallbackAmbient.isPlaying) {
                        oscillator1.start();
                        oscillator2.start();
                        this.fallbackAmbient.isPlaying = true;
                        console.log('🎶 Áudio ambiente sintético iniciado');
                    }
                },
                stop: () => {
                    if (this.fallbackAmbient.isPlaying) {
                        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 1);
                        setTimeout(() => {
                            oscillator1.stop();
                            oscillator2.stop();
                            this.fallbackAmbient.isPlaying = false;
                            gainNode.gain.value = 0.1 * this.masterVolume;
                        }, 1000);
                        console.log('⏹️ Áudio ambiente sintético parado');
                    }
                },
                setVolume: (volume) => {
                    gainNode.gain.value = volume * this.masterVolume;
                },
                pause: () => {
                    if (this.fallbackAmbient.isPlaying) {
                        gainNode.gain.value = 0;
                        console.log('⏸️ Áudio ambiente sintético pausado');
                    }
                },
                resume: () => {
                    if (this.fallbackAmbient.isPlaying) {
                        gainNode.gain.value = 0.1 * this.masterVolume;
                        console.log('▶️ Áudio ambiente sintético retomado');
                    }
                }
            };
            
            console.log('🎹 Áudio ambiente sintético criado (fallback)');
            
        } catch (error) {
            console.warn('Não foi possível criar áudio ambiente sintético:', error);
        }
    }

    /**
     * Reproduz áudio ambiente
     */
    playAmbient() {
        if (this.isMuted || !this.userInteracted) return;
        
        // Respeitar prefers-reduced-motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            console.log('⚠️ Áudio ambiente desativado devido a prefers-reduced-motion');
            return;
        }
        
        try {
            if (this.fallbackAmbient) {
                if (!this.fallbackAmbient.isPlaying) {
                    this.fallbackAmbient.start();
                } else {
                    this.fallbackAmbient.resume();
                }
            }
            
        } catch (error) {
            console.warn('Erro ao iniciar áudio ambiente:', error);
        }
    }

    /**
     * Pausa áudio ambiente
     */
    pauseAmbient() {
        try {
            if (this.fallbackAmbient && this.fallbackAmbient.isPlaying) {
                this.fallbackAmbient.pause();
            }
            
        } catch (error) {
            console.warn('Erro ao pausar áudio ambiente:', error);
        }
    }

    /**
     * Para áudio ambiente completamente
     */
    stopAmbient() {
        try {
            if (this.fallbackAmbient) {
                this.fallbackAmbient.stop();
            }
            
        } catch (error) {
            console.warn('Erro ao parar áudio ambiente:', error);
        }
    }

    /**
     * Reproduz um efeito sonoro
     * @param {string} name - Nome do efeito
     * @param {Object} options - Opções (volume, rate, etc.)
     */
    playEffect(name, options = {}) {
        // Verificar se o usuário já interagiu
        if (!this.userInteracted) {
            console.warn('⚠️ Efeito sonoro ignorado - aguardando interação do usuário');
            return;
        }
        
        if (this.isMuted || !this.effectsEnabled) return;
        
        // Respeitar prefers-reduced-motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }
        
        const sound = this.sounds.get(name);
        if (!sound) {
            console.warn(`Efeito sonoro "${name}" não encontrado`);
            return;
        }
        
        try {
            // Reproduzir efeito
            if (typeof sound.play === 'function') {
                sound.play();
            }
            
        } catch (error) {
            console.warn(`Erro ao reproduzir efeito "${name}":`, error);
        }
    }

    /**
     * Alterna estado de mudo
     * @param {boolean} muted - Se true, muta; se false, desmuta
     */
    setMute(muted = true) {
        this.isMuted = muted;
        
        // Atualizar fallback
        if (this.fallbackAmbient) {
            if (muted) {
                this.fallbackAmbient.setVolume(0);
                if (this.fallbackAmbient.isPlaying) {
                    this.fallbackAmbient.pause();
                }
            } else {
                this.fallbackAmbient.setVolume(0.1 * this.masterVolume);
                if (this.fallbackAmbient.isPlaying) {
                    this.fallbackAmbient.resume();
                }
            }
        }
        
        // Atualizar UI
        document.documentElement.classList.toggle('is-muted', muted);
        
        // Salvar preferências
        this.savePreferences();
        
        // Emitir evento
        document.dispatchEvent(new CustomEvent('agatha:audio:mute', {
            detail: { muted }
        }));
        
        console.log(muted ? '🔇 Áudio mutado' : '🔊 Áudio desmutado');
        
        // Se desmutou e o usuário já interagiu, iniciar áudio ambiente
        if (!muted && this.userInteracted) {
            setTimeout(() => {
                this.playAmbient();
            }, 500);
        }
    }

    /**
     * Define volume geral
     * @param {number} volume - Volume (0 a 1)
     */
    setVolume(volume) {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        this.masterVolume = clampedVolume;
        
        // Atualizar fallback
        if (this.fallbackAmbient) {
            const ambientVolume = this.isMuted ? 0 : 0.1 * clampedVolume;
            this.fallbackAmbient.setVolume(ambientVolume);
        }
        
        // Salvar preferências
        this.savePreferences();
        
        // Emitir evento
        document.dispatchEvent(new CustomEvent('agatha:audio:volume', {
            detail: { volume: clampedVolume }
        }));
        
        console.log(`🔊 Volume definido para ${Math.round(clampedVolume * 100)}%`);
    }

    /**
     * Fade in do áudio ambiente
     * @param {number} duration - Duração do fade em ms
     */
    fadeIn(duration = 2000) {
        if (this.isMuted || !this.fallbackAmbient) return;
        
        // Implementação simples de fade in
        const startTime = Date.now();
        const startVolume = 0;
        const endVolume = 0.1 * this.masterVolume;
        
        const fade = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentVolume = startVolume + (endVolume - startVolume) * progress;
            this.fallbackAmbient.setVolume(currentVolume);
            
            if (progress < 1) {
                requestAnimationFrame(fade);
            }
        };
        
        if (!this.fallbackAmbient.isPlaying) {
            this.fallbackAmbient.start();
        }
        
        fade();
    }

    /**
     * Fade out do áudio ambiente
     * @param {number} duration - Duração do fade em ms
     */
    fadeOut(duration = 2000) {
        if (!this.fallbackAmbient) return;
        
        const startTime = Date.now();
        const startVolume = this.fallbackAmbient.gainNode.gain.value;
        const endVolume = 0;
        
        const fade = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentVolume = startVolume + (endVolume - startVolume) * progress;
            this.fallbackAmbient.setVolume(currentVolume);
            
            if (progress < 1) {
                requestAnimationFrame(fade);
            } else {
                this.fallbackAmbient.stop();
            }
        };
        
        fade();
    }

    /**
     * Configura suspensão automática quando a página perde foco
     */
    setupAutoSuspend() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Pausar áudio quando a página perde foco
                this.pauseAmbient();
            } else {
                // Retomar áudio quando a página ganha foco (se não estiver mudo)
                if (!this.isMuted && this.userInteracted) {
                    setTimeout(() => {
                        this.playAmbient();
                    }, 500);
                }
            }
        });
    }

    /**
     * Carrega preferências do localStorage
     */
    loadPreferences() {
        try {
            const prefs = localStorage.getItem('agatha_prefs');
            if (prefs) {
                const parsed = JSON.parse(prefs);
                this.isMuted = parsed.muted !== undefined ? parsed.muted : true;
                this.masterVolume = parsed.volume !== undefined ? parsed.volume : 0.7;
                
                console.log('⚙️ Preferências de áudio carregadas:', {
                    muted: this.isMuted,
                    volume: this.masterVolume
                });
            }
        } catch (e) {
            console.warn('Não foi possível carregar preferências de áudio:', e);
        }
    }

    /**
     * Salva preferências no localStorage
     */
    savePreferences() {
        try {
            const prefs = JSON.parse(localStorage.getItem('agatha_prefs') || '{}');
            prefs.muted = this.isMuted;
            prefs.volume = this.masterVolume;
            localStorage.setItem('agatha_prefs', JSON.stringify(prefs));
        } catch (e) {
            console.warn('Não foi possível salvar preferências de áudio:', e);
        }
    }

    /**
     * Obtém informações sobre o estado do áudio
     */
    getAudioInfo() {
        return {
            muted: this.isMuted,
            volume: this.masterVolume,
            ambientPlaying: this.fallbackAmbient ? this.fallbackAmbient.isPlaying : false,
            effectsEnabled: this.effectsEnabled,
            userInteracted: this.userInteracted,
            hasWebAudio: !!this.audioContext,
            stats: this.stats
        };
    }

    /**
     * Destroi o gerenciador e limpa recursos
     */
    destroy() {
        // Parar todos os sons
        this.stopAmbient();
        
        // Parar AudioContext
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        this.isInitialized = false;
        
        console.log('👋 Gerenciador de áudio destruído');
    }
}

// Exportar instância global
window.AudioManager = AudioManager;

// Criar instância global
window.agathaAudio = new AudioManager();

// Inicialização automática quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.agathaAudio.init().catch(console.error);
    });
} else {
    window.agathaAudio.init().catch(console.error);
}

// Expor métodos públicos
window.AgathaAudio = {
    init: (options) => window.agathaAudio.init(options),
    playAmbient: () => window.agathaAudio.playAmbient(),
    pauseAmbient: () => window.agathaAudio.pauseAmbient(),
    playEffect: (name, options) => window.agathaAudio.playEffect(name, options),
    setMute: (muted) => window.agathaAudio.setMute(muted),
    setVolume: (volume) => window.agathaAudio.setVolume(volume),
    getInfo: () => window.agathaAudio.getAudioInfo(),
    destroy: () => window.agathaAudio.destroy()
};

console.log('✨ Gerenciador de áudio carregado. Use window.AgathaAudio para a API pública.');