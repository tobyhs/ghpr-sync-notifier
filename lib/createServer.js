const http = require('http');

/*
 * This code is awkward. I probably shouldn't have used
 * github-webhook-handler, or maybe I shouldn't have used Node.js at all.
 */

// TODO add logging

/**
 * Creates an HTTP server to handle pull request events by auto-commenting on
 * "synchronize" actions.
 *
 * @param {github.Client} github - GitHub API client
 * @param {string} webhookSecret - HMAC key to verify requests
 * @returns {http.Server}
 */
function createServer(github, webhookSecret) {
  const handler = require('github-webhook-handler')(
    {path: '/events', secret: webhookSecret}
  );
  const server = http.createServer((req, res) => {
    handler(req, res, (err) => {
      res.statusCode = 404;
      res.end('Not Found');
    });
  });

  handler.on('pull_request', event => handlePR(github, event))
  return server;
}

/**
 * Handles a pull request event.
 *
 * @param {github.Client} github - GitHub API client
 * @param {Object} event - event from github-webhook-handler
 */
function handlePR(github, event) {
  const payload = event.payload;
  if (payload.action === 'synchronize') {
    github.issues.createComment({
      user: payload.repository.owner.login,
      repo: payload.repository.name,
      number: payload.number,
      body: 'Pull request updated with a push',
    });
  }
}

module.exports = createServer;
