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

	// Register commands
	const refreshCommand = vscode.commands.registerCommand('npxStatusBar.refresh', async () => {
		await executeNpxCommand();
	});

	const showOutputCommand = vscode.commands.registerCommand('npxStatusBar.showOutput', () => {
		showDetailedOutput();
	});

	// Listen for configuration changes
	const configurationChangeListener = vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration('npxStatusBar')) {
			restartPeriodicExecution();
		}
	});

	// Start periodic execution
	startPeriodicExecution();

	// Execute initial command
	executeNpxCommand();

	// Register disposables
	context.subscriptions.push(
		refreshCommand,
		showOutputCommand,
		configurationChangeListener,
		statusBarProvider,
		commandExecutor
	);
}

async function executeNpxCommand(): Promise<void> {
	const config = vscode.workspace.getConfiguration('npxStatusBar');
	const enabled = config.get<boolean>('enabled', true);
	const command = config.get<string>('command', 'npx --version');

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
		const result = await commandExecutor.executeCommand(command);
		
		if (result.success) {
			const formattedOutput = OutputFormatter.formatOutput(result.output);
			const tooltip = OutputFormatter.formatTooltip(result.output, result.error);
			
			statusBarProvider.setOutput(formattedOutput);
			statusBarProvider.updateDisplay(formattedOutput, tooltip);
		} else {
			const formattedError = OutputFormatter.formatError(result.error || 'Unknown error');
			statusBarProvider.setError(formattedError);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		statusBarProvider.setError(OutputFormatter.formatError(errorMessage));
	} finally {
		statusBarProvider.setLoading(false);
	}
}

function startPeriodicExecution(): void {
	const config = vscode.workspace.getConfiguration('npxStatusBar');
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
	const config = vscode.workspace.getConfiguration('npxStatusBar');
	const command = config.get<string>('command', 'npx --version');

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

export function deactivate() {
	stopPeriodicExecution();
	if (commandExecutor) {
		commandExecutor.dispose();
	}
	if (statusBarProvider) {
		statusBarProvider.dispose();
	}
}
