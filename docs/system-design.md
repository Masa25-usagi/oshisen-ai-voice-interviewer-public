# システム設計

## コンポーネント

```text
ブラウザ
  ├─ 質問 / Source Pack / 回答状態の表示
  ├─ getUserMedia + RTCPeerConnection
  └─ DataChannelでRealtimeイベントを受信
          │ SDP offer + 現在の質問（候補者データなし）
          ▼
Next.js Route Handler: /api/realtime/session
  ├─ モデルと入力サイズを検証
  ├─ サーバー専用の OPENAI_API_KEY でRealtime callsを作成
  └─ SDP answerをブラウザへ返す
          │
          ▼
OpenAI Realtime API
  └─ 音声対話 / propose_answer ツール呼び出し

確認済み回答 ──► 既存の候補者一致度計算（lib/matching.ts）
```

## 状態の境界

- `VoiceState` はマイク許可、接続、発話、AI発話、エラーを表す。
- `AnswerState` は `EMPTY` → `PROPOSED` → `CONFIRMED` / `SKIPPED` を基本経路とする。
- `suggestedAnswer` と `confirmedAnswer` は別フィールドに保持する。
- `lib/realtime.ts` と `/api/realtime/session` は候補者データを受け取らない。
- `lib/matching.ts` は候補者データを受け取れる唯一の境界として分離する。

## Realtimeイベント

ブラウザ側は音声トラックをPeerConnectionへ追加し、DataChannel `oai-events` でイベントを受信します。`response.audio_transcript.delta` は画面上の一時的な会話メモに反映し、`response.function_call_arguments.done` の `propose_answer` を回答候補へ変換します。同じ `call_id` は一度だけ処理します。

## エラー時の扱い

- APIキーがない場合、Route Handlerは503を返し、UIはデモモードを案内する。
- マイク拒否やブラウザ非対応は音声状態に表示し、デモ・テキスト入力を残す。
- Realtime接続が失敗しても、既に保持している回答候補を消さない。
- 音声・文字起こしはアプリ側で保存しない。`sessionStorage` に保存するのは回答状態だけ。
