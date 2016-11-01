 Ext.define("cycle-time-data-app", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),

    defaults: {
        margin: 10,
        labelAlign: 'right'
    },

    instructions: 'Please click the Filter icon <div class="icon-filter"></div> to define filters for the current data set to calculate historical cycle time data for.<br/>Please click the Cycle Time button <div class="icon-history"></div> to add criteria for calculating cycle time.  <br/>After parameters have been selected, click <div class="icon-refresh"></div><b>Update</b> to load the data.<br/><br/>If a Cycle Time State, Cycle Time State From and To are not defined, Cycle Time data will not be calculated.  <br/>Cycle End Date From and To are optional.  If Cycle End Date From and To are selected, then only artifacts that transitioned into or past the Cycle Time To State during the selected date range will be displayed. <br/><br/>More detailed app information can be found in the <a href="https://github.com/RallyTechServices/cycle-time-apps-2.1/blob/master/cycle-time-data-app/README.md" target="_blank">Github README file here</a> ',

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
        name : "cycle-time-data-app"
    },

    config: {
        defaultSettings: {
          //  includeTypes:  ['HierarchicalRequirement','Defect'],
            artifactType: 'HierarchicalRequirement',
            queryFilter: "",
            granularity: 'day',
            precision: 2,
            exportLimit: 1000
        }
    },
    exportDateFormat: 'm/d/Y h:i:s',
    _gridConfig: {},

    launch: function() {
       this.logger.log('Launch Settings', this.getSettings());
       this.addSelectors()
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

        var fp = this.getSelectorBox().add({
            xtype: 'fieldpickerbutton',
            modelNames: this.getModelNames(),
            context: this.getContext(),
            stateful: true,
            stateId: 'grid-columns'
        });
        fp.on('fieldsupdated', this.updateGridFields, this);

        var filter = this.getSelectorBox().add({
            xtype: 'rallyinlinefilterbutton',
            modelNames: this.getModelNames(),
            context: this.getContext(),
            margin: '3 9 0 0',
            stateful: true,
            stateId: 'grid-filters-1',
            listeners: {
                inlinefilterready: this.addInlineFilterPanel,
                inlinefilterchange: this.updateGridFilters,
                scope: this
            }
        });


        var ctButton = this.getSelectorBox().add({
            xtype: 'cycletimepickerbutton',
            modelNames: this.getModelNames(),
            context: this.getContext(),
            margin: '3 9 0 0',
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
                click: this.showExportMenu,
                scope: this
            }
        });
        this.getSelectorBoxRight().add({
            xtype: 'rallybutton',
            iconCls: 'icon-help',
            cls: 'help-button',
            margin: '0 9 0 25',
            listeners: {
                click: this.showInstructionsDialog,
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
    showExportMenu: function(button){
         var menu = Ext.widget({
             xtype: 'rallymenu',
             items: [
             {
                 text: 'Export Summary...',
                 handler: function(){
                     this.exportData(false,true);
                 },
                 scope: this
             },{
                 text: 'Export with Timestamps...',
                 handler: function(){
                     this.exportData(true,false);
                 },
                 scope: this
             },{
                 text: 'Export Summary and Timestamps...',
                 handler: function(){
                     this.exportData(true, true);
                 },
                 scope: this
             }
            ]
         });
         menu.showBy(button.getEl());
         if(button.toolTip) {
             button.toolTip.hide();
         }
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

         CArABU.technicalservices.CycleTimeCalculator.startDate = this.getStartDate();
         CArABU.technicalservices.CycleTimeCalculator.endDate = this.getEndDate();
         CArABU.technicalservices.CycleTimeCalculator.precision = this.getSetting('precision');
         CArABU.technicalservices.CycleTimeCalculator.granularity = this.getSetting('granularity');

         this.getGridBox().removeAll();
         this.updateMessageBox();
         this.setUpdateButtonUpdateable(false);
         this.setLoading('Loading Current Data...');

         this.fetchWsapiArtifactData().then({
             success: this.buildCycleGrid,
             failure: this.showErrorNotification,
             scope: this
         }).always(function(){ this.setLoading(false);}, this);
     },
     buildCycleGrid: function(records){
        this.logger.log('buildCycleGrid', records);

         if (records && records.length > 0){
             if (this.calculateCycleTime()){
                 this.setLoading('Loading Historical data...')
                 this.fetchHistoricalData(records).then({
                     success: this.addGrid,
                     failure: this.showErrorNotification,
                     scope: this
                 }).always(function(){ this.setLoading(false);}, this);
             } else {
                 this.addGrid(records);
             }
         } else {
             //there's a message, the need to refine the data.
         }
     },
     addGrid: function(records){
         this.logger.log('addGrid', records.length);
         var fields = records.length > 0 && records[0].getFields() || undefined;

         this.suspendLayouts();
         var store = Ext.create('Rally.data.custom.Store',{
             data: records,
             fields: fields,
             pageSize: 25 //records.length
         });

         this.getGridBox().add({
             xtype: 'rallygrid',
             store: store,
             columnCfgs: this.getColumnCfgs(records[0]),
             showPagingToolbar: true,
             scroll: 'vertical',
             emptyText:  '<div class="no-data-container"><div class="secondary-message">No data was found for the selected current filters, cycle time parameters and project scope.</div></div>'
         });
         this.resumeLayouts(true);
     },
     fetchWsapiArtifactData: function(){
         var deferred = Ext.create('Deft.Deferred');
         Ext.create('Rally.data.wsapi.artifact.Store',{
            models: this.getModelNames(),
            limit: this.getExportLimit(),
            fetch: this.getCurrentFetchList(),
            filters: this.getWsapiArtifactFilters(),
            pageSize: Math.min(this.getExportLimit(), 1000)
        }).load({
             callback: function(records, operation){
                 this.logger.log('fetchWsapiArtifactData', records.length, operation, records);
                 if (operation.wasSuccessful()){
                     var count =  operation && operation.resultSet && operation.resultSet.total;
                     this.logger.log('count', count, this.getExportLimit());
                     if (count > this.getExportLimit()){
                         this.updateMessageBox(Ext.String.format('A total of {0} current records were found, but only {1} can be fetched for performance reasons.  Please refine the advanced filters (current, not Cycle Time) to fetch less data.',count,this.getExportLimit()), Rally.util.Colors.brick);
                        deferred.resolve(null);
                     } else {
                         this.updateMessageBox(Ext.String.format('{0} current records found.', count));
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
               // console.log('s',stateFieldName, s);
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

        }
        filters = filters || [];
        this.logger.log('getWsapiArtifactFilters', filters.toString());
        return filters;
    },
     getStartDate: function(){
        if (this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.startDate){
        //if (this.startDatePicker.getValue()){
            return this._gridConfig.cycleTimeParameters.startDate;
            //return Rally.util.DateTime.toIsoString(this._gridConfig.cycleTimeParameters.startDate);
        }
        return null;
    },
    getEndDate: function(){
        if (this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.endDate){
        //if (this.endDatePicker.getValue()){
            return this._gridConfig.cycleTimeParameters.endDate;
            //return Rally.util.DateTime.toIsoString(this._gridConfig.cycleTimeParameters.endDate);
        }
        return null;
    },
    getCycleStates: function(){
        return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.cycleStates || [];
    },
    getGridColumns: function(){
        return this.down('fieldpickerbutton') && this.down('fieldpickerbutton').getFields();
        //return this._gridConfig && this._gridConfig.fields || [];
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
        var fetch = Ext.Array.merge(this.getGridColumns(), ['ObjectID']);
        if (this.getStateField()){
            Ext.Array.merge(this.getStateField(), fetch);
        }
        if (this.getIncludeBlocked()){
            Ext.Array.merge('Blocked', fetch);
        }
        if (this.getIncludeReady()){
            Ext.Array.merge(fetch, 'Ready');
        }
        this.logger.log('getCurrentFetchList', fetch);
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
                stateValues = this.getCycleStates();

            this.logger.log('stateValues', stateValues);
            Ext.create('CArABU.technicalservices.CycleTimeDataStore', {
                stateField: stateField,
                stateValues: stateValues,
                includeReady: includeReady,
                includeBlocked: includeBlocked,
                fromState: fromState,
                toState: toState,
                startDate: this.getStartDate(),
                endDate: this.getEndDate()
            }).load(records).then({
                success: function (updatedRecords) {

                   this.updateMessageBox(Ext.String.format("Displaying {0} of {1} records with relevant cycle time data.", updatedRecords.length, records.length));

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
        return Ext.String.format("Cycle time from {0} to {1} ({2}s)", this.getFromStateValue(), this.getToStateValue(), CArABU.technicalservices.CycleTimeCalculator.granularity);
    },
    getCycleTimeStartColumnHeader: function(){
        return "Cycle Time Start Date";
    },
    getCycleTimeEndColumnHeader: function(){
        return "Cycle Time End Date";
    },
    getTimeInStateColumnHeader: function(stateName){
        return Ext.String.format("Time in {0} ({1}s)",stateName || "[No State]", CArABU.technicalservices.CycleTimeCalculator.granularity);
    },
    getHistoricalDataColumns: function(){


        var columns = [],
            toState = this.getToStateValue(),
            fromState = this.getFromStateValue();

        if (fromState && toState){
            columns.push({
                xtype: 'cycletimetemplatecolumn',
                text: this.getCycleTimeColumnHeader(),
                flex: 1
            });
        }


        if (this.getIncludeBlocked()){
            columns.push({
                xtype: 'timetemplatecolumn',
                dataType: 'timeInStateData',
                stateName: "Blocked",
                text: this.getTimeInStateColumnHeader("Blocked"),
                flex: 1
            });
        }
        if (this.getIncludeReady()){
            columns.push({
                xtype: 'timetemplatecolumn',
                dataType: 'timeInStateData',
                stateName: 'Ready',
                text: this.getTimeInStateColumnHeader("Ready"),
                flex: 1
            });
        }


        if (fromState && toState){
            Ext.Array.each( this.getCycleStates(), function(s){

                var header = this.getTimeInStateColumnHeader(s);
                //if (s === CArABU.technicalservices.CycleTimeCalculator.creationDateText){
                //    header =  this.getTimeInStateColumnHeader(CArABU.technicalservices.CycleTimeCalculator.noStateText);
                //}
                columns.push({
                    xtype: 'timetemplatecolumn',
                    dataType: 'timeInStateData',
                    stateName: this.getStateField(),
                    stateValue: s,
                    text: header,
                    flex: 1
                });
                if (s === toState){ return false; }
            }, this);
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

    exportData: function(includeTimestamps, includeSummary){
        var grid = this.down('rallygrid');
        if (!grid){
            this.showErrorNotification("Cannot save export becuase there is no data displapyed to export.");
            return;
        }
        var totalCount= grid.getStore().getTotalCount();
        this.logger.log('exportData', totalCount);

        var store = grid.getStore();

        this.getMessageBox().setLoading("Preparing Export File(s)...");
        store.load({
            pageSize: totalCount,
            limit: totalCount,
            callback: function(records, operation){
                this.getMessageBox().setLoading(false);
                if (operation.wasSuccessful()){
                    var columns = this.getColumnCfgs(records && records[0]);
                    this.saveExportFiles(records, columns, includeTimestamps, includeSummary);
                } else {
                    this.logger.log('Error preparing export data', operation);
                    Rally.ui.notify.Notifier.showError('Error preparing export data:  ' + operation && operation.error && operation.error.errors.join(','));
                }

            },
            scope: this
        });
    },
    saveExportFiles: function(updatedRecords, columns, includeTimestamps, includeSummary){

        if (includeSummary){
            var filename = Ext.String.format("cycle-time-{0}.csv", Rally.util.DateTime.format(new Date(), 'Y-m-d-h-i-s')),
                csv = this.getExportSummaryCSV(updatedRecords, columns);
           // this.logger.log('saveExportFiles', csv, filename);
            CArABU.technicalservices.Exporter.saveCSVToFile(csv, filename);
        }
        if (includeTimestamps){
            var filename = Ext.String.format("time-in-state-{0}.csv", Rally.util.DateTime.format(new Date(), 'Y-m-d-h-i-s')),
                timeStampCSV = this.getExportTimestampCSV(updatedRecords);
           // this.logger.log('saveExportFiles', timeStampCSV);
            CArABU.technicalservices.Exporter.saveCSVToFile(timeStampCSV, filename);
        }
    },
    getExportTimestampCSV: function(updatedRecords){
        return CArABU.technicalservices.CycleTimeCalculator.getExportTimestampCSV(updatedRecords, this.exportDateFormat);
    },
    getExportSummaryCSV: function(updatedRecords, columns){
        var standardColumns = _.filter(columns, function(c){ return c.dataIndex || null; }),
            headers = _.map(standardColumns, function(c){ if (c.text === "ID") {return "Formatted ID"; } return c.text; }),
            fetchList = _.map(standardColumns, function(c){ return c.dataIndex; });

        this.logger.log('getExportSummaryCSV', headers, fetchList);
        var states = this.getCycleStates(),
            stateField = this.getStateField(),
            includeBlocked = this.getIncludeBlocked(),
            includeReady = this.getIncludeReady();

        headers.push(this.getCycleTimeColumnHeader());
        headers.push(this.getCycleTimeStartColumnHeader());
        headers.push(this.getCycleTimeEndColumnHeader());

        if (includeBlocked){
            headers.push(this.getTimeInStateColumnHeader("Blocked"));
        }
        if (includeReady){
            headers.push(this.getTimeInStateColumnHeader("Ready"));
        }

        Ext.Array.each(states, function(state){
            //if (state === CArABU.technicalservices.CycleTimeCalculator.creationDateText){
            //    headers.push(this.getTimeInStateColumnHeader(CArABU.technicalservices.CycleTimeCalculator.noStateText));
            //} else {
                headers.push(this.getTimeInStateColumnHeader(state));
            //}

        }, this);

        var csv = [headers.join(',')],
            dateFormat = this.exportDateFormat;

        for (var i = 0; i < updatedRecords.length; i++){
            var row = [],
                record = updatedRecords[i];

            for (var j = 0; j < fetchList.length; j++){
                var val = record.get(fetchList[j]);
                if (Ext.isObject(val)){
                    val = val._refObjectName;
                }
                row.push(val || "");
            }
            //CycleTime
            var timeInStateData = record.get('timeInStateData');

            row.push(record.get('cycleTimeData') && record.get('cycleTimeData').cycleTime || "");

            var startDate = record.get('cycleTimeData') && record.get('cycleTimeData').startDate || null,
                endDate = record.get('cycleTimeData') && record.get('cycleTimeData').endDate || null;
        
            var formattedStart = startDate && Rally.util.DateTime.format(startDate,dateFormat) || "",
                formattedEnd = endDate && Rally.util.DateTime.format(endDate,dateFormat) || "";

            row.push(formattedStart);
            row.push(formattedEnd);

            if (includeBlocked){
                row.push(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(timeInStateData, "Blocked",null,""));
            }
            if (includeReady){
                row.push(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(timeInStateData, "Ready",null, ""));
            }

            for (var s = 0; s < states.length; s++){
                row.push(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(timeInStateData[stateField], states[s], record.get(states[s]), ""));
            }

            row = _.map(row, function(v){ return Ext.String.format("\"{0}\"", v.toString().replace(/"/g, "\"\""));});
            csv.push(row.join(","));
        }
        return csv.join("\r\n");
    },
    getQueryFilter: function(){
        var filter = this.getSetting('queryFilter');
        if (filter && filter.length > 0){
            return Rally.data.wsapi.Filter.fromQueryString(filter);
        }
        return null;
    },
    getIncludeBlocked: function(){
        return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.showBlocked || false;
       // return this.includeBlocked.pressed;

    },
    getIncludeReady: function(){
        return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.showReady || false;
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
    getToStateValue: function(){
        return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.cycleEndState || null;
    },
    getFromStateValue: function(){
        return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.cycleStartState || null;
    },
    getStateField: function(){
        return this._gridConfig && this._gridConfig.cycleTimeParameters && this._gridConfig.cycleTimeParameters.cycleStateField || null;
        //return this.cycleTimeField;
    },
    getModelNames: function(){
        var modelNames = this.getSetting('artifactType'); //includeTypes');

        //if (Ext.isString(modelNames)){
        //    modelNames = modelNames.split(',');
        //    return modelNames;
        //}
        this.logger.log('getModelNames', modelNames);
        return [modelNames] || [];
    },
    getSelectorBox: function(){
        return this.down('#selector_box');
    },
    getGridBox: function(){
        return this.down('#grid_box');
    },
    getSettingsFields: function(){
        return CArABU.technicalservices.CycleTimeData.Settings.getFields(this.getModelNames());
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
