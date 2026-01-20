export type PlayerID = string;
export type RoomID = string;

export interface Player {
  id: PlayerID;
  name: string;
  joinedAt: number;
  score: number;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  durationMs: number;
}

export interface RoomState {
  id: RoomID;
  players: Map<PlayerID, Player>;
  currentQuestion?: Question;
  questionEndsAt?: number;
  isActive: boolean;
}

export interface ClientToServerEvents {
  join_room: { roomId: RoomID; name: string };
  leave_room: { roomId: RoomID };
  start_question: { roomId: RoomID; questionId: string };
  submit_question: { roomId: RoomID; questionId: string; answerIndex: number };
  heartbeat: void;
}

export interface ServerToClientEvents {
  room_state: { roomId: RoomID; players: Player[]; isActive: boolean };
  player_joined: { roomId: RoomID; player: Player };
  player_left: { roomId: RoomID; player: Player };
  question_start: {
    roomId: RoomID;
    question: Omit<Question, "correctIndex">;
    endsAt: number;
  };
  scores_update: { roomId: RoomID; players: Player[] };
  error: { code: string; message: string };
}

export interface InterServerEvents {}
export interface SocketData {
  playerID?: PlayerID;
  roomID?: RoomID;
}
