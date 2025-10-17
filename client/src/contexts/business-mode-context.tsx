import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type BusinessMode = 'b2c' | 'b2b' | 'trade';

interface BusinessModeContextType {
  mode: BusinessMode;
  setMode: (mode: BusinessMode) => void;
}

const BusinessModeContext = createContext<BusinessModeContextType | undefined>(undefined);

interface BusinessModeProviderProps {
  children: ReactNode;
}

export function BusinessModeProvider({ children }: BusinessModeProviderProps) {
  const [mode, setModeState] = useState<BusinessMode>(() => {
    const stored = localStorage.getItem('businessMode');
    return (stored === 'b2c' || stored === 'b2b' || stored === 'trade') ? stored : 'b2c';
  });

  const setMode = useCallback((newMode: BusinessMode) => {
    setModeState(newMode);
    localStorage.setItem('businessMode', newMode);
  }, []);

  return (
    <BusinessModeContext.Provider value={{ mode, setMode }}>
      {children}
    </BusinessModeContext.Provider>
  );
}

export function useBusinessMode() {
  const context = useContext(BusinessModeContext);
  if (context === undefined) {
    throw new Error('useBusinessMode must be used within a BusinessModeProvider');
  }
  return context;
}
