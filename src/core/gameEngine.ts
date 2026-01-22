import type { Question, RoomID } from "../types.js";
import { CONFIG } from "../config.js";
import type { RoomStore } from "./roomStore.js";

//isn't really needed but added for scaling later
//GameEngine handles timing, evaluating answers and then deciding whether to update score, ad
export class GameEngine {
  constructor(private store: RoomStore) {}

  startQuestion(roomId: RoomID, question: Question): { endsAt: number } {
    const endsAt =
      Date.now() + (question.durationMs || CONFIG.questionDurationMs);
    this.store.startQuestion(roomId, question, endsAt);
    return { endsAt };
  }

  evaluateAnswer(roomId: RoomID, playerId: string, questionId: string, answerIndex: number): boolean{
    const room = this.store.get(roomId);
    if (!room || !room.isActive || !room.currentQuestion || room.currentQuestion.id !== questionId){
        return false;
    }
    const isCorrect = room.currentQuestion.correctIndex === answerIndex;
    if (isCorrect) this.store.updateScore(roomId, playerId, CONFIG.incrementForCorrect);
    return isCorrect;
  }

  //no validation, just a wrapper
  endQuestion(roomId: RoomID){
    this.store.endQuestion(roomId);
  }
}
