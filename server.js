#!/usr/bin/env node

const GitHubApi = require('github');
const createServer = require('./lib/createServer');

const config = require('./config.json');

const github = new GitHubApi({
  version: '3.0.0', headers: {'user-agent': 'ghpr-sync-notifier'}
});
github.authenticate({type: 'oauth', token: config.githubToken});

createServer(github, config.webhookSecret).listen(config.port || 8080);
