Ext.define('CA.technicalservices.CycleTimePickerButton', {
    extend: 'Rally.ui.Button',
    alias: 'widget.cycletimepickerbutton',

    //cls: 'secondary rly-small',
    //iconCls: 'icon-history',
    hidden:true,
    stateful: true,
    stateId: 'cycleTimePanel',
    stateEvents: ['expand', 'collapse', 'parametersupdated'],
    text: '',

    config: {
        context: undefined,
        modelNames: undefined,
        toolTipConfig: {
            anchor: 'top',
            mouseOffset: [-9, -2]
        }
    },

    initComponent: function() {
        this.callParent(arguments);

        if (!this.stateful || (this.stateful && !this._hasState())) {
            this.applyState({});
        }

        //this.on('click', this._togglePanel, this, { buffer: 200 });
        this.on('parametersupdated', this._onPanelChange, this, { buffer: 500 });
        //this.on('collapse', this._onCollapse, this);
    },
    _hasState: function(){
        if (this.stateful && this.stateId) {
            return !!Ext.state.Manager.get(this.stateId);
        }
        return false;
    },
    _onPanelChange: function(params){

        Ext.suspendLayouts();
            this.setText('');
            this._indicateNoActiveFilterPresent();
        // if (this.hasValidCycleTimeParameters()) {
        //     this.setText('');
        //     this._indicateActiveFilterPresent();
        // } else {
        //     this.setText('');
        //     this._indicateNoActiveFilterPresent();
        // }
        Ext.resumeLayouts(false);
        this.fireEvent('cycletimeparametersupdated', this);
    },
    afterRender: function() {
        this.callParent(arguments);
        //this.toolTip.on('beforeshow', this._onBeforeShowToolTip, this);
    },
    hasValidCycleTimeParameters: function(){
        return this.cycleTimePanel && this.cycleTimePanel.hasValidCycleTimeParameters();
    },
    getCycleTimeParameters: function() {
        return this.cycleTimePanel && this.cycleTimePanel.getCycleTimeParameters();
    },
    getState: function() {
        if (this.cycleTimePanel) {
            var state = this.cycleTimePanel.getCycleTimeParameters();
            state.collapsed = this.cycleTimePanel.getCollapsed();
            return state;
        } else {
            return Ext.state.Manager.get(this.stateId);
        }
    },
    applyState: function(state) {
        //console.log('applyState', state);
        this._build(state);
    },

    onDestroy: function() {
        _.invoke(_.compact([
            this.relayedEvents,
            this.cycleTimePanel
        ]), 'destroy');
        this.callParent(arguments);
    },

    clearAllFilters: function() {
        this.cycleTimePanel && this.cycleTimePanel.clear();
    },

    _build: function(applyParameters) {

        return this._loadModels().then({
            success: _.partial(this._onModelLoadSuccess, applyParameters),
            scope: this
        });
    },

    _onModelLoadSuccess: function(applyParameters) {
        this._createCycleTimePanel();
        if (applyParameters) {
            this._applyParameters();
        }
    },

    _loadModels: function() {

        if (this.models) {
            return Deft.Promise.when(this.models);
        } else {
            return Rally.data.ModelFactory.getModels({
                context: this.context || Rally.environment.getContext(),
                types: this.modelNames
            }).then({
                success: function(models) {
                    this.models = models;
                },
                scope: this
            });
        }
    },
    _applyParameters: function(params){


      // console.log('_applyParameters', params);

    },
    _indicateActiveFilterPresent: function() {
        if (!this.hasCls('primary')) {
            this.addCls('primary');
            this.removeCls('secondary');
        }
    },
    _indicateNoActiveFilterPresent: function() {
        if (!this.hasCls('secondary')) {
            this.addCls('secondary');
            this.removeCls('primary');
        }
    },
    _createCycleTimePanel: function() {

        if (!this.cycleTimePanel){
            this.cycleTimePanel = Ext.widget({
                xtype: 'cycletimepickerpanel',
                modelNames: this.modelNames,
                models: this.models,
                context: this.context,
                flex: 1
            });
            this.relayedEvents = this.relayEvents(this.cycleTimePanel, ['expand', 'collapse', 'panelresize', 'parametersupdated']);
            this.fireEvent('cycletimepickerready', this.cycleTimePanel);
        }
    },
    _togglePanel: function() {
        this.cycleTimePanel && this.cycleTimePanel.toggleCollapse();
    },

    //_onCollapse: function() {
    //    console.log('_onCollapse validate here?');
    //},

    collapse: function() {
        this.cycleTimePanel && this.cycleTimePanel.collapse();
    },

    // _onBeforeShowToolTip: function() {
    //     var action = this.cycleTimePanel && this.cycleTimePanel.collapsed ? 'Show' : 'Hide' || "Toggle";
    //     this.toolTip.update(Ext.String.format('{0} Cycle Time parameters', action));
    // }
});