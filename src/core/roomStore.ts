import type { Player, PlayerID, RoomID, RoomState } from "../types.js";
import { CONFIG } from "../config.js";

export class RoomStore {
  private rooms = new Map<RoomID, RoomState>();

  get(roomId: RoomID): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  ensure(roomId: RoomID): RoomState {
    let room = this.get(roomId);
    if (!room) {
      room = { id: roomId, players: new Map(), isActive: false };
      this.rooms.set(roomId, room);
    }
    return room;
  }

  addPlayer(roomId: RoomID, player: Player): Player | Error {
    const room = this.ensure(roomId);
    if (room.players.size >= CONFIG.maxPlayersPerRoom) {
      return new Error("Room_Full");
    }
    room.players.set(player.id, player);
    return player;
  }

  removePlayer(roomId: RoomID, playerId: PlayerID): Player | undefined{
    const room = this.get(roomId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (!player) return;
    room.players.delete(playerId);
    if (room.players.size == 0) {
      this.rooms.delete(roomId);
    }
    return player;
  }

  startQuestion(
    roomId: RoomID,
    question: RoomState["currentQuestion"],
    endsAt: number,
  ) {
    const room = this.ensure(roomId);
    room.currentQuestion = question;
    room.questionEndsAt = endsAt;
    room.isActive = true;
  }

  endQuestion(roomId: RoomID) {
    const room = this.get(roomId);
    if (!room) return;
    room.currentQuestion = undefined;
    room.questionEndsAt = undefined;
    room.isActive = false;
  }

  updateScore(roomId: RoomID, playerId: PlayerID, delta: number) {
    const room = this.get(roomId);
    if (!room) return;
    const player = room.players.get(playerId);
    if (player) player.score += delta;
  }

  listPlayers(roomId: RoomID): Player[] {
    const room = this.get(roomId);
    return room ? Array.from(room.players.values()) : [];
  }
}
