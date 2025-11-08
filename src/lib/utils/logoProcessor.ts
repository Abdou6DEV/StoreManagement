/**
 * Processes logo images for receipt printing
 * Creates ultra-clean black/white logos with no texture or artifacts
 * Uses high-resolution processing with advanced edge smoothing
 */

export function processLogoForReceipt(imageDataUrl: string): Promise<{ dataUrl: string; needsInversion: boolean }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Process at 6x resolution for ultra-clean output (no pixelation)
        const scale = 6;
        const maxWidth = 1600; // Much higher max width for maximum quality
        const aspectRatio = img.width / img.height;
        let targetWidth = img.width;
        let targetHeight = img.height;
        
        if (targetWidth > maxWidth) {
          targetWidth = maxWidth;
          targetHeight = targetWidth / aspectRatio;
        }
        
        // Process at 6x resolution for maximum quality
        const processWidth = Math.round(targetWidth * scale);
        const processHeight = Math.round(targetHeight * scale);
        
        console.log(`Processing logo at ${processWidth}x${processHeight} resolution (${scale}x scale)`);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { 
          alpha: true,
          desynchronized: false,
          willReadFrequently: false
        });
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        canvas.width = processWidth;
        canvas.height = processHeight;
        
        // Maximum quality settings
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw original image at high resolution
        ctx.drawImage(img, 0, 0, processWidth, processHeight);
        
        // Get image data at high resolution
        const imageData = ctx.getImageData(0, 0, processWidth, processHeight);
        const data = imageData.data;
        
        // Calculate average brightness to detect if logo is mostly white
        let totalBrightness = 0;
        let pixelCount = 0;
        const grayscaleData: number[] = [];
        
        // First pass: convert to grayscale and calculate brightness
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          // Convert to grayscale using luminance formula
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          grayscaleData.push(gray);
          
          // Only count non-transparent pixels
          if (a > 0) {
            totalBrightness += gray;
            pixelCount++;
          }
        }
        
        const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0;
        const needsInversion = avgBrightness > 200; // If mostly white, invert
        
        // Apply advanced smoothing with multi-pass Gaussian blur for ultra-smooth edges
        const smoothedData: number[] = [];
        const width = processWidth;
        const height = processHeight;
        
        // Multi-pass smoothing for ultra-clean edges (more passes = smoother)
        let currentData = [...grayscaleData];
        for (let pass = 0; pass < 5; pass++) {
          smoothedData.length = 0;
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              let sum = 0;
              let weight = 0;
              
              // 5x5 Gaussian kernel for smooth blur
              const kernel = [
                0.003, 0.013, 0.022, 0.013, 0.003,
                0.013, 0.059, 0.097, 0.059, 0.013,
                0.022, 0.097, 0.159, 0.097, 0.022,
                0.013, 0.059, 0.097, 0.059, 0.013,
                0.003, 0.013, 0.022, 0.013, 0.003
              ];
              
              let ki = 0;
              for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                  const nx = x + dx;
                  const ny = y + dy;
                  
                  if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const idx = ny * width + nx;
                    sum += currentData[idx] * kernel[ki];
                    weight += kernel[ki];
                  }
                  ki++;
                }
              }
              
              smoothedData.push(sum / weight);
            }
          }
          currentData = [...smoothedData];
        }
        
        // Use Otsu's method for optimal threshold
        const histogram: number[] = new Array(256).fill(0);
        let totalPixels = 0;
        
        for (let i = 0; i < smoothedData.length; i++) {
          const val = Math.round(smoothedData[i]);
          histogram[val]++;
          totalPixels++;
        }
        
        // Otsu's method to find optimal threshold
        let sum = 0;
        for (let i = 0; i < 256; i++) {
          sum += i * histogram[i];
        }
        
        let sumB = 0;
        let wB = 0;
        let wF = 0;
        let maxVariance = 0;
        let optimalThreshold = 128;
        
        for (let i = 0; i < 256; i++) {
          wB += histogram[i];
          if (wB === 0) continue;
          wF = totalPixels - wB;
          if (wF === 0) break;
          
          sumB += i * histogram[i];
          const mB = sumB / wB;
          const mF = (sum - sumB) / wF;
          const variance = wB * wF * (mB - mF) * (mB - mF);
          
          if (variance > maxVariance) {
            maxVariance = variance;
            optimalThreshold = i;
          }
        }
        
        // Use a softer approach: keep grayscale values for smooth edges
        // This prevents pixelation while still being print-friendly
        for (let i = 0; i < data.length; i += 4) {
          const pixelIdx = i / 4;
          let gray = smoothedData[pixelIdx];
          
          // Apply strong contrast enhancement for clean print
          // But keep grayscale values for smooth edges (not hard threshold)
          const contrast = 2.5; // Strong contrast for clean print
          const midpoint = 128;
          gray = ((gray - midpoint) * contrast) + midpoint;
          gray = Math.max(0, Math.min(255, gray));
          
          // Apply slight gamma correction for better print quality
          const gamma = 0.8;
          gray = Math.pow(gray / 255, gamma) * 255;
          
          // If logo is mostly white, invert
          if (needsInversion) {
            gray = 255 - gray;
          }
          
          // Set RGB to grayscale value (preserves smooth edges)
          data[i] = Math.round(gray);     // R
          data[i + 1] = Math.round(gray); // G
          data[i + 2] = Math.round(gray); // B
          // Alpha stays the same
        }
        
        // Put processed image data back
        ctx.putImageData(imageData, 0, 0);
        
        // Create final canvas at target size and scale down smoothly
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d', {
          alpha: true,
          desynchronized: false,
          willReadFrequently: false
        });
        
        if (!finalCtx) {
          reject(new Error('Could not get final canvas context'));
          return;
        }
        
        finalCanvas.width = targetWidth;
        finalCanvas.height = targetHeight;
        
        // Use maximum quality scaling
        finalCtx.imageSmoothingEnabled = true;
        finalCtx.imageSmoothingQuality = 'high';
        
        // Scale down the processed high-res image smoothly
        finalCtx.drawImage(canvas, 0, 0, processWidth, processHeight, 0, 0, targetWidth, targetHeight);
        
        // Convert to base64 PNG with maximum quality
        const processedDataUrl = finalCanvas.toDataURL('image/png', 1.0);
        console.log(`Logo processed successfully. Final size: ${targetWidth}x${targetHeight}, Processed at: ${processWidth}x${processHeight}, Inversion needed: ${needsInversion}`);
        resolve({ dataUrl: processedDataUrl, needsInversion });
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageDataUrl;
  });
}

