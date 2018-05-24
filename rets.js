#!/usr/bin/env node

const {version} = require('./package.json')
const app = require('commander')
const debug = require('debug')('rets-cli')
const csv = require('csv-write-stream')
const json = require('streaming-json-stringify')
const RETS = require('rets.js')

function assert (opt) {
  console.error(`\nMissing: ${opt}\n`)
  app.help()
  process.exit(2)
}

function parseList (str) {
  return str.split(',').map(s => s.trim()).join(',')
}

function formatter (format) {
  switch (format) {
    case 'csv':
      return csv()
    case 'json':
      return json()
    case 'json2':
      return json({space: 2, opener: '\n', closer: '\n', seperator: '\n'})
    default:
      console.error('\nInvalid --format\n')
      process.exit(3)
  }
}

app
  .version(version)
  .option('--url <url>', 'RETS login URL')
  .option('-r, --search-type <resource>', 'SearchType')
  .option('-c, --class <class>', 'Class')
  .option('-q, --query <query>', 'DMQL Query')
  .option('-l, --limit <limit>', 'Limit', 10)
  .option('-o, --offset <offset>', 'Offset')
  .option('--select <fields>', 'Select', parseList)
  .option('--debug', 'Debug mode')
  .option('--dry-run', 'Print query and exit')
  .option('--format [csv|json|json2]', 'Output format', 'json2')
  .parse(process.argv)

app.formatter = formatter(app.format)

if (!app.url) assert('--url')
if (!app.searchType) assert('--search-type')
if (!app.query) assert('--query')

let query = {
  SearchType: app.searchType,
  Class: app.class || app.searchType,
  Query: app.query,
  Format: 'COMPACT-DECODED',
  StandardNames: 0
}
if (app.limit) query.Limit = app.limit
if (app.offset) query.Offset = app.offset
if (app.select) query.Select = app.select

debug('query', query)

if (app.dryRun) {
  console.log(query)
  process.exit(0)
}

const rets = new RETS({url: app.url})

rets.on('login', (err) => {
  if (err) throw err
  const res = rets.search(Object.assign(query, {objectMode: true, format: 'objects'}))
  res.parser.on('error', e => { throw e })
  res.on('error', e => { throw e })
  res.on('finish', () => {
    debug(`got ${res.count} rows`)
    rets.logout()
  })

  res.pipe(app.formatter).pipe(process.stdout)
})

rets.login()
