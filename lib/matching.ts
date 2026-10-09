import type { AnswerValue } from "./types";

/**
 * Candidate data deliberately lives behind this boundary. Realtime instructions
 * and proposal payloads never include it. Only confirmed user answers reach this
 * deterministic matching function in the production integration.
 */
export interface ConfirmedUserAnswer {
  questionId: string;
  answer: AnswerValue;
}

export interface CandidateAnswerSet {
  candidateId: string;
  candidateLabel: string;
  answers: Record<string, AnswerValue>;
}

export interface MatchResult {
  candidateId: string;
  candidateLabel: string;
  score: number | null;
  comparedQuestions: number;
}

const scoreForPair = (user: AnswerValue, candidate: AnswerValue): number | null => {
  if (user === "skip" || candidate === "skip") return null;
  const values: Record<Exclude<AnswerValue, "skip">, number> = {
    strongly_disagree: 1,
    disagree: 2,
    neutral: 3,
    agree: 4,
    strongly_agree: 5,
  };
  return Math.max(0, 100 - Math.abs(values[user] - values[candidate]) * 25);
};

export function calculateMatching(
  confirmedAnswers: ConfirmedUserAnswer[],
  candidates: CandidateAnswerSet[],
): MatchResult[] {
  return candidates
    .map((candidate) => {
      const scores = confirmedAnswers
        .map((answer) => scoreForPair(answer.answer, candidate.answers[answer.questionId]))
        .filter((score): score is number => score !== null);
      return {
        candidateId: candidate.candidateId,
        candidateLabel: candidate.candidateLabel,
        score: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null,
        comparedQuestions: scores.length,
      };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}
