const crypto = require('crypto');
const http = require('http');
const GitHubApi = require('github');

const createServer = require('../lib/createServer');

describe('ghpr-sync-notifier server', function () {
  const github = new GitHubApi({
    version: '3.0.0', headers: {'user-agent': 'ghpr-sync-notifier test'}
  });
  const webhookSecret = 'secret';
  const port = process.env.PORT || 7878;
  const server = createServer(github, webhookSecret);

  beforeAll(function () {
    server.listen(port);
  });

  afterAll(function () {
    server.close();
  });

  beforeEach(function () {
    spyOn(github.issues, 'createComment');
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
   * @param {Object} overrides - attributes to override
   * @returns {Object} a generated pull request event
   */
  function generatePREvent(overrides) {
    return Object.assign({
      action: 'opened',
      number: 12,
      repository: {
        name: 'ghpr-sync-notifier',
        owner: {
          login: 'tobyhs',
        },
      },
    }, overrides);
  }

  describe('when hitting a nonexistent route', function () {
    it('returns a 404', function (done) {
      http.get({port, path: '/unknown'}, (res) => {
        expect(res.statusCode).toEqual(404);
        done();
      });
    });
  });

  describe('when the PR is not a synchronize action', function () {
    it('does not send a comment', function (done) {
      const payload = generatePREvent({action: 'opened'});
      webhookRequest('pull_request', payload, () => {
        // toHaveBeenCalledTimes(0) doesn't work
        expect(github.issues.createComment.calls.count()).toEqual(0);
        done();
      });
    });
  });

  describe('when the PR is a synchronize action', function () {
    it('sends a comment', function (done) {
      const payload = generatePREvent({action: 'synchronize'});
      webhookRequest('pull_request', payload, () => {
        expect(github.issues.createComment).toHaveBeenCalledWith({
          user: 'tobyhs',
          repo: 'ghpr-sync-notifier',
          number: 12,
          body: 'Pull request updated with a push',
        });
        done();
      });
    });
  });
});
