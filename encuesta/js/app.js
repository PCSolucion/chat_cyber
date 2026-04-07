import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-app.js';
import { getFirestore, doc, updateDoc, increment, setDoc, onSnapshot, getDoc } from 'https://www.gstatic.com/firebasejs/11.3.0/firebase-firestore.js';
import CONFIG from '../../js/config.js';

const POLL_CONFIG = {
    channel: CONFIG.TWITCH_CHANNEL || '#liiukiin',
    allowedUsers: ['liiukiin', 'takeru_xiii'] // Administradores
};

class PollApp {
    constructor() {
        this.client = null;
        this.active = false;
        this.resolved = false;
        this.votingOpen = false;
        this.timer = 0;
        this.timerInterval = null;
        this.db = null;
        
        try {
            const app = initializeApp(CONFIG.FIREBASE);
            this.db = getFirestore(app);
            console.log('🔥 Firebase initialized in Poll App');
        } catch (e) {
            console.error('❌ Error initializing Firebase:', e);
        }
        
        this.poll = {
            question: '',
            options: {}, // { '1': { text: '...', voters: Set() }, ... }
            totalVotes: 0
        };

        this.overlay = document.getElementById('poll-overlay');
        this.timerEl = document.getElementById('timer-text');
        this.questionEl = document.getElementById('question-text');
        this.optionsContainer = document.getElementById('options-list');

        this.init();
    }

    async init() {
        console.log('📊 Inicializando Poll Engine...');
        this.setupStateSync();
        this.connect();
    }

    setupStateSync() {
        if (!this.db) return;
        const stateRef = doc(this.db, 'system', 'current_poll');
        onSnapshot(stateRef, (snapshot) => {
            const data = snapshot.data();
            if (!data) return;
            this.applySyncedState(data);
        });
    }

    applySyncedState(data) {
        if (!data.active) {
            if (this.active) this.resetPoll(false);
            return;
        }

        const options = {};
        Object.entries(data.options).forEach(([label, optData]) => {
            options[label] = {
                text: optData.text,
                voters: new Set(optData.voters || [])
            };
        });

        const isNew = !this.active || this.poll.question !== data.question;
        
        this.active = true;
        this.resolved = data.resolved;
        const now = Date.now();
        this.votingOpen = !data.resolved && (now < (data.startTime + data.duration * 1000));
        
        this.poll = {
            question: data.question,
            options: options,
            totalVotes: data.totalVotes || 0
        };

        const elapsed = Math.floor((now - data.startTime) / 1000);
        this.timer = Math.max(0, data.duration - elapsed);

        if (isNew) {
            this.renderAll();
            this.overlay.classList.add('show');
            this.overlay.classList.remove('hiding');
            if (this.timer > 0 && !this.resolved) {
                this.startTimer();
            } else if (!this.resolved) {
                this.onTimerEnd();
            }
        } else {
            this.renderOptions();
        }

        if (this.resolved) {
            this.stopTimer();
            this.timerEl.textContent = "ENCUESTA FINALIZADA";
            this.overlay.classList.add('resolved');
            this.overlay.classList.add('show');
            if (!this.resolutionConfirmed) {
                this.resolutionConfirmed = true;
                this.scheduleHide(120000); // 2 minutos como pidió el usuario
            }
        }
    }

    async saveState() {
        if (!this.db) return;
        const stateRef = doc(this.db, 'system', 'current_poll');
        const optionsToSave = {};
        Object.entries(this.poll.options).forEach(([label, data]) => {
            optionsToSave[label] = {
                text: data.text,
                voters: Array.from(data.voters)
            };
        });

        const statePayload = {
            active: this.active,
            resolved: this.resolved,
            question: this.poll.question,
            startTime: this.startTime || Date.now(),
            duration: this.duration || 0,
            options: optionsToSave,
            totalVotes: this.poll.totalVotes
        };

        try {
            await setDoc(stateRef, statePayload);
        } catch (e) {
            console.error('❌ Error saving poll state:', e);
        }
    }

    connect() {
        this.client = new tmi.Client({
            connection: { reconnect: true, secure: true },
            channels: [POLL_CONFIG.channel]
        });

        this.client.connect().then(() => {
            console.log('✅ Poll connected to Twitch');
        }).catch(err => console.error('❌ Poll connection error:', err));

        this.client.on('message', (channel, tags, message, self) => {
            if (self) return;
            this.handleMessage(tags, message);
        });
    }

    handleMessage(tags, message) {
        const username = tags.username?.toLowerCase();
        const isAdmin = POLL_CONFIG.allowedUsers.includes(username);
        const msg = message.trim();
        const msgLower = msg.toLowerCase();

        // Admin: !poll <minutos> <pregunta> a-N b-N...
        if (msgLower.startsWith('!poll ') && isAdmin) {
            console.log('📝 Intentando procesar !poll...');
            this.startPollFromChat(msg);
            return;
        }

        // Admin: !poll end
        if (msgLower === '!poll end' && isAdmin && this.active && !this.resolved) {
            this.resolvePoll();
            return;
        }

        // Admin: !poll reset
        if (msgLower === '!poll reset' && isAdmin) {
            this.resetPoll();
            return;
        }

        // Votar: !a !b !c...
        if (this.active && this.votingOpen && !this.resolved && msg.startsWith('!')) {
            const vote = msg.substring(1).toLowerCase();
            if (this.poll.options[vote]) {
                this.addVote(tags['display-name'] || tags.username, vote);
            }
        }
    }

    startPollFromChat(fullMessage) {
        // Regex idéntico al de predicción
        const mainRegex = /^!poll\s+(\d+)\s+(.+?)\s+([a-z]-.+)$/i;
        const match = fullMessage.match(mainRegex);

        if (!match) {
            console.error('❌ Formato inválido para !poll. Ejemplo: !poll 2 ¿Pregunta? a-Op1 b-Op2');
            return;
        }

        const minutes = parseInt(match[1]);
        const question = match[2];
        const optionsStr = match[3];

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

        this.active = true;
        this.resolved = false;
        this.votingOpen = true;
        this.poll = { question, options, totalVotes: 0 };
        this.timer = minutes * 60;
        this.startTime = Date.now();
        this.duration = this.timer;
        this.resolutionConfirmed = false;

        this.renderAll();
        this.startTimer();
        this.overlay.classList.remove('resolved');
        this.overlay.classList.add('show');
        this.saveState();
    }

    addVote(username, optionLabel) {
        let changed = false;
        Object.values(this.poll.options).forEach(opt => {
            if (opt.voters.delete(username)) changed = true;
        });
        
        this.poll.options[optionLabel].voters.add(username);
        this.updateVotes();
        this.saveState();
    }

    updateVotes() {
        let total = 0;
        Object.values(this.poll.options).forEach(opt => total += opt.voters.size);
        this.poll.totalVotes = total;
        this.renderOptions();
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.updateTimerUI();
        this.timerInterval = setInterval(() => {
            this.timer--;
            this.updateTimerUI();
            if (this.timer <= 0) {
                this.stopTimer();
                this.onTimerEnd();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
    }

    updateTimerUI() {
        const mins = Math.floor(this.timer / 60);
        const secs = this.timer % 60;
        this.timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    onTimerEnd() {
        this.votingOpen = false;
        this.resolvePoll();
    }

    resolvePoll() {
        this.resolved = true;
        this.votingOpen = false; 
        this.stopTimer();
        
        this.overlay.classList.remove('hiding');
        this.overlay.classList.add('show');
        this.overlay.classList.add('resolved');
        this.timerEl.textContent = "ENCUESTA FINALIZADA";
        
        this.renderOptions();
        this.saveState();
        this.awardXP();
        this.scheduleHide(120000); // Muestra por 2 minutos
    }

    awardXP() {
        if (!this.db) return;
        const allParticipants = new Set();
        Object.values(this.poll.options).forEach(opt => {
            opt.voters.forEach(v => allParticipants.add(v.toLowerCase()));
        });

        console.log(`🎁 Entregando 250 XP a ${allParticipants.size} participantes`);
        
        allParticipants.forEach(username => {
            const ref = doc(this.db, 'users', username);
            updateDoc(ref, {
                xp: increment(250)
            }).catch(e => {
                if (e.code === 'not-found') {
                    setDoc(ref, {
                        displayName: username,
                        xp: 250,
                        level: 1,
                        stats: { messages: 0, watchTime: 0 }
                    }, { merge: true });
                }
            });
        });
    }

    scheduleHide(ms) {
        if (this.fadeTimeout) clearTimeout(this.fadeTimeout);
        this.fadeTimeout = setTimeout(() => {
            this.overlay.classList.add('hiding');
            this.overlay.classList.remove('show');
            setTimeout(() => {
                this.overlay.classList.remove('hiding');
                this.overlay.classList.remove('resolved');
                this.active = false;
            }, 700);
        }, ms);
    }

    async resetPoll(clearDB = true) {
        this.stopTimer();
        if (this.fadeTimeout) clearTimeout(this.fadeTimeout);
        this.active = false;
        this.resolved = false;
        this.votingOpen = false;
        this.overlay.classList.add('hiding');
        this.overlay.classList.remove('show');
        
        if (clearDB && this.db) {
            const stateRef = doc(this.db, 'system', 'current_poll');
            await setDoc(stateRef, { active: false });
        }

        setTimeout(() => {
            this.overlay.classList.remove('hiding');
            this.overlay.classList.remove('resolved');
            this.poll = { question: '', options: {}, totalVotes: 0 };
            this.renderAll();
        }, 700);
    }

    renderAll() {
        this.questionEl.textContent = this.poll.question;
        this.renderOptions();
    }

    renderOptions() {
        this.optionsContainer.innerHTML = '';
        const sortedOptions = Object.entries(this.poll.options).sort((a, b) => a[0].localeCompare(b[0]));

        sortedOptions.forEach(([label, data]) => {
            const count = data.voters.size;
            const percent = this.poll.totalVotes > 0 
                ? Math.round((count / this.poll.totalVotes) * 100) 
                : 0;

            const div = document.createElement('div');
            div.className = 'option-item';
            div.innerHTML = `
                <div class="option-info">
                    <div class="option-command">
                        <span class="cmd-badge">!${label}</span>
                        <span class="option-text">${data.text.toUpperCase()}</span>
                    </div>
                    <div class="option-percent">${percent}%</div>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar" style="width: ${percent}%"></div>
                </div>
            `;
            this.optionsContainer.appendChild(div);
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new PollApp();
});
