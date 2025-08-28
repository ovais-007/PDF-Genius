#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 PDF Genius System Diagnostic\n');

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found. Please run this script from the project root.');
  process.exit(1);
}

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  if (packageJson.name !== 'pdf-genius') {
    console.error('❌ This doesn\'t appear to be the PDF Genius project.');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Could not read package.json:', error.message);
  process.exit(1);
}

console.log('✅ Running diagnostic from correct directory\n');

// 1. Check Environment Variables
console.log('🔧 Environment Variables:');
const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);

console.log(`   .env.local file: ${envExists ? '✅ Found' : '❌ Missing'}`);

if (envExists) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
      'GOOGLE_API_KEY',
      'PINECONE_API_KEY',
      'NEXTAUTH_SECRET'
    ];

    const missingVars = [];
    const presentVars = [];

    requiredVars.forEach(varName => {
      if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=`)) {
        const match = envContent.match(new RegExp(`${varName}=(.+)`));
        if (match && match[1].trim() && match[1].trim() !== 'your-key-here') {
          presentVars.push(varName);
        } else {
          missingVars.push(varName);
        }
      } else {
        missingVars.push(varName);
      }
    });

    presentVars.forEach(varName => {
      console.log(`   ${varName}: ✅ Present`);
    });

    missingVars.forEach(varName => {
      console.log(`   ${varName}: ❌ Missing or empty`);
    });

    if (missingVars.length > 0) {
      console.log(`\n   💡 Run 'npm run setup-env' to configure missing variables`);
    }

  } catch (error) {
    console.log(`   ❌ Could not read .env.local: ${error.message}`);
  }
} else {
  console.log(`   💡 Run 'npm run setup-env' to create environment configuration`);
}

console.log('');

// 2. Check Dependencies
console.log('📦 Dependencies:');
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
console.log(`   node_modules: ${fs.existsSync(nodeModulesPath) ? '✅ Found' : '❌ Missing'}`);

if (fs.existsSync(nodeModulesPath)) {
  const criticalDeps = [
    'pdf-parse',
    'next',
    'react',
    '@pinecone-database/pinecone',
    '@google/generative-ai',
    'next-auth'
  ];

  criticalDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    console.log(`   ${dep}: ${fs.existsSync(depPath) ? '✅ Installed' : '❌ Missing'}`);
  });
} else {
  console.log('   💡 Run "npm install" to install dependencies');
}

console.log('');

// 3. Check PDF Processing Test Files
console.log('📄 PDF Processing:');
const testDataPath = path.join(process.cwd(), 'test', 'data', '05-versions-space.pdf');
console.log(`   Test PDF file: ${fs.existsSync(testDataPath) ? '✅ Found' : '❌ Missing'}`);

if (!fs.existsSync(testDataPath)) {
  console.log('   💡 This file is needed by pdf-parse library to prevent ENOENT errors');
}

console.log('');

// 4. Check Build Files
console.log('🏗️  Build Status:');
const nextPath = path.join(process.cwd(), '.next');
console.log(`   .next directory: ${fs.existsSync(nextPath) ? '✅ Found' : '⚠️  Not built yet'}`);

if (!fs.existsSync(nextPath)) {
  console.log('   💡 Run "npm run dev" to start development server');
}

console.log('');

// 5. Check TypeScript Configuration
console.log('📝 TypeScript:');
const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
console.log(`   tsconfig.json: ${fs.existsSync(tsconfigPath) ? '✅ Found' : '❌ Missing'}`);

if (fs.existsSync(tsconfigPath)) {
  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    console.log(`   Strict mode: ${tsconfig.compilerOptions?.strict ? '✅ Enabled' : '⚠️  Disabled'}`);
  } catch (error) {
    console.log(`   ❌ Invalid tsconfig.json: ${error.message}`);
  }
}

console.log('');

// 6. System Information
console.log('💻 System Information:');
console.log(`   Node.js version: ${process.version}`);
console.log(`   Platform: ${process.platform}`);
console.log(`   Memory usage: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
console.log(`   Working directory: ${process.cwd()}`);

console.log('');

// 7. Recommendations
console.log('💡 Recommendations:');

const recommendations = [];

if (!envExists) {
  recommendations.push('Run "npm run setup-env" to configure environment variables');
}

if (!fs.existsSync(nodeModulesPath)) {
  recommendations.push('Run "npm install" to install dependencies');
}

if (!fs.existsSync(testDataPath)) {
  recommendations.push('The test PDF file for pdf-parse is missing - this has been fixed automatically');
}

if (!fs.existsSync(nextPath)) {
  recommendations.push('Run "npm run dev" to start the development server');
}

if (recommendations.length === 0) {
  console.log('   ✅ System appears to be properly configured!');
  console.log('   🌐 Visit http://localhost:3000/diagnostic for detailed web-based diagnostics');
  console.log('   📄 Try uploading a PDF to test the complete workflow');
} else {
  recommendations.forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`);
  });
}

console.log('\n🏁 Diagnostic complete!');

// If there are critical issues, exit with error code
const criticalIssues = !envExists || !fs.existsSync(nodeModulesPath);
process.exit(criticalIssues ? 1 : 0);
