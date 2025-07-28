import * as vscode from 'vscode';
import { StatusBarProvider } from './statusBarProvider';
import { CommandExecutor } from './commandExecutor';
import { OutputFormatter } from './outputFormatter';
import { Logger } from './interfaces';
import { COMMANDS, DEFAULT_REFRESH_INTERVAL_MS, DEBOUNCE_DELAY_MS } from './constants';

let statusBarProvider: StatusBarProvider;
let commandExecutor: CommandExecutor;
let intervalId: NodeJS.Timeout | undefined;
let outputChannel: vscode.OutputChannel;
let logger: Logger;
let lastOutput: string = '';
let lastError: string = '';
let lastExecutionTime: number = 0; // For debouncing duplicate executions

export function activate(context: vscode.ExtensionContext) {

	// Create output channel for detailed logging
	outputChannel = vscode.window.createOutputChannel("NPX Status Bar");
	logger = outputChannel; // Logger interface implementation
	logger.appendLine('[INFO] NPX Status Bar extension activated');

	// Initialize components with dependency injection
	statusBarProvider = new StatusBarProvider();
	commandExecutor = new CommandExecutor(logger);
	
	// Set up streaming output callback
	commandExecutor.setOutputCallback((output: string) => {
		const formattedOutput = OutputFormatter.formatOutput(output);
		const tooltip = OutputFormatter.formatTooltip(output);
		statusBarProvider.updateDisplay(formattedOutput, tooltip);
	});

	// Register commands
	const refreshCommand = vscode.commands.registerCommand(COMMANDS.REFRESH, async () => {
		await executeNpxCommand();
	});

	const showOutputCommand = vscode.commands.registerCommand(COMMANDS.SHOW_OUTPUT, () => {
		outputChannel.show();
	});

	const openTerminalCommand = vscode.commands.registerCommand(COMMANDS.OPEN_TERMINAL, () => {
		openCcusageInTerminal();
	});

	// Listen for configuration changes
	const configurationChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('ccusageStatusBar')) {
			restartPeriodicExecution();
		}
	});

	// Start periodic execution (removes duplicate initial execution)
	startPeriodicExecution();

	// Register disposables
	context.subscriptions.push(
		refreshCommand,
		showOutputCommand,
		openTerminalCommand,
		configurationChangeListener,
		statusBarProvider,
		commandExecutor
	);
}

async function executeNpxCommand(): Promise<void> {
	// Debounce to prevent duplicate executions
	const now = Date.now();
	if (now - lastExecutionTime < DEBOUNCE_DELAY_MS) {
		logger.appendLine(`[INFO] Execution debounced, skipping duplicate call`);
		return;
	}
	lastExecutionTime = now;

	const config = vscode.workspace.getConfiguration('ccusageStatusBar');
	const enabled = config.get<boolean>('enabled', true);
	let command = config.get<string>('command', 'npx ccusage@latest blocks');
	
	// Use WSL for command execution on Windows
	if (process.platform === 'win32') {
		command = `wsl ${command}`;
	}

	logger.appendLine(`[INFO] Executing command: ${command}, enabled: ${enabled}`);

	if (!enabled) {
		logger.appendLine(`[INFO] Extension disabled, skipping command execution`);
		statusBarProvider.updateDisplay('NPX Disabled', 'NPX Status Bar is disabled in settings');
		return;
	}

	if (!command.trim()) {
		logger.appendLine(`[ERROR] No command configured`);
		statusBarProvider.setError('No command configured');
		return;
	}

	// Show loading state
	statusBarProvider.setLoading(true);
	
	try {
		const result = await commandExecutor.executeCommand(command);
		logger.appendLine(`[INFO] Command execution completed. Success: ${result.success}`);
		
		if (result.success) {
			const formattedOutput = OutputFormatter.formatOutput(result.output);
			const tooltip = OutputFormatter.formatTooltip(result.output, result.error);
			
			lastOutput = result.output;
			lastError = '';
			
			logger.appendLine(`[SUCCESS] Formatted output: ${formattedOutput}`);
			if (result.error) {
				logger.appendLine(`[WARN] Stderr: ${result.error}`);
			}
			statusBarProvider.setOutput(formattedOutput, tooltip);
		} else {
			const formattedError = OutputFormatter.formatError(result.error || 'Unknown error');
			lastError = result.error || 'Unknown error';
			lastOutput = '';
			
			logger.appendLine(`[ERROR] Command failed: ${result.error || 'Unknown error'}`);
			statusBarProvider.setError(formattedError);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		logger.appendLine(`[FATAL] Exception occurred: ${errorMessage}`);
		statusBarProvider.setError(OutputFormatter.formatError(errorMessage));
	} finally {
		statusBarProvider.setLoading(false);
	}
}

function startPeriodicExecution(): void {
	const config = vscode.workspace.getConfiguration('ccusageStatusBar');
	const interval = config.get<number>('interval', DEFAULT_REFRESH_INTERVAL_MS);

	if (interval > 0) {
		// Execute initial command immediately
		executeNpxCommand();
		
		// Then start periodic execution
		intervalId = setInterval(() => {
			executeNpxCommand();
		}, interval);
	}
}

function stopPeriodicExecution(): void {
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = undefined;
	}
}

function restartPeriodicExecution(): void {
	stopPeriodicExecution();
	startPeriodicExecution();
}

function showDetailedOutput(): void {
	const config = vscode.workspace.getConfiguration('ccusageStatusBar');
	const command = config.get<string>('command', 'npx ccusage@latest blocks');

	let content: string;
	
	if (lastError) {
		content = `Command: ${command}\n\nError:\n${lastError}`;
	} else if (lastOutput) {
		content = `Command: ${command}\n\nOutput:\n${lastOutput}`;
	} else {
		content = `Command: ${command}\n\nNo output available. Try refreshing the status.`;
	}

	// Show in a new document
	vscode.workspace.openTextDocument({
		content: content,
		language: 'plaintext'
	}).then(doc => {
		vscode.window.showTextDocument(doc);
	});
}

function openCcusageInTerminal(): void {
	// Create a new terminal
	const terminal = vscode.window.createTerminal({
		name: 'CCUsage Monitor',
		cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
	});

	// Send the ccusage command to the terminal
	terminal.sendText('npx ccusage@latest blocks --live');
	
	// Show the terminal
	terminal.show();
}

export function deactivate() {
	stopPeriodicExecution();
	if (commandExecutor) {
		commandExecutor.dispose();
	}
	if (statusBarProvider) {
		statusBarProvider.dispose();
	}
	if (outputChannel) {
		outputChannel.dispose();
	}
}
