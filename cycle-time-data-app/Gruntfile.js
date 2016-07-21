// references: https://github.com/request/request#http-authentication
// https://www.npmjs.com/package/grunt-http 

module.exports = function(grunt) {
    require('grunt');
    
    var config_file_name = 'config.json';
    var auth_file_name = 'auth.json';
    
    var config = { auth: {} };
    
    if ( grunt.file.exists(config_file_name) ) {
    
        config = grunt.file.readJSON('config.json');

        config.js_files = grunt.file.expand(['src/javascript/utils/*.js','src/javascript/*.js']);

        config.ugly_files = grunt.file.expand(['deploy/app.min.*.js']);
        
        config.css_files = grunt.file.expand( 'src/style/*.css' );
        
        config.js_contents = " ";
        for (var i=0;i<config.js_files.length;i++) {
            grunt.log.writeln( config.js_files[i]);
            config.js_contents = config.js_contents + "\n" + grunt.file.read(config.js_files[i]);
        }
    
        config.style_contents = "";
        for (var i=0;i<config.css_files.length;i++) {
            grunt.log.writeln( config.css_files[i]);
            config.style_contents = config.style_contents + "\n" + grunt.file.read(config.css_files[i]);
        }
        
        config.ugly_contents = "";
        for ( var i=0;i<config.ugly_files;i++ ) {
            grunt.file.read(config.ugly_files[i]);
        }
    }
    if ( grunt.file.exists(auth_file_name) ) {
        var auth = grunt.file.readJSON(auth_file_name);
        config.auth = auth
    } else {
        grunt.log.writeln("");
        grunt.log.writeln("WARNING: Slow tests won't run without an auth.json file");
    }
    
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                mangle: true
            },
            ugly: {
                files: { 'deploy/app.min.js': config.js_files }
            }
        },
        template: {
                dev: {
                    src: 'templates/App-debug-tpl.html',
                    dest: 'App-debug.html',
                    engine: 'underscore',
                    variables: config
                },
                devApiKey: {
                    src: 'templates/App-debug-apikey-tpl.html',
                    dest: 'App-debug-apikey.html',
                    engine: 'underscore',
                    variables: config
                },
                prod: {
                    src: 'templates/App-tpl.html',
                    dest: 'deploy/App.txt',
                    engine: 'underscore',
                    variables: config
                },
                apikey: {
                    src: 'templates/App-apikey-tpl.html',
                    dest: 'deploy/ExternalApp.txt',
                    engine: 'underscore',
                    variables: config
                },
                confluence: {
                    src: 'templates/App-confluence-tpl.html',
                    dest: 'deploy/ConfluenceApp.txt',
                    engine: 'underscore',
                    variables: config
                },
                ugly: {
                    src: 'templates/App-ugly-tpl.html',
                    dest: 'deploy/Ugly.txt',
                    engine: 'underscore',
                    variables: config
                }
        },
        watch: {
            files: ['src/javascript/**/*.js', 'src/style/*.css'],
            tasks: ['deploy']
        },
        jasmine: {
            fast: {
                src: 'src/**/*.js',
                options: {
                    specs: 'test/fast/*-spec.js',
                    helpers: 'test/fast/*Helper.js',
                    template: 'test/fast/custom.tmpl',
                    templateOptions: config,
                    keepRunner: true,
                    junit: { 
                        path: 'test/logs/fast'
                    }
                }
            },
            slow: {
                src: 'src/**/*.js',
                options: {
                    specs: 'test/slow/*-spec.js',
                    helpers: 'test/slow/*Helper.js',
                    template: 'test/slow/custom.tmpl',
                    templateOptions: config,
                    keepRunner: true,
                    timeout: 50000,
                    junit: { 
                        path: 'test/logs/slow'
                    }
                }
            }
        }
    });
   
    grunt.registerTask('setPostBuildInfo', 'Make a sloppy checksum', function() {
        var fs = require('fs'),
            username = require('username');
            chk = 0x12345678,
            i,
            deploy_file_name = 'deploy/App.txt';

        var deploy_file = grunt.file.read(deploy_file_name);

        string = deploy_file.replace(/var CHECKSUM = .*;/,"");
        string = string.replace(/var BUILDER = .*;/,"");
        string = string.replace(/\s/g,"");  //Remove all whitespace from the string.

        for (i = 0; i < string.length; i++) {
            chk += (string.charCodeAt(i) * i);
        }
        var builder = username.sync();
        grunt.log.writeln('setting builder:', builder);

        grunt.log.writeln('sloppy checksum: ' + chk);
        grunt.log.writeln('length: ' + string.length);
// 
        grunt.template.addDelimiters('square-brackets','[%','%]');
       
        var data = { checksum: chk, builder: builder }; 
        var output = grunt.template.process(deploy_file, { 
            data: data,  
            delimiters: 'square-brackets' 
        });

        grunt.file.write(deploy_file_name,output);
    });
    
    grunt.registerTask('install', 'Deploy the app to a rally instance', function() {
        
        if ( ! config.auth ) { 
            grunt.log.writeln("To deploy, define server, username and password in auth.json file");
            return; 
        }
        var valid = true;
        if ( !config.auth.server || config.auth.server == "" ) {
            grunt.log.writeln("To deploy, server must be defined in the auth.json file");
            valid = false;
        }
        
        if ( !config.auth.username || config.auth.username == "" ) {
            grunt.log.writeln("To deploy, username must be defined in the auth.json file");
            valid = false;
        }
         
        if ( !config.auth.password || config.auth.password == "" ) {
            grunt.log.writeln("To deploy, password must be defined in the auth.json file");
            valid = false;
        }
        
        if ( !valid ) { return; }
        
        var done = this.async();
        var request = require('request');
        
        var j = request.jar();
        request.defaults({jar: j});

        var installApp = function(page_oid,panel_oid) {
            var html = grunt.file.read('deploy/App.txt');
            
            var uri = config.auth.server + "/slm/dashboard/changepanelsettings.sp";
            grunt.log.writeln('URI:', uri);
//            grunt.log.writeln('Page OID', page_oid);
//            grunt.log.writeln('Panel OID', panel_oid);
            
            var parameters = {
                cpoid:10909656256,
                _slug:'/custom/' + page_oid
            };

            var payload = {
                oid: panel_oid,
                settings: JSON.stringify({
                    "title": config.name,
                    "project": null,
                    "content": html,
                    "autoResize": true
                }),
                dashboardName: 'myhome' + page_oid
            };

            grunt.log.writeln('Installing app:', config.auth.server + "/#/custom/" + page_oid);

            var options = {
                uri: uri,
                form: payload,
                qs: parameters,
                jar: j
            };
        
            request.post(options, function(error,response,body){
                if ( response.statusCode != 200 ) {
                    grunt.log.writeln('oops');
                }
                //grunt.log.writeln('response body', body);
                grunt.log.writeln('done');
            });
        };
        
        var makeApp = function(key,page_oid) {
            var uri = config.auth.server + "/slm/dashboard/addpanel.sp";
//            grunt.log.writeln('URI:', uri);
            
            var parameters = {
                cpoid:10909656256,
                _slug:'/custom/' + page_oid
            };

            var payload = {
                panelDefinitionOid:431632107,
                col:0,
                index:0,
                dashboardName: 'myhome' + page_oid
            };

            grunt.log.writeln('Creating app on page', page_oid);

            var options = {
                uri: uri,
                form: payload,
                qs: parameters,
                jar: j
            };
        
            request.post(options, function(error,response,body){
                if ( response.statusCode != 200 ) {
                    grunt.log.writeln('oops');
                }
                //grunt.log.writeln('response body', body);
                // looking for
                // {"oid":52337581989}
                var response_object = JSON.parse(body);
                
                // save IDs:
                grunt.log.writeln('Save IDs');
                config.auth.pageOid = page_oid;
                config.auth.panelOid = response_object.oid;
                grunt.file.write(auth_file_name,JSON.stringify(config.auth,null,'\t') + "\r\n");
                
                grunt.log.writeln('Created panel with oid:', response_object.oid);
                installApp(page_oid,response_object.oid);
            });
        };
        
        var makePage = function(key) {
            var uri = config.auth.server + "/slm/wt/edit/create.sp";
            var parameters = {
                cpoid:729766,
                key: key
            };

            var payload = {
                name: "*" + config.name,
                editorMode: 'create',
                pid: 'myhome',
                oid: 6440917,
                timeboxFilter:'none' 
            };

            grunt.log.writeln('Creating page:', payload.name);

            var options = {
                uri: uri,
                form: payload,
                qs: parameters,
                jar: j
            };
        
            request.post(options, function(error,response,body){
                //grunt.log.writeln('responseCode:', response.statusCode);
                if ( response.statusCode != 200 ) {
                    grunt.log.writeln('oops');
                    //grunt.log.writeln('--', response.headers);
                    //grunt.log.writeln('--', response.request.headers);
                    //grunt.log.writeln('--', response.request.body);
                }
                //grunt.log.writeln('response:', response);
                //grunt.log.writeln('response body', body);
                // looking for
                // <input type="hidden" name="oid" value="52337144851"/>
                var page_oid = body.replace(/(.|[\r\n])*name="oid"/,"").replace(/"\/\>(.|[\r\n])*/,"").replace(/.*"/,"");
                
                grunt.log.writeln('Created', payload.name, " at oid:", page_oid);
                
                makeApp(key,page_oid)
            });
        };
       
        var uri = config.auth.server + "/slm/webservice/v2.0/security/authorize";
        
        var options = { 
            uri: uri,
            method:'GET', 
            auth: { 'user': config.auth.username, 'pass': config.auth.password, 'sendImmediately': true } 
        };

        grunt.log.writeln('Authenticating on ', config.auth.server, ' as ', config.auth.username);
        
        request.get(options, function(error,response,body){
                if ( response.statusCode != 200 ) {
                    grunt.log.writeln('oops: couldn not log in');
                } else {
                    var json = JSON.parse(body);
                    var key = json.OperationResult.SecurityToken;

                    var cookie = response.headers['set-cookie'];

                    for ( var i=0; i<cookie.length; i++ ) {
                        j.setCookie(request.cookie(cookie[i]),config.auth.server);
                    }
                    
                    if (!config.auth.pageOid && !config.auth.panelOid) {
                        makePage(key);
                    } else {
                        installApp(config.auth.pageOid, config.auth.panelOid);
                    }
                }
            }
        );

        
    });

    //load
    grunt.loadNpmTasks('grunt-templater');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    
    //tasks
    grunt.registerTask('default', ['debug','build','ugly','apikey']);
    
    // (uses all the files in src/javascript)
    grunt.registerTask('build', "Create the html for deployment",['template:prod','setPostBuildInfo']);
    // 
    grunt.registerTask('debug', "Create an html file that can run in its own tab", ['template:dev','template:devApiKey']);
    //
    grunt.registerTask('ugly', "Create the ugly html for deployment",['uglify:ugly','template:ugly']);
    //
    grunt.registerTask('apikey', "Create an html file that can run on another server", ['template:apikey','template:confluence']);

    grunt.registerTask('test-fast', "Run tests that don't need to connect to Rally", ['jasmine:fast']);
    grunt.registerTask('test-slow', "Run tests that need to connect to Rally", ['jasmine:slow']);

    grunt.registerTask('deploy', 'Build and deploy app to the location in auth.json',['build','install']);
};
