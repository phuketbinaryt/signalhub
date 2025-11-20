import { useEffect, useRef, useState } from 'react';

export function useSoundNotifications() {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const soundsRef = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Load sound settings from localStorage
  useEffect(() => {
    const savedEnabled = localStorage.getItem('soundEnabled');
    const savedVolume = localStorage.getItem('soundVolume');

    if (savedEnabled !== null) {
      setSoundEnabled(savedEnabled === 'true');
    }

    if (savedVolume !== null) {
      setVolume(parseFloat(savedVolume));
    }
  }, []);

  // Initialize audio objects
  useEffect(() => {
    soundsRef.current = {
      entry: new Audio('/sounds/entry.mp3'),
      take_profit: new Audio('/sounds/take_profit.mp3'),
      stop_loss: new Audio('/sounds/stop_loss.mp3'),
    };

    // Set initial volume
    Object.values(soundsRef.current).forEach(audio => {
      audio.volume = volume;
    });
  }, []);

  // Update volume when it changes
  useEffect(() => {
    Object.values(soundsRef.current).forEach(audio => {
      audio.volume = volume;
    });
    localStorage.setItem('soundVolume', volume.toString());
  }, [volume]);

  // Save sound enabled state
  useEffect(() => {
    localStorage.setItem('soundEnabled', soundEnabled.toString());
  }, [soundEnabled]);

  const playSound = (action: string) => {
    if (!soundEnabled) return;

    const sound = soundsRef.current[action];
    if (sound) {
      sound.currentTime = 0; // Reset to start
      sound.play().catch(error => {
        console.error('Error playing sound:', error);
      });
    }
  };

  return {
    soundEnabled,
    setSoundEnabled,
    volume,
    setVolume,
    playSound,
  };
}
