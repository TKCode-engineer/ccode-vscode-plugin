import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import * as vscode from 'vscode';
import { CommandResult, Logger, ParsedCommand } from './interfaces';
import { SecureCommandValidator } from './commandValidator';
import { COMMAND_TIMEOUT_MS, ERROR_MESSAGES, MAX_OUTPUT_BUFFER_SIZE } from './constants';

export class CommandExecutor {
    private currentProcess: ChildProcess | null = null;
    private isExecuting: boolean = false;
    private streamingProcess: ChildProcess | null = null;
    private lastStreamOutput: string = '';
    private outputCallback: ((output: string) => void) | null = null;
    private logger: Logger;
    private validator: SecureCommandValidator;

    constructor(logger: Logger) {
        this.logger = logger;
        this.validator = new SecureCommandValidator();
    }

    public async executeCommand(command: string): Promise<CommandResult> {
        // Validate command first
        const validationResult = this.validator.validateCommand(command);
        if (!validationResult.isValid) {
            return {
                success: false,
                output: '',
                error: validationResult.error || ERROR_MESSAGES.INVALID_COMMAND
            };
        }

        const sanitizedCommand = validationResult.sanitizedCommand!;
        
        // Check if this is a streaming command (contains --live)
        if (sanitizedCommand.includes('--live')) {
            return this.executeStreamingCommand(sanitizedCommand);
        }

        // Prevent concurrent executions (including streaming processes)
        if (this.isExecuting || this.streamingProcess) {
            return {
                success: false,
                output: '',
                error: ERROR_MESSAGES.ANOTHER_EXECUTING
            };
        }

        this.isExecuting = true;

        return new Promise((resolve) => {
            // Kill any existing process
            if (this.currentProcess) {
                this.currentProcess.kill();
            }

            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            
            // Parse command safely
            const parsedCommand = this.parseCommandSafely(sanitizedCommand);
            if (!parsedCommand) {
                this.isExecuting = false;
                resolve({
                    success: false,
                    output: '',
                    error: ERROR_MESSAGES.INVALID_COMMAND
                });
                return;
            }

            this.logger.appendLine(`[INFO] Executing: ${parsedCommand.executable} ${parsedCommand.args.join(' ')}`);

            const spawnOptions: SpawnOptions = {
                cwd: workspaceFolder || process.cwd(),
                env: { ...process.env },
                stdio: ['ignore', 'pipe', 'pipe']
            };

            this.currentProcess = spawn(parsedCommand.executable, parsedCommand.args, spawnOptions);
            
            let stdout = '';
            let stderr = '';
            let timeoutId: NodeJS.Timeout | undefined;

            // Set up timeout
            timeoutId = setTimeout(() => {
                if (this.currentProcess) {
                    this.currentProcess.kill('SIGTERM');
                    this.isExecuting = false;
                    this.currentProcess = null;
                    resolve({
                        success: false,
                        output: '',
                        error: ERROR_MESSAGES.COMMAND_TIMEOUT
                    });
                }
            }, COMMAND_TIMEOUT_MS);

            // Handle stdout
            this.currentProcess.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            // Handle stderr
            this.currentProcess.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            // Handle process completion
            this.currentProcess.on('close', (code) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                this.isExecuting = false;
                this.currentProcess = null;

                if (code === 0) {
                    this.logger.appendLine(`[SUCCESS] Command completed successfully`);
                    resolve({
                        success: true,
                        output: stdout.trim(),
                        error: stderr.trim() || undefined
                    });
                } else {
                    this.logger.appendLine(`[ERROR] Command failed with code: ${code}`);
                    
                    let errorMessage = stderr.trim();
                    
                    // Categorize common errors
                    if (code === 127 || stderr.includes('command not found')) {
                        errorMessage = ERROR_MESSAGES.COMMAND_NOT_FOUND;
                    } else if (stderr.includes('permission denied') || stderr.includes('EACCES')) {
                        errorMessage = ERROR_MESSAGES.PERMISSION_DENIED;
                    } else if (stderr.includes('network') || stderr.includes('ENOTFOUND')) {
                        errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
                    } else if (!errorMessage) {
                        errorMessage = `Command failed with exit code ${code}`;
                    }
                    
                    resolve({
                        success: false,
                        output: stdout.trim(),
                        error: errorMessage
                    });
                }
            });

            // Handle process errors
            this.currentProcess.on('error', (error) => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                
                this.isExecuting = false;
                this.currentProcess = null;
                
                let errorMessage = error.message;
                if ((error as any).code === 'ENOENT') {
                    errorMessage = ERROR_MESSAGES.COMMAND_NOT_FOUND;
                }
                
                this.logger.appendLine(`[ERROR] Process error: ${errorMessage}`);
                resolve({
                    success: false,
                    output: '',
                    error: errorMessage
                });
            });

        });
    }

    private parseCommandSafely(command: string): ParsedCommand | null {
        try {
            const parts = command.split(/\s+/).filter(part => part.length > 0);
            
            let startIndex = 0;
            let executable = '';
            let isWSL = false;
            
            // Check for WSL prefix
            if (parts[0] === 'wsl') {
                isWSL = true;
                executable = 'wsl';
                startIndex = 1;
            }
            
            if (parts[startIndex] === 'npx') {
                if (!isWSL) {
                    executable = 'npx';
                }
                const args = isWSL ? ['npx', ...parts.slice(startIndex + 1)] : parts.slice(startIndex + 1);
                return {
                    executable,
                    args,
                    isWSL
                };
            }
            
            return null;
        } catch (error) {
            return null;
        }
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

        const parsedCommand = this.parseCommandSafely(command);
        if (!parsedCommand) {
            this.logger.appendLine('[CommandExecutor] Invalid streaming command');
            return;
        }
        
        this.streamingProcess = spawn(parsedCommand.executable, parsedCommand.args, {
            cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            env: { ...process.env },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let outputBuffer = '';

        this.streamingProcess.stdout?.on('data', (data) => {
            const chunk = data.toString();
            outputBuffer += chunk;
            
            // Limit buffer size to prevent memory leaks
            if (outputBuffer.length > MAX_OUTPUT_BUFFER_SIZE) {
                const lines = outputBuffer.split('\n');
                // Keep only the last few lines
                outputBuffer = lines.slice(-10).join('\n');
            }
            
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
            this.logger.appendLine(`[ERROR] Streaming stderr: ${data.toString().trim()}`);
        });

        this.streamingProcess.on('close', (code) => {
            this.logger.appendLine(`[INFO] Streaming process exited with code ${code}`);
            this.streamingProcess = null;
        });

        this.streamingProcess.on('error', (error) => {
            this.logger.appendLine(`[ERROR] Streaming process error: ${error.message}`);
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