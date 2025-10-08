import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface WalletContextType {
  connected: boolean;
  publicKey: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      try {
        const { solana } = window as any;
        if (solana?.isPhantom && solana.isConnected) {
          const response = await solana.connect({ onlyIfTrusted: true });
          setPublicKey(response.publicKey.toString());
          setConnected(true);
        }
      } catch (error) {
        console.log("Wallet not connected");
      }
    };

    checkIfWalletIsConnected();

    const { solana } = window as any;
    if (solana) {
      solana.on("connect", (publicKey: any) => {
        setPublicKey(publicKey.toString());
        setConnected(true);
      });

      solana.on("disconnect", () => {
        setPublicKey(null);
        setConnected(false);
      });
    }

    return () => {
      if (solana) {
        solana.removeAllListeners("connect");
        solana.removeAllListeners("disconnect");
      }
    };
  }, []);

  const connect = async () => {
    try {
      setConnecting(true);
      const { solana } = window as any;

      if (!solana) {
        window.open("https://phantom.app/", "_blank");
        throw new Error("Please install Phantom wallet");
      }

      const response = await solana.connect();
      setPublicKey(response.publicKey.toString());
      setConnected(true);
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    const { solana } = window as any;
    if (solana) {
      solana.disconnect();
      setPublicKey(null);
      setConnected(false);
    }
  };

  return (
    <WalletContext.Provider value={{ connected, publicKey, connecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
