import * as React from 'react';
import type { ScrollView } from 'react-native';

interface ScrollContextType {
  scrollViewRef: React.RefObject<ScrollView | null>;
  scrollToEnd: () => void;
}

const ScrollContext = React.createContext<ScrollContextType | null>(null);

export function ScrollProvider({
  children,
  scrollViewRef,
}: {
  children: React.ReactNode;
  scrollViewRef: React.RefObject<ScrollView | null>;
}) {
  const scrollToEnd = React.useCallback(() => {
    // Delay to allow keyboard animation to start
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [scrollViewRef]);

  const value = React.useMemo(
    () => ({ scrollViewRef, scrollToEnd }),
    [scrollViewRef, scrollToEnd]
  );

  return (
    <ScrollContext.Provider value={value}>{children}</ScrollContext.Provider>
  );
}

export function useScrollContext() {
  const context = React.useContext(ScrollContext);
  if (!context) {
    throw new Error('useScrollContext must be used within a ScrollProvider');
  }
  return context;
}
