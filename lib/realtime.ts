import type { ModelId, ProposalPayload, Question, VoiceState } from "./types";

export interface RealtimeCallbacks {
  onStateChange: (state: VoiceState) => void;
  onTranscript: (text: string) => void;
  onProposal: (proposal: ProposalPayload) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onError: (message: string) => void;
}

export interface RealtimeConnectOptions {
  model: ModelId;
  question: Question;
  callbacks: RealtimeCallbacks;
}

const toolDefinition = {
  type: "function",
  name: "propose_answer",
  description:
    "ユーザーの発言を現在の政策質問への回答候補へ整理する。候補者や政党を推薦せず、ユーザーの意見の方向だけを返す。",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      question_id: { type: "string" },
      answer: {
        type: "string",
        enum: ["strongly_agree", "agree", "neutral", "disagree", "strongly_disagree", "skip"],
      },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      evidence_summary: { type: "string", maxLength: 180 },
    },
    required: ["question_id", "answer", "confidence", "evidence_summary"],
  },
};

function makeQuestionContext(question: Question): string {
  const pack = question.sourcePack;
  return [
    `現在の質問ID: ${question.id}`,
    `質問: ${question.prompt}`,
    `質問の背景: ${pack.summary}`,
    `賛成側の主な論点: ${pack.argumentsFor.map((item) => `${item.title}: ${item.body}`).join(" / ")}`,
    `慎重側の主な論点: ${pack.argumentsAgainst.map((item) => `${item.title}: ${item.body}`).join(" / ")}`,
    "候補者名・政党名・候補者回答・一致度は、このセッションには存在しないものとして扱う。",
  ].join("\n");
}

export class RealtimeVoiceConnection {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private callbacks: RealtimeCallbacks | null = null;
  private transcript = "";
  private handledToolCalls = new Set<string>();
  private question: Question | null = null;

  async connect({ model, question, callbacks }: RealtimeConnectOptions): Promise<void> {
    this.callbacks = callbacks;
    this.question = question;
    callbacks.onStateChange("REQUESTING_PERMISSION");

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("このブラウザではマイク入力を利用できません。");
    }

    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    callbacks.onStateChange("CONNECTING");
    const peerConnection = new RTCPeerConnection();
    this.peerConnection = peerConnection;
    this.localStream.getTracks().forEach((track) => peerConnection.addTrack(track, this.localStream as MediaStream));

    peerConnection.addEventListener("track", (event) => {
      const stream = event.streams[0];
      if (stream) callbacks.onRemoteStream(stream);
    });
    peerConnection.addEventListener("connectionstatechange", () => {
      if (peerConnection.connectionState === "connected") callbacks.onStateChange("LISTENING");
      if (peerConnection.connectionState === "disconnected") callbacks.onStateChange("RECONNECTING");
      if (peerConnection.connectionState === "failed") callbacks.onStateChange("ERROR");
    });

    this.dataChannel = peerConnection.createDataChannel("oai-events");
    this.dataChannel.addEventListener("message", (event) => this.handleServerEvent(event.data));
    this.dataChannel.addEventListener("open", () => this.sendOpeningPrompt());

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    const localDescription = peerConnection.localDescription;
    if (!localDescription?.sdp) throw new Error("WebRTCの接続情報を作成できませんでした。");

    const response = await fetch("/api/realtime/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sdp: localDescription.sdp,
        model,
        question,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || "Realtime APIへの接続に失敗しました。");
    }

    const answer = await response.text();
    await peerConnection.setRemoteDescription({ type: "answer", sdp: answer });
  }

  private sendOpeningPrompt(): void {
    if (!this.dataChannel || this.dataChannel.readyState !== "open" || !this.question) return;
    this.send({
      type: "session.update",
      session: {
        instructions: `質問ごとに短く自然な日本語で進行する。\n${makeQuestionContext(this.question)}`,
        tools: [toolDefinition],
        tool_choice: "auto",
      },
    });
    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: `インタビューを始めます。まず「${this.question.title}」について、答えを誘導しない短い質問をしてください。`,
          },
        ],
      },
    });
    this.send({ type: "response.create" });
  }

  sendText(text: string): void {
    if (!text.trim()) return;
    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: text.trim() }],
      },
    });
    this.send({ type: "response.create" });
  }

  interrupt(): void {
    this.send({ type: "response.cancel" });
    this.callbacks?.onStateChange("INTERRUPTING");
  }

  private send(payload: Record<string, unknown>): void {
    if (this.dataChannel?.readyState === "open") this.dataChannel.send(JSON.stringify(payload));
  }

  private handleServerEvent(raw: string): void {
    let event: { type?: string; [key: string]: unknown };
    try {
      event = JSON.parse(raw) as { type?: string; [key: string]: unknown };
    } catch {
      return;
    }

    switch (event.type) {
      case "input_audio_buffer.speech_started":
        this.callbacks?.onStateChange("USER_SPEAKING");
        break;
      case "input_audio_buffer.speech_stopped":
        this.callbacks?.onStateChange("THINKING");
        break;
      case "response.audio.delta":
        this.callbacks?.onStateChange("SPEAKING");
        break;
      case "response.audio.done":
      case "response.done":
        this.callbacks?.onStateChange("LISTENING");
        break;
      case "response.audio_transcript.delta":
        this.transcript += typeof event.delta === "string" ? event.delta : "";
        this.callbacks?.onTranscript(this.transcript);
        break;
      case "response.function_call_arguments.done":
        this.handleProposal(event);
        break;
      case "error":
        this.callbacks?.onError("音声セッションでエラーが発生しました。");
        break;
      default:
        break;
    }
  }

  private handleProposal(event: { [key: string]: unknown }): void {
    const callId = typeof event.call_id === "string" ? event.call_id : "unknown";
    if (this.handledToolCalls.has(callId)) return;
    this.handledToolCalls.add(callId);

    try {
      const parsed = JSON.parse(typeof event.arguments === "string" ? event.arguments : "{}") as ProposalPayload;
      this.callbacks?.onProposal(parsed);
      this.send({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify({ accepted: true, question_id: parsed.question_id }),
        },
      });
      this.send({ type: "response.create" });
    } catch {
      this.send({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify({ accepted: false }),
        },
      });
    }
  }

  close(): void {
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.dataChannel?.close();
    this.peerConnection?.close();
    this.localStream = null;
    this.dataChannel = null;
    this.peerConnection = null;
    this.callbacks?.onStateChange("DISCONNECTED");
  }
}

