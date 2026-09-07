import axiosClient from "./axiosClient";

export interface FileUploadResult {
  imageUrl: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export const mediaApi = {
  // upload raw file via FormData
  uploadImage: async (file: File, folder = "media"): Promise<FileUploadResult | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const response: unknown = await axiosClient.post("/media/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response as FileUploadResult;
    } catch (err) {
      console.warn("Failed to upload image file to media-service:", err);
      return null;
    }
  },

  // upload Base64 Data URL string
  uploadBase64Image: async (base64Data: string, folder = "media"): Promise<FileUploadResult | null> => {
    if (!base64Data || !base64Data.startsWith("data:image/")) return null;
    try {
      const response: unknown = await axiosClient.post("/media/upload-base64", {
        data: base64Data,
        folder,
      });
      return response as FileUploadResult;
    } catch (err) {
      console.warn("Failed to upload Base64 image to media-service:", err);
      return null;
    }
  },
};
