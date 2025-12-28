/* games/quiz.js */
/**
 * @file Quiz "Memórias & Lana" para o site da Ágatha Sophia
 * @description Quiz sobre Ágatha e referências a Lana Del Rey (sem letras)
 * @version 1.0.0
 * 
 * Dependências externas:
 * - GSAP (opcional) para animações: https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js
 * - Sistema de partículas (particles.js) para efeitos visuais
 * 
 * API pública: QuizGame class
 * Eventos emitidos: agatha:quiz:start, agatha:quiz:answer, agatha:quiz:finished
 * localStorage keys: agatha_quiz_scores, agatha_quiz_stats
 */

class QuizGame {
    constructor() {
        this.version = '1.0.0';
        this.container = null;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.totalQuestions = 0;
        this.isRunning = false;
        this.isFinished = false;
        this.selectedAnswer = null;
        this.timePerQuestion = 30000; // 30 segundos por pergunta
        this.timeLeft = this.timePerQuestion;
        this.timer = null;
        this.startTime = 0;
        
        // Configurações
        this.config = {
            shuffleQuestions: true,
            shuffleAnswers: true,
            showExplanations: true,
            enableHints: true,
            difficulty: 'medium' // easy, medium, hard
        };
        
        // Estatísticas
        this.stats = {
            gamesPlayed: 0,
            totalScore: 0,
            averageScore: 0,
            totalCorrect: 0,
            totalQuestions: 0,
            fastestCorrect: Infinity,
            badges: []
        };
        
        // Badges disponíveis
        this.badges = {
            perfect: { name: 'Perfeição Dourada', threshold: 100, icon: '🏆' },
            expert: { name: 'Expert Lana', threshold: 90, icon: '🎤' },
            fan: { name: 'Fã da Ágatha', threshold: 80, icon: '🌟' },
            rookie: { name: 'Iniciante', threshold: 60, icon: '🌙' }
        };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.start = this.start.bind(this);
        this.submitAnswer = this.submitAnswer.bind(this);
        this.getScore = this.getScore.bind(this);
        this.reset = this.reset.bind(this);
        this.shareResult = this.shareResult.bind(this);
        this.nextQuestion = this.nextQuestion.bind(this);
        this.updateTimer = this.updateTimer.bind(this);
        this.showResults = this.showResults.bind(this);
        this.loadQuestions = this.loadQuestions.bind(this);
    }

    /**
     * Inicializa o quiz
     * @param {HTMLElement} container - Container do quiz
     * @param {Array} questionsArray - Array de perguntas (opcional)
     * @param {Object} options - Configurações
     */
    async init(container, questionsArray = null, options = {}) {
        console.log('📝 Inicializando Quiz Memórias & Lana');
        
        // Mesclar configurações
        this.config = { ...this.config, ...options };
        
        // Obter container
        this.container = container;
        if (!this.container) {
            throw new Error('Container do quiz não encontrado');
        }
        
        // Carregar estatísticas
        this.loadStats();
        
        // Carregar perguntas
        if (questionsArray && questionsArray.length > 0) {
            this.questions = questionsArray;
        } else {
            this.questions = await this.loadQuestions();
        }
        
        this.totalQuestions = this.questions.length;
        
        // Embaralhar perguntas se configurado
        if (this.config.shuffleQuestions) {
            this.shuffleArray(this.questions);
        }
        
        // Criar interface
        this.createUI();
        
        console.log(`✅ Quiz inicializado com ${this.questions.length} perguntas`);
        
        return this;
    }

    /**
     * Carrega perguntas padrão
     */
    loadQuestions() {
        // Perguntas sobre Ágatha Sophia e Lana Del Rey (apenas referências visuais/temáticas)
        return [
            {
                id: 'q1',
                text: 'Qual é a cor favorita da Ágatha que inspirou a paleta deste site?',
                choices: ['Preto', 'Rosa Choque', 'Azul Celeste', 'Verde Esmeralda'],
                correct: 0,
                explanation: 'Preto combina com a estética trevosa e glamourosa que Ágatha aprecia.',
                category: 'Ágatha',
                difficulty: 'easy'
            },
            {
                id: 'q2',
                text: 'Qual álbum de Lana Del Rey é conhecido pela estética "cinematic vintage" que inspira este site?',
                choices: ['Honeymoon', 'Norman Fucking Rockwell!', 'Ultraviolence', 'Born To Die'],
                correct: 3,
                explanation: 'Born To Die é famoso por sua estética cinematográfica e vintage.',
                category: 'Lana',
                difficulty: 'medium'
            },
            {
                id: 'q3',
                text: 'Que elemento visual deste site faz referência à temática lunar comum em Lana Del Rey?',
                choices: ['As partículas douradas', 'A lua interativa', 'O fundo preto', 'O vinho das letras'],
                correct: 1,
                explanation: 'A lua é um símbolo recorrente na obra de Lana Del Rey.',
                category: 'Temática',
                difficulty: 'easy'
            },
            {
                id: 'q4',
                text: 'Qual desses NÃO é um tema comum na estética de Lana Del Rey?',
                choices: ['Melancolia glamourosa', 'Nostalgia americana', 'Futurismo tecnológico', 'Romance trágico'],
                correct: 2,
                explanation: 'Lana Del Rey é conhecida por estéticas retro/vintage, não futuristas.',
                category: 'Lana',
                difficulty: 'medium'
            },
            {
                id: 'q5',
                text: 'Quantos anos a Ágatha está completando neste site?',
                choices: ['15 anos', '16 anos', '17 anos', '18 anos'],
                correct: 1,
                explanation: 'Este site celebra os 16 anos de Ágatha Sophia!',
                category: 'Ágatha',
                difficulty: 'easy'
            },
            {
                id: 'q6',
                text: 'Qual dessas cores NÃO faz parte da paleta principal do site?',
                choices: ['Dourado', 'Vinho', 'Prata', 'Preto'],
                correct: 2,
                explanation: 'A paleta é preto, vinho e dourado - prata não está incluída.',
                category: 'Design',
                difficulty: 'easy'
            },
            {
                id: 'q7',
                text: 'Que tipo de "vibe" este site tenta capturar com referência a Lana Del Rey?',
                choices: ['Gótico-chic e vintage-cinematic', 'Pop animado e colorido', 'Tecnológico e futurista', 'Minimalista e clean'],
                correct: 0,
                explanation: 'A descrição do projeto especifica "gótico-chic + vintage-cinematic".',
                category: 'Temática',
                difficulty: 'medium'
            },
            {
                id: 'q8',
                text: 'O que a mensagem principal do site declara sobre a Ágatha?',
                choices: ['Ela é uma boa cantora', 'Ela é a melhor amiga do peito', 'Ela vai ser famosa', 'Ela gosta de Lana Del Rey'],
                correct: 1,
                explanation: 'O texto diz: "Ágatha, eu te amo. Você é minha melhor amiga do peito."',
                category: 'Ágatha',
                difficulty: 'easy'
            },
            {
                id: 'q9',
                text: 'Qual elemento do site permite interação por toque para revelar mensagens?',
                choices: ['As partículas flutuantes', 'A lua', 'O nome pulsante', 'O menu de navegação'],
                correct: 1,
                explanation: 'A lua interativa revela mensagens quando tocada.',
                category: 'Interatividade',
                difficulty: 'easy'
            },
            {
                id: 'q10',
                text: 'Que aspecto da persona de Lana Del Rey é referenciado sem usar letras de músicas?',
                choices: ['Apenas sua vida pessoal', 'Apenas seus videoclipes', 'Sua estética visual e atmosfera', 'Apenas suas roupas'],
                correct: 2,
                explanation: 'O site referencia a estética e atmosfera, não letras ou vida pessoal.',
                category: 'Lana',
                difficulty: 'medium'
            }
        ];
    }

    /**
     * Cria interface do quiz
     */
    createUI() {
        // Limpar container
        this.container.innerHTML = '';
        
        // Criar estrutura
        this.container.innerHTML = `
            <div class="quiz-container">
                <div class="quiz-header">
                    <h3 class="quiz-title">Quiz: Memórias & Lana</h3>
                    <div class="quiz-progress">
                        <span class="progress-text">Pergunta <span id="current-q">1</span>/${this.totalQuestions}</span>
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                    </div>
                    <div class="quiz-timer">
                        <span class="timer-icon">⏳</span>
                        <span class="timer-text" id="timer-text">30s</span>
                    </div>
                    <div class="quiz-score">
                        <span class="score-text">Pontuação: <span id="score-text">0</span></span>
                    </div>
                </div>
                
                <div class="quiz-question-container">
                    <div class="question-category" id="question-category">Ágatha</div>
                    <div class="question-text" id="question-text"></div>
                    
                    <div class="question-choices" id="question-choices">
                        <!-- As opções serão inseridas aqui -->
                    </div>
                    
                    <div class="quiz-controls">
                        <button class="btn" id="quiz-hint" disabled>Dica (em breve)</button>
                        <button class="btn-neon" id="quiz-submit" disabled>Confirmar Resposta</button>
                        <button class="btn-gold" id="quiz-next" style="display: none;">Próxima Pergunta</button>
                    </div>
                </div>
                
                <div class="quiz-feedback" id="quiz-feedback" style="display: none;">
                    <!-- Feedback será inserido aqui -->
                </div>
            </div>
        `;
        
        // Adicionar estilos
        this.addStyles();
        
        // Configurar elementos
        this.questionText = this.container.querySelector('#question-text');
        this.questionChoices = this.container.querySelector('#question-choices');
        this.questionCategory = this.container.querySelector('#question-category');
        this.currentQ = this.container.querySelector('#current-q');
        this.progressFill = this.container.querySelector('#progress-fill');
        this.timerText = this.container.querySelector('#timer-text');
        this.scoreText = this.container.querySelector('#score-text');
        this.feedback = this.container.querySelector('#quiz-feedback');
        
        // Configurar botões
        const submitBtn = this.container.querySelector('#quiz-submit');
        const nextBtn = this.container.querySelector('#quiz-next');
        const hintBtn = this.container.querySelector('#quiz-hint');
        
        submitBtn.addEventListener('click', () => {
            if (this.selectedAnswer !== null) {
                this.submitAnswer(this.selectedAnswer);
            }
        });
        
        nextBtn.addEventListener('click', this.nextQuestion);
        
        if (this.config.enableHints) {
            hintBtn.disabled = false;
            hintBtn.textContent = 'Dica (-10 pontos)';
            hintBtn.addEventListener('click', () => {
                this.showHint();
            });
        }
        
        // Configurar acessibilidade
        this.container.setAttribute('role', 'application');
        this.container.setAttribute('aria-label', 'Quiz Memórias & Lana');
    }

    /**
     * Adiciona estilos ao quiz
     */
    addStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            .quiz-container {
                background: var(--glass);
                border-radius: var(--border-radius);
                padding: 1.5rem;
                border: 1px solid rgba(255,255,255,0.05);
                font-family: var(--font-body);
            }
            
            .quiz-header {
                display: grid;
                grid-template-columns: 1fr auto auto;
                gap: 1rem;
                align-items: center;
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            
            .quiz-title {
                font-family: var(--font-heading);
                color: var(--gold);
                margin: 0;
                font-size: var(--font-size-xl);
            }
            
            .quiz-progress {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
                min-width: 150px;
            }
            
            .progress-text {
                font-size: var(--font-size-sm);
                color: var(--muted);
            }
            
            .progress-bar {
                height: 6px;
                background: rgba(255,255,255,0.1);
                border-radius: 3px;
                overflow: hidden;
            }
            
            .progress-fill {
                height: 100%;
                background: var(--gold);
                width: 0%;
                transition: width 0.3s ease;
            }
            
            .quiz-timer {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                background: rgba(212, 175, 55, 0.1);
                border-radius: var(--border-radius-sm);
                color: var(--gold);
                font-weight: bold;
            }
            
            .quiz-score {
                padding: 0.5rem 1rem;
                background: rgba(255,255,255,0.05);
                border-radius: var(--border-radius-sm);
                font-weight: bold;
            }
            
            .quiz-question-container {
                margin-bottom: 1.5rem;
            }
            
            .question-category {
                display: inline-block;
                padding: 0.25rem 0.75rem;
                background: var(--wine);
                color: white;
                border-radius: 20px;
                font-size: var(--font-size-xs);
                font-weight: 600;
                margin-bottom: 1rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .question-text {
                font-size: var(--font-size-lg);
                line-height: 1.5;
                margin-bottom: 1.5rem;
                color: var(--light);
                font-weight: 500;
            }
            
            .question-choices {
                display: grid;
                gap: 0.75rem;
                margin-bottom: 1.5rem;
            }
            
            .choice {
                padding: 1rem 1.25rem;
                background: rgba(255,255,255,0.05);
                border: 2px solid transparent;
                border-radius: var(--border-radius-sm);
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: var(--font-body);
                text-align: left;
                color: var(--light);
                font-size: var(--font-size-base);
            }
            
            .choice:hover {
                background: rgba(255,255,255,0.1);
                transform: translateY(-2px);
            }
            
            .choice.selected {
                border-color: var(--gold);
                background: rgba(212, 175, 55, 0.1);
            }
            
            .choice.correct {
                border-color: #4CAF50;
                background: rgba(76, 175, 80, 0.1);
            }
            
            .choice.incorrect {
                border-color: #f44336;
                background: rgba(244, 67, 54, 0.1);
            }
            
            .choice-label {
                display: inline-block;
                width: 30px;
                font-weight: bold;
                color: var(--gold);
            }
            
            .quiz-controls {
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin-top: 2rem;
            }
            
            .quiz-feedback {
                margin-top: 1.5rem;
                padding: 1.5rem;
                background: rgba(0,0,0,0.3);
                border-radius: var(--border-radius-sm);
                border-left: 4px solid var(--gold);
                animation: fade-slide-up 0.5s ease;
            }
            
            .feedback-title {
                color: var(--gold);
                margin-top: 0;
                margin-bottom: 0.5rem;
                font-family: var(--font-heading);
            }
            
            .feedback-explanation {
                color: var(--muted);
                line-height: 1.6;
                margin-bottom: 1rem;
            }
            
            .feedback-stats {
                display: flex;
                gap: 1rem;
                font-size: var(--font-size-sm);
                color: var(--muted);
            }
            
            @media (max-width: 768px) {
                .quiz-header {
                    grid-template-columns: 1fr;
                    text-align: center;
                }
                
                .quiz-controls {
                    flex-direction: column;
                }
                
                .quiz-controls .btn {
                    width: 100%;
                }
            }
        `;
        
        this.container.appendChild(styles);
    }

    /**
     * Inicia o quiz
     */
    start() {
        if (this.isRunning) return;
        
        console.log('🚀 Iniciando quiz');
        
        this.isRunning = true;
        this.isFinished = false;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.selectedAnswer = null;
        this.startTime = Date.now();
        
        // Incrementar contador de jogos
        this.stats.gamesPlayed++;
        
        // Mostrar primeira pergunta
        this.showQuestion(this.currentQuestionIndex);
        
        // Emitir evento de início
        document.dispatchEvent(new CustomEvent('agatha:quiz:start', {
            detail: { totalQuestions: this.totalQuestions }
        }));
    }

    /**
     * Mostra uma pergunta
     * @param {number} index - Índice da pergunta
     */
    showQuestion(index) {
        if (index >= this.questions.length) {
            this.showResults();
            return;
        }
        
        // Resetar estado
        this.selectedAnswer = null;
        this.timeLeft = this.timePerQuestion;
        
        // Atualizar índice atual
        this.currentQuestionIndex = index;
        const question = this.questions[index];
        
        // Atualizar UI
        this.questionText.textContent = question.text;
        this.questionCategory.textContent = question.category;
        this.currentQ.textContent = index + 1;
        
        // Atualizar barra de progresso
        const progress = ((index) / this.totalQuestions) * 100;
        this.progressFill.style.width = `${progress}%`;
        
        // Atualizar pontuação
        this.scoreText.textContent = this.score;
        
        // Limpar escolhas anteriores
        this.questionChoices.innerHTML = '';
        
        // Preparar opções
        let choices = question.choices;
        
        // Embaralhar opções se configurado
        if (this.config.shuffleAnswers) {
            // Manter índice correto
            const correctChoice = choices[question.correct];
            const shuffledIndices = [...choices.keys()];
            this.shuffleArray(shuffledIndices);
            
            // Reorganizar choices e encontrar novo índice correto
            choices = shuffledIndices.map(i => choices[i]);
            const newCorrectIndex = shuffledIndices.indexOf(question.correct);
            question.shuffledCorrect = newCorrectIndex;
        } else {
            question.shuffledCorrect = question.correct;
        }
        
        // Adicionar opções à UI
        const labels = ['A', 'B', 'C', 'D'];
        choices.forEach((choice, i) => {
            const choiceEl = document.createElement('button');
            choiceEl.className = 'choice';
            choiceEl.innerHTML = `
                <span class="choice-label">${labels[i]}</span>
                <span class="choice-text">${choice}</span>
            `;
            choiceEl.setAttribute('data-index', i);
            choiceEl.setAttribute('role', 'radio');
            choiceEl.setAttribute('aria-checked', 'false');
            
            choiceEl.addEventListener('click', () => {
                this.selectAnswer(i);
            });
            
            this.questionChoices.appendChild(choiceEl);
        });
        
        // Resetar botões
        const submitBtn = this.container.querySelector('#quiz-submit');
        const nextBtn = this.container.querySelector('#quiz-next');
        const hintBtn = this.container.querySelector('#quiz-hint');
        
        submitBtn.disabled = true;
        submitBtn.style.display = 'inline-flex';
        nextBtn.style.display = 'none';
        hintBtn.disabled = !this.config.enableHints;
        
        // Esconder feedback
        this.feedback.style.display = 'none';
        
        // Iniciar timer
        this.startTimer();
        
        // Focar na primeira opção para acessibilidade
        if (this.questionChoices.firstChild) {
            this.questionChoices.firstChild.focus();
        }
    }

    /**
     * Seleciona uma resposta
     * @param {number} index - Índice da resposta selecionada
     */
    selectAnswer(index) {
        // Desmarcar todas
        this.questionChoices.querySelectorAll('.choice').forEach(choice => {
            choice.classList.remove('selected');
            choice.setAttribute('aria-checked', 'false');
        });
        
        // Marcar selecionada
        const selectedChoice = this.questionChoices.querySelector(`[data-index="${index}"]`);
        if (selectedChoice) {
            selectedChoice.classList.add('selected');
            selectedChoice.setAttribute('aria-checked', 'true');
            this.selectedAnswer = index;
            
            // Habilitar botão de confirmar
            const submitBtn = this.container.querySelector('#quiz-submit');
            submitBtn.disabled = false;
        }
    }

    /**
     * Submete a resposta selecionada
     * @param {number} answerIndex - Índice da resposta
     */
    submitAnswer(answerIndex) {
        if (!this.isRunning || this.isFinished) return;
        
        clearTimeout(this.timer);
        
        const question = this.questions[this.currentQuestionIndex];
        const correctIndex = question.shuffledCorrect !== undefined ? 
            question.shuffledCorrect : question.correct;
        
        const isCorrect = answerIndex === correctIndex;
        
        // Atualizar pontuação
        if (isCorrect) {
            // Pontuação baseada na dificuldade e tempo restante
            const baseScore = this.getQuestionScore(question.difficulty);
            const timeBonus = Math.floor((this.timeLeft / this.timePerQuestion) * 50);
            const points = baseScore + timeBonus;
            
            this.score += points;
            
            // Atualizar estatísticas
            this.stats.totalCorrect++;
            
            // Emitir evento de acerto
            document.dispatchEvent(new CustomEvent('agatha:quiz:answer', {
                detail: {
                    questionId: question.id,
                    correct: true,
                    points,
                    timeBonus,
                    responseTime: this.timePerQuestion - this.timeLeft
                }
            }));
        } else {
            // Pequena penalidade por erro
            this.score = Math.max(0, this.score - 10);
            
            document.dispatchEvent(new CustomEvent('agatha:quiz:answer', {
                detail: {
                    questionId: question.id,
                    correct: false,
                    points: -10
                }
            }));
        }
        
        // Atualizar estatísticas
        this.stats.totalQuestions++;
        
        // Mostrar feedback
        this.showFeedback(isCorrect, correctIndex, question);
        
        // Atualizar UI
        this.scoreText.textContent = this.score;
        
        // Destacar respostas corretas/incorretas
        this.questionChoices.querySelectorAll('.choice').forEach((choice, i) => {
            if (i === correctIndex) {
                choice.classList.add('correct');
            } else if (i === answerIndex && !isCorrect) {
                choice.classList.add('incorrect');
            }
            choice.style.pointerEvents = 'none';
        });
        
        // Atualizar botões
        const submitBtn = this.container.querySelector('#quiz-submit');
        const nextBtn = this.container.querySelector('#quiz-next');
        const hintBtn = this.container.querySelector('#quiz-hint');
        
        submitBtn.style.display = 'none';
        nextBtn.style.display = 'inline-flex';
        hintBtn.disabled = true;
        
        // Spawn de partículas para acerto
        if (isCorrect && window.agathaParticles && window.agathaParticles.spawnGlitter) {
            const containerRect = this.container.getBoundingClientRect();
            window.agathaParticles.spawnGlitter(
                containerRect.left + containerRect.width / 2,
                containerRect.top + 100,
                15
            );
        }
    }

    /**
     * Calcula pontuação baseada na dificuldade
     */
    getQuestionScore(difficulty) {
        switch(difficulty) {
            case 'easy': return 50;
            case 'medium': return 100;
            case 'hard': return 150;
            default: return 100;
        }
    }

    /**
     * Mostra feedback da resposta
     */
    showFeedback(isCorrect, correctIndex, question) {
        this.feedback.style.display = 'block';
        
        const correctChoice = question.choices[question.correct];
        const labels = ['A', 'B', 'C', 'D'];
        
        let feedbackHTML = `
            <h4 class="feedback-title">
                ${isCorrect ? '✅ Resposta Correta!' : '❌ Resposta Incorreta'}
            </h4>
        `;
        
        if (!isCorrect) {
            feedbackHTML += `
                <p class="feedback-explanation">
                    A resposta correta era: <strong>${labels[correctIndex]}. ${correctChoice}</strong>
                </p>
            `;
        }
        
        if (this.config.showExplanations && question.explanation) {
            feedbackHTML += `
                <p class="feedback-explanation">
                    <strong>Explicação:</strong> ${question.explanation}
                </p>
            `;
        }
        
        feedbackHTML += `
            <div class="feedback-stats">
                <span>Tempo restante: ${Math.floor(this.timeLeft / 1000)}s</span>
                <span>Pontuação: ${this.score}</span>
                <span>Acertos: ${this.stats.totalCorrect}/${this.stats.gamesPlayed * this.totalQuestions}</span>
            </div>
        `;
        
        this.feedback.innerHTML = feedbackHTML;
        
        // Animar entrada
        if (typeof gsap !== 'undefined') {
            gsap.from(this.feedback, {
                opacity: 0,
                y: 20,
                duration: 0.5,
                ease: "back.out(1.7)"
            });
        }
    }

    /**
     * Mostra dica (penaliza pontuação)
     */
    showHint() {
        if (!this.isRunning || this.selectedAnswer !== null) return;
        
        // Penalizar por usar dica
        this.score = Math.max(0, this.score - 10);
        this.scoreText.textContent = this.score;
        
        const question = this.questions[this.currentQuestionIndex];
        const correctIndex = question.shuffledCorrect !== undefined ? 
            question.shuffledCorrect : question.correct;
        
        // Destacar duas opções incorretas
        let incorrectIndices = [0, 1, 2, 3].filter(i => i !== correctIndex);
        this.shuffleArray(incorrectIndices);
        const toRemove = incorrectIndices.slice(0, 2);
        
        toRemove.forEach(index => {
            const choice = this.questionChoices.querySelector(`[data-index="${index}"]`);
            if (choice) {
                choice.style.opacity = '0.3';
                choice.style.pointerEvents = 'none';
            }
        });
        
        // Desabilitar botão de dica
        const hintBtn = this.container.querySelector('#quiz-hint');
        hintBtn.disabled = true;
        hintBtn.textContent = 'Dica usada';
        
        console.log('💡 Dica usada (-10 pontos)');
    }

    /**
     * Avança para próxima pergunta
     */
    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            this.showQuestion(this.currentQuestionIndex);
        } else {
            this.showResults();
        }
    }

    /**
     * Inicia timer da pergunta
     */
    startTimer() {
        clearTimeout(this.timer);
        
        const update = () => {
            this.timeLeft -= 100;
            
            if (this.timeLeft <= 0) {
                this.timeLeft = 0;
                this.timerText.textContent = '0s';
                
                // Submeter automaticamente se houver resposta selecionada
                if (this.selectedAnswer !== null) {
                    this.submitAnswer(this.selectedAnswer);
                } else {
                    // Tempo esgotado sem resposta
                    this.handleTimeOut();
                }
                
                return;
            }
            
            this.timerText.textContent = `${Math.ceil(this.timeLeft / 1000)}s`;
            
            // Animação do timer
            const timerEl = this.container.querySelector('.quiz-timer');
            if (this.timeLeft < 5000) { // Últimos 5 segundos
                timerEl.style.animation = 'blink 1s infinite';
                timerEl.style.color = '#ff6b6b';
            } else {
                timerEl.style.animation = '';
                timerEl.style.color = '';
            }
            
            this.timer = setTimeout(update, 100);
        };
        
        update();
    }

    /**
     * Atualiza timer
     */
    updateTimer() {
        if (!this.isRunning || this.isFinished) return;
        
        if (this.timeLeft > 0) {
            this.timeLeft -= 1000;
            this.timerText.textContent = `${Math.ceil(this.timeLeft / 1000)}s`;
        } else {
            this.handleTimeOut();
        }
    }

    /**
     * Lida com tempo esgotado
     */
    handleTimeOut() {
        clearTimeout(this.timer);
        
        // Se não houver resposta selecionada, marcar como incorreta
        if (this.selectedAnswer === null) {
            // Escolher aleatoriamente (ou primeira opção)
            const randomIndex = Math.floor(Math.random() * 4);
            this.selectAnswer(randomIndex);
            this.submitAnswer(randomIndex);
        }
    }

    /**
     * Mostra resultados finais
     */
    showResults() {
        this.isRunning = false;
        this.isFinished = true;
        clearTimeout(this.timer);
        
        const totalTime = Date.now() - this.startTime;
        const percentage = (this.score / (this.totalQuestions * 150)) * 100;
        const finalPercentage = Math.min(100, Math.max(0, percentage));
        
        // Atualizar estatísticas
        this.stats.totalScore += this.score;
        this.stats.averageScore = this.stats.totalScore / this.stats.gamesPlayed;
        
        // Verificar badges
        this.checkBadges(finalPercentage);
        
        // Salvar estatísticas
        this.saveStats();
        
        // Mostrar tela de resultados
        this.showResultsScreen(finalPercentage, totalTime);
        
        // Emitir evento de finalização
        document.dispatchEvent(new CustomEvent('agatha:quiz:finished', {
            detail: {
                score: this.score,
                percentage: finalPercentage,
                totalQuestions: this.totalQuestions,
                totalTime,
                badges: this.stats.badges
            }
        }));
        
        console.log(`🏁 Quiz finalizado: ${this.score} pontos (${finalPercentage.toFixed(1)}%)`);
    }

    /**
     * Verifica e atribui badges
     */
    checkBadges(percentage) {
        const newBadges = [];
        
        for (const [key, badge] of Object.entries(this.badges)) {
            if (percentage >= badge.threshold && 
                !this.stats.badges.some(b => b.name === badge.name)) {
                newBadges.push(badge);
            }
        }
        
        if (newBadges.length > 0) {
            this.stats.badges.push(...newBadges);
            
            // Spawn de partículas para novos badges
            if (window.agathaParticles && window.agathaParticles.spawnGlitter) {
                const containerRect = this.container.getBoundingClientRect();
                window.agathaParticles.spawnGlitter(
                    containerRect.left + containerRect.width / 2,
                    containerRect.top + containerRect.height / 2,
                    30
                );
            }
        }
    }

    /**
     * Mostra tela de resultados
     */
    showResultsScreen(percentage, totalTime) {
        // Formatar tempo
        const minutes = Math.floor(totalTime / 60000);
        const seconds = Math.floor((totalTime % 60000) / 1000);
        const timeFormatted = `${minutes > 0 ? minutes + 'm ' : ''}${seconds}s`;
        
        // Determinar mensagem baseada na pontuação
        let message, color;
        if (percentage >= 90) {
            message = 'Excelente! Você é um verdadeiro conhecedor!';
            color = '#ffd700';
        } else if (percentage >= 70) {
            message = 'Muito bom! Você conhece bem a Ágatha e Lana!';
            color = '#D4AF37';
        } else if (percentage >= 50) {
            message = 'Bom trabalho! Continue aprendendo!';
            color = '#8a6d3b';
        } else {
            message = 'Continue explorando o site para descobrir mais!';
            color = '#4b0f1e';
        }
        
        // Novos badges
        const newBadges = this.stats.badges.filter(badge => 
            !this.stats.prevBadges || !this.stats.prevBadges.some(b => b.name === badge.name)
        );
        
        // Substituir conteúdo do container
        this.container.innerHTML = '';
        
        this.container.innerHTML = `
            <div class="quiz-results" style="text-align: center; padding: 2rem;">
                <h3 style="color: var(--gold); margin-bottom: 1rem;">📊 Resultados do Quiz</h3>
                
                <div style="margin: 2rem 0;">
                    <div style="font-size: 4rem; color: ${color}; font-weight: bold; margin: 1rem 0;">
                        ${finalPercentage.toFixed(1)}%
                    </div>
                    <div style="color: var(--muted); font-size: 1.2rem; margin-bottom: 0.5rem;">
                        ${this.score} pontos
                    </div>
                    <div style="color: var(--muted);">
                        ${this.stats.totalCorrect} de ${this.totalQuestions} corretas
                    </div>
                </div>
                
                <p style="color: ${color}; font-weight: bold; margin: 1.5rem 0; font-size: 1.1rem;">
                    ${message}
                </p>
                
                <div style="background: rgba(255,255,255,0.05); border-radius: var(--border-radius); padding: 1.5rem; margin: 1.5rem 0;">
                    <h4 style="color: var(--gold); margin-top: 0;">📈 Estatísticas</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; text-align: left;">
                        <div>
                            <p style="color: var(--muted); margin: 0.5rem 0;">Tempo total: <strong>${timeFormatted}</strong></p>
                            <p style="color: var(--muted); margin: 0.5rem 0;">Média de acertos: <strong>${(this.stats.totalCorrect / this.stats.gamesPlayed).toFixed(1)}</strong></p>
                        </div>
                        <div>
                            <p style="color: var(--muted); margin: 0.5rem 0;">Jogos realizados: <strong>${this.stats.gamesPlayed}</strong></p>
                            <p style="color: var(--muted); margin: 0.5rem 0;">Pontuação média: <strong>${Math.round(this.stats.averageScore)}</strong></p>
                        </div>
                    </div>
                </div>
                
                ${newBadges.length > 0 ? `
                    <div style="background: rgba(212, 175, 55, 0.1); border-radius: var(--border-radius); padding: 1.5rem; margin: 1.5rem 0; border: 1px solid var(--gold);">
                        <h4 style="color: #ffd700; margin-top: 0;">🏆 Novas Conquistas!</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; margin: 1rem 0;">
                            ${newBadges.map(badge => `
                                <div style="background: rgba(0,0,0,0.3); padding: 0.75rem 1.25rem; border-radius: 20px; display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="font-size: 1.2rem;">${badge.icon}</span>
                                    <span style="color: var(--gold); font-weight: 600;">${badge.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${this.stats.badges.length > 0 ? `
                    <div style="margin: 1.5rem 0;">
                        <h4 style="color: var(--gold); margin-bottom: 1rem;">📛 Todas as Conquistas</h4>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center;">
                            ${this.stats.badges.map(badge => `
                                <div style="background: rgba(212, 175, 55, 0.1); padding: 0.5rem 1rem; border-radius: 15px; display: flex; align-items: center; gap: 0.5rem;">
                                    <span>${badge.icon}</span>
                                    <span style="color: var(--light); font-size: 0.9rem;">${badge.name}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem; flex-wrap: wrap;">
                    <button class="btn-gold" id="quiz-restart">Jogar Novamente</button>
                    <button class="btn-neon" id="quiz-share">Compartilhar Resultado</button>
                    <button class="btn" id="quiz-close">Voltar ao Menu</button>
                </div>
            </div>
        `;
        
        // Configurar botões
        this.container.querySelector('#quiz-restart').addEventListener('click', () => {
            this.reset();
            this.start();
        });
        
        this.container.querySelector('#quiz-share').addEventListener('click', () => {
            this.shareResult();
        });
        
        this.container.querySelector('#quiz-close').addEventListener('click', () => {
            this.reset();
            this.createUI();
        });
        
        // Salvar badges anteriores
        this.stats.prevBadges = [...this.stats.badges];
    }

    /**
     * Obtém pontuação atual
     */
    getScore() {
        return this.score;
    }

    /**
     * Reseta o quiz
     */
    reset() {
        this.isRunning = false;
        this.isFinished = false;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.selectedAnswer = null;
        this.timeLeft = this.timePerQuestion;
        clearTimeout(this.timer);
    }

    /**
     * Compartilha resultado
     */
    shareResult() {
        const result = this.shareResult();
        
        // Usar Web Share API se disponível
        if (navigator.share) {
            navigator.share({
                title: 'Meu resultado no Quiz Memórias & Lana',
                text: `Consegui ${result.percentage}% no quiz sobre Ágatha Sophia e Lana Del Rey!`,
                url: window.location.href
            }).catch(() => {
                this.fallbackShare(result);
            });
        } else {
            this.fallbackShare(result);
        }
    }

    /**
     * Fallback para compartilhamento
     */
    fallbackShare(result) {
        // Copiar para área de transferência
        const text = `🎯 Quiz Memórias & Lana\nPontuação: ${result.score} (${result.percentage}%)\nAcertos: ${result.correct}/${result.total}\n\nJogue em: ${window.location.href}`;
        
        navigator.clipboard.writeText(text).then(() => {
            alert('Resultado copiado para a área de transferência! Cole para compartilhar.');
        }).catch(() => {
            prompt('Copie o texto abaixo para compartilhar:', text);
        });
    }

    /**
     * Prepara payload para compartilhamento
     */
    shareResult() {
        return {
            score: this.score,
            percentage: Math.min(100, Math.max(0, (this.score / (this.totalQuestions * 150)) * 100)),
            correct: this.stats.totalCorrect,
            total: this.totalQuestions,
            badges: this.stats.badges,
            game: 'quiz',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Carrega estatísticas do localStorage
     */
    loadStats() {
        try {
            const stats = localStorage.getItem('agatha_quiz_stats');
            if (stats) {
                const parsed = JSON.parse(stats);
                this.stats = { ...this.stats, ...parsed };
            }
            
            const scores = localStorage.getItem('agatha_quiz_scores');
            if (scores) {
                this.scores = JSON.parse(scores);
            } else {
                this.scores = [];
            }
        } catch (e) {
            console.warn('Não foi possível carregar estatísticas do quiz:', e);
        }
    }

    /**
     * Salva estatísticas no localStorage
     */
    saveStats() {
        try {
            // Salvar estatísticas
            localStorage.setItem('agatha_quiz_stats', JSON.stringify(this.stats));
            
            // Salvar pontuação atual no histórico
            const result = {
                score: this.score,
                percentage: Math.min(100, Math.max(0, (this.score / (this.totalQuestions * 150)) * 100)),
                date: new Date().toISOString(),
                badges: this.stats.badges
            };
            
            this.scores.push(result);
            
            // Manter apenas os últimos 50 resultados
            if (this.scores.length > 50) {
                this.scores = this.scores.slice(-50);
            }
            
            localStorage.setItem('agatha_quiz_scores', JSON.stringify(this.scores));
            
        } catch (e) {
            console.warn('Não foi possível salvar estatísticas do quiz:', e);
        }
    }

    /**
     * Embaralha array
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Destroi o quiz
     */
    destroy() {
        this.reset();
        clearTimeout(this.timer);
        console.log('👋 Quiz destruído');
    }
}

// Exportar para uso global
window.QuizGame = QuizGame;

// Inicialização automática se houver container
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const quizContainers = document.querySelectorAll('[data-game-type="quiz"]');
        quizContainers.forEach(container => {
            if (!container.agathaQuizGame) {
                const game = new QuizGame();
                game.init(container);
                container.agathaQuizGame = game;
                
                // Botão de iniciar
                const startBtn = container.querySelector('#start-quiz');
                if (startBtn) {
                    startBtn.addEventListener('click', () => game.start());
                }
            }
        });
    });
}

console.log('✨ Quiz Memórias & Lana carregado. Use new QuizGame() para criar instâncias.');