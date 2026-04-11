# SF6 Coach MVP

SF6成長支援ノートアプリのMVP実装です。フロントエンドは React + Vite、バックエンドは AWS Lambda + API Gateway を前提にしています。

## ディレクトリ構成

```text
frontend/
  index.html
  src/
backend/
  src/
shared/
  src/
docs/
```

## 実装範囲

- 使用キャラ選択
- ノート一覧
- 対戦記録ノート CRUD
- 動画要約ノート CRUD
- タグ・種別フィルタ
- AI相談
- DynamoDB 永続化
- OpenAI API 連携

## ローカル開発

1. 依存関係をインストールする
   - `npm install`
2. `.env.example` を元に `.env` を作成する
3. フロントエンドを起動する
   - `npm run dev`
4. バックエンドは Lambda ローカル実行基盤または任意の HTTP ラッパーで起動する

## SAM

SAM テンプレートは [template.yaml](/mnt/c/users/yanas/Desktop/codex/app/dev/SF6Coach/template.yaml) にあります。詳細は [docs/sam-deployment.md](/mnt/c/users/yanas/Desktop/codex/app/dev/SF6Coach/docs/sam-deployment.md) を参照してください。

よく使うコマンド:

- `sam build`
- `sam local start-api --parameter-overrides AppUserId=local-user OpenAiApiKey=xxx OpenAiModel=gpt-4.1-mini FrontendOrigin=http://localhost:5173`
- `sam deploy --guided`

### フロントエンド環境変数

- `VITE_API_BASE_URL`
  - API Gateway またはローカル API のベース URL

### バックエンド環境変数

- `APP_USER_ID`
  - MVP の固定ユーザーID
- `NOTES_TABLE_NAME`
  - DynamoDB テーブル名
- `OPENAI_API_KEY`
  - OpenAI API キー
- `OPENAI_MODEL`
  - 利用モデル名

## DynamoDB テーブル設計

テーブル名例: `SF6CoachNotes`

- PK: `userId`
- SK: `noteId`
- GSI1PK: `userId#character`
- GSI1SK: `updatedAt`

主要属性:

- `noteType`
- `character`
- `opponentCharacter`
- `result`
- `goodPoints`
- `improvements`
- `videoTitle`
- `url`
- `summary`
- `tags`
- `createdAt`
- `updatedAt`

## API 一覧

- `GET /notes?character=Luke`
- `GET /notes/{noteId}`
- `POST /notes/battle-record`
- `POST /notes/video-summary`
- `PUT /notes/{noteId}`
- `DELETE /notes/{noteId}`
- `POST /ai-consultation`

## AWS デプロイ前提

- SAM テンプレートで API Gateway、Lambda、DynamoDB、S3、CloudFront を作成する
- Lambda に以下の権限を付与する
  - DynamoDB テーブル読み書き
  - CloudWatch Logs 書き込み
- SPA を BrowserRouter で動かすため、CloudFront 側で 403/404 を `index.html` にフォールバックさせる

## 新キャラクター追加対応

- `shared/src/characters.ts` の一覧を更新するだけで候補表示に反映できる構成です
- 保存データは文字列のため、既存データのマイグレーションは不要です
- 相手キャラ入力は datalist 方式なので、候補外文字列も入力できます

## 最短で動かす手順

1. `npm install`
2. `.env` を作成
3. DynamoDB テーブルを作成
4. Lambda をデプロイし環境変数を設定
5. API Gateway の URL を `VITE_API_BASE_URL` に設定
6. `npm run build`
7. `frontend/dist` を S3 に配置
