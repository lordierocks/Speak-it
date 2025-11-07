/**
 * Speak It - Voice Typing Application
 * Main application logic
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
        this.state = 'idle'; // idle, recording, paused, processing, saved
        this.realtimeTranscription = true;
        this.currentMicrophoneId = null;
        this.availableDevices = [];

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

        // DOM elements - will be initialized in init()
        this.elements = {};

        // Initialize
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        // Cache DOM elements
        this.cacheElements();

        // Setup event listeners
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

        // Setup speech recognition callbacks
        this.setupSpeechCallbacks();

        // Setup audio processor callbacks
        this.setupAudioCallbacks();

        // Load existing sessions
        this.loadSessionsList();

        console.log('Speak It initialized successfully!');
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            // Main elements
            sidebar: document.getElementById('sidebar'),
            sidebarToggle: document.getElementById('sidebarToggle'),
            mainContent: document.getElementById('mainContent'),
            motto: document.getElementById('motto'),
            mainBox: document.getElementById('mainBox'),

            // Buttons
            centralMicBtn: document.getElementById('centralMicBtn'),
            progressBtn: document.getElementById('progressBtn'),
            progressBtnText: document.getElementById('progressBtnText'),
            settingsBtn: document.getElementById('settingsBtn'),
            exportBtn: document.getElementById('exportBtn'),
            newSessionBtn: document.getElementById('newSessionBtn'),

            // Status
            recordingStatus: document.getElementById('recordingStatus'),
            micStatus: document.getElementById('micStatus'),
            soundLevelBar: document.getElementById('soundLevelBar'),

            // Transcription
            transcriptionDisplay: document.getElementById('transcriptionDisplay'),
            transcriptionText: document.getElementById('transcriptionText'),

            // Sessions
            sessionsList: document.getElementById('sessionsList'),

            // Popup menus
            settingsPopup: document.getElementById('settingsPopup'),
            exportPopup: document.getElementById('exportPopup'),
            microphoneSubmenu: document.getElementById('microphoneSubmenu'),
            microphoneMenuItem: document.getElementById('microphoneMenuItem'),

            // Modals
            saveModal: document.getElementById('saveModal'),
            confirmModal: document.getElementById('confirmModal'),

            // Settings
            realtimeTranscription: document.getElementById('realtimeTranscription'),
            vadSensitivity: document.getElementById('vadSensitivity'),
            silenceTimeout: document.getElementById('silenceTimeout'),
            silenceTimeoutValue: document.getElementById('silenceTimeoutValue'),

            // Export options
            downloadAudioBtn: document.getElementById('downloadAudioBtn'),
            downloadTextBtn: document.getElementById('downloadTextBtn'),
            copyTextBtn: document.getElementById('copyTextBtn'),

            // Save modal
            sessionName: document.getElementById('sessionName'),
            confirmSaveBtn: document.getElementById('confirmSaveBtn'),
            cancelSaveBtn: document.getElementById('cancelSaveBtn'),
            closeSaveBtn: document.getElementById('closeSaveBtn'),

            // Confirm modal
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
        // Sidebar toggle
        this.elements.sidebarToggle.addEventListener('click', () => this.toggleSidebar());

        // Central microphone button
        this.elements.centralMicBtn.addEventListener('click', () => this.handleCentralMicClick());

        // Progress button
        this.elements.progressBtn.addEventListener('click', () => this.handleProgressBtnClick());

        // Settings button - open popup
        this.elements.settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePopup(this.elements.settingsPopup, this.elements.settingsBtn);
        });

        // Export button - open popup
        this.elements.exportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePopup(this.elements.exportPopup, this.elements.exportBtn);
        });

        // Microphone menu item - show submenu
        this.elements.microphoneMenuItem.addEventListener('mouseenter', (e) => {
            this.showSubmenu(this.elements.microphoneSubmenu, this.elements.microphoneMenuItem);
        });

        this.elements.microphoneMenuItem.addEventListener('mouseleave', (e) => {
            // Delay hiding to allow moving to submenu
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

        // New session button
        this.elements.newSessionBtn.addEventListener('click', () => this.handleNewSession());

        // Settings changes
        this.elements.realtimeTranscription.addEventListener('change', (e) => {
            this.realtimeTranscription = e.target.checked;
            this.speechRecognition.setRealtime(e.target.checked);
        });

        this.elements.vadSensitivity.addEventListener('input', (e) => {
            this.audioProcessor.setVADSensitivity(e.target.value);
        });

        this.elements.silenceTimeout.addEventListener('input', (e) => {
            this.elements.silenceTimeoutValue.textContent = parseFloat(e.target.value).toFixed(1);
            this.audioProcessor.setSilenceTimeout(parseFloat(e.target.value));
        });

        // Export options
        this.elements.downloadAudioBtn.addEventListener('click', () => {
            this.downloadAudio();
            this.closeAllPopups();
        });

        this.elements.downloadTextBtn.addEventListener('click', () => {
            this.downloadText();
            this.closeAllPopups();
        });

        this.elements.copyTextBtn.addEventListener('click', () => {
            this.copyToClipboard();
            this.closeAllPopups();
        });

        // Save modal
        this.elements.confirmSaveBtn.addEventListener('click', () => this.confirmSave());
        this.elements.cancelSaveBtn.addEventListener('click', () => this.closeSave());
        this.elements.closeSaveBtn.addEventListener('click', () => this.closeSave());

        // Confirm modal
        this.elements.cancelConfirmBtn.addEventListener('click', () => this.closeConfirm());

        // Close popups when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.popup-menu') && !e.target.closest('.icon-btn')) {
                this.closeAllPopups();
            }
        });

        // Close modals on outside click
        [this.elements.saveModal, this.elements.confirmModal].forEach(modal => {
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
            this.updateTranscription(fullTranscript);
        };

        this.speechRecognition.onInterimResult = (interim) => {
            if (this.realtimeTranscription) {
                const full = this.speechRecognition.getTranscript().combined;
                this.updateTranscription(full);
            }
        };

        this.speechRecognition.onError = (error) => {
            console.error('Speech recognition error:', error);
        };
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
     * Toggle popup menu
     */
    togglePopup(popup, button) {
        const isOpen = popup.classList.contains('open');

        // Close all popups first
        this.closeAllPopups();

        if (!isOpen) {
            // Position popup below button
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
        this.closeSave();
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
     * Handle central mic button click
     */
    handleCentralMicClick() {
        if (this.state === 'idle') {
            this.startRecording();
        } else if (this.state === 'recording') {
            this.pauseRecording();
        } else if (this.state === 'paused') {
            this.resumeRecording();
        }
    }

    /**
     * Handle progress button click
     */
    async handleProgressBtnClick() {
        if (this.state === 'idle') {
            this.startRecording();
        } else if (this.state === 'recording' || this.state === 'paused') {
            this.stopAndProcess();
        } else if (this.state === 'saved') {
            // Copy to clipboard
            await this.copyTranscriptFromProgressBtn();
        }
    }

    /**
     * Start recording
     */
    async startRecording() {
        try {
            // Create new session
            this.sessionManager.createSession();

            // Hide motto
            this.elements.motto.classList.add('hidden');

            // Start audio recording
            const audioResult = this.audioProcessor.startRecording();
            if (!audioResult.success) {
                throw new Error('Failed to start audio recording');
            }

            // Start speech recognition if real-time is enabled
            if (this.realtimeTranscription) {
                const speechResult = this.speechRecognition.start();
                if (!speechResult.success) {
                    console.warn('Speech recognition failed to start:', speechResult.error);
                }
            }

            // Update UI state
            this.state = 'recording';
            this.updateUI();

            // Move main box to bottom
            this.elements.mainBox.classList.add('recording');

            // Show transcription area
            this.elements.transcriptionDisplay.classList.add('visible');

            // Start cycling listening messages
            this.startListeningMessages();

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

        if (this.realtimeTranscription) {
            this.speechRecognition.stop();
        }

        this.state = 'paused';
        this.updateUI();
        this.stopListeningMessages();
    }

    /**
     * Resume recording
     */
    resumeRecording() {
        this.audioProcessor.resumeRecording();

        if (this.realtimeTranscription) {
            this.speechRecognition.start();
        }

        this.state = 'recording';
        this.updateUI();
        this.startListeningMessages();
    }

    /**
     * Stop and process recording
     */
    async stopAndProcess() {
        try {
            this.state = 'processing';
            this.updateUI();

            // Stop speech recognition
            if (this.realtimeTranscription) {
                this.speechRecognition.stop();
            }

            this.stopListeningMessages();

            // Small delay to ensure all audio is captured
            await new Promise(resolve => setTimeout(resolve, 500));

            // Stop audio recording
            const result = await this.audioProcessor.stopRecording();

            if (!result.success) {
                throw new Error(result.error || 'Unknown error stopping recording');
            }

            // Get transcript
            const transcript = this.speechRecognition.getTranscript().final;

            // Open save modal with default date/time name
            this.openSaveModal(transcript, result.audioBlob);

        } catch (error) {
            console.error('Error in stopAndProcess:', error);
            this.showError('Failed to stop recording: ' + error.message);
            this.resetUI();
        }
    }

    /**
     * Open save modal
     */
    openSaveModal(transcript, audioBlob) {
        const now = new Date();
        const defaultName = now.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace(/[/,:]/g, '-').replace(/ /g, '_');

        this.elements.sessionName.value = defaultName;
        this.elements.saveModal.classList.add('open');

        // Store temporarily for saving
        this._tempTranscript = transcript;
        this._tempAudioBlob = audioBlob;

        // Focus the input
        setTimeout(() => this.elements.sessionName.select(), 100);
    }

    /**
     * Confirm save
     */
    confirmSave() {
        const name = this.elements.sessionName.value.trim() || 'Untitled Recording';

        // Save session
        const result = this.sessionManager.saveSession(
            name,
            this._tempTranscript,
            this._tempAudioBlob
        );

        if (result.success) {
            this.closeSave();
            this.loadSessionsList();
            this.showExportButton();

            // Update state to saved (shows copy to clipboard button)
            this.state = 'saved';
            this.updateUI();
        } else {
            this.showError(result.error);
        }
    }

    /**
     * Close save modal
     */
    closeSave() {
        this.elements.saveModal.classList.remove('open');
        this._tempTranscript = null;
        this._tempAudioBlob = null;

        // If canceling (state is still 'processing'), reset to idle
        if (this.state === 'processing') {
            this.resetUI();
        }
    }

    /**
     * Handle new session button
     */
    handleNewSession() {
        if (this.sessionManager.hasUnsavedAudio()) {
            this.showConfirm(
                'Start New Recording',
                `Starting a new session will automatically archive the current session. Any unsaved audio will be lost. Continue?`,
                () => {
                    this.startNewSession();
                }
            );
        } else {
            this.startNewSession();
        }
    }

    /**
     * Start new session
     */
    startNewSession() {
        // Archive current session if exists
        const activeSession = this.sessionManager.getActiveSession();
        if (activeSession) {
            this.sessionManager.archiveSession(activeSession.id);
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
        const result = this.sessionManager.loadSession(sessionId);

        if (result.success) {
            // Update UI with session data
            this.elements.transcriptionText.textContent = result.session.transcript;
            this.elements.transcriptionDisplay.classList.add('visible');

            // Show export button if session has audio
            if (result.session.audioBlob) {
                this.showExportButton();
            } else {
                this.elements.exportBtn.style.display = 'none';
            }

            // Hide motto
            this.elements.motto.classList.add('hidden');

            // Set state to saved (shows copy to clipboard button)
            this.state = 'saved';
            this.updateUI();

            // Update sessions list
            this.loadSessionsList();
        }
    }

    /**
     * Archive session
     */
    archiveSessionWithConfirm(sessionId) {
        const session = this.sessionManager.getSessions(true).find(s => s.id === sessionId);
        if (!session) return;

        this.showConfirm(
            'Archive Session',
            `Are you sure you want to archive "${session.name}"? Any unsaved audio will be lost.`,
            () => {
                this.sessionManager.archiveSession(sessionId);
                this.loadSessionsList();

                // If this was the active session, reset UI
                const activeSession = this.sessionManager.getActiveSession();
                if (!activeSession || activeSession.id === sessionId) {
                    this.resetUI();
                }
            }
        );
    }

    /**
     * Update UI based on state
     */
    updateUI() {
        const { centralMicBtn, progressBtn, progressBtnText, recordingStatus } = this.elements;

        switch (this.state) {
            case 'idle':
                centralMicBtn.classList.remove('recording', 'paused');
                progressBtn.classList.remove('primary');
                progressBtnText.textContent = 'Start voice typing';
                recordingStatus.textContent = 'Ready to start';
                break;

            case 'recording':
                centralMicBtn.classList.add('recording');
                centralMicBtn.classList.remove('paused');
                progressBtn.classList.add('primary');
                progressBtnText.textContent = 'Stop and process';
                recordingStatus.textContent = 'Recording...';
                break;

            case 'paused':
                centralMicBtn.classList.add('paused');
                centralMicBtn.classList.remove('recording');
                progressBtn.classList.add('primary');
                progressBtnText.textContent = 'Stop and process';
                recordingStatus.textContent = 'Paused';
                break;

            case 'processing':
                recordingStatus.textContent = 'Processing...';
                break;

            case 'saved':
                centralMicBtn.classList.remove('recording', 'paused');
                progressBtn.classList.remove('primary');
                progressBtnText.textContent = 'Copy to clipboard';
                recordingStatus.textContent = 'Saved';
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
        this.elements.exportBtn.style.display = 'none';
        this.speechRecognition.clearTranscript();
        this.updateUI();
    }

    /**
     * Update transcription text
     */
    updateTranscription(text) {
        this.elements.transcriptionText.textContent = text;

        // Auto-scroll to bottom
        this.elements.transcriptionDisplay.scrollTop = this.elements.transcriptionDisplay.scrollHeight;

        // Update session
        this.sessionManager.updateTranscript(text);
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
     * Show export button
     */
    showExportButton() {
        this.elements.exportBtn.style.display = 'flex';
    }

    /**
     * Download audio
     */
    downloadAudio() {
        const result = this.sessionManager.exportAudio();
        if (!result.success) {
            this.showError(result.error);
        }
    }

    /**
     * Download text
     */
    downloadText() {
        const result = this.sessionManager.exportAsText();
        if (!result.success) {
            this.showError(result.error);
        }
    }

    /**
     * Copy to clipboard (from export menu)
     */
    async copyToClipboard() {
        const result = await this.sessionManager.copyToClipboard();
        if (!result.success) {
            this.showError(result.error);
        } else {
            // Show brief success indication
            const originalText = this.elements.copyTextBtn.querySelector('span').textContent;
            this.elements.copyTextBtn.querySelector('span').textContent = 'Copied!';
            setTimeout(() => {
                this.elements.copyTextBtn.querySelector('span').textContent = originalText;
            }, 2000);
        }
    }

    /**
     * Copy transcript from progress button
     */
    async copyTranscriptFromProgressBtn() {
        const result = await this.sessionManager.copyToClipboard();
        if (!result.success) {
            this.showError(result.error);
        } else {
            // Show brief success indication on the progress button
            const originalText = this.elements.progressBtnText.textContent;
            this.elements.progressBtnText.textContent = 'Copied!';
            setTimeout(() => {
                this.elements.progressBtnText.textContent = originalText;
            }, 2000);
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
                    <button class="archive-btn" data-session-id="${session.id}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>
                        </svg>
                    </button>
                </div>
            `;

            sessionEl.addEventListener('click', (e) => {
                if (!e.target.closest('.archive-btn')) {
                    this.loadSession(session.id);
                }
            });

            const archiveBtn = sessionEl.querySelector('.archive-btn');
            archiveBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.archiveSessionWithConfirm(session.id);
            });

            this.elements.sessionsList.appendChild(sessionEl);
        });
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

                // Update selection
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
     * Show confirm dialog
     */
    showConfirm(title, message, onConfirm) {
        this.elements.confirmTitle.textContent = title;
        this.elements.confirmMessage.textContent = message;
        this.elements.confirmModal.classList.add('open');

        // Remove old listener and add new one
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
