import { useState, useEffect, useCallback } from 'react';
import { fetchBuildingLibrary } from '../../api/bldgApi';
import type { LibraryItem } from '../../types';

export const useBldgLibrary = () => {
  // 1. Data & Status States
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 2. Interaction State
  const [selectedLibItem, setSelectedLibItem] = useState<LibraryItem | null>(null);

  // 3. Fetch Data
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

  // 4. Handlers
  // [중요] selectBuilding -> selectLibraryItem 으로 변경
  const selectLibraryItem = useCallback((item: LibraryItem) => {
    setSelectedLibItem(item);
  }, []);

  return { 
    libraryItems, 
    selectedLibItem, 
    selectLibraryItem, // 변경된 이름 내보내기
    isLoading,
    error 
  };
};