#!/usr/bin/env node
/**
 * 1028 Wealth Management — comped tenant preset for CREATE BUSINESS / D1 migration.
 * Usage: node scripts/provision-1028wealth.mjs
 */
const PRESET = {
  businessName: '1028 Wealth Management',
  legalName: '1028 Wealth Management',
  subdomain: '1028wealth',
  ownerName: '1028 Wealth Admin',
  ownerEmail: process.env.TENANT_1028_OWNER_EMAIL || 'owner@1028wealth.com',
  supportEmail: 'support@smartfcra.com',
  primaryColor: '#FF8C00',
  secondaryColor: '#FF4D00',
  logoUrl: '/static/brand/tenants/1028wealth-logo.svg',
  plan: 'enterprise',
  timezone: 'America/New_York',
  attributionMode: 'powered_by',
};

console.log(JSON.stringify({
  ...PRESET,
  portalUrl: `https://${PRESET.subdomain}.smartfcra.com`,
  postProvision: {
    freeAiOverride: true,
    aiCredits: 500000,
    billingComped: true,
  },
  migration: 'migrations/0036_tenant_1028wealth.sql',
  logoAsset: 'public/static/brand/tenants/1028wealth-logo.svg',
}, null, 2));
