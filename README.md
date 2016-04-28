# GitHub Pull Request Sync Notifier (ghpr-sync-notifier)

This is a GitHub webhook handler that sends an email when a "synchronize"
action (push to a pull request's branch) happens on an open pull request.


## Setup

Install Node.js and run `npm install` in the project root. Create a
`config.json` file like the following:

```json
{
  "mailConfig": "smtp://localhost:25",
  "mailOptions": {
    "from": "donotreply@example.com",
    "to": ["recipient@example.com"]
  },
  "port": 8080,
  "webhookSecret": "very_secret"
}
```

Description of entries:
* mailConfig - configuration object or connection URL to pass to nodemailer's
  `createTransport` function
* mailOptions - object that should at least contain the `from` (From field in
  the email) and `to` (string or array of email addresses to send to)
  properties
* port - port for server to bind to
* webhookSecret - GitHub webhook secret

Follow the instructions on https://developer.github.com/webhooks/ to set up a
webhook. You will need to subscribe to the `pull_request` event.
