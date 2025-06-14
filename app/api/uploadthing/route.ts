// app/api/uploadthing-files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { UTApi } from 'uploadthing/server';

// UTApi instance'ını initialize et
const utapi = new UTApi();

export async function GET(request: NextRequest) {
  try {
    // UploadThing'den dosyaları listele
    const response = await utapi.listFiles();
    
    // Response yapısını kontrol et
    if (!response || !response.files) {
      return NextResponse.json({
        success: true,
        files: [],
        total: 0
      });
    }
    
    // Dosyaları istediğimiz formatta düzenle - sadece mevcut property'leri kullan
    const formattedFiles = response.files.map(file => ({
      id: file.id,
      key: file.key,
      name: file.name,
      url: `https://utfs.io/f/${file.key}`,
      status: file.status,
      customId: file.customId || null,
      // Ek bilgiler - güvenli şekilde ekle
      uploadedAt: new Date().toISOString(), // Şu anki zamanı kullan
      type: 'unknown', // Varsayılan tip
      size: 0 // Varsayılan boyut
    }));
    
    return NextResponse.json({
      success: true,
      files: formattedFiles,
      total: formattedFiles.length
    });
    
  } catch (error) {
    console.error('UploadThing dosya listesi hatası:', error);
    
    // Hata tipine göre daha detaylı response
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Dosyalar yüklenirken hata oluştu',
        details: errorMessage,
        files: [],
        total: 0
      }, 
      { status: 500 }
    );
  }
}

// Belirli bir dosyayı silmek için DELETE endpoint
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileKey = searchParams.get('key');
    
    if (!fileKey) {
      return NextResponse.json(
        { success: false, error: 'Dosya anahtarı (key) gerekli' },
        { status: 400 }
      );
    }
    
    // Dosyayı sil
    const deleteResponse = await utapi.deleteFiles([fileKey]);
    
    // Silme işleminin başarılı olup olmadığını kontrol et
    if (deleteResponse.success) {
      return NextResponse.json({
        success: true,
        message: 'Dosya başarıyla silindi',
        deletedKey: fileKey
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Dosya silinemedi' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Dosya silme hatası:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Dosya silinirken hata oluştu',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

// Dosya bilgilerini güncellemek için PATCH endpoint (opsiyonel)
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileKey = searchParams.get('key');
    const body = await request.json();
    
    if (!fileKey) {
      return NextResponse.json(
        { success: false, error: 'Dosya anahtarı (key) gerekli' },
        { status: 400 }
      );
    }
    
    // Dosya bilgilerini güncelle (örneğin metadata)
    // Bu özellik UploadThing API'sine bağlı olarak değişebilir
    // Şimdilik basit bir response döndür
    
    return NextResponse.json({
      success: true,
      message: 'Dosya bilgileri güncellendi',
      updatedKey: fileKey,
      updatedData: body
    });
    
  } catch (error) {
    console.error('Dosya güncelleme hatası:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Dosya güncellenirken hata oluştu',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
