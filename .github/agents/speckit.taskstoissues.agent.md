````chatagent
---
description: 既存のタスクを、利用可能な設計成果物に基づいて実行可能で依存関係順のGitHub Issueに変換します。
tools: ['github/github-mcp-server/issue_write']
---

## ユーザー入力

```text
$ARGUMENTS
````

以下に進む前に、ユーザー入力を**必ず**考慮してください（空でない場合）。

## 概要

1. リポジトリルートから
   `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`
   を実行し、FEATURE_DIRとAVAILABLE_DOCSリストを解析します。すべてのパスは絶対パスでなければなりません。引数にシングルクォートが含まれる場合（例:
   "I'm Groot"）は、エスケープ構文を使用してください: 例 'I'\''m
   Groot'（または可能であればダブルクォート: "I'm Groot"）。
1. 実行したスクリプトから**tasks**のパスを抽出します。
1. 以下を実行してGitリモートを取得します:

```bash
git config --get remote.origin.url
```

> [!CAUTION]
> 次のステップに進むのは、リモートがGITHUBのURLの場合のみです

1. リスト内の各タスクについて、GitHub
   MCPサーバーを使用してGitリモートに対応するリポジトリに新しいIssueを作成します。

> [!CAUTION]
> リモートURLに一致しないリポジトリにIssueを作成することは絶対に禁止です

```
```
