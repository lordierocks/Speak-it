/**
 * Speak It - Voice Typing Application
 * Simplified version with auto-save and voice commands
 */

import { AudioProcessor } from './audio-processor.js';
import { SpeechRecognitionManager } from './speech-recognition.js';
import { SessionManager } from './session-manager.js';

class SpeakItApp {
    constructor() {
        // Core modules
        this.audioProcessor = new AudioProcessor();
        this.speechRecognition = new SpeechRecognitionManager();
        this.sessionManager = new SessionManager();

        // UI state
        this.state = 'idle'; // idle, listening, paused, viewing
        this.currentMicrophoneId = null;
        this.availableDevices = [];
        this.lastPauseTranscript = ''; // For cancel functionality
        this.currentEditingSessionId = null; // For three-dot menu
        this.isTranscribing = false; // Track if currently transcribing a line
        this.hasEverPaused = false; // Track if session has been paused

        // Fun listening messages
        this.listeningMessages = [
            "Listening intently...",
            "All ears here!",
            "Catching every word...",
            "Writing it down...",
            "Taking notes...",
            "Got my pen ready...",
            "Scribbling away...",
            "Words are flowing...",
            "On it like a hawk...",
            "Absorbing every syllable...",
            "Your words, my canvas...",
            "Painting with your words...",
            "Weaving your thoughts...",
            "Tuning in...",
            "Recording your genius...",
            "Channeling your voice...",
            "Ears wide open...",
            "Not missing a beat...",
            "Capturing the magic..."
        ];
        this.currentMessageIndex = 0;
        this.messageInterval = null;

        // DOM elements
        this.elements = {};

        // Initialize
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        this.cacheElements();
        this.setupEventListeners();

        // Initialize audio processor
        const audioResult = await this.audioProcessor.initialize();
        if (!audioResult.success) {
            this.showError('Failed to access microphone. Please check permissions.');
            this.updateMicStatus('are you on mute?');
            return;
        }

        // Populate microphone list
        if (audioResult.devices && audioResult.devices.length > 0) {
            this.availableDevices = audioResult.devices;
            this.populateMicrophoneSubmenu(audioResult.devices);
        }

        // Initialize speech recognition
        if (!SpeechRecognitionManager.isSupported()) {
            this.showError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        const speechResult = this.speechRecognition.initialize();
        if (!speechResult.success) {
            this.showError(speechResult.error);
            return;
        }

        this.setupSpeechCallbacks();
        this.setupAudioCallbacks();
        this.loadSessionsList();

        console.log('Speak It initialized successfully!');
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            sidebar: document.getElementById('sidebar'),
            sidebarToggle: document.getElementById('sidebarToggle'),
            mainContent: document.getElementById('mainContent'),
            motto: document.getElementById('motto'),
            mainBox: document.getElementById('mainBox'),
            centralMicBtn: document.getElementById('centralMicBtn'),
            copyBtn: document.getElementById('copyBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            cancelBtn: document.getElementById('cancelBtn'),
            newSessionBtn: document.getElementById('newSessionBtn'),
            recordingStatus: document.getElementById('recordingStatus'),
            micStatus: document.getElementById('micStatus'),
            soundLevelBar: document.getElementById('soundLevelBar'),
            transcriptionDisplay: document.getElementById('transcriptionDisplay'),
            transcriptionText: document.getElementById('transcriptionText'),
            sessionsList: document.getElementById('sessionsList'),
            settingsPopup: document.getElementById('settingsPopup'),
            sessionOptionsPopup: document.getElementById('sessionOptionsPopup'),
            microphoneSubmenu: document.getElementById('microphoneSubmenu'),
            microphoneMenuItem: document.getElementById('microphoneMenuItem'),
            vadSensitivity: document.getElementById('vadSensitivity'),
            silenceTimeout: document.getElementById('silenceTimeout'),
            silenceTimeoutValue: document.getElementById('silenceTimeoutValue'),
            editTitleBtn: document.getElementById('editTitleBtn'),
            downloadTextBtn: document.getElementById('downloadTextBtn'),
            deleteSessionBtn: document.getElementById('deleteSessionBtn'),
            editTitleModal: document.getElementById('editTitleModal'),
            editSessionName: document.getElementById('editSessionName'),
            confirmEditTitleBtn: document.getElementById('confirmEditTitleBtn'),
            cancelEditTitleBtn: document.getElementById('cancelEditTitleBtn'),
            closeEditTitleBtn: document.getElementById('closeEditTitleBtn'),
            confirmModal: document.getElementById('confirmModal'),
            confirmTitle: document.getElementById('confirmTitle'),
            confirmMessage: document.getElementById('confirmMessage'),
            confirmActionBtn: document.getElementById('confirmActionBtn'),
            cancelConfirmBtn: document.getElementById('cancelConfirmBtn')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.elements.sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        this.elements.centralMicBtn.addEventListener('click', () => this.handleCentralMicClick());
        this.elements.copyBtn.addEventListener('click', () => this.copyToClipboard());
        this.elements.cancelBtn.addEventListener('click', () => this.handleCancel());
        this.elements.newSessionBtn.addEventListener('click', () => this.handleNewSession());

        // Settings
        this.elements.settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePopup(this.elements.settingsPopup, this.elements.settingsBtn);
        });

        this.elements.vadSensitivity.addEventListener('input', (e) => {
            this.audioProcessor.setVADSensitivity(e.target.value);
        });

        this.elements.silenceTimeout.addEventListener('input', (e) => {
            this.elements.silenceTimeoutValue.textContent = parseFloat(e.target.value).toFixed(1);
            this.audioProcessor.setSilenceTimeout(parseFloat(e.target.value));
        });

        // Microphone submenu
        this.elements.microphoneMenuItem.addEventListener('mouseenter', () => {
            this.showSubmenu(this.elements.microphoneSubmenu, this.elements.microphoneMenuItem);
        });

        this.elements.microphoneMenuItem.addEventListener('mouseleave', () => {
            setTimeout(() => {
                if (!this.elements.microphoneSubmenu.matches(':hover') &&
                    !this.elements.microphoneMenuItem.matches(':hover')) {
                    this.hideSubmenu();
                }
            }, 200);
        });

        this.elements.microphoneSubmenu.addEventListener('mouseleave', () => {
            setTimeout(() => {
                if (!this.elements.microphoneMenuItem.matches(':hover')) {
                    this.hideSubmenu();
                }
            }, 200);
        });

        // Session options
        this.elements.editTitleBtn.addEventListener('click', () => this.openEditTitle());
        this.elements.downloadTextBtn.addEventListener('click', () => this.downloadText());
        this.elements.deleteSessionBtn.addEventListener('click', () => this.deleteSession());

        // Edit title modal
        this.elements.confirmEditTitleBtn.addEventListener('click', () => this.confirmEditTitle());
        this.elements.cancelEditTitleBtn.addEventListener('click', () => this.closeEditTitle());
        this.elements.closeEditTitleBtn.addEventListener('click', () => this.closeEditTitle());

        // Confirm modal
        this.elements.cancelConfirmBtn.addEventListener('click', () => this.closeConfirm());

        // Close popups on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.popup-menu') && !e.target.closest('.icon-btn') && !e.target.closest('.session-options-btn')) {
                this.closeAllPopups();
            }
        });

        // Close modals on outside click
        [this.elements.editTitleModal, this.elements.confirmModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('open');
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllPopups();
                this.closeAllModals();
            }
        });
    }

    /**
     * Setup speech recognition callbacks
     */
    setupSpeechCallbacks() {
        this.speechRecognition.onResult = (transcript, fullTranscript) => {
            // Check for voice command "copy to clipboard"
            if (this.detectCopyCommand(fullTranscript)) {
                return; // Command handled, don't update transcription
            }

            this.isTranscribing = false;
            this.updateTranscription(fullTranscript);
            this.autoSave(); // Auto-save after each completed line
        };

        this.speechRecognition.onInterimResult = (interim) => {
            this.isTranscribing = true;
            const full = this.speechRecognition.getTranscript().combined;
            this.updateTranscription(full, true); // true = interim (don't make editable yet)
        };

        this.speechRecognition.onError = (error) => {
            console.error('Speech recognition error:', error);
        };
    }

    /**
     * Detect "copy to clipboard" voice command
     */
    detectCopyCommand(transcript) {
        const lowerTranscript = transcript.toLowerCase();
        const copyPhrases = ['copy to clipboard', 'copy clipboard', 'copy that'];

        for (const phrase of copyPhrases) {
            const index = lowerTranscript.lastIndexOf(phrase);
            if (index !== -1) {
                // Extract text before the command
                const textToCopy = transcript.substring(0, index).trim();

                if (textToCopy) {
                    // Copy to clipboard
                    this.copyTextToClipboard(textToCopy);

                    // Update transcript to remove the command
                    this.speechRecognition.clearTranscript();
                    this.updateTranscription(textToCopy);
                    this.autoSave();

                    // Show feedback
                    const originalText = this.elements.copyBtn.querySelector('span').textContent;
                    this.elements.copyBtn.querySelector('span').textContent = 'Copied!';
                    setTimeout(() => {
                        this.elements.copyBtn.querySelector('span').textContent = originalText;
                    }, 2000);

                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Setup audio processor callbacks
     */
    setupAudioCallbacks() {
        this.audioProcessor.onAudioLevel = (level) => {
            this.updateSoundLevel(level);
        };
    }

    /**
     * Handle central mic button click
     */
    handleCentralMicClick() {
        if (this.state === 'idle' || this.state === 'viewing') {
            // If viewing, start a new session first
            if (this.state === 'viewing') {
                this.handleNewSession();
            }
            this.startRecording();
        } else if (this.state === 'listening') {
            this.pauseRecording();
        } else if (this.state === 'paused') {
            this.resumeRecording();
        }
    }

    /**
     * Start recording
     */
    async startRecording() {
        try {
            // Auto-create session with date/time name
            const now = new Date();
            const defaultName = now.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).replace(/[/,:]/g, '-').replace(/ /g, '_');

            const session = this.sessionManager.createSession();
            session.name = defaultName;
            this.sessionManager.saveSession(session.name, '', null); // Save immediately
            this.loadSessionsList();

            // Hide motto
            this.elements.motto.classList.add('hidden');

            // Start audio recording
            this.audioProcessor.startRecording();

            // Start speech recognition (always real-time now)
            this.speechRecognition.start();

            // Update UI
            this.state = 'listening';
            this.updateUI();
            this.elements.mainBox.classList.add('recording');
            this.elements.transcriptionDisplay.classList.add('visible');
            this.elements.cancelBtn.classList.add('visible');

            this.startListeningMessages();
            this.lastPauseTranscript = ''; // Reset cancel checkpoint
            this.hasEverPaused = false; // Reset pause flag for new recording

        } catch (error) {
            console.error('Error starting recording:', error);
            this.showError('Failed to start recording: ' + error.message);
            this.resetUI();
        }
    }

    /**
     * Pause recording
     */
    pauseRecording() {
        this.audioProcessor.pauseRecording();
        this.speechRecognition.stop();

        // Save on pause
        this.lastPauseTranscript = this.elements.transcriptionText.textContent;
        this.hasEverPaused = true;
        this.autoSave();

        this.state = 'paused';
        this.updateUI();
        this.stopListeningMessages();
    }

    /**
     * Resume recording
     */
    resumeRecording() {
        this.audioProcessor.resumeRecording();
        this.speechRecognition.start();

        this.state = 'listening';
        this.updateUI();
        this.startListeningMessages();
    }

    /**
     * Handle cancel button
     */
    handleCancel() {
        // Stop recording first
        this.stopRecordingCompletely();

        if (this.hasEverPaused) {
            // Has been paused before - revert to last pause and resume
            this.updateTranscription(this.lastPauseTranscript);
            this.autoSave();
            // Don't resume, just go back to paused state
            this.state = 'paused';
            this.updateUI();
        } else {
            // Never paused - delete the entire note
            const activeSession = this.sessionManager.getActiveSession();
            if (activeSession) {
                this.sessionManager.deleteSession(activeSession.id);
                this.loadSessionsList();
            }
            this.resetUI();
        }
    }

    /**
     * Stop recording completely (audio + speech)
     */
    stopRecordingCompletely() {
        // Stop audio processor
        if (this.audioProcessor.isRecording) {
            this.audioProcessor.pauseRecording();
        }

        // Stop speech recognition
        if (this.speechRecognition.isListening) {
            this.speechRecognition.stop();
        }

        // Stop listening messages
        this.stopListeningMessages();
    }

    /**
     * Auto-save current session
     */
    autoSave() {
        const activeSession = this.sessionManager.getActiveSession();
        if (activeSession) {
            const transcript = this.elements.transcriptionText.textContent;
            this.sessionManager.updateTranscript(transcript);
        }
    }

    /**
     * Handle new session button
     */
    handleNewSession() {
        // Stop any active recording first
        this.stopRecordingCompletely();

        // Delete current session if it's empty
        const activeSession = this.sessionManager.getActiveSession();
        if (activeSession && !activeSession.transcript.trim()) {
            this.sessionManager.deleteSession(activeSession.id);
            this.loadSessionsList();
        }

        // Reset UI
        this.resetUI();

        // Close sidebar on mobile
        if (window.innerWidth < 768) {
            this.elements.sidebar.classList.remove('open');
            this.elements.mainContent.classList.remove('sidebar-open');
        }
    }

    /**
     * Load session from list
     */
    loadSession(sessionId) {
        // Stop any active recording first
        this.stopRecordingCompletely();

        // Delete current session if it's empty
        const currentSession = this.sessionManager.getActiveSession();
        if (currentSession && !currentSession.transcript.trim() && currentSession.id !== sessionId) {
            this.sessionManager.deleteSession(currentSession.id);
        }

        // Load the new session
        const result = this.sessionManager.loadSession(sessionId);

        if (result.success) {
            this.elements.transcriptionText.textContent = result.session.transcript;
            this.elements.transcriptionDisplay.classList.add('visible');
            this.elements.motto.classList.add('hidden');
            this.elements.mainBox.classList.remove('recording');
            this.elements.cancelBtn.classList.remove('visible');

            // Set to viewing state (not idle, not recording)
            this.state = 'viewing';
            this.updateUI();

            this.loadSessionsList();
        }
    }

    /**
     * Update UI based on state
     */
    updateUI() {
        const { centralMicBtn, recordingStatus } = this.elements;

        switch (this.state) {
            case 'idle':
                centralMicBtn.classList.remove('recording', 'paused');
                recordingStatus.textContent = 'Ready to start';
                break;

            case 'listening':
                centralMicBtn.classList.add('recording');
                centralMicBtn.classList.remove('paused');
                recordingStatus.textContent = 'Listening...';
                break;

            case 'paused':
                centralMicBtn.classList.add('paused');
                centralMicBtn.classList.remove('recording');
                recordingStatus.textContent = 'Paused';
                break;

            case 'viewing':
                centralMicBtn.classList.remove('recording', 'paused');
                recordingStatus.textContent = 'Saved session';
                break;
        }
    }

    /**
     * Reset UI to initial state
     */
    resetUI() {
        this.state = 'idle';
        this.elements.motto.classList.remove('hidden');
        this.elements.mainBox.classList.remove('recording');
        this.elements.transcriptionDisplay.classList.remove('visible');
        this.elements.transcriptionText.textContent = '';
        this.elements.cancelBtn.classList.remove('visible');
        this.speechRecognition.clearTranscript();
        this.lastPauseTranscript = '';
        this.hasEverPaused = false;
        this.updateUI();
    }

    /**
     * Update transcription text
     */
    updateTranscription(text, isInterim = false) {
        this.elements.transcriptionText.textContent = text;

        // Auto-scroll to bottom
        this.elements.transcriptionDisplay.scrollTop = this.elements.transcriptionDisplay.scrollHeight;

        // Make contenteditable attribute dynamic based on whether transcribing
        if (isInterim) {
            this.elements.transcriptionText.setAttribute('contenteditable', 'false');
        } else {
            this.elements.transcriptionText.setAttribute('contenteditable', 'true');
        }
    }

    /**
     * Update sound level bar
     */
    updateSoundLevel(level) {
        this.elements.soundLevelBar.style.width = `${level}%`;
    }

    /**
     * Update microphone status
     */
    updateMicStatus(status) {
        this.elements.micStatus.textContent = status;
    }

    /**
     * Start cycling listening messages
     */
    startListeningMessages() {
        this.stopListeningMessages();
        this.messageInterval = setInterval(() => {
            this.currentMessageIndex = (this.currentMessageIndex + 1) % this.listeningMessages.length;
            this.elements.recordingStatus.textContent = this.listeningMessages[this.currentMessageIndex];
        }, 3000);
    }

    /**
     * Stop cycling listening messages
     */
    stopListeningMessages() {
        if (this.messageInterval) {
            clearInterval(this.messageInterval);
            this.messageInterval = null;
        }
        this.currentMessageIndex = 0;
    }

    /**
     * Copy to clipboard
     */
    async copyToClipboard() {
        const text = this.elements.transcriptionText.textContent;
        await this.copyTextToClipboard(text);

        const originalText = this.elements.copyBtn.querySelector('span').textContent;
        this.elements.copyBtn.querySelector('span').textContent = 'Copied!';
        setTimeout(() => {
            this.elements.copyBtn.querySelector('span').textContent = originalText;
        }, 2000);
    }

    /**
     * Copy text to clipboard
     */
    async copyTextToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            this.showError('Failed to copy to clipboard');
        }
    }

    /**
     * Load sessions list
     */
    loadSessionsList() {
        const sessions = this.sessionManager.getSessions(false);
        const activeSession = this.sessionManager.getActiveSession();

        this.elements.sessionsList.innerHTML = '';

        if (sessions.length === 0) {
            this.elements.sessionsList.innerHTML = '<p style="text-align: center; color: var(--color-text-tertiary); padding: 2rem; font-size: 0.875rem;">No recordings yet</p>';
            return;
        }

        sessions.forEach(session => {
            const sessionEl = document.createElement('div');
            sessionEl.className = 'session-item';
            if (activeSession && activeSession.id === session.id) {
                sessionEl.classList.add('active');
            }

            const date = new Date(session.createdAt).toLocaleDateString();
            const time = new Date(session.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });

            sessionEl.innerHTML = `
                <h3>${session.name}</h3>
                <p>${date} at ${time}</p>
                <div class="session-item-actions">
                    <button class="session-options-btn" data-session-id="${session.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="1"/>
                            <circle cx="12" cy="5" r="1"/>
                            <circle cx="12" cy="19" r="1"/>
                        </svg>
                    </button>
                </div>
            `;

            sessionEl.addEventListener('click', (e) => {
                if (!e.target.closest('.session-options-btn')) {
                    this.loadSession(session.id);
                }
            });

            const optionsBtn = sessionEl.querySelector('.session-options-btn');
            optionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentEditingSessionId = session.id;
                this.togglePopup(this.elements.sessionOptionsPopup, optionsBtn);
            });

            this.elements.sessionsList.appendChild(sessionEl);
        });
    }

    /**
     * Open edit title modal
     */
    openEditTitle() {
        const session = this.sessionManager.getSessions(true).find(s => s.id === this.currentEditingSessionId);
        if (session) {
            this.elements.editSessionName.value = session.name;
            this.elements.editTitleModal.classList.add('open');
            setTimeout(() => this.elements.editSessionName.select(), 100);
        }
        this.closeAllPopups();
    }

    /**
     * Confirm edit title
     */
    confirmEditTitle() {
        const newName = this.elements.editSessionName.value.trim();
        if (newName) {
            const session = this.sessionManager.getSessions(true).find(s => s.id === this.currentEditingSessionId);
            if (session) {
                session.name = newName;
                session.updatedAt = new Date().toISOString();
                this.sessionManager.saveSessions();
                this.loadSessionsList();
            }
        }
        this.closeEditTitle();
    }

    /**
     * Close edit title modal
     */
    closeEditTitle() {
        this.elements.editTitleModal.classList.remove('open');
    }

    /**
     * Download text
     */
    downloadText() {
        const result = this.sessionManager.exportAsText(this.currentEditingSessionId);
        if (!result.success) {
            this.showError(result.error);
        }
        this.closeAllPopups();
    }

    /**
     * Delete session
     */
    deleteSession() {
        const session = this.sessionManager.getSessions(true).find(s => s.id === this.currentEditingSessionId);
        if (!session) return;

        this.showConfirm(
            'Delete Session',
            `Are you sure you want to delete "${session.name}"?`,
            () => {
                this.sessionManager.deleteSession(this.currentEditingSessionId);
                this.loadSessionsList();

                // If this was the active session, reset UI
                const activeSession = this.sessionManager.getActiveSession();
                if (!activeSession || activeSession.id === this.currentEditingSessionId) {
                    this.resetUI();
                }
            }
        );
        this.closeAllPopups();
    }

    /**
     * Populate microphone submenu
     */
    populateMicrophoneSubmenu(devices) {
        this.elements.microphoneSubmenu.innerHTML = '';

        devices.forEach((device, index) => {
            const item = document.createElement('div');
            item.className = 'popup-menu-item';
            if (index === 0) {
                item.classList.add('selected');
                this.currentMicrophoneId = device.deviceId;
            }

            const label = device.label || `Microphone ${index + 1}`;
            item.innerHTML = `<span>${label}</span>`;
            item.dataset.deviceId = device.deviceId;

            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.switchMicrophone(device.deviceId);

                this.elements.microphoneSubmenu.querySelectorAll('.popup-menu-item').forEach(el => {
                    el.classList.remove('selected');
                });
                item.classList.add('selected');

                this.closeAllPopups();
            });

            this.elements.microphoneSubmenu.appendChild(item);
        });
    }

    /**
     * Switch microphone
     */
    async switchMicrophone(deviceId) {
        const result = await this.audioProcessor.switchMicrophone(deviceId);
        if (result.success) {
            this.currentMicrophoneId = deviceId;
        } else {
            this.showError('Failed to switch microphone: ' + result.error);
        }
    }

    /**
     * Toggle popup menu
     */
    togglePopup(popup, button) {
        const isOpen = popup.classList.contains('open');
        this.closeAllPopups();

        if (!isOpen) {
            const rect = button.getBoundingClientRect();
            popup.style.top = `${rect.bottom + 8}px`;
            popup.style.left = `${rect.left}px`;
            popup.classList.add('open');
        }
    }

    /**
     * Show submenu
     */
    showSubmenu(submenu, parentItem) {
        const rect = parentItem.getBoundingClientRect();
        submenu.style.top = `${rect.top}px`;
        submenu.style.left = `${rect.right + 8}px`;
        submenu.classList.add('open');
    }

    /**
     * Hide submenu
     */
    hideSubmenu() {
        this.elements.microphoneSubmenu.classList.remove('open');
    }

    /**
     * Close all popups
     */
    closeAllPopups() {
        document.querySelectorAll('.popup-menu').forEach(popup => {
            popup.classList.remove('open');
        });
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        this.closeEditTitle();
        this.closeConfirm();
    }

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        this.elements.sidebar.classList.toggle('open');
        this.elements.mainContent.classList.toggle('sidebar-open');
    }

    /**
     * Show confirm dialog
     */
    showConfirm(title, message, onConfirm) {
        this.elements.confirmTitle.textContent = title;
        this.elements.confirmMessage.textContent = message;
        this.elements.confirmModal.classList.add('open');

        const newConfirmBtn = this.elements.confirmActionBtn.cloneNode(true);
        this.elements.confirmActionBtn.parentNode.replaceChild(newConfirmBtn, this.elements.confirmActionBtn);
        this.elements.confirmActionBtn = newConfirmBtn;

        this.elements.confirmActionBtn.addEventListener('click', () => {
            onConfirm();
            this.closeConfirm();
        });
    }

    /**
     * Close confirm dialog
     */
    closeConfirm() {
        this.elements.confirmModal.classList.remove('open');
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error(message);
        alert(message);
    }
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SpeakItApp());
} else {
    new SpeakItApp();
}
