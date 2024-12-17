// src/components/RoomCreation.tsx
import { useState } from 'react';

interface Props {
  onCreateRoom: (roomName: string) => void;
  onJoinRoom: (roomId: string) => void;
  disabled?: boolean; // disabled prop'unu ekledik
}

export const RoomCreation: React.FC<Props> = ({ onCreateRoom, onJoinRoom, disabled }) => {
  const [roomName, setRoomName] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isJoining) {
      if (joinRoomId.trim()) {
        onJoinRoom(joinRoomId.trim());
      }
    } else {
      if (roomName.trim()) {
        onCreateRoom(roomName.trim());
      }
    }
  };

  return (
    <div>
      <div className="flex space-x-4 mb-4">
        <button
          onClick={() => setIsJoining(false)}
          disabled={disabled}
          className={`px-4 py-2 rounded ${
            !isJoining ? 'bg-blue-500 text-white' : 'bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Oda Oluştur
        </button>
        <button
          onClick={() => setIsJoining(true)}
          disabled={disabled}
          className={`px-4 py-2 rounded ${
            isJoining ? 'bg-blue-500 text-white' : 'bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Odaya Katıl
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isJoining ? (
          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            placeholder="Oda ID'sini girin"
            className="w-full p-2 border rounded"
            disabled={disabled}
          />
        ) : (
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Oda adını girin"
            className="w-full p-2 border rounded"
            disabled={disabled}
          />
        )}
        <button
          type="submit"
          disabled={disabled}
          className={`w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isJoining ? 'Odaya Katıl' : 'Oda Oluştur'}
        </button>
      </form>
    </div>
  );
};