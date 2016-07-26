Ext.define("cycle-time-data-app", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),

    defaults: {
        margin: 10,
        labelAlign: 'right'
    },

    items: [
        {xtype:'container',itemId:'selector_box', layout: 'hbox'},
        {xtype:'container',itemId:'grid_box'}
    ],

    integrationHeaders : {
        name : "cycle-time-data-app"
    },

    config: {
        defaultSettings: {
            includeTypes:  ['hierarchicalrequirement','defect'],
            queryFilter: "",
            granularity: 'day',
            precision: 2,
            exportLimit: 1000
        }
    },


    launch: function() {
       this.logger.log('Settings', this.getSettings());

       this.addCycleTimeSelectors();
    },
    isCycleTimeField: function(field){
        var whitelistFields = ['State','ScheduleState'];
        if (Ext.Array.contains(whitelistFields, field.name)){
            return true;
        }

        if (field.readOnly){
            return false;
        }

        var allowed_attribute_types = ['STATE','STRING'],
            attributeDef = field && field.attributeDefinition;
        if (attributeDef){
            if ( attributeDef.Constrained && Ext.Array.contains(allowed_attribute_types, attributeDef.AttributeType)) {
                return true;
            }
        }
        return false;
    },
    addCycleTimeSelectors: function(){

        CArABU.technicalservices.CycleTimeCalculator.precision = this.getSetting('precision');
        CArABU.technicalservices.CycleTimeCalculator.granularity = this.getSetting('granularity');

        var box = this.getSelectorBox();
        box.removeAll();
        this.getGridBox().removeAll();

        this.logger.log('addCycleTimeSelectors', this.getModelNames());
        var cb = box.add({
            xtype: 'rallyfieldcombobox',
            model: this.getModelNames()[0],
            itemId: 'cb-StateField',
            fieldLabel: "Cycle Time Field",
            labelAlign: 'right',
            margin: 10,
            context: this.getContext(),
            _isNotHidden: this.isCycleTimeField
        });

        cbFrom = box.add({
            xtype: 'rallycombobox',
            itemId: 'cb-fromState',
            allowBlank: true,
            allowNoEntry: true,
            noEntryText: '-- Creation --',
            noEntryValue: '-- Creation --',
            fieldLabel: 'From',
            labelAlign: 'right',
            labelWidth: 50,
            margin: 10,
            store: Ext.create('Rally.data.custom.Store', {data: []}),
            disabled: true,
            valueField: 'value',
            displayField: 'value'
        });

        box.add({
            xtype: 'rallycombobox',
            itemId: 'cb-toState',
            fieldLabel: 'to',
            labelWidth: 15,
            labelAlign: 'center',
            allowBlank: false,
            margin: '10 25 10 0',
            disabled: true,
            store: Ext.create('Rally.data.custom.Store', {data: []}),
            valueField: 'value',
            displayField: 'value'
        });

        cbFrom.on('select', this.updateToState, this);

        var btBlocked = box.add({
            xtype: 'rallybutton',
            enableToggle: true,
            itemId: 'btBlocked',
            margin: '10 5 10 5',
            cls: 'secondary rly-small',
            iconCls: 'icon-blocked',
            pressed: false,
            toolTipText: "Calculate time in Blocked state"

        });

        var btReady = box.add({
            xtype: 'rallybutton',
            enableToggle: true,
            itemId: 'btReady',
            margin: '10 25 10 5',
            iconCls: 'icon-ok',
            cls: 'secondary rly-small',
            pressed: false,
            toolTipText: "Calculate time in Ready state"
        });
        btBlocked.on('toggle', this.toggleButton, this);
        btReady.on('toggle', this.toggleButton, this);

        var bt = box.add({
            xtype: 'rallybutton',
            margin: 10,
            text: 'Go'
        });

        if (cb && cb.getValue()){
            this.updateStateDropdowns(cb);
        }
        cb.on('ready', this.updateStateDropdowns, this);
        cb.on('select', this.updateStateDropdowns, this);
        bt.on('click', this.run, this);

    },
    toggleButton:  function(btn, state){
        this.logger.log('toggleButton', btn);

        if (state){
            btn.removeCls('secondary');
            btn.addCls('primary');
        } else {
            btn.removeCls('primary');
            btn.addCls('secondary');
        }
    },
    updateStateDropdowns: function(cb){

        this.logger.log('updateStateDropdowns', cb, cb.getValue(), cb.getRecord());

        this.getFromStateCombo().setDisabled(true);
        this.getToStateCombo().setDisabled(true);

        if (!cb || !cb.getValue() || !cb.getRecord()){
            return;
        }

        var model = cb.model;

        this.getFromStateCombo().setDisabled(false);

        var data = [];
        if (cb.getValue() !== "ScheduleState"){
            data.push({value: CArABU.technicalservices.CycleTimeCalculator.creationDateText });
        }
        model.getField(cb.getValue()).getAllowedValueStore().load({
            callback: function(records, operation){
                Ext.Array.each(records,function(r){
                    data.push({value: r.get('StringValue') });
                });
                var store = Ext.create('Rally.data.custom.Store',{
                    data: data
                });
                this.getFromStateCombo().bindStore(store);
            },
            scope: this
        });



    },
    updateToState: function(cbFrom){
        this.getToStateCombo().setDisabled(true);

        if (!cbFrom || !cbFrom.getValue() || !cbFrom.getRecord()){
            return;
        }

        var data = [],
            fromValue = cbFrom.getValue();
        Ext.Array.each(cbFrom.getStore().getRange(), function(d){
            if (fromValue === d.get('value') || data.length > 0){
                data.push(d.getData());
            }
        });
        this.getToStateCombo().setDisabled(false);
        this.getToStateCombo().bindStore(Ext.create('Rally.data.custom.Store',{ data: data}));

    },
    run: function(){
        this.logger.log('run');

        var box = this.getGridBox();
        box.removeAll();

        this.buildCurrentDataStore()
    },
    getCurrentFetchList: function(){
        var fetch = ['ObjectID', 'FormattedID', this.getStateField().getValue()];
        if (this.getIncludeBlocked()){
            fetch.push('Blocked');
        }
        if (this.getIncludeReady()){
            fetch.push('Ready');
        }
        return fetch;
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
    buildExportDataStore: function(fetchList){

        var filters = this.down('rallygridboard').currentCustomFilter &&
            this.down('rallygridboard').currentCustomFilter.filters &&
            this.down('rallygridboard').currentCustomFilter.filters[0] || null;

        this.logger.log('buildExportDataStore', fetchList, this.getQueryFilter(), filters && filters.toString() || "No custom filters");

        if (this.getQueryFilter()){
            if (filters){
                filters = filters.and(this.getQueryFilter());
            } else {
                filters = this.getQueryFilter();
            }
        }
        filters = filters || [];

        var deferred = Ext.create('Deft.Deferred');

        this.getWsapiArtifactCount({
            models: this.getModelNames(),
            filters: filters
        }).then({
            success: function(totalResultCount){
                if (totalResultCount > this.getExportLimit()){
                    Rally.ui.notify.Notifier.showWarning({
                        message: Ext.String.format("Only {0} of {1} records will be exported to maintain acceptable performance.  Please refine your filter criteria to export all records.", this.getExportLimit(), totalResultCount)
                    });
                }
                Ext.create('Rally.data.wsapi.artifact.Store',{
                    models: this.getModelNames(),
                    fetch: fetchList,
                    filters: filters || [],
                    limit: this.getExportLimit()
                }).load({
                    callback: function(records, operation){
                        this.logger.log('buildExportDataStore callback');
                        if (operation.wasSuccessful()){
                            this.fetchHistoricalData(null,null,records, true).then({
                                success: function(updatedRecords){
                                    deferred.resolve(updatedRecords);
                                },
                                failure: function(msg){
                                    deferred.reject(msg);
                                },
                                scope: this
                            });
                        } else {
                            deferred.reject("Error fetching historical data:  " + operation.error.errors.join(','));
                        }
                    },
                    scope: this
                });
            },
            failure: function(msg){
                deferred.resolve(msg);
            },
            scope: this
        });


        return deferred;
    },
    buildCurrentDataStore: function(){
        var fetchList = this.getCurrentFetchList();
        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: this.getModelNames(),
            enableHierarchy: false,
            filters: this.getQueryFilter() || [],
            fetch: fetchList
        }).then({
            success: this.buildGrid,
            scope: this
        });
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
    fetchHistoricalData: function(store, nodes, records, success){
        var deferred = Ext.create('Deft.Deferred');

        this.setLoading(Ext.String.format("Loading historical data for {0} artifacts.",records.length));
        this.logger.log('fetchHistoricalData', store, records, success);
        var includeBlocked = this.getIncludeBlocked(),
            includeReady = this.getIncludeReady(),
            fromState = this.getFromStateCombo().getValue(),
            toState = this.getToStateCombo().getValue(),
            stateField = this.getStateField().getValue(),
            stateValues = this.getStateValueArray()

        this.logger.log('stateValues', stateValues);
        Ext.create('CArABU.technicalservices.CycleTimeDataStore',{
            stateField: stateField,
            stateValues: stateValues,
            includeReady: includeReady,
            includeBlocked: includeBlocked,
            fromState: fromState,
            toState: toState
        }).load(records).then({
            success: function(updatedRecords){ deferred.resolve(updatedRecords); },
            failure: function(msg) { deferred.reject(msg); }
        }).always(function(){
            this.setLoading(false);
        }, this);
        return deferred;

    },
    updateHistoricalData: function(updatedRecords){
        this.logger.log('updateHistoricalData', updatedRecords);
    },
    getCycleTimeColumnHeader: function(){
        return Ext.String.format("Cycle time from {0} to {1} ({2}s)", this.getFromStateCombo().getValue(), this.getToStateCombo().getValue(), CArABU.technicalservices.CycleTimeCalculator.granularity);
    },
    getTimeInStateColumnHeader: function(stateName){
        return Ext.String.format("Time in {0} ({1}s)",stateName || "[No State]", CArABU.technicalservices.CycleTimeCalculator.granularity);
    },
    getHistoricalDataColumns: function(){

        var columns = [{
            xtype: 'cycletimetemplatecolumn',
            text: this.getCycleTimeColumnHeader(),
            flex: 1
        }];

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

        var toState = this.getToStateCombo().getValue();

        Ext.Array.each( this.getStateValueArray(), function(s){
            var header = this.getTimeInStateColumnHeader(s);
            if (s === CArABU.technicalservices.CycleTimeCalculator.creationDateText){
                header =  this.getTimeInStateColumnHeader(CArABU.technicalservices.CycleTimeCalculator.noStateText);
            }
            columns.push({
                xtype: 'timetemplatecolumn',
                dataType: 'timeInStateData',
                stateName: this.getStateField().getValue(),
                stateValue: s,
                text: header,
                flex: 1
            });
            if (s === toState){ return false; }
        }, this);

        return columns;
    },
    getColumnCfgs: function(){
        return [
            'FormattedID',
            'Name',
            'ScheduleState',
            'Owner',
            'PlanEstimate'
        ].concat(this.getHistoricalDataColumns());
    },

    exportData: function(includeTimestamps, includeSummary){
        this.logger.log('exportData');
        var columns = this.down('rallygridboard').getGridOrBoard().columns;

        var fetchList = _.map(_.filter(columns, function(c){ return c.dataIndex || false; }), function(c){
            return c.dataIndex;
        });

        this.buildExportDataStore(fetchList).then({
            success: function(updatedRecords){
                this.logger.log('buildExportDataStore success', updatedRecords);
                this.saveExportFiles(updatedRecords, columns, includeTimestamps, includeSummary)
            },
            failure: this._showErrorStatus,
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
        return CArABU.technicalservices.CycleTimeCalculator.getExportTimestampCSV(updatedRecords);
    },
    getExportSummaryCSV: function(updatedRecords, columns){
        var standardColumns = _.filter(columns, function(c){ return c.dataIndex || null; }),
            headers = _.map(standardColumns, function(c){ if (c.text === "ID") {return "Formatted ID"; } return c.text; }),
            fetchList = _.map(standardColumns, function(c){ return c.dataIndex; });

        this.logger.log('getExportSummaryCSV', headers, fetchList);
        var states = this.getStateValueArray(),
            stateField = this.getStateField().getValue(),
            includeBlocked = this.getIncludeBlocked(),
            includeReady = this.getIncludeReady();

        headers.push(this.getCycleTimeColumnHeader());
        if (includeBlocked){
            headers.push(this.getTimeInStateColumnHeader("Blocked"));
        }
        if (includeReady){
            headers.push(this.getTimeInStateColumnHeader("Ready"));
        }
        Ext.Array.each(states, function(state){
            if (state === CArABU.technicalservices.CycleTimeCalculator.creationDateText){
                headers.push(this.getTimeInStateColumnHeader(CArABU.technicalservices.CycleTimeCalculator.noStateText));
            } else {
                headers.push(this.getTimeInStateColumnHeader(state));
            }

        }, this);

        var csv = [headers.join(',')];
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
            row.push(record.get('cycleTimeData') && record.get('cycleTimeData').cycleTime || "");

            var timeInStateData = record.get('timeInStateData');
            if (includeBlocked){
                row.push(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(timeInStateData, "Blocked",null,""));
            }
            if (includeReady){
                row.push(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(timeInStateData, "Ready",null, ""));
            }

            for (var s = 0; s < states.length; s++){
                row.push(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(timeInStateData[stateField], states[s], record.get(states[s]), ""));
            }
            csv.push(row.join(",")); //TODO need to escape things
        }
        return csv.join("\r\n");
    },
    _showGreenStatus: function(msg){
        Rally.ui.notify.Notifier.show({message: msg})
    },
    _showStatus: function(msg){
        Rally.ui.notify.Notifier.show({message: msg, cls: 'status'})
    },
    _showErrorStatus: function(msg){
        Rally.ui.notify.Notifier.show({message: msg, cls: 'error'});
    },
    buildGrid: function(store){

        store.on('load', this.fetchHistoricalData, this);

        this.getGridBox().add({
            xtype: 'rallygridboard',
            context: this.getContext(),
            modelNames: this.getModelNames(),
            toggleState: 'grid',
            stateId: 'cycle-time-grid',
            plugins: [
                this.getFilterPlugin(),
                this.getFieldPickerPlugin(),
                this.getExportPlugin()
            ],
            gridConfig: {
                store: store,
                enableRanking: false,
                enableBulkEdit: false,
                folderSort: false,
                shouldShowRowActionsColumn: false,
                storeConfig: {
                    filters: this.getQueryFilter() || []
                },
                columnCfgs: this.getColumnCfgs(),
                derivedColumns: this.getHistoricalDataColumns()
            },
            height: this.getHeight(),
            width: "100%"
        });

    },
    getExportPlugin: function(){
        return {
            ptype: 'rallygridboardactionsmenu',
            menuItems: [
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
            ],
            buttonConfig: {
                iconCls: 'icon-export'
            }
        };
    },

    getFilterPlugin: function(){
        return {
            ptype: 'rallygridboardinlinefiltercontrol',
            inlineFilterButtonConfig: {
                stateful: true,
                stateId: this.getContext().getScopedStateId('ctd-filters'),
                modelNames: this.getModelNames(),
                inlineFilterPanelConfig: {
                    quickFilterPanelConfig: {
                        defaultFields: [
                            'ArtifactSearch',
                            'Owner',
                            'ModelType'
                        ]
                    }
                }
            }
        };
    },
    getFieldPickerPlugin: function(){
        return {
            ptype: 'rallygridboardfieldpicker',
            headerPosition: 'left',
            modelNames: this.getModelNames(),
            stateful: true,
            stateId: this.getContext().getScopedStateId('ctd-columns-1')
        };
    },
    getQueryFilter: function(){
        var filter = this.getSetting('queryFilter');
        if (filter && filter.length > 0){
            return Rally.data.wsapi.Filter.fromQueryString(filter);
        }
        return null;
    },
    getIncludeBlocked: function(){
        return this.down('#btBlocked').pressed;
    },
    getIncludeReady: function(){
        return this.down('#btReady').pressed;
    },
    getFromStateCombo: function(){
        return this.down('#cb-fromState');
    },
    getToStateCombo: function(){
        return this.down('#cb-toState');
    },
    getStateField: function(){
        return this.down('#cb-StateField');
    },
    getModelNames: function(){
        var modelNames = this.getSetting('includeTypes');
        this.logger.log('getModelNames', modelNames);

        if (Ext.isString(modelNames)){
            modelNames = modelNames.split(',');
            return modelNames;
        }
        return modelNames || [];
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
        this.addCycleTimeSelectors();
    }
});
