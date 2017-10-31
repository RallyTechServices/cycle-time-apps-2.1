Ext.define('CArABU.technicalservices.CycleTimeData.Settings',{
    singleton: true,

    getFields: function(settings){
        // var includeUS = Ext.Array.contains(modelNames, 'HierarchicalRequirement'),
        //     includeDefect = Ext.Array.contains(modelNames, 'Defect');

        // var filters = [{
        //     property: 'TypePath',
        //     operator: 'contains',
        //     value: 'PortfolioItem/'
        // },{
        //     property: 'TypePath',
        //     value: 'Defect'
        // },{
        //     property: 'TypePath',
        //     value: 'HierarchicalRequirement'
        // }];
        // filters = Rally.data.wsapi.Filter.or(filters);
        current_date_type = (settings && settings.dateType) || 'DateRange',

        console.log('settings>>',settings);

        // var types = Ext.create('Ext.data.Store', {
        //     fields: ['name'],
        //     data : [
        //         {"name":"User Story & Defect"},
        //         {"name":"Feature"}
        //     ]
        // });

        return [
        // {
        //     xtype: 'combobox',
        //     name: 'artifactType',
        //     store: types,
        //     fieldLabel: 'Artifact Type',
        //     queryMode: 'local',            
        //     allowBlank: false,
        //     labelAlign: 'right',
        //     labelWidth: 100,
        //     valueField: 'name',
        //     displayField: 'name',
        //     value: settings.artifactType
        // },
        {
            xtype: 'rallynumberfield',
            fieldLabel: 'Max Export Limit',
            name: 'exportLimit',
            labelAlign: 'right',
            labelWidth: 100,
            minValue: 10,
            maxValue: 10000,
            value: settings.exportLimit
        },
        {
            xtype: 'radiogroup',
            fieldLabel: 'Date Type',
            columns: 1,
            vertical: true,
            labelAlign: 'top',
            layout: 'hbox',
            labelWidth: 100,
            labelCls: 'settingsLabel',
            items: [{
                boxLabel: "Date Range",
                name: 'dateType',
                inputValue: "DateRange"
                ,
                checked: "DateRange" === current_date_type
            }, {
                boxLabel: "Last N Weeks",
                name: 'dateType',
                inputValue: "LastNWeeks"
                ,
                checked: "LastNWeeks" === current_date_type
            }, {
                boxLabel: "Last N Months",
                name: 'dateType',
                inputValue: "LastNMonths"
                ,
                checked: "LastNMonths" === current_date_type
            }]
        },
        {
            xtype: 'radiogroup',
            fieldLabel: 'Granularity',
            columns: 1,
            vertical: true,
            labelAlign: 'top',
            layout: 'hbox',
            labelWidth: 100,
            width:300,
            labelCls: 'settingsLabel',
            items: [{
                boxLabel: "Day",
                name: 'granularity',
                inputValue: "day"
                ,
                checked: "day" === settings.granularity
            }, {
                boxLabel: "Minute",
                name: 'granularity',
                inputValue: "minute"
                ,
                checked: "minute" === settings.granularity
            }]
        },
        {
            xtype: 'radiogroup',
            fieldLabel: 'Chart Type',
            columns: 1,
            vertical: true,
            labelAlign: 'top',
            layout: 'hbox',
            labelWidth: 100,
            width:300,
            labelCls: 'settingsLabel',
            items: [{
                boxLabel: "Bar",
                name: 'chartType',
                inputValue: "column"
                ,
                checked: "column" === settings.chartType
            }, {
                boxLabel: "Line",
                name: 'chartType',
                inputValue: "line"
                ,
                checked: "line" === settings.chartType
            }]
        }
        ,{
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