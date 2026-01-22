import type { Player, PlayerID, RoomID, RoomState } from "../types.js";
import { CONFIG } from "../config.js";

//basically RoomStore is like a in-server(local) state db, it doesn't handle timing, it just 'stores'
export class RoomStore {
  private rooms = new Map<RoomID, RoomState>();

  get(roomId: RoomID): RoomState | undefined {
    return this.rooms.get(roomId);
  }

  //gets room safely, if room doesn't exist, creates a new one
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
    if (room.players.size >= CONFIG.maxPlayersPerRoom) { //refuse to add on room size limit reach
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
    if (room.players.size == 0) { //clean the room if it has 0 players
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
    return room ? Array.from(room.players.values()) : []; // had to use Array.from() because Map.values() returns MapIterator and not array of values
   }
}
