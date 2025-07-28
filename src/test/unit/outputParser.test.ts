import * as assert from 'assert';
import { ResilientOutputParser, CCUsageMetrics } from '../../outputParser';

suite('ResilientOutputParser Unit Tests', () => {

    test('parseOutput - should handle typical CCUsage output', () => {
        const mockOutput = `
┌─────────────┬──────────────┬──────────────┬─────────────┐
│ Model       │ Tokens       │ Cost         │ Status      │
├─────────────┼──────────────┼──────────────┼─────────────┤
│ sonnet-4    │ 15,234       │ $0.045       │ ACTIVE      │
│ projected   │ 45,000       │ $0.135       │ PROJECTED   │
└─────────────┴──────────────┴──────────────┴─────────────┘
        `;

        const result = ResilientOutputParser.parseOutput(mockOutput);
        
        assert.strictEqual(result.activeModel, 'sonnet-4');
        assert.strictEqual(result.activeTokens, '15,234');
        assert.strictEqual(result.activeCost, '0.045');
        assert.strictEqual(result.projectedTokens, '45,000');
        assert.strictEqual(result.projectedCost, '0.135');
    });

    test('parseOutput - should handle empty input gracefully', () => {
        const result = ResilientOutputParser.parseOutput('');
        
        assert.strictEqual(result.activeModel, undefined);
        assert.strictEqual(result.activeTokens, undefined);
        assert.strictEqual(result.activeCost, undefined);
    });

    test('parseOutput - should handle malformed input with fallback', () => {
        const malformedOutput = 'Invalid data here...';
        
        const result = ResilientOutputParser.parseOutput(malformedOutput);
        
        // Should not throw and return empty metrics
        assert.ok(typeof result === 'object');
    });

    test('formatMetrics - should format metrics correctly', () => {
        const metrics: CCUsageMetrics = {
            activeModel: 'sonnet-4',
            activeTokens: '15234',
            activeCost: '0.045',
            projectedCost: '0.135'
        };

        const result = ResilientOutputParser.formatMetrics(metrics);
        
        assert.ok(result.includes('🤖sonnet-4'));
        assert.ok(result.includes('🎯15.2KT'));
        assert.ok(result.includes('💰$0.045'));
        assert.ok(result.includes('📈$0.135'));
    });

    test('formatMetrics - should handle empty metrics', () => {
        const metrics: CCUsageMetrics = {};
        
        const result = ResilientOutputParser.formatMetrics(metrics);
        
        assert.strictEqual(result, 'CCUsage Ready');
    });

    test('parseOutput - should handle ANSI escape codes', () => {
        const outputWithAnsi = '\x1b[32mAACTIVE\x1b[0m sonnet-4 15,234 $0.045';
        
        const result = ResilientOutputParser.parseOutput(outputWithAnsi);
        
        assert.strictEqual(result.activeModel, 'sonnet-4');
        assert.strictEqual(result.activeTokens, '15,234');
        assert.strictEqual(result.activeCost, '0.045');
    });

    test('formatMetrics - should format large token counts correctly', () => {
        const metrics: CCUsageMetrics = {
            activeTokens: '1500000'
        };

        const result = ResilientOutputParser.formatMetrics(metrics);
        
        assert.ok(result.includes('1.5MT'));
    });

    test('parseOutput - should handle multiple models in output', () => {
        const multiModelOutput = `
        ACTIVE claude-3 12,000 $0.036
        PROJECTED gpt-4 30,000 $0.090
        `;

        const result = ResilientOutputParser.parseOutput(multiModelOutput);
        
        assert.strictEqual(result.activeModel, 'claude');
        assert.strictEqual(result.projectedTokens, '30,000');
    });
});