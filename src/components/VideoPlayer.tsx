// src/components/VideoPlayer.tsx
import { useEffect, useRef } from 'react';

interface Props {
  stream: MediaStream;
  isMuted?: boolean;
}

export const VideoPlayer: React.FC<Props> = ({ stream, isMuted = false }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(e => {
          console.error('Video başlatma hatası:', e);
        });
      };
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isMuted}
      className="w-full h-full object-cover"
    />
  );
};