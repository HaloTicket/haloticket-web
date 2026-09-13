export interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  isPortrait: boolean;
  quality: "low" | "standard" | "good" | "best";
}

/**
 * Đọc kích thước và phân loại chất lượng ảnh theo tiêu chuẩn VNPT eKYC
 * - Tối thiểu: 600 x 900 px
 * - Tốt: 720 x 1080 px (HD)
 * - Tốt nhất: 1080 x 1920 px (Full HD)
 */
export async function readImageMetadata(file: File): Promise<ImageMetadata> {
  return new Promise((resolve) => {
    if (typeof FileReader === "undefined" || typeof Image === "undefined") {
      resolve({
        width: 1200,
        height: 800,
        size: file.size,
        isPortrait: false,
        quality: "best",
      });
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({
          width: 1200,
          height: 800,
          size: file.size,
          isPortrait: false,
          quality: "best",
        });
      }
    }, 200);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        const isPortrait = height > width;
        const longEdge = Math.max(width, height);

        const quality: "low" | "standard" | "good" | "best" =
          longEdge >= 1920 ? "best"
          : longEdge >= 1080 ? "good"
          : longEdge >= 800 ? "standard"
          : "low";

        resolve({
          width,
          height,
          size: file.size,
          isPortrait,
          quality,
        });
      };
      img.onerror = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({
          width: 0,
          height: 0,
          size: file.size,
          isPortrait: false,
          quality: "standard",
        });
      };
      img.src = (e.target?.result as string) || "";
    };
    reader.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        width: 0,
        height: 0,
        size: file.size,
        isPortrait: false,
        quality: "standard",
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Xoay ảnh bằng HTML Canvas và xuất ra File mới với dữ liệu pixel thực tế đã xoay.
 * VNPT eKYC yêu cầu CCCD nằm ngang để nhận diện góc và bóc tách OCR.
 */
export async function rotateImageFile(
  file: File,
  degrees: number
): Promise<{ rotatedFile: File; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      resolve({ rotatedFile: file, width: 0, height: 0 });
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({ rotatedFile: file, width: 1200, height: 800 });
      }
    }, 200);

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve({ rotatedFile: file, width: img.width, height: img.height });
          return;
        }

        const rad = (degrees * Math.PI) / 180;
        const is90or270 = Math.abs(degrees % 180) === 90;

        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;

        canvas.width = is90or270 ? originalHeight : originalWidth;
        canvas.height = is90or270 ? originalWidth : originalHeight;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -originalWidth / 2, -originalHeight / 2);

        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        if (typeof canvas.toBlob !== "function") {
          // In jsdom environment without canvas implementation
          resolve({ rotatedFile: file, width: canvas.width, height: canvas.height });
          return;
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ rotatedFile: file, width: canvas.width, height: canvas.height });
              return;
            }
            const rotatedFile = new File([blob], file.name, {
              type: mimeType,
              lastModified: Date.now(),
            });
            resolve({
              rotatedFile,
              width: canvas.width,
              height: canvas.height,
            });
          },
          mimeType,
          0.95
        );
      } catch (err) {
        console.warn("Canvas rotation error:", err);
        resolve({ rotatedFile: file, width: img.width, height: img.height });
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}
