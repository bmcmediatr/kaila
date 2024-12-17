// src/services/WebRTCService.ts
import { EventEmitter } from 'events';

interface Participant {
  id: string;
  name: string;
  stream: MediaStream;
}

type WebRTCEvents = {
  userJoined: (userId: string, stream: MediaStream) => void;
  userLeft: (userId: string) => void;
  message: (message: { sender: string; text: string }) => void;
}

export class WebRTCService extends EventEmitter {
  private peerConnections: Map<string, RTCPeerConnection>;
  private localStream: MediaStream | null;
  private roomId: string | null;
  private ws: WebSocket | null;
  private userId: string;
  private userName: string;

  constructor() {
    super();
    this.peerConnections = new Map();
    this.localStream = null;
    this.roomId = null;
    this.ws = null;
    this.userId = `user-${Date.now()}`;
    this.userName = '';
  }

  private async connectToWebSocket() {
    return new Promise<void>((resolve, reject) => {
      try {
        this.ws = new WebSocket('ws://localhost:8080');

        this.ws.onopen = () => {
          console.log('WebSocket bağlantısı kuruldu');
          resolve();
        };

        this.ws.onmessage = this.handleWebSocketMessage.bind(this);

        this.ws.onerror = (error) => {
          console.error('WebSocket hatası:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket bağlantısı kapandı');
          // Yeniden bağlanma mantığı eklenebilir
          setTimeout(() => this.connectToWebSocket(), 5000);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private async handleWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      console.log('WebSocket mesajı alındı:', data);

      switch (data.type) {
        case 'user-joined':
          await this.handleUserJoined(data.userId);
          break;
        case 'user-left':
          this.handleUserLeft(data.userId);
          break;
        case 'chat-message':
          this.handleChatMessage(data.message);
          break;
        case 'offer':
          await this.handleOffer(data.from, data.offer);
          break;
        case 'answer':
          await this.handleAnswer(data.from, data.answer);
          break;
        case 'ice-candidate':
          await this.handleIceCandidate(data.from, data.candidate);
          break;
      }
    } catch (error) {
      console.error('Mesaj işleme hatası:', error);
    }
  }

  private async handleUserJoined(userId: string) {
    console.log('Yeni kullanıcı katıldı:', userId);
    const pc = await this.createPeerConnection(userId);
    
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.sendToServer({
        type: 'offer',
        target: userId,
        offer: offer
      });
    } catch (error) {
      console.error('Offer oluşturma hatası:', error);
    }
  }

  private async createPeerConnection(userId: string): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.peerConnections.set(userId, pc);

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.localStream) {
          pc.addTrack(track, this.localStream);
        }
      });
    }

    pc.ontrack = (event) => {
      console.log('Yeni track alındı:', event.streams[0]);
      this.emit('userJoined', userId, event.streams[0]);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendToServer({
          type: 'ice-candidate',
          target: userId,
          candidate: event.candidate
        });
      }
    };

    return pc;
  }

  private async handleOffer(userId: string, offer: RTCSessionDescriptionInit) {
    let pc = this.peerConnections.get(userId);
    if (!pc) {
      pc = await this.createPeerConnection(userId);
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      this.sendToServer({
        type: 'answer',
        target: userId,
        answer: answer
      });
    } catch (error) {
      console.error('Answer oluşturma hatası:', error);
    }
  }

  private async handleAnswer(userId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (error) {
        console.error('Answer ayarlama hatası:', error);
      }
    }
  }

  private async handleIceCandidate(userId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('ICE candidate ekleme hatası:', error);
      }
    }
  }

  private handleUserLeft(userId: string) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
      this.emit('userLeft', userId);
    }
  }

  private handleChatMessage(message: { sender: string; text: string }) {
    console.log('Chat mesajı alındı:', message);
    this.emit('message', message);
  }

  private sendToServer(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket bağlantısı yok veya kapalı');
    }
  }

  async joinRoom(roomId: string, participant: Participant) {
    try {
      this.roomId = roomId;
      this.localStream = participant.stream;
      this.userName = participant.name;
      this.userId = participant.id;

      await this.connectToWebSocket();

      this.sendToServer({
        type: 'join',
        roomId: roomId,
        userId: this.userId,
        userName: this.userName
      });

    } catch (error) {
      console.error('Odaya katılma hatası:', error);
      throw error;
    }
  }

  sendMessage(roomId: string, message: { sender: string; text: string }) {
    if (this.roomId === roomId) {
      console.log('Mesaj gönderiliyor:', message);
      
      this.sendToServer({
        type: 'chat-message',
        roomId: roomId,
        message: message
      });

      // Mesajı yerel olarak da göster
      this.emit('message', message);
    }
  }

  cleanup() {
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    this.roomId = null;
    this.removeAllListeners();
  }

  on<K extends keyof WebRTCEvents>(
    event: K,
    listener: WebRTCEvents[K]
  ): this {
    return super.on(event, listener as any);
  }

  emit<K extends keyof WebRTCEvents>(
    event: K,
    ...args: Parameters<WebRTCEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}