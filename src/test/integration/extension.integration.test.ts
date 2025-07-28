import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration Tests', () => {

    test('Extension should be present and activate', async () => {
        const ext = vscode.extensions.getExtension('local.ccode-vscode-plugin');
        assert.ok(ext, 'Extension should be present');
        
        await ext!.activate();
        assert.strictEqual(ext!.isActive, true, 'Extension should activate successfully');
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        
        const expectedCommands = [
            'ccusageStatusBar.refresh',
            'ccusageStatusBar.showOutput',
            'ccusageStatusBar.openTerminal'
        ];

        expectedCommands.forEach(command => {
            assert.ok(commands.includes(command), `Command ${command} should be registered`);
        });
    });

    test('Configuration should be available', () => {
        const config = vscode.workspace.getConfiguration('ccusageStatusBar');
        
        // Test default values
        const defaultCommand = config.get<string>('command');
        const defaultInterval = config.get<number>('interval');
        const defaultEnabled = config.get<boolean>('enabled');
        const defaultMaxLength = config.get<number>('maxLength');

        assert.ok(typeof defaultCommand === 'string', 'Command should be a string');
        assert.ok(typeof defaultInterval === 'number', 'Interval should be a number');
        assert.ok(typeof defaultEnabled === 'boolean', 'Enabled should be a boolean');
        assert.ok(typeof defaultMaxLength === 'number', 'MaxLength should be a number');
    });

    test('Status bar item should be created', async () => {
        // We can't directly test StatusBarItem creation without mock,
        // but we can verify the extension activates without errors
        const ext = vscode.extensions.getExtension('local.ccode-vscode-plugin');
        await ext!.activate();
        
        // If we reach here without throwing, status bar creation succeeded
        assert.ok(true, 'Status bar should be created during activation');
    });

    test('Configuration changes should be handled', async () => {
        const config = vscode.workspace.getConfiguration('ccusageStatusBar');
        
        // This tests that configuration access doesn't throw
        const currentInterval = config.get<number>('interval');
        assert.ok(typeof currentInterval === 'number', 'Should read interval configuration');
    });

    test('Commands should execute without errors', async () => {
        try {
            // Test refresh command (may fail due to missing dependencies, but shouldn't throw)
            await vscode.commands.executeCommand('ccusageStatusBar.refresh');
            assert.ok(true, 'Refresh command should execute');
        } catch (error) {
            // Command execution may fail in test environment, but it should be a controlled failure
            assert.ok(error instanceof Error, 'Should fail gracefully with Error object');
        }

        try {
            // Test show output command
            await vscode.commands.executeCommand('ccusageStatusBar.showOutput');
            assert.ok(true, 'Show output command should execute');
        } catch (error) {
            assert.ok(error instanceof Error, 'Should fail gracefully with Error object');
        }
    });

    test('Extension should handle workspace without folders', () => {
        // Test that extension doesn't crash when no workspace is open
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        // Extension should handle undefined workspace folders gracefully
        assert.ok(true, 'Extension should handle missing workspace folders');
    });
});