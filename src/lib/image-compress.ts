/**
 * 图片压缩工具 - 上传前自动压缩图片节省存储空间
 * Supabase 免费套餐只有 1GB 存储，压缩后每张约 200-500KB
 */

export interface CompressOptions {
  maxWidth?: number;
  quality?: number;
}

export function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<Blob> {
  const { maxWidth = 1600, quality = 0.7 } = options;

  return new Promise((resolve, reject) => {
    // 非图片直接返回
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // 按比例缩放到 maxWidth 以内
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      // 设置 willReadFrequently 优化读取性能
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            // 如果压缩后反而更大，返回原文件
            resolve(blob.size < file.size ? blob : file);
          } else {
            reject(new Error("Compression failed"));
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}
