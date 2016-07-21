Ext.define('CArABU.technicalservices.CycleTimeData.Settings',{
    singleton: true,

    getFields: function(settings){
        var includeUS = Ext.Array.contains(settings.includeTypes, 'hierarchicalrequirement'),
            includeDefect = Ext.Array.contains(settings.includeTypes, 'defect');



        return [{
            xtype: 'checkboxgroup',
            fieldLabel: 'Include Types',
            columns: 1,
            vertical: true,
            allowBlank: false,
            labelAlign: 'right',
            labelWidth: 100,
            msgTarget: 'under',
            validateOnChange: true,
            validator: function(value) {
                if (!value || value.length ===0){
                    return "At least 1 artifact type must be selected";
                }
            },
            margin: '0 0 50 0',
                items: [
                    { boxLabel: 'User Story', name: 'includeTypes', inputValue: 'hierarchicalrequirement', checked: includeUS },
                    { boxLabel: 'Defect', name: 'includeTypes', inputValue: 'defect', checked: includeDefect }
                ]
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