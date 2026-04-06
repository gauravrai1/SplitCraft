#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const PORT = 3000;
const __dirname = path.dirname(new URL(import.meta.url).pathname);

const DIRS = {
  config: path.join(__dirname, 'config'),
  input:  path.join(__dirname, 'input'),
  output: path.join(__dirname, 'output'),
};
const CONFIG_FILE  = path.join(DIRS.config, 'default.json');
const SAMPLE_CSV   = path.join(DIRS.input,  'sample.csv');
const STATE_FILE   = path.join(DIRS.output, 'audit-state.json');

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API: Load config
  if (pathname === '/api/config') {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(config));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Load sample CSV (input/sample.csv)
  if (pathname === '/api/sample-csv') {
    try {
      const csv = fs.readFileSync(SAMPLE_CSV, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/csv' });
      res.end(csv);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API: Save state to output/audit-state.json
  if (pathname === '/api/save-state' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => (body += chunk.toString()));
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, pathname === '/' ? 'server.html' : pathname);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.csv': 'text/csv',
    }[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ Transaction Audit & Split App`);
  console.log(`📂 Folder Structure:`);
  console.log(`   ├── config/default.json      (Settings & people list)`);
  console.log(`   ├── input/                   (Sample CSV data)`);
  console.log(`   ├── output/                  (Exports & state)`);
  console.log(`   └── server.html   (Main app)\n`);
  console.log(`🚀 Open your browser: http://localhost:${PORT}\n`);
});
