"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { QUESTIONS } from "@/lib/questions";
import { RealtimeVoiceConnection } from "@/lib/realtime";
import {
  ANSWER_LABELS,
  ANSWER_VALUES,
  isAnswerValue,
  type AnswerRecord,
  type AnswerValue,
  type ModelId,
  type ProposalPayload,
  type VoiceState,
} from "@/lib/types";

const STORAGE_KEY = "oshisen-ai-interviewer.answers.v1";

const VOICE_LABELS: Record<VoiceState, string> = {
  IDLE: "待機中",
  REQUESTING_PERMISSION: "マイクを確認中",
  CONNECTING: "接続しています",
  LISTENING: "聞いています",
  USER_SPEAKING: "聞いています",
  THINKING: "整理しています",
  SPEAKING: "話しています",
  INTERRUPTING: "切り替えています",
  PAUSED: "一時停止中",
  RECONNECTING: "再接続しています",
  PERMISSION_DENIED: "マイクが使えません",
  ERROR: "接続エラー",
  DISCONNECTED: "終了しました",
};

const VOICE_DESCRIPTIONS: Record<VoiceState, string> = {
  IDLE: "話した内容はこの端末のデモ状態に反映できます。",
  REQUESTING_PERMISSION: "ブラウザのマイク許可を確認しています。",
  CONNECTING: "安全な音声セッションを準備しています。",
  LISTENING: "あなたの言葉を待っています。途中で割り込んでも大丈夫です。",
  USER_SPEAKING: "そのまま話してください。",
  THINKING: "話してくれた内容を質問への回答として整理しています。",
  SPEAKING: "必要な説明をしています。話し始めると中断できます。",
  INTERRUPTING: "AIの発話を止めています。",
  PAUSED: "再開すると会話を続けられます。",
  RECONNECTING: "接続を戻しています。回答候補は保持されます。",
  PERMISSION_DENIED: "ブラウザ設定からマイクを許可するか、デモで試せます。",
  ERROR: "接続できませんでした。デモで画面の流れを確認できます。",
  DISCONNECTED: "セッションを終了しました。",
};

const DEMO_TRANSCRIPTS = [
  "地方では車が必要ですが、高齢者の移動手段も残したいです。",
  "支援には賛成ですが、増える負担が大きすぎるなら慎重になります。",
  "使う人だけでなく、地域全体の安心につながるなら意味があると思います。",
];

const DEMO_PROPOSALS: Record<string, ProposalPayload> = {
  "transport-01": {
    question_id: "transport-01",
    answer: "agree",
    confidence: 0.84,
    evidence_summary: "公共交通を残すことには賛成だが、費用負担には慎重という理解です。",
  },
  "childcare-02": {
    question_id: "childcare-02",
    answer: "agree",
    confidence: 0.8,
    evidence_summary: "子育ての負担を社会で支えることに前向きという理解です。",
  },
  "disaster-03": {
    question_id: "disaster-03",
    answer: "strongly_agree",
    confidence: 0.9,
    evidence_summary: "命に関わる備えは、他の施策より優先したいという理解です。",
  },
  "energy-04": {
    question_id: "energy-04",
    answer: "neutral",
    confidence: 0.7,
    evidence_summary: "環境対策は必要だが、費用と安定供給の両方を見たいという理解です。",
  },
  "local-finance-05": {
    question_id: "local-finance-05",
    answer: "disagree",
    confidence: 0.78,
    evidence_summary: "負担を増やす前に、行政サービスの見直しを優先したいという理解です。",
  },
};

function createInitialAnswers(): Record<string, AnswerRecord> {
  return Object.fromEntries(
    QUESTIONS.map((question, index) => {
      const seed = index === 0 ? DEMO_PROPOSALS[question.id] : null;
      return [
        question.id,
        {
          questionId: question.id,
          status: seed ? "PROPOSED" : "EMPTY",
          suggestedAnswer: seed?.answer ?? null,
          confirmedAnswer: null,
          confidence: seed?.confidence ?? null,
          evidenceSummary: seed?.evidence_summary ?? null,
          manuallyEdited: false,
          updatedAt: Date.now(),
        } satisfies AnswerRecord,
      ];
    }),
  );
}

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "mic") {
    return <svg {...common}><rect x="8" y="3" width="8" height="12" rx="4" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8.5 21h7" /></svg>;
  }
  if (name === "spark") {
    return <svg {...common}><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></svg>;
  }
  if (name === "book") {
    return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 5.5v16M8 7h8M8 11h8" /></svg>;
  }
  if (name === "info") {
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 10v6M12 7h.01" /></svg>;
  }
  if (name === "edit") {
    return <svg {...common}><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>;
  }
  if (name === "check") {
    return <svg {...common}><path d="m5 12 4.5 4.5L19 7" /></svg>;
  }
  if (name === "arrow") {
    return <svg {...common}><path d="M4 12h15M13 6l6 6-6 6" /></svg>;
  }
  if (name === "chevron") {
    return <svg {...common}><path d="m8 10 4 4 4-4" /></svg>;
  }
  if (name === "close") {
    return <svg {...common}><path d="M6 6l12 12M18 6 6 18" /></svg>;
  }
  if (name === "pause") {
    return <svg {...common}><path d="M9 5v14M15 5v14" /></svg>;
  }
  if (name === "shield") {
    return <svg {...common}><path d="M12 3 19 6v5c0 4.5-2.8 7.7-7 10-4.2-2.3-7-5.5-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
  }
  return <svg {...common}><circle cx="12" cy="12" r="8" /></svg>;
}

function Waveform({ state }: { state: VoiceState }) {
  const bars = [14, 25, 38, 21, 48, 30, 58, 34, 52, 27, 42, 20, 33, 16, 26];
  return (
    <div className={`waveform waveform-${state.toLowerCase()}`} aria-hidden="true">
      {bars.map((height, index) => <span key={index} style={{ "--bar-height": `${height}%`, "--bar-delay": `${index * 70}ms` } as CSSProperties} />)}
    </div>
  );
}

export default function Home() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>(() => createInitialAnswers());
  const [voiceState, setVoiceState] = useState<VoiceState>("IDLE");
  const [model, setModel] = useState<ModelId>("gpt-realtime-2.1");
  const [transcript, setTranscript] = useState("");
  const [typedText, setTypedText] = useState("");
  const [sourceOpen, setSourceOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const connectionRef = useRef<RealtimeVoiceConnection | null>(null);
  const demoTimersRef = useRef<number[]>([]);

  const currentQuestion = QUESTIONS[currentIndex];
  const currentAnswer = answers[currentQuestion.id];
  const completedCount = useMemo(
    () => Object.values(answers).filter((answer) => answer.status === "CONFIRMED" || answer.status === "SKIPPED").length,
    [answers],
  );
  const isLive = ["REQUESTING_PERMISSION", "CONNECTING", "LISTENING", "USER_SPEAKING", "THINKING", "SPEAKING", "INTERRUPTING", "RECONNECTING"].includes(voiceState);
  const answerLabel = currentAnswer.confirmedAnswer
    ? ANSWER_LABELS[currentAnswer.confirmedAnswer]
    : currentAnswer.suggestedAnswer
      ? ANSWER_LABELS[currentAnswer.suggestedAnswer]
      : "回答候補を待っています";

  const updateAnswer = useCallback((questionId: string, changes: Partial<AnswerRecord>) => {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: {
        ...previous[questionId],
        ...changes,
        updatedAt: Date.now(),
      },
    }));
  }, []);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Record<string, AnswerRecord>;
      if (parsed && typeof parsed === "object") setAnswers((previous) => ({ ...previous, ...parsed }));
    } catch {
      // A stale or blocked sessionStorage should not stop the interview UI.
    }
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch {
      // The current session can still be completed when storage is unavailable.
    }
  }, [answers]);

  const clearDemoTimers = useCallback(() => {
    demoTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    demoTimersRef.current = [];
  }, []);

  const applyProposal = useCallback((proposal: ProposalPayload) => {
    if (proposal.question_id !== currentQuestion.id || !isAnswerValue(proposal.answer)) return;
    const confidence = Math.min(1, Math.max(0, Number(proposal.confidence) || 0));
    updateAnswer(currentQuestion.id, {
      status: confidence >= 0.75 ? "PROPOSED" : "UNCERTAIN",
      suggestedAnswer: proposal.answer,
      confidence,
      evidenceSummary: proposal.evidence_summary?.slice(0, 180) ?? null,
    });
  }, [currentQuestion.id, updateAnswer]);

  const startDemo = useCallback(() => {
    connectionRef.current?.close();
    connectionRef.current = null;
    clearDemoTimers();
    setDemoMode(true);
    setErrorMessage("");
    setTranscript("");
    setVoiceState("LISTENING");
    const sample = DEMO_TRANSCRIPTS[currentIndex % DEMO_TRANSCRIPTS.length];
    const proposal = DEMO_PROPOSALS[currentQuestion.id];
    const firstTimer = window.setTimeout(() => {
      setVoiceState("USER_SPEAKING");
      setTranscript(sample);
    }, 450);
    const secondTimer = window.setTimeout(() => setVoiceState("THINKING"), 1450);
    const thirdTimer = window.setTimeout(() => {
      if (proposal) applyProposal(proposal);
      setVoiceState("LISTENING");
    }, 2200);
    demoTimersRef.current = [firstTimer, secondTimer, thirdTimer];
  }, [applyProposal, clearDemoTimers, currentIndex, currentQuestion.id]);

  const startLive = useCallback(async () => {
    clearDemoTimers();
    setDemoMode(false);
    setErrorMessage("");
    connectionRef.current?.close();
    const connection = new RealtimeVoiceConnection();
    connectionRef.current = connection;
    try {
      await connection.connect({
        model,
        question: currentQuestion,
        callbacks: {
          onStateChange: setVoiceState,
          onTranscript: setTranscript,
          onProposal: applyProposal,
          onRemoteStream: (stream) => {
            const audio = document.querySelector<HTMLAudioElement>("#remote-audio");
            if (audio) {
              audio.srcObject = stream;
              void audio.play().catch(() => undefined);
            }
          },
          onError: (message) => {
            setErrorMessage(message);
            setVoiceState("ERROR");
          },
        },
      });
    } catch (error) {
      connection.close();
      connectionRef.current = null;
      const message = error instanceof Error ? error.message : "音声セッションを開始できませんでした。";
      setErrorMessage(message);
      setVoiceState(message.includes("マイク") ? "PERMISSION_DENIED" : "ERROR");
    }
  }, [applyProposal, clearDemoTimers, currentQuestion, model]);

  const stopVoice = useCallback(() => {
    clearDemoTimers();
    connectionRef.current?.close();
    connectionRef.current = null;
    setDemoMode(false);
    setVoiceState("IDLE");
  }, [clearDemoTimers]);

  useEffect(() => () => {
    clearDemoTimers();
    connectionRef.current?.close();
  }, [clearDemoTimers]);

  const selectAnswer = useCallback((value: AnswerValue) => {
    updateAnswer(currentQuestion.id, {
      status: value === "skip" ? "SKIPPED" : "CONFIRMED",
      suggestedAnswer: value,
      confirmedAnswer: value,
      confidence: 1,
      manuallyEdited: true,
    });
    setEditOpen(false);
  }, [currentQuestion.id, updateAnswer]);

  const confirmProposal = useCallback(() => {
    if (!currentAnswer.suggestedAnswer) {
      setEditOpen(true);
      return;
    }
    updateAnswer(currentQuestion.id, {
      status: "CONFIRMED",
      confirmedAnswer: currentAnswer.suggestedAnswer,
    });
  }, [currentAnswer.suggestedAnswer, currentQuestion.id, updateAnswer]);

  const nextQuestion = useCallback(() => {
    if (currentAnswer.status === "PROPOSED" && currentAnswer.suggestedAnswer) {
      updateAnswer(currentQuestion.id, {
        status: "CONFIRMED",
        confirmedAnswer: currentAnswer.suggestedAnswer,
      });
    }
    stopVoice();
    setTranscript("");
    setSourceOpen(false);
    if (currentIndex === QUESTIONS.length - 1) {
      setReviewOpen(true);
    } else {
      setCurrentIndex((index) => index + 1);
    }
  }, [currentAnswer, currentIndex, currentQuestion.id, stopVoice, updateAnswer]);

  const sendText = useCallback(() => {
    const message = typedText.trim();
    if (!message) return;
    setTranscript(message);
    setTypedText("");
    if (connectionRef.current) {
      setVoiceState("THINKING");
      connectionRef.current.sendText(message);
      return;
    }
    setDemoMode(true);
    setVoiceState("THINKING");
    const proposal = DEMO_PROPOSALS[currentQuestion.id];
    const timer = window.setTimeout(() => {
      if (proposal) applyProposal(proposal);
      setVoiceState("LISTENING");
    }, 800);
    demoTimersRef.current.push(timer);
  }, [applyProposal, currentQuestion.id, typedText]);

  return (
    <main className="app-shell">
      <audio id="remote-audio" autoPlay aria-hidden="true" />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Icon name="spark" size={18} /></div>
          <div>
            <p className="brand-name">オシセン</p>
            <p className="brand-subtitle">AI音声インタビュアー</p>
          </div>
        </div>
        <div className="topbar-actions">
          <label className="model-control">
            <span>開発用モデル</span>
            <select aria-label="音声モデル" value={model} onChange={(event) => setModel(event.target.value as ModelId)}>
              <option value="gpt-realtime-2.1">GPT-Realtime-2.1</option>
              <option value="gpt-realtime-2.1-mini">GPT-Realtime-2.1 Mini</option>
            </select>
          </label>
          <span className={`connection-chip ${demoMode ? "is-demo" : ""}`}>
            <span className="connection-dot" />
            {demoMode ? "デモ" : voiceState === "IDLE" ? "未接続" : VOICE_LABELS[voiceState]}
          </span>
        </div>
      </header>

      <section className="privacy-note" aria-label="音声利用について">
        <div className="privacy-icon"><Icon name="shield" size={17} /></div>
        <p>音声モードでは会話がAIサービスへ送信されます。録音はこのアプリで保存しません。通常の診断も選べます。</p>
        <button type="button" className="text-button">利用について <Icon name="arrow" size={14} /></button>
      </section>

      <section className="progress-area" aria-label="診断の進行状況">
        <div className="progress-copy">
          <span>政策インタビュー</span>
          <strong>質問 {currentQuestion.index} <em>/ {QUESTIONS.length}</em></strong>
        </div>
        <div className="progress-track"><span style={{ width: `${(currentQuestion.index / QUESTIONS.length) * 100}%` }} /></div>
        <div className="progress-foot">
          <span>{completedCount}問を確定済み</span>
          <span>目安 8分</span>
        </div>
      </section>

      <div className="workspace">
        <section className="main-column">
          <div className="question-intro">
            <div className="category-label"><span className="category-line" />{currentQuestion.category}</div>
            <h1>{currentQuestion.title}</h1>
            <p className="question-prompt">{currentQuestion.prompt}</p>
            <p className="question-helper"><Icon name="info" size={16} />{currentQuestion.helper}</p>
          </div>

          <section className="voice-card" aria-label="音声インタビュー">
            <div className="section-heading-row">
              <div>
                <p className="eyebrow">VOICE INTERVIEW</p>
                <h2>あなたの考えを聞かせてください</h2>
              </div>
              <span className={`live-indicator ${isLive ? "is-active" : ""}`}><span />{VOICE_LABELS[voiceState]}</span>
            </div>

            <div className={`voice-stage ${isLive ? "is-live" : ""}`}>
              <div className="voice-orbit orbit-one" />
              <div className="voice-orbit orbit-two" />
              <div className="voice-core"><Icon name="mic" size={28} /></div>
              <Waveform state={voiceState} />
              <p className="voice-state-label">{VOICE_LABELS[voiceState]}</p>
              <p className="voice-state-description">{VOICE_DESCRIPTIONS[voiceState]}</p>
            </div>

            <div className="voice-actions">
              {!isLive && <button type="button" className="primary-button" onClick={startLive}><Icon name="mic" size={17} />音声で話す</button>}
              <button type="button" className="secondary-button" onClick={startDemo}><Icon name="spark" size={16} />デモで試す</button>
              {isLive && <button type="button" className="quiet-button" onClick={stopVoice}><Icon name="pause" size={16} />停止</button>}
            </div>

            {(errorMessage || voiceState === "ERROR" || voiceState === "PERMISSION_DENIED") && (
              <div className="error-note"><Icon name="info" size={16} /><span>{errorMessage || VOICE_DESCRIPTIONS[voiceState]}</span></div>
            )}

            <div className="transcript-box">
              <div className="transcript-meta"><span>会話メモ</span><span>自動保存なし</span></div>
              <p className="transcript-text">{transcript || "ここに話した内容が短く表示されます"}</p>
            </div>

            <div className="text-composer">
              <input
                aria-label="テキストで補足"
                value={typedText}
                onChange={(event) => setTypedText(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") sendText(); }}
                placeholder="声で話しづらいときは、ここに入力できます"
              />
              <button type="button" aria-label="補足を送信" onClick={sendText} disabled={!typedText.trim()}><Icon name="arrow" size={17} /></button>
            </div>
          </section>

          <section className="answer-card" aria-label="AIの回答候補">
            <div className="answer-card-top">
              <div>
                <p className="eyebrow">ANSWER DRAFT</p>
                <h2>AIの理解</h2>
              </div>
              <span className={`answer-state state-${currentAnswer.status.toLowerCase()}`}>
                {currentAnswer.status === "CONFIRMED" ? "確定済み" : currentAnswer.status === "PROPOSED" ? "候補" : currentAnswer.status === "UNCERTAIN" ? "確認が必要" : currentAnswer.status === "SKIPPED" ? "保留" : "会話中"}
              </span>
            </div>
            <div className="answer-main">
              <div>
                <span className="answer-label">今回の回答</span>
                <strong className="answer-value">{answerLabel}</strong>
              </div>
              <button type="button" className="edit-link" onClick={() => setEditOpen(true)}><Icon name="edit" size={16} />回答を変更</button>
            </div>
            <div className="answer-detail">
              <div className="confidence-meter">
                <div className="confidence-copy">
                  <span>確信度</span>
                  <strong>{currentAnswer.confidence === null ? "—" : `${Math.round(currentAnswer.confidence * 100)}%`}</strong>
                </div>
                <div className="confidence-track"><span style={{ width: `${Math.round((currentAnswer.confidence ?? 0) * 100)}%` }} /></div>
              </div>
              <p className="evidence-copy">{currentAnswer.evidenceSummary || "会話を続けると、AIが回答候補と理由をここに整理します。"}</p>
            </div>
            <div className="answer-rule"><Icon name="info" size={15} />候補はあなたが確認するまで診断結果へ反映されません。</div>
          </section>

          <button type="button" className="mobile-source-button" onClick={() => setSourceOpen(true)}><span><Icon name="book" size={17} />判断材料</span><Icon name="chevron" size={17} /></button>
        </section>

        <aside className={`source-sidebar ${sourceOpen ? "is-open" : ""}`} aria-label="判断材料">
          <div className="source-sidebar-header">
            <div><p className="eyebrow">SOURCE PACK</p><h2>判断材料</h2></div>
            <button type="button" className="close-source" aria-label="判断材料を閉じる" onClick={() => setSourceOpen(false)}><Icon name="close" size={18} /></button>
          </div>
          <p className="source-summary">{currentQuestion.sourcePack.summary}</p>
          <div className="source-divider" />
          <section className="argument-section">
            <h3><span className="argument-dot for-dot" />賛成側の主な論点</h3>
            {currentQuestion.sourcePack.argumentsFor.map((argument) => <div className="argument-item" key={argument.title}><strong>{argument.title}</strong><p>{argument.body}</p></div>)}
          </section>
          <section className="argument-section">
            <h3><span className="argument-dot against-dot" />慎重側の主な論点</h3>
            {currentQuestion.sourcePack.argumentsAgainst.map((argument) => <div className="argument-item" key={argument.title}><strong>{argument.title}</strong><p>{argument.body}</p></div>)}
          </section>
          <div className="source-divider" />
          <section className="reference-section">
            <div className="reference-heading"><h3><Icon name="book" size={16} />参考資料</h3><span>確認済み</span></div>
            {currentQuestion.sourcePack.sources.map((source) => <a className="source-link" key={source.id} href={source.url} target="_blank" rel="noreferrer"><span><strong>{source.title}</strong><small>{source.publisher} · {source.retrievedAt}確認</small></span><Icon name="arrow" size={15} /></a>)}
          </section>
          <p className="source-note">説明はこのSource Packの内容を中心に行います。さらに調べたいときは、会話を止めて公式資料を確認できます。</p>
        </aside>
      </div>

      <footer className="bottom-bar">
        <button type="button" className="back-button" onClick={() => { if (currentIndex > 0) { stopVoice(); setCurrentIndex((index) => index - 1); setTranscript(""); } }} disabled={currentIndex === 0}><span>←</span>戻る</button>
        <div className="footer-center">{QUESTIONS.map((question, index) => <span className={`footer-progress-dot ${index <= currentIndex ? "is-filled" : ""}`} key={question.id} />)}</div>
        <div className="footer-actions"><button type="button" className="skip-button" onClick={() => selectAnswer("skip")}>今回は保留</button><button type="button" className="next-button" onClick={nextQuestion}>{currentIndex === QUESTIONS.length - 1 ? "回答を確認" : "次の質問へ"}<Icon name="arrow" size={17} /></button></div>
      </footer>

      {editOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditOpen(false)}>
          <div className="edit-sheet" role="dialog" aria-modal="true" aria-labelledby="edit-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header"><div><p className="eyebrow">YOUR ANSWER</p><h2 id="edit-title">回答を選び直す</h2></div><button type="button" aria-label="閉じる" onClick={() => setEditOpen(false)}><Icon name="close" size={19} /></button></div>
            <p className="modal-question">{currentQuestion.title}</p>
            <div className="answer-options">
              {ANSWER_VALUES.map((value) => <label className={`answer-option ${currentAnswer.confirmedAnswer === value || (!currentAnswer.confirmedAnswer && currentAnswer.suggestedAnswer === value) ? "is-selected" : ""}`} key={value}><input type="radio" name="answer" value={value} checked={currentAnswer.confirmedAnswer === value || (!currentAnswer.confirmedAnswer && currentAnswer.suggestedAnswer === value)} onChange={() => selectAnswer(value)} /><span className="radio-mark" /><span>{ANSWER_LABELS[value]}</span></label>)}
            </div>
            <p className="modal-note"><Icon name="info" size={15} />「まだ判断できない」は中立の回答とは別に、保留として扱います。</p>
          </div>
        </div>
      )}

      {reviewOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="review-sheet" role="dialog" aria-modal="true" aria-labelledby="review-title">
            <div className="modal-header"><div><p className="eyebrow">FINAL REVIEW</p><h2 id="review-title">回答を確認する</h2></div><button type="button" aria-label="閉じる" onClick={() => setReviewOpen(false)}><Icon name="close" size={19} /></button></div>
            <p className="review-intro">確定した回答だけが、既存の政策一致度計算へ渡されます。</p>
            <div className="review-list">{QUESTIONS.map((question, index) => { const record = answers[question.id]; return <button type="button" className="review-row" key={question.id} onClick={() => { setCurrentIndex(index); setReviewOpen(false); }}><span className="review-index">{String(index + 1).padStart(2, "0")}</span><span className="review-title">{question.title}</span><span className={record.confirmedAnswer ? "review-answer" : "review-pending"}>{record.confirmedAnswer ? ANSWER_LABELS[record.confirmedAnswer] : "未回答"}</span><Icon name="chevron" size={16} /></button>; })}</div>
            <button type="button" className="primary-button review-submit" onClick={() => { setReviewOpen(false); setResultOpen(true); }}>この回答で診断へ <Icon name="arrow" size={17} /></button>
          </div>
        </div>
      )}

      {resultOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="result-sheet" role="dialog" aria-modal="true" aria-labelledby="result-title">
            <div className="result-icon"><Icon name="check" size={28} /></div><p className="eyebrow">READY FOR MATCHING</p><h2 id="result-title">回答の準備ができました</h2><p>ここで確定した回答を既存の一致度計算へ渡せる状態です。候補者情報は音声インタビューに含めていません。</p><div className="result-stat"><strong>{completedCount}</strong><span>/ {QUESTIONS.length}問を確定</span></div><button type="button" className="primary-button" onClick={() => setResultOpen(false)}>インタビュー画面に戻る</button>
          </div>
        </div>
      )}
    </main>
  );
}
