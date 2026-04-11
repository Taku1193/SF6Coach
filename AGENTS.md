# Repository Guidelines

## プロジェクト構成

このリポジトリは、SF6 Coach MVP の React フロントエンドと AWS Lambda バックエンドで構成されています。

- `frontend/`: Vite + React アプリ。本体画面、コンポーネント、スタイル、静的アセットは `frontend/public/`
- `backend/src/`: Lambda エントリポイント、HTTP ルーティング、バリデーション、DynamoDB 操作、OpenAI 連携
- `shared/src/`: フロントとバックエンドで共有する TypeScript 型とキャラクターデータ
- `docs/`: 仕様、画面、デプロイ手順メモ
- `events/`: API やローカル確認用のサンプル入力
- `template.yaml`: SAM のインフラ定義

生成物である `frontend/dist/`、`backend/dist/`、`.aws-sam/` は直接編集しません。

## ビルド・テスト・開発コマンド

- `npm install`: 依存関係のインストール
- `npm run dev`: Vite でフロントエンドをローカル起動
- `npm run check`: フロントとバックエンドの TypeScript 型チェック
- `npm run build:frontend`: フロントエンドを `frontend/dist/` にビルド
- `npm run build:backend`: バックエンドを `backend/dist/` にコンパイル
- `npm run build`: フロントとバックエンドをまとめてビルド
- `sam build`: `template.yaml` から Lambda パッケージを生成

例:

```bash
npm run check
npm run build
```

## コーディング規約と命名

- TypeScript を使用し、既存コードの書式に合わせます
- ファイルごとのクォート、セミコロン、改行スタイルは周辺コードに揃えます
- React のページ・コンポーネントは `PascalCase`
- 関数・変数は `camelCase`
- 定数は `UPPER_SNAKE_CASE`
- バックエンドの共通処理は `backend/src/lib/` に寄せ、共有型は `shared/src/types.ts` にまとめます
- 実装時は、処理の意図や背景が追えるように、できる限り詳細なコードコメントを残します
- 特に外部API連携、バリデーション、データ保存、分岐理由は、後から読んでも判断できる粒度で補足します
- `function` や主要な関数定義の前には、その関数が何を行うかを説明するコメントをできる限り付けます
- 関数コメントでは、単なる処理の読み上げではなく、「何のための関数か」「何を返すか」が分かる書き方を優先します

専用の formatter / linter は未導入のため、差分は小さく保ち、既存スタイルを崩さないことを優先します。

## テスト方針

現時点では専用のテストフレームワークはありません。最低限、以下を実施してください。

- コミット前に `npm run check`
- 共有型、画面導線、API ハンドラを触った場合は `npm run build`
- UI 変更はブラウザで確認
- API 変更はローカルまたはデプロイ済み API で確認

今後テストを追加する場合は、対象モジュールの近く、または `tests/` 配下に `consultation-service.test.ts` のような分かりやすい名前で配置します。

## コミットとプルリクエスト

- コミットメッセージは日本語で、短く内容が分かる形で記述します  
  例: `DynamoDB更新式の予約語エラーを修正`
- 1コミット 1論理変更を基本にします
- PR には概要、影響範囲、デプロイ影響の有無を記載します
- UI変更がある場合はスクリーンショットを添付します
- AWS 設定や環境変数に影響がある場合は明記します

## セキュリティと設定

- `.env` やシークレットはコミットしません
- `samconfig.toml` や Lambda 環境変数はデプロイ先依存の値を含むため、変更前に確認します
- 本番シークレットを上書きしないよう、インフラ変更とコード変更は意図的に分けて扱います
