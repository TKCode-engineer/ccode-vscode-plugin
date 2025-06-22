import { exec, spawn, ChildProcess } from 'child_process';
import * as vscode from 'vscode';

export interface CommandResult {
    success: boolean;
    output: string;
    error?: string;
}

export class CommandExecutor {
    private currentProcess: ChildProcess | null = null;
    private isExecuting: boolean = false;
    private streamingProcess: ChildProcess | null = null;
    private lastStreamOutput: string = '';
    private outputCallback: ((output: string) => void) | null = null;

    public async executeCommand(command: string): Promise<CommandResult> {
        // Check if this is a streaming command (contains --live)
        if (command.includes('--live')) {
            return this.executeStreamingCommand(command);
        }

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

    private async executeStreamingCommand(command: string): Promise<CommandResult> {
        // Return the last captured output from streaming
        if (this.lastStreamOutput) {
            return {
                success: true,
                output: this.lastStreamOutput,
                error: undefined
            };
        }

        // If no streaming process is running, start it
        if (!this.streamingProcess) {
            this.startStreamingProcess(command);
            return {
                success: true,
                output: 'Starting streaming command...',
                error: undefined
            };
        }

        return {
            success: true,
            output: this.lastStreamOutput || 'Waiting for output...',
            error: undefined
        };
    }

    public startStreamingProcess(command: string): void {
        if (this.streamingProcess) {
            this.streamingProcess.kill();
        }

        const args = command.split(' ');
        const cmd = args.shift() || '';
        
        this.streamingProcess = spawn(cmd, args, {
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            env: { ...process.env }
        });

        let outputBuffer = '';

        this.streamingProcess.stdout?.on('data', (data) => {
            const chunk = data.toString();
            outputBuffer += chunk;
            
            // Look for complete lines ending with newline
            const lines = outputBuffer.split('\n');
            if (lines.length > 1) {
                // Take the last complete line (not the last partial line)
                const completeLine = lines[lines.length - 2];
                if (completeLine.trim()) {
                    this.lastStreamOutput = completeLine.trim();
                    if (this.outputCallback) {
                        this.outputCallback(this.lastStreamOutput);
                    }
                }
                // Keep only the last partial line in buffer
                outputBuffer = lines[lines.length - 1];
            }
        });

        this.streamingProcess.stderr?.on('data', (data) => {
            console.error('Streaming command error:', data.toString());
        });

        this.streamingProcess.on('close', (code) => {
            console.log(`Streaming process exited with code ${code}`);
            this.streamingProcess = null;
        });

        this.streamingProcess.on('error', (error) => {
            console.error('Streaming process error:', error);
            this.streamingProcess = null;
        });
    }

    public setOutputCallback(callback: (output: string) => void): void {
        this.outputCallback = callback;
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
        if (this.streamingProcess) {
            this.streamingProcess.kill();
            this.streamingProcess = null;
        }
    }
}