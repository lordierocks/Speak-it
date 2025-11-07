/**
 * SessionManager - Handles session storage and management
 */
export class SessionManager {
    constructor() {
        this.sessions = [];
        this.activeSession = null;
        this.loadSessions();
    }

    /**
     * Create a new session
     */
    createSession() {
        const session = {
            id: this.generateId(),
            name: `Recording ${this.sessions.length + 1}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            transcript: '',
            audioBlob: null,
            audioUrl: null,
            isArchived: false,
            duration: 0
        };

        this.activeSession = session;
        return session;
    }

    /**
     * Save current session
     */
    saveSession(name, transcript, audioBlob) {
        if (!this.activeSession) {
            return { success: false, error: 'No active session' };
        }

        try {
            this.activeSession.name = name || this.activeSession.name;
            this.activeSession.transcript = transcript || '';
            this.activeSession.updatedAt = new Date().toISOString();

            // Store audio blob (we'll keep it in memory for the active session)
            if (audioBlob) {
                this.activeSession.audioBlob = audioBlob;
                this.activeSession.audioUrl = URL.createObjectURL(audioBlob);
            }

            // Add to sessions list if not already there
            const existingIndex = this.sessions.findIndex(s => s.id === this.activeSession.id);
            if (existingIndex === -1) {
                this.sessions.unshift(this.activeSession);
            } else {
                this.sessions[existingIndex] = this.activeSession;
            }

            this.saveSessions();

            return { success: true, session: this.activeSession };
        } catch (error) {
            console.error('Failed to save session:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update session transcript
     */
    updateTranscript(transcript) {
        if (!this.activeSession) {
            return { success: false, error: 'No active session' };
        }

        this.activeSession.transcript = transcript;
        this.activeSession.updatedAt = new Date().toISOString();

        // Update in sessions list
        const existingIndex = this.sessions.findIndex(s => s.id === this.activeSession.id);
        if (existingIndex !== -1) {
            this.sessions[existingIndex] = this.activeSession;
            this.saveSessions();
        }

        return { success: true };
    }

    /**
     * Load a session
     */
    loadSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);

        if (!session) {
            return { success: false, error: 'Session not found' };
        }

        // If there's an active session with unsaved audio, warn about losing it
        if (this.activeSession && this.activeSession.audioBlob && this.activeSession.id !== sessionId) {
            // Clear the audio blob from the previous session
            if (this.activeSession.audioUrl) {
                URL.revokeObjectURL(this.activeSession.audioUrl);
            }
            this.activeSession.audioBlob = null;
            this.activeSession.audioUrl = null;
        }

        this.activeSession = session;
        return { success: true, session };
    }

    /**
     * Archive a session
     */
    archiveSession(sessionId) {
        const session = this.sessions.find(s => s.id === sessionId);

        if (!session) {
            return { success: false, error: 'Session not found' };
        }

        // Clear audio blob if it exists
        if (session.audioUrl) {
            URL.revokeObjectURL(session.audioUrl);
        }
        session.audioBlob = null;
        session.audioUrl = null;
        session.isArchived = true;
        session.updatedAt = new Date().toISOString();

        // If this is the active session, clear it
        if (this.activeSession && this.activeSession.id === sessionId) {
            this.activeSession = null;
        }

        this.saveSessions();

        return { success: true };
    }

    /**
     * Delete a session
     */
    deleteSession(sessionId) {
        const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);

        if (sessionIndex === -1) {
            return { success: false, error: 'Session not found' };
        }

        const session = this.sessions[sessionIndex];

        // Clear audio blob if it exists
        if (session.audioUrl) {
            URL.revokeObjectURL(session.audioUrl);
        }

        // Remove from list
        this.sessions.splice(sessionIndex, 1);

        // If this is the active session, clear it
        if (this.activeSession && this.activeSession.id === sessionId) {
            this.activeSession = null;
        }

        this.saveSessions();

        return { success: true };
    }

    /**
     * Get all sessions
     */
    getSessions(includeArchived = false) {
        if (includeArchived) {
            return this.sessions;
        }
        return this.sessions.filter(s => !s.isArchived);
    }

    /**
     * Get active session
     */
    getActiveSession() {
        return this.activeSession;
    }

    /**
     * Check if there's an active session with unsaved audio
     */
    hasUnsavedAudio() {
        return this.activeSession && this.activeSession.audioBlob !== null;
    }

    /**
     * Save sessions to localStorage (without audio blobs)
     */
    saveSessions() {
        try {
            const sessionsToSave = this.sessions.map(session => ({
                id: session.id,
                name: session.name,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                transcript: session.transcript,
                isArchived: session.isArchived,
                duration: session.duration
                // Don't save audioBlob or audioUrl
            }));

            localStorage.setItem('speakit_sessions', JSON.stringify(sessionsToSave));
        } catch (error) {
            console.error('Failed to save sessions to localStorage:', error);
        }
    }

    /**
     * Load sessions from localStorage
     */
    loadSessions() {
        try {
            const saved = localStorage.getItem('speakit_sessions');
            if (saved) {
                this.sessions = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Failed to load sessions from localStorage:', error);
            this.sessions = [];
        }
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Export session as text file
     */
    exportAsText(sessionId) {
        const session = sessionId
            ? this.sessions.find(s => s.id === sessionId)
            : this.activeSession;

        if (!session) {
            return { success: false, error: 'Session not found' };
        }

        try {
            const blob = new Blob([session.transcript], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${session.name}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return { success: true };
        } catch (error) {
            console.error('Failed to export text:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Export session audio
     */
    exportAudio(sessionId) {
        const session = sessionId
            ? this.sessions.find(s => s.id === sessionId)
            : this.activeSession;

        if (!session) {
            return { success: false, error: 'Session not found' };
        }

        if (!session.audioBlob) {
            return { success: false, error: 'No audio available for this session' };
        }

        try {
            const url = URL.createObjectURL(session.audioBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${session.name}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            return { success: true };
        } catch (error) {
            console.error('Failed to export audio:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Copy transcript to clipboard
     */
    async copyToClipboard(sessionId) {
        const session = sessionId
            ? this.sessions.find(s => s.id === sessionId)
            : this.activeSession;

        if (!session) {
            return { success: false, error: 'Session not found' };
        }

        try {
            await navigator.clipboard.writeText(session.transcript);
            return { success: true };
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clear all sessions
     */
    clearAllSessions() {
        // Revoke all audio URLs
        this.sessions.forEach(session => {
            if (session.audioUrl) {
                URL.revokeObjectURL(session.audioUrl);
            }
        });

        this.sessions = [];
        this.activeSession = null;
        localStorage.removeItem('speakit_sessions');

        return { success: true };
    }
}
