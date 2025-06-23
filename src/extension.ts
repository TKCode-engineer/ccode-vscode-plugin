import * as vscode from 'vscode';
import { StatusBarProvider } from './statusBarProvider';
import { CommandExecutor } from './commandExecutor';
import { OutputFormatter } from './outputFormatter';

let statusBarProvider: StatusBarProvider;
let commandExecutor: CommandExecutor;
let intervalId: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
	console.log('NPX Status Bar extension is now active!');

	// Initialize components
	statusBarProvider = new StatusBarProvider();
	commandExecutor = new CommandExecutor();
	
	// Set up streaming output callback
	commandExecutor.setOutputCallback((output: string) => {
		const formattedOutput = OutputFormatter.formatOutput(output);
		const tooltip = OutputFormatter.formatTooltip(output);
		statusBarProvider.updateDisplay(formattedOutput, tooltip);
	});

	// Register commands
	const refreshCommand = vscode.commands.registerCommand('ccusageStatusBar.refresh', async () => {
		await executeNpxCommand();
	});

	const showOutputCommand = vscode.commands.registerCommand('ccusageStatusBar.showOutput', () => {
		showDetailedOutput();
	});

	const openTerminalCommand = vscode.commands.registerCommand('ccusageStatusBar.openTerminal', () => {
		openCcusageInTerminal();
	});

	// Listen for configuration changes
	const configurationChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('ccusageStatusBar')) {
			restartPeriodicExecution();
		}
	});

	// Start periodic execution
	startPeriodicExecution();

	// Execute initial command with delay to ensure proper initialization
	setTimeout(() => {
		executeNpxCommand();
	}, 1000);

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
	const config = vscode.workspace.getConfiguration('ccusageStatusBar');
	const enabled = config.get<boolean>('enabled', true);
	const command = config.get<string>('command', 'npx ccusage@latest blocks');

	console.log(`[NPX Status Bar] Executing command: ${command}, enabled: ${enabled}`);

	if (!enabled) {
		statusBarProvider.updateDisplay('NPX Disabled', 'NPX Status Bar is disabled in settings');
		return;
	}

	if (!command.trim()) {
		statusBarProvider.setError('No command configured');
		return;
	}

	// Show loading state
	statusBarProvider.setLoading(true);

	try {
		console.log(`[NPX Status Bar] Starting command execution: ${command}`);
		const result = await commandExecutor.executeCommand(command);
		console.log(`[NPX Status Bar] Command result:`, result);
		
		if (result.success) {
			const formattedOutput = OutputFormatter.formatOutput(result.output);
			const tooltip = OutputFormatter.formatTooltip(result.output, result.error);
			
			console.log(`[NPX Status Bar] Formatted output: ${formattedOutput}`);
			statusBarProvider.setOutput(formattedOutput);
			statusBarProvider.updateDisplay(formattedOutput, tooltip);
		} else {
			const formattedError = OutputFormatter.formatError(result.error || 'Unknown error');
			console.log(`[NPX Status Bar] Command failed: ${formattedError}`);
			statusBarProvider.setError(formattedError);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		console.error(`[NPX Status Bar] Exception:`, error);
		statusBarProvider.setError(OutputFormatter.formatError(errorMessage));
	} finally {
		statusBarProvider.setLoading(false);
	}
}

function startPeriodicExecution(): void {
	const config = vscode.workspace.getConfiguration('ccusageStatusBar');
	const interval = config.get<number>('interval', 30000);

	if (interval > 0) {
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
	const lastOutput = statusBarProvider.getLastOutput();
	const lastError = statusBarProvider.getLastError();
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
}
