const PREDICTION_CONFIG = {
    channel: '#liiukiin',
    broadcaster: 'liiukiin',
    allowedUsers: ['liiukiin', 'takeru_xiii'] // Usuarios con permisos de administración
};

class PredictionApp {
    constructor() {
        this.client = null;
        this.active = false;
        this.resolved = false;
        this.timer = 0;
        this.timerInterval = null;
        this.connected = false;
        
        this.prediction = {
            question: '',
            options: {}, // { 'a': { text: '...', voters: Set() }, ... }
            totalVotes: 0
        };

        this.lastResolvedPrediction = null; // Para guardar la última finalizada
        this.lastWinner = null;

        // DOM Elements
        this.overlay = document.getElementById('prediction-overlay');
        this.timerEl = document.getElementById('timer-text');
        this.questionEl = document.getElementById('question-text');
        this.optionsContainer = document.getElementById('options-list');

        this.init();
    }

    async init() {
        console.log('🔮 Incializando Prediction Engine (Silencioso)...');
        this.connect();
    }

    connect() {
        this.client = new tmi.Client({
            connection: { reconnect: true, secure: true },
            channels: [PREDICTION_CONFIG.channel]
        });

        this.client.connect()
            .then(() => {
                this.connected = true;
                console.log('✅ Conectado a Twitch:', PREDICTION_CONFIG.channel);
            })
            .catch(err => {
                console.error('❌ Error de conexión:', err);
                this.timerEl.textContent = "ERROR DE CONEXIÓN";
            });

        this.client.on('message', (channel, tags, message, self) => {
            if (self) return;
            console.log(`📩 Mensaje recibido de ${tags.username}: ${message}`);
            this.handleMessage(tags, message);
        });
    }

    handleMessage(tags, message) {
        const username = tags.username?.toLowerCase();
        const isAdmin = PREDICTION_CONFIG.allowedUsers.includes(username);
        
        const msg = message.trim();
        const msgLower = msg.toLowerCase();

        // Debug: mostrar en consola si es un administrador detectado
        if (isAdmin) console.log(`👑 Admin Command Detected: ${username}`);

        // Comando para ayuda de predicción: !pre solo
        if (msgLower === '!pre' && isAdmin) {
            this.showHelp();
            return;
        }

        // Comando para ver la última encuesta finalizada: !preult
        if (msgLower === '!preult' && isAdmin) {
            this.showLastResult();
            return;
        }

        // Comando para iniciar predicción: !pre <minutos> <pregunta> a-N b-N...
        if (msgLower.startsWith('!pre ') && isAdmin) {
            console.log('📝 Intentando procesar !pre...');
            this.startPrediction(msg);
            return;
        }

        // Comandos para resolver: !acorrecta, !bcorrecta...
        if (msgLower.endsWith('correcta') && isAdmin && this.active) {
            const letter = msg.charAt(1);
            if (this.prediction.options[letter]) {
                this.resolvePrediction(letter);
            }
            return;
        }

        // Comandos para votar: !a !b !c...
        if (this.active && !this.resolved && msg.startsWith('!')) {
            const vote = msg.substring(1);
            if (this.prediction.options[vote]) {
                this.addVote(tags['display-name'] || tags.username, vote);
            }
        }
    }

    startPrediction(fullMessage) {
        // Regex mejorada: Más flexible con el orden y los espacios
        // !pre (N) (Pregunta) a-Op1 b-Op2
        const mainRegex = /^!pre\s+(\d+)\s+(.+?)\s+([a-z]-.+)$/i;
        const match = fullMessage.match(mainRegex);

        if (!match) {
            console.error('❌ Formato inválido. Mostrando ayuda...');
            this.showHelp();
            return;
        }

        const minutes = parseInt(match[1]);
        const question = match[2];
        const optionsStr = match[3];

        console.log(`🚀 Iniciando: "${question}" (${minutes} min)`);

        // Parse labels and texts: "a-Option A b-Option B"
        const options = {};
        const parts = optionsStr.split(/\s+(?=[a-z]-)/i);
        
        parts.forEach(part => {
            const match = part.match(/^([a-z])-(.+)/i);
            if (match) {
                const label = match[1].toLowerCase();
                const text = match[2].trim();
                options[label] = {
                    text: text,
                    voters: new Set()
                };
            }
        });

        // Reset and set new prediction
        this.active = true;
        this.resolved = false;
        this.prediction = { question, options, totalVotes: 0 };
        this.timer = minutes * 60;

        this.renderAll();
        this.startTimer();
        this.overlay.classList.remove('resolved');
        this.overlay.style.display = 'flex';
    }

    addVote(username, optionLabel) {
        // Un usuario solo puede tener un voto activo (cambiar si ya votó)
        Object.values(this.prediction.options).forEach(opt => opt.voters.delete(username));
        
        this.prediction.options[optionLabel].voters.add(username);
        this.updateVotes();
    }

    updateVotes() {
        let total = 0;
        Object.values(this.prediction.options).forEach(opt => total += opt.voters.size);
        this.prediction.totalVotes = total;
        this.renderOptions();
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.updateTimerUI();

        this.timerInterval = setInterval(() => {
            this.timer--;
            this.updateTimerUI();

            if (this.timer <= 0) {
                clearInterval(this.timerInterval);
                this.onTimerEnd();
            }
        }, 1000);
    }

    updateTimerUI() {
        const mins = Math.floor(this.timer / 60);
        const secs = this.timer % 60;
        this.timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} // REMAINING`;
        
        if (this.timer <= 10) {
            this.timerEl.style.color = '#ff0044';
        } else {
            this.timerEl.style.color = '#fbee09';
        }
    }

    onTimerEnd() {
        this.timerEl.textContent = "TIEMPO AGOTADO // ESPERANDO RESULTADO";
        // Aquí podríamos bloquear nuevos votos si quisiéramos
    }

    resolvePrediction(winnerLabel) {
        this.resolved = true;
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        // Guardar para poder consultarla luego con !preult
        this.lastResolvedPrediction = {
            question: this.prediction.question,
            options: JSON.parse(JSON.stringify(this.prediction.options)),
            totalVotes: this.prediction.totalVotes
        };
        this.lastWinner = winnerLabel;

        this.overlay.classList.add('resolved');
        this.timerEl.textContent = "PREDICCIÓN RESUELTA";
        
        this.renderOptions(winnerLabel);

        // Ocultar después de 15 segundos de mostrar el resultado
        setTimeout(() => {
            this.overlay.style.display = 'none';
            this.active = false;
        }, 15000);
    }

    renderAll() {
        this.questionEl.textContent = this.prediction.question;
        this.renderOptions();
    }

    renderOptions(winner = null) {
        this.optionsContainer.innerHTML = '';
        
        Object.entries(this.prediction.options).forEach(([label, data]) => {
            const count = data.voters.size;
            const percent = this.prediction.totalVotes > 0 
                ? Math.round((count / this.prediction.totalVotes) * 100) 
                : 0;

            const div = document.createElement('div');
            div.className = `option-item ${winner === label ? 'winner' : ''}`;
            
            div.innerHTML = `
                <div class="option-info">
                    <div class="option-text">!${label.toLowerCase()} ${data.text.toUpperCase()}</div>
                    <div class="option-percent">${percent}%</div>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar" style="width: ${percent}%"></div>
                </div>
                <div class="voters-list">
                    ${Array.from(data.voters).map(v => `<span class="voter-tag">${v}</span>`).join('')}
                </div>
            `;
            
            this.optionsContainer.appendChild(div);
        });
    }

    showHelp() {
        if (this.active) return; // No mostrar ayuda si hay una activa

        this.overlay.style.display = 'flex';
        this.questionEl.textContent = "CÓMO USAR PREDICCIONES";
        this.timerEl.textContent = "GUÍA RÁPIDA DE COMANDOS";
        this.timerEl.style.color = '#05d5fa';
        
        this.optionsContainer.innerHTML = `
            <div class="option-item">
                <div class="option-text" style="color: #fcee09">1. INICIAR PREDICCIÓN</div>
                <div style="font-family: var(--font-mono); font-size: 0.85em; margin-top: 5px; color: #fff;">
                    !pre 5 ¿Pasaré el Boss? a-Si b-No
                </div>
            </div>
            <div class="option-item">
                <div class="option-text" style="color: #fcee09">2. DAR GANADOR</div>
                <div style="font-family: var(--font-mono); font-size: 0.85em; margin-top: 5px; color: #fff;">
                    !acorrecta <span style="color: #666;">(o !bcorrecta)</span>
                </div>
            </div>
            <div class="option-item">
                <div class="option-text" style="color: #fcee09">3. VOTAR (Chat)</div>
                <div style="font-family: var(--font-mono); font-size: 0.85em; margin-top: 5px; color: #fff;">
                    !a <span style="color: #666;">o</span> !b <span style="color: #666;">o</span> !c...
                </div>
            </div>
        `;

        // Ocultar automáticamente tras 20 segundos
        if (this.helpTimeout) clearTimeout(this.helpTimeout);
        this.helpTimeout = setTimeout(() => {
            if (!this.active) {
                this.overlay.style.display = 'none';
            }
        }, 20000);
    }

    showLastResult() {
        if (this.active && !this.resolved) return; // No interrumpir una activa
        if (!this.lastResolvedPrediction) {
            console.warn('⚠️ No hay encuestas previas guardadas');
            return;
        }

        // Restaurar estado visual del último resultado
        this.active = true; // Forzamos true temporalmente para el render
        this.resolved = true;
        
        this.prediction = this.lastResolvedPrediction;
        this.renderAll();
        this.renderOptions(this.lastWinner);

        this.overlay.style.display = 'flex';
        this.timerEl.textContent = "RESULTADO DE LA ÚLTIMA ENCUESTA";
        this.timerEl.style.color = '#fcee09';

        // Ocultar tras 15 segundos
        if (this.resultTimeout) clearTimeout(this.resultTimeout);
        this.resultTimeout = setTimeout(() => {
            this.overlay.style.display = 'none';
            this.active = false;
        }, 15000);
    }
}

// Iniciar aplicación
window.addEventListener('DOMContentLoaded', () => {
    new PredictionApp();
});
