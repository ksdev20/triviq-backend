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
  currentQuestion?: Question | undefined;
  questionEndsAt?: number | undefined;
  isActive: boolean;
}

export interface ClientToServerEvents {
  join_room: (payload: { roomId: RoomID; name: string }) => void;
  leave_room: (payload: { roomId: RoomID }) => void;
  start_question: (payload: { roomId: RoomID; questionId: string }) => void;
  submit_answer: (payload: {
    roomId: RoomID;
    questionId: string;
    answerIndex: number;
  }) => void;
  heartbeat: () => void;
  error: (payload: { code: string; message?: string }) => void;
}

export interface ServerToClientEvents {
  room_state: (payload: {
    roomId: RoomID;
    players: Player[];
    isActive: boolean;
  }) => void;
  player_joined: (payload: { roomId: RoomID; player: Player }) => void;
  player_left: (payload: { roomId: RoomID; player?: Player | undefined, playerId: PlayerID }) => void;
  question_start: (payload: {
    roomId: RoomID;
    question: Omit<Question, "correctIndex">;
    endsAt: number;
  }) => void;
  scores_updated: (payload: { roomId: RoomID; players: Player[]; correctIndex: number }) => void;
  error: (payload: { code: string; message?: string }) => void;
}

export interface InterServerEvents {}
export interface SocketData {
  playerId: PlayerID;
  roomId?: RoomID;
}
