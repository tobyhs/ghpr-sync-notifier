'use strict';

const http = require('http');

/*
 * This code is awkward. I probably shouldn't have used
 * github-webhook-handler, or maybe I shouldn't have used Node.js at all.
 */

// TODO add logging

/**
 * An HTTP server that sends an update email when a "synchronize" event is
 * received for an open pull request.
 */
class Server {
  /**
   * @param {Nodemailer} smtpTransport - Nodemailer transport to send email
   * @param {Object} config - configuration
   * @param {string} config.webhookSecret - HMAC key to verify requests
   * @param {Object} config.mailOptions
   *   default mail data to use for Nodemailer's sendMail method; define the
   *   'from' and 'to' properties (for the From address and the recipients
   *   respectively)
   */
  constructor(smtpTransport, config) {
    this.smtpTransport = smtpTransport;
    this.config = config;

    const handler = require('github-webhook-handler')(
      {path: '/events', secret: config.webhookSecret}
    );
    this.httpServer = http.createServer((req, res) => {
      handler(req, res, (err) => {
        res.statusCode = 404;
        res.end('Not Found');
      });
    });

    handler.on('error', err => null);
    handler.on('pull_request', event => this.handlePREvent(event));
  }

  /**
   * Starts the HTTP server.
   *
   * @param {Number} port - port to listen on
   * @param {Function} cb - callback for when port is bound
   */
  listen(port, cb) {
    this.httpServer.listen(port, cb);
  }

  /**
   * Handles a pull request event (by sending a reply email that indicated a
   * pull request was updated with a push if applicable).
   *
   * @param {Object} event - event from github-webhook-handler
   */
  handlePREvent(event) {
    const payload = event.payload;
    const state = payload.pull_request.state;

    if (payload.action === 'synchronize' && state === 'open') {
      const repoName = payload.repository.full_name;
      const title = payload.pull_request.title;
      const inReplyTo = `<${repoName}/pull/${payload.number}@github.com>`;
      const mailOptions = Object.assign({}, this.config.mailOptions, {
        subject: `Re: [${repoName}] ${title} (#${payload.number})`,
        inReplyTo,
        references: inReplyTo,
        text: 'Pull request updated with a push',
      });
      this.smtpTransport.sendMail(mailOptions);
    }
  }
}

module.exports = Server;
