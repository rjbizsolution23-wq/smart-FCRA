#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { hashPassword } from '../src/lib/auth.ts';

const password = `SfMaster!${Date.now().toString(36).slice(-6)}A9`;
const hash = await hashPassword(password);
writeFileSync('/tmp/master-creds.json', JSON.stringify({ password, hash }, null, 2));
console.log('wrote /tmp/master-creds.json');
