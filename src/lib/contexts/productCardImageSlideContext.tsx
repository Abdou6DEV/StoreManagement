import React, { createContext, useContext, useState, useEffect } from "react";

interface ProductCardImageSlideContextType {
  isEnabled: boolean;
  isLoading: boolean;
}

const ProductCardImageSlideContext = createContext<
  ProductCardImageSlideContextType | undefined
>(undefined);

interface ProductCardImageSlideProviderProps {
  children: React.ReactNode;
}

export const ProductCardImageSlideProvider: React.FC<
  ProductCardImageSlideProviderProps
> = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadSetting = () => {
      window.api.database.options
        .get("enableProductCardImageSlide")
        .then((val) => {
          setIsEnabled(val !== "false");
          setIsLoading(false);
        })
        .catch(() => {
          setIsEnabled(true);
          setIsLoading(false);
        });
    };

    loadSetting();

    const interval = setInterval(loadSetting, 2000);
    return () => clearInterval(interval);
  }, []);

  const value: ProductCardImageSlideContextType = {
    isEnabled,
    isLoading,
  };

  return (
    <ProductCardImageSlideContext.Provider value={value}>
      {children}
    </ProductCardImageSlideContext.Provider>
  );
};

export const useProductCardImageSlide = (): ProductCardImageSlideContextType => {
  const context = useContext(ProductCardImageSlideContext);
  if (context === undefined) {
    throw new Error(
      "useProductCardImageSlide must be used within a ProductCardImageSlideProvider",
    );
  }
  return context;
};
