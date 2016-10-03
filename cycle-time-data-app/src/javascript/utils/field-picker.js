Ext.define('CA.technicalservices.FieldPicker', {
        alias: 'widget.fieldpickerbutton',
        extend:'Rally.ui.Button',
        requires: [
            'Rally.ui.popover.Popover',
            'Rally.ui.Button',
            'Rally.ui.picker.FieldPicker',
            'Ext.state.Manager'
        ],
        toolTipConfig: {
            html: 'Show Columns',
            anchor: 'top'
        },
        iconCls: 'icon-add-column',

        cls: 'field-picker-btn secondary rly-small',

        alwaysSelectedValues: ['FormattedID', 'Name'], // DragAndDropRank gets added in init if Drag and Drop is enabled for the workspace in the component's context

        fieldBlackList: [],

        fieldPickerConfig: {},

        buttonConfig: {},

        modelNames: [],

        rankingEnabled: false,

        margin: '3 9 0 0',

        //This does not show the Rank column

        constructor: function (config) {
            this.config = _.merge({}, this.config || {}, config || {});
            this.callParent([config]);
        },

        initComponent: function() {

            if (this.models){
                this.on('click', this._createPopover, this);
                this.callParent(arguments);
                return;
            }

            if (this.context && this.modelNames && this.modelNames.length > 0){
                Rally.data.ModelFactory.getModels({
                    types: this.modelNames,
                    context: this.context,
                    success: function(models){
                        console.log('models');
                        this.models = models;

                    },
                    failure: function(failedParam){
                        console.log('failedparam');
                    },
                    scope: this
                });
                this.on('click', this._createPopover, this);
            } else {
                this.iconCls = 'icon-none';
                var msg = "Please update the CA.technicalservices.FieldPicker configuration with modelNames and context";
                this.toolTipConfig= {
                    html: '<div style="color:red;">' + msg + '</div>'
                }
                this.on('click', function(){ Rally.ui.notify.Notifier.showError({message: msg})})
            }
            this.callParent(arguments);
        },
        getFields: function(){
            return this._fields;
        },
        _getPickerConfig: function() {
            var pickerConfig;
            pickerConfig = _.extend({
                value: this._fields,
                fieldBlackList: this.fieldBlackList,
                alwaysSelectedValues: this.alwaysSelectedValues,
                context: this.context
            }, this.fieldPickerConfig);

            return pickerConfig;
        },

        _createPopover: function(btn) {
            var popoverTarget = btn.getEl();

            this.popover = Ext.create('Rally.ui.popover.Popover', {
                target: popoverTarget,
                placement: ['bottom', 'left', 'top', 'right'],
                cls: 'field-picker-popover',
                toFront: Ext.emptyFn,
                buttonAlign: 'center',
                title: this.getTitle(),
                listeners: {
                    destroy: function () {
                        this.popover = null;
                    },
                    scope: this
                },
                buttons: [
                    {
                        xtype: "rallybutton",
                        text: 'Apply',
                        cls: 'field-picker-apply-btn primary rly-small',
                        listeners: {
                            click: function() {
                                this._onApply(this.popover);
                            },
                            scope: this
                        }
                    },
                    {
                        xtype: "rallybutton",
                        text: 'Cancel',
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
                    _.extend({
                        xtype: 'rallyfieldpicker',
                        cls: 'field-picker',
                        itemId: 'fieldpicker',
                        modelTypes: this._getModelTypes(),
                        alwaysExpanded: true,
                        width: 200,
                        emptyText: 'Search',
                        selectedTextLabel: 'Selected',
                        availableTextLabel: 'Available',
                        listeners: {
                            specialkey: function(field, e) {
                                if (e.getKey() === e.ESC) {
                                    this.popover.close();
                                }
                            },
                            scope: this
                        }
                    }, this._getPickerConfig())
                ]
            });
        },

        _getModelTypes: function() {
            return _.pluck(this._getModels(), 'typePath');
        },

        _getModels: function() {
            return _.reduce(this.models, function(accum, model) {
                if (model.typePath === 'artifact') {
                    accum = accum.concat(model.getArtifactComponentModels());
                } else {
                    accum.push(model);
                }
                return accum;
            }, []);
        },

        getTitle: function () {
            return 'Show Columns';
        },

        /**
         * Update the fields displayed. In grid mode this will be the columns displayed. In board mode it will be
         * the fields on the cards
         *
         * @param {String[]|Object[]} fields A list of field names to display
         * @param {Boolean} true to suspend store load if it will be triggered elsewhere
         */
        updateFields: function (fields, suspendLoad) {
            this._fields = fields;
            if (this.popover && this.popover.down('rallyfieldpicker')) {
                this.popover.down('rallyfieldpicker').setValue(fields.join(','));
            }
            this.saveState();
        },
        getState: function(){
            return {
                fields: this._fields
            };
        },
        applyState: function(state){
            if (state){
                this._fields = state.fields;
            }
        },
        _onApply: function(popover) {
            var fieldPicker = popover.down('rallyfieldpicker'),
                fields = _.map(fieldPicker.getValue(), function (field) {
                    return field.get('name');
                });

            this.updateFields(fields);
            popover.close();

            this.fireEvent('fieldsupdated', fields);
        }
    });