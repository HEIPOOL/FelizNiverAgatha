// games-init.js
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Inicializando jogos...');
    
    // Inicializar jogos apenas quando a seção estiver visível
    function initGames() {
        console.log('🚀 Inicializando todos os jogos...');
        
        // Jogo 1: Caça aos Brilhos
        initClickerGame();
        
        // Jogo 2: Labirinto Lunar
        initMazeGame();
        
        // Jogo 3: Quiz
        initQuizGame();
    }
    
    // Observar quando a seção de jogos entrar em vista
    const gamesSection = document.getElementById('games');
    if (gamesSection) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    console.log('🎯 Seção de jogos visível, inicializando...');
                    initGames();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        
        observer.observe(gamesSection);
    } else {
        // Fallback: inicializar após 3 segundos
        setTimeout(initGames, 3000);
    }
    
    // Jogo 1: Caça aos Brilhos
    function initClickerGame() {
        console.log('✨ Inicializando Caça aos Brilhos...');
        
        const canvas = document.getElementById('clicker-canvas');
        const scoreElement = document.getElementById('clicker-score');
        const highScoreElement = document.getElementById('clicker-high-score');
        const timerElement = document.getElementById('clicker-timer');
        const startButton = document.getElementById('start-clicker');
        const resetButton = document.getElementById('reset-clicker');
        
        if (!canvas || !startButton) {
            console.warn('⚠️ Elementos do Caça aos Brilhos não encontrados');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        let score = 0;
        let highScore = localStorage.getItem('clickerHighScore') || 0;
        let timeLeft = 60;
        let gameActive = false;
        let particles = [];
        
        // Atualizar high score no display
        highScoreElement.textContent = highScore;
        
        // Classe para partículas
        class Particle {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.size = Math.random() * 20 + 10;
                this.speedX = Math.random() * 3 - 1.5;
                this.speedY = Math.random() * 3 - 1.5;
                this.color = `hsl(${Math.random() * 60 + 30}, 100%, 50%)`; // Tons dourados
            }
            
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.size > 0.2) this.size -= 0.1;
            }
            
            draw() {
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Brilho
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 15;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
        
        // Criar partícula clicável
        function createClickableParticle() {
            const x = Math.random() * (canvas.width - 40) + 20;
            const y = Math.random() * (canvas.height - 40) + 20;
            const size = 20;
            const color = '#FFD700';
            
            return { x, y, size, color, clicked: false };
        }
        
        let clickableParticle = createClickableParticle();
        
        // Desenhar partícula clicável
        function drawClickableParticle() {
            if (!clickableParticle.clicked) {
                ctx.fillStyle = clickableParticle.color;
                ctx.beginPath();
                ctx.arc(clickableParticle.x, clickableParticle.y, clickableParticle.size, 0, Math.PI * 2);
                ctx.fill();
                
                // Brilho
                ctx.shadowColor = clickableParticle.color;
                ctx.shadowBlur = 20;
                ctx.fill();
                ctx.shadowBlur = 0;
                
                // Contorno pulsante
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(clickableParticle.x, clickableParticle.y, clickableParticle.size + 5, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        
        // Verificar clique na partícula
        canvas.addEventListener('click', function(event) {
            if (!gameActive) return;
            
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            const distance = Math.sqrt(
                Math.pow(x - clickableParticle.x, 2) + 
                Math.pow(y - clickableParticle.y, 2)
            );
            
            if (distance < clickableParticle.size && !clickableParticle.clicked) {
                // Aumentar score
                score += 10;
                scoreElement.textContent = score;
                
                // Criar efeito de explosão
                for (let i = 0; i < 15; i++) {
                    particles.push(new Particle(clickableParticle.x, clickableParticle.y));
                }
                
                // Marcar como clicado
                clickableParticle.clicked = true;
                
                // Nova partícula após delay
                setTimeout(() => {
                    clickableParticle = createClickableParticle();
                }, 500);
            }
        });
        
        // Animação
        function animate() {
            // Limpar canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Desenhar fundo
            ctx.fillStyle = 'rgba(20, 10, 30, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Atualizar e desenhar partículas de efeito
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
                
                // Remover partículas pequenas
                if (particles[i].size <= 0.2) {
                    particles.splice(i, 1);
                    i--;
                }
            }
            
            // Desenhar partícula clicável
            if (gameActive) {
                drawClickableParticle();
            } else {
                // Mensagem de início
                ctx.fillStyle = '#FFD700';
                ctx.font = '24px "Cinzel", serif';
                ctx.textAlign = 'center';
                ctx.fillText('Clique em "Iniciar Jogo"', canvas.width / 2, canvas.height / 2);
            }
            
            requestAnimationFrame(animate);
        }
        
        // Iniciar jogo
        startButton.addEventListener('click', function() {
            if (gameActive) return;
            
            gameActive = true;
            score = 0;
            timeLeft = 60;
            scoreElement.textContent = score;
            timerElement.textContent = `${timeLeft}s`;
            
            // Timer
            const timer = setInterval(() => {
                timeLeft--;
                timerElement.textContent = `${timeLeft}s`;
                
                if (timeLeft <= 0) {
                    clearInterval(timer);
                    gameActive = false;
                    
                    // Atualizar high score
                    if (score > highScore) {
                        highScore = score;
                        highScoreElement.textContent = highScore;
                        localStorage.setItem('clickerHighScore', highScore);
                    }
                    
                    alert(`Tempo esgotado! Sua pontuação: ${score}`);
                }
            }, 1000);
            
            this.disabled = true;
            setTimeout(() => {
                this.disabled = false;
            }, 61000); // 61 segundos (60 do jogo + 1 de segurança)
        });
        
        // Reiniciar jogo
        resetButton.addEventListener('click', function() {
            score = 0;
            timeLeft = 60;
            scoreElement.textContent = score;
            timerElement.textContent = `${timeLeft}s`;
            particles = [];
            clickableParticle = createClickableParticle();
        });
        
        // Iniciar animação
        animate();
    }
    
    // Jogo 2: Labirinto Lunar (simplificado)
    function initMazeGame() {
        console.log('🌙 Inicializando Labirinto Lunar...');
        
        const canvas = document.getElementById('maze-canvas');
        const levelElement = document.getElementById('maze-level');
        const movesElement = document.getElementById('maze-moves');
        const statusElement = document.getElementById('maze-status');
        const startButton = document.getElementById('start-maze');
        
        if (!canvas || !startButton) {
            console.warn('⚠️ Elementos do Labirinto não encontrados');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        const gridSize = 20;
        const rows = canvas.height / gridSize;
        const cols = canvas.width / gridSize;
        
        let player = { x: 1, y: 1 };
        let exit = { x: cols - 2, y: rows - 2 };
        let level = 1;
        let moves = 0;
        let gameActive = false;
        
        // Gerar labirinto simples
        function generateMaze() {
            const maze = [];
            for (let y = 0; y < rows; y++) {
                maze[y] = [];
                for (let x = 0; x < cols; x++) {
                    // Bordas são paredes
                    if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
                        maze[y][x] = 1;
                    } else {
                        // 30% de chance de ser parede (exceto posições do jogador e saída)
                        maze[y][x] = (Math.random() < 0.3 && 
                                     !(x === player.x && y === player.y) &&
                                     !(x === exit.x && y === exit.y)) ? 1 : 0;
                    }
                }
            }
            return maze;
        }
        
        let maze = generateMaze();
        
        // Desenhar labirinto
        function drawMaze() {
            // Fundo
            ctx.fillStyle = 'rgba(40, 20, 60, 0.9)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Paredes
            ctx.fillStyle = 'rgba(139, 30, 58, 0.8)';
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    if (maze[y][x] === 1) {
                        ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
                        
                        // Textura nas paredes
                        ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x * gridSize, y * gridSize, gridSize, gridSize);
                    }
                }
            }
            
            // Saída
            ctx.fillStyle = '#00FF00';
            ctx.beginPath();
            ctx.arc(
                exit.x * gridSize + gridSize / 2,
                exit.y * gridSize + gridSize / 2,
                gridSize / 2,
                0,
                Math.PI * 2
            );
            ctx.fill();
            
            // Jogador
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(
                player.x * gridSize + gridSize / 2,
                player.y * gridSize + gridSize / 2,
                gridSize / 2 - 2,
                0,
                Math.PI * 2
            );
            ctx.fill();
            
            // Brilho do jogador
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        // Movimentação
        function movePlayer(dx, dy) {
            if (!gameActive) return;
            
            const newX = player.x + dx;
            const newY = player.y + dy;
            
            // Verificar colisão
            if (maze[newY][newX] !== 1) {
                player.x = newX;
                player.y = newY;
                moves++;
                movesElement.textContent = moves;
                
                // Verificar vitória
                if (player.x === exit.x && player.y === exit.y) {
                    gameActive = false;
                    statusElement.textContent = 'Vitória!';
                    alert(`Parabéns! Você completou o nível ${level} em ${moves} movimentos!`);
                    
                    // Próximo nível
                    level++;
                    levelElement.textContent = level;
                    resetGame();
                }
                
                drawMaze();
            }
        }
        
        // Controles
        document.addEventListener('keydown', function(event) {
            if (!gameActive) return;
            
            switch(event.key) {
                case 'ArrowUp': movePlayer(0, -1); break;
                case 'ArrowDown': movePlayer(0, 1); break;
                case 'ArrowLeft': movePlayer(-1, 0); break;
                case 'ArrowRight': movePlayer(1, 0); break;
            }
        });
        
        // Controles mobile
        document.querySelectorAll('.control-button').forEach(button => {
            button.addEventListener('click', function() {
                const direction = this.getAttribute('data-direction');
                switch(direction) {
                    case 'up': movePlayer(0, -1); break;
                    case 'down': movePlayer(0, 1); break;
                    case 'left': movePlayer(-1, 0); break;
                    case 'right': movePlayer(1, 0); break;
                }
            });
        });
        
        // Reiniciar jogo
        function resetGame() {
            player = { x: 1, y: 1 };
            exit = { x: cols - 2, y: rows - 2 };
            moves = 0;
            movesElement.textContent = moves;
            maze = generateMaze();
            drawMaze();
        }
        
        // Iniciar jogo
        startButton.addEventListener('click', function() {
            gameActive = true;
            statusElement.textContent = 'Jogando';
            resetGame();
        });
        
        // Inicializar
        drawMaze();
    }
    
    // Jogo 3: Quiz
    function initQuizGame() {
        console.log('❓ Inicializando Quiz...');
        
        const quizQuestions = [
            {
                question: "Qual é a cor que mais representa a Ágatha?",
                options: ["Dourado", "Preto", "Vinho", "Roxo"],
                correct: 0,
                points: 10
            },
            {
                question: "Qual álbum da Lana Del Rey é referência no site?",
                options: ["Born to Die", "Ultraviolence", "Norman Fucking Rockwell", "Todos acima"],
                correct: 3,
                points: 15
            },
            {
                question: "Quantos anos a Ágartha está completando?",
                options: ["15", "16", "17", "18"],
                correct: 1,
                points: 5
            },
            {
                question: "Qual o tema principal do site?",
                options: ["Glamour Trevoso", "Futurismo", "Natureza", "Minimalismo"],
                correct: 0,
                points: 10
            },
            {
                question: "Qual elemento visual é destaque na seção Home?",
                options: ["Sol", "Lua", "Estrelas", "Cometas"],
                correct: 1,
                points: 10
            }
        ];
        
        const questionElement = document.getElementById('quiz-question');
        const optionsElement = document.getElementById('quiz-options');
        const resultElement = document.getElementById('quiz-result');
        const progressElement = document.getElementById('quiz-progress');
        const progressTextElement = document.getElementById('quiz-progress-text');
        const correctElement = document.getElementById('quiz-correct');
        const pointsElement = document.getElementById('quiz-points');
        const statusElement = document.getElementById('quiz-status');
        const startButton = document.getElementById('start-quiz');
        const nextButton = document.getElementById('next-question');
        
        let currentQuestion = 0;
        let score = 0;
        let totalPoints = 0;
        let quizActive = false;
        
        // Carregar questão
        function loadQuestion() {
            if (currentQuestion >= quizQuestions.length) {
                endQuiz();
                return;
            }
            
            const question = quizQuestions[currentQuestion];
            
            // Atualizar pergunta
            questionElement.querySelector('p').textContent = question.question;
            
            // Atualizar opções
            const optionElements = optionsElement.querySelectorAll('.quiz-option');
            optionElements.forEach((option, index) => {
                const textElement = option.querySelector('.option-text');
                textElement.textContent = question.options[index];
                
                // Resetar classes
                option.className = 'quiz-option';
                option.disabled = false;
                
                // Adicionar evento de clique
                option.onclick = function() {
                    if (!quizActive) return;
                    
                    // Desabilitar todas as opções
                    optionElements.forEach(opt => opt.disabled = true);
                    
                    // Verificar resposta
                    if (index === question.correct) {
                        option.classList.add('correct');
                        score++;
                        totalPoints += question.points;
                        correctElement.textContent = score;
                        pointsElement.textContent = totalPoints;
                    } else {
                        option.classList.add('incorrect');
                        // Mostrar a correta
                        optionElements[question.correct].classList.add('correct');
                    }
                    
                    // Habilitar botão próximo
                    nextButton.disabled = false;
                };
            });
            
            // Atualizar progresso
            const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;
            progressElement.style.width = `${progress}%`;
            progressTextElement.textContent = `Pergunta ${currentQuestion + 1}/${quizQuestions.length}`;
            
            // Desabilitar botão próximo
            nextButton.disabled = true;
        }
        
        // Iniciar quiz
        startButton.addEventListener('click', function() {
            quizActive = true;
            currentQuestion = 0;
            score = 0;
            totalPoints = 0;
            correctElement.textContent = '0';
            pointsElement.textContent = '0';
            statusElement.textContent = 'Em andamento';
            
            loadQuestion();
            this.disabled = true;
            nextButton.disabled = false;
        });
        
        // Próxima questão
        nextButton.addEventListener('click', function() {
            currentQuestion++;
            if (currentQuestion < quizQuestions.length) {
                loadQuestion();
            } else {
                endQuiz();
            }
        });
        
        // Finalizar quiz
        function endQuiz() {
            quizActive = false;
            statusElement.textContent = 'Concluído';
            
            // Resultado
            const percentage = (score / quizQuestions.length) * 100;
            let message = '';
            
            if (percentage === 100) {
                message = '🎉 Perfeito! Você conhece a Ágatha muito bem!';
            } else if (percentage >= 70) {
                message = '🌟 Ótimo! Você conhece bastante sobre ela!';
            } else if (percentage >= 50) {
                message = '👍 Bom! Mas pode melhorar...';
            } else {
                message = '💭 Hmm... Precisa conhecer mais a Ágatha!';
            }
            
            resultElement.innerHTML = `
                <p>${message}</p>
                <p><strong>Pontuação:</strong> ${score}/${quizQuestions.length} (${percentage.toFixed(0)}%)</p>
                <p><strong>Pontos totais:</strong> ${totalPoints}</p>
            `;
            
            // Habilitar botão iniciar
            startButton.disabled = false;
            nextButton.disabled = true;
        }
        
        // Inicializar
        loadQuestion();
    }
});