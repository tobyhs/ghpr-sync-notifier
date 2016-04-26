const crypto = require('crypto');
const http = require('http');
const nodemailer = require('nodemailer');

const Server = require('../lib/Server');

describe('Server', function () {
  const port = process.env.PORT || 7878;
  const webhookSecret = 'secret';
  const smtpTransport = nodemailer.createTransport();
  const config = {
    webhookSecret,
    mailOptions: {from: 'noreply@example.com', to: 'johndoe@example.com'},
  };
  const server = new Server(smtpTransport, config);

  beforeAll(function (done) {
    server.listen(port, done);
  });

  afterAll(function (done) {
    server.httpServer.close(done);
  });

  beforeEach(function () {
    spyOn(smtpTransport, 'sendMail');
  });

  /**
   * Sends a the given webhook event to the test webhook server.
   *
   * @param {string} eventType - event type
   * @param {Object} eventPayload - an event payload
   * @param {Function} callback - callback to handle the response
   */
  function webhookRequest(eventType, eventPayload, callback) {
    const json = JSON.stringify(eventPayload)
    const sig = 'sha1=' +
      crypto.createHmac('sha1', webhookSecret).update(json).digest('hex');
    const options = {
      port,
      method: 'POST',
      path: '/events',
      headers: {
        'X-GitHub-Event': eventType,
        'X-Hub-Signature': sig,
        'X-GitHub-Delivery': crypto.randomBytes(8).toString('hex'),
      },
    };

    const request = http.request(options, callback);
    request.write(json);
    request.end();
  }

  /**
   * Creates a (hopefully valid enough) pull request event.
   *
   * @see https://developer.github.com/v3/activity/events/types/#pullrequestevent
   *
   * @param {Object} overrides
   *   attributes to override; note that this only works correctly for the
   *   first depth (not a deep merge)
   * @returns {Object} a generated pull request event
   */
  function generatePREvent(overrides) {
    return Object.assign({
      action: 'opened',
      number: 12,
      pull_request: {
        state: 'open',
        title: 'Test Title',
      },
      repository: {
        full_name: 'tobyhs/ghpr-sync-notifier',
      },
    }, overrides);
  }

  /**
   * Defines a spec that asserts an email is not sent for the given event
   * payload.
   *
   * @param {Object} eventPayload - a pull request event payload
   */
  function itDoesNotSendAnEmail(eventPayload) {
    it('does not send an email', function (done) {
      webhookRequest('pull_request', eventPayload, () => {
        // toHaveBeenCalledTimes(0) doesn't work
        expect(smtpTransport.sendMail.calls.count()).toEqual(0);
        done();
      });
    });
  }

  describe('when hitting a nonexistent route', function () {
    it('returns a 404', function (done) {
      http.get({port, path: '/unknown'}, (res) => {
        expect(res.statusCode).toEqual(404);
        done();
      });
    });
  });

  describe('when making a bad request', function () {
    it('returns a 400', function (done) {
      http.request({port, method: 'POST', path: '/events'}, (res) => {
        expect(res.statusCode).toEqual(400);
        done();
      }).end();
    });
  });

  describe('when the PR event is not a synchronize action', function () {
    itDoesNotSendAnEmail(generatePREvent());
  });

  describe('when the PR event is a synchronize action', function () {
    describe('and the state is not open', function () {
      const payload = generatePREvent({action: 'synchronize'});
      payload.pull_request.state = 'closed';
      itDoesNotSendAnEmail(payload);
    });

    describe('and the state is open', function () {
      it('sends an email', function (done) {
        const payload = generatePREvent({action: 'synchronize'});
        webhookRequest('pull_request', payload, () => {
          expect(smtpTransport.sendMail).toHaveBeenCalledWith({
            from: 'noreply@example.com',
            to: 'johndoe@example.com',
            subject: 'Re: [tobyhs/ghpr-sync-notifier] Test Title (#12)',
            inReplyTo: '<tobyhs/ghpr-sync-notifier/pull/12@github.com>',
            references: '<tobyhs/ghpr-sync-notifier/pull/12@github.com>',
            text: 'Pull request updated with a push',
          });
          done();
        });
      });
    });
  });
});
