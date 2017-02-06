#!/usr/bin/env node

'use strict';

const fs = require('mz/fs');
const co = require('co');
const rimraf = require('rimraf');
const runscript = require('runscript');
const ghpages = require('gh-pages');


const command = process.argv[2];

co(function* () {
  const exists = yield fs.exists('node_modules');
  if (!exists) {
    throw new Error('should run `npm install` first');
  }

  console.log('Copying CONTRIBUTING.md');
  yield copyFile('CONTRIBUTING.md', 'docs/source/contributing.md');
  yield copyFile('CONTRIBUTING.zh-CN.md', 'docs/source/zh-cn/contributing.md');

  yield rm('docs/public');

  switch (command) {
    case 'server':
      yield runscript('hexo --cwd docs server -l');
      break;
    case 'build':
      yield runscript('hexo --cwd docs generate --force');
      break;
    case 'deploy':
      yield runscript('hexo --cwd docs generate --force');
      yield deploy();
      break;
    case 'travis_deploy':
      break;
    default:
  }
}).catch(err => {
  console.error(err.stack);
  process.exit(1);
});

function* deploy() {
  const branch = 'test';
  let repo = yield runscript('git config remote.origin.url', { stdio: 'pipe' });
  repo = repo.stdout.toString().slice(0, -1);
  if (/^http/.test(repo)) {
    repo = repo.replace('https://github.com/', 'git@github.com:');
  }
  console.log('Pushing to %s', branch);
  yield publish('docs/public', {
    logger(message) { console.log(message); },
    user: {
      name: 'Travis CI',
      email: 'docs@egg.com',
    },
    branch,
    repo,
  });
}

function* copyFile(src, dist) {
  const buf = yield fs.readFile(src);
  yield fs.writeFile(dist, buf);
}

function rm(dir) {
  return done => rimraf(dir, done);
}

function publish(basePath, options) {
  return done => ghpages.publish(basePath, options, done);
}
