#Cycle Time Data

####Cycle Time Field
The fields available for the Cycle Time field will be determined by the artifact types selected in the App Settings.  
If both User Stories and Defects are selected in the App Settings, then the fields available for the State will the fields on the Story, otherwise, they will be the fields on the only artifact type selected.

#### From State
This is the state from which the cycletime calculation will begin.  If (Creation) is selected, the cycle time will be calculated from the CreationDate

#### To State
This is the state that the artifact must transition into or past for the cycle time calculation to end.  

#### Cycle Time From Date 
If a date is selected, the chart will only calculate cycle time for 
  
![ScreenShot](/images/cycle-time-app.png)
  
Select the Ready and/or Blocked toggles to show the time in Ready and/or Blocked

Hover over the Time In State or Cycle Time calculations to see the dates used in the calculation.

###Cycle Time Calculations:
*  Cycle time is the time from the first time the field enters or transitions past the "From State" to the last time the field enters or transitions past the "To State".  
*  If an object moved into the "To State" and then back into a state prior to the "To State", the cycle time will be 0 as the object is considered not to have completed the cycle.  

###Time in State: 
*  Time In State for a State is a cumulative sum.
*  Time in State for boolean fields (Ready, Blocked) is the cumulative sum of the time that field value is true.    
*  Time in State does not exclude weekends.  
*  The time in state for the current State will include the time that object transitioned into the field until the current date and time.
*  If an object has been in the same state since it was created, the Time in State will be the entire lifetime of the object until the current date time.    

##Exports

###Export Summary...
Cycle time and Time in State summary data can be exported using this menu item of the grid.  There will be one row per artifact shown on the grid that contains the selected cycle time data and all time in state data.  

###Export with Timestamps...
This option will export a row for each state transition for the selected state field for all artifacts on the grid. 
 
####Export limits
 Due to the volume of data that is being returned when doing cycletime calculations, the number of artifacts that can be exported with cycle time\time in state data is set to 1000.  Please note if there 
 are more artifacts in the grid than the limit, you will be notified and only 1000 artifacts will be exported.  
 
![ScreenShot](/images/export-warning.png) 
 
## App Settings
 Use the app settings to select the artifact type(s) for the cycle time grid and also specify a query string for the data set in the query box.  
 ![ScreenShot](/images/cycle-time-app-setting.png)





## Development Notes

### First Load

If you've just downloaded this from github and you want to do development, 
you're going to need to have these installed:

 * node.js
 * grunt-cli
 * grunt-init
 
Since you're getting this from github, we assume you have the command line
version of git also installed.  If not, go get git.

If you have those three installed, just type this in the root directory here
to get set up to develop:

  npm install

### Structure

  * src/javascript:  All the JS files saved here will be compiled into the 
  target html file
  * src/style: All of the stylesheets saved here will be compiled into the 
  target html file
  * test/fast: Fast jasmine tests go here.  There should also be a helper 
  file that is loaded first for creating mocks and doing other shortcuts
  (fastHelper.js) **Tests should be in a file named <something>-spec.js**
  * test/slow: Slow jasmine tests go here.  There should also be a helper
  file that is loaded first for creating mocks and doing other shortcuts 
  (slowHelper.js) **Tests should be in a file named <something>-spec.js**
  * templates: This is where templates that are used to create the production
  and debug html files live.  The advantage of using these templates is that
  you can configure the behavior of the html around the JS.
  * config.json: This file contains the configuration settings necessary to
  create the debug and production html files.  
  * package.json: This file lists the dependencies for grunt
  * auth.json: This file should NOT be checked in.  Create this to create a
  debug version of the app, to run the slow test specs and/or to use grunt to
  install the app in your test environment.  It should look like:
    {
        "username":"you@company.com",
        "password":"secret",
        "server": "https://rally1.rallydev.com"
    }
  
### Usage of the grunt file
####Tasks
    
##### grunt debug

Use grunt debug to create the debug html file.  You only need to run this when you have added new files to
the src directories.

##### grunt build

Use grunt build to create the production html file.  We still have to copy the html file to a panel to test.

##### grunt test-fast

Use grunt test-fast to run the Jasmine tests in the fast directory.  Typically, the tests in the fast 
directory are more pure unit tests and do not need to connect to Rally.

##### grunt test-slow

Use grunt test-slow to run the Jasmine tests in the slow directory.  Typically, the tests in the slow
directory are more like integration tests in that they require connecting to Rally and interacting with
data.

##### grunt deploy

Use grunt deploy to build the deploy file and then install it into a new page/app in Rally.  It will create the page on the Home tab and then add a custom html app to the page.  The page will be named using the "name" key in the config.json file (with an asterisk prepended).

To use this task, you must create an auth.json file that contains the following keys:
{
    "username": "fred@fred.com",
    "password": "fredfredfred",
    "server": "https://us1.rallydev.com"
}

(Use your username and password, of course.)  NOTE: not sure why yet, but this task does not work against the demo environments.  Also, .gitignore is configured so that this file does not get committed.  Do not commit this file with a password in it!

When the first install is complete, the script will add the ObjectIDs of the page and panel to the auth.json file, so that it looks like this:

{
    "username": "fred@fred.com",
    "password": "fredfredfred",
    "server": "https://us1.rallydev.com",
    "pageOid": "52339218186",
    "panelOid": 52339218188
}

On subsequent installs, the script will write to this same page/app. Remove the
pageOid and panelOid lines to install in a new place.  CAUTION:  Currently, error checking is not enabled, so it will fail silently.

##### grunt watch

Run this to watch files (js and css).  When a file is saved, the task will automatically build and deploy as shown in the deploy section above.

