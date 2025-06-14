import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// FileRouter for your app, kimlik doğrulama YOK
export const ourFileRouter = {
  imageUploader: f({
    image: { maxFileSize: "1GB", maxFileCount: 200 },
    video: { maxFileSize: "1GB", maxFileCount: 50 },
    audio: { maxFileSize: "64MB", maxFileCount: 100 }, // Ses dosyası limitini artırdık
  })
    .middleware(async () => {
      // Herkes dosya yükleyebilir – auth yok
      return { userId: "anonymous" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("✅ Upload complete by:", metadata.userId);
      console.log("📁 File URL:", file.url);
      console.log("🎵 File type:", file.type);
      console.log("📏 File size:", file.size);
      console.log("📝 File name:", file.name);
      
      // Başarılı upload'u onaylamak için bir response döndürüyoruz
      return { 
        uploadedBy: metadata.userId,
        fileUrl: file.url,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        success: true
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
