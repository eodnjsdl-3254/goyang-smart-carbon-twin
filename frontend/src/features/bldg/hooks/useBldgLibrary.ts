import { useState, useEffect, useCallback } from 'react';
import { fetchBuildingLibrary } from '../api/bldgApi';
import type { LibraryItem } from '../types';

export const useBldgLibrary = () => {
  // 1. Data & Status States (데이터와 로딩/에러 상태)
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 2. Interaction State (사용자 상호작용 상태)
  const [selectedLibItem, setSelectedLibItem] = useState<LibraryItem | null>(null);

  // 3. Fetch Data (데이터 로딩 로직)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchBuildingLibrary();
        setLibraryItems(data);
      } catch (err) {
        console.error("Failed to load library:", err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // 4. Handlers (핸들러)
  const selectBuilding = useCallback((item: LibraryItem) => {
    setSelectedLibItem(item);
  }, []);

  return { 
    libraryItems, 
    selectedLibItem, 
    selectBuilding, 
    isLoading,
    error 
  };
};