/**
 * Shared interfaces and types
 */

export interface Logger {
    appendLine(message: string): void;
    show(): void;
    dispose(): void;
}

export interface CommandResult {
    success: boolean;
    output: string;
    error?: string;
}

export interface CommandValidator {
    validateCommand(command: string): ValidationResult;
}

export interface ValidationResult {
    isValid: boolean;
    sanitizedCommand?: string;
    error?: string;
}

export interface ParsedCommand {
    executable: string;
    args: string[];
    isWSL: boolean;
}