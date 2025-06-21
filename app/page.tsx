"use client";
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { Download, Eye, Music, Video, Calendar, HardDrive, X, Camera, DownloadCloud, Trash2, AlertTriangle, FileText } from 'lucide-react';

// Tip tanımlamaları
interface FileData {
  key: string;
  name: string;
  fileName?: string;
  url: string;
  size?: number;
  fileSize?: number;
  type?: string;
  fileType?: 'image' | 'video' | 'audio' | 'text' | null;
}

interface ParticipantsData {
  participants: string[];
  lastUpdated: string;
  totalCount: number;
}

interface FileSystemDirectoryHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write(data: any): Promise<void>;
  close(): Promise<void>;
}

declare global {
  interface Window {
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }
}

const FileViewer: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio' | 'text' | 'participants'>('all');
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const [isDeletingAll, setIsDeletingAll] = useState<boolean>(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState<boolean>(false);
  const [fileToDelete, setFileToDelete] = useState<FileData | null>(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deletedCountInfo, setDeletedCountInfo] = useState(0);
  const [textContent, setTextContent] = useState<{[key: string]: string}>({});
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState<boolean>(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  
// Katılımcıları yükle - Alternatif yöntem
  const loadParticipants = async (): Promise<void> => {
    try {
      setParticipantsLoading(true);
      
      // Önce normal yöntemle dene
      const response = await fetch('/api/uploadthing');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Tüm dosyalar:', data.files.map((file: any) => file.name || file.fileName));
        
        // Katılımcı dosyasını bul
        const participantsFile = data.files.find((file: any) => {
          const fileName = (file.name || file.fileName || '').toLowerCase();
          return fileName.includes('katilimci') || 
                 fileName.includes('katılımcı') ||
                 fileName.includes('participant') ||
                 fileName.endsWith('.json');
        });
        
        if (participantsFile) {
          console.log('Bulunan dosya:', participantsFile);
          
          try {
            const jsonResponse = await fetch(participantsFile.url);
            const text = await jsonResponse.text();
            console.log('Ham JSON metni:', text);
            
            const participantsData: ParticipantsData = JSON.parse(text);
            console.log('Parse edilmiş veri:', participantsData);
            
            setParticipants(participantsData.participants || []);
            setParticipantsError(null);
          } catch (jsonError) {
            console.error('JSON parse hatası:', jsonError);
            setParticipantsError('JSON dosyası okunamadı');
          }
        } else {
          // Tüm JSON dosyalarını kontrol et
          const jsonFiles = data.files.filter((file: any) => 
            (file.name || file.fileName || '').toLowerCase().endsWith('.json')
          );
          
          console.log('Bulunan JSON dosyaları:', jsonFiles);
          
          if (jsonFiles.length > 0) {
            // İlk JSON dosyasını dene
            try {
              const jsonResponse = await fetch(jsonFiles[0].url);
              const participantsData = await jsonResponse.json();
              
              if (participantsData.participants) {
                setParticipants(participantsData.participants || []);
                setParticipantsError(null);
              } else {
                setParticipantsError('JSON dosyasında katılımcı verisi bulunamadı');
              }
            } catch (jsonError) {
              setParticipantsError('JSON dosyası okunamadı');
            }
          } else {
            setParticipantsError('Hiç JSON dosyası bulunamadı');
          }
        }
      }
    } catch (err) {
      console.error('Katılımcı listesi yükleme hatası:', err);
      setParticipantsError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setParticipantsLoading(false);
    }
  };
  // Dosya silme fonksiyonu
  const deleteFile = async (fileKey: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/uploadthing?key=${fileKey}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Dosya silme hatası:', error);
      return false;
    }
  };

  // Tekli dosya silme işlemi
  const handleDeleteFile = async (file: FileData): Promise<void> => {
    const success = await deleteFile(file.key);
  
    if (success) {
      setFiles(prevFiles => prevFiles.filter(f => f.key !== file.key));
      setFileToDelete(null);
      if (selectedFile?.key === file.key) {
        setSelectedFile(null);
      }
  
      // ✅ Bildirimi göster
      setDeletedCountInfo(1); // Tek bir dosya
      setShowDeleteSuccess(true);
      setTimeout(() => setShowDeleteSuccess(false), 4000);
    } else {
      // ❌ (Opsiyonel) Hata bildirimi istersen burada da ekleyebiliriz
      alert("Dosya silinirken bir hata oluştu.");
    }
  };

  // Tüm filtrelenmiş dosyaları silme işlemi
  const handleDeleteAllFiles = async (filesToDelete: FileData[]): Promise<void> => {
    if (filesToDelete.length === 0) return;
    
    setIsDeletingAll(true);
    let deletedCount = 0;
  
    try {
      for (const file of filesToDelete) {
        const success = await deleteFile(file.key);
        if (success) {
          deletedCount++;
          setFiles(prevFiles => prevFiles.filter(f => f.key !== file.key));
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
  
      setDeletedCountInfo(deletedCount);
      setShowDeleteSuccess(true);
      setTimeout(() => setShowDeleteSuccess(false), 4000); // Bildirim 4 saniye sonra kaybolur
  
      setShowDeleteAllConfirm(false);
  
    } catch (error) {
      console.error('Toplu silme hatası:', error);
      // İstersen burada farklı bir hata bildirimi de gösterebilirsin
    } finally {
      setIsDeletingAll(false);
    }
  };

  // TXT dosya içeriğini okuma fonksiyonu
  const fetchTextContent = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const text = await response.text();
      return text;
    } catch (error) {
      console.error('Metin dosyası okunamadı:', error);
      return 'Dosya içeriği yüklenemedi.';
    }
  };

  // Dosya indirme fonksiyonu
  const downloadFile = async (file: FileData, directoryHandle: FileSystemDirectoryHandle | null = null): Promise<void> => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      
      if (directoryHandle) {
        // Modern API ile klasöre kaydet
        const fileHandle = await directoryHandle.getFileHandle(file.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        // Geleneksel yöntem
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('İndirme hatası:', error);
      // Fallback olarak normal download denenir
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Tümünü indirme fonksiyonu
  const downloadAllFiles = async (filesToDownload: FileData[]): Promise<void> => {
    if (filesToDownload.length === 0) return;
    
    setIsDownloadingAll(true);
    
    try {
      let directoryHandle: FileSystemDirectoryHandle | null = null;
      
      // Modern File System Access API'yi destekleyip desteklemediğini kontrol et
      if (window.showDirectoryPicker) {
        try {
          directoryHandle = await window.showDirectoryPicker();
        } catch (error) {
          console.error('Dizin seçilemedi:', error);
        }
      }

      // Dosyaları sırayla indir
      for (let i = 0; i < filesToDownload.length; i++) {
        await downloadFile(filesToDownload[i], directoryHandle);
        
        // Klasör API kullanıyorsak bekleme süresine gerek yok
        if (!directoryHandle && i < filesToDownload.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (directoryHandle) {
        // Başarı mesajı göster
        alert(`${filesToDownload.length} dosya başarıyla seçilen klasöre indirildi!`);
      }
      
    } catch (error) {
      console.error('Toplu indirme hatası:', error);
      alert('İndirme sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  // Dosya tipini belirleme fonksiyonu - TXT desteği eklendi
  const getFileType = (file: FileData): 'image' | 'video' | 'audio' | 'text' | null => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type?.toLowerCase();
    
    if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '')) {
      return 'image';
    }
    if (mimeType?.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(extension || '')) {
      return 'video';
    }
    if (mimeType?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(extension || '')) {
      return 'audio';
    }
    if (mimeType?.startsWith('text/') || ['txt', 'md', 'rtf', 'log'].includes(extension || '')) {
      return 'text';
    }
    return null; // Desteklenmeyen formatlar ignore edilecek
  };

  // Dosyaları yükle
  useEffect(() => {
    const loadFiles = async (): Promise<void> => {
      try {
        setLoading(true);
        const response = await fetch('/api/uploadthing');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          // Sadece desteklenen formatları filtrele  
          const supportedFiles: FileData[] = data.files
            .map((file: any) => ({
              ...file,
              fileType: getFileType(file),
              size: file.size || file.fileSize || 0,
              name: file.name || file.fileName || 'İsimsiz dosya'
            }))
            .filter((file: FileData) => file.fileType !== null);
          
          setFiles(supportedFiles);

          // TXT dosyalarının içeriğini yükle
          const textFiles = supportedFiles.filter(file => file.fileType === 'text');
          const textContentMap: {[key: string]: string} = {};
          
          for (const textFile of textFiles) {
            const content = await fetchTextContent(textFile.url);
            textContentMap[textFile.key] = content;
          }
          
          setTextContent(textContentMap);
        } else {
          throw new Error(data.error || 'Dosyalar yüklenemedi');
        }
      } catch (err) {
        console.error('Dosya yükleme hatası:', err);
        setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      } finally {
        setLoading(false);
      }
	  await loadParticipants();
    };

    loadFiles();
  }, []);

  // Filtrelenmiş dosyalar
  const filteredFiles = filter === 'participants' ? [] : files.filter(file => {
    if (filter === 'all') return true;
    return file.fileType === filter;
  });

  // Dosya sayıları
  const fileCounts = {
    all: files.length,
    image: files.filter(f => f.fileType === 'image').length,
    video: files.filter(f => f.fileType === 'video').length,
    audio: files.filter(f => f.fileType === 'audio').length,
    text: files.filter(f => f.fileType === 'text').length
  };

// Aktif filtrenin etiketini getir
  const getFilterLabel = (): string => {
    const filterLabels: Record<string, string> = {
      all: 'Tüm Anıları',
      image: 'Tüm Fotoğrafları',
      video: 'Tüm Videoları',
      audio: 'Tüm Ses Kayıtlarını',
      text: 'Tüm Mesajları',
      participants: 'Tüm Katılımcıları'
    };
    return filterLabels[filter];
  };
  
  // Browser desteğini kontrol et
  const isDirectoryPickerSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  // Dosya içeriği gösterme komponenti
  const FileContent: React.FC<{ file: FileData; isModal?: boolean }> = ({ file, isModal = false }) => {
    const [audioPlaying, setAudioPlaying] = useState<boolean>(false);

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
      const target = e.target as HTMLImageElement;
      target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkdvcnVudHUgeXVrbGVuZW1lZGk8L3RleHQ+PC9zdmc+';
    };

    switch (file.fileType) {
      case 'image':
        return (
          <div className={`flex justify-center ${isModal ? '' : 'h-48'}`}>
            <Image 
              src={file.url} 
              alt={file.name}
              width={isModal ? 400 : 300}
              height={isModal ? 384 : 192}
              className={`rounded-lg shadow-sm object-cover ${
                isModal 
                  ? 'max-w-full max-h-96 object-contain' 
                  : 'w-full h-full'
              }`}
              onError={handleImageError}
            />
          </div>
        );

      case 'video':
        return (
          <div className={`flex justify-center ${isModal ? '' : 'h-48'}`}>
            <video 
              controls 
              className={`rounded-lg shadow-sm ${
                isModal 
                  ? 'max-w-full max-h-96' 
                  : 'w-full h-full object-cover'
              }`}
              preload="metadata"
            >
              <source src={file.url} />
              Tarayıcınız video oynatmayı desteklemiyor.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className={`bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 ${isModal ? '' : 'h-48 flex flex-col justify-center'}`}>
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-full">
                <Music className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="text-center mb-3">
              <h4 className="font-medium text-gray-800 text-sm truncate">{file.name}</h4>
              <p className="text-gray-600 text-xs">Ses Kaydı</p>
            </div>
            <audio 
              controls 
              className="w-full"
              onPlay={() => setAudioPlaying(true)}
              onPause={() => setAudioPlaying(false)}
            >
              <source src={file.url} />
              Tarayıcınız ses oynatmayı desteklemiyor.
            </audio>
          </div>
        );

      case 'text':
        const content = textContent[file.key] || 'Yükleniyor...';
        const previewContent = isModal ? content : content.substring(0, 150) + (content.length > 150 ? '...' : '');
        
        return (
          <div className={`bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 ${isModal ? '' : 'h-48 flex flex-col'}`}>
            <div className="flex items-center justify-center mb-3">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-full">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-center mb-3">
              <h4 className="font-medium text-gray-800 text-sm truncate">{file.name}</h4>
              <p className="text-gray-600 text-xs">Mesaj</p>
            </div>
            <div className={`bg-white rounded-lg p-3 ${isModal ? 'max-h-96 overflow-y-auto' : 'flex-1 overflow-hidden'}`}>
              <pre className={`text-gray-700 text-xs whitespace-pre-wrap ${isModal ? '' : 'line-clamp-6'}`} style={{fontFamily: 'inherit'}}>
                {previewContent}
              </pre>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
          <span className="ml-3 text-gray-600">Anılar yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Hata: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:p-4 md:p-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-800 to-purple-600 bg-clip-text text-transparent mb-1">
            Sevdiklerinizin Yüklediği Anılar 💕
          </h1>
          <p className="text-gray-500 text-sm md:text-2xl mt-2">En güzel anılarımızı görüntüleyin ve indirin</p>
        </div>

        {/* Filtre Butonları */}
        <div className="flex flex-wrap gap-3 mb-6 justify-center">
          {[
            { key: 'all' as const, label: 'Tümü', icon: '💫', count: fileCounts.all },
            { key: 'image' as const, label: 'Fotoğraflar', icon: '📸', count: fileCounts.image },
            { key: 'video' as const, label: 'Videolar', icon: '🎥', count: fileCounts.video },
            { key: 'audio' as const, label: 'Ses Kayıtları', icon: '🎵', count: fileCounts.audio },
            { key: 'text' as const, label: 'Mesajlar', icon: '💌', count: fileCounts.text },
			{ key: 'participants' as const, label: 'Katılımcı Listesi', icon: '👥', count: participants.length }
          ].map(filterOption => (
            <button
              key={filterOption.key}
              onClick={() => setFilter(filterOption.key)}
              className={`px-3 py-2 md:px-6 md:py-3 rounded-full text-xs md:text-sm font-medium transition-all transform hover:scale-105 ${
                filter === filterOption.key
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md border border-gray-200'
              }`}
            >
              <span className="mr-2">{filterOption.icon}</span>
              {filterOption.label} ({filterOption.count})
            </button>
          ))}
        </div>

        {/* Toplu İşlem Butonları */}
        {filteredFiles.length > 0 && (
          <div className="mb-8 flex flex-col items-center space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center">
              {/* Tümünü İndir Butonu */}
              <button
                onClick={() => downloadAllFiles(filteredFiles)}
                disabled={isDownloadingAll}
                className={`bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all transform hover:scale-105 shadow-md ${
                  isDownloadingAll ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isDownloadingAll ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>İndiriliyor...</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-4 h-4" />
                    <span>Tümünü İndir ({filteredFiles.length} dosya)</span>
                  </>
                )}
              </button>
              {/* Tümünü Sil Butonu */}
              <button
                onClick={() => setShowDeleteAllConfirm(true)}
                disabled={isDeletingAll}
                className={`bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-2 px-4 rounded-lg text-sm font-medium flex items-center space-x-2 transition-all transform hover:scale-105 shadow-md ${
                  isDeletingAll ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isDeletingAll ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Siliniyor...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Tümünü Sil ({filteredFiles.length} dosya)</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Browser desteği bilgisi */}
            <p className="text-sm text-gray-500 text-center max-w-md">
              {isDirectoryPickerSupported ? 
                '📁 Klasör seçip tüm dosyaları aynı yere kaydedebilirsiniz' : 
                '⚠️ Tarayıcınız klasör seçmeyi desteklemiyor, dosyalar tek tek indirilecek'
              }
            </p>
          </div>
        )}
        {showDeleteSuccess && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
            <span className="text-lg">🗑️</span>
            <span className="font-semibold">{deletedCountInfo} dosya başarıyla silindi!</span>
          </div>
        )}
		{/* Katılımcı Listesi */}
        {filter === 'participants' && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                👥 Katılımcı Listesi
              </h2>
              <p className="text-gray-600">
                Toplam {participants.length} katılımcı
              </p>
            </div>
            
            {participantsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                <span className="ml-3 text-gray-600">Katılımcı listesi yükleniyor...</span>
              </div>
            ) : participantsError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">Hata: {participantsError}</p>
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🤔</div>
                <p className="text-gray-500 text-lg">Henüz katılımcı listesi bulunamadı.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {participants.map((participant, index) => (
                  <div key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="text-gray-800 font-medium capitalize">
                        {participant}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Dosya Listesi */}
        {filteredFiles.length === 0 ? (
          <div className="text-center py-3">
            <div className="text-1xl mb-4">🤔</div>
            <p className="text-gray-500 text-lg">Bu kategoride henüz anı bulunamadı.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
            {filteredFiles.map((file) => (
              <div key={file.key} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                {/* Dosya İçeriği */}
                <div className="relative">
                  <FileContent file={file} />
                  {/* Dosya Tipi Badge */}
                  <div className="absolute top-4 right-2">
                    <div className={`p-1.5 rounded-full ${
                      file.fileType === 'image' ? 'bg-green-500' :
                      file.fileType === 'video' ? 'bg-red-500' : 
                      file.fileType === 'audio' ? 'bg-purple-500' : 'bg-blue-500'
                    }`}>
                      {file.fileType === 'image' && <Camera className="w-3 h-3 text-white" />}
                      {file.fileType === 'video' && <Video className="w-3 h-3 text-white" />}
                      {file.fileType === 'audio' && <Music className="w-3 h-3 text-white" />}
                      {file.fileType === 'text' && <FileText className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>

                {/* Dosya Bilgileri */}
                <div className="p-3 sm:p-4">
                  <h3 className="font-medium text-gray-800 text-sm mb-2 truncate" title={file.name}>
                    {file.name}
                  </h3>
                  
                  {/* Aksiyon Butonları */}
                  <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={() => setSelectedFile(file)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-xs sm:text-sm py-2 px-2 sm:px-3 rounded-lg flex items-center justify-center space-x-1 transition-all"
                    >
                      <Eye className="w-3 h-3" />
                      <span className="hidden xs:inline sm:inline">Görüntüle</span>
                    </button>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => downloadFile(file)}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs sm:text-sm py-2 px-2 sm:px-3 rounded-lg flex items-center justify-center transition-all"
                      >
                        <Download className="w-3 h-3" />
                        <span className="ml-1 sm:hidden">İndir</span>
                      </button>
                      <button
                        onClick={() => setFileToDelete(file)}
                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs sm:text-sm py-2 px-2 sm:px-3 rounded-lg flex items-center justify-center transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="ml-1 sm:hidden">Sil</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dosya Görüntüleme Modalı */}
        {selectedFile && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto shadow-2xl">
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 truncate pr-4">{selectedFile.name}</h3>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <FileContent file={selectedFile} isModal={true} />
                
                <div className="mt-6 flex justify-center space-x-4">
                  <button
                    onClick={() => downloadFile(selectedFile)}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 px-6 rounded-lg flex items-center space-x-2 transition-all transform hover:scale-105"
                  >
                    <Download className="w-4 h-4" />
                    <span>İndir</span>
                  </button>
                  <button
                    onClick={() => {
                      setFileToDelete(selectedFile);
                      setSelectedFile(null);
                    }}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-6 rounded-lg flex items-center space-x-2 transition-all transform hover:scale-105"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Sil</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tekli Dosya Silme Onay Modalı */}
        {fileToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-800 text-center mb-2">
                Dosyayı Sil
              </h3>
              
              <p className="text-gray-600 text-center mb-6">
                &ldquo;<span className="font-medium">{fileToDelete.name}</span>&rdquo; dosyasını silmek istediğinizden emin misiniz?
                Bu işlem geri alınamaz.
              </p>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setFileToDelete(null)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-all"
                >
                  İptal
                </button>
                <button
                  onClick={() => handleDeleteFile(fileToDelete)}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-4 rounded-lg font-medium transition-all"
                >
                  Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toplu Silme Onay Modalı */}
        {showDeleteAllConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-800 text-center mb-2">
                Tüm Dosyaları Sil
              </h3>
              
              <p className="text-gray-600 text-center mb-6">
                {getFilterLabel()} ({filteredFiles.length} dosya) silmek istediğinizden emin misiniz? 
                Bu işlem geri alınamaz.
              </p>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 rounded-lg font-medium transition-all"
                  disabled={isDeletingAll}
                >
                  İptal
                </button>
                <button
                  onClick={() => handleDeleteAllFiles(filteredFiles)}
                  disabled={isDeletingAll}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-4 rounded-lg font-medium transition-all disabled:opacity-75"
                >
                  {isDeletingAll ? 'Siliniyor...' : 'Tümünü Sil'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileViewer;
