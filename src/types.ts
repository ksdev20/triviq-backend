export type PlayerID = string;
export type RoomID = string;
export type QuestionID = string;

export interface Player {
  id: PlayerID;
  name: string;
  joinedAt: number;
  score: number;
}

export interface Question {
  id: QuestionID;
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
  leave_room: () => void;
  start_question: (payload: { questionId: string }) => void;
  submit_answer: (payload: {
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
  player_joined: (payload: { player: Player }) => void;
  player_left: (payload: { player?: Player | undefined, playerId: PlayerID }) => void;
  question_start: (payload: {
    question: Omit<Question, "correctIndex">;
    endsAt: number;
  }) => void;
  scores_updated: (payload: { players: Player[]; correctIndex: number }) => void;
  error: (payload: { code: string; message?: string }) => void;
}

export interface InterServerEvents {}
export interface SocketData {
  playerId: PlayerID;
  roomId: RoomID;
}
