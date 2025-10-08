import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Package, ShoppingBag, AlertCircle, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWallet } from "@/contexts/WalletContext";
import type { SelectOrder } from "@shared/schema";

export default function BuyerDashboard() {
  const { toast } = useToast();
  const [mintingOrderId, setMintingOrderId] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const { connected, publicKey, connecting, connect, disconnect } = useWallet();

  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"] });
  const { data: orders, isLoading } = useQuery<SelectOrder[]>({
    queryKey: ["/api/orders/my-orders"],
  });

  const handleDisconnect = () => {
    disconnect();
  };

  const handleMintNFT = async (order: SelectOrder) => {
    if (!order || !connected || !publicKey) return;

    setIsMinting(true);
    try {
      const items = JSON.parse(order.items);
      
      const response = await apiRequest("POST", "/api/nft/mint", {
        orderId: order.id,
        productData: items[0],
        walletAddress: publicKey,
      });

      const result = await response.json();

      if (result.signature) {
        toast({
          title: "NFT Minted Successfully!",
          description: `Mint: ${result.mintAddress.substring(0, 20)}...`,
        });
        
        queryClient.invalidateQueries({ queryKey: ["/api/orders/my-orders"] });
        setMintingOrderId(null);
      }
    } catch (error: any) {
      toast({
        title: "Minting Failed",
        description: error.message || "Failed to mint NFT. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsMinting(false);
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "fully_paid":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "deposit_paid":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "pending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "shipped":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "processing":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "pending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">
              My Orders
            </h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.firstName || user?.email}! View your orders and mint NFTs.
            </p>
          </div>
          {!connected ? (
            <Button 
              onClick={connect} 
              disabled={connecting}
              data-testid="button-connect-wallet"
              className="gap-2"
            >
              <Wallet className="h-4 w-4" />
              {connecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Card className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Connected</p>
                    <p className="text-sm font-mono" data-testid="text-wallet-address">
                      {publicKey?.substring(0, 4)}...{publicKey?.substring(publicKey.length - 4)}
                    </p>
                  </div>
                </div>
              </Card>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDisconnect}
                data-testid="button-disconnect-wallet"
              >
                Disconnect
              </Button>
            </div>
          )}
        </div>
      </div>

      {!orders || orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Orders Yet</h3>
            <p className="text-muted-foreground text-center mb-6">
              You haven't placed any orders yet. Start shopping to see your orders here!
            </p>
            <Button onClick={() => window.location.href = "/products"} data-testid="button-shop-now">
              Start Shopping
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const items = JSON.parse(order.items);
            return (
              <Card key={order.id} className="hover-elevate" data-testid={`card-order-${order.id}`}>
                <CardHeader className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">
                        Order #{order.id}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge className={getPaymentStatusColor(order.paymentStatus || "pending")}>
                        {order.paymentStatus?.replace("_", " ")}
                      </Badge>
                      <Badge className={getOrderStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Items:</h4>
                    <div className="space-y-1">
                      {items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.name} x{item.quantity}</span>
                          <span className="font-medium">${parseFloat(item.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-medium">${parseFloat(order.total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount Paid:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        ${parseFloat(order.amountPaid || "0").toFixed(2)}
                      </span>
                    </div>
                    {order.remainingBalance && parseFloat(order.remainingBalance) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Remaining:</span>
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                          ${parseFloat(order.remainingBalance).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button
                      className="w-full gap-2"
                      variant="outline"
                      onClick={() => setMintingOrderId(order.id)}
                      disabled={order.paymentStatus !== "fully_paid" || !connected}
                      data-testid={`button-mint-nft-${order.id}`}
                    >
                      <Coins className="h-4 w-4" />
                      Mint NFT
                    </Button>
                    {order.paymentStatus !== "fully_paid" ? (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Complete payment to mint NFT
                      </p>
                    ) : !connected ? (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Connect wallet to mint NFT
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={mintingOrderId !== null} onOpenChange={() => setMintingOrderId(null)}>
        <DialogContent data-testid="dialog-mint-nft">
          <DialogHeader>
            <DialogTitle>Mint Product NFT</DialogTitle>
            <DialogDescription>
              Create a unique NFT on Solana blockchain for your purchased product. This NFT will contain all product metadata and serve as proof of ownership.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">What you'll receive:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                  <li>Unique Solana NFT with product metadata</li>
                  <li>Proof of ownership on blockchain</li>
                  <li>Transferable digital asset</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMintingOrderId(null)}
              disabled={isMinting}
              data-testid="button-cancel-mint"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const order = orders?.find(o => o.id === mintingOrderId);
                if (order) handleMintNFT(order);
              }}
              disabled={isMinting}
              data-testid="button-confirm-mint"
            >
              {isMinting ? "Minting..." : "Mint NFT"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
