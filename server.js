#!/usr/bin/env node

const nodemailer = require('nodemailer');
const Server = require('./lib/Server');

const config = require('./config.json');
const smtpTransport = nodemailer.createTransport(config.mailConfig);

new Server(smtpTransport, config).listen(config.port || 8080);
