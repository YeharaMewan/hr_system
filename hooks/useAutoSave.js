// hooks/useAutoSave.js

import { useState, useEffect, useCallback, useRef } from 'react';

export const useAutoSave = (saveFunction, delay = 2000) => {
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const timeoutRef = useRef(null);
  const originalDataRef = useRef(null);

  // Initialize original data
  const initializeData = useCallback((data) => {
    originalDataRef.current = JSON.stringify(data);
    setHasChanges(false);
  }, []);

  // Detect changes in data
  const trackChanges = useCallback((currentData) => {
    const currentDataString = JSON.stringify(currentData);
    const hasDataChanged = originalDataRef.current !== currentDataString;
    
    if (hasDataChanged && !hasChanges) {
      setHasChanges(true);
      console.log('📝 Changes detected, scheduling auto-save...');
    }
    
    return hasDataChanged;
  }, [hasChanges]);

  // Trigger auto-save with debouncing
  const triggerAutoSave = useCallback(async (data) => {
    if (!hasChanges) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        console.log('💾 Auto-saving changes...');
        
        await saveFunction(data);
        
        // Update original data reference
        originalDataRef.current = JSON.stringify(data);
        setHasChanges(false);
        setLastSaved(new Date());
        console.log('✅ Auto-save completed');
        
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, delay);
  }, [hasChanges, saveFunction, delay]);

  // Manual save function
  const manualSave = useCallback(async (data) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    try {
      setIsSaving(true);
      console.log('💾 Manual save triggered...');
      
      await saveFunction(data);
      
      originalDataRef.current = JSON.stringify(data);
      setHasChanges(false);
      setLastSaved(new Date());
      console.log('✅ Manual save completed');
      
    } catch (error) {
      console.error('❌ Manual save failed:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [saveFunction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    hasChanges,
    isSaving,
    lastSaved,
    initializeData,
    trackChanges,
    triggerAutoSave,
    manualSave
  };
};
