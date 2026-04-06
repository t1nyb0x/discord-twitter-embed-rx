```markdown
# タスク: ダッシュボードバージョンのBotステータス表示

**入力**: `/specs/001-dashboard-version-status/` からの設計ドキュメント
**前提条件**: plan.md（必須）、spec.md、research.md、data-model.md、quickstart.md

**テスト**: 仕様で明示的に要求されていないため、テストタスクは含まれていません。

**整理**:
タスクはユーザーストーリーごとにグループ化されています。
US3（ダッシュボード書き込み）→ US1+US2（Bot読み取り+フォールバック）の依存順で構成。

## 形式: `[ID] [P?] [Story] 説明`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- **[Story]**: このタスクが属するユーザーストーリー（US1、US2、US3）
- 説明に正確なファイルパスを含めること

---

## フェーズ1: 基盤（ブロッキング前提条件）

**目的**: Bot・ダッシュボード間で共有する定数の定義

**⚠️ 重要**: このフェーズが完了するまでユーザーストーリーの作業は開始不可

- [x] T001 [P] packages/shared/src/constants.ts に共有定数を定義（DASHBOARD_VERSION_KEY, DASHBOARD_VERSION_TTL_SECONDS, DASHBOARD_VERSION_FALLBACK, DASHBOARD_VERSION_HEARTBEAT_INTERVAL_MS）
- [x] T002 packages/shared/src/index.ts に constants.ts の re-export（`export * from "./constants"`）を追加

**チェックポイント**: `@twitterrx/shared` パッケージから定数がインポート可能

---

## フェーズ2: ユーザーストーリー3 - ダッシュボード側のバージョン書き込み（優先度: P1）

**目標**: ダッシュボード起動時にバージョン情報をRedisに書き込み、稼働中はTTLを定期延長する

**独立テスト**: ダッシュボードを起動し、`redis-cli GET app:dashboard:version` でバージョン文字列が取得でき、`redis-cli TTL app:dashboard:version` で正のTTLが返ることを確認

- [x] T003 [US3] dashboard/src/startup.ts の initializeApp() 内に、package.json からバージョンを読み取り `@twitterrx/shared` の DASHBOARD_VERSION_KEY で Redis に SET + EXPIRE（TTL: DASHBOARD_VERSION_TTL_SECONDS）する処理を追加
- [x] T004 [US3] dashboard/src/startup.ts に startVersionHeartbeat() 関数を追加し、DASHBOARD_VERSION_HEARTBEAT_INTERVAL_MS 間隔で DASHBOARD_VERSION_KEY の TTL を DASHBOARD_VERSION_TTL_SECONDS に延長する setInterval を実装（startReconcileJob パターンに倣う）

**チェックポイント**: ダッシュボード起動後、Redis にバージョン情報が存在し、TTL が定期的にリセットされる

---

## フェーズ3: ユーザーストーリー1 + ユーザーストーリー2 - Botステータス表示 + フォールバック（優先度: P1）

**目標**: Botのステータスにダッシュボードバージョンを表示し、取得失敗時は「未接続」にフォールバックする

**独立テスト**:

- US1: ダッシュボード起動済みの状態でBotを起動し、ステータスが `v{bot版}(Dashboard v{dash版}), 導入サーバー数: {N}` と表示されることを確認
- US2: ダッシュボード未起動の状態でBotを起動し、ステータスが `v{bot版}(Dashboard 未接続), 導入サーバー数: {N}` と表示されることを確認

- [x] T005 [US1] src/index.ts から既存の dashboard/package.json の fs.readFileSync 読み込み処理を削除し、`@twitterrx/shared` から DASHBOARD_VERSION_KEY と DASHBOARD_VERSION_FALLBACK をインポート
- [x] T006 [US1] [US2] src/index.ts の updateStatus 関数を async 化し、Redis から DASHBOARD_VERSION_KEY を GET してダッシュボードバージョンを取得する処理を実装（取得失敗・null・空文字の場合は DASHBOARD_VERSION_FALLBACK を使用）
- [x] T007 [US1] src/index.ts の updateStatus 呼び出し元（clientReady イベント内の直接呼び出しと setInterval）を async 対応に更新し、ステータス表示を `v${version}(Dashboard ${dashboardVersion}), 導入サーバー数: ${serverCount}` に変更

**チェックポイント**: Bot起動後、ダッシュボードの状態に応じてステータスにバージョンまたは「未接続」が表示される

---

## フェーズ4: ポリッシュとクロスカッティング関心事

**目的**: コンスティテューション準拠の確認と品質ゲート通過

- [x] T008 [P] クリーンコード確認: 定数名が意図を表しているか、DRY 違反がないか目視レビュー（原則 I）
- [x] T009 [P] 早期リターン確認: updateStatus 内のフォールバック処理で else ブロック残存・ネスト2段超過がないか確認（原則 II）
- [x] T010 [P] メソッドサイズ確認: updateStatus と startVersionHeartbeat が 30行以内であることを確認（原則 IV）
- [x] T011 [P] SRP 確認: 共有パッケージは定数のみ、ダッシュボードは書き込みのみ、Botは読み取りのみに責務が閉じているか確認（原則 V）
- [x] T012 `oxlint src/` && `oxfmt --check src/` && `tsc --noEmit` をすべてグリーンにする
- [x] T013 `npx vitest run` ですべての既存テストがグリーンであることを確認

---

## 依存関係と実行順序

### フェーズの依存関係

- **基盤（フェーズ1）**: 依存関係なし - すぐに開始可能
- **US3（フェーズ2）**: 基盤の完了に依存（共有定数を使用）
- **US1+US2（フェーズ3）**: 基盤の完了に依存（共有定数を使用）。US3 とは並列開発可能（Redis キー名が共有定数で一致するため）
- **ポリッシュ（フェーズ4）**: フェーズ2・3の完了に依存

### ユーザーストーリーの依存関係

- **US3（ダッシュボード書き込み）**: 基盤フェーズ完了後に開始可能。他のストーリーへの依存なし
- **US1（Bot読み取り）**: 基盤フェーズ完了後に開始可能。動作確認にはUS3が必要だが、コード実装は独立
- **US2（フォールバック）**: US1と同一コードパス内で実装。US1と同時に完了

### 各ユーザーストーリー内

- T001 → T002（同一パッケージ、順序依存）
- T003 → T004（同一ファイル、順序依存）
- T005 → T006 → T007（同一ファイル、順序依存）
- T008〜T011 は並列実行可能
- T012 → T013（lint/format 通過後にテスト）

### 並列実行の機会

- **フェーズ2 と フェーズ3**: US3（T003-T004）と US1+US2（T005-T007）は異なるファイルを変更するため、基盤完了後に並列開発可能
- **フェーズ4 内**: T008-T011 のレビュータスクはすべて並列実行可能

---

## 実装戦略

### MVP スコープ

フェーズ1（基盤）+ フェーズ2（US3）+ フェーズ3（US1+US2）の **7タスク** で最小限の完全な機能が得られる。
すべてのユーザーストーリーが P1 であるため、MVPは全ストーリーの完了を含む。

### インクリメンタルデリバリー

1. **基盤完了**: 共有定数が利用可能（T001-T002）
2. **ダッシュボード側完了**: Redis にバージョンが書き込まれる（T003-T004）
3. **Bot側完了**: ステータスにバージョンが表示される（T005-T007）
4. **品質確認完了**: コンスティテューション準拠（T008-T013）
```
