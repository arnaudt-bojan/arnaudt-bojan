import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Environment = 'b2c' | 'b2b';

interface EnvironmentContextType {
  environment: Environment;
  setEnvironment: (env: Environment) => void;
}

const EnvironmentContext = createContext<EnvironmentContextType | undefined>(undefined);

interface EnvironmentProviderProps {
  children: ReactNode;
}

export function EnvironmentProvider({ children }: EnvironmentProviderProps) {
  const [environment, setEnvironmentState] = useState<Environment>(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem('upfirst_environment');
    return (stored === 'b2b' || stored === 'b2c') ? stored : 'b2c';
  });

  const setEnvironment = (env: Environment) => {
    setEnvironmentState(env);
    localStorage.setItem('upfirst_environment', env);
  };

  return (
    <EnvironmentContext.Provider value={{ environment, setEnvironment }}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment() {
  const context = useContext(EnvironmentContext);
  if (context === undefined) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
}
