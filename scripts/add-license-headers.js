const fs = require('fs');
const path = require('path');
const glob = require('glob');

const HEADER = `/**
 * GLX: Connect the World - Civic Networking Platform
 * 
 * Copyright (c) 2025 rsl37
 * Licensed under PolyForm Shield License 1.0.0
 * 
 * ⚠️  UNAUTHORIZED USE PROHIBITED - See LICENSE
 */\n\n`;

glob('src/**/*.{ts,tsx,js,jsx}', (err, files) => {
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    if (!content.startsWith('/**')) {
      fs.writeFileSync(file, HEADER + content);
      console.log(`✅ Added license header to ${file}`);
    }
  });
});
