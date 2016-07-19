Ext.override(Rally.ui.combobox.FieldValueComboBox, {

        refreshStore: function(field){
            if (_.isString(field)) {
                this.field = this.model.getField(field);
            }
            this._populateStore();
        },
    _loadStoreValues: function() {
        console.log('_loadStoreValues')
        this.field.getAllowedValueStore({context: this.context && _.isFunction(this.context.getDataContext) ? this.context.getDataContext() : this.context}).load({
            requester: this,
            callback: function(records, operation, success) {
                console.log('_loadStoreValues', records, success)
                var store = this.store;
                if (!store) {
                    return;
                }
                var values = [],
                    labelValues = _.map(
                        _.filter(records, this._hasStringValue),
                        this._convertAllowedValueToLabelValuePair,
                        this
                    );

                if(this.field.getType() === 'boolean') {
                    labelValues = labelValues.concat([
                        this._convertToLabelValuePair('Yes', true),
                        this._convertToLabelValuePair('No', false)
                    ]);
                } else if (this.field.required === false) {
                    var name = "-- No Entry --",
                        value = this.noEntryValue;
                    if (this.getUseNullForNoEntryValue()) {
                        this.noEntryValue = value = null;
                    }
                    if (this.field.attributeDefinition.AttributeType.toLowerCase() === 'rating') {
                        name = this.getRatingNoEntryString();
                        value = "None";
                    }
                    values.push(this._convertToLabelValuePair(name, value));
                }

                if (this.getAllowInitialValue() && this.config.value) {
                    var initialValue = this.transformOriginalValue(this.config.value);
                    if (this._valueNotInAllowedValues(initialValue, labelValues)) {
                        var label = this.config.value._refObjectName || initialValue;
                        values.push(this._convertToLabelValuePair(label, initialValue));
                    }
                }
                console.log('_loadStoreValues', values.concat(labelValues))
                store.loadRawData(values.concat(labelValues));
                store.fireEvent('load', store, store.getRange(), success);
            },
            scope: this
        });
    },

});
