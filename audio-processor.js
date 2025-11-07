/**
 * AudioProcessor - Handles audio recording and Voice Activity Detection (VAD)
 */
export class AudioProcessor {
    constructor() {
        this.audioContext = null;
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.analyser = null;
        this.dataArray = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isPaused = false;
        this.vadThreshold = 50; // Voice activity detection threshold (0-100)
        this.silenceTimeout = 2000; // ms
        this.lastSpeechTime = 0;
        this.silenceTimer = null;

        // Callbacks
        this.onAudioLevel = null;
        this.onSpeechStart = null;
        this.onSpeechEnd = null;
        this.onDataAvailable = null;
    }

    /**
     * Initialize audio context and get microphone access
     */
    async initialize() {
        try {
            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Create analyser for VAD
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.analyser.smoothingTimeConstant = 0.8;

            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            source.connect(this.analyser);

            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            // Create MediaRecorder
            const options = { mimeType: this.getSupportedMimeType() };
            this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    if (this.onDataAvailable) {
                        this.onDataAvailable(event.data);
                    }
                }
            };

            return { success: true, devices: await this.getAvailableDevices() };
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get list of available audio input devices
     */
    async getAvailableDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'audioinput');
        } catch (error) {
            console.error('Failed to enumerate devices:', error);
            return [];
        }
    }

    /**
     * Switch to a different microphone
     */
    async switchMicrophone(deviceId) {
        try {
            // Stop current stream
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
            }

            // Get new stream with specified device
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: { exact: deviceId },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Reconnect to analyser
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            source.connect(this.analyser);

            // Recreate MediaRecorder
            const options = { mimeType: this.getSupportedMimeType() };
            this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    if (this.onDataAvailable) {
                        this.onDataAvailable(event.data);
                    }
                }
            };

            return { success: true };
        } catch (error) {
            console.error('Failed to switch microphone:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get supported MIME type for recording
     */
    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
        ];

        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }

        return '';
    }

    /**
     * Start recording
     */
    startRecording() {
        if (!this.mediaRecorder) {
            throw new Error('Audio not initialized');
        }

        this.audioChunks = [];
        this.isRecording = true;
        this.isPaused = false;
        this.lastSpeechTime = Date.now();

        this.mediaRecorder.start(100); // Collect data every 100ms
        this.startVAD();

        return { success: true };
    }

    /**
     * Pause recording
     */
    pauseRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause();
            this.isPaused = true;
            this.stopVAD();
            return { success: true };
        }
        return { success: false };
    }

    /**
     * Resume recording
     */
    resumeRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume();
            this.isPaused = false;
            this.lastSpeechTime = Date.now();
            this.startVAD();
            return { success: true };
        }
        return { success: false };
    }

    /**
     * Stop recording and return audio blob
     */
    stopRecording() {
        return new Promise((resolve) => {
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
                resolve({ success: false, error: 'Not recording' });
                return;
            }

            this.mediaRecorder.onstop = () => {
                const mimeType = this.mediaRecorder.mimeType;
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });

                this.isRecording = false;
                this.isPaused = false;
                this.stopVAD();

                resolve({ success: true, audioBlob, mimeType });
            };

            this.mediaRecorder.stop();
        });
    }

    /**
     * Start Voice Activity Detection monitoring
     */
    startVAD() {
        this.stopVAD(); // Clear any existing interval

        const checkAudioLevel = () => {
            if (!this.isRecording || this.isPaused) return;

            this.analyser.getByteFrequencyData(this.dataArray);

            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
                sum += this.dataArray[i];
            }
            const average = sum / this.dataArray.length;
            const normalizedLevel = Math.min(100, (average / 255) * 100 * 2); // Scale to 0-100

            // Emit audio level for visualization
            if (this.onAudioLevel) {
                this.onAudioLevel(normalizedLevel);
            }

            // Voice activity detection
            const vadThresholdValue = (this.vadThreshold / 100) * 50; // Map 0-100 to 0-50
            const isSpeaking = normalizedLevel > vadThresholdValue;

            if (isSpeaking) {
                this.lastSpeechTime = Date.now();
                if (this.onSpeechStart) {
                    this.onSpeechStart();
                }
            } else {
                // Check for silence timeout
                const silenceDuration = Date.now() - this.lastSpeechTime;
                if (silenceDuration > this.silenceTimeout && this.onSpeechEnd) {
                    this.onSpeechEnd();
                }
            }
        };

        this.vadInterval = setInterval(checkAudioLevel, 50); // Check every 50ms
    }

    /**
     * Stop VAD monitoring
     */
    stopVAD() {
        if (this.vadInterval) {
            clearInterval(this.vadInterval);
            this.vadInterval = null;
        }
    }

    /**
     * Set VAD sensitivity (0-100)
     */
    setVADSensitivity(value) {
        this.vadThreshold = Math.max(0, Math.min(100, value));
    }

    /**
     * Set silence timeout in seconds
     */
    setSilenceTimeout(seconds) {
        this.silenceTimeout = seconds * 1000;
    }

    /**
     * Check if microphone is available
     */
    async checkMicrophoneAccess() {
        try {
            const result = await navigator.permissions.query({ name: 'microphone' });
            return result.state; // 'granted', 'denied', or 'prompt'
        } catch (error) {
            // Fallback for browsers that don't support permissions API
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                return 'granted';
            } catch (e) {
                return 'denied';
            }
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopVAD();

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }

        if (this.audioContext) {
            this.audioContext.close();
        }

        this.audioChunks = [];
        this.isRecording = false;
        this.isPaused = false;
    }
}
