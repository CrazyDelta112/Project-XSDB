const soundProfiles = {
    navigate: { frequency: 350, duration: .038, volume: .040 },
    select: { frequency: 560, duration: .055, volume: .060 },
    back: { frequency: 250, duration: .055, volume: .055 },
    open: { frequency: 440, duration: .070, volume: .050 },
    close: { frequency: 300, duration: .065, volume: .045 },
    error: { frequency: 170, duration: .095, volume: .060 }
};

let audioContext = null;

function playSound(name) {
    if (App.settings?.uiSounds === false)
        return;

    const profile = soundProfiles[name];

    if (!profile)
        return;

    try {
        audioContext ??= new (window.AudioContext || window.webkitAudioContext)();

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = profile.frequency;

        gain.gain.value =
            profile.volume *
            Number(App.settings?.uiVolume ?? .75);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime + profile.duration
        );

        oscillator.stop(
            audioContext.currentTime + profile.duration
        );
    } catch {
    }
}
