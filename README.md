# Speak It - Voice Typing Application

**"You speak, I'll type..."**

A beautiful, minimalist voice typing web application that runs 100% locally in your browser. No timeouts, no cloud processing, just pure local voice-to-text magic.

## ✨ Features

- **No Timeout Recording** - Record for hours without interruption (unlike most voice typing tools)
- **Automatic Silence Detection** - Only keeps the parts where you're actually speaking
- **Real-time Transcription** - See your words appear as you speak
- **100% Local & Private** - All processing happens in your browser, nothing sent to servers
- **Beautiful UI** - Claude-inspired minimalist design with smooth animations
- **Session Management** - Save, load, and organize your recordings
- **Multiple Export Options** - Download audio, download text, or copy to clipboard
- **Voice Activity Detection** - Smart detection of when you're speaking
- **Adjustable Settings** - Customize sensitivity, timeout, and microphone selection

## 🚀 Getting Started

### Requirements

- A modern web browser (Chrome or Edge recommended for best speech recognition)
- A microphone
- That's it! No installation needed.

### Usage

1. **Open the app** - Simply open `index.html` in your web browser
2. **Grant microphone access** - The browser will ask for permission on first use
3. **Start recording** - Click the microphone button or "Start voice typing"
4. **Speak naturally** - No need to rush, the app won't time out
5. **Watch it transcribe** - Your words appear in real-time (if enabled)
6. **Stop and save** - Click "Stop and process" when done, then name your session

### Interface Overview

**Main Screen (Pre-recording)**
- Central microphone button - Start recording
- Sound level indicator - See your microphone input
- Microphone status - Shows if mic is working
- Settings button (bottom-left) - Adjust preferences
- Start button (bottom-right) - Begin voice typing

**Recording Mode**
- Main box moves to bottom
- Transcription appears in real-time
- Central button becomes pause/resume
- Progress button becomes stop and process
- Fun status messages cycle while listening

**Sidebar**
- New Recording button - Start fresh session
- Session history - All your past recordings
- Click to load - View previous transcripts
- Archive button - Clean up old sessions

## ⚙️ Settings

**Real-time Transcription**
- Toggle on/off for live text display
- When off, transcription happens after recording

**Voice Detection Sensitivity**
- Adjust how sensitive the app is to your voice
- Lower = only loud/clear speech detected
- Higher = picks up quieter speech

**Silence Timeout**
- How long of silence before considering speech ended
- Range: 1-10 seconds
- Default: 2 seconds

**Microphone Selection**
- Choose between available audio input devices
- Useful if you have multiple microphones

## 💾 Session Management

**Saving Sessions**
- After stopping recording, you'll be prompted to name your session
- Sessions are automatically saved to your browser's local storage
- Audio is kept in memory while session is active

**Loading Sessions**
- Click any session in the sidebar to view it
- Only one session can be active at a time
- Audio is only available during the active recording session

**Archiving Sessions**
- Archive old sessions to clean up your list
- Archived sessions lose their audio but keep the text
- Warning dialog prevents accidental archiving

**Exporting**
- **Download Audio** - Save recording as .webm file
- **Download Text** - Save transcript as .txt file
- **Copy to Clipboard** - Quick copy of the text

## 🎨 Design Philosophy

The design is inspired by modern AI chat interfaces like Claude, with:
- Neutral sandy color palette for easy on the eyes
- Minimalist approach - only what you need, when you need it
- Smooth transitions and hover effects
- Clean typography and spacing
- Responsive layout that works on different screen sizes

## 🔧 Technical Details

**Technologies Used**
- **Web Audio API** - For microphone access and audio recording
- **Web Speech API** - For speech-to-text transcription
- **MediaRecorder API** - For capturing audio streams
- **LocalStorage API** - For persisting sessions
- Pure vanilla JavaScript (ES6 modules)
- Modern CSS with CSS variables
- No frameworks, no dependencies, no build process

**Browser Compatibility**
- Chrome/Edge: Full support (recommended)
- Firefox: Limited speech recognition support
- Safari: Limited support for Web Speech API

**Privacy & Security**
- All processing happens locally in your browser
- No data sent to external servers
- Sessions stored only in your browser's local storage
- Audio blobs kept in memory, not permanently stored

## 📝 Tips for Best Results

1. **Use Chrome or Edge** - They have the best speech recognition
2. **Speak clearly** - Natural pace, not too fast
3. **Reduce background noise** - For better transcription accuracy
4. **Adjust sensitivity** - If it's not picking up your voice or picking up too much noise
5. **Use a good microphone** - Quality matters for accuracy
6. **Punctuation** - The speech API handles basic punctuation automatically

## 🐛 Troubleshooting

**"Are you on mute?" message**
- Check browser permissions for microphone access
- Ensure microphone is connected and working
- Try selecting different microphone in settings

**Transcription not working**
- Make sure you're using Chrome or Edge
- Check that real-time transcription is enabled
- Verify microphone is picking up audio (check sound level bar)

**Recording stops unexpectedly**
- This shouldn't happen! The app is designed for unlimited recording
- Check browser console for errors
- Try refreshing the page and starting over

## 🤝 Contributing

This is an open-source project. Feel free to:
- Report bugs or issues
- Suggest new features
- Submit pull requests
- Share your experience

## 📄 License

See LICENSE file for details.

---

**Made for people who think better when they speak** 🎤✨
