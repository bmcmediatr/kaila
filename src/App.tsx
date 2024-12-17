// src/App.tsx
import { RoomProvider, useRoom } from './contexts/RoomContext';
import { RoomCreation } from './components/RoomCreation';
import { VideoPlayer } from './components/VideoPlayer';
import { MediaControls } from './components/MediaControls';
import { ChatInput } from './components/ChatInput';
import { WebRTCService } from './services/WebRTCService';
import { useState, useEffect, useCallback } from 'react';

const VideoChat = () => {
  const { currentRoom, setCurrentRoom } = useRoom();
  const [userName, setUserName] = useState('');
  const [webRTC] = useState(() => new WebRTCService());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [messages, setMessages] = useState<Array<{sender: string, text: string}>>([]);
  const [isConnecting, setIsConnecting] = useState(false);

  // Kullanılabilir kameraları al
  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setAvailableDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Kamera listesi alınamadı:', error);
      }
    };

    getDevices();
  }, []);

  // WebRTC event listener'ları
  useEffect(() => {
    const handleUserJoined = (userId: string, stream: MediaStream) => {
      console.log('Kullanıcı katıldı:', userId);
      setRemoteStreams(prev => new Map(prev.set(userId, stream)));
    };

    const handleUserLeft = (userId: string) => {
      console.log('Kullanıcı ayrıldı:', userId);
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.delete(userId);
        return newStreams;
      });
    };

    const handleMessage = (message: {sender: string, text: string}) => {
      console.log('Mesaj alındı:', message);
      setMessages(prev => [...prev, message]);
    };

    webRTC.on('userJoined', handleUserJoined);
    webRTC.on('userLeft', handleUserLeft);
    webRTC.on('message', handleMessage);

    return () => {
      webRTC.removeListener('userJoined', handleUserJoined);
      webRTC.removeListener('userLeft', handleUserLeft);
      webRTC.removeListener('message', handleMessage);
    };
  }, [webRTC]);

  // Medya başlatma fonksiyonu
  const initializeMedia = useCallback(async (deviceId?: string) => {
    try {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: true
      };

      console.log('Medya başlatılıyor...', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Stream alındı:', stream);
      
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Medya başlatma hatası:', error);
      alert('Kamera erişimi sağlanamadı. Lütfen kamera izinlerini kontrol edin.');
      throw error;
    }
  }, [localStream]);

  const handleCameraChange = useCallback(async (deviceId: string) => {
    setSelectedCamera(deviceId);
    await initializeMedia(deviceId);
  }, [initializeMedia]);

  const handleCreateRoom = useCallback(async (roomName: string) => {
    if (!userName) {
      alert('Lütfen bir kullanıcı adı girin');
      return;
    }

    setIsConnecting(true);
    try {
      const stream = await initializeMedia(selectedCamera);
      const roomId = `room-${Date.now()}`;
      
      await webRTC.joinRoom(roomId, {
        id: `user-${Date.now()}`,
        name: userName,
        stream
      });

      setCurrentRoom({
        id: roomId,
        participants: []
      });
    } catch (error) {
      console.error('Oda oluşturma hatası:', error);
      alert('Oda oluşturulurken bir hata oluştu.');
    } finally {
      setIsConnecting(false);
    }
  }, [userName, selectedCamera, webRTC, setCurrentRoom, initializeMedia]);

  const handleJoinRoom = useCallback(async (roomId: string) => {
    if (!userName) {
      alert('Lütfen bir kullanıcı adı girin');
      return;
    }

    setIsConnecting(true);
    try {
      const stream = await initializeMedia(selectedCamera);
      
      await webRTC.joinRoom(roomId, {
        id: `user-${Date.now()}`,
        name: userName,
        stream
      });

      setCurrentRoom({
        id: roomId,
        participants: []
      });
    } catch (error) {
      console.error('Odaya katılma hatası:', error);
      alert('Odaya katılırken bir hata oluştu.');
    } finally {
      setIsConnecting(false);
    }
  }, [userName, selectedCamera, webRTC, setCurrentRoom, initializeMedia]);

  const handleLeaveRoom = useCallback(() => {
    webRTC.cleanup();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setCurrentRoom(null);
    setMessages([]);
    setRemoteStreams(new Map());
  }, [webRTC, localStream, setCurrentRoom]);

  const handleToggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const handleToggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  const handleSendMessage = useCallback((text: string) => {
    if (currentRoom && userName) {
      const message = {
        sender: userName,
        text: text
      };
      
      try {
        webRTC.sendMessage(currentRoom.id, message);
      } catch (error) {
        console.error('Mesaj gönderme hatası:', error);
        alert('Mesaj gönderilemedi.');
      }
    }
  }, [currentRoom, userName, webRTC]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Video Chat Uygulaması
        </h1>

        {!currentRoom ? (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Kullanıcı adınız"
              className="w-full p-2 border rounded mb-4"
              disabled={isConnecting}
            />
            {availableDevices.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kamera Seçin
                </label>
                <select
                  value={selectedCamera}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  className="w-full p-2 border rounded"
                  disabled={isConnecting}
                >
                  {availableDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Kamera ${device.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <RoomCreation 
              onCreateRoom={handleCreateRoom} 
              onJoinRoom={handleJoinRoom}
              disabled={isConnecting}
            />
            {isConnecting && (
              <div className="text-center mt-4 text-gray-600">
                Bağlanıyor...
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  Oda: {currentRoom.id}
                </h2>
                <button
                  onClick={handleLeaveRoom}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Odadan Ayrıl
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Sizin Görüntünüz</h3>
                {localStream && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden">
                    <VideoPlayer stream={localStream} isMuted={true} />
                  </div>
                )}
                <MediaControls
                  onToggleAudio={handleToggleAudio}
                  onToggleVideo={handleToggleVideo}
                  isAudioEnabled={isAudioEnabled}
                  isVideoEnabled={isVideoEnabled}
                />
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-2">
                  Diğer Katılımcılar ({remoteStreams.size})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from(remoteStreams).map(([userId, stream]) => (
                    <div key={userId} className="aspect-video bg-black rounded-lg overflow-hidden">
                      <VideoPlayer stream={stream} isMuted={false} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-span-2 bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Sohbet</h3>
                <div className="h-64 overflow-y-auto mb-4 p-4 border rounded">
                  {messages.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`mb-2 p-2 rounded ${
                        msg.sender === userName 
                          ? 'bg-blue-100 text-right' 
                          : 'bg-gray-100'
                      }`}
                    >
                      <span className="font-semibold">{msg.sender}:</span> {msg.text}
                    </div>
                  ))}
                </div>
                <ChatInput onSendMessage={handleSendMessage} />
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 p-4 bg-gray-200 rounded">
          <h3 className="font-semibold">Debug Bilgileri:</h3>
          <p>Kullanıcı Adı: {userName}</p>
          <p>Oda: {currentRoom?.id || 'Oda yok'}</p>
          <p>Medya Durumu: {localStream ? 'Hazır' : 'Bekliyor'}</p>
          <p>Ses: {isAudioEnabled ? 'Açık' : 'Kapalı'}</p>
          <p>Video: {isVideoEnabled ? 'Açık' : 'Kapalı'}</p>
          <p>Seçili Kamera: {selectedCamera || 'Seçilmedi'}</p>
          <p>Bağlı Kullanıcı Sayısı: {remoteStreams.size}</p>
          <p>Mesaj Sayısı: {messages.length}</p>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <RoomProvider>
      <VideoChat />
    </RoomProvider>
  );
};

export default App;