// Reads a chosen picture and shrinks it so it can be saved with the record
// (max 1280 px on the longer side, JPEG). Returns a data URL, or null if the file is not an image.
export function imageToDataUrl(file, maxSide = 1280, quality = 0.8) {
  return new Promise((resolve) => {
    if (!file || !/^image\//i.test(file.type || '')) return resolve(null);
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(null);
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
