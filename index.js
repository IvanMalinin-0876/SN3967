/* eslint-disable no-console */
/* Copyright © 2017 SAP SE or an affiliate company. All rights reserved.*/

'use strict';

var path = require('path');
var http = require('http');
var log = require('cf-nodejs-logging-support');

var utils = require('./lib/utils');

var deployId = process.env.DEPLOY_ID || 'none';

var loggingLevel = process.env.APP_LOG_LEVEL || 'error';
log.setLoggingLevel(loggingLevel);

log.logMessage('info', 'Application Deployer started ..', {'CODE': '2000'});

var workingDir = path.join(__dirname, '..', '..', '..');
var pathToDefaultServices = path.join(workingDir, 'default-services.json');
var buildDirectory = path.join (workingDir, 'deploymentTemp');
var buildFile = path.join (buildDirectory, 'archive.zip');

try {
  // Get service
  var service = utils.getService (pathToDefaultServices);

  // Validate service
  utils.validateService (service);

  // Get resources folder
  var resourcesFolder = path.join (workingDir, utils.getResourcesFolder(service));

  // Get Token, Archive and Upload
  utils.obtainToken (service, function(err, token) {
    if (err) {
      endProcess ('error', err);
    }
    else {
      utils.archive (resourcesFolder, buildDirectory, buildFile,
        function(err) {
          if (err) {
            endProcess ('error', err);
          }
          else {
            log.logMessage('info', 'Archiver has been finalized and the output file descriptor has closed', {'CODE': '2001'});
            utils.upload (service, token, buildFile, function(err) {
              if (err) {
                endProcess ('error', err);
              }
              else {
                endProcess ('success');
              }
            });
          } });
    }
  });
}
catch (e) {
  endProcess ('error', e);
}

function endProcess(status, errorString) {
  if (status === 'success') {
    log.logMessage('info', 'Resources were successfully uploaded to Server', {'CODE': '2002'});
    log.logMessage('info', 'Application Deployer finished ..', {'CODE': '2003'});
  }	else {
    if (errorString && errorString.message) {
      log.logMessage('error', '%s', errorString.message, {'CODE': '2004'});
    }
    log.logMessage('error', 'Application Deployer failed', {'CODE': '2005'});
  }

  if (deployId !== 'none') { // Scenario of Deploy plugin
    if (status === 'success') {
      log.logMessage('info', 'Deployment of html5 application content done [Deployment Id: %s]', deployId, {'CODE': '2006'});
      console.log ('Deployment of html5 application content done [Deployment Id: ' + deployId + ']');
    }
    else {
      log.logMessage('error', 'Deployment of html5 application content failed [Deployment Id: %s]', deployId, {'CODE': '2007'});
      console.error ('Deployment of html5 application content failed [Deployment Id: ' + deployId + ']');
    }
    setInterval (function() { log.logMessage('info', 'Waiting for deploy service to stop the application', {'CODE': '2008'}); }, 30000);
  }
  else
  { // Scenario of pushing with manifest
    if (status === 'success') { // don't leave app started if failed
      // For hanging the process
      var port = process.env.PORT || 3000;
      // eslint-disable-next-line no-unused-vars
      var server = http.createServer (function(req, res) {}).listen(port);
    }
  }
}
