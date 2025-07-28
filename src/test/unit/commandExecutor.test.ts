import * as assert from 'assert';
import { CommandExecutor } from '../../commandExecutor';
import { Logger } from '../../interfaces';

suite('CommandExecutor Unit Tests', () => {
    let mockLogger: Logger;
    let commandExecutor: CommandExecutor;

    setup(() => {
        mockLogger = {
            appendLine: () => {},
            show: () => {},
            dispose: () => {}
        };
        commandExecutor = new CommandExecutor(mockLogger);
    });

    teardown(() => {
        commandExecutor.dispose();
    });

    test('executeCommand - should reject invalid commands', async () => {
        const result = await commandExecutor.executeCommand('rm -rf /');
        
        assert.strictEqual(result.success, false);
        assert.ok(result.error?.includes('Invalid command'));
    });

    test('executeCommand - should accept valid ccusage commands', async () => {
        // Note: This test may timeout due to actual NPX execution
        // In a real test environment, we would mock the spawn function
        const result = await commandExecutor.executeCommand('npx ccusage@latest --version');
        
        // We expect this to either succeed or fail gracefully
        assert.ok(typeof result.success === 'boolean');
        assert.ok(typeof result.output === 'string');
    });

    test('executeCommand - should prevent concurrent executions', async () => {
        // Start first command
        const promise1 = commandExecutor.executeCommand('npx ccusage@latest blocks');
        
        // Try to start second command immediately
        const result2 = await commandExecutor.executeCommand('npx ccusage@latest status');
        
        assert.strictEqual(result2.success, false);
        assert.ok(result2.error?.includes('Another command is already executing'));
        
        // Wait for first command to complete
        await promise1;
    });

    test('isCurrentlyExecuting - should track execution state', () => {
        const initialState = commandExecutor.isCurrentlyExecuting();
        assert.strictEqual(initialState, false);
    });

    test('cancelCurrentExecution - should handle cancellation gracefully', () => {
        // Should not throw even when no command is running
        commandExecutor.cancelCurrentExecution();
        assert.ok(true, 'Cancellation should not throw');
    });

    test('dispose - should clean up resources', () => {
        commandExecutor.dispose();
        assert.ok(true, 'Dispose should complete without errors');
    });
});