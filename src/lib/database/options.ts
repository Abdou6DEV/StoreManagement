import { prisma } from "./prismaClient";

// Simple in-memory cache for options to reduce database calls
const optionsCache = new Map<string, { value: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${i + 1} failed:`, error);
      
      if (i < maxRetries - 1) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError!;
}

export async function getOption(key: string): Promise<string | null> {
  // Check cache first
  const cached = optionsCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.value;
  }

  try {
    const value = await withRetry(async () => {
      const option = await prisma.option.findUnique({ 
        where: { key }
      });
      return option ? option.value : null;
    });

    // Cache the result
    if (value !== null) {
      optionsCache.set(key, { value, timestamp: Date.now() });
    }

    return value;
  } catch (error) {
    console.error(`Failed to get option ${key}:`, error);
    // Return default values for common options to prevent app crashes
    const defaults: Record<string, string> = {
      'lowStockThreshold': '5',
      'currency': 'MAD',
      'language': 'en',
      'enableOverdueServicesBadge': 'true',
      'enableLowStockBadge': 'true',
      'enableOutOfStockBadge': 'true',
      'enableDueSoonServicesBadge': 'true'
    };
    return defaults[key] || null;
  }
}

export async function setOption(key: string, value: string): Promise<void> {
  try {
    await withRetry(async () => {
      await prisma.option.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });
    });

    // Update cache
    optionsCache.set(key, { value, timestamp: Date.now() });
  } catch (error) {
    console.error(`Failed to set option ${key}:`, error);
    throw error;
  }
}

export function clearOptionsCache(): void {
  optionsCache.clear();
}
