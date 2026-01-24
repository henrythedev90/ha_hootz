#!/usr/bin/env node
/**
 * Simple script to test Redis connection
 * Run with: node test-redis.js
 * 
 * Note: Make sure REDIS_URL is set in .env.local or as an environment variable
 */

const { createClient } = require('redis');
const fs = require('fs');
const path = require('path');

// Try to load .env.local manually
try {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (err) {
  console.warn('Could not load .env.local:', err.message);
}

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error('❌ REDIS_URL is not set in .env.local');
  process.exit(1);
}

// Mask password in URL for logging
const urlObj = new URL(redisUrl);
const maskedUrl = `${urlObj.protocol}//${urlObj.username}:****@${urlObj.hostname}:${urlObj.port}`;
console.log(`🔌 Testing Redis connection to: ${maskedUrl}`);

const client = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 10000,
    keepAlive: true,
  },
});

client.on('error', (err) => {
  console.error('❌ Redis Error:', err.message);
  
  if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
    console.error('\n⚠️  Connection timeout - Possible causes:');
    console.error('1. Upstash database is paused (check dashboard)');
    console.error('2. Your IP is not whitelisted in Upstash');
    console.error('3. Network/firewall blocking the connection');
    console.error('4. Incorrect REDIS_URL');
  }
  
  process.exit(1);
});

client.on('connect', () => {
  console.log('✅ Connected to Redis');
});

client.on('ready', async () => {
  console.log('✅ Redis client ready');
  
  try {
    // Test a simple PING command
    const result = await client.ping();
    console.log(`✅ PING response: ${result}`);
    
    // Test SET/GET
    await client.set('test:connection', 'success', { EX: 10 });
    const value = await client.get('test:connection');
    console.log(`✅ SET/GET test: ${value}`);
    
    console.log('\n✅ Redis connection test PASSED!');
    await client.quit();
    process.exit(0);
  } catch (err) {
    console.error('❌ Redis operation failed:', err.message);
    await client.quit();
    process.exit(1);
  }
});

console.log('⏳ Connecting...');
client.connect().catch((err) => {
  console.error('❌ Failed to connect:', err.message);
  process.exit(1);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.error('❌ Connection test timed out after 15 seconds');
  client.quit().finally(() => process.exit(1));
}, 15000);
