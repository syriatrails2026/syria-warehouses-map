import { useCallback, useEffect, useState } from 'react';
import { parseSelectionFromSearch, selectionToSearch, type Selection } from './selection';

export function useSelection(): [Selection, (next: Selection) => void] {
  const [selection, setSelectionState] = useState<Selection>(() =>
    parseSelectionFromSearch(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => setSelectionState(parseSelectionFromSearch(window.location.search));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setSelection = useCallback((next: Selection) => {
    const search = selectionToSearch(next);
    const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    window.history.pushState({}, '', url);
    setSelectionState(next);
  }, []);

  return [selection, setSelection];
}
