/**
 * Sound utilities for toast notifications
 * Supports custom audio files for each toast type
 */

export type SoundType = 'success' | 'error' | 'info';

// Sound file paths - you can customize these to point to your own audio files
const getSoundPath = (filename: string) => {
  // In development, use the public path
  if (process.env.NODE_ENV === 'development') {
    return `/sounds/${filename}`;
  }
  
  // In production (packaged app), use the resources path
  if (typeof window !== 'undefined' && (window as any).api?.path) {
    const { path } = (window as any).api;
    return path.join(process.resourcesPath, 'sounds', filename);
  }
  
  // Fallback to public path
  return `/sounds/${filename}`;
};

const SOUND_FILES = {
  success: getSoundPath('success.mp3'),
  error: getSoundPath('error.mp3'), 
  info: getSoundPath('info.mp3')
};

// Fallback to generated sounds if custom files are not available
let useCustomSounds = true;

/**
 * Play a custom audio file for toast notifications
 * @param type - The type of sound to play
 */
export function playToastSound(type: SoundType): void {
  if (useCustomSounds) {
    playCustomSound(type);
  } else {
    playGeneratedSound(type);
  }
}

/**
 * Play custom audio file
 * @param type - The type of sound to play
 */
function playCustomSound(type: SoundType): void {
  try {
    const audio = new Audio(SOUND_FILES[type]);
    audio.volume = 0.3; // Adjust volume as needed
    audio.play().catch((error) => {
      console.warn(`Could not play custom sound for ${type}:`, error);
      // Fallback to generated sound if custom file fails
      playGeneratedSound(type);
    });
  } catch (error) {
    console.warn(`Error playing custom sound for ${type}:`, error);
    // Fallback to generated sound
    playGeneratedSound(type);
  }
}

/**
 * Generates a short notification sound using Web Audio API (fallback)
 * @param type - The type of sound to play
 */
function playGeneratedSound(type: SoundType): void {
  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Resume audio context if it's suspended
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set sound parameters based on type
    const soundConfig = getSoundConfig(type);
    
    oscillator.frequency.setValueAtTime(soundConfig.frequency, audioContext.currentTime);
    oscillator.type = soundConfig.waveType;
    
    // Create envelope for smooth sound
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(soundConfig.volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + soundConfig.duration);
    
    // Play the sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + soundConfig.duration);
    
  } catch (error) {
    console.warn('Could not play generated toast sound:', error);
  }
}

/**
 * Get sound configuration for each toast type
 */
function getSoundConfig(type: SoundType) {
  switch (type) {
    case 'success':
      return {
        frequency: 800, // Pleasant high tone
        waveType: 'sine' as OscillatorType,
        volume: 0.3,
        duration: 0.15
      };
    case 'error':
      return {
        frequency: 400, // Lower, more serious tone
        waveType: 'sawtooth' as OscillatorType,
        volume: 0.25,
        duration: 0.2
      };
    case 'info':
      return {
        frequency: 600, // Medium tone
        waveType: 'triangle' as OscillatorType,
        volume: 0.2,
        duration: 0.12
      };
    default:
      return {
        frequency: 500,
        waveType: 'sine' as OscillatorType,
        volume: 0.2,
        duration: 0.1
      };
  }
}

/**
 * Alternative method using system sounds (if available)
 * This is a fallback for when Web Audio API is not available
 */
export function playSystemSound(type: SoundType): void {
  try {
    // Create a simple audio element with data URI
    const audio = new Audio();
    
    // Generate a simple beep sound using data URI
    const soundData = generateBeepDataURI(type);
    audio.src = soundData;
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Fallback to Web Audio API if audio element fails
      playToastSound(type);
    });
  } catch (error) {
    console.warn('Could not play system sound:', error);
  }
}

/**
 * Set custom sound file paths
 * @param sounds - Object with sound file paths for each type
 */
export function setCustomSoundFiles(sounds: Partial<Record<SoundType, string>>): void {
  if (sounds.success) SOUND_FILES.success = sounds.success;
  if (sounds.error) SOUND_FILES.error = sounds.error;
  if (sounds.info) SOUND_FILES.info = sounds.info;
}

/**
 * Enable or disable custom sounds
 * @param enabled - Whether to use custom sounds or generated ones
 */
export function setCustomSoundsEnabled(enabled: boolean): void {
  useCustomSounds = enabled;
}

/**
 * Generate a simple beep sound as data URI (fallback)
 * This creates a very short audio file in memory
 */
function generateBeepDataURI(type: SoundType): string {
  const config = getSoundConfig(type);
  const sampleRate = 44100;
  const duration = config.duration;
  const samples = Math.floor(sampleRate * duration);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, samples * 2, true);
  
  // Generate sine wave
  for (let i = 0; i < samples; i++) {
    const sample = Math.sin(2 * Math.PI * config.frequency * i / sampleRate) * config.volume * 32767;
    view.setInt16(44 + i * 2, sample, true);
  }
  
  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}
