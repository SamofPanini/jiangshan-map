#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { validateDataset } = require('./research_contract.js');

function usage(message) {
  if (message) process.stderr.write(`ERROR: ${message}\n`);
  process.stderr.write('Usage: node scripts/sam/validate_research.js --data <dataset.geojson> --sources <sources.json> --legacy-inventory <inventory.json>\n');
  process.exit(2);
}

function parseArgs(argv) {
  const names = new Set(['--data', '--sources', '--legacy-inventory']);
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (!names.has(name)) usage(`unknown argument: ${name}`);
    if (Object.prototype.hasOwnProperty.call(options, name)) usage(`duplicate argument: ${name}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) usage(`missing value for ${name}`);
    options[name] = value;
    index += 1;
  }
  for (const name of names) if (!options[name]) usage(`missing required argument: ${name}`);
  return options;
}

function readJson(filePath, label) {
  let bytes;
  try {
    bytes = fs.readFileSync(filePath);
  } catch (error) {
    usage(`cannot read ${label}: ${filePath} (${error.code || error.message})`);
  }
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    usage(`cannot parse JSON for ${label}: ${filePath} (${error.message})`);
  }
  return { path: filePath, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), value };
}

function legacyInventoryIsValid(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && value.meta !== null && typeof value.meta === 'object' && !Array.isArray(value.meta)
    && Array.isArray(value.entries)
    && value.entries.every((entry) => entry !== null && typeof entry === 'object' && !Array.isArray(entry) && typeof entry.legacy_id === 'string');
}

function printResult(result) {
  for (const item of result.errors) process.stdout.write(`ERROR ${item.code} ${item.path || '/'} ${item.message}\n`);
  for (const item of result.warnings) process.stdout.write(`WARNING ${item.code} ${item.path || '/'} ${item.message}\n`);
}

function main(argv) {
  const options = parseArgs(argv);
  const data = readJson(options['--data'], 'data');
  const sources = readJson(options['--sources'], 'sources');
  const legacy = readJson(options['--legacy-inventory'], 'legacy inventory');
  if (!legacyInventoryIsValid(legacy.value)) usage(`legacy inventory has invalid P0a-1 shape: ${legacy.path}`);
  const featureCount = Array.isArray(data.value && data.value.features) ? data.value.features.length : 'n/a';
  const sourceCount = Array.isArray(sources.value) ? sources.value.length : 'n/a';
  const stage = data.value && data.value.meta ? data.value.meta.stage : 'n/a';
  const synthetic = data.value && data.value.meta ? data.value.meta.synthetic : 'n/a';
  process.stdout.write(`READ data=${path.resolve(data.path)} sha256=${data.sha256} features=${featureCount} sources=${path.resolve(sources.path)} sha256=${sources.sha256} source_count=${sourceCount} legacy_inventory=${path.resolve(legacy.path)} sha256=${legacy.sha256} legacy_count=${legacy.value.entries.length} stage=${stage} synthetic=${synthetic}\n`);
  const result = validateDataset({ dataset: data.value, sources: sources.value, legacyInventory: legacy.value });
  printResult(result);
  return result.errors.length === 0 ? 0 : 1;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { parseArgs, legacyInventoryIsValid, main };
