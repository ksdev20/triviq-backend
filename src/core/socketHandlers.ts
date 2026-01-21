import { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  Player,
  ServerToClientEvents,
  SocketData,
} from "../types.js";
import { RoomStore } from "./roomStore.js";
import { GameEngine } from "./gameEngine.js";
import {
  isValidAnswerIndex,
  isValidName,
  isValidRoomId,
} from "../utils/validators.js";
import { RateLimiter } from "../utils/rateLimiter.js";
import { CONFIG } from "../config.js";
import { log } from "../utils/logger.js";

type IOServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
>;

export function registerSocketHandlers(
  io: IOServer,
  store: RoomStore,
  engine: GameEngine,
) {
  const limiter = new RateLimiter(
    CONFIG.rateLimit.windowMs,
    CONFIG.rateLimit.maxEvents,
  );

  io.on(
    "connection",
    (
      socket: Socket<
        ClientToServerEvents,
        ServerToClientEvents,
        {},
        SocketData
      >,
    ) => {
      const key = socket.handshake.address || socket.id;

      socket.on("heartbeat", () => {});

      socket.on("join_room", ({ roomId, name }) => {
        if (!limiter.allow(key))
          return socket.emit("error", { code: "RATE_LIMIT" });
        if (!isValidRoomId(roomId) || !isValidName(name)) {
          return socket.emit("error", { code: "INVALID_CREDENTIALS" });
        }
        const playerId = socket.id;
        socket.data.playerId = playerId;
        socket.data.roomId = roomId;

        try {
          const player = {
            id: playerId,
            name: name.trim(),
            joinedAt: Date.now(),
            score: 0,
          };

          store.addPlayer(roomId, player);
          socket.join(roomId);

          io.to(roomId).emit("player_joined", { roomId, player });
          io.to(roomId).emit("room_state", {
            roomId,
            players: store.listPlayers(roomId),
            isActive: !!store.get(roomId)?.isActive,
          });

          log("info", "player_joined", { roomId, player });
        } catch (e) {
          socket.emit("error", {
            code: e.message ?? "JOIN_FAILED",
            message: "Unable to join room. ",
          });
          log("error", "Player unable to join room", {
            roomId,
            playerName: name,
            playerId,
          });
        }
        const roomStore = new RoomStore();
      });

      socket.on("leave_room", ({ roomId }) => {
        if (!limiter.allow(key))
          return socket.emit("error", { code: "RATE_LIMIT" });
        const playerId = socket.data.playerId;
        if (!playerId || !roomId) return;
        if (!isValidRoomId(roomId))
          return socket.emit("error", { code: "INVALID_CREDENTIALS" });
        const player = store.get(roomId)?.players.get(playerId)!;
        store.removePlayer(roomId, playerId);
        socket.leave(roomId);
        io.to(roomId).emit("player_left", { roomId, player });
        io.to(roomId).emit("room_state", {
          roomId,
          players: store.listPlayers(roomId),
          isActive: !!store.get(roomId)?.isActive,
        });

        log("info", "player_left", { roomId, playerId });
      });

      socket.on("start_question", ({ roomId, questionId }) => {
        if (!limiter.allow(key))
          return socket.emit("error", { code: "RATE_LIMIT" });
        if (!isValidRoomId(roomId)) return;
        const room = store.get(roomId);
        if (!room)
          return socket.emit("error", {
            code: "ROOM_NOT_FOUND",
            message: `Room with id : ${roomId} not found`,
          });

        const questionWithoutAnswer = {
          id: "ajghd",
          text: "Kya aapke toothpaste main namak hai ?",
          options: ["1", "2", "3", "4"],
          durationMs: 10000,
        };

        const questionWithAnswer = questionWithoutAnswer;
        const correctIndex = 3
        questionWithAnswer['correctIndex'] = correctIndex;

        const { endsAt } = engine.startQuestion(roomId, question);
        io.to(roomId).emit("question_start", {
          roomId,
          question: questionWithoutAnswer,
          endsAt
        });

        log("info", "question_start", {
            roomId,
            questionId,
            endsAt
        });

        setTimeout(() => {
            engine.endQuestion(roomId);
            const currentPlayers = store.listPlayers(roomId);
            io.to(roomId).emit('scores_updated', {
                roomId,
                players: currentPlayers,
                correctIndex,
            });
            io.to(roomId).emit('room_state', {
                roomId,
                players: currentPlayers,
                isActive: !!store.get(roomId)?.isActive,
            });
            log("info", "question_end", { roomId, questionId });
        }, questionWithAnswer.durationMs)
      });

      socket.on("submit_answer", ({roomId, questionId, answerIndex}) => {
        if (!limiter.allow(key)) return socket.emit('error', { code: "RATE_LIMIT" });
        const playerId = socket.data.playerId;
        if (!playerId || !isValidRoomId(roomId) || !isValidAnswerIndex(answerIndex)) return socket.emit('error', { code: "INVALID_CREDENTIALS" });
        const isCorrect = engine.evaluateAnswer(roomId, playerId, questionId, answerIndex);
        if (!isCorrect) return; 
        log("info", "answer_submitted", { roomId, playerId, questionId, answerIndex, isCorrect})
      });

      socket.on('disconnect', () => {
        const { roomId, playerId } = socket.data;
        if (!roomId || !playerId ) return;
        const player = store.removePlayer(roomId, playerId);
        io.to(roomId).emit('player_left', {
            roomId,
            player,
            playerId
        });
        io.to(roomId).emit('room_state', {
            roomId,
            players: store.listPlayers(roomId),
            isActive: !!store.get(roomId)?.isActive,
        });
        log("info", "player_disconnected", { roomId, playerId});
      });
    },
  );
}
