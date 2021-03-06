#!/usr/bin/env node

const {version} = require('./package.json')
const {parse} = require('url')
const app = require('commander')
const debug = require('debug')('rets-cli')
const csv = require('csv-write-stream')
const json = require('streaming-json-stringify')
const RETS = require('rets.js')
const RETSError = require('rets.js/lib/error')

function parseURL (string) {
  // workaround for an obscure url.parse bug
  try {
    let [, auth] = /(?:http|https):\/\/(.+:.*)@/.exec(string)
    let url = parse(string.replace(auth + '@', ''))
    url.auth = auth
    return url
  } catch (e) {
    return parse(string)
  }
}

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
  .option('--ua-name <name>', 'RETS User Agent name')
  .option('--ua-password <password>', 'RETS User Agent password')
  .option('--rets-version <ver>', 'RETS version', 'RETS/1.7.2')
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

const opts = {
  url: parseURL(app.url),
  version: app.retsVersion
}
if (app.uaName) opts.ua = {name: app.uaName, pass: app.uaPassword}

const rets = new RETS(opts)

function onError (err) {
  if (err instanceof RETSError) {
    console.error(err.message)
    process.exit(1)
  } else {
    throw err
  }
}

function onLogin (err) {
  if (err) onError(err)

  const res = rets.search(Object.assign(query, {objectMode: true, format: 'objects'}))
  // TODO suppress TypeError
  // TypeError: Cannot read property 'replace' of undefined
  // TODO suppress "nothing found" error
  res.parser.on('error', onError)
  res.on('error', onError)
  res.on('finish', () => {
    debug(`got ${res.count} rows`)
    rets.logout()
  })

  res.pipe(app.formatter).pipe(process.stdout)
}

function settingToCapability (key, value) {
  if (['Login', 'Logout', 'Search', 'GetMetadata'].includes(key)) {
    this.session.capabilities[key] = value
  }
}

rets
  .on('login', onLogin)
  .login()
  .on('setting', settingToCapability.bind(rets))
