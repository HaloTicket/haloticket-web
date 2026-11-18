import axiosClient from "./axiosClient";

/** Kết quả tải tệp lên dịch vụ media: đường dẫn, tên, kích thước và loại nội dung. */
export interface FileUploadResult {
  imageUrl: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export const mediaApi = {
    /** Tải ảnh lên dịch vụ media bằng FormData theo thư mục chỉ định; lỗi thì trả về `null`. */
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

    /** Tải ảnh dạng chuỗi Base64 Data URL (phải bắt đầu bằng `data:image/`); không hợp lệ hoặc lỗi thì trả về `null`. */
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

    /** Tải video lên dịch vụ media bằng FormData (tối đa 20MB); lỗi thì trả về `null`. */
  uploadVideo: async (file: File, folder = "videos"): Promise<FileUploadResult | null> => {
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
      console.warn("Failed to upload video file to media-service:", err);
      return null;
    }
  },
};
