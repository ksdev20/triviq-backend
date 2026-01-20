export const isValidRoomId = (roomId: string) => /^[a-zA-Z0-9_-]{3, 32}$/.test(roomId);
export const isValidName = (name: string) => typeof name === "string" && name.trim().length > 2 && name.trim().length < 32;
export const isValidAnswerIndex = (answerIndex: number) =>  typeof answerIndex === "number" && answerIndex >= 0 && answerIndex <= 9;