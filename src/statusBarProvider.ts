import * as vscode from 'vscode';

export class StatusBarProvider {
    private statusBarItem: vscode.StatusBarItem;
    private isLoading: boolean = false;
    private lastOutput: string = '';
    private lastError: string = '';

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.command = 'npxStatusBar.openTerminal';
        this.statusBarItem.show();
        this.updateDisplay('NPX', 'Ready');
    }

    public updateDisplay(text: string, tooltip?: string): void {
        const config = vscode.workspace.getConfiguration('npxStatusBar');
        const maxLength = config.get<number>('maxLength', 50);
        
        let displayText = text;
        if (displayText.length > maxLength) {
            displayText = displayText.substring(0, maxLength - 3) + '...';
        }

        this.statusBarItem.text = `$(terminal) ${displayText}`;
        this.statusBarItem.tooltip = tooltip || displayText;
    }

    public setLoading(loading: boolean): void {
        this.isLoading = loading;
        if (loading) {
            this.statusBarItem.text = `$(sync~spin) NPX Running...`;
            this.statusBarItem.tooltip = 'NPX command is executing...';
        }
    }

    public setOutput(output: string): void {
        this.lastOutput = output;
        this.lastError = '';
        this.updateDisplay(output, `NPX Output: ${output}`);
    }

    public setError(error: string): void {
        this.lastError = error;
        this.lastOutput = '';
        this.statusBarItem.text = `$(error) NPX Error`;
        this.statusBarItem.tooltip = `NPX Error: ${error}`;
    }

    public getLastOutput(): string {
        return this.lastOutput;
    }

    public getLastError(): string {
        return this.lastError;
    }

    public isCurrentlyLoading(): boolean {
        return this.isLoading;
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}