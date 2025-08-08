// lib/autoSaveService.js

class AutoSaveService {
  constructor() {
    this.isRunning = false;
    this.interval = null;
  }

  // Start auto-save service
  start(intervalMinutes = 5) {
    if (this.isRunning) {
      return;
    }
    
    this.interval = setInterval(async () => {
      await this.performAutoSave();
    }, intervalMinutes * 60 * 1000);

    this.isRunning = true;
  }

  // Stop auto-save service
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
  }

  // Perform auto-save operation
  async performAutoSave() {
    try {
      // This would typically make an internal API call
      // or directly interact with the database
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/dashboard/auto-save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
        }
      });

      if (response.ok) {
        const result = await response.json();
      } else {
        // Handle error silently or log to file
      }
    } catch (error) {
      // Handle error silently or log to file
    }
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalId: this.interval,
      lastRun: new Date().toISOString()
    };
  }
}

// Export singleton instance
const autoSaveService = new AutoSaveService();
export default autoSaveService;

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  autoSaveService.start(5); // Auto-save every 5 minutes
}
