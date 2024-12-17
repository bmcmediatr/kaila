export interface Room {
    id: string;
    participants: Participant[];
  }
  
  export interface Participant {
    id: string;
    name: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
  }
  
  export interface RoomState {
    currentRoom: Room | null;
    participants: Participant[];
  }