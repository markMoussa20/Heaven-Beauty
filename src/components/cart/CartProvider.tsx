"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CART_STORAGE_KEY = "heaven-beauty-cart";

export type CartItem = {
  countryItemId: string;
  productId: string;
  name: string;
  imageUrl?: string | null;
  unitPrice: number;
  currencyCode: string;
  currencySymbol: string;
  countryCode: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  hydrated: boolean;
  isCartOpen: boolean;
  subtotal: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  closeCart: () => void;
  openCart: () => void;
  updateQuantity: (countryItemId: string, quantity: number) => void;
  removeItem: (countryItemId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cartVersion, setCartVersion] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setItems(readStoredCart());
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [cartVersion, hydrated, items]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      setItems((currentItems) => {
        const sameCountryItems = currentItems.filter(
          (currentItem) => currentItem.countryCode === item.countryCode,
        );
        const existingItem = sameCountryItems.find(
          (currentItem) => currentItem.countryItemId === item.countryItemId,
        );

        if (existingItem) {
          return sameCountryItems.map((currentItem) =>
            currentItem.countryItemId === item.countryItemId
              ? {
                  ...currentItem,
                  quantity: currentItem.quantity + quantity,
                  unitPrice: item.unitPrice,
                }
              : currentItem,
          );
        }

        return [...sameCountryItems, { ...item, quantity }];
      });
      setCartVersion((version) => version + 1);
    },
    [],
  );

  const updateQuantity = useCallback((countryItemId: string, quantity: number) => {
    setItems((currentItems) =>
      currentItems
        .map((item) =>
          item.countryItemId === countryItemId
            ? { ...item, quantity: Math.max(0, quantity) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
    setCartVersion((version) => version + 1);
  }, []);

  const removeItem = useCallback((countryItemId: string) => {
    setItems((currentItems) =>
      currentItems.filter((item) => item.countryItemId !== countryItemId),
    );
    setCartVersion((version) => version + 1);
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    window.localStorage.removeItem(CART_STORAGE_KEY);
    setCartVersion((version) => version + 1);
  }, []);

  const openCart = useCallback(() => {
    setIsCartOpen(true);
  }, []);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    const count = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      items,
      count,
      hydrated,
      isCartOpen,
      subtotal,
      addItem,
      closeCart,
      openCart,
      updateQuantity,
      removeItem,
      clearCart,
    };
  }, [
    addItem,
    clearCart,
    closeCart,
    hydrated,
    isCartOpen,
    items,
    openCart,
    removeItem,
    updateQuantity,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function readStoredCart() {
  if (typeof window === "undefined") {
    return [];
  }

  const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!storedCart) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedCart) as CartItem[];
    return parsed.filter(
      (item) => item.countryItemId && item.productId && item.quantity > 0,
    );
  } catch {
    window.localStorage.removeItem(CART_STORAGE_KEY);
    return [];
  }
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider.");
  }

  return context;
}
