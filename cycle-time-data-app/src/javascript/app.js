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
            queryFilter: ""
        }
    },

    launch: function() {
       this.logger.log('Settings', this.getSettings());

       this.addCycleTimeSelectors();
    },
    addCycleTimeSelectors: function(){
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
            fieldLabel: 'From State',
            labelAlign: 'right',
            noEntryText: '-- Creation --',
            model: this.getModelNames()[0] || 'HierarchicalRequirement',
            field: "Name",
            margin: 10,
            disabled: true
        });

        box.add({
            xtype: 'rallyfieldvaluecombobox',
            itemId: 'cb-toState',
            fieldLabel: 'To State',
            labelAlign: 'right',
            allowBlank: false,
            model: this.getModelNames()[0] || 'HierarchicalRequirement',
            field: "Name",
            margin: 10,
            disabled: true
        });

        box.add({
            xtype: 'rallycheckboxfield',
            itemId: 'chk-includeBlocked',
            fieldLabel: 'Include Blocked Transitions',
            labelAlign: 'right'
        });

        box.add({
            xtype: 'rallycheckboxfield',
            itemId: 'chk-includeReady',
            fieldLabel: 'Include Ready Transitions',
            labelAlign: 'right'
        });

        var bt = box.add({
            xtype: 'rallybutton',
            margin: 10,
            text: 'Go'
        });

        cb.on('select', this.updateStateDropdowns, this);
        cb.on('ready', this.updateStateDropdowns, this);
        bt.on('click', this.run, this);
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
    buildCurrentDataStore: function(){

        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            models: this.getModelNames(),
            enableHierarchy: false,
            filters: this.getQueryFilter()
        }).then({
            success: this.buildGrid,
            scope: this
        });
    },
    fetchHistoricalData: function(store, nodes, records, success){
        this.logger.log('fetchHistoricalData', store, records, success);
        var includeBlocked = this.getIncludeBlocked().getValue(),
            includeReady = this.getIncludeReady().getValue(),
            fromState = this.getFromStateCombo().getValue(),
            toState = this.getToStateCombo().getValue(),
            stateValues = _.map(this.getFromStateCombo().getStore().getRange(), function(r){
                return r.get('value');
            }),
            stateField = this.getStateField().getValue();

        this.logger.log('stateValues', stateValues);
        Ext.create('CArABU.technicalservices.CycleTimeDataStore',{
            stateField: stateField,
            stateValues: stateValues,
            includeReady: includeReady,
            includeBlocked: includeBlocked
        }).load(records).then({
            success: this.updateHistoricalData,
            failure: function(message){},
            scope: this
        });

    },
    updateHistoricalData: function(updatedRecords){
        this.logger.log('updateHistoricalData', updatedRecords);
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
                this.getFieldPickerPlugin()
            ],
            gridConfig: {
                store: store,
                enableRanking: false,
                enableBulkEdit: false,
                shouldShowRowActionsColumn: false,
                storeConfig: {
                    filters: this.getQueryFilter()
                },
                columnCfgs: [
                    'FormattedID',
                    'Name',
                    'ScheduleState',
                    'Owner',
                    'PlanEstimate'
                ]
            },
            height: this.getHeight()
        });

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
        return this.down('#chk-includeBlocked');
    },
    getIncludeReady: function(){
        return this.down('#chk-includeReady');
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
        if (Ext.isString(modelNames)){
            return [modelNames];
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
        this.addCycleTimeSelectors();
    }
});
