/* eslint-disable no-console */
/* Copyright © 2017 SAP SE or an affiliate company. All rights reserved.*/

'use strict';

var fs = require('fs');
var archiver = require('archiver');
var request = require('request');
var uuid = require('uuid/v4');

exports.getDTRequestOptions = getDTRequestOptions;
exports.getUAARequestFormData = getUAARequestFormData;
exports.getUAAurl = getUAAurl;


exports.getService = function(pathToDefaultServices) {
  var exceptionString = 'Error loading environment';
  var vcapServices;
  var html5AppsRepoServiceName;

  try {
    if (process.env.VCAP_SERVICES) {
      vcapServices = JSON.parse(process.env.VCAP_SERVICES);
      html5AppsRepoServiceName = getHtml5AppsRepoServiceName(vcapServices);
    }
    else { // Doesn't exist in environment, check in local environment
      vcapServices = loadDefaultServices (pathToDefaultServices);
      html5AppsRepoServiceName = 'html5-apps-repo';
    }
  } catch (e) {
    throw (exceptionString + '. ' + e);
  }

  if (!html5AppsRepoServiceName) {
    throw (exceptionString + '. html5 applications repository service is not bound');
  }
  if (!vcapServices || !vcapServices[html5AppsRepoServiceName] || !vcapServices[html5AppsRepoServiceName][0]) {
    throw exceptionString;
  }

  return vcapServices[html5AppsRepoServiceName][0];
};

exports.getResourcesFolder = function(service){
  var resourcesFolder = 'resources';
  service.tags.forEach(function(tag){
    if (tag.indexOf('resources=') === 0){
      resourcesFolder = tag.substring(10);
    }
  });
  return resourcesFolder;
};

exports.validateService = function(service) {
  if (!service.credentials || !service.credentials.uri
        || !service.credentials.uaa || !service.credentials.uaa.url
        || !service.credentials.uaa.clientid || !service.credentials.uaa.clientsecret) {
    throw ('Incomplete credentials for html5 applications repository service');
  }
};

exports.archive = function(resourcesFolder, buildDirectory, buildFile, cb) {

  // Create build directory
  if (!fs.existsSync(buildDirectory)) {
    fs.mkdirSync(buildDirectory);
  }

  var output = fs.createWriteStream(buildFile);
  var archive = archiver('zip', {
    store: true
  });
  output.on('close', function() {
    // When archive finished - send it
    cb();
  });
  archive.on('error', function(err) {
    cb (new Error ('Archiving failed. ' + err));
  });
  archive.pipe(output);
  archive.directory(resourcesFolder, false);
  archive.finalize();
};

exports.upload = function(service, token, buildFile, cb) {

  var requestOptions = getDTRequestOptions (service, token, buildFile);
  request.put (requestOptions, function onResponse(err, res, body) {
    if (err) {
      cb (new Error('Error in request: ' + JSON.stringify (err)));
    }
    if (res.statusCode === 201) {
      cb ();
    }
    else {
      cb (new Error('Error while uploading resources to Server; Status: ' + res.statusCode +
      ' Response: ' + JSON.stringify(body)));
    }
  }); };

exports.obtainToken = function(service, cb) {
  try {
    request.post({
      url: getUAAurl (service),
      form: getUAARequestFormData (service)},
      function(err, res, body) {
        if (err) {
          cb (new Error ('Error while obtaining token. ' + err));
        }
        else if (res.statusCode === 200)
        {
          if (!JSON.parse(body).access_token) {
            cb (new Error('Bad token'));
          }
          cb (null, JSON.parse(body).access_token);
        }
        else
        {
          cb (new Error('Error while obtaining a token; Status: ' + res.statusCode +
            ' Response: ' + JSON.stringify(body)));
        }
      });
  }
  catch (e) {
    cb(e);
  }
};

function loadDefaultServices(servicesFile) {
  var defaultServices = {};
  if (servicesFile !== null) {
    servicesFile = servicesFile || 'default-services.json';
    if (fs.existsSync(servicesFile)) {
      try {
        defaultServices = JSON.parse(fs.readFileSync(servicesFile, 'utf8'));
      } catch (err) {
        throw ('Could not parse ' + servicesFile + '. ' + err);
      }
    }
  }
  return defaultServices;
}

function getUAAurl(service) {
  return service.credentials.uaa.url + '/oauth/token';
}

function getUAARequestFormData(service) {
  return {
    'client_id': service.credentials.uaa.clientid,
    'client_secret': service.credentials.uaa.clientsecret,
    'grant_type': 'client_credentials',
    'response_type': 'token'
  };
}

function getDTRequestOptions(service, token, buildFile) {
  var requestBody = buildFile ? fs.createReadStream(buildFile) : buildFile;
  var corrID = uuid();
  var requestOptions = {
    url: service.credentials.uri + '/applications/content',
    headers: {
      'Content-Type': 'application/zip',
      'Authorization': 'Bearer ' + token,
      'X-CorrelationID': corrID
    },
    body: requestBody
  };
  return requestOptions;
}

function getHtml5AppsRepoServiceName(vcapServices) {
  var serviceName;
  for (var service in vcapServices) {
    vcapServices[service][0].tags.forEach(function(tag) {
      if (tag === 'html5-apps-repo-dt') {
        serviceName = service;
      }
    });
  }
  return serviceName;
}
