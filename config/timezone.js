// Create a config file: config/timezone.js
export const TIMEZONE_CONFIG = {
  SRI_LANKA: {
    name: 'Asia/Colombo',
    offset: 5.5, // hours
    offsetMs: 5.5 * 60 * 60 * 1000 // milliseconds
  }
};

// ✅ Reusable timezone utility function
export function getTimezoneAwareDateRange(dateString, timezone = 'Asia/Colombo') {
  try {
    // Parse input date
    const inputDate = dateString ? new Date(dateString) : new Date();
    
    // Extract date components
    const year = inputDate.getFullYear();
    const month = inputDate.getMonth();
    const day = inputDate.getDate();
    
    // Create local date range (00:00:00 to 23:59:59)
    const localStartOfDay = new Date(year, month, day, 0, 0, 0, 0);
    const localEndOfDay = new Date(year, month, day, 23, 59, 59, 999);
    
    // Convert to UTC for database queries
    // For Sri Lanka (+05:30), we need to subtract 5.5 hours from local time to get UTC
    const offsetMs = TIMEZONE_CONFIG.SRI_LANKA.offsetMs;
    
    const utcStartOfDay = new Date(localStartOfDay.getTime() - offsetMs);
    const utcEndOfDay = new Date(localEndOfDay.getTime() - offsetMs);
    
    return {
      local: {
        start: localStartOfDay,
        end: localEndOfDay,
        dateString: `${year}-${(month+1).toString().padStart(2,'0')}-${day.toString().padStart(2,'0')}`
      },
      utc: {
        start: utcStartOfDay,
        end: utcEndOfDay
      },
      timezone: timezone
    };
    
  } catch (error) {
    console.error('❌ Timezone conversion error:', error);
    throw new Error(`Invalid date or timezone: ${error.message}`);
  }
}