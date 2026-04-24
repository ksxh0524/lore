#!/usr/bin/env node

import { Command } from 'commander';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('lore')
  .description('Lore - AI life simulation CLI')
  .version(packageJson.version);

program
  .command('start')
  .description('Start the Lore server')
  .option('-p, --port <number>', 'Server port', '3952')
  .option('-h, --host <string>', 'Server host', 'localhost')
  .option('-d, --data-dir <path>', 'Data directory')
  .option('--mock', 'Enable mock LLM provider', true)
  .action((options) => {
    const env: Record<string, string | undefined> = {
      ...process.env,
      LORE_SERVER_PORT: options.port,
      LORE_SERVER_HOST: options.host,
      ENABLE_MOCK_PROVIDER: options.mock ? 'true' : 'false',
    };
    
    if (options.dataDir) {
      env.LORE_DATA_DIR = options.dataDir;
    }

    const serverPath = resolve(__dirname, '../../server/dist/index.js');
    
    console.log(`Starting Lore server on http://${options.host}:${options.port}`);
    
    const child = spawn('node', [serverPath], {
      env,
      stdio: 'inherit',
    });

    child.on('error', (err) => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });
  });

program
  .command('dev')
  .description('Start development mode (server + client)')
  .action(() => {
    console.log('Starting Lore in development mode...');
    
    const rootPath = resolve(__dirname, '../../../..');
    
    const child = spawn('pnpm', ['dev'], {
      cwd: rootPath,
      stdio: 'inherit',
    });

    child.on('error', (err) => {
      console.error('Failed to start dev mode:', err);
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });
  });

program
  .command('build')
  .description('Build all packages')
  .action(() => {
    console.log('Building Lore...');
    
    const rootPath = resolve(__dirname, '../../../..');
    
    const child = spawn('pnpm', ['build'], {
      cwd: rootPath,
      stdio: 'inherit',
    });

    child.on('error', (err) => {
      console.error('Failed to build:', err);
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });
  });

program
  .command('test')
  .description('Run tests')
  .action(() => {
    console.log('Running tests...');
    
    const rootPath = resolve(__dirname, '../../../..');
    
    const child = spawn('pnpm', ['test'], {
      cwd: rootPath,
      stdio: 'inherit',
    });

    child.on('error', (err) => {
      console.error('Failed to run tests:', err);
      process.exit(1);
    });

    child.on('exit', (code) => {
      process.exit(code ?? 0);
    });
  });

program
  .command('config')
  .description('Show or set configuration')
  .option('--show', 'Show current configuration')
  .option('--set-key <key>', 'Set encryption key')
  .action((options) => {
    const dataDir = process.env.LORE_DATA_DIR || `${process.env.HOME ?? '~'}/.lore`;
    
    if (options.show) {
      console.log(`Data directory: ${dataDir}`);
      console.log(`Server port: ${process.env.LORE_SERVER_PORT ?? 3952}`);
      console.log(`Server host: ${process.env.LORE_SERVER_HOST ?? 'localhost'}`);
      console.log(`Mock provider: ${process.env.ENABLE_MOCK_PROVIDER ?? 'true'}`);
      return;
    }
    
    if (options.setKey) {
      console.log(`Encryption key would be set to: ${options.setKey}`);
      console.log('Note: For security, set LORE_ENCRYPTION_KEY environment variable instead');
      return;
    }
    
    console.log('Usage: lore config --show  OR  lore config --set-key <key>');
  });

program
  .command('new')
  .description('Create a new world')
  .argument('[name]', 'World name', 'My World')
  .option('-t, --type <type>', 'World type (modern/fantasy/historical)', 'modern')
  .option('-a, --agents <number>', 'Number of agents', '5')
  .action((name, options) => {
    console.log(`Creating world "${name}" with ${options.agents} agents...`);
    console.log('Note: Use the web interface or API to create worlds');
    console.log(`API: POST http://localhost:${process.env.LORE_SERVER_PORT ?? 3952}/api/world`);
  });

program.parse();