// utils/dataChangeDetector.js

export class DataChangeDetector {
  constructor() {
    this.listeners = [];
    this.lastSnapshot = null;
  }

  // Add change listener
  addListener(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Take snapshot of current data
  takeSnapshot(data) {
    this.lastSnapshot = this.deepClone(data);
  }

  // Check for changes and notify listeners
  checkForChanges(currentData) {
    if (!this.lastSnapshot) {
      this.takeSnapshot(currentData);
      return false;
    }

    const changes = this.findChanges(this.lastSnapshot, currentData);
    
    if (changes.length > 0) {
      // Notify all listeners
      this.listeners.forEach(callback => {
        try {
          callback(changes, currentData);
        } catch (error) {
          // Handle error silently
        }
      });
      
      // Update snapshot
      this.takeSnapshot(currentData);
      return true;
    }
    
    return false;
  }

  // Deep clone object
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Find specific changes between two objects
  findChanges(oldData, newData, path = '') {
    const changes = [];

    if (typeof oldData !== typeof newData) {
      changes.push({
        path,
        oldValue: oldData,
        newValue: newData,
        type: 'type_change'
      });
      return changes;
    }

    if (typeof oldData === 'object' && oldData !== null) {
      // Handle arrays
      if (Array.isArray(oldData)) {
        if (!Array.isArray(newData) || oldData.length !== newData.length) {
          changes.push({
            path,
            oldValue: oldData,
            newValue: newData,
            type: 'array_change'
          });
        } else {
          oldData.forEach((item, index) => {
            changes.push(...this.findChanges(item, newData[index], `${path}[${index}]`));
          });
        }
      } else {
        // Handle objects
        const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
        
        allKeys.forEach(key => {
          const newPath = path ? `${path}.${key}` : key;
          
          if (!(key in oldData)) {
            changes.push({
              path: newPath,
              oldValue: undefined,
              newValue: newData[key],
              type: 'added'
            });
          } else if (!(key in newData)) {
            changes.push({
              path: newPath,
              oldValue: oldData[key],
              newValue: undefined,
              type: 'removed'
            });
          } else {
            changes.push(...this.findChanges(oldData[key], newData[key], newPath));
          }
        });
      }
    } else if (oldData !== newData) {
      changes.push({
        path,
        oldValue: oldData,
        newValue: newData,
        type: 'value_change'
      });
    }

    return changes;
  }

  // Get formatted change summary
  getChangeSummary(changes) {
    const summary = {
      total: changes.length,
      byType: {},
      byPath: {}
    };

    changes.forEach(change => {
      // Count by type
      summary.byType[change.type] = (summary.byType[change.type] || 0) + 1;
      
      // Count by path
      const topLevelPath = change.path.split('.')[0];
      summary.byPath[topLevelPath] = (summary.byPath[topLevelPath] || 0) + 1;
    });

    return summary;
  }
}

// Export singleton instance
export const dataChangeDetector = new DataChangeDetector();
