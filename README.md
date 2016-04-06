# GitHub Pull Request Synchronize Notifier (ghpr-sync-notifier)

This is a GitHub webhook handler that creates a comment on a pull request every
time a "synchronize" action happens on that pull request. This comment triggers
a GitHub email so watchers receive an email when a pull request is updated with
a push.


## Setup

Install Node.js and run `npm install` in the project root. Create a
`config.json` file like the following:

```json
{
  "githubToken": "abc123",
  "webhookSecret": "very_secret"
}
```

For `"githubToken"`, use a personal access token of the GitHub account that
will author the comment. You can optionally specify a `"port"` entry to specify
the listening port for the server.

Follow the instructions on https://developer.github.com/webhooks/ to set up a
webhook. You will need to subscribe to the `pull_request` event.
