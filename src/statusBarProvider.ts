import * as vscode from 'vscode';
import { STATUS_BAR, COMMANDS, MAX_STATUS_BAR_LENGTH } from './constants';

export class StatusBarProvider {
    private statusBarItem: vscode.StatusBarItem;
    private isLoading: boolean = false;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            STATUS_BAR.PRIORITY
        );
        this.statusBarItem.command = COMMANDS.OPEN_TERMINAL;
        this.statusBarItem.show();
        this.updateDisplay(STATUS_BAR.DEFAULT_TEXT, STATUS_BAR.DEFAULT_TOOLTIP);
    }

    public updateDisplay(text: string, tooltip?: string, command?: string): void {
        const config = vscode.workspace.getConfiguration('ccusageStatusBar');
        const maxLength = config.get<number>('maxLength', MAX_STATUS_BAR_LENGTH);
        
        let displayText = text;
        if (displayText.length > maxLength) {
            displayText = displayText.substring(0, maxLength - 3) + '...';
        }

        this.statusBarItem.text = `${STATUS_BAR.ICONS.DEFAULT} ${displayText}`;
        this.statusBarItem.tooltip = tooltip || displayText;
        this.statusBarItem.command = command || COMMANDS.OPEN_TERMINAL;
    }

    public setLoading(loading: boolean): void {
        this.isLoading = loading;
        if (loading) {
            this.statusBarItem.text = `${STATUS_BAR.ICONS.LOADING} ${STATUS_BAR.LOADING_TEXT}`;
            this.statusBarItem.tooltip = STATUS_BAR.LOADING_TOOLTIP;
        }
    }

    public setOutput(output: string, tooltip?: string): void {
        this.updateDisplay(output, tooltip || `NPX Output: ${output}`, COMMANDS.OPEN_TERMINAL);
    }

    public setError(error: string): void {
        this.statusBarItem.text = `${STATUS_BAR.ICONS.ERROR} ${STATUS_BAR.ERROR_TEXT}`;
        this.statusBarItem.tooltip = `NPX Error: ${error}\n\nClick to view detailed logs`;
        this.statusBarItem.command = COMMANDS.SHOW_OUTPUT;
    }


    public isCurrentlyLoading(): boolean {
        return this.isLoading;
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}