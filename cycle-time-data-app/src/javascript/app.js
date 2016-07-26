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
            precision: 2
        }
    },

    launch: function() {
       this.logger.log('Settings', this.getSettings());

       this.addCycleTimeSelectors();
    },
    addCycleTimeSelectors: function(){

        CArABU.technicalservices.CycleTimeCalculator.precision = this.getSetting('precision');
        CArABU.technicalservices.CycleTimeCalculator.granularity = this.getSetting('granularity');

        var box = this.getSelectorBox();
        box.removeAll();

        //Todo add selectors here
        var cb = box.add({
            xtype: 'rallycycletimefieldcombobox',
            modelNames: this.getModelNames(),
            itemId: 'cb-StateField',
            fieldLabel: "Cycle Time Field",
            labelAlign: 'right',
            margin: 10,
            context: this.getContext()

        });

        box.add({
            xtype: 'rallyfieldvaluecombobox',
            itemId: 'cb-fromState',
            allowBlank: true,
            allowNoEntry: true,
            fieldLabel: 'From',
            labelAlign: 'right',
            labelWidth: 50,
            noEntryText: '-- Creation --',
            model: this.getModelNames()[0] || 'HierarchicalRequirement',
            field: "Name",
            margin: 10,
            disabled: true
        });

        box.add({
            xtype: 'rallyfieldvaluecombobox',
            itemId: 'cb-toState',
            fieldLabel: 'to',
            labelWidth: 15,
            labelAlign: 'center',
            allowBlank: false,
            model: this.getModelNames()[0] || 'HierarchicalRequirement',
            field: "Name",
            margin: '10 25 10 0',
            disabled: true
        });

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

        cb.on('select', this.updateStateDropdowns, this);
        cb.on('ready', this.updateStateDropdowns, this);
        cb.on('render', this.updateStateDropdowns, this);
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
        this.logger.log('updateStateDropdowns', cb.getValue());

        this.getFromStateCombo().setDisabled(true);
        this.getToStateCombo().setDisabled(true);

        if (!cb || !cb.getValue()){
            return;
        }

        this.getFromStateCombo().refreshStore(cb.getValue());
        this.getToStateCombo().refreshStore(cb.getValue());

        this.getToStateCombo().setDisabled(false);
        this.getFromStateCombo().setDisabled(false);

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
    buildExportDataStore: function(fetchList){
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.artifact.Store',{
            models: this.getModelNames(),
            fetch: fetchList,
            filters: this.getQueryFilter(), //todo add gridboard filters
            limit: Infinity
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
        return deferred;
    },
    buildCurrentDataStore: function(){
        var fetchList = this.getCurrentFetchList();
        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: this.getModelNames(),
            enableHierarchy: false,
            filters: this.getQueryFilter(),
            fetch: fetchList
        }).then({
            success: this.buildGrid,
            scope: this
        });
    },
    getStateValueArray: function(){
        var arr = _.map(this.getFromStateCombo().getStore().getRange(), function(r){
            return r.get('value');
        });
        return arr;
    },
    fetchHistoricalData: function(store, nodes, records, success){
        var deferred = Ext.create('Deft.Deferred');
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
        });
        return deferred;

    },
    updateHistoricalData: function(updatedRecords){
        this.logger.log('updateHistoricalData', updatedRecords);
    },
    getHistoricalDataColumns: function(){

        var columns = [{
            xtype: 'cycletimetemplatecolumn',
            text: Ext.String.format("Cycle time from {0} to {1} ({2}s)", this.getFromStateCombo().getValue(), this.getToStateCombo().getValue(), CArABU.technicalservices.CycleTimeCalculator.granularity)
        }];

        if (this.getIncludeBlocked()){
            columns.push({
                xtype: 'timetemplatecolumn',
                dataType: 'timeInStateData',
                stateName: "Blocked",
                text: Ext.String.format("Time in Blocked ({0}s)",CArABU.technicalservices.CycleTimeCalculator.granularity)
            });
        }
        if (this.getIncludeReady()){
            columns.push({
                xtype: 'timetemplatecolumn',
                dataType: 'timeInStateData',
                stateName: 'Ready',
                text: Ext.String.format("Time in Ready ({0}s)",CArABU.technicalservices.CycleTimeCalculator.granularity)
            });
        }


        Ext.Array.each(this.getFromStateCombo().getStore().getRange(), function(s){
            var state = s.get('value');
            columns.push({
                xtype: 'timetemplatecolumn',
                dataType: 'timeInStateData',
                stateName: this.getStateField().getValue(),
                stateValue: state,
                text: Ext.String.format("Time in {0} ({1}s)", state || "[No State]", CArABU.technicalservices.CycleTimeCalculator.granularity)
            });
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
        var fetchList = this.getCurrentFetchList();  //todo add gridboard fields

        this.buildExportDataStore(fetchList).then({
            success: function(updatedRecords){
                this.logger.log('buildExportDataStore success', updatedRecords);
                this.saveExportFiles(updatedRecords, fetchList, includeTimestamps, includeSummary)
            },
            failure: this._showErrorStatus,
            scope: this
        });

    },
    saveExportFiles: function(updatedRecords, fetchList, includeTimestamps, includeSummary){

        if (includeSummary){
            var filename = Ext.String.format("cycle-time-{0}.csv", Rally.util.DateTime.format(new Date(), 'Y-m-d-h-i-s')),
                csv = this.getExportSummaryCSV(updatedRecords, fetchList);
            this.logger.log('saveExportFiles', csv, filename);
            CArABU.technicalservices.Exporter.saveCSVToFile(csv, filename);
        }

        if (includeTimestamps){
            var filename = Ext.String.format("time-in-state-{0}.csv", Rally.util.DateTime.format(new Date(), 'Y-m-d-h-i-s')),
                timeStampCSV = this.getExportTimestampCSV(updatedRecords);
            this.logger.log('saveExportFiles', timeStampCSV);
            CArABU.technicalservices.Exporter.saveCSVToFile(timeStampCSV, filename);
        }

    },
    getExportTimestampCSV: function(updatedRecords){
        return CArABU.technicalservices.CycleTimeCalculator.getExportTimestampCSV(updatedRecords);
    },
    getExportSummaryCSV: function(updatedRecords, fetchList){
        var states = this.getStateValueArray(),
            includeBlocked = this.getIncludeBlocked(),
            includeReady = this.getIncludeReady(),
            headers = fetchList.concat(['CycleTime (Days)']);

        if (includeBlocked){
            headers.push('Time in Blocked');
        }
        if (includeReady){
            headers.push('Time in Ready');
        }
        headers = headers.concat(states);

        var csv = [headers.join(',')];
        for (var i = 0; i < updatedRecords.length; i++){
            var row = [],
                record = updatedRecords[i];

            for (var j = 0; j < fetchList.length; j++){
                row.push(record.get(fetchList[j]) || "");
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
                row.push(CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(timeInStateData, states[s], record.get(states[s]), ""));
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
                    filters: this.getQueryFilter()
                },
                columnCfgs: this.getColumnCfgs(),
                derivedColumns: this.getHistoricalDataColumns()
            },
            height: this.getHeight()
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
                    }
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
        return [];
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
