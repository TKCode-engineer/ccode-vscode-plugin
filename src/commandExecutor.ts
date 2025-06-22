import { exec, ChildProcess } from 'child_process';
import * as vscode from 'vscode';

export interface CommandResult {
    success: boolean;
    output: string;
    error?: string;
}

export class CommandExecutor {
    private currentProcess: ChildProcess | null = null;
    private isExecuting: boolean = false;

    public async executeCommand(command: string): Promise<CommandResult> {
        if (this.isExecuting) {
            return {
                success: false,
                output: '',
                error: 'Another command is already executing'
            };
        }

        this.isExecuting = true;

        return new Promise((resolve) => {
            // Kill any existing process
            if (this.currentProcess) {
                this.currentProcess.kill();
            }

            const timeout = 30000; // 30 seconds timeout

            this.currentProcess = exec(command, {
                timeout: timeout,
                cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
                env: { ...process.env }
            }, (error, stdout, stderr) => {
                this.isExecuting = false;
                this.currentProcess = null;

                if (error) {
                    // Check if it's a timeout error
                    if (error.message.includes('timeout')) {
                        resolve({
                            success: false,
                            output: '',
                            error: 'Command execution timed out (30s)'
                        });
                        return;
                    }

                    // Check if it's a command not found error
                    if (error.message.includes('command not found') || 
                        error.message.includes('not recognized') ||
                        stderr.includes('command not found')) {
                        resolve({
                            success: false,
                            output: '',
                            error: 'NPX command not found. Please ensure Node.js and NPX are installed.'
                        });
                        return;
                    }

                    resolve({
                        success: false,
                        output: stdout.trim(),
                        error: stderr.trim() || error.message
                    });
                    return;
                }

                const output = stdout.trim();
                if (!output && stderr.trim()) {
                    resolve({
                        success: false,
                        output: '',
                        error: stderr.trim()
                    });
                    return;
                }

                resolve({
                    success: true,
                    output: output,
                    error: stderr.trim() || undefined
                });
            });

            // Handle process errors
            this.currentProcess.on('error', (error) => {
                this.isExecuting = false;
                this.currentProcess = null;
                resolve({
                    success: false,
                    output: '',
                    error: error.message
                });
            });
        });
    }

    public isCurrentlyExecuting(): boolean {
        return this.isExecuting;
    }

    public cancelCurrentExecution(): void {
        if (this.currentProcess) {
            this.currentProcess.kill();
            this.currentProcess = null;
            this.isExecuting = false;
        }
    }

    public dispose(): void {
        this.cancelCurrentExecution();
    }
}