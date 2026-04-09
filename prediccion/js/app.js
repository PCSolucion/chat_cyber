import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js';
import { getFirestore, doc, updateDoc, increment, setDoc, onSnapshot, getDoc } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js';
import CONFIG from '../../js/config.js';

const PREDICTION_CONFIG = {
    channel: CONFIG.TWITCH_CHANNEL || '#liiukiin',
    broadcaster: CONFIG.BROADCASTER_USERNAME || 'liiukiin',
    allowedUsers: ['liiukiin', 'takeru_xiii'] // Usuarios con permisos de administración
};

class PredictionApp {
    constructor() {
        this.client = null;
        this.active = false;
        this.resolved = false;
        this.votingOpen = false; // Nuevo estado para controlar votos
        this.timer = 0;
        this.timerInterval = null;
        this.connected = false;
        
        // Initialize Firebase
        this.db = null;
        try {
            const app = initializeApp(CONFIG.FIREBASE);
            this.db = getFirestore(app);
            console.log('🔥 Firebase initialized in Prediction App');
        } catch (e) {
            console.error('❌ Error initializing Firebase:', e);
        }
        
        this.prediction = {
            question: '',
            options: {}, // { 'a': { text: '...', voters: Set() }, ... }
            totalVotes: 0
        };

        this.lastResolvedPrediction = null; // Para guardar la última finalizada
        this.lastWinner = null;

        this.overlay = document.getElementById('prediction-overlay');
        this.timerEl = document.getElementById('timer-text');
        this.questionEl = document.getElementById('question-text');
        this.optionsContainer = document.getElementById('options-list');

        this.syncing = false; // Flag to avoid loops
        this.lastResolvedId = null; // Track to avoid double XP award

        this.init();
    }

    async init() {
        console.log('🔮 Incializando Prediction Engine (Sync Mode)...');
        this.setupStateSync();
        this.connect();
    }

    setupStateSync() {
        if (!this.db) return;
        
        const stateRef = doc(this.db, 'system', 'current_prediction');
        onSnapshot(stateRef, (snapshot) => {
            const data = snapshot.data();
            if (!data) return;
            
            // Si hay una transición de !resolved a resolved, y no hemos procesado este XP
            if (data.resolved && data.lastId !== this.lastResolvedId) {
                console.log('🎯 Resolution detected from sync:', data.winner);
                this.lastResolvedId = data.lastId;
                this.applySyncedState(data);
                return;
            }

            // Sync general (votos, nueva predicción, etc)
            this.applySyncedState(data);
        });
    }

    applySyncedState(data) {
        if (!data.active) {
            if (this.active) this.resetPrediction(false); // Reset locally without clearing DB
            return;
        }

        // Convert Firestore data to local state
        const options = {};
        Object.entries(data.options).forEach(([label, optData]) => {
            options[label] = {
                text: optData.text,
                voters: new Set(optData.voters || [])
            };
        });

        // Detectar si es una nueva predicción o continuación
        const isNew = !this.active || this.prediction.question !== data.question;
        
        this.active = true;
        this.resolved = data.resolved;
        this.votingOpen = !data.resolved && (Date.now() < (data.startTime + data.duration * 1000));
        this.prediction = {
            question: data.question,
            options: options,
            totalVotes: data.totalVotes || 0
        };

        // Timer
        const elapsed = Math.floor((Date.now() - data.startTime) / 1000);
        this.timer = Math.max(0, data.duration - elapsed);

        if (this.resolved) {
            // Predicción ya resuelta: solo mostrar brevemente si es nueva en esta sesión
            this.timerEl.textContent = "PREDICCIÓN RESUELTA";
            this.overlay.classList.add('resolved');
            if (isNew && !this.resolutionConfirmed) {
                this.resolutionConfirmed = true;
                this.renderAll();
                this.renderOptions(data.winner);
                this.overlay.classList.add('show');
                this.overlay.classList.remove('hiding');
                this.scheduleHide(15000);
            }
            // Si ya fue confirmada en esta sesión (update de votos, etc.), no volver a mostrar
            return;
        }

        if (isNew) {
            this.renderAll();
            this.overlay.classList.add('show');
            this.overlay.classList.remove('hiding');
            if (this.timer > 0) {
                this.startTimer();
            } else {
                this.onTimerEnd();
            }
        } else {
            this.renderOptions(data.winner);
        }
    }

    async saveState(winner = null) {
        if (!this.db || this.syncing) return;
        
        const stateRef = doc(this.db, 'system', 'current_prediction');
        const optionsToSave = {};
        Object.entries(this.prediction.options).forEach(([label, data]) => {
            optionsToSave[label] = {
                text: data.text,
                voters: Array.from(data.voters)
            };
        });

        const statePayload = {
            active: this.active,
            resolved: this.resolved,
            question: this.prediction.question,
            startTime: this.startTime || Date.now(),
            duration: this.duration || 0,
            options: optionsToSave,
            totalVotes: this.prediction.totalVotes,
            winner: winner,
            lastId: this.resolved ? (this.lastResolvedId || Date.now()) : null
        };

        try {
            await setDoc(stateRef, statePayload);
        } catch (e) {
            console.error('❌ Error saving state:', e);
        }
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

        // Comando para resetear/cancelar predicción: !pre reset
        if (msgLower === '!pre reset' && isAdmin) {
            this.resetPrediction();
            return;
        }

        // Comando para limpiar/eliminar la predicción o encuesta actual: !pre clear / !poll clear
        if ((msgLower === '!pre clear' || msgLower === '!poll clear') && isAdmin) {
            console.log('🧹 Limpiando predicción/encuesta actual...');
            this.clearCurrent();
            return;
        }

        // Comando para iniciar predicción: !pre <minutos> <pregunta> a-N b-N...
        if (msgLower.startsWith('!pre ') && isAdmin) {
            if (this.active) {
                console.warn('⚠️ Ya hay una predicción activa. Usa !pre clear para eliminarla primero.');
                return;
            }
            console.log('📝 Intentando procesar !pre...');
            this.startPrediction(msg);
            return;
        }

        // Comandos para resolver: !acorrecta, !bcorrecta...
        if (msgLower.endsWith('correcta') && isAdmin && this.active) {
            const letter = msgLower.charAt(1);
            if (this.prediction.options[letter]) {
                this.resolvePrediction(letter);
            }
            return;
        }

        // Comandos para votar: !a !b !c...
        if (this.active && this.votingOpen && !this.resolved && msg.startsWith('!')) {
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
        this.votingOpen = true; // Abrir votaciones
        this.prediction = { question, options, totalVotes: 0 };
        this.timer = minutes * 60;
        this.startTime = Date.now();
        this.duration = this.timer;
        this.resolutionConfirmed = false;

        this.renderAll();
        this.startTimer();
        this.overlay.classList.remove('resolved');
        this.overlay.classList.add('show');

        // Persistir en Firestore
        this.saveState();
    }

    addVote(username, optionLabel) {
        // Un usuario solo puede tener un voto activo (cambiar si ya votó)
        let changed = false;
        Object.values(this.prediction.options).forEach(opt => {
            if (opt.voters.delete(username)) changed = true;
        });
        
        this.prediction.options[optionLabel].voters.add(username);
        this.updateVotes();
        this.saveState(); // Sync vote
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
        this.timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (this.timer <= 10) {
            this.timerEl.style.color = '#ff0044';
        } else {
            this.timerEl.style.color = '#05d5fa';
        }
    }

    onTimerEnd() {
        this.timerEl.textContent = "ESPERANDO RESULTADO";
        this.votingOpen = false; // Cerrar votaciones al terminar el tiempo

        // Ocultar automáticamente tras 30 segundos si no se ha resuelto
        if (this.resolutionHideTimeout) clearTimeout(this.resolutionHideTimeout);
        this.resolutionHideTimeout = setTimeout(() => {
            if (!this.resolved && this.active) {
                this.overlay.classList.add('hiding');
                this.overlay.classList.remove('show');
                setTimeout(() => {
                    this.overlay.classList.remove('hiding');
                }, 700);
            }
        }, 30000);
    }

    resolvePrediction(winnerLabel) {
        // Limpiar cualquier timeout de ocultación pendiente
        if (this.resolutionHideTimeout) clearTimeout(this.resolutionHideTimeout);
        
        this.resolved = true;
        this.votingOpen = false; 
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        // Guardar copia profunda para consultar luego (Evitar JSON.stringify por los Sets)
        const optionsCopy = {};
        Object.entries(this.prediction.options).forEach(([lbl, opt]) => {
            optionsCopy[lbl] = {
                text: opt.text,
                voters: new Set(opt.voters)
            };
        });

        this.lastResolvedPrediction = {
            question: this.prediction.question,
            options: optionsCopy,
            totalVotes: this.prediction.totalVotes
        };
        this.lastWinner = winnerLabel;

        // Asegurar que se vea el panel (por si se había ocultado tras los 30s)
        this.overlay.classList.remove('hiding');
        this.overlay.classList.add('show');
        this.overlay.classList.add('resolved');
        
        this.timerEl.textContent = "PREDICCIÓN RESUELTA";
        this.renderOptions(winnerLabel);

        // Persistir resolución antes de premiar
        this.lastResolvedId = Date.now();
        this.saveState(winnerLabel);

        // Award XP and Sync with Widget
        this.awardXPAndSync(winnerLabel);

        // Ocultar definitivamente después de 15 segundos
        this.scheduleHide(15000);
    }

    scheduleHide(ms) {
        if (this.fadeTimeout) clearTimeout(this.fadeTimeout);
        this.fadeTimeout = setTimeout(() => {
            this.overlay.classList.add('hiding');
            this.overlay.classList.remove('show');
            setTimeout(() => {
                this.overlay.classList.remove('hiding');
                this.overlay.classList.remove('resolved');
                // No apagamos 'active' para permitir que se siga viendo si se refresca antes de una nueva
                // Pero sí liberamos para que se pueda crear otra
                this.active = false;
                // Importante: No borramos Firestore aquí para mantener el historial si se refresca
            }, 700);
        }, ms);
    }

    async resetPrediction(clearDB = true) {
        console.log('🔄 Resetting prediction...');
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.helpTimeout) clearTimeout(this.helpTimeout);
        if (this.resultTimeout) clearTimeout(this.resultTimeout);
        if (this.resolutionHideTimeout) clearTimeout(this.resolutionHideTimeout);
        if (this.fadeTimeout) clearTimeout(this.fadeTimeout);

        this.active = false;
        this.resolved = false;
        this.votingOpen = false;
        this.resolutionConfirmed = false;

        this.overlay.classList.add('hiding');
        this.overlay.classList.remove('show');
        
        if (clearDB && this.db) {
            const stateRef = doc(this.db, 'system', 'current_prediction');
            await setDoc(stateRef, { active: false });
        }

        setTimeout(() => {
            this.overlay.classList.remove('hiding');
            this.overlay.classList.remove('resolved');
            this.prediction = { question: '', options: {}, totalVotes: 0 };
            this.renderAll();
        }, 700);
    }

    async clearCurrent() {
        console.log('🧹 Eliminando predicción/encuesta actual...');
        // Cancelar todos los timers activos
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (this.helpTimeout) clearTimeout(this.helpTimeout);
        if (this.resultTimeout) clearTimeout(this.resultTimeout);
        if (this.resolutionHideTimeout) clearTimeout(this.resolutionHideTimeout);
        if (this.fadeTimeout) clearTimeout(this.fadeTimeout);

        // Resetear estado local completamente
        this.active = false;
        this.resolved = false;
        this.votingOpen = false;
        this.resolutionConfirmed = false;
        this.prediction = { question: '', options: {}, totalVotes: 0 };
        this.lastResolvedPrediction = null;
        this.lastWinner = null;

        // Ocultar overlay con animación
        this.overlay.classList.add('hiding');
        this.overlay.classList.remove('show');

        // Limpiar Firestore para que ninguna otra instancia vuelva a mostrar la predicción antigua
        if (this.db) {
            const stateRef = doc(this.db, 'system', 'current_prediction');
            await setDoc(stateRef, { active: false });
        }

        setTimeout(() => {
            this.overlay.classList.remove('hiding');
            this.overlay.classList.remove('resolved');
            this.renderAll();
            console.log('✅ Predicción/encuesta eliminada correctamente.');
        }, 700);
    }

    renderAll() {
        this.questionEl.textContent = this.prediction.question;
        this.renderOptions();
    }

    renderOptions(winner = null) {
        this.optionsContainer.innerHTML = '';
        
        // Ordenar opciones alfabéticamente (a, b, c...)
        const sortedOptions = Object.entries(this.prediction.options).sort((a, b) => a[0].localeCompare(b[0]));

        sortedOptions.forEach(([label, data]) => {
            const count = data.voters.size;
            const percent = this.prediction.totalVotes > 0 
                ? Math.round((count / this.prediction.totalVotes) * 100) 
                : 0;

            const div = document.createElement('div');
            div.className = `option-item ${winner === label ? 'winner' : ''}`;
            
            div.innerHTML = `
                <div class="option-info">
                    <div class="option-command">
                        <span class="cmd-badge">!${label.toLowerCase()}</span>
                        <span class="option-text">${data.text.toUpperCase()}</span>
                    </div>
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
        // Permitir ayuda si no hay una predicción REALMENTE activa y visible en pantalla
        if (this.active && this.overlay.classList.contains('show') && !this.resolved) return; 

        this.overlay.classList.remove('hiding');
        this.overlay.classList.remove('resolved');
        this.overlay.classList.add('show');
        this.questionEl.textContent = "CÓMO USAR PREDICCIONES";
        this.timerEl.textContent = "HELPER_MODE";
        this.timerEl.style.color = '#05d5fa';
        this.timerEl.style.textShadow = 'var(--glow-cyan)';
        
        this.optionsContainer.innerHTML = `
            <div class="option-item">
                <div class="option-text" style="color: #fcee09">1. INICIAR PREDICCIÓN</div>
                <div style="font-family: var(--font-mono); font-size: 0.85em; margin-top: 5px; color: #fff;">
                    !pre 5 ¿Pasaré el Boss? a-Si b-No
                </div>
            </div>
            <div class="option-item">
                <div class="option-text" style="color: #fcee09">2. DAR GANADOR / RESET</div>
                <div style="font-family: var(--font-mono); font-size: 0.85em; margin-top: 5px; color: #fff;">
                    !acorrecta <span style="color: #666;">(ganador)</span> / !pre reset <span style="color: #666;">(cancelar)</span>
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
                this.overlay.classList.add('hiding');
                this.overlay.classList.remove('show');
                setTimeout(() => {
                    this.overlay.classList.remove('hiding');
                }, 700);
            }
        }, 20000);
    }

    async showLastResult() {
        if (this.active && !this.resolved && this.overlay.classList.contains('show')) return; 

        // Si no hay resultado local, intentar buscar el último evento de sistema en Firestore
        if (!this.lastResolvedPrediction) {
            console.log('🔍 Buscando último resultado en base de datos...');
            const eventRef = doc(this.db, 'system', 'last_prediction_result');
            try {
                const docSnap = await getDoc(eventRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    
                    // Reconstruir estructura de opciones con Sets para los votantes
                    const options = {};
                    let totalVotes = 0;
                    
                    if (data.options) {
                        Object.entries(data.options).forEach(([label, optData]) => {
                            const votersArray = optData.voters || [];
                            totalVotes += votersArray.length;
                            options[label] = {
                                text: optData.text,
                                voters: new Set(votersArray)
                            };
                        });
                    }

                    this.lastResolvedPrediction = {
                        question: data.question,
                        options: options,
                        totalVotes: totalVotes
                    };
                    this.lastWinner = data.winner;
                } else {
                    console.warn('⚠️ No hay encuestas previas en la DB');
                    return;
                }
            } catch (e) {
                console.error('❌ Error cargando historial:', e);
                return;
            }
        }

        // Restaurar estado visual del último resultado
        this.active = true; // Forzamos true temporalmente para el render
        this.resolved = true;
        
        this.prediction = this.lastResolvedPrediction;
        this.renderAll();
        this.renderOptions(this.lastWinner);

        this.overlay.classList.add('show');
        this.timerEl.textContent = "HISTORIAL";
        this.timerEl.style.color = '#fcee09';
        this.timerEl.style.textShadow = '3px 3px 0px #000';

        // Ocultar tras 15 segundos
        if (this.resultTimeout) clearTimeout(this.resultTimeout);
        this.resultTimeout = setTimeout(() => {
            this.overlay.classList.add('hiding');
            this.overlay.classList.remove('show');
            setTimeout(() => {
                this.overlay.classList.remove('hiding');
                this.active = false;
            }, 700);
        }, 15000);
    }

    awardXPAndSync(winnerLabel) {
        if (!this.db) {
            console.error('❌ Firestore not initialized in PredictionApp');
            return;
        }

        console.log(`🎁 Awarding XP for option: ${winnerLabel}`);
        const winners = this.prediction.options[winnerLabel]?.voters || new Set();
        console.log(`👥 Total winners: ${winners.size}`);
        const allParticipants = new Set();
        Object.values(this.prediction.options).forEach(opt => {
            opt.voters.forEach(v => {
                console.log(`👤 Participant: ${v}`);
                allParticipants.add(v);
            });
        });

        console.log(`📈 All participants: ${allParticipants.size}`);
        const usersToSync = [];

        allParticipants.forEach(username => {
            const isWinner = winners.has(username);
            const xpToAdd = isWinner ? 200 : 30;
            
            // Actualizar Firestore
            const key = username.toLowerCase();
            const ref = doc(this.db, 'users', key);
            
            updateDoc(ref, {
                xp: increment(xpToAdd),
                'stats.prediction_wins': isWinner ? increment(1) : increment(0),
                'stats.prediction_participations': increment(1)
            }).catch(e => {
                if (e.code === 'not-found') {
                    // Si el usuario no existe, lo creamos
                    setDoc(ref, {
                        displayName: username,
                        xp: xpToAdd,
                        level: 1,
                        stats: {
                            messages: 0,
                            watchTime: 0,
                            prediction_wins: isWinner ? 1 : 0,
                            prediction_participations: 1
                        }
                    }, { merge: true });
                }
            });

            usersToSync.push({
                username,
                xp: xpToAdd,
                isWinner
            });
        });

        // Guardar estado completo para historial persistente
        const optionsToSave = {};
        Object.entries(this.prediction.options).forEach(([label, data]) => {
            optionsToSave[label] = {
                text: data.text,
                voters: Array.from(data.voters)
            };
        });

        // Notificar al widget principal y guardar historial
        const eventRef = doc(this.db, 'system', 'last_prediction_result');
        setDoc(eventRef, {
            timestamp: Date.now(),
            question: this.prediction.question,
            results: usersToSync,
            options: optionsToSave,
            winner: winnerLabel
        }).then(() => {
            console.log('✅ Prediction results synced to Firestore');
        }).catch(err => {
            console.error('❌ Error syncing prediction results:', err);
        });
    }
}

// Iniciar aplicación
window.addEventListener('DOMContentLoaded', () => {
    new PredictionApp();
});
