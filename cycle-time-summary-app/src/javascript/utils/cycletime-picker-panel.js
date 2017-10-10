Ext.define('CA.technicalservices.CycleTimePickerPanel', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.cycletimepickerpanel',

    cls: 'inline-filter-panel',
    flex: 1,
    header: false,
    minHeight: 46,
    padding: '8px 0 0 0',
    bodyPadding: '7px 5px 5px 5px',
    collapseDirection: 'top',
    collapsible: true,
    animCollapse: false,
    stateful: true,
    stateId: 'cycleTimePanel',

    constructor: function(config) {
        this.mergeConfig(config);
        this.callParent([this.config]);
    },

    initComponent: function() {
        this.callParent(arguments);

        if (!this.stateful || (this.stateful && !this._hasState())) {
            this.applyState({});
        }

    },
    _hasState: function(){
        if (this.stateful && this.stateId) {
            return !!Ext.state.Manager.get(this.stateId);
        }
        return false;
    },
    _loadModels: function(state){
        if (this.models){
            this._addItems(state);
            return;
        }

        if (this.context && this.modelNames && this.modelNames.length > 0){
            Rally.data.ModelFactory.getModels({
                types: this.modelNames,
                context: this.context,
                success: function(models){
                    this.models = models;
                    this._addItems(state);
                },
                scope: this
            });
        }
    },
    _addItems: function(state){
        if (!state){
            state = {};
        }

        this.removeAll();

        // this.add({
        //     xtype: 'rallybutton',
        //     cls: 'inline-filter-panel-close icon-cross',
        //     height: 18,
        //     userAction: 'Close (X) filter panel clicked',
        //     listeners: {
        //         click: function() {
        //             this.collapse();
        //         },
        //         scope: this
        //     }
        // });
        this.add({
            xtype: 'container',
            flex: 1,
            layout: 'hbox',
            items: [{
                xtype: 'rallyfieldcombobox',
                model: this.modelNames[0],
                itemId: 'cb-StateField',
                fieldLabel: "Workflow State",
                labelAlign: 'right',
                labelWidth: 150,
                width: 300,
                context: this.context,
                value: state.cycleStateField,
                _isNotHidden: this._isCycleTimeField
            }
            // ,{
            //     xtype: 'rallybutton',
            //     enableToggle: true,
            //     itemId: 'btBlocked',
            //     margin: '6 6 6 185',
            //     cls: state.showBlocked ? 'primary rly-small' : 'secondary rly-small',
            //     iconCls: 'icon-blocked',
            //     toolTipText: "Calculate time in Blocked state",
            //     pressed: state.showBlocked || false,
            //     listeners: {
            //         toggle: this._toggleButton,
            //         scope: this
            //     }
            // }, {
            //     xtype: 'rallybutton',
            //     enableToggle: true,
            //     itemId: 'btReady',
            //     margin: 6,
            //     iconCls: 'icon-ok',
            //     cls: state.showReady ? 'primary rly-small' : 'secondary rly-small',
            //     pressed: state.showReady || false,
            //     toolTipText: "Calculate time in Ready state",
            //     listeners: {
            //         toggle: this._toggleButton,
            //         scope: this
            //     }
            // }
            ]
        });

        var fromStates = [],
            toStates = [];

        if (state.cycleStates && state.cycleStates.length > 0){
            Ext.Array.each(state.cycleStates, function(s){
                if (state.cycleStateField !== "ScheduleState"){
                    fromStates.push(CArABU.technicalservices.CycleTimeCalculator.noStateText);
                }
                fromStates.push(s);
                if (!state.cycleEndState || (state.cycleEndState === s) || toStates.length > 0){
                    toStates.push(s);
                }
            });
            fromStates = _.map(state.cycleStates, function(s){ return {value: s}; });
            toStates = _.map(state.cycleStates, function(s){ return {value: s}; });
        }

        this.add({
            xtype: 'container',
            flex: 1,
            layout: 'hbox',
            items: [{
                xtype: 'rallycombobox',
                itemId: 'cb-fromState',
                allowBlank: true,
                allowNoEntry: true,
                noEntryText: '-- No State --',
                fieldLabel: 'Workflow State From',
                labelAlign: 'right',
                labelWidth: 150,
                width: 300,
                store: Ext.create('Rally.data.custom.Store', {data: fromStates}),
                defaultSelectionPosition : 'first',
                value: state.cycleStartState,
                valueField: 'value',
                displayField: 'value'
            },{
                xtype: 'rallycombobox',
                itemId: 'cb-toState',
                fieldLabel: 'to',
                labelWidth: 15,
                labelAlign: 'right',
                width: 165,
                allowBlank: false,
                disabled: toStates.length === 0,
                store: Ext.create('Rally.data.custom.Store', {data:toStates}),
                defaultSelectionPosition :'last',
                value: state.cycleEndState,
                valueField: 'value',
                displayField: 'value'
                ,
                listeners: {
                    scope: this,
                    select: this.updateCycleTimeParameters
                }
            }]

        },
        {
                xtype: 'rallycombobox',
                itemId: 'cb-rqState',
                fieldLabel: 'Ready Queue Column',
                labelAlign: 'right',
                labelWidth: 150,
                width: 300,
                allowBlank: false,
                disabled: toStates.length === 0,
                store: Ext.create('Rally.data.custom.Store', {data:toStates}),
                defaultSelectionPosition : 'first',
                value: state.cycleReadyQueueState,
                valueField: 'value',
                displayField: 'value'
                ,
                listeners: {
                    scope: this,
                    select: this.updateCycleTimeParameters
                }
        },
        {
            xtype: 'container',
            flex: 1,
            layout: 'hbox',
            items: [{
                xtype: 'rallydatefield',
                fieldLabel: 'Cycle End Date From',
                labelSeparator: "",
                itemId: 'dtFrom',
                labelAlign: 'right',
                labelWidth: 150,
                width: 300,
                value: state.startDate || null,
                toolTipText: "If this is populated, cycle time will only be shown for artifacts that transitioned into the selected Cycle End State AFTER this date.",

                listeners: {
                    scope: this,
                    select: this.updateCycleTimeParameters
                }
            },{
                xtype: 'rallydatefield',
                fieldLabel: 'to',
                itemId: 'dtTo',
                labelAlign: 'right',
                labelSeparator: "",
                labelWidth: 15,
                width: 165,
                value: state.endDate || null,
                toolTipText: "If this is populated, cycle time will only be shown for artifacts that transitioned into the selected Cycle End State BEFORE this date.",
                listeners: {
                    scope: this,
                    select: this.updateCycleTimeParameters
                }
            }]
        },
        {
            xtype: 'container',
            flex: 1,
            layout: 'hbox',
            items: [{
                xtype: 'rallymultiobjectpicker',
                modelType: 'Project',
                fieldLabel: 'Projects',
                labelSeparator: "",
                itemId: 'selectedProjects',
                labelAlign: 'right',
                labelWidth: 150,
                width: 300,
                value: state.projects,
                toolTipText: "Select the projects to calculate the cycle times",
                listeners: {
                    scope: this,
                    select: this.updateCycleTimeParameters
                }
            }
            // ,{
            //     xtype: 'rallytextfield',
            //     fieldLabel: 'Last n months',
            //     itemId: 'lastNMonths',
            //     labelAlign: 'right',
            //     labelSeparator: "",
            //     labelWidth: 10,
            //     width: 165,
            //     value: 6,
            //     toolTipText: "Select the n number of months to calculate the cycle times",
            //     listeners: {
            //         scope: this,
            //         select: this.updateCycleTimeParameters
            //     }
            //}
            ]
        });



        this.down('#cb-fromState').on('select', this._updateToState, this);

        var stateFieldCb = this.down('#cb-StateField');
        stateFieldCb.on('ready', this._updateStateDropdowns, this);
        stateFieldCb.on('select', this._updateStateDropdowns, this);

        this._updateStateDropdowns(stateFieldCb);
        this.updateCycleTimeParameters();
    },
    clear: function(){
        this._getFromStateCombo().setValue(null);
    },
    getState: function(){
        var currentState = this.getCycleTimeParameters();
        if (currentState.cycleStates && Ext.isArray(currentState.cycleStates)){
            currentState.cycleStates = currentState.cycleStates.join(',');
        }
        return currentState;
    },
    _getStateFieldCombo: function(){
        return this.down('#cb-StateField') || null;
    },
    _getFromStateCombo: function(){
        return this.down('#cb-fromState') || null;
    },
    _getToStateCombo: function(){
        return this.down('#cb-toState') || null;
    },
    _getReadyQueueStateCombo: function(){
        return this.down('#cb-rqState') || null;
    },
    applyState: function(state){
        if (state && state.cycleStates && !Ext.isArray(state.cycleStates)){
            state.cycleStates = state.cycleStates.split(',');
        }
        this._loadModels(state);
    },
    _updateToState: function(cbFrom){

        var toStateCombo = this.down('#cb-toState');
        var rqStateCombo = this.down('#cb-rqState');

        toStateCombo && toStateCombo.setDisabled(true);
        rqStateCombo && rqStateCombo.setDisabled(true);

        if (!cbFrom || !cbFrom.getValue() || !cbFrom.getRecord() || !toStateCombo){
            return;
        }

        var data = [],
            fromValue = cbFrom.getValue();
        Ext.Array.each(cbFrom.getStore().getRange(), function(d){
            if (fromValue === d.get('value') || data.length > 0){
                data.push(d.getData());
            }
        });
        toStateCombo.setDisabled(false);
        toStateCombo.bindStore(Ext.create('Rally.data.custom.Store',{ data: data}));

        rqStateCombo.setDisabled(false);
        rqStateCombo.bindStore(Ext.create('Rally.data.custom.Store',{ data: data}));

        //if (this.state && this.state.cycleEndState && toStateCombo.getValue() !== this.state.cycleEndState){
        //    toStateCombo.setValue(this.state.cycleEndState);
        //}
        this.updateCycleTimeParameters();
    },
    hasValidCycleTimeParameters: function(){

        var fromState = this.down('#cb-fromState') && this.down('#cb-fromState').getValue(),
            toState = this.down('#cb-toState') && this.down('#cb-toState').getValue();

        if(!fromState || !toState){
            return false;
        }
        return true;
    },
    getCycleTimeParameters: function(){
        var cycleTimeField = this._getStateFieldCombo() && this._getStateFieldCombo().getValue() || null,
            cycleStartState = this._getFromStateCombo() && this._getFromStateCombo().getValue() || null,
            cycleReadyQueueState = this._getReadyQueueStateCombo() && this._getReadyQueueStateCombo().getValue() || null,
            cycleEndState = this._getToStateCombo() && this._getToStateCombo().getValue() || null,
            showReady = this.down('#btReady') && this.down('#btReady').pressed || false,
            showBlocked = this.down('#btBlocked') && this.down('#btBlocked').pressed || false,
            cycleEndRangeStart = this.down('#dtFrom') && this.down('#dtFrom').getValue() || null,
            cycleEndRangeTo = this.down('#dtTo') && this.down('#dtTo').getValue() || null,
            states = this.down('#cb-fromState') && this.down('#cb-fromState').getStore().getRange() || [];
            projects = this.down('#selectedProjects') && this.down('#selectedProjects').selectedValues.keys || [];
            lastNMonths = this.down('#lastNMonths') && this.down('#lastNMonths').value || 1;

        states = Ext.Array.map(states, function(r) {
            //if (r.get('value') !== CArABU.technicalservices.CycleTimeCalculator.creationDateText) {
                return r.get('value');
        });
        states = _.uniq(states);

        return {
            cycleStateField: cycleTimeField,
            cycleStartState: cycleStartState,
            cycleReadyQueueState: cycleReadyQueueState,
            cycleEndState: cycleEndState,
            showReady: showReady,
            showBlocked: showBlocked,
            startDate: cycleEndRangeStart,
            endDate: cycleEndRangeTo,
            cycleStates: states,
            projects: projects,
            lastNMonths: lastNMonths
        };
    },
    updateCycleTimeParameters: function(){
        this.saveState();
        if (this.hasValidCycleTimeParameters()){
            this.fireEvent('parametersupdated', this.getCycleTimeParameters());
        } else {
            this.fireEvent('parametersupdated', {});
        }
    },
    _isCycleTimeField: function(field){
        var whitelistFields = ['State','ScheduleState'];

        if (field.hidden){
            return false;
        }

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
   _toggleButton:  function(btn, state){

        if (state){
            btn.removeCls('secondary');
            btn.addCls('primary');
        } else {
            btn.removeCls('primary');
            btn.addCls('secondary');
        }
        this.updateCycleTimeParameters();
    },
    _updateStateDropdowns: function(cb){

        var fromStateCombo = this.down('#cb-fromState'),
            toStateCombo = this.down('#cb-toState'),
            rqStateCombo = this.down('#cb-rqState');

        var toStatePreviousValue = toStateCombo && toStateCombo.getValue(),
            fromStatePreviousValue = fromStateCombo && fromStateCombo.getValue(),
            rqStatePreviousValue = rqStateCombo && rqStateCombo.getValue();

        fromStateCombo && fromStateCombo.setDisabled(true);
        toStateCombo &&  toStateCombo.setDisabled(true);
        rqStateCombo && rqStateCombo.setDisabled(true);

        var store = Ext.create('Rally.data.custom.Store',{
            data: []
        });
        toStateCombo.bindStore(store);
        rqStateCombo.bindStore(store);

        if (!cb || !cb.getValue() || !cb.getRecord()){
            return;
        }

        var model = cb.model;

        var data = [];
        if (cb.getValue() !== "ScheduleState"){
            data.push({value: CArABU.technicalservices.CycleTimeCalculator.noStateText });
        }
        model.getField(cb.getValue()).getAllowedValueStore().load({
            callback: function(records, operation){
                Ext.Array.each(records,function(r){
                    data.push({value: r.get('StringValue') });
                });
                var store = Ext.create('Rally.data.custom.Store',{
                    data: data
                });
                fromStateCombo.bindStore(store);
                fromStateCombo.setDisabled(false);
                if (fromStatePreviousValue){
                    fromStateCombo.setValue(fromStatePreviousValue);
                }else{
                    fromStateCombo.setValue(data && data[0].value|| null)
                }

                toStateCombo.bindStore(store);
                toStateCombo.setDisabled(false);
                if (toStatePreviousValue){
                    toStateCombo.setValue(toStatePreviousValue);
                }else{
                    toStateCombo.setValue(data && data.length > 0 && data[data.length-1].value || null);
                }

                rqStateCombo.bindStore(store);
                rqStateCombo.setDisabled(false);
                if (rqStatePreviousValue){
                    rqStateCombo.setValue(rqStatePreviousValue);
                }else{
                    rqStateCombo.setValue(data && data[0].value|| null);
                }

                this.updateCycleTimeParameters();
            },
            scope: this
        });

    }
});