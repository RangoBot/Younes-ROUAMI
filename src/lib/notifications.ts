export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'calendar' | 'task' | 'ai' | 'system';
  read: boolean;
  actionUrl?: string;
}

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

// Play pleasant chime using Web Audio API (zero external assets, instant, reliable)
export function playNotificationSound(type: 'gentle' | 'alert' | 'complete' = 'gentle') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'complete') {
      // Pleasant triumphant two-tone
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.12); // E5
      osc2.frequency.setValueAtTime(783.99, now + 0.24); // G5
      osc2.frequency.setValueAtTime(1046.50, now + 0.36); // C6

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.24);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } else if (type === 'alert') {
      // Urgent reminder ping
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // Gentle smartphone chime (Bell harmonic)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc2.frequency.setValueAtTime(880, now + 0.08); // A5

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    }
  } catch (e) {
    console.warn('Audio playback not permitted yet or failed:', e);
  }
}

/**
 * Trigger mobile phone vibration if supported
 */
export function vibratePhone(pattern: number[] = [120, 80, 120]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration error on restricted environments
    }
  }
}

/**
 * Check browser notification support & permission
 */
export function getNotificationPermission(): NotificationPermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Request permission for real desktop / mobile notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const res = await Notification.requestPermission();
    return res as NotificationPermissionStatus;
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return 'denied';
  }
}

/**
 * Dispatch phone & browser notification
 */
export function dispatchNotification(
  title: string,
  body: string,
  options?: {
    type?: 'calendar' | 'task' | 'ai' | 'system';
    playSound?: boolean;
    soundType?: 'gentle' | 'alert' | 'complete';
  }
): AppNotification {
  const type = options?.type || 'system';
  const shouldPlaySound = options?.playSound ?? true;

  if (shouldPlaySound) {
    playNotificationSound(options?.soundType || 'gentle');
  }
  vibratePhone();

  // If browser notification permitted, show native system popup
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'https://api.iconify.design/lucide:calendar-check.svg?color=%232563eb',
        badge: 'https://api.iconify.design/lucide:bell.svg',
      });
    } catch {
      // Some mobile browsers restrict Notification constructor without ServiceWorker
    }
  }

  const notification: AppNotification = {
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    title,
    body,
    timestamp: new Date().toISOString(),
    type,
    read: false,
  };

  return notification;
}
