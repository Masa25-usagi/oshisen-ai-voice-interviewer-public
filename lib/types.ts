export const ANSWER_VALUES = [
  "strongly_agree",
  "agree",
  "neutral",
  "disagree",
  "strongly_disagree",
  "skip",
] as const;

export type AnswerValue = (typeof ANSWER_VALUES)[number];

export const ANSWER_LABELS: Record<AnswerValue, string> = {
  strongly_agree: "強く賛成",
  agree: "やや賛成",
  neutral: "どちらともいえない",
  disagree: "やや反対",
  strongly_disagree: "強く反対",
  skip: "まだ判断できない",
};

export type AnswerState =
  | "EMPTY"
  | "COLLECTING"
  | "UNCERTAIN"
  | "PROPOSED"
  | "MANUAL_EDIT"
  | "CONFIRMED"
  | "SKIPPED";

export type VoiceState =
  | "IDLE"
  | "REQUESTING_PERMISSION"
  | "CONNECTING"
  | "LISTENING"
  | "USER_SPEAKING"
  | "THINKING"
  | "SPEAKING"
  | "INTERRUPTING"
  | "PAUSED"
  | "RECONNECTING"
  | "PERMISSION_DENIED"
  | "ERROR"
  | "DISCONNECTED";

export type ModelId = "gpt-realtime-2.1" | "gpt-realtime-2.1-mini";

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  publishedAt?: string;
  retrievedAt: string;
}

export interface Argument {
  title: string;
  body: string;
}

export interface SourcePack {
  questionId: string;
  summary: string;
  argumentsFor: Argument[];
  argumentsAgainst: Argument[];
  sources: Source[];
}

export interface Question {
  id: string;
  index: number;
  category: string;
  title: string;
  prompt: string;
  helper: string;
  sourcePack: SourcePack;
}

export interface AnswerRecord {
  questionId: string;
  status: AnswerState;
  suggestedAnswer: AnswerValue | null;
  confirmedAnswer: AnswerValue | null;
  confidence: number | null;
  evidenceSummary: string | null;
  manuallyEdited: boolean;
  updatedAt: number;
}

export interface ProposalPayload {
  question_id: string;
  answer: AnswerValue;
  confidence: number;
  evidence_summary: string;
}

export const isAnswerValue = (value: unknown): value is AnswerValue =>
  typeof value === "string" && ANSWER_VALUES.includes(value as AnswerValue);
