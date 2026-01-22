import { z } from "zod";

const JoinRoomSchema = z.object({
    roomId: z.string().min(1),
    name: z.string().min(1).max(50),
});

const SubmitAnswerSchema = z.object({
    questionId: z.string().min(1),
    answerIndex: z.number().int().nonnegative(),
});