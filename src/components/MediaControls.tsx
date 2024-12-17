// src/components/MediaControls.tsx
interface Props {
    onToggleAudio: () => void;
    onToggleVideo: () => void;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
  }
  
  export const MediaControls: React.FC<Props> = ({
    onToggleAudio,
    onToggleVideo,
    isAudioEnabled,
    isVideoEnabled,
  }) => {
    return (
      <div className="flex justify-center space-x-4 mt-4">
        <button
          onClick={onToggleAudio}
          className={`px-4 py-2 rounded ${
            isAudioEnabled ? 'bg-blue-500' : 'bg-red-500'
          } text-white`}
        >
          {isAudioEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
        </button>
        <button
          onClick={onToggleVideo}
          className={`px-4 py-2 rounded ${
            isVideoEnabled ? 'bg-blue-500' : 'bg-red-500'
          } text-white`}
        >
          {isVideoEnabled ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
        </button>
      </div>
    );
  };