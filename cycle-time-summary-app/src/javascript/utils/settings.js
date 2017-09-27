Ext.define('CArABU.technicalservices.CycleTimeData.Settings',{
    singleton: true,

    getFields: function(modelNames){
        var includeUS = Ext.Array.contains(modelNames, 'HierarchicalRequirement'),
            includeDefect = Ext.Array.contains(modelNames, 'Defect');

        var filters = [{
            property: 'TypePath',
            operator: 'contains',
            value: 'PortfolioItem/'
        },{
            property: 'TypePath',
            value: 'Defect'
        },{
            property: 'TypePath',
            value: 'HierarchicalRequirement'
        }];
        filters = Rally.data.wsapi.Filter.or(filters);


        return [{
            xtype: 'rallycombobox',
            name: 'artifactType',
            storeConfig: {
                model: 'TypeDefinition',
                filters: filters,
                fetch: ['TypePath','DisplayName'],
                remoteFilter: true
            },
            fieldLabel: 'Artifact Type',
            allowBlank: false,
            labelAlign: 'right',
            labelWidth: 100,
            valueField: 'TypePath',
            displayField: 'DisplayName'

        },{
            xtype: 'rallynumberfield',
            fieldLabel: 'Max Export Limit',
            name: 'exportLimit',
            labelAlign: 'right',
            labelWidth: 100,
            minValue: 10,
            maxValue: 10000
        },{
            xtype: 'textarea',
            fieldLabel: 'Query',
            name: 'queryFilter',
            anchor: '100%',
            cls: 'query-field',
            margin: '0 70 0 0',
            labelAlign: 'right',
            labelWidth: 100,
            plugins: [
                {
                    ptype: 'rallyhelpfield',
                    helpId: 194
                },
                'rallyfieldvalidationui'
            ],
            validateOnBlur: false,
            validateOnChange: false,
            validator: function(value) {
                try {
                    if (value) {
                        Rally.data.wsapi.Filter.fromQueryString(value);
                    }
                    return true;
                } catch (e) {
                    return e.message;
                }
            }
        }];
    }
});