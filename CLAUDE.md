# VSCode Plugin for NPX Command Status Display

## Project Overview
VSCode拡張機能として、画面下のステータスバーにnpxコマンドの実行結果を整形して表示するプラグインを開発する。

## Requirements

### Core Functionality
- **Status Bar Integration**: VSCodeのステータスバーにカスタム要素を追加
- **NPX Command Execution**: 指定されたnpxコマンドをバックグラウンドで実行
- **Output Formatting**: コマンド出力を適切に整形してステータスバーに表示
- **Real-time Updates**: コマンド実行状況をリアルタイムで更新

### Technical Specifications

#### Environment Setup
- Node.js 20 (devcontainer configured)
- TypeScript development environment
- Yeoman generator-code for scaffolding
- ESLint + Prettier for code quality

#### VSCode Extension Structure
```
src/
├── extension.ts          # Main extension entry point
├── statusBarProvider.ts  # Status bar management
├── commandExecutor.ts    # NPX command execution
└── outputFormatter.ts    # Output formatting logic
```

#### Key Features
1. **Command Configuration**
   - Settings for configurable npx commands
   - Command execution intervals
   - Output display preferences

2. **Status Bar Display**
   - Icon + text display
   - Click interactions (show details, refresh)
   - Loading states and error indicators

3. **Output Processing**
   - JSON output parsing
   - Text truncation for status bar
   - Error handling and fallback display

#### Dependencies
- `@types/vscode` - VSCode API types
- `child_process` - Command execution
- Configuration through VSCode settings

### Development Commands
```bash
# Initialize project with Yeoman
yo code

# Development
npm run compile
npm run watch

# Testing
npm run test

# Packaging
vsce package
```

### Configuration Schema
```json
{
  "npxStatusBar.command": {
    "type": "string",
    "default": "npx some-command",
    "description": "NPX command to execute"
  },
  "npxStatusBar.interval": {
    "type": "number",
    "default": 30000,
    "description": "Execution interval in milliseconds"
  },
  "npxStatusBar.maxLength": {
    "type": "number",
    "default": 50,
    "description": "Maximum characters to display in status bar"
  }
}
```

## Implementation Plan

1. **Project Scaffolding**: Use `yo code` to generate VSCode extension template
2. **Status Bar Setup**: Implement StatusBarItem creation and management
3. **Command Execution**: Create async NPX command executor with proper error handling
4. **Output Formatting**: Implement output parsing and display formatting
5. **Configuration**: Add VSCode settings integration
6. **Testing**: Unit tests for core functionality
7. **Documentation**: Usage instructions and API documentation

## File Structure After Generation
```
├── package.json          # Extension manifest
├── tsconfig.json        # TypeScript configuration
├── src/
│   ├── extension.ts     # Main extension logic
│   └── test/           # Test files
├── .vscode/            # Debug configurations
└── README.md           # Extension documentation
```

## Development Environment
- Container: Node.js 20 with development tools
- Extensions: TypeScript, ESLint, Prettier pre-configured
- Timezone: Asia/Tokyo
- Ports: 3000, 8080 forwarded for development

## Next Steps
1. Run `yo code` to scaffold the extension
2. Implement core status bar functionality
3. Add NPX command execution logic
4. Test and refine output formatting
5. Package and deploy extension