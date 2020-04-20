@sap/html5-app-deployer
==============
[![Build Status](https://travis-ci.mo.sap.corp/html5-apps-repo/html5-app-deployer.svg?token=WNUCzC1QGN7ssw8yMAqk&branch=master)](https://travis-ci.mo.sap.corp/html5-apps-repo/html5-app-deployer)

<!-- toc -->
- [Overview](#overview)
- [Deploying HTML5 Application Deployer App](#deploying-html5-application-deployer-app)
  * [Deploying HTML5 Application Deployer App Using cf push](#deploying-html5-application-deployer-app-using-cf-push)
  * [Deploying HTML5 Application Deployer App using cf deploy](#deploying-html5-application-deployer-app-using-cf-deploy)
- [Undeploy HTML5 Application Deployer Apps](#undeploy-html5-application-deployer-apps)
  * [Delete HTML5 Application Deployer App Using cf delete](#delete-html5-application-deployer-app-using-cf-delete)
  * [Undeploy HTML5 Application Deployer App Using cf undeploy](#undeploy-html5-application-deployer-app-using-cf-undeploy)
- [Redeploy HTML5 Application Deployer App](#redeploy-html5-application-deployer-app)
  * [Creating New HTML5 Application Version](#creating-new-html5-application-version)
  * [Replacing Existing HTML5 Application Version](#replacing-existing-html5-application-version)

## Overview
HTML5 application deployer handles the upload of the HTML5 application content to the HTML5 application repository.

@sap/html5-app-deployer module is consumed as a dependency in a node.js CF application.
 ```
 {
   "name": "myAppDeployer",
   "engines": {
     "node": ">=6.0.0"
   },
   "dependencies": {
     "@sap/html5-app-deployer": "1.1.0"
   },
   "scripts": {
     "start": "node node_modules/html5-app-deployer/index.js"
   }
 }
 ```
 
Below the root folder, the HTML5 application deployer app may contain a folder called "resources",for the static files of the HTML5 application.
If static content should be uploaded from another folder than "resources", the path to that folder can be provided as a tag starting with "resources=" while creating an app-host service instance.
For example:
```
cf create-service html5-apps-repo app-host myApp100 -c '{"xs-security":{"xsappname":"myApp100"},"appName":"myApp", "appVersion":"1.0.0"}' -t resources=webapp
```
If no "resources=" tag provided HTML5 application deployer will try to upload from resources folder, if no resources folder found, it will fail to upload.
The sap/html5-app-deployer consumer application should be bound to a single html5-apps-repo service instance of the app-host service plan. When the sap/html5-app-deployer consumer application is started, the @sap/html5-app-deployer module creates a zip archive of the content in the “resources” folder and triggers the upload of the zip archive to the HTML5 application repository.

## Deploying HTML5 Application Deployer App
To deploy an sap/html5-app-deployer consumer application in CF, you can choose one of the following procedures: 

### Deploying HTML5 Application Deployer App Using cf push

#### 1. Create a manifest.yaml file in the following format:
```
applications:

- name: myAppDeployer100
  no-route: true
  memory: 128M
  services:
    - myApp100-dt
```

#### 2. Create an html5-apps-repo service instance of the app-host plan using CF CLI
```
cf create-service html5-apps-repo app-host myApp100-dt -c '{"xs-security":{"xsappname":"myApp100"},"appName":"myApp", "appVersion":"1.0.0"}' -t resources=webapp
```
The xsappname should be globally unique because it is the name xsuaa client that is used to create the client_credential token that is used to upload content. 
#### 3. Push to CF
```
cf push -f manifest.yaml
```
#### 4. Stop sap/html5-app-deployer consumer application
After sap/html5-app-deployer consumer application has uploaded the  content successfully, stop the applicationto to avoid consuming CF container resources.

```
cf stop myAppDeployer
```

### Deploying HTML5 Application Deployer App using cf deploy
To use cf deploy the installation of the deploy plugin is required, See [deploy plugin documentation](https://github.com/SAP/cf-mta-plugin/blob/master/README.md)
In addition, create an *.mtar archive should be created via WebIDE or MTA Build Tool.

#### 1. Create an mtad.yaml file.
The MTA project should have an mtad.yaml file in the following format:
```
ID: myApp.deployer100                   //MTA ID 
_schema-version: '2.0'
version: 0.0.3
 
modules:
 - name: myAppDeployer100
   type: com.sap.html5.application-content
   path: deployer/
   requires:
    - name: myApp100
 
  
resources:
 - name: myApp100                        //Resource name
   type: org.cloudfoundry.managed-service
   parameters:
     service: html5-apps-repo            //Service name
     service-plan: app-host              //Service plan
     service-name: myApp100-dt           //Service instance name
     service-tags: ["resources=webapp"]  //Static content root folder 
     config:
       xs-security:
          xsappname: myApp100            //UAA client app name
       appName: myApp                    //Application name
       appVersion: 1.0.0                 //Application version
```
#### 2. Generate *.mtar file.
Use the WebIDE build or the MTA Build Tool to generate a valid myAppDeployer.mtar file.

#### 3. Deploy *.mtar file.
```
cf deploy myAppDeployer.mtar
```
After deploying the *.mtar file, an application called myAppDeployer (stopped) is shown in cf apps.

## Undeploy HTML5 Application Deployer Apps
When you undeploy the  HTML5 application deployer app, the related HTML5 application repository content should be deleted too.

### Delete HTML5 Application Deployer App Using cf delete
If you have used the cf push command to deploy the app, delete the HTML5 application deployer app manually:

#### 1. Unbind html5-apps-repo app-host service instance.
For example:
```
cf unbind-service  myAppDeployer myApp100-dt
```

#### 2. Delete html5-apps-repo app-host service instance
For example
```
cf delete-service  myApp100-dt
```
This step deletes the HTML5 application repository content.

#### 3. Delete the HTML5 application deployer app.
For example
```
cf delete  myAppDeployer
```

### Undeploy HTML5 Application Deployer App Using cf undeploy
When you undeploy the HTML5 application deployer app, the HTML5 application deployer app is deleted and you can - in the same step - delete the app-host service instance of the html5-apps-repo. To delete the app-host service instance of the html5-apps-repo, the  --delete-service parameter should be passed. 
Note that the undeploy requires the mta id, which can be obtained by calling cf mtas or from the mtad.yaml ID.

#### 1. Undeploy HTML5 Application Deployer App and delete the service instance
For example:
```
cf undeploy myApp.deployer --delete-services
```

## Redeploy HTML5 Application Deployer App
After making changing to the static content files of the HTML5 application, the new content can be uploaded to HTML5 application repository. 
You can either create a new version of your HTML5 application or you can delete the existing version and upload the new content using the previous version information.

### Creating New HTML5 Application Version

#### With Deploy Plugin
1.	Modify the mtad.yaml MTA ID (best practice: add the version to the MTA ID, e.g.: myApp.deployer100 --> myApp.deployer110).
2.	Modify the mtad.yaml HTML5 application deployer module name (best practice: add the version to the module name, e.g.: myAppDeployer100 --> myAppDeployer110).
3.	Change the mtad.yaml resources block: Add a new appVersion, new xsappname and new service instance name.
4.	Rebuild the mtar file.
5.	CF deploy mtar.

#### With CF Push
1.	Create a new html5-apps-repo/app-host with new appVersion, new xsappname and new service instance name.
2.	Modify the HTML5 application deployer app application name (best practice: add the version to the application name, e.g.: myAppDeployer100 --> myAppDeployer110).
3.	Change the manifest.yaml services block to point to the new service instance name.
4.	CF push app with manifest.yaml.


### Replacing Existing HTML5 Application Version

#### With Deploy Plugin
1. Unbind the existing html5-apps-repo/app-host instance.
2. Delete the existing html5-apps-repo/app-host instance.
2. Re-build mtar file.
3. CF deploy mtar.

#### With CF Push
1. Unbind the existing html5-apps-repo/app-host instance.
2. Delete the existing html5-apps-repo/app-host instance.
3. Create a new html5-apps-repo/app-host using the  appVersion, appName, xsappname, and service instance name from the previously deleted version.
4. CF push app with manifest.yaml.
