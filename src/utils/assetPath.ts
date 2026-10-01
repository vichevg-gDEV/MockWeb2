import React from 'react';

/**
 * Resolves an asset path to work both locally and on GitHub Pages (subpaths like /MockWeb2/)
 */
export function getAssetUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  
  // Strip leading ./ or /
  const clean = path.replace(/^(\.\/|\/)+/, '');
  const base = import.meta.env.BASE_URL || './';
  
  return base.endsWith('/') ? `${base}${clean}` : `${base}/${clean}`;
}

/**
 * Graceful fallback handler for <img> onError
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fallbackPath?: string
) {
  const target = e.currentTarget;
  if (!target.dataset.triedFallback) {
    target.dataset.triedFallback = 'true';
    if (fallbackPath) {
      target.src = getAssetUrl(fallbackPath);
      return;
    }
    // If it was looking under src/assets/images, try public/images
    if (target.src.includes('src/assets/images/')) {
      target.src = target.src.replace('src/assets/images/', 'images/');
      return;
    }
    // Fallback to logo
    target.src = getAssetUrl('logo.png');
  }
}
