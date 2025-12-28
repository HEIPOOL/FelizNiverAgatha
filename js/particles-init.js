// particles-init.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Inicializando sistema de partículas...');
    
    // Verificar se particles.js está carregado
    if (typeof particlesJS === 'undefined') {
        console.warn('⚠️ particles.js não encontrado. Criando partículas CSS de fallback...');
        createFallbackParticles();
        return;
    }
    
    // Configuração das partículas
    const particlesConfig = {
        particles: {
            number: {
                value: 80,
                density: {
                    enable: true,
                    value_area: 800
                }
            },
            color: {
                value: ["#FFD700", "#BB86FC", "#8B1E3A"]
            },
            shape: {
                type: "circle",
                stroke: {
                    width: 0,
                    color: "#000000"
                },
                polygon: {
                    nb_sides: 5
                }
            },
            opacity: {
                value: 0.5,
                random: true,
                anim: {
                    enable: true,
                    speed: 1,
                    opacity_min: 0.1,
                    sync: false
                }
            },
            size: {
                value: 3,
                random: true,
                anim: {
                    enable: true,
                    speed: 2,
                    size_min: 0.1,
                    sync: false
                }
            },
            line_linked: {
                enable: true,
                distance: 150,
                color: "#FFD700",
                opacity: 0.2,
                width: 1
            },
            move: {
                enable: true,
                speed: 2,
                direction: "none",
                random: true,
                straight: false,
                out_mode: "out",
                bounce: false,
                attract: {
                    enable: false,
                    rotateX: 600,
                    rotateY: 1200
                }
            }
        },
        interactivity: {
            detect_on: "canvas",
            events: {
                onhover: {
                    enable: true,
                    mode: "repulse"
                },
                onclick: {
                    enable: true,
                    mode: "push"
                },
                resize: true
            },
            modes: {
                grab: {
                    distance: 400,
                    line_linked: {
                        opacity: 1
                    }
                },
                bubble: {
                    distance: 400,
                    size: 40,
                    duration: 2,
                    opacity: 8,
                    speed: 3
                },
                repulse: {
                    distance: 100,
                    duration: 0.4
                },
                push: {
                    particles_nb: 4
                },
                remove: {
                    particles_nb: 2
                }
            }
        },
        retina_detect: true
    };
    
    // Inicializar partículas principais
    const particlesContainer = document.getElementById('particles-js');
    if (particlesContainer) {
        try {
            particlesJS('particles-js', particlesConfig);
            console.log('✅ Partículas principais inicializadas');
        } catch (error) {
            console.error('❌ Erro ao inicializar partículas:', error);
            createFallbackParticles();
        }
    } else {
        console.error('❌ Container particles-js não encontrado');
        createFallbackParticles();
    }
    
    // Função para criar partículas CSS de fallback
    function createFallbackParticles() {
        console.log('🎨 Criando partículas CSS de fallback...');
        
        const container = document.getElementById('particles-js');
        if (!container) return;
        
        // Limpar container
        container.innerHTML = '';
        container.className = 'particles-fallback';
        
        // Criar partículas CSS
        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            // Posição aleatória
            const left = Math.random() * 100;
            const top = Math.random() * 100;
            
            // Tamanho aleatório
            const size = 2 + Math.random() * 4;
            
            // Cor aleatória
            const colors = ['#FFD700', '#BB86FC', '#8B1E3A'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            // Aplicar estilos
            particle.style.cssText = `
                left: ${left}%;
                top: ${top}%;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                box-shadow: 0 0 ${size * 2}px ${color};
                animation: particle-float ${5 + Math.random() * 10}s linear infinite;
                animation-delay: ${Math.random() * 5}s;
            `;
            
            container.appendChild(particle);
        }
        
        console.log('✅ Partículas CSS criadas com sucesso');
    }
    
    // Inicializar partículas específicas para cada seção
    function initSectionParticles() {
        // Entrada
        const entryParticles = document.getElementById('entry-particles');
        if (entryParticles) {
            const entryConfig = JSON.parse(JSON.stringify(particlesConfig));
            entryConfig.particles.number.value = 100;
            entryConfig.particles.color.value = ["#FFD700", "#FFFFFF", "#BB86FC"];
            entryConfig.particles.move.speed = 1;
            
            try {
                particlesJS('entry-particles', entryConfig);
                console.log('✅ Partículas da entrada inicializadas');
            } catch (error) {
                console.warn('⚠️ Erro nas partículas da entrada:', error);
            }
        }
        
        // Home
        const homeParticles = document.getElementById('home-particles');
        if (homeParticles) {
            const homeConfig = JSON.parse(JSON.stringify(particlesConfig));
            homeConfig.particles.number.value = 60;
            homeConfig.particles.color.value = ["#FFD700", "#8B1E3A"];
            homeConfig.particles.move.speed = 1.5;
            homeConfig.particles.line_linked.enable = false;
            
            try {
                particlesJS('home-particles', homeConfig);
                console.log('✅ Partículas da home inicializadas');
            } catch (error) {
                console.warn('⚠️ Erro nas partículas da home:', error);
            }
        }
    }
    
    // Inicializar após um pequeno delay para garantir que o DOM está pronto
    setTimeout(initSectionParticles, 1000);
});