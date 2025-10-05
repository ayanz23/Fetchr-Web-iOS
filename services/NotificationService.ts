class NotificationService {
  private static instance: NotificationService;
  private permissionGranted: boolean = false;

  private constructor() {
    this.checkPermission();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private async checkPermission(): Promise<void> {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        this.permissionGranted = true;
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        this.permissionGranted = permission === 'granted';
      }
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    this.permissionGranted = permission === 'granted';
    return this.permissionGranted;
  }

  showNotification(title: string, options?: NotificationOptions): void {
    if (!this.permissionGranted) {
      return;
    }

    const defaultOptions: NotificationOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'petsafe-notification',
      requireInteraction: false,
      ...options
    };

    new Notification(title, defaultOptions);
  }

  showPetAlert(petName: string, message: string): void {
    this.showNotification(
      `🐾 Fetchr Alert - ${petName}`,
      {
        body: message,
        icon: '/favicon.ico',
        tag: `pet-alert-${petName}`,
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'View Dashboard'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      }
    );
  }

  showSafeZoneAlert(petName: string, isEntering: boolean): void {
    const action = isEntering ? 'entered' : 'left';
    const emoji = isEntering ? '✅' : '⚠️';
    
    this.showNotification(
      `${emoji} Safe Zone Alert`,
      {
        body: `${petName} has ${action} the safe zone`,
        icon: '/favicon.ico',
        tag: `safe-zone-${petName}-${Date.now()}`,
        requireInteraction: true
      }
    );
  }

  showHealthAlert(petName: string, vitalType: string, status: string): void {
    this.showNotification(
      `🏥 Health Alert - ${petName}`,
      {
        body: `${vitalType}: ${status}`,
        icon: '/favicon.ico',
        tag: `health-alert-${petName}-${vitalType}`,
        requireInteraction: true
      }
    );
  }
}

export default NotificationService.getInstance();
