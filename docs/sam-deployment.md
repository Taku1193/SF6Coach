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
- Cognito
  - `Sf6CoachUserPool`
  - `Sf6CoachUserPoolClient`
- DynamoDB
  - `NotesTable`
- S3
  - `FrontendBucket`
- CloudFront
  - `FrontendDistribution`

## 5. SAMテンプレートの要点

- Lambda runtime: `nodejs22.x`
- Lambda 配布物: `npm run build:lambda` で生成する `artifacts/lambda/index.js`
- API種別: `AWS::Serverless::HttpApi`
- 認証: Cognito User Pool JWT authorizer
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
npm run build:lambda
```

### 6.2 APIローカル起動

```bash
sam local start-api \
  --parameter-overrides \
    OpenAiApiKey=your_openai_api_key \
    OpenAiModel=gpt-4.1-mini \
    FrontendOrigin=*
```

ローカル実行では Cognito authorizer の claims が自動付与されないため、検証時は `x-test-user-id` ヘッダーを付けて呼び出す。

例:

```bash
curl -H "x-test-user-id: local-user" "http://127.0.0.1:3000/notes?character=Luke"
```

### 6.3 フロント接続

`.env` の `VITE_API_BASE_URL` を `http://127.0.0.1:3000` に設定する。

## 7. 単体実行例

相談APIのみを個別に試す場合:

```bash
sam local invoke Sf6CoachApiFunction -e events/consultation.json \
  --parameter-overrides \
    OpenAiApiKey=your_openai_api_key \
    OpenAiModel=gpt-4.1-mini
```

## 8. 初回デプロイ

```bash
npm run build:lambda
sam deploy --guided
```

推奨入力例:

- Stack Name: `sf6-coach-mvp`
- AWS Region: `ap-northeast-1`
- Confirm changes before deploy: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Disable rollback: `N`
- `samconfig.toml` には秘密情報や一時的な parameter override を固定しない
- `OpenAiApiKey` は guided 実行時に入力するか、明示的に CLI 引数で渡す

## 9. guided 以外でのデプロイ例

```bash
npm run build:lambda
sam deploy \
  --stack-name sf6-coach-mvp \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --region ap-northeast-1 \
  --parameter-overrides \
    OpenAiApiKey=your_openai_api_key \
    OpenAiModel=gpt-4.1-mini \
    FrontendOrigin=*
```

既存スタックを更新するだけで、現在の `OpenAiApiKey` を維持したい場合は `OpenAiApiKey` を省略してよい。

```bash
npm run build:lambda
sam deploy \
  --stack-name sf6-coach-mvp \
  --capabilities CAPABILITY_IAM \
  --region ap-northeast-1
```

## 10. デプロイ後確認

### 10.1 API URL確認

```bash
aws cloudformation describe-stacks \
  --stack-name sf6-coach-mvp \
  --query "Stacks[0].Outputs"
```

出力された `ApiUrl` をフロントエンドの `VITE_API_BASE_URL` に設定する。あわせて `CognitoRegion` と `CognitoUserPoolClientId` もフロントエンド設定へ利用する。

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
VITE_COGNITO_REGION=ap-northeast-1
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
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

## 11.1 独自ドメインを IaC で運用する場合

CloudFront が参照する ACM 証明書は `us-east-1` 必須のため、証明書だけ別テンプレートで管理する。

### 1. 証明書スタックを `us-east-1` にデプロイ

```bash
aws cloudformation deploy \
  --template-file template-cert-us-east-1.yaml \
  --stack-name sf6-coach-cert \
  --region us-east-1 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    FrontendCustomDomain=sf6coach.graycier.com \
    Route53HostedZoneId=Z08996233829SKO4SQNPG
```

証明書 ARN を取得する。

```bash
aws cloudformation describe-stacks \
  --stack-name sf6-coach-cert \
  --region us-east-1 \
  --query "Stacks[0].Outputs[?OutputKey=='FrontendCertificateArn'].OutputValue" \
  --output text
```

### 2. 本体スタックへ独自ドメイン情報を渡してデプロイ

`template.yaml` は、以下3つがすべて指定された時だけ CloudFront の独自ドメイン設定と Route53 Alias レコードを作成する。

- `FrontendCustomDomain`
- `FrontendCertificateArn`
- `Route53HostedZoneId`

```bash
npm run build:lambda
sam deploy \
  --stack-name sf6-coach-mvp \
  --region ap-northeast-1 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    OpenAiApiKey=your_openai_api_key \
    OpenAiModel=gpt-4.1-mini \
    FrontendOrigin=https://sf6coach.graycier.com \
    FrontendCustomDomain=sf6coach.graycier.com \
    FrontendCertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/xxxx \
    Route53HostedZoneId=Z08996233829SKO4SQNPG
```

### 3. デプロイ後確認

- CloudFront に `sf6coach.graycier.com` が aliases として入っていること
- Route53 に `A` / `AAAA` Alias が作成されていること
- Output `FrontendCustomUrl` が出力されていること

## 12. 注意点

- OpenAI APIキーは SAM parameter として Lambda 環境変数に設定される
- 本番運用では `OpenAiApiKey` を Secrets Manager または SSM Parameter Store に移す方が望ましい
- CORS は `FrontendOrigin` パラメータで制御する。MVPでは `*` のままでもよい
- フロントエンドでは `ApiUrl` に加え、Output `CognitoRegion` と `CognitoUserPoolClientId` を `.env` へ設定する
- `samconfig.toml` に `OpenAiApiKey` や廃止済みパラメータを固定すると、意図せず本番設定を壊すため避ける
- `sam deploy` 前に `npm run build:lambda` を実行しないと、Lambda へ古い配布物が上がるため注意する
