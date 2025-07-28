import { CommandValidator, ValidationResult, ParsedCommand } from './interfaces';
import { COMMAND_PATTERNS, ALLOWED_COMMANDS, ERROR_MESSAGES } from './constants';

/**
 * Validates and sanitizes commands to prevent injection attacks
 */
export class SecureCommandValidator implements CommandValidator {
    
    public validateCommand(command: string): ValidationResult {
        if (!command || typeof command !== 'string') {
            return {
                isValid: false,
                error: ERROR_MESSAGES.INVALID_COMMAND
            };
        }

        // Remove extra whitespace and normalize
        const normalizedCommand = command.trim().replace(/\s+/g, ' ');
        
        // Check if command matches allowed patterns
        if (!this.isAllowedCommand(normalizedCommand)) {
            return {
                isValid: false,
                error: ERROR_MESSAGES.INVALID_COMMAND
            };
        }

        // Parse and validate command structure
        const parsedCommand = this.parseCommand(normalizedCommand);
        if (!parsedCommand) {
            return {
                isValid: false,
                error: ERROR_MESSAGES.INVALID_COMMAND
            };
        }

        return {
            isValid: true,
            sanitizedCommand: normalizedCommand
        };
    }

    private isAllowedCommand(command: string): boolean {
        // Must match the NPX ccusage pattern
        return COMMAND_PATTERNS.NPX_CCUSAGE.test(command);
    }

    private parseCommand(command: string): ParsedCommand | null {
        try {
            const parts = command.split(/\s+/);
            
            // Handle WSL prefix
            let startIndex = 0;
            let isWSL = false;
            
            if (parts[0] === ALLOWED_COMMANDS.WSL) {
                isWSL = true;
                startIndex = 1;
            }
            
            if (parts[startIndex] !== ALLOWED_COMMANDS.NPX) {
                return null;
            }
            
            // Validate NPX package
            const packageName = parts[startIndex + 1];
            if (!packageName || !this.isAllowedPackage(packageName)) {
                return null;
            }
            
            // Validate arguments
            const args = parts.slice(startIndex + 2);
            if (!this.areValidArguments(args)) {
                return null;
            }
            
            return {
                executable: isWSL ? ALLOWED_COMMANDS.WSL : ALLOWED_COMMANDS.NPX,
                args: isWSL ? [ALLOWED_COMMANDS.NPX, packageName, ...args] : [packageName, ...args],
                isWSL
            };
        } catch (error) {
            return null;
        }
    }

    private isAllowedPackage(packageName: string): boolean {
        // Allow ccusage with or without version specifier
        return /^ccusage(@[a-zA-Z0-9.-]+)?$/.test(packageName);
    }

    private areValidArguments(args: string[]): boolean {
        for (const arg of args) {
            // Allow safe subcommands and flags
            if (!COMMAND_PATTERNS.SAFE_SUBCOMMANDS.test(arg) && 
                !COMMAND_PATTERNS.SAFE_FLAGS.test(arg)) {
                return false;
            }
        }
        return true;
    }
}