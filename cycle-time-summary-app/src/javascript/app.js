 Ext.define("cycle-time-summary-app", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),

    defaults: {
        margin: 10,
        labelAlign: 'right'
    },


    defaultStates: {
        "Artifact" : "User Story & Defect",
        "UserStoryAndDefect" : {
            "WorkflowState": "BF Development State",
            "StateFrom" : "(No State)",
            "StateTo" : "Accepting",
            "ReadyQueueColumn" : "(No State)",
            "StartDate" : "",
            "EndDate" : "",
            "LastNWeeks" : "3",
            "LastNMonths" : "3",
            "Projects" : []
        },
        "Defect" : {
            "WorkflowState": "BF Development State",
            "StateFrom" : "(No State)",
            "StateTo" : "Accepting",
            "ReadyQueueColumn" : "(No State)",
            "StartDate" : "",
            "EndDate" : "",
            "LastNWeeks" : "3",
            "LastNMonths" : "3",
            "Projects" : []
        },
        "Feature" : {
            "WorkflowState": "BF Development State",
            "StateFrom" : "(No State)",
            "StateTo" : "Accepting",
            "ReadyQueueColumn" : "(No State)",
            "StartDate" : "",
            "EndDate" : "",
            "LastNWeeks" : "3",
            "LastNMonths" : "3",
            "Themes" : []
        }
    },

    instructions: 'Please select the criteria for report and click update to see the report',

    items: [
        {xtype:'container',itemId:'selector_box_parent', layout: 'hbox', items: [
            {xtype:'container',itemId:'selector_box', layout: 'hbox', flex: 1},
            {xtype:'container',itemId:'selector_box_right', layout:'hbox', cls: 'rly-right'}
        ]},
        {xtype:'container',itemId:'filter_box', flex: 1},
        {xtype:'container',itemId:'cycletime_box', flex: 1},
        {xtype: 'container', itemId: 'message_box', flex: 1, height: 45, tpl: '<tpl><div class="no-data-container"><div class="secondary-message">{message}</div></div></tpl>'},
        {xtype:'container',itemId:'grid_box'}
    ],

    integrationHeaders : {
        name : "cycle-time-summary-app"
    },

    config: {
        defaultSettings: {
            queryFilter: "",
            granularity: 'minute',
            precision: 2,
            exportLimit: 10000
        }
    },
    exportDateFormat: 'm/d/Y h:i:s',
    _gridConfig: {},

    launch: function() {
       this.logger.log('Launch Settings', this.getSettings());
       this._queryStatePreference().then({
            scope: this,
            success: function(preference){
                this.addSelectors();
            }
       });
    },

    loadModels: function() {

        if (this.models) {
            return Deft.Promise.when(this.models);
        } else {
            return Rally.data.ModelFactory.getModels({
                context: this.context || Rally.environment.getContext(),
                types: this.getModelNames()
            }).then({
                success: function(models) {
                    this.models = models;
                },
                scope: this
            });
        }
    },

    showErrorNotification: function(msg){
        if (!msg){
            msg = "Error during execution.  See logs for details."
        }
        Rally.ui.notify.Notifier.showError({message: msg});
    },

    addSelectors: function(){

        this.getSelectorBox().removeAll();
        this.getCycleTimeBox().removeAll();
        this.getFilterBox().removeAll();
        this.getMessageBox().update({message: this.instructions});

        var ctButton = this.getSelectorBox().add({
            xtype: 'cycletimepickerbutton',
            modelNames: this.getModelNames(),
            context: this.getContext(),
            dateType : this.getSetting('dateType'),
            margin: '3 9 0 0',
            preferenceStates: this.defaultStates,
            listeners: {
                cycletimepickerready: this.addCycleTimePanel,
                scope: this,
                cycletimeparametersupdated: this.updateCycleTimeParameters
            }
        });

        this.getSelectorBoxRight().removeAll();

        var bt = this.getSelectorBoxRight().add({
            xtype: 'rallybutton',
            itemId: 'btUpdate',
            text: 'Update',
            width: 100,
            margin: '3 9 0 0'
        });
        bt.on('click', this.updateGrid, this);

        this.getSelectorBoxRight().add({
            xtype: 'rallybutton',
            style: {'float': 'right'},
            cls: 'secondary rly-small',
            margin: '3 9 0 0',
            frame: false,
            itemId: 'actions-menu-button',
            iconCls: 'icon-export',
            listeners: {
                click: this._export,
                scope: this
            }
        });
    },

    showInstructionsDialog: function(btn){
         var popoverTarget = btn.getEl();

         this.popover = Ext.create('Rally.ui.popover.Popover', {
             target: popoverTarget,
             placement: ['bottom', 'left', 'top', 'right'],
             cls: 'field-picker-popover',
             toFront: Ext.emptyFn,
             buttonAlign: 'center',
             title: "Cycle Time App Instructions",
             width: Math.min(this.getWidth(),400),
             listeners: {
                 destroy: function () {
                     this.popover = null;
                 },
                 scope: this
             },
             buttons: [
                 {
                     xtype: "rallybutton",
                     text: 'Close',
                     cls: 'field-picker-cancel-btn secondary dark rly-small',
                     listeners: {
                         click: function() {
                             this.popover.close();
                         },
                         scope: this
                     }
                 }
             ],
             items: [
                 {
                     xtype: 'container',
                     html: this.instructions
                 }
             ]
         });
     },

    getSelectorBoxRight: function(){
         return this.down('#selector_box_right');
     },
    getFilterBox: function(){
        return this.down('#filter_box');
    },
    getCycleTimeBox: function(){
        return this.down('#cycletime_box');
    },
    addInlineFilterPanel: function(panel){
        this.logger.log('addInlineFilterPanel', panel);
        this.getFilterBox().add(panel);
    },
    addCycleTimePanel: function(panel){
        this.logger.log('addCycleTimePanel', panel);
        this.getCycleTimeBox().add(panel);
    },
    updateGridFields: function(fields){
        this.logger.log('updateGridFields', fields);
        this._gridConfig.fields = fields;
        this.updateGrid();
    },
     setUpdateButtonUpdateable: function(updateable){
         var button = this.down('#btUpdate');
         if (!button){
             return;
         }

         if (updateable){
             button.setDisabled(false);
             button.setIconCls('icon-refresh');
         } else {
             button.setDisabled(true);
             button.setIconCls('');
         }
     },
    updateGridFilters: function(filter){
        this.logger.log('updateGridFilters', filter.getTypesAndFilters());
        this._gridConfig.filters = filter.getTypesAndFilters();
        this.getSelectorBox().doLayout();
        this.setUpdateButtonUpdateable(true);
    },
    updateCycleTimeParameters: function(parameters){
        this.logger.log('updateCycleTimeParameters',parameters.getCycleTimeParameters());
        this._gridConfig.cycleTimeParameters = parameters.getCycleTimeParameters();
        this.setUpdateButtonUpdateable(true);
        this.getGridBox().removeAll();
    },
     calculateCycleTime: function(){
         return this.down('cycletimepickerbutton') && this.down('cycletimepickerbutton').hasValidCycleTimeParameters() || false;
     },
     getMessageBox: function(){
         return this.down('#message_box');
     },
     updateMessageBox: function(msg, color){

         if (color){
             msg = Ext.String.format('<span style="color:{0};">{1}</span>',color,msg);
         }

         this.getMessageBox().update({message: msg});
     },
     updateGrid: function(){
        
        // update states preferences before getting the data.
        this._setDefaultStateValues(this._gridConfig.cycleTimeParameters);
        this._updatePreference(this.statePreference.get('ObjectID')).then({
            scope:this,
            success: function(result){
                if(this.getSelectedProjects().length == 0){
                    this.updateMessageBox("No project selected select one or more projects to display the Summary",'red');
                    return;
                }

                 CArABU.technicalservices.CycleTimeCalculator.startDate = this.getStartDate();
                 CArABU.technicalservices.CycleTimeCalculator.endDate = this.getEndDate();
                 CArABU.technicalservices.CycleTimeCalculator.precision = this.getSetting('precision');
                 CArABU.technicalservices.CycleTimeCalculator.granularity = this.getSetting('granularity');

                 this.getGridBox().removeAll();
                 this.updateMessageBox();
                 //this.setUpdateButtonUpdateable(false);
                 this.setLoading('Loading Current Data...');

                 this.fetchWsapiArtifactData().then({
                     success: this.buildCycleGrid,
                     failure: this.showErrorNotification,
                     scope: this
                 }).always(function(){ this.setLoading(false);}, this);                
            }
        });

        
     },
     buildCycleGrid: function(records){
        this.logger.log('buildCycleGrid', records);

         if (records && records.length > 0){
             if (this.calculateCycleTime()){
                 this.setLoading('Loading Historical data...')
                 this.fetchHistoricalData(records).then({
                     //success: this.addGrid,
                     success: this.calculateSummary,
                     failure: this.showErrorNotification,
                     scope: this
                 }).always(function(){ this.setLoading(false);}, this);
             } else {
                 this.addGrid(records);
             }
         } else {
             this.showErrorNotification("No Data found for the given criteria");
         }
     },

     calculateSummary: function(records){
        var me = this;
        this.logger.log('calculateSummary',records, records.length);

        var cycle_time_summary = {};
        var results = [];
        var cycle_states = me.getCycleStates();
        var ready_queue_end_value = me.getReqdyQueueStateValue();

        if(me.getSetting('dateType') == 'LastNWeeks'){

            console.log(me.getStartDate(),me.getEndDate());
            var totalDays = Rally.util.DateTime.getDifference(me.getEndDate(), me.getStartDate(), 'day') / 7;

            var dt = me.getStartDate();
            for(i=0; i< totalDays; i++){
                cycle_time_summary[Ext.Date.format(dt, 'd-M-y')] = {
                    "Week" : Ext.Date.format(dt, 'd-M-y'),
                    "StartDate" : dt,
                    "EndDate" : Ext.Date.add(dt,Ext.Date.DAY,7),
                    "LeadTime" : 0,
                    "ReadyQueueTime" : 0,
                    "BlockTime": 0,
                    "c_BlockedTime": 0,
                    "ReadyTime": 0,
                    "TotalArtifacts" : 0,
                    "ChildrenCount" : 0,
                    "TotalStories":  0,
                    "TotalDefects": 0,
                    "TotalP1Defects":0,
                    "TotalP2Defects":0,                  
                    "Records": []                    
                }
                dt = Ext.Date.add(dt,Ext.Date.DAY,7);
            }

            Ext.Object.each(cycle_time_summary,function(key,value){
                Ext.Array.each(records,function(artifact){
                //cycle_time_summary[key].Project = me.getArtifactType() == 'Feature' ? artifact.get('Parent').Name : artifact.get('Project').Name;
                if(Ext.Number.from(artifact.get('cycleTimeData').cycleTime,0) > 0){
                    if(artifact.get('cycleTimeData') && artifact.get('cycleTimeData').endDate && Ext.Date.between(artifact.get('cycleTimeData').endDate, value.StartDate, value.EndDate)){
                        var ready_queue_cycle_time = CArABU.technicalservices.CycleTimeCalculator.getCycleTimeData(artifact.get('cycleTimeData').snaps,me.getStateField(),me.getReqdyQueueStateValue(),ready_queue_end_value,cycle_states,me.getSelectedProjectOids(),me.getStateField(),me.getToStateValue());
                        artifact.set('ReadyQueueTime',ready_queue_cycle_time);
                        cycle_time_summary[key].LeadTime += Ext.Number.from(artifact.get('cycleTimeData').cycleTime,0);
                        cycle_time_summary[key].ReadyQueueTime += Ext.Number.from(ready_queue_cycle_time.cycleTime,0);
                        cycle_time_summary[key].BlockTime += Ext.Number.from(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(artifact.get('timeInStateData'), "Blocked",null,""),0);
                        cycle_time_summary[key].c_BlockedTime += Ext.Number.from(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(artifact.get('timeInStateData'), "c_Blocked",null,""),0);
                        cycle_time_summary[key].ReadyTime += Ext.Number.from(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(artifact.get('timeInStateData'), "Ready",null,""),0);
                        cycle_time_summary[key].TotalArtifacts++;
                        cycle_time_summary[key].ChildrenCount += artifact.get('DirectChildrenCount') || 0;
                        if(artifact.get('_type') == 'hierarchicalrequirement') cycle_time_summary[key].TotalStories++;
                        if(artifact.get('_type') == 'defect') cycle_time_summary[key].TotalDefects++;
                        if(artifact.get('_type') == 'defect' && artifact.get('Priority') == '1 = Mult Cust / No Workaround') cycle_time_summary[key].TotalP1Defects++;
                        if(artifact.get('_type') == 'defect' && artifact.get('Priority') == '2 = Single Cust / No Workaround') cycle_time_summary[key].TotalP2Defects++;
                        cycle_time_summary[key].Records.push(artifact);            
                    }
                }
                });
            });

            console.log(cycle_time_summary);

        }else{
            // Calculate the averages for each project

            Ext.Array.each(records,function(artifact){
                if(Ext.Number.from(artifact.get('cycleTimeData').cycleTime,0) > 0){
                    var ready_queue_cycle_time = CArABU.technicalservices.CycleTimeCalculator.getCycleTimeData(artifact.get('cycleTimeData').snaps,me.getStateField(),me.getReqdyQueueStateValue(),ready_queue_end_value,cycle_states,me.getSelectedProjectOids(),me.getStateField(),me.getToStateValue());

                    artifact.set('ReadyQueueTime',ready_queue_cycle_time);
                    var parent_id =  me.getArtifactType() == 'Feature' ? artifact.get('Parent').ObjectID : artifact.get('Project').ObjectID;
                    if(cycle_time_summary[parent_id]){
                        cycle_time_summary[parent_id].LeadTime += Ext.Number.from(artifact.get('cycleTimeData').cycleTime,0);
                        cycle_time_summary[parent_id].ReadyQueueTime += Ext.Number.from(ready_queue_cycle_time.cycleTime,0);
                        cycle_time_summary[parent_id].BlockTime += Ext.Number.from(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(artifact.get('timeInStateData'), "Blocked",null,""),0);
                        cycle_time_summary[parent_id].c_BlockedTime += Ext.Number.from(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(artifact.get('timeInStateData'), "c_Blocked",null,""),0);
                        cycle_time_summary[parent_id].ReadyTime += Ext.Number.from(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(artifact.get('timeInStateData'), "Ready",null,""),0);
                        cycle_time_summary[parent_id].TotalArtifacts++;
                        cycle_time_summary[parent_id].ChildrenCount += artifact.get('DirectChildrenCount') || 0;
                        cycle_time_summary[parent_id].Records.push(artifact);            
                        if(artifact.get('_type') == 'hierarchicalrequirement') cycle_time_summary[parent_id].TotalStories++;
                        if(artifact.get('_type') == 'defect') cycle_time_summary[parent_id].TotalDefects++;
                        if(artifact.get('_type') == 'defect' && artifact.get('Priority') == '1 = Mult Cust / No Workaround') cycle_time_summary[parent_id].TotalP1Defects++;
                        if(artifact.get('_type') == 'defect' && artifact.get('Priority') == '2 = Single Cust / No Workaround') cycle_time_summary[parent_id].TotalP2Defects++;
                    } else {
                        cycle_time_summary[parent_id] = {
                            "Project" : me.getArtifactType() == 'Feature' ? artifact.get('Parent').Name : artifact.get('Project').Name,
                            "LeadTime" : Ext.Number.from(artifact.get('cycleTimeData').cycleTime,0),
                            "ReadyQueueTime" : Ext.Number.from(ready_queue_cycle_time.cycleTime,0),
                            "BlockTime": Ext.Number.from(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(artifact.get('timeInStateData'), "Blocked",null,""),0),
                            "c_BlockedTime": Ext.Number.from(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(artifact.get('timeInStateData'), "c_Blocked",null,""),0),
                            "ReadyTime": Ext.Number.from(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(artifact.get('timeInStateData'), "Ready",null,""),0),
                            "TotalArtifacts" : 1,
                            "ChildrenCount": artifact.get('DirectChildrenCount') || 0,
                            "TotalStories": artifact.get('_type') == 'hierarchicalrequirement' ? 1 : 0,
                            "TotalDefects": artifact.get('_type') == 'defect' ? 1 : 0,
                            "TotalP1Defects": (artifact.get('_type') == 'defect') && (artifact.get('Priority') == '1 = Mult Cust / No Workaround') ? 1 : 0,
                            "TotalP2Defects": (artifact.get('_type') == 'defect') && (artifact.get('Priority') == '2 = Single Cust / No Workaround') ? 1 : 0,
                            "Records": [artifact]
                        }
                    }                    
                }

            })            
        }

        this.logger.log('cycle_time_summary>>',cycle_time_summary);
        

        Ext.Object.each(cycle_time_summary,function(key,value){
            value.AvgLeadTime = value.TotalArtifacts > 0 ? value.LeadTime / value.TotalArtifacts : 0;
            if(me.getArtifactType() == 'Feature'){
                value.AvgBlockTime = value.TotalArtifacts > 0 ? value.c_BlockedTime / value.TotalArtifacts : 0;
            }else{
                value.AvgBlockTime = value.TotalArtifacts > 0 ? value.BlockTime / value.TotalArtifacts : 0;
            }
            value.AvgReadyTime = value.TotalArtifacts > 0 ? value.ReadyTime / value.TotalArtifacts : 0;
            value.AvgReadyQueueTime = value.TotalArtifacts > 0 ? value.ReadyQueueTime / value.TotalArtifacts : 0;
            value.AvgCycleTime = value.AvgLeadTime - value.AvgReadyQueueTime;
            value.AvgActiveCycleTime = value.AvgLeadTime - value.AvgReadyQueueTime - value.AvgBlockTime - value.AvgReadyTime;

            results.push(value);
        })

        me.overallSummaryData = {};

        if(me.getSetting('dateType') == 'LastNWeeks'){
            me.overallSummaryData.Week =  'Total';
        }else{
            me.overallSummaryData.Project =  'Total';
        }

        me.overallSummaryData.TotalArtifacts =  _.reduce(_.pluck(results, 'TotalArtifacts'), function(sum, num) {
                                                        return sum + num;
                                                    });


        me.overallSummaryData.AvgLeadTime =  _.reduce(_.pluck(results, 'LeadTime'), function(sum, num) {
                                                        return sum + num;
                                                    });


        me.overallSummaryData.AvgLeadTime = Ext.Number.toFixed(me.overallSummaryData.TotalArtifacts > 0 ? me.overallSummaryData.AvgLeadTime / me.overallSummaryData.TotalArtifacts : 0,2);


        me.overallSummaryData.AvgBlockTime =  _.reduce(_.pluck(results, me.getArtifactType() == 'Feature' ? 'c_BlockedTime' : 'BlockTime'), function(sum, num) {
                                                        return sum + num;
                                                    });


        me.overallSummaryData.AvgBlockTime = Ext.Number.toFixed(me.overallSummaryData.TotalArtifacts > 0 ? me.overallSummaryData.AvgBlockTime / me.overallSummaryData.TotalArtifacts : 0,2);


        me.overallSummaryData.AvgReadyTime =  _.reduce(_.pluck(results, 'ReadyTime'), function(sum, num) {
                                                        return sum + num;
                                                    });


        me.overallSummaryData.AvgReadyTime = Ext.Number.toFixed(me.overallSummaryData.TotalArtifacts > 0 ? me.overallSummaryData.AvgReadyTime / me.overallSummaryData.TotalArtifacts : 0,2);


        me.overallSummaryData.AvgReadyQueueTime =  _.reduce(_.pluck(results, 'ReadyQueueTime'), function(sum, num) {
                                                        return sum + num;
                                                    });


        me.overallSummaryData.AvgReadyQueueTime = Ext.Number.toFixed(me.overallSummaryData.TotalArtifacts > 0 ? me.overallSummaryData.AvgReadyQueueTime / me.overallSummaryData.TotalArtifacts : 0,2);

        me.overallSummaryData.AvgCycleTime = Ext.Number.toFixed(me.overallSummaryData.AvgLeadTime - me.overallSummaryData.AvgReadyQueueTime,2);

        me.overallSummaryData.AvgActiveCycleTime = Ext.Number.toFixed(me.overallSummaryData.AvgLeadTime - me.overallSummaryData.AvgReadyQueueTime - me.overallSummaryData.AvgBlockTime - me.overallSummaryData.AvgReadyTime,2);

        console.log('me.overallSummaryData >>',me.overallSummaryData);

        var store_config = {
            data: results
        }

        if(me.getSetting('dateType') != 'LastNWeeks'){
            store_config.sorters = {
                property: 'AvgCycleTime',
                direction: 'DESC'
            }
        }

        var store = Ext.create('Rally.data.custom.Store',store_config );

        me.addSummaryGrid(store);

        //adding the summary data to chart as well. 
        me.addChart(results);

        me.results = results;

     },

    addChart: function(results){
        var me = this;
        results.unshift(me.overallSummaryData);
        var chartType = this.getSetting('chartType');
        if(chartType == 'line'){
            results.splice(0, 1);
        }
        this.getGridBox().add({
            xtype:'rallychart',
            loadMask: false,
            chartData: this.getChartData(results),
            chartConfig: this.getChartConfig(chartType)
        });
    },

    getChartData: function(results) {
        console.log('results>>',results);
        var me = this;
        var categories = [];
        
        var lead = [];
        var cycle = [];
        var active = [];
        var ready_queue = [];

        Ext.Array.each(results, function(value){
            var category = me.getSetting('dateType') == 'LastNWeeks' ? value.Week:value.Project;
            categories.push(category);
            lead.push({
                        y: Ext.util.Format.round(value.AvgLeadTime,2),
                        events: {
                          click: function() {
                              me.showDrillDown(value,category);
                          }
                        }
                       });
            cycle.push({
                        y: Ext.util.Format.round(value.AvgCycleTime,2),
                        events: {
                          click: function() {
                              me.showDrillDown(value,category);
                          }
                        }
                        });

        });
        
        return { 
            series: [ 
                { name: "Lead", data: lead, pointPadding: 0.3, color: 'Orange' },
                { name: "Cycle", data: cycle, pointPadding: 0.4, color: 'Green'  }
            ],
            categories: categories
        };
    },

    getChartConfig: function(type) {
        var me = this;
        return {
            chart: {
                type: type
            },
            title: {
                text: 'Cycle Time Summary'
            },
            xAxis: {
            },
            yAxis: {
                min: 0,
                title: {
                    text: me.getSetting('granularity')//'Days'
                }
            },
            plotOptions: {
                column: {
                    dataLabels: {
                        enabled: true
                    },
                    grouping: false,
                    shadow: false,
                    borderWidth: 0                    
                }
            }
        };
    },     

     addSummaryGrid: function(store){
        var me = this;
        this.suspendLayouts();

        this.getGridBox().add({
             xtype: 'rallygrid',
             store: store,
             columnCfgs: this.getSummaryColumnCfgs(),
             showPagingToolbar: false,
             scroll: 'vertical',
             title: 'Cycle Time Summary in (' + me.getSetting('granularity') + ')',
             titleAlign: 'center', 
             bodyPadding:10,
             showRowActionsColumn:false,
             sortableColumns: false,
            features: [{
                ftype: 'summary'
            }],
            viewConfig: {
                listeners: {
                    cellclick: function(view, cell, cellIndex, record) {
                        var title = record.Project || record.get('Project');
                        if(me.getSetting('dateType') == 'LastNWeeks'){
                            title = record.Week || record.get('Week');
                        }
                        me.showDrillDown(record,title);
                    },
                    scope:me
                }
            },            
            ptyText:  '<div class="no-data-container"><div class="secondary-message">No data was found for the selected current filters, cycle time parameters and projects selected.</div></div>'
         });
         this.resumeLayouts(true);
     },


    showDrillDown: function(record, title) {
        var me = this;
        
        console.log(record);

        var store = Ext.create('Rally.data.custom.Store', {
            data: record.Records || record.get('Records'),
            pageSize: 2000
        });
        
        Ext.create('Rally.ui.dialog.Dialog', {
            id        : 'detailPopup',
            title     : 'Artifacts for ' + title,
            width     : Ext.getBody().getWidth() - 50,
            height    : Ext.getBody().getHeight() - 50,
            closable  : true,
            layout    : 'border',
            frame : false,
            bodyCls: 'x-panel-body-default-framed',
            items     : [
            {
                xtype                : 'rallygrid',
                region               : 'center',
                layout               : 'fit',
                sortableColumns      : true,
                showRowActionsColumn : false,
                showPagingToolbar    : false,
                columnCfgs           : this.getDrillDownColumns(),
                store : store
            }]
        }).show();
    },

    getDrillDownColumns: function() {
        var me = this;
        var cols = [
            {
                dataIndex : 'FormattedID',
                text: "id",
                flex: 1,
                renderer: function(m,v,r){
                  return Ext.create('Rally.ui.renderer.template.FormattedIDTemplate').apply(r.data);
                }                
            },
            {
                dataIndex : 'Name',
                text: "Name",
                flex: 2
            },
        ];

        if(me.getArtifactType() != 'Feature'){
            cols.push(
            {
                dataIndex: 'ScheduleState',
                text: 'Schedule State',
                flex: 1
            }            
            );
        }else{
            cols.push(
            {
                dataIndex: 'Ready',
                text: 'Ready',
                flex: 1
            }            
            );
        }
        return cols.concat(this.getHistoricalDataColumns());
    },

    _export: function(){
        var me = this;
        if ( !me.results ) { return; }
        
        var filename = Ext.String.format('summary_export.csv');
        me._create_csv(me.results);

        Rally.technicalservices.FileUtilities.saveCSVToFile(me.CSV,filename);
    },

    _create_csv: function(results){
        var me = this;
        if ( !results ) { return; }
        results.push(me.overallSummaryData);
        me.setLoading("Generating CSV");

        var CSV = "";    
        var row = "";
        // Add the column headers
        var grid_columns = me.getSummaryColumnCfgs();
        var columns = [];
        Ext.Array.each(grid_columns,function(col){
            row += col.text.replace("<BR>","") + ',';
            columns.push(col.dataIndex);
        });

        CSV += row + '\r\n';

        //Write the totals row.
        row = "";

        CSV += row + '\r\n';
        // Loop through tasks hash and create the csv 
        Ext.Array.each(results,function(task){
            row = "";
            Ext.Array.each(columns,function(col){
                row += task[col] ? task[col] + ',':',';
            },me)
            CSV += row + '\r\n';

            if(task.children && task.children.length > 0){
                Ext.Array.each(task.children,function(child){
                    row = "";
                    Ext.Array.each(columns,function(col){
                        row += child[col] ? child[col] + ',':',';
                    },me)
                    CSV += row + '\r\n';

                    if(child.children && child.children.length > 0){
                        Ext.Array.each(child.children,function(gchild){
                            row = "";
                            Ext.Array.each(columns,function(col){
                                if(col == "Name" || col == "WorkProduct"){
                                    row += gchild[col] ? '"' + gchild[col].replace(/"/g, '""') + '"' + ',':',';
                                }else{
                                    row += gchild[col] ? gchild[col] + ',':',';
                                }
                            },me)
                            CSV += row + '\r\n';                             
                        });
                    }
                },me);
            }
        },me);

        me.CSV = CSV;
        me.setLoading(false);
    },

     fetchWsapiArtifactData: function(){
         var deferred = Ext.create('Deft.Deferred');
         Ext.create('Rally.data.wsapi.artifact.Store',{
            models: this.getModelNames(),
            limit: this.getExportLimit(),
            fetch: this.getCurrentFetchList(),
            filters: this.getWsapiArtifactFilters(),
            context: {
                projectScopeUp:false,
                projectScopeDown:false,
                project:null
            },
            pageSize: Math.min(this.getExportLimit(), 1000)
        }).load({
             callback: function(records, operation){
                 this.logger.log('fetchWsapiArtifactData', records.length, operation, records);
                 if (operation.wasSuccessful()){
                     var count =  operation && operation.resultSet && operation.resultSet.total;
                     this.logger.log('count', count, this.getExportLimit());
                     if (count > this.getExportLimit()){
                        deferred.resolve(null);
                     } else {
                         deferred.resolve(records);
                     }

                 } else {
                     deferred.reject("Unable to get artifact count:  " + operation.error.errors.join(','));
                 }
             },
             scope: this
         });

         return deferred;
     },

    getWsapiArtifactFilters: function(){
        var me = this;
        var filters = this._gridConfig && this._gridConfig.filters && this._gridConfig.filters.filters[0] || null;
        if (this.getQueryFilter()){
            if (filters){
                filters = filters.and(this.getQueryFilter());
            } else {
                filters = this.getQueryFilter();
            }
        }
        this.logger.log('getWsapiArtifactFilters', filters);
        if (this.calculateCycleTime() && this.getShowOnlyCompletedCycles()){  //show only data that is in a completed cycle state

            var states = this.getCycleStates(),
                cycleFilters = [],
                stateFieldName = this.getStateField(),
                toStateValue = this.getToStateValue();

            var re = new RegExp("PortfolioItem\/","i");
            if (re.test(this.getModelNames()[0]) && stateFieldName === 'State'){
                stateFieldName = "State.Name";
            }

            Ext.Array.each(states, function(s){
                if (s === toStateValue || cycleFilters.length > 0){
                    cycleFilters.push({
                        property: stateFieldName,
                        value: s
                    });
                }
            });
            cycleFilters = Rally.data.wsapi.Filter.or(cycleFilters);

            if (filters){
                filters = filters.and(cycleFilters);
            } else {
                filters = cycleFilters;
            }


            //Add ready filter

            if(me.getArtifactType() == 'Defect'){

                var defect_filters  = [{
                     property: 'State',
                     value: 'Closed'
                },{
                     property: 'Type',
                     operator: '!=',
                     value: 'NLC'
                }];

                filters = filters.and(Rally.data.wsapi.Filter.and(defect_filters));

            } else if(me.getArtifactType() == 'Feature'){

                var defect_filters  = Ext.create('Rally.data.wsapi.Filter', {
                     property: 'State',
                     value: 'Completed'
                });

                filters = filters.and(defect_filters);

            } else {

                var ready_filter = Ext.create('Rally.data.wsapi.Filter', {
                     property: 'Ready',
                     value: true
                });
                
                filters = filters.and(ready_filter);      
            }

        }

        var projectFilters = [];

        Ext.Array.each(this.getSelectedProjects(),function(p){
            projectFilters.push({
                                    property: me.getArtifactType() == 'Feature' ? 'Parent':'Project',
                                    value:p
                                });
        })

        filters.and(Rally.data.wsapi.Filter.or(projectFilters));

        var updatedFilters = filters.and(Rally.data.wsapi.Filter.or(projectFilters));

        filters = updatedFilters || [];
        this.logger.log('getWsapiArtifactFilters', filters.toString());
        return filters;
    },

    getStartDate: function(){
        if (this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.startDate){
            return this._gridConfig.cycleTimeParameters.startDate;
        }
        return null;
    },
    
    getEndDate: function(){
        if (this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.endDate){
            return this._gridConfig.cycleTimeParameters.endDate;
        }
        return null;
    },

    getCycleStates: function(){
        return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.cycleStates || [];
    },

    getPreviousStates: function(endState){
       var states = this.getCycleStates(),
        // var states = this.getFromStateCombo().getStore().getRange(),
            previousStates = [null];

        for (var i=0; i<states.length; i++){
            var state = states[i];
            if (state === endState){
                i = states.length;
            } else {
                if (state && state.length > 0){
                    previousStates.push(state);
                }
            }
        }
        this.logger.log('getPreviousStates', previousStates);
        return previousStates;
    },
    
    getEndStates: function(endState){
        if (!endState){
            endState = this.getToStateValue();
        }

        var states = this.getCycleStates(),
            endStates = [];
        this.logger.log('getEndStates', endState, states);

        for (var i=states.length-1; i>0; i--){
            var state = states[i];
            endStates.push(state);
            if (state === endState){
                i = 0;
            }
        }
        return endStates;
    },
    getCurrentFetchList: function(){
        var fetch = ['ObjectID','Project','Blocked','Ready','Name','FormattedID','ScheduleState','AcceptedDate','Priority','Parent'];

        if (this.getStateField()){
            Ext.Array.merge(this.getStateField(), fetch);
        }

        return fetch;
    },
    getShowOnlyCompletedCycles: function(){
        return true;
    },
    getWsapiArtifactCount: function(config){
        config.limit = 1;
        config.fetch = ['ObjectID'];
        config.pageSize = 1;
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.artifact.Store',config).load({
            callback: function(records, operation){
                this.logger.log('getWsapiArtifactCount', operation);
                if (operation.wasSuccessful()){
                    var count = operation && operation.resultSet && operation.resultSet.total;
                    deferred.resolve(count);
                } else {
                    deferred.reject("Unable to get aritfact count:  " + operation.error.errors.join(','));
                }
            },
            scope: this
        });

        return deferred;
    },

    getExportLimit: function(){
        return this.getSetting('exportLimit') || 1000;
    },
    getStateValueArray: function(){
        var arr = _.map(this.getFromStateCombo().getStore().getRange(), function(r){
            return r.get('value');
        }, this);
        Ext.Array.remove(arr, "");
        return arr;
    },
     fetchHistoricalData: function(records){
        var deferred = Ext.create('Deft.Deferred');
        this.logger.log('fetchHistoricalData', records);

        if (this.calculateCycleTime() && records.length > 0) {
            this.setLoading(Ext.String.format("Loading historical data for {0} artifacts.", records.length));

            var includeBlocked = this.getIncludeBlocked(),
                includeReady = this.getIncludeReady(),
                fromState = this.getFromStateValue(),
                toState = this.getToStateValue(),
                stateField = this.getStateField(),
                stateValues = this.getCycleStates(),
                readyQueueState = this.getReqdyQueueStateValue();

            this.logger.log('stateValues', stateValues);
            Ext.create('CArABU.technicalservices.CycleTimeDataStore', {
                stateField: stateField,
                stateValues: stateValues,
                includeReady: includeReady,
                includeBlocked: includeBlocked,
                fromState: fromState,
                toState: toState,
                startDate: this.getStartDate(),
                endDate: this.getEndDate(),
                projects: this.getSelectedProjectOids(),
                readyQueueState: readyQueueState
            }).load(records).then({
                success: function (updatedRecords) {
                    deferred.resolve(updatedRecords);
                },
                failure: function (msg) {
                    deferred.reject(msg);
                },
                scope: this
            }).always(function () {
                this.setLoading(false);
            }, this);
        }else {
            deferred.resolve(records);
        }

        return deferred;
    },
    updateHistoricalData: function(updatedRecords){
        this.logger.log('updateHistoricalData', updatedRecords);
    },
    getCycleTimeColumnHeader: function(){
        return Ext.String.format("Lead time from {0} to {1} ({2}s)", this.getFromStateValue(), this.getToStateValue(), CArABU.technicalservices.CycleTimeCalculator.granularity);
    },
    getCycleTimeStartColumnHeader: function(){
        return "Cycle Time Start Date";
    },
    getCycleTimeEndColumnHeader: function(){
        return "Cycle Time End Date";
    },
    getTimeInStateColumnHeader: function(stateName){
        return Ext.String.format("Time in {0} ({1}s)", stateName || "[No State]", CArABU.technicalservices.CycleTimeCalculator.granularity);
    },
    
    getHistoricalDataColumns: function(){


        var columns = [],
            toState = this.getToStateValue(),
            fromState = this.getFromStateValue();

        if (fromState && toState){
            columns.push({
                xtype: 'leadtimetemplatecolumn',
                text: this.getCycleTimeColumnHeader(),
                flex: 1
            });
        }

        columns.push({
            xtype: 'timetemplatecolumn',
            dataType: 'timeInStateData',
            stateName: this.getStateField(),
            stateValue: this.getReqdyQueueStateValue(),
            text: this.getTimeInStateColumnHeader("Ready Queue"),
            flex: 1
        });

        columns.push({
            xtype: 'cycletimetemplatecolumn',
            dataType: 'timeInStateData',
            text: "Cycle Time",
            flex: 1,
            sortable:true
        });

        if (fromState && toState){
            Ext.Array.each( this.getCycleStates(), function(s){

                if (s && s.length > 0 && s != this.getReqdyQueueStateValue()){
                    var header = this.getTimeInStateColumnHeader(s);
                    columns.push({
                        xtype: 'timetemplatecolumn',
                        dataType: 'timeInStateData',
                        stateName: this.getStateField(),
                        stateValue: s,
                        text: header,
                        flex: 1
                    });
                    if (s === toState){ return false; }
                }

            }, this);
        }

        if (this.getIncludeBlocked()){
            if(this.getArtifactType() == 'Feature'){
                columns.push({
                    xtype: 'timetemplatecolumn',
                    dataType: 'timeInStateData',
                    stateName: "c_Blocked",
                    text: this.getTimeInStateColumnHeader("Blocked"),
                    flex: 1
                });                
            }else{
                columns.push({
                    xtype: 'timetemplatecolumn',
                    dataType: 'timeInStateData',
                    stateName: "Blocked",
                    text: this.getTimeInStateColumnHeader("Blocked"),
                    flex: 1
                });                
            }

        }

        if (this.getIncludeReady()){
            columns.push({
                xtype: 'timetemplatecolumn',
                dataType: 'timeInStateData',
                stateName: 'Ready',
                text: this.getTimeInStateColumnHeader("Ready to Pull State"),
                flex: 1
            });
        }

        this.logger.log('getHistoricalDataColumns', columns);
        return columns;
    },
    getColumnCfgs: function(model){
        var columns = [];

        Ext.Array.each(this.getCurrentFetchList(), function(c){
            if (c !== 'ObjectID'){
                if (model){
                    var field = model.getField(c),
                        tpl = Rally.ui.renderer.RendererFactory.getRenderTemplate(field),
                        col = {
                            text: field.displayName,
                            dataIndex: c,
                            //renderer: tpl
                            renderer: function(v,m,r){
                                 return tpl.apply(r.getData());
                            }
                        };
                } else {
                    var col = {
                        text: c.replace("c_",""),
                        dataIndex: c
                    };
                }
                if (c === 'Name'){
                    col.flex = 1;
                }
                columns.push(col);
            }
        });


        if (this.calculateCycleTime()){
            columns = columns.concat(this.getHistoricalDataColumns());
        }
        this.logger.log('getColumnCfgs', columns);
        return columns;
    },

    getSummaryColumnCfgs: function(){
        var me = this;
        //me.overallSummaryData = {"Project":"Total"};
        var columns = [{
            dataIndex: me.getSetting('dateType') == 'LastNWeeks' ? 'Week' : 'Project',
            text: me.getSetting('dateType') == 'LastNWeeks' ? 'Week' : 'Project',
            summaryRenderer: function() {
                return "Total"; 
            },
            flex:1
        },
        {
            dataIndex: 'TotalArtifacts',
            text:'Throughput'

        }];

        if(me.getArtifactType() == 'Defect'){
            columns.push({
                dataIndex: 'TotalP1Defects',
                text:'Priority 1 Defects'
            },        
            {
                dataIndex: 'TotalP2Defects',
                text:'Priority 2 Defects'
            });
        }else if(me.getArtifactType() == 'Feature'){
            columns.push({
                dataIndex: 'ChildrenCount',
                text:'User Stories'
            },
            {
                dataIndex:'TotalArtifacts',
                text:'Avg Story Count',
                renderer: function(v,m,r){
                    return r.get('TotalArtifacts') > 0 ? Ext.Number.toFixed(r.get('ChildrenCount')/r.get('TotalArtifacts'),1):0;
                }

            }); 
        } else {
            columns.push({
                dataIndex: 'TotalStories',
                text:'User Stories'
            },        
            {
                dataIndex: 'TotalDefects',
                text:'Defects'
            });
        }
                
        columns.push({
            dataIndex: 'AvgLeadTime',
            text:'Avg. Lead Time',
            summaryType: 'average',
            renderer: function(value){
                return Ext.Number.toFixed(value,2); 
            },
            exportRenderer: function(value){
                return value; 
            },            
            summaryRenderer: function(value, summaryData, dataIndex) {
                //me.overallSummaryData.AvgLeadTime = value;
                return me.overallSummaryData.AvgLeadTime; 
            }
        },
        {
            dataIndex: 'AvgReadyQueueTime',
            text:'Avg. Ready Queue Time',
            summaryType: 'average',
            renderer: function(value){
                return Ext.Number.toFixed(value,2); 
            },
            exportRenderer: function(value){
                return value; 
            },
            summaryRenderer: function(value, summaryData, dataIndex) {
                return me.overallSummaryData.AvgReadyQueueTime; 
            }
        },
        {
            dataIndex: 'AvgCycleTime',
            text:'Avg. Cycle Time',
            summaryType: 'average',
            renderer: function(value){
                return Ext.Number.toFixed(value,2); 
            },
            exportRenderer: function(value){
                return value; 
            },
            summaryRenderer: function(value, summaryData, dataIndex) {
                //me.overallSummaryData.AvgCycleTime = value;                
                return me.overallSummaryData.AvgCycleTime; 
            }
        },
        {
            dataIndex: 'AvgActiveCycleTime',
            text:'Avg. Active Cycle Time',
            summaryType: 'average',
            renderer: function(value){
                return Ext.Number.toFixed(value,2); 
            },
            exportRenderer: function(value){
                return value; 
            },
            summaryRenderer: function(value, summaryData, dataIndex) {
                return me.overallSummaryData.AvgActiveCycleTime;
            }
        },
        {
            dataIndex: 'AvgBlockTime',
            text:'Avg. Block Time',
            summaryType: 'average',
            renderer: function(value){
                return Ext.Number.toFixed(value,2); 
            },
            exportRenderer: function(value){
                return value; 
            },
            summaryRenderer: function(value, summaryData, dataIndex) {
                return me.overallSummaryData.AvgBlockTime;
            }
        },
        {
            dataIndex: 'AvgReadyTime',
            text:'Avg. Ready to Pull Time',
            summaryType: 'average',
            renderer: function(value){
                return Ext.Number.toFixed(value,2); 
            },
            exportRenderer: function(value){
                return value; 
            },
            summaryRenderer: function(value, summaryData, dataIndex) {
                return me.overallSummaryData.AvgReadyTime;
            }
        });


        return columns;
    },


    _setDefaultStateValues: function(cyt_params){
        var me = this;
        me.defaultStates.Artifact = cyt_params.artifactType;

        if(cyt_params.artifactType == "User Story & Defect"){
            me.defaultStates.UserStoryAndDefect.WorkflowState = cyt_params.cycleStateField;
            me.defaultStates.UserStoryAndDefect.StateFrom = cyt_params.cycleStartState;
            me.defaultStates.UserStoryAndDefect.StateTo = cyt_params.cycleEndState;
            me.defaultStates.UserStoryAndDefect.ReadyQueueColumn = cyt_params.cycleReadyQueueState;
            me.defaultStates.UserStoryAndDefect.StartDate = cyt_params.startDate;
            me.defaultStates.UserStoryAndDefect.EndDate = cyt_params.endDate;
            me.defaultStates.UserStoryAndDefect.LastNWeeks = cyt_params.lastNWeeks;
            me.defaultStates.UserStoryAndDefect.LastNMonths = cyt_params.lastNMonths;
            me.defaultStates.UserStoryAndDefect.Projects = cyt_params.projects;
        }else {
            me.defaultStates[cyt_params.artifactType].WorkflowState = cyt_params.cycleStateField;
            me.defaultStates[cyt_params.artifactType].StateFrom = cyt_params.cycleStartState;
            me.defaultStates[cyt_params.artifactType].StateTo = cyt_params.cycleEndState;
            me.defaultStates[cyt_params.artifactType].ReadyQueueColumn = cyt_params.cycleReadyQueueState;
            me.defaultStates[cyt_params.artifactType].StartDate = cyt_params.startDate;
            me.defaultStates[cyt_params.artifactType].EndDate = cyt_params.endDate;
            me.defaultStates[cyt_params.artifactType].LastNWeeks = cyt_params.lastNWeeks;
            me.defaultStates[cyt_params.artifactType].LastNMonths = cyt_params.lastNMonths;
            me.defaultStates[cyt_params.artifactType].Projects = cyt_params.projects;
        }
    },

    _queryStatePreference: function(){
        var deferred = Ext.create('Deft.Deferred');

        // Load the existing states. if none, create a new one with the defaults.
        this._queryPreferences().then({
            scope:this,
            success: function(records){
                if(records.length > 0){
                    this.statePreference = records && records[0];
                    this.defaultStates = records && records[0] && JSON.parse(records[0].get('Value'));
                    deferred.resolve(this.statePreference);
                }else{
                    this._createPreference('cycletime-summary-states-xxx',JSON.stringify(this.defaultStates)).then({
                        scope:this,
                        success: function(result){
                            deferred.resolve(result);
                        }
                    });
                }
            }
        });
        return deferred.promise;

        // update states
    },


    _queryPreferences: function(){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        var wsapiConfig = {
            model: 'Preference',
            fetch: ['Name','Value','CreationDate','ObjectID'],
            filters: [ { property: 'Name', operator: 'contains', value: 'cycletime-summary-states-xxx' } ],
            sorters: [{property:'CreationDate', direction:'ASC'}],
        };
        this._loadWsapiRecords(wsapiConfig).then({
            scope: this,
            success: function(records) {
                //console.log('Preference recs>>',records);
                deferred.resolve(records);
            },
            failure: function(error_message){
                alert(error_message);
            }
        }).always(function() {
            me.setLoading(false);
        });
        return deferred.promise;
    },

    _loadWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        var default_config = {
            model: 'Defect',
            fetch: ['ObjectID']
        };
        //this.logger.log("Starting load:",config.model);
        Ext.create('Rally.data.wsapi.Store', Ext.Object.merge(default_config,config)).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(records);
                } else {
                    //me.logger.log("Failed: ", operation);
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });

        return deferred.promise;
    },

    _createPreference: function(name,value) {
       var deferred = Ext.create('Deft.Deferred');
       Rally.data.ModelFactory.getModel({
           type: 'Preference',
           success: function(model) {
               var pref = Ext.create(model, {
                   Name: name,
                   Value: value,
                   User: Rally.getApp().getContext().getUser()._ref,
                   Project: null
               });

               pref.save({
                   callback: function(preference, operation) {
                       if(operation.wasSuccessful()) {
                            console.log('Preference Created>>',preference);
                            this.statePreference = preference;
                            this.defaultStates = JSON.parse(preference.get('Value'));
                            deferred.resolve(preference);
                       }
                   }
               });
            }
        });

        return deferred.promise;
    },


    _updatePreference: function(id) {
       var me = this;
       var deferred = Ext.create('Deft.Deferred');
       Rally.data.ModelFactory.getModel({
           type: 'Preference',
           scope:me,
           success: function(model) {
               model.load(id, {
                    scope: me,
                    success: function(preference, operation) {
                       if(operation.wasSuccessful()) {
                            console.log('Preference>>',preference);
                            preference.set('Value',JSON.stringify(me.defaultStates));
                            preference.save({
                                scope:me,
                                success:function(preference){
                                    console.log('Preference Updated>>',preference);
                                    me.statePreference = preference;
                                    me.defaultStates = JSON.parse(preference.get('Value'));
                                    deferred.resolve(preference);
                                }
                            })
                       }
                   }
               });
            }
        });

        return deferred.promise;
    },



    getQueryFilter: function(){
        var filter = this.getSetting('queryFilter');
        if (filter && filter.length > 0){
            return Rally.data.wsapi.Filter.fromQueryString(filter);
        }
        return null;
    },
    getIncludeBlocked: function(){
       return true;
       //return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.showBlocked || false;
       // return this.includeBlocked.pressed;

    },
    getIncludeReady: function(){
        return true;
       //return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.showReady || false;
       // return this.includeReady.pressed;
    },
    getFromStateCombo: function(){
        return this.cycleTimeFromState;
        //return this.down('#cb-fromState');
    },
    getToStateCombo: function(){
        return this.cycleTimeToState;
        //return this.down('#cb-toState');
    },
    getArtifactType: function(){
        return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.artifactType || null;
    },    
    getToStateValue: function(){
        return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.cycleEndState || null;
    },
    getFromStateValue: function(){
        return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.cycleStartState || null;
    },

    getSelectedProjects: function(){
        return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.projects || null;
    },

    getSelectedProjectOids: function(){
        var me = this;
        var projects_refs =  [];
        Ext.Array.each(this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.projects, function(project){
            projects_refs.push(Rally.util.Ref.getOidFromRef(project));
        });
        //adding the backlog project to the list if its a Defect.
        if(me.getArtifactType() == 'Defect'){
            projects_refs.push(Rally.util.Ref.getOidFromRef(me.getSetting('defectBacklogProject')))
        }
        //console.log('getSelectedProjectOids >>>',projects_refs);
        return projects_refs;
    },

    getLastNMonths: function(){
        return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.lastNMonths || null;
    },

    getReqdyQueueStateValue: function(){
        return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.cycleReadyQueueState || null;
    },
    getStateField: function(){
        return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.cycleStateField || null;
        //return this.cycleTimeField;
    },
    getModelNames: function(){
        return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.modelNames || ['HierarchicalRequirement','Defect'];
    },
    getSelectorBox: function(){
        return this.down('#selector_box');
    },
    getGridBox: function(){
        return this.down('#grid_box');
    },
    getSettingsFields: function(){
        return CArABU.technicalservices.CycleTimeData.Settings.getFields(this.getSettings());
    },
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        // Ext.apply(this, settings);
        this.addSelectors();
    }
});
