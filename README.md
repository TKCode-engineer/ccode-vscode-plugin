# CCUsage Status Bar Extension

VS Codeのステータスバーに`ccusage`の使用量メトリクスを表示するエクステンションです。

## 機能

- VS Codeステータスバーに`ccusage blocks`のメトリクスを表示
- アクティブなモデル、トークン使用量、コスト情報を表示
- 30秒間隔での自動更新（設定可能）
- ステータスバーのクリックでターミナルに`ccusage`を開く

## 必要な環境

- Node.jsとNPXがインストール済み
- `ccusage`パッケージがグローバルで利用可能

## エクステンション設定

この拡張機能では以下の設定項目を提供しています：

- `ccusageStatusBar.command`: 実行するCCUsageコマンド（デフォルト: "npx ccusage@latest blocks"）
- `ccusageStatusBar.interval`: 実行間隔（ミリ秒）（デフォルト: 30000）
- `ccusageStatusBar.maxLength`: ステータスバーに表示する最大文字数（デフォルト: 50）
- `ccusageStatusBar.enabled`: エクステンションの有効/無効化（デフォルト: true）

## インストール方法

### 手動インストール
1. このリポジトリをクローンまたはダウンロード
2. VS Codeでコマンドパレット（`Ctrl+Shift+P` / `Cmd+Shift+P`）を開く
3. `Extensions: Install from VSIX...` を選択
4. パッケージ化したVSIXファイルを選択してインストール

### 使用方法
1. エクステンションをインストール
2. ステータスバーに自動的にccusageメトリクスが表示されます
3. ステータスバーアイテムをクリックすると新しいターミナルでccusageが開きます

## ステータスバー表示形式

`🤖sonnet-4 🎯13.44K Tkns 💰$2.31 📈$5.06`

- 🤖: アクティブなモデル名
- 🎯: トークン使用量（千単位）
- 💰: 現在のアクティブコスト
- 📈: 予測コスト

## リリースノート

### 0.0.1

CCUsage Status Bar extensionの初回リリース。