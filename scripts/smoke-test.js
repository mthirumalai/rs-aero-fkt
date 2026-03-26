#!/usr/bin/env node

/**
 * Smoke test script to verify basic app functionality
 * Can be run in CI/CD or locally to catch critical display issues
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const TIMEOUT = 30000; // 30 seconds

async function runSmokeTest() {
  console.log('🚀 Starting smoke test...');

  try {
    // Test 1: Check if app builds successfully
    console.log('📦 Testing build...');
    await execAsync('npm run build', { timeout: TIMEOUT });
    console.log('✅ Build successful');

    // Test 2: Check if app starts (quick check)
    console.log('🏃 Testing dev server start...');
    const startServer = exec('npm run dev');

    // Wait for server to be ready
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        startServer.kill();
        reject(new Error('Server start timeout'));
      }, 15000);

      startServer.stdout.on('data', (data) => {
        if (data.includes('Ready in')) {
          clearTimeout(timeout);
          startServer.kill();
          resolve();
        }
      });

      startServer.stderr.on('data', (data) => {
        if (data.includes('Error') || data.includes('Failed')) {
          clearTimeout(timeout);
          startServer.kill();
          reject(new Error(`Server error: ${data}`));
        }
      });
    });

    console.log('✅ Dev server starts successfully');

    // Test 3: Check for critical missing files
    console.log('📁 Checking for required files...');
    const { stat } = require('fs').promises;

    const criticalFiles = [
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'src/app/error.tsx',
      'src/app/loading.tsx',
      'src/app/globals.css'
    ];

    for (const file of criticalFiles) {
      try {
        await stat(file);
        console.log(`  ✅ ${file}`);
      } catch {
        throw new Error(`Missing critical file: ${file}`);
      }
    }

    console.log('🎉 All smoke tests passed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Smoke test failed:', error.message);
    process.exit(1);
  }
}

runSmokeTest();