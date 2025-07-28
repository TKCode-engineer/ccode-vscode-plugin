/**
 * Resilient output parser for CCUsage tool output
 * Uses pattern-based parsing instead of brittle column-index parsing
 */

export interface CCUsageMetrics {
    activeModel?: string;
    activeTokens?: string;
    activeCost?: string;
    projectedTokens?: string;
    projectedCost?: string;
}

export class ResilientOutputParser {
    // Pattern-based parsing using regex for resilience
    private static readonly PATTERNS = {
        // Match model names in any context
        MODEL: /(?:claude-|sonnet-|gpt-|o1-|o3-)?(?:sonnet-4|claude|gpt|o1|o3)(?:-\w+)?/i,
        
        // Match token counts with various formats
        TOKENS: /(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?[KMB]?)\s*(?:tokens?|T)/i,
        
        // Match cost values with currency symbols
        COST: /\$?(\d+(?:\.\d{2,3})?)/,
        
        // Match ACTIVE row indicators
        ACTIVE_ROW: /ACTIVE/i,
        
        // Match PROJECTED row indicators
        PROJECTED_ROW: /PROJECTED/i,
        
        // Match table separators
        TABLE_SEPARATOR: /[│|]/,
        
        // Clean ANSI escape codes
        ANSI_CODES: /\x1b\[[0-9;]*m/g
    };

    public static parseOutput(output: string): CCUsageMetrics {
        const lines = output.split('\n').map(line => line.replace(this.PATTERNS.ANSI_CODES, ''));
        const metrics: CCUsageMetrics = {};

        try {
            // Find ACTIVE section
            const activeSection = this.findSection(lines, this.PATTERNS.ACTIVE_ROW);
            if (activeSection) {
                metrics.activeModel = this.extractModel(activeSection);
                metrics.activeTokens = this.extractTokens(activeSection);
                metrics.activeCost = this.extractCost(activeSection);
            }

            // Find PROJECTED section
            const projectedSection = this.findSection(lines, this.PATTERNS.PROJECTED_ROW);
            if (projectedSection) {
                metrics.projectedTokens = this.extractTokens(projectedSection);
                metrics.projectedCost = this.extractCost(projectedSection);
            }

            return metrics;
        } catch (error) {
            // Graceful fallback for any parsing errors
            return this.fallbackParse(output);
        }
    }

    private static findSection(lines: string[], pattern: RegExp): string[] {
        const sectionLines: string[] = [];
        let foundSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (pattern.test(line)) {
                foundSection = true;
                sectionLines.push(line);
                
                // Include next few lines for multi-line data
                for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                    sectionLines.push(lines[j]);
                }
                break;
            }
        }

        return foundSection ? sectionLines : [];
    }

    private static extractModel(lines: string[]): string | undefined {
        for (const line of lines) {
            const match = line.match(this.PATTERNS.MODEL);
            if (match) {
                return this.normalizeModel(match[0]);
            }
        }
        return undefined;
    }

    private static extractTokens(lines: string[]): string | undefined {
        for (const line of lines) {
            const match = line.match(this.PATTERNS.TOKENS);
            if (match) {
                return this.normalizeTokens(match[1]);
            }
        }
        return undefined;
    }

    private static extractCost(lines: string[]): string | undefined {
        for (const line of lines) {
            const match = line.match(this.PATTERNS.COST);
            if (match) {
                return match[1];
            }
        }
        return undefined;
    }

    private static normalizeModel(model: string): string {
        const normalized = model.toLowerCase();
        if (normalized.includes('sonnet-4')) {
            return 'sonnet-4';
        }
        if (normalized.includes('claude')) {
            return 'claude';
        }
        if (normalized.includes('gpt')) {
            return 'gpt';
        }
        if (normalized.includes('o3')) {
            return 'o3';
        }
        if (normalized.includes('o1')) {
            return 'o1';
        }
        return model;
    }

    private static normalizeTokens(tokens: string): string {
        // Handle K/M/B suffixes
        const normalized = tokens.toUpperCase();
        if (normalized.includes('K')) {
            return (parseFloat(normalized) * 1000).toLocaleString();
        }
        if (normalized.includes('M')) {
            return (parseFloat(normalized) * 1000000).toLocaleString();
        }
        if (normalized.includes('B')) {
            return (parseFloat(normalized) * 1000000000).toLocaleString();
        }
        return tokens;
    }

    private static fallbackParse(output: string): CCUsageMetrics {
        // Simple fallback that looks for any recognizable patterns
        const cleanOutput = output.replace(this.PATTERNS.ANSI_CODES, '');
        
        return {
            activeModel: this.extractModel([cleanOutput]),
            activeTokens: this.extractTokens([cleanOutput]),
            activeCost: this.extractCost([cleanOutput])
        };
    }

    public static formatMetrics(metrics: CCUsageMetrics): string {
        const parts: string[] = [];

        // Model
        if (metrics.activeModel) {
            parts.push(`🤖${metrics.activeModel}`);
        }

        // Tokens with smart formatting
        if (metrics.activeTokens) {
            const tokens = this.parseTokenCount(metrics.activeTokens);
            const formattedTokens = this.formatTokenDisplay(tokens);
            parts.push(`🎯${formattedTokens}T`);
        }

        // Cost
        if (metrics.activeCost) {
            const cost = parseFloat(metrics.activeCost);
            const formattedCost = this.formatCostDisplay(cost);
            parts.push(`💰${formattedCost}`);
        }

        // Projected cost
        if (metrics.projectedCost) {
            const projectedCost = parseFloat(metrics.projectedCost);
            parts.push(`📈$${projectedCost.toFixed(2)}`);
        }

        return parts.length > 0 ? parts.join(' ') : 'CCUsage Ready';
    }

    private static parseTokenCount(tokenString: string): number {
        return parseInt(tokenString.replace(/[,\s]/g, '')) || 0;
    }

    private static formatTokenDisplay(tokens: number): string {
        if (tokens >= 1000000) {
            return `${(tokens / 1000000).toFixed(1)}M`;
        } else if (tokens >= 1000) {
            return `${(tokens / 1000).toFixed(1)}K`;
        } else {
            return tokens.toString();
        }
    }

    private static formatCostDisplay(cost: number): string {
        if (cost >= 1) {
            return `$${cost.toFixed(2)}`;
        } else if (cost >= 0.01) {
            return `$${cost.toFixed(2)}`;
        } else {
            return `$${cost.toFixed(3)}`;
        }
    }
}