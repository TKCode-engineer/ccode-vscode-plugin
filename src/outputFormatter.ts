import { ResilientOutputParser } from './outputParser';

export class OutputFormatter {
    
    public static formatOutput(rawOutput: string): string {
        if (!rawOutput) {
            return 'No output';
        }

        // Remove leading/trailing whitespace
        let formatted = rawOutput.trim();

        // Handle common NPX output patterns
        formatted = this.handleCommonPatterns(formatted);

        // Clean up multiple spaces and newlines
        formatted = this.cleanupWhitespace(formatted);

        // Handle JSON output
        if (this.isJsonLike(formatted)) {
            formatted = this.formatJsonOutput(formatted);
        }

        return formatted;
    }

    private static handleCommonPatterns(output: string): string {
        // Remove ANSI color codes
        output = output.replace(/\x1b\[[0-9;]*m/g, '');

        // Remove common prefixes
        output = output.replace(/^npm WARN[^\n]*\n/gm, '');
        output = output.replace(/^npm notice[^\n]*\n/gm, '');
        
        // Handle ccusage blocks output
        if (output.includes('ccusage') || output.includes('ACTIVE') || output.includes('PROJECTED')) {
            return this.formatCcusageBlocks(output);
        }
        
        // Handle version output
        if (output.match(/^\d+\.\d+\.\d+/)) {
            return `v${output}`;
        }

        // Handle package list output (npm ls style)
        if (output.includes('├──') || output.includes('└──')) {
            const lines = output.split('\n');
            const packages = lines
                .filter(line => line.includes('├──') || line.includes('└──'))
                .map(line => line.replace(/[├└]──\s*/, '').trim())
                .slice(0, 3); // Show first 3 packages
            
            if (packages.length > 0) {
                return packages.join(', ') + (lines.length > packages.length + 1 ? '...' : '');
            }
        }

        return output;
    }

    private static formatCcusageBlocks(output: string): string {
        try {
            // Use resilient pattern-based parser
            const metrics = ResilientOutputParser.parseOutput(output);
            return ResilientOutputParser.formatMetrics(metrics);
        } catch (error) {
            // Graceful fallback
            return 'CCUsage Error';
        }
    }

    private static cleanupWhitespace(output: string): string {
        // Replace multiple spaces with single space
        output = output.replace(/\s+/g, ' ');
        
        // Replace multiple newlines with single newline
        output = output.replace(/\n+/g, '\n');
        
        // For status bar, convert newlines to spaces
        output = output.replace(/\n/g, ' ');
        
        return output.trim();
    }

    private static isJsonLike(output: string): boolean {
        const trimmed = output.trim();
        return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
               (trimmed.startsWith('[') && trimmed.endsWith(']'));
    }

    private static formatJsonOutput(output: string): string {
        try {
            const parsed = JSON.parse(output);
            
            // Handle common JSON structures
            if (typeof parsed === 'object' && parsed !== null) {
                // Handle package.json like structure
                if (parsed.name && parsed.version) {
                    return `${parsed.name}@${parsed.version}`;
                }
                
                // Handle array of objects
                if (Array.isArray(parsed)) {
                    if (parsed.length === 0) {
                        return 'Empty array';
                    }
                    return `Array[${parsed.length}]`;
                }
                
                // Handle object with keys
                const keys = Object.keys(parsed);
                if (keys.length <= 3) {
                    return keys.join(', ');
                } else {
                    return `${keys.slice(0, 3).join(', ')}... (${keys.length} keys)`;
                }
            }
            
            return String(parsed);
        } catch (error) {
            // If parsing fails, return original
            return output;
        }
    }

    public static formatError(error: string): string {
        if (!error) {
            return 'Unknown error';
        }

        // Remove ANSI codes
        error = error.replace(/\x1b\[[0-9;]*m/g, '');

        // Handle common error patterns
        if (error.includes('ENOENT')) {
            return 'Command not found';
        }
        
        if (error.includes('permission denied') || error.includes('EACCES')) {
            return 'Permission denied';
        }
        
        if (error.includes('network') || error.includes('ENOTFOUND')) {
            return 'Network error';
        }

        // Truncate long error messages
        if (error.length > 100) {
            return error.substring(0, 97) + '...';
        }

        return error.trim();
    }

    public static formatTooltip(output: string, error?: string): string {
        if (error) {
            return `Error: ${error}\n\nRaw output: ${output || 'None'}`;
        }

        if (!output) {
            return 'No output from command';
        }

        // For tooltip, preserve more formatting
        let tooltip = output.trim();
        
        // Remove ANSI codes
        tooltip = tooltip.replace(/\x1b\[[0-9;]*m/g, '');
        
        // Limit tooltip length
        if (tooltip.length > 500) {
            tooltip = tooltip.substring(0, 497) + '...';
        }

        return tooltip;
    }
}