Ext.define('CArABU.technicalservices.CycleTimeFieldCombobox', {

        requires: [],
        extend: 'Rally.ui.combobox.FieldComboBox',
        alias: 'widget.rallycycletimefieldcombobox',

        config: {
            /**
             * @cfg {Rally.data.Model/String} model (required) The model containing the specified field used to populate the store.
             * Not required if field is an instance of {Rally.data.Field}.
             */
            model: undefined,
            modelNames: undefined,
            models: undefined,

            /**
             * @cfg {Object} context An object specifying the scoping settings for retrieving the specified model
             * If not specified the values provided by {Rally.env.Environment#getContext} will be used.
             */
            context: undefined,

            queryMode: 'local',
            editable: false,
            valueField: 'value',
            displayField: 'name',
            lastQuery: ''
        },

        initComponent: function() {

            this.callParent(arguments);

            this.on('afterrender', this._onAfterRender, this);

            console.log('_populateStore', this.modelNames);
            if (this.modelNames) {
                this._fetchModels();
            }
        },
        _fetchModels: function(){
            Rally.data.ModelFactory.getModels({
                context: this.context,
                types: this.modelNames,
                success: this._onModelRetrieved,
                scope: this
            });
        },

        _onModelRetrieved: function(models) {
            this.models = models;
            this._populateStore();
        },

        _populateStore: function() {
            if (!this.store) {
                return;
            }

            var modelFields = {},
                whitelistFields = ['ScheduleState','State'];
            console.log('_populateStore', this.models);

            var tempModel = null;
            Ext.Object.each(this.models, function(key, model){
                tempModel = model;
                modelFields[key] = [];
                Ext.Array.each(model.getFields(), function(field){
                    if (Ext.Array.contains(whitelistFields, field.name) || (!field.hidden && field.attributeDefinition
                           && field.attributeDefinition.AttributeType === "STRING"
                        && field.attributeDefinition.Constrained && !field.attributeDefinition.ReadOnly)){
                        modelFields[key].push(field.name);
                    }
                });
            });
            console.log('_populateStore', modelFields, this.models, Ext.Object.getValues(modelFields));

            var commonFields = Ext.Array.intersect.apply(null,Ext.Object.getValues(modelFields));
            var data = [];
            Ext.Array.each(commonFields, function(fieldName){
                console.log('fieldName', fieldName)
                var field = tempModel.getField(fieldName);
                data.push(this._convertFieldToLabelValuePair(field));
            }, this);
            console.log('data',data);
            data = _.sortBy(data, 'name');

            this.store.loadRawData(data);
            this.setDefaultValue();
            this.onReady();
        },

        _isNotHidden: function(field) {
            return !field.hidden;
        },

        _convertFieldToLabelValuePair: function(field) {
            console.log('field',field);
            var pair = {
                fieldDefinition: field
            };
            pair[this.valueField] = field.name;
            pair[this.displayField] = field.displayName;
            return pair;
        },
        refreshWithNewModelType: function(types) {
            this.modelNames = types;
            this._fetchModels();
        }
    });
