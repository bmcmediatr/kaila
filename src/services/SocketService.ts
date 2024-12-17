// src/services/SocketService.ts
import { Socket } from 'socket.io-client';
import { Room, Participant } from '../types';

interface ServerToClientEvents {
    'participant-joined': (participant: Participant) => void;
    'participant-left': (participantId: string) => void;
    'connect': () => void;
    'disconnect': () => void;
}

interface ClientToServerEvents {
    'join-room': (data: { roomId: string; participant: Participant }) => void;
    'leave-room': (data: { roomId: string; participantId: string }) => void;
}

export class SocketService {
    private socket: ReturnType<typeof io>;

    constructor() {
        this.socket = io('http://localhost:3000');
        this.setupListeners();
    }

    private setupListeners() {
        this.socket.on('connect', () => {
            console.log('Socket.io bağlantısı kuruldu');
        });

        this.socket.on('disconnect', () => {
            console.log('Socket.io bağlantısı kesildi');
        });
    }

    joinRoom(roomId: string, participant: Participant) {
        this.socket.emit('join-room', { roomId, participant });
    }

    leaveRoom(roomId: string, participantId: string) {
        this.socket.emit('leave-room', { roomId, participantId });
    }

    onParticipantJoined(callback: (participant: Participant) => void) {
        this.socket.on('participant-joined', callback);
    }

    onParticipantLeft(callback: (participantId: string) => void) {
        this.socket.on('participant-left', callback);
    }

    disconnect() {
        this.socket.disconnect();
    }
}