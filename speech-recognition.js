/**
 * SpeechRecognitionManager - Handles speech-to-text transcription
 */
export class SpeechRecognitionManager {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.interimTranscript = '';
        this.finalTranscript = '';
        this.isRealtime = true;

        // Callbacks
        this.onResult = null;
        this.onInterimResult = null;
        this.onEnd = null;
        this.onError = null;
    }

    /**
     * Initialize speech recognition
     */
    initialize() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            return {
                success: false,
                error: 'Speech recognition not supported in this browser. Please use Chrome or Edge.'
            };
        }

        try {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 1;

            this.setupEventHandlers();

            return { success: true };
        } catch (error) {
            console.error('Failed to initialize speech recognition:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Setup event handlers for speech recognition
     */
    setupEventHandlers() {
        this.recognition.onresult = (event) => {
            this.interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    this.finalTranscript += transcript + ' ';
                    if (this.onResult) {
                        this.onResult(transcript, this.finalTranscript);
                    }
                } else {
                    this.interimTranscript += transcript;
                    if (this.onInterimResult) {
                        this.onInterimResult(this.interimTranscript);
                    }
                }
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);

            // Handle specific errors
            if (event.error === 'no-speech') {
                // This is normal, just restart
                if (this.isListening) {
                    this.restartRecognition();
                }
            } else if (event.error === 'audio-capture') {
                if (this.onError) {
                    this.onError('No microphone found or microphone access denied.');
                }
            } else if (event.error === 'not-allowed') {
                if (this.onError) {
                    this.onError('Microphone access denied.');
                }
                this.isListening = false;
            } else {
                if (this.onError) {
                    this.onError(`Speech recognition error: ${event.error}`);
                }
            }
        };

        this.recognition.onend = () => {
            // Automatically restart if we're supposed to be listening
            if (this.isListening) {
                this.restartRecognition();
            } else {
                if (this.onEnd) {
                    this.onEnd();
                }
            }
        };

        this.recognition.onstart = () => {
            console.log('Speech recognition started');
        };
    }

    /**
     * Start speech recognition
     */
    start() {
        if (!this.recognition) {
            return { success: false, error: 'Recognition not initialized' };
        }

        if (this.isListening) {
            return { success: true, message: 'Already listening' };
        }

        try {
            this.finalTranscript = '';
            this.interimTranscript = '';
            this.isListening = true;
            this.recognition.start();
            return { success: true };
        } catch (error) {
            console.error('Failed to start recognition:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Stop speech recognition
     */
    stop() {
        if (!this.recognition || !this.isListening) {
            return { success: true };
        }

        try {
            this.isListening = false;
            this.recognition.stop();
            return { success: true, transcript: this.finalTranscript };
        } catch (error) {
            console.error('Failed to stop recognition:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Restart recognition (internal method)
     */
    restartRecognition() {
        if (!this.isListening) return;

        try {
            // Small delay to prevent rapid restarts
            setTimeout(() => {
                if (this.isListening) {
                    this.recognition.start();
                }
            }, 100);
        } catch (error) {
            console.error('Failed to restart recognition:', error);
        }
    }

    /**
     * Set language for recognition
     */
    setLanguage(lang) {
        if (this.recognition) {
            this.recognition.lang = lang;
        }
    }

    /**
     * Get current transcript
     */
    getTranscript() {
        return {
            final: this.finalTranscript.trim(),
            interim: this.interimTranscript.trim(),
            combined: (this.finalTranscript + this.interimTranscript).trim()
        };
    }

    /**
     * Clear transcript
     */
    clearTranscript() {
        this.finalTranscript = '';
        this.interimTranscript = '';
    }

    /**
     * Enable/disable real-time transcription
     */
    setRealtime(enabled) {
        this.isRealtime = enabled;
        if (this.recognition) {
            this.recognition.interimResults = enabled;
        }
    }

    /**
     * Check if speech recognition is supported
     */
    static isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    /**
     * Cleanup
     */
    cleanup() {
        this.stop();
        this.recognition = null;
    }
}
