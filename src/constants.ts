/**
 * Application constants and configuration values
 */

// Command execution configuration
export const COMMAND_TIMEOUT_MS = 30000; // 30 seconds
export const DEFAULT_REFRESH_INTERVAL_MS = 300000; // 5 minutes (optimized for metrics monitoring)
export const MAX_STATUS_BAR_LENGTH = 50;

// Performance optimization constants
export const MAX_OUTPUT_BUFFER_SIZE = 10240; // 10KB limit for memory optimization
export const DEBOUNCE_DELAY_MS = 1000; // Debounce delay for preventing duplicate executions

// Allowed commands (whitelist for security)
export const ALLOWED_COMMANDS = {
    NPX: 'npx',
    WSL: 'wsl'
} as const;

// Allowed NPX packages (whitelist)
export const ALLOWED_NPX_PACKAGES = [
    'ccusage',
    'ccusage@latest'
] as const;

// Command validation patterns
export const COMMAND_PATTERNS = {
    // Match: npx ccusage[@version] [subcommand] [--flags]
    NPX_CCUSAGE: /^npx\s+ccusage(@[a-zA-Z0-9.-]+)?\s*(blocks|usage|status)?\s*(--[a-zA-Z0-9-]+\s*)*$/,
    // Match safe flags and subcommands
    SAFE_FLAGS: /^--[a-zA-Z0-9-]+$/,
    SAFE_SUBCOMMANDS: /^(blocks|usage|status|live)$/
} as const;

// Error messages
export const ERROR_MESSAGES = {
    INVALID_COMMAND: 'Invalid command. Only ccusage commands are allowed.',
    COMMAND_TIMEOUT: 'Command execution timed out',
    COMMAND_NOT_FOUND: 'NPX command not found. Please ensure Node.js and NPX are installed.',
    PERMISSION_DENIED: 'Permission denied',
    NETWORK_ERROR: 'Network error',
    ANOTHER_EXECUTING: 'Another command is already executing'
} as const;

// VSCode command IDs
export const COMMANDS = {
    REFRESH: 'ccusageStatusBar.refresh',
    SHOW_OUTPUT: 'ccusageStatusBar.showOutput',
    OPEN_TERMINAL: 'ccusageStatusBar.openTerminal'
} as const;

// Status bar configuration
export const STATUS_BAR = {
    ALIGNMENT: 'left' as const,
    PRIORITY: 100,
    DEFAULT_TEXT: 'CCUsage',
    DEFAULT_TOOLTIP: 'Ready',
    LOADING_TEXT: 'NPX Running...',
    LOADING_TOOLTIP: 'NPX command is executing...',
    ERROR_TEXT: 'NPX Error',
    ICONS: {
        DEFAULT: '$(terminal)',
        LOADING: '$(sync~spin)',
        ERROR: '$(error)'
    }
} as const;