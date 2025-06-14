import Image from 'next/image';

export default function SlugPage({ params }: { params: { slug: string } }) {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Yüklenen Dosya</h1>
      
      {/* Eski: <img src={...} /> */}
      {/* Yeni: Next.js Image bileşeni */}
      <Image
        src={`https://utfs.io/f/${params.slug}`}
        alt="Yüklenen dosya"
        width={800}
        height={600}
        className="max-w-full h-auto rounded-lg shadow-lg"
        priority={true}
      />
      
      {/* Video dosyaları için */}
      {params.slug.includes('video') && (
        <video
          controls
          className="max-w-full h-auto rounded-lg shadow-lg"
        >
          <source src={`https://utfs.io/f/${params.slug}`} type="video/mp4" />
          Tarayıcınız video oynatmayı desteklemiyor.
        </video>
      )}
      
      {/* Ses dosyaları için */}
      {params.slug.includes('audio') && (
        <audio
          controls
          className="w-full mt-4"
        >
          <source src={`https://utfs.io/f/${params.slug}`} type="audio/webm" />
          <source src={`https://utfs.io/f/${params.slug}`} type="audio/mp3" />
          Tarayıcınız ses oynatmayı desteklemiyor.
        </audio>
      )}
    </div>
  );
}
