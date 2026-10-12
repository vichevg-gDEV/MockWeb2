/**
 * Compresses an image file client-side to ensure fast loading and reasonable localStorage footprint.
 */
export async function compressImageFile(file: File, maxDimension = 900, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Неуспешно четене на файла'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Невалиден формат на изображението'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Draw image onto canvas
        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to webp if supported, or jpeg
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Built-in preset images that admins can quickly choose for new products
 */
export const PRESET_PRODUCT_IMAGES = [
  {
    label: 'Славянска Коса (Треса / Кичури)',
    url: './src/assets/images/product_slavic_hair_1790362396264.jpg',
    category: 'extensions'
  },
  {
    label: 'Стикери Tape-In & Кератинови Капсули',
    url: './src/assets/images/product_tape_keratin_1790362406376.jpg',
    category: 'extensions'
  },
  {
    label: 'Шампоан & Салонна Грижа VIP',
    url: './src/assets/images/logo_vip_beauty_1790362373892.jpg',
    category: 'cosmetics'
  },
  {
    label: 'Трансформация Балеаж / AirTouch',
    url: './src/assets/images/transformation_balayage_1790362416484.jpg',
    category: 'care'
  },
  {
    label: 'Модел Медени Кичури & Дължина',
    url: './src/assets/images/model_honey_extensions_1790363921271.jpg',
    category: 'extensions'
  },
  {
    label: 'Модел Платинено Русо Балеаж',
    url: './src/assets/images/model_blonde_balayage_1790363897560.jpg',
    category: 'extensions'
  },
  {
    label: 'Модел Брюнетка Сгъстяване',
    url: './src/assets/images/model_brunette_volume_1790363910076.jpg',
    category: 'extensions'
  },
  {
    label: 'Официално VIP Лого Злато',
    url: './src/assets/images/vip_logo_blended_1790429525629.jpg',
    category: 'accessories'
  }
];
