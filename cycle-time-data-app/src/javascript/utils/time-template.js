Ext.define('CArABU.technicalservices.CycleTimeTemplateColumn', {
    extend: 'Ext.grid.column.Template',
    alias: ['widget.cycletimetemplatecolumn'],

    align: 'right',

    initComponent: function(){
        var me = this;

        Ext.QuickTips.init();

        me.tpl = new Ext.XTemplate('<tpl><div data-qtip="{[this.getTooltip(values)]}" style="cursor:pointer;text-align:right;">{[this.getCycleTime(values)]}</div></tpl>',{

            getCycleTime: function(values){

                var cycleTime = values && values.cycleTime ;
                if (cycleTime >= 0){
                    return cycleTime;
                }
                return '--';
            },
            getTooltip: function(values){

                var toolTip = "";
                if (values && values.startDate){
                    toolTip = Ext.String.format("Start: {0}",
                        Rally.util.DateTime.format(values.startDate,'Y-m-d h:i:s a'));

                }

                if (values && values.cycleTime && values.endDate){
                    toolTip = Ext.String.format("{0} <br/>{1}</br>End: {2}",
                        values.cycleTime,
                        toolTip,
                        Rally.util.DateTime.format(values.endDate,'Y-m-d h:i:s a'));
                }

                return toolTip;
            }

        });
        me.hasCustomRenderer = true;
        me.callParent(arguments);
    },
    defaultRenderer: function(value, meta, record) {
        var data = Ext.apply({}, record.get('cycleTimeData'));
        return this.tpl.apply(data);
    },
});




Ext.define('CArABU.technicalservices.TimeTemplateColumn', {
    extend: 'Ext.grid.column.Template',
    alias: ['widget.timetemplatecolumn'],

    align: 'right',

    initComponent: function(){
        var me = this;

        Ext.QuickTips.init();

        me.tpl = new Ext.XTemplate('<tpl><div data-qtip="{[this.getTooltip(values)]}" style="cursor:pointer;text-align:right;">{[this.getCurrentIcon(values)]}{[this.getTime(values)]}</div></tpl>',{
            stateName: me.stateName,
            dataType: me.dataType,
            stateValue: me.stateValue,

            getTime: function(values){
                return CArABU.technicalservices.CycleTimeCalculator.getRenderedTimeInStateValue(values,this.stateName,this.stateValue,'--');
            },
            getCurrentIcon: function(values){
                if (values.currentValue && (values.currentValue === true || values.currentValue === this.stateValue)){
                    var iconCls = "icon-square",
                        color = "#005eb8";

                    if (this.stateName === "Blocked"){
                        iconCls = "icon-blocked";
                        color = "#b81b10";
                    }
                    if (this.stateName === "Ready"){
                        iconCls = "icon-ready";
                        color = "#8dc63f";
                    }
                    return Ext.String.format('<div class="{0}" style="color:{1}"></div>', iconCls, color);
                }
                return "";
            },
            getTooltip: function(values){
                var timeData = values[this.stateName];
                if (timeData && this.stateValue){
                    timeData = timeData[this.stateValue];
                }

                if (!timeData || timeData.length === 0){
                    return "";
                }

                var stateValue = this.stateValue || "[No State]";
                if (this.stateName === "Blocked" || this.stateName === "Ready"){
                    stateValue = "true";
                }

                var toolTip = Ext.String.format("{0}: {1}<br/>",this.stateName, stateValue);
                Ext.Array.each(timeData, function(t){
                    var startDate = t && t.length > 0 && Rally.util.DateTime.format(t[0], 'Y-m-d h:i:s a') || "";
                    var endDate = t && t.length > 1 && Rally.util.DateTime.format(t[1], 'Y-m-d h:i:s a') || "current";
                    if (startDate.length > 0){
                        toolTip = toolTip + Ext.String.format("{0} - {1}<br/>",startDate, endDate);
                    }
                });
                return toolTip;
            }

        });
        me.hasCustomRenderer = true;
        me.callParent(arguments);
    },
    //getValue: function(){
    //    return values[this.costField] || 0;
    //},
    defaultRenderer: function(value, meta, record) {
        var data = Ext.apply({}, record.get(this.dataType));
        data.currentValue = record.get(this.stateName);
        return this.tpl.apply(data);
    }

});

Ext.define('CArABU.technicalservices.TimeToMarketTemplateColumn', {
    extend: 'Ext.grid.column.Template',
    alias: ['widget.timetomarkettemplatecolumn'],

    align: 'right',

    initComponent: function(){
        var me = this;

        Ext.QuickTips.init();

        me.tpl = new Ext.XTemplate('<tpl><div data-qtip="{[this.getTooltip(values)]}" style="cursor:pointer;text-align:right;">{[this.getTime(values)]}</div></tpl>',{
            dataType: me.dataType,
            stateName: me.stateName,
            states: me.states,

            getTime: function(values){
                var result = Ext.util.Format.round(values.currentValue,2);
                if ( !result || result.length === 0 ) {
                    result = '--';
                }
                return result;
            },
            getTooltip: function(values){
                var timeData = values['ScheduleState'];

                if (!timeData || timeData.length === 0 ){
                    return "";
                }
                
                var toolTip = Ext.String.format("{0}: {1}<br/>",this.stateName, this.getTime(values));

                _.each(this.states, function(state) {
                    var stateData = timeData[state];
                    if ( stateData ) {
                        toolTip += Ext.String.format("{0}:<br/>",state);
                        _.each(stateData, function(t){
                            var startDate = t && t.length > 0 && Rally.util.DateTime.format(t[0], 'Y-m-d h:i:s a') || "";
                            var endDate = t && t.length > 1 && Rally.util.DateTime.format(t[1], 'Y-m-d h:i:s a') || "current";
                            if (startDate.length > 0){
                                toolTip = toolTip + Ext.String.format("{0} - {1}<br/>",startDate, endDate);
                            }
                        });
                    }
                }, this);
                
                return toolTip;
            }

        });
        me.hasCustomRenderer = true;
        me.callParent(arguments);
    },
    
    defaultRenderer: function(value, meta, record) {
        var data = Ext.apply({}, record.get(this.dataType));
        data.currentValue = record.get(this.stateName);
        return this.tpl.apply(data);
    }

});

