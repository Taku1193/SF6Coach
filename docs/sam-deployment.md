# SF6成長支援ノートアプリ SAMデプロイ手順

## 1. 対象

このドキュメントは、MVPのバックエンドを AWS SAM でビルド、ローカル起動、デプロイするための手順をまとめたものです。

## 2. 作成済みファイル

- `template.yaml`
- `samconfig.toml.example`
- `events/consultation.json`

## 3. 前提

- AWS SAM CLI がインストール済みであること
- AWS CLI が利用可能であること
- デプロイ先AWSアカウントへの権限があること
- OpenAI APIキーを用意していること

## 4. デプロイ対象リソース

- Lambda
  - `Sf6CoachApiFunction`
- API Gateway HTTP API
  - `Sf6CoachApi`
- DynamoDB
  - `NotesTable`
- S3
  - `FrontendBucket`
- CloudFront
  - `FrontendDistribution`

## 5. SAMテンプレートの要点

- Lambda runtime: `nodejs22.x`
- ビルド方法: `esbuild`
- API種別: `AWS::Serverless::HttpApi`
- DynamoDB:
  - PK: `userId`
  - SK: `noteId`
  - GSI1:
    - `gsi1pk`
    - `gsi1sk`
- フロント配信:
  - 非公開S3バケット
  - CloudFront Origin Access Control
  - SPA用 403/404 -> `/index.html`

## 6. ローカル起動

### 6.1 ビルド

```bash
sam build
```

### 6.2 APIローカル起動

```bash
sam local start-api \
  --parameter-overrides \
    AppUserId=local-user \
    OpenAiApiKey=your_openai_api_key \
    OpenAiModel=gpt-4.1-mini \
    FrontendOrigin=*
```

### 6.3 フロント接続

`.env` の `VITE_API_BASE_URL` を `http://127.0.0.1:3000` に設定する。

## 7. 単体実行例

相談APIのみを個別に試す場合:

```bash
sam local invoke Sf6CoachApiFunction -e events/consultation.json \
  --parameter-overrides \
    AppUserId=local-user \
    OpenAiApiKey=your_openai_api_key \
    OpenAiModel=gpt-4.1-mini
```

## 8. 初回デプロイ

```bash
sam deploy --guided
```

推奨入力例:

- Stack Name: `sf6-coach-mvp`
- AWS Region: `ap-northeast-1`
- Confirm changes before deploy: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Disable rollback: `N`

## 9. guided 以外でのデプロイ例

```bash
sam deploy \
  --stack-name sf6-coach-mvp \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --region ap-northeast-1 \
  --parameter-overrides \
    AppUserId=local-user \
    OpenAiApiKey=your_openai_api_key \
    OpenAiModel=gpt-4.1-mini \
    FrontendOrigin=*
```

## 10. デプロイ後確認

### 10.1 API URL確認

```bash
aws cloudformation describe-stacks \
  --stack-name sf6-coach-mvp \
  --query "Stacks[0].Outputs"
```

出力された `ApiUrl` をフロントエンドの `VITE_API_BASE_URL` に設定する。

### 10.2 フロント配信先確認

CloudFormation Output の `FrontendBucketName` と `FrontendDomainName` を確認する。

例:

- `FrontendBucketName`
- `FrontendDistributionId`
- `FrontendDomainName`

### 10.3 DynamoDB確認

テーブル名は CloudFormation Output の `NotesTableName` を参照する。

## 11. フロントエンド側設定

APIデプロイ後、ルート `.env` を以下のように設定する。

```env
VITE_API_BASE_URL=https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com
```

その後フロントエンドをビルドする。

```bash
npm run build:frontend
```

ビルド後、CloudFormation Output の `FrontendBucketName` にアップロードする。

```bash
aws s3 sync frontend/dist s3://YOUR_FRONTEND_BUCKET --delete
```

CloudFront へ即時反映したい場合は invalidation を実行する。

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

公開URLは `https://YOUR_FRONTEND_DOMAIN` となる。

## 12. 注意点

- OpenAI APIキーは SAM parameter として Lambda 環境変数に設定される
- 本番運用では `OpenAiApiKey` を Secrets Manager または SSM Parameter Store に移す方が望ましい
- CORS は `FrontendOrigin` パラメータで制御する。MVPでは `*` のままでもよい
- MVPのため、`APP_USER_ID` は固定文字列で運用する
