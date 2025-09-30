import { ProductFormData } from "@/modules/products/validation/product";
import { useMemo, useEffect, useState, useCallback } from "react";

// Extended interface for useStocks that includes variants
interface ProductWithVariants extends ProductFormData {
  variants?: Array<{
    ageGroup?: string;
    size?: string;
    color?: string;
    stock: number;
  }>;
}

interface UseStocksProps {
  initialData?: ProductWithVariants;
  attributes: [string[], string[], string[]]; // [ageGroups, sizes, colors]
}

// Updated StockItem to have named fields
interface StockItem {
  _id?: string; // Optional ID for existing items
  ageGroup?: string;
  size?: string;
  color?: string;
  stock: number;
}

const INITIAL_STOCK = 1;

// Modified to create objects with named fields
export const generateCombinations = (
  attrArrays: string[][],
  index: number = 0,
  current: { ageGroup?: string; size?: string; color?: string } = {}
): Array<{ ageGroup?: string; size?: string; color?: string }> => {
  // Return empty array if all attribute arrays are empty
  if (attrArrays.every((arr) => arr.length === 0)) {
    return [
      {
        // Default stock for empty combinations
      },
    ];
  }

  // Return current object if we've processed all attribute arrays
  if (index === attrArrays.length) {
    return [current];
  }

  // Skip empty arrays
  if (attrArrays[index].length === 0) {
    return generateCombinations(attrArrays, index + 1, current);
  }

  const combinations: Array<{
    ageGroup?: string;
    size?: string;
    color?: string;
  }> = [];

  for (const value of attrArrays[index]) {
    // Create a new combination based on the current index (field type)
    const newCombination = { ...current };

    // Assign the value to the appropriate field based on index
    if (index === 0) newCombination.ageGroup = value;
    else if (index === 1) newCombination.size = value;
    else if (index === 2) newCombination.color = value;

    // Recursively generate combinations for the next index
    const nextCombinations = generateCombinations(
      attrArrays,
      index + 1,
      newCombination
    );

    combinations.push(...nextCombinations);
  }

  return combinations;
};

/**
 * Hook to generate all possible combinations of attributes with stock
 * @param attributes An array of arrays: [ageGroups, sizes, colors]
 * @returns An object with stocks array and setStockCount function
 */
export const useStocks = ({ initialData, attributes }: UseStocksProps) => {
  const [stocks, setStocks] = useState<Record<string, StockItem>>({});

  // Generate combinations whenever attributes change
  const combinations = useMemo(() => {
    // Filter out empty attribute arrays
    const filteredAttributes = [...attributes]; // Create a copy to avoid mutating the original

    // Generate combinations with named fields
    return generateCombinations(filteredAttributes);
  }, [attributes]);

  // Update the stocks state whenever combinations change
  useEffect(() => {
    if (combinations.length === 0) return;

    // Create new stocks object preserving existing counts
    const newStocks: Record<string, StockItem> = {};

    // Add all new combinations
    combinations.forEach((combo) => {
      // Create a key from the combination fields
      const key = JSON.stringify({
        ageGroup: combo.ageGroup,
        size: combo.size,
        color: combo.color,
      });

      // If this combination already exists, keep its count, otherwise initialize
      // For initial data with variants, try to find matching variant
      let initialStock = 0;
      if (initialData?.variants) {
        const matchingVariant = initialData.variants.find(
          (variant) =>
            variant.ageGroup === combo.ageGroup &&
            variant.size === combo.size &&
            variant.color === combo.color
        );
        initialStock = matchingVariant?.stock || INITIAL_STOCK;
      }

      newStocks[key] = {
        ...combo,
        stock: stocks[key]?.stock || initialStock,
      };
    });

    // Only update state if something changed
    if (
      JSON.stringify(Object.keys(newStocks).sort()) !==
      JSON.stringify(Object.keys(stocks).sort())
    ) {
      setStocks(newStocks);
    }
  }, [combinations, stocks, initialData?.variants]);

  // Function to update stock count by combination fields
  const setStockCount = useCallback(
    (
      combo: { ageGroup?: string; size?: string; color?: string },
      stock: number
    ) => {
      const key = JSON.stringify({
        ageGroup: combo.ageGroup,
        size: combo.size,
        color: combo.color,
      });

      setStocks((prevStocks) => {
        // Check if this combination exists
        if (!prevStocks[key]) {
          console.warn(`Stock combination not found: ${JSON.stringify(combo)}`);
          return prevStocks;
        }

        // Return updated stocks
        return {
          ...prevStocks,
          [key]: {
            ...prevStocks[key],
            stock,
          },
        };
      });
    },
    []
  );

  const [isInitialRender, setIsInitialRender] = useState(true);

  // Initialize stock counts from initialData variants when combinations are ready
  useEffect(() => {
    if (combinations.length > 0 && isInitialRender && initialData?.variants) {
      console.log("Setting initial stock counts:", initialData.variants);

      initialData.variants.forEach((variant) => {
        console.log("Setting variant:", variant);
        setStockCount(variant, variant.stock);
      });

      setIsInitialRender(false);
    }
  }, [
    combinations.length,
    isInitialRender,
    initialData?.variants,
    setStockCount,
  ]);

  // Calculate total count from all stock items
  const totalCount = useMemo(
    () => Object.values(stocks).reduce((sum, item) => sum + item.stock, 0),
    [stocks]
  );

  // Return both the stocks array, the setter function, and total count
  return {
    stocks: useMemo(() => Object.values(stocks), [stocks]),
    setStockCount,
    totalCount,
  };
};
