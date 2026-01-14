/**
 * Premium Filter Pack - Cinematic Camera Looks
 * All filters are applied via Canvas pixel manipulation and baked into captured images
 */

// Helper function to clamp values between 0-255
const clamp = (value) => Math.max(0, Math.min(255, value));

// Helper function to apply vignette effect
const applyVignette = (imageData, strength = 0.3) => {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const vignette = 1 - (dist / maxDist) * strength;
      
      data[idx] = clamp(data[idx] * vignette);
      data[idx + 1] = clamp(data[idx + 1] * vignette);
      data[idx + 2] = clamp(data[idx + 2] * vignette);
    }
  }
};

// Helper function to add film grain
const addFilmGrain = (imageData, intensity = 15) => {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const grain = (Math.random() - 0.5) * intensity;
    data[i] = clamp(data[i] + grain);
    data[i + 1] = clamp(data[i + 1] + grain);
    data[i + 2] = clamp(data[i + 2] + grain);
  }
};

// Helper function to add glow effect
const addGlow = (ctx, canvas, intensity = 0.15) => {
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = intensity;
  ctx.filter = 'blur(20px)';
  ctx.drawImage(canvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
};

/**
 * PREMIUM FILTERS - General Purpose
 */

// 1. LUXURY - Rich, glossy, high-end (Vogue, Dior, premium wedding films)
export const applyLuxuryFilter = (ctx, canvas) => {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Warm tone
    r = r * 1.05;
    g = g * 1.02;
    b = b * 0.95;

    // Lift midtones
    const luminance = (r + g + b) / 3;
    if (luminance > 60 && luminance < 200) {
      r = r * 1.08;
      g = g * 1.06;
      b = b * 1.04;
    }

    // Deep blacks
    if (luminance < 50) {
      r = r * 0.85;
      g = g * 0.85;
      b = b * 0.85;
    }

    // Mild clarity boost (contrast in midtones)
    const mid = 128;
    r = mid + (r - mid) * 1.1;
    g = mid + (g - mid) * 1.1;
    b = mid + (b - mid) * 1.1;

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }

  // Subtle vignette
  applyVignette(imageData, 0.2);
  ctx.putImageData(imageData, 0, 0);

  // Slight highlight glow
  addGlow(ctx, canvas, 0.08);
};

// 2. NIGHT - For dark parties, concerts, DJ nights
export const applyNightFilter = (ctx, canvas) => {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Boost exposure
    r = r * 1.15;
    g = g * 1.15;
    b = b * 1.2;

    // Strong contrast
    const mid = 128;
    r = mid + (r - mid) * 1.3;
    g = mid + (g - mid) * 1.3;
    b = mid + (b - mid) * 1.35;

    // Cool shadows (blue tint in darks)
    const luminance = (r + g + b) / 3;
    if (luminance < 100) {
      r = r * 0.9;
      g = g * 0.95;
      b = b * 1.15;
    }

    // Neon-friendly saturation boost
    const avg = (r + g + b) / 3;
    r = avg + (r - avg) * 1.4;
    g = avg + (g - avg) * 1.4;
    b = avg + (b - avg) * 1.4;

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }

  ctx.putImageData(imageData, 0, 0);
};

// 3. PASTEL - Soft, airy, Instagram-friendly
export const applyPastelFilter = (ctx, canvas) => {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Warm white balance
    r = r * 1.06;
    g = g * 1.02;
    b = b * 0.94;

    // Lower contrast
    const mid = 128;
    r = mid + (r - mid) * 0.85;
    g = mid + (g - mid) * 0.85;
    b = mid + (b - mid) * 0.85;

    // Reduce saturation
    const avg = (r + g + b) / 3;
    r = avg + (r - avg) * 0.7;
    g = avg + (g - avg) * 0.7;
    b = avg + (b - avg) * 0.7;

    // Lift blacks
    r = r + 20;
    g = g + 18;
    b = b + 15;

    // Brighten overall
    r = r * 1.1;
    g = g * 1.1;
    b = b * 1.08;

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }

  ctx.putImageData(imageData, 0, 0);

  // Soft glow
  addGlow(ctx, canvas, 0.12);
};

// 4. FILM - Analog, nostalgic (Kodak, Fuji)
export const applyFilmFilter = (ctx, canvas) => {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Warm highlights
    const luminance = (r + g + b) / 3;
    if (luminance > 150) {
      r = r * 1.08;
      g = g * 1.04;
      b = b * 0.95;
    }

    // Green in shadows
    if (luminance < 80) {
      r = r * 0.95;
      g = g * 1.05;
      b = b * 0.98;
    }

    // Faded blacks (lift blacks significantly)
    r = r + 25;
    g = g + 22;
    b = b + 20;

    // Moderate contrast
    const mid = 128;
    r = mid + (r - mid) * 1.05;
    g = mid + (g - mid) * 1.05;
    b = mid + (b - mid) * 1.0;

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }

  // Film grain
  addFilmGrain(imageData, 18);
  
  // Vignette
  applyVignette(imageData, 0.35);
  
  ctx.putImageData(imageData, 0, 0);
};

// 5. EDITORIAL - Sharp, dramatic, magazine-style
export const applyEditorialFilter = (ctx, canvas) => {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Neutral colors (slight desaturation)
    const avg = (r + g + b) / 3;
    r = avg + (r - avg) * 0.9;
    g = avg + (g - avg) * 0.9;
    b = avg + (b - avg) * 0.9;

    // High contrast
    const mid = 128;
    r = mid + (r - mid) * 1.35;
    g = mid + (g - mid) * 1.35;
    b = mid + (b - mid) * 1.35;

    // Controlled highlights (prevent blowout)
    if (r > 240) r = 240 + (r - 240) * 0.3;
    if (g > 240) g = 240 + (g - 240) * 0.3;
    if (b > 240) b = 240 + (b - 240) * 0.3;

    // Deep shadows
    if (r < 30) r = r * 0.8;
    if (g < 30) g = g * 0.8;
    if (b < 30) b = b * 0.8;

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }

  // Subtle vignette
  applyVignette(imageData, 0.25);
  
  ctx.putImageData(imageData, 0, 0);
};

/**
 * WEDDING LOOK PACK - Optimized for skin tones, dresses, emotional moments
 */

// 1. ROMANCE - Warm, glowing love (close-ups, couples, smiles)
export const applyRomanceFilter = (ctx, canvas) => {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Warm tones
    r = r * 1.1;
    g = g * 1.04;
    b = b * 0.92;

    // Reduce contrast for softness
    const mid = 128;
    r = mid + (r - mid) * 0.9;
    g = mid + (g - mid) * 0.9;
    b = mid + (b - mid) * 0.88;

    // Lift highlights
    const luminance = (r + g + b) / 3;
    if (luminance > 150) {
      r = r * 1.08;
      g = g * 1.06;
      b = b * 1.02;
    }

    // Skin smoothing effect (reduce harsh shadows)
    if (luminance > 80 && luminance < 200) {
      r = r * 1.03;
      g = g * 1.02;
      b = b * 1.0;
    }

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }

  ctx.putImageData(imageData, 0, 0);

  // Glow effect
  addGlow(ctx, canvas, 0.15);
};

// 2. ROYAL - Grand, cinematic (mandap, decor, bridal entry)
export const applyRoyalFilter = (ctx, canvas) => {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Rich, deep contrast
    const mid = 128;
    r = mid + (r - mid) * 1.25;
    g = mid + (g - mid) * 1.2;
    b = mid + (b - mid) * 1.15;

    // Gold tint (warm highlights, rich shadows)
    const luminance = (r + g + b) / 3;
    if (luminance > 140) {
      r = r * 1.08;
      g = g * 1.02;
      b = b * 0.92;
    }

    // Rich color saturation
    const avg = (r + g + b) / 3;
    r = avg + (r - avg) * 1.2;
    g = avg + (g - avg) * 1.15;
    b = avg + (b - avg) * 1.1;

    // Deep blacks
    if (luminance < 40) {
      r = r * 0.85;
      g = g * 0.85;
      b = b * 0.88;
    }

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }

  ctx.putImageData(imageData, 0, 0);
};

// 3. PURE - Clean, bright, white-dress friendly
export const applyPureFilter = (ctx, canvas) => {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Neutral white balance (remove color casts)
    const avg = (r + g + b) / 3;
    r = avg + (r - avg) * 0.95;
    g = avg + (g - avg) * 0.95;
    b = avg + (b - avg) * 0.95;

    // Lift whites
    const luminance = (r + g + b) / 3;
    if (luminance > 180) {
      r = r * 1.05;
      g = g * 1.05;
      b = b * 1.05;
    }

    // Soft contrast
    const mid = 128;
    r = mid + (r - mid) * 1.05;
    g = mid + (g - mid) * 1.05;
    b = mid + (b - mid) * 1.05;

    // Brighten overall
    r = r * 1.08;
    g = g * 1.08;
    b = b * 1.08;

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }

  ctx.putImageData(imageData, 0, 0);
};

// 4. CANDLE - For night weddings & receptions (haldi, mehndi, reception lights)
export const applyCandleFilter = (ctx, canvas) => {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Warm highlights (candlelight feel)
    const luminance = (r + g + b) / 3;
    if (luminance > 100) {
      r = r * 1.15;
      g = g * 1.05;
      b = b * 0.88;
    }

    // Soft shadows
    if (luminance < 80) {
      r = r + 15;
      g = g + 12;
      b = b + 8;
    }

    // Reduce contrast for soft look
    const mid = 128;
    r = mid + (r - mid) * 0.92;
    g = mid + (g - mid) * 0.92;
    b = mid + (b - mid) * 0.9;

    // Noise reduction simulation (smooth tones)
    r = r * 1.02;
    g = g * 1.0;
    b = b * 0.95;

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }

  ctx.putImageData(imageData, 0, 0);

  // Gentle glow
  addGlow(ctx, canvas, 0.12);
};

// 5. MEMORY - Soft nostalgic look
export const applyMemoryFilter = (ctx, canvas) => {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Warm tone
    r = r * 1.08;
    g = g * 1.02;
    b = b * 0.94;

    // Slight fade (lift blacks)
    r = r + 30;
    g = g + 25;
    b = b + 20;

    // Low contrast
    const mid = 128;
    r = mid + (r - mid) * 0.85;
    g = mid + (g - mid) * 0.85;
    b = mid + (b - mid) * 0.82;

    // Soft desaturation
    const avg = (r + g + b) / 3;
    r = avg + (r - avg) * 0.85;
    g = avg + (g - avg) * 0.85;
    b = avg + (b - avg) * 0.85;

    data[i] = clamp(r);
    data[i + 1] = clamp(g);
    data[i + 2] = clamp(b);
  }

  // Gentle grain
  addFilmGrain(imageData, 10);
  
  ctx.putImageData(imageData, 0, 0);
};

/**
 * Filter Registry - Maps filter names to their apply functions
 */
export const PREMIUM_FILTERS = {
  // Premium Pack
  luxury: { name: 'Luxury', apply: applyLuxuryFilter, category: 'premium', description: 'Rich, glossy, high-end look' },
  night: { name: 'Night', apply: applyNightFilter, category: 'premium', description: 'Perfect for parties & clubs' },
  pastel: { name: 'Pastel', apply: applyPastelFilter, category: 'premium', description: 'Soft, airy, Instagram-ready' },
  film: { name: 'Film', apply: applyFilmFilter, category: 'premium', description: 'Analog nostalgic feel' },
  editorial: { name: 'Editorial', apply: applyEditorialFilter, category: 'premium', description: 'Sharp, magazine-style' },
  
  // Wedding Pack
  romance: { name: 'Romance', apply: applyRomanceFilter, category: 'wedding', description: 'Warm, glowing love' },
  royal: { name: 'Royal', apply: applyRoyalFilter, category: 'wedding', description: 'Grand, cinematic look' },
  pure: { name: 'Pure', apply: applyPureFilter, category: 'wedding', description: 'Clean, white-dress friendly' },
  candle: { name: 'Candle', apply: applyCandleFilter, category: 'wedding', description: 'Night wedding warmth' },
  memory: { name: 'Memory', apply: applyMemoryFilter, category: 'wedding', description: 'Soft nostalgic moments' },
};

/**
 * Apply filter to canvas - Main entry point
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} filterType - Filter key from PREMIUM_FILTERS
 */
export const applyFilter = (ctx, canvas, filterType) => {
  const filter = PREMIUM_FILTERS[filterType];
  if (filter && filter.apply) {
    filter.apply(ctx, canvas);
  }
};

/**
 * Get CSS preview filter (simplified version for live preview)
 * These are approximate CSS filters for real-time preview on video element
 */
export const getPreviewFilter = (filterType) => {
  const previewFilters = {
    // Premium Pack
    luxury: 'brightness(1.08) contrast(1.1) saturate(1.15) sepia(0.08)',
    night: 'brightness(1.15) contrast(1.3) saturate(1.4) hue-rotate(-10deg)',
    pastel: 'brightness(1.15) contrast(0.85) saturate(0.7) sepia(0.1)',
    film: 'brightness(1.0) contrast(1.05) saturate(0.9) sepia(0.2)',
    editorial: 'brightness(1.02) contrast(1.35) saturate(0.9) grayscale(0.05)',
    
    // Wedding Pack
    romance: 'brightness(1.1) contrast(0.9) saturate(1.1) sepia(0.12)',
    royal: 'brightness(1.05) contrast(1.25) saturate(1.2) sepia(0.08)',
    pure: 'brightness(1.12) contrast(1.05) saturate(0.95)',
    candle: 'brightness(1.08) contrast(0.92) saturate(1.1) sepia(0.15)',
    memory: 'brightness(1.05) contrast(0.85) saturate(0.85) sepia(0.18)',
  };
  
  return previewFilters[filterType] || 'none';
};

export default PREMIUM_FILTERS;
