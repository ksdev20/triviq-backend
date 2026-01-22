import jwt from 'jsonwebtoken';
import { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  Question,
  RoomID,
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

//WebSockets Handling
type IOServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
>;

type SocketType = Socket<
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

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || (socket.handshake.headers["authorization"] as string | undefined)?.replace(/^Bearer\s+/i, "");
    if (!token) return next(new Error("Missing auth token"));

    try {
      const decoded = jwt.verify(token, CONFIG.jwtSecret) as { playerID: string; name?: string};
      socket.data.playerId = decoded.playerID;
      socket.data.name = decoded.name;
      next();
    } catch (e) {
      next(new Error("Invalid or expired token"));
    }
  })

  io.on("connection", (socket: SocketType) => {
    const key = socket.handshake.address || socket.id;

    socket.on("heartbeat", () => {});

    const onJoinRoom = ({ roomId, name }: { roomId: RoomID; name: string }) => {
      if (!limiter.allow(key)) {
        return socket.emit("error", { code: "RATE_LIMIT" });
      }
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

        io.to(roomId).emit("player_joined", { player });
        io.to(roomId).emit("room_state", {
          roomId,
          players: store.listPlayers(roomId),
          isActive: !!store.get(roomId)?.isActive,
        });

        log("info", "player_joined", { roomId, player });
      } catch (e) {
        if (e instanceof Error) {
          socket.emit("error", {
            code: e.message ?? "JOIN_FAILED",
            message: "Unable to join room. ",
          });
        } else {
          socket.emit("error", {
            code: "JOIN_FAILED_SERVER_ERROR",
            message: "Unable to join. Also server error.",
          });
        }
        log("error", "Player unable to join room", {
          roomId,
          playerName: name,
          playerId,
        });
      }
    };

    const onLeaveRoom = () => {
      const roomId = socket.data.roomId;
      if (!limiter.allow(key))
        return socket.emit("error", { code: "RATE_LIMIT" });
      const playerId = socket.data.playerId;
      if (!playerId || !roomId) return;
      if (!isValidRoomId(roomId))
        return socket.emit("error", { code: "INVALID_CREDENTIALS" });
      const player = store.get(roomId)?.players.get(playerId)!;
      store.removePlayer(roomId, playerId);
      socket.leave(roomId);
      io.to(roomId).emit("player_left", { player, playerId });
      io.to(roomId).emit("room_state", {
        roomId,
        players: store.listPlayers(roomId),
        isActive: !!store.get(roomId)?.isActive,
      });

      log("info", "player_left", { roomId, playerId });
    };

    const onStartQuestion = ({ questionId }: { questionId: string }) => {
      const roomId = socket.data.roomId;
      if (!limiter.allow(key))
        return socket.emit("error", { code: "RATE_LIMIT" });
      if (!isValidRoomId(roomId)) return;
      const room = store.get(roomId);
      if (!room)
        return socket.emit("error", {
          code: "ROOM_NOT_FOUND",
          message: `Room with id : ${roomId} not found`,
        });

      const publicQuestion: Omit<Question, "correctIndex"> = {
        id: "ajghd",
        text: "Kya aapke toothpaste main namak hai ?",
        options: ["1", "2", "3", "4"],
        durationMs: 15000,
      };

      const correctIndex = 3;
      const privateQuestion: Question = {
        ...publicQuestion,
        correctIndex: correctIndex,
      };

      const { endsAt } = engine.startQuestion(roomId, privateQuestion);
      io.to(roomId).emit("question_start", {
        question: publicQuestion,
        endsAt,
      });

      log("info", "question_start", {
        roomId,
        questionId,
        endsAt,
      });

      setTimeout(() => {
        engine.endQuestion(roomId);
        const currentPlayers = store.listPlayers(roomId);
        io.to(roomId).emit("scores_updated", {
          players: currentPlayers,
          correctIndex,
        });
        io.to(roomId).emit("room_state", {
          roomId,
          players: currentPlayers,
          isActive: !!store.get(roomId)?.isActive,
        });
        log("info", "question_end", { roomId, questionId });
      }, publicQuestion.durationMs || CONFIG.questionDurationMs);
    };

    const onSubmitAnswer = ({
      questionId,
      answerIndex,
    }: {
      questionId: string;
      answerIndex: number;
    }) => {
      const roomId = socket.data.roomId;
      if (!limiter.allow(key))
        return socket.emit("error", { code: "RATE_LIMIT" });
      const playerId = socket.data.playerId;
      if (
        !playerId ||
        !isValidRoomId(roomId) ||
        !isValidAnswerIndex(answerIndex)
      )
        return socket.emit("error", { code: "INVALID_CREDENTIALS" });
      const isCorrect = engine.evaluateAnswer(
        roomId,
        playerId,
        questionId,
        answerIndex,
      );
      if (!isCorrect) return;
      log("info", "answer_submitted", {
        roomId,
        playerId,
        questionId,
        answerIndex,
        isCorrect,
      });
    };

    const onDisconnect = () => {
      const { roomId, playerId } = socket.data;
      if (!roomId || !playerId) return;
      const player = store.removePlayer(roomId, playerId);
      io.to(roomId).emit("player_left", {
        player,
        playerId,
      });
      io.to(roomId).emit("room_state", {
        roomId,
        players: store.listPlayers(roomId),
        isActive: !!store.get(roomId)?.isActive,
      });
      log("info", "player_disconnected", { roomId, playerId });
    };

    socket.on("join_room", onJoinRoom);
    socket.on("leave_room", onLeaveRoom);
    socket.on("start_question", onStartQuestion);
    socket.on("submit_answer", onSubmitAnswer);
    socket.on("disconnect", onDisconnect);
  });
}
