# オシセン — AI音声インタビュアー

政策について自然に話しながら、自分の考えを整理するためのMVPです。候補者や政党の情報を音声セッションへ渡さず、AIは利用者の回答候補だけを `propose_answer` として返します。候補者との一致度計算へ進むのは、利用者が確認した回答だけです。

## ローカルで起動

Node.js 20 以上を用意し、次を実行します。

```bash
npm install
cp .env.example .env.local
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。`OPENAI_API_KEY` が未設定でも、画面の「デモで試す」からインタビューの流れを確認できます。

実際の音声接続を使う場合だけ、`.env.local` に自分の OpenAI API キーを設定してください。キーはブラウザへ公開せず、Next.js の `/api/realtime/session` から Realtime API の WebRTC セッションを作成します。

## 実装範囲

- 日本語の5問インタビュー画面
- `gpt-realtime-2.1` / `gpt-realtime-2.1-mini` の切り替え
- ブラウザのマイク入力、WebRTC音声、割り込み、テキスト補助入力
- AIの回答候補、確信度、根拠要約の確認・手動変更
- 賛成側・慎重側を並べた Source Pack 表示
- セッション中の回答状態保存（`sessionStorage`）
- 候補者データと音声インタビューを分離した一致度計算境界（`lib/matching.ts`）

画面のデザイン方針と公式サイトから抽出したトークンは [design.md](./design.md) にまとめています。

## 検証

```bash
npm run build
```

本番運用では、Source Pack の公開日・取得日時・引用範囲をデータ登録時に検証し、音声・文字起こし・回答履歴の保存期間と削除フローを別途定めてください。詳細は [SECURITY.md](./SECURITY.md) を参照してください。

## APIメモ

ブラウザからの WebRTC オファーは、サーバーの `/api/realtime/session` を経由して OpenAI の Realtime calls エンドポイントへ渡します。実装の前提は [Realtime API の Create call](https://developers.openai.com/api/reference/typescript/resources/realtime/subresources/calls/methods/create) と [GPT-Realtime-2.1 のモデル仕様](https://developers.openai.com/api/docs/models/gpt-realtime-2.1) に合わせています。

## 公開版について

個人PCの識別情報を含む旧コミット履歴を取り込まず、ソースコードだけを公開用に保存しています。APIキー、実際の音声、回答履歴、ローカル設定は含めていません。
