// server/index.ts
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

const wss = new WebSocket.Server({ port: 8080 });

interface Room {
  id: string;
  participants: Map<string, WebSocket>;
}

const rooms = new Map<string, Room>();

wss.on('connection', (ws) => {
  console.log('Yeni bağlantı');
  let userId = uuidv4();
  let currentRoom: Room | null = null;

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      console.log('Gelen mesaj:', data);

      switch (data.type) {
        case 'join':
          // Odaya katılma
          const roomId = data.roomId;
          let room = rooms.get(roomId);
          
          if (!room) {
            room = { id: roomId, participants: new Map() };
            rooms.set(roomId, room);
          }

          room.participants.set(userId, ws);
          currentRoom = room;

          // Diğer katılımcılara bildir
          room.participants.forEach((participant, participantId) => {
            if (participantId !== userId) {
              participant.send(JSON.stringify({
                type: 'user-joined',
                userId: userId
              }));
            }
          });
          break;

        case 'chat-message':
          // Sohbet mesajını odadaki diğer kullanıcılara ilet
          if (currentRoom) {
            const messageData = {
              type: 'chat-message',
              message: data.message
            };
            
            currentRoom.participants.forEach((participant, participantId) => {
              if (participantId !== userId) {
                participant.send(JSON.stringify(messageData));
              }
            });
          }
          break;

        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // WebRTC sinyallerini ilgili kullanıcıya ilet
          if (currentRoom && data.target) {
            const targetWs = currentRoom.participants.get(data.target);
            if (targetWs) {
              data.from = userId;
              targetWs.send(JSON.stringify(data));
            }
          }
          break;
      }
    } catch (error) {
      console.error('Mesaj işleme hatası:', error);
    }
  });

  ws.on('close', () => {
    console.log('Bağlantı kapandı:', userId);
    if (currentRoom) {
      // Kullanıcıyı odadan çıkar
      currentRoom.participants.delete(userId);
      
      // Diğer kullanıcılara bildir
      currentRoom.participants.forEach((participant) => {
        participant.send(JSON.stringify({
          type: 'user-left',
          userId: userId
        }));
      });

      // Oda boşsa odayı sil
      if (currentRoom.participants.size === 0) {
        rooms.delete(currentRoom.id);
      }
    }
  });
});

console.log('WebSocket sunucusu 8080 portunda çalışıyor');