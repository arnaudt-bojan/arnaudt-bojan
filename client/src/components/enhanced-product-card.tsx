import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Eye, Heart } from "lucide-react";
import { motion } from "framer-motion";
import type { Product } from "@shared/schema";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useState } from "react";

interface EnhancedProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  index: number;
}

const productTypeColors = {
  "made-to-order": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  "pre-order": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "in-stock": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "wholesale": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

export function EnhancedProductCard({ product, onAddToCart, onQuickView, index }: EnhancedProductCardProps) {
  const { formatPrice } = useCurrency();
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const imageUrl = product.images?.[0] || "/placeholder-product.png";
  const typeColor = productTypeColors[product.productType as keyof typeof productTypeColors] || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <motion.div
        whileHover={{ y: -8 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="overflow-hidden hover-elevate transition-smooth group relative h-full flex flex-col glass">
          {/* Image Container */}
          <div className="relative aspect-square overflow-visible bg-muted">
            <motion.img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              data-testid={`img-product-${product.id}`}
            />

            {/* Product Type Badge */}
            <motion.div
              className="absolute top-3 left-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Badge variant="outline" className={`${typeColor} glass-strong text-xs font-medium`}>
                {product.productType}
              </Badge>
            </motion.div>

            {/* Like Button */}
            <motion.div
              className="absolute top-3 right-3"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                size="icon"
                variant="ghost"
                className="rounded-full glass-strong transition-smooth"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLiked(!isLiked);
                }}
                data-testid={`button-like-${product.id}`}
              >
                <motion.div
                  animate={{ rotate: isLiked ? [0, -10, 10, -10, 0] : 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Heart className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                </motion.div>
              </Button>
            </motion.div>

            {/* Quick View Overlay */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ pointerEvents: isHovered ? 'auto' : 'none' }}
            >
              {onQuickView && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: isHovered ? 1 : 0.8, opacity: isHovered ? 1 : 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="glass-strong text-white transition-smooth"
                    onClick={() => onQuickView(product)}
                    data-testid={`button-quick-view-${product.id}`}
                  >
                    <Eye className="h-5 w-5" />
                  </Button>
                </motion.div>
              )}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: isHovered ? 1 : 0.8, opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.2, delay: 0.15 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="glass-strong text-white transition-smooth"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(product);
                  }}
                  data-testid={`button-add-to-cart-${product.id}`}
                >
                  <ShoppingCart className="h-5 w-5" />
                </Button>
              </motion.div>
            </motion.div>
          </div>

          {/* Product Info */}
          <div className="p-4 flex-1 flex flex-col">
            <motion.h3
              className="font-semibold text-lg mb-2 line-clamp-2"
              data-testid={`text-product-name-${product.id}`}
            >
              {product.name}
            </motion.h3>

            {product.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {product.description}
              </p>
            )}

            <div className="mt-auto flex items-center justify-between">
              <div
                className="text-2xl font-bold"
                data-testid={`text-price-${product.id}`}
              >
                {formatPrice(parseFloat(product.price))}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                data-testid={`button-add-cart-${product.id}`}
              >
                <ShoppingCart className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
