Ext.define('CArABU.technicalservices.CycleTimeCalculator',{
    singleton: true,
    granularity: 'day',
    creationDateText: "(Creation)",
    noStateText: "(No State)",
    flowStates : {},

    getTimeInStateData: function(snapshots, field, value, dateField){

        snapshots = _.sortBy(snapshots, dateField);

        if (value === CArABU.technicalservices.CycleTimeCalculator.noStateText){
                value = "";
        }

        var inState = snapshots[0][field] === value;
            if(field == "FlowState"){
                inState = this.flowStates[snapshots[0][field]] === value;
            }

        var startTime = inState ? Rally.util.DateTime.fromIsoString(snapshots[0][dateField]) : null;


        var info = [],
            idx = 0;

        if (startTime){
            info[idx] = [startTime]
        }
        Ext.Array.each(snapshots, function(snap){
            var thisDate = Rally.util.DateTime.fromIsoString(snap[dateField]);
            var snap_field = snap[field];
            if(field == "FlowState"){
                snap_field = this.flowStates[snap_field] || "";
            }
            if (inState && snap_field !== value){
                info[idx].push(thisDate);
                idx++;
                inState = false;
            } else if (!inState && snap_field === value){
                info[idx] = [thisDate];
                inState = true;
            }
        }, this);
        return info
    },

    getCycleTimeData: function(snaps, field, startValue, endValue, precedence){

        var startIdx = -1;
        precedence = _.filter(precedence, function(r){
            return (r !== CArABU.technicalservices.CycleTimeCalculator.noStateText || r !== "");
        });

        if (!Ext.isEmpty(startValue)){  //This is in case there is no start value (which means grab the first snapshot)
            startIdx = _.indexOf(precedence, startValue);
        }
        var endIdx = _.indexOf(precedence, endValue);

        //Assumes snaps are stored in ascending date order.
        var startDate = null,
            endDate = null;

        var previousStateIdx = -1;
        var stateIdx = -1;
        var cycleTime = null;

        if ( startIdx === -1 ) {
            startDate = Rally.util.DateTime.fromIsoString(snaps[0]._ValidFrom);
        }

        Ext.each(snaps, function(snap){
            var thisDate = Rally.util.DateTime.fromIsoString(snap._ValidFrom);
            var snap_field = snap[field];
            if(field == "FlowState"){
                snap_field = this.flowStates[snap_field] || "";
            }            
            if (snap_field){
                previousStateIdx = stateIdx;
                stateIdx = _.indexOf(precedence, snap_field);
            } else {
                if (previousStateIdx > 0){
                    stateIdx = -1;
                }
            }
            if (stateIdx >= startIdx && previousStateIdx < startIdx && startIdx > -1 && startDate === null){
                startDate = thisDate;
            }
            if (stateIdx >= endIdx && previousStateIdx < endIdx){
                endDate = thisDate;
                if (startDate != null){
                    cycleTime = Rally.util.DateTime.getDifference(endDate,startDate,'second');
                }
            }
        }, this);


        if (stateIdx < endIdx){
            cycleTime = null;
        }

        if (cycleTime) {
            cycleTime = cycleTime / CArABU.technicalservices.CycleTimeCalculator.getGranularityMultiplier(CArABU.technicalservices.CycleTimeCalculator.granularity);
        }

        return { cycleTime: cycleTime, endDate: endDate, startDate: startDate};
    },
    getGranularityMultiplier: function(granularity){
        granularity = granularity.toLowerCase();
        if (granularity === 'minute'){ return 60; }
        if (granularity === 'hour') { return 3600; }
        if (granularity === 'week') { return 604800; }
        return 86400;  //default to day
    },
    calculateTimeInState: function(dateArrays){
        var timeInState = null;
        
        if (dateArrays && dateArrays.length != 0){
            timeInState = 0;
    
            Ext.Array.each(dateArrays, function(a){
                var startDate = (a.length > 0) && a[0] || null,
                    endDate = (a.length > 1) && a[1] || new Date();
    
                if (startDate && endDate){
                    timeInState = timeInState + Rally.util.DateTime.getDifference(endDate, startDate, 'second');
                }
    
            });
            timeInState = timeInState/CArABU.technicalservices.CycleTimeCalculator.getGranularityMultiplier(CArABU.technicalservices.CycleTimeCalculator.granularity);
        }

        // May be null if no dateArrays given
        return timeInState;
    },
    getRenderedTimeInStateValue: function(timeInStateData, stateName, stateValue){

            var timeData = timeInStateData && timeInStateData[stateName];
            if (timeData && stateValue){
                timeData = timeData[stateValue];
            }

            return CArABU.technicalservices.CycleTimeCalculator.calculateTimeInState(timeData);
    },
    getFirstStartDate: function(timeInStateData, stateName, stateValue){

        var timeData = timeInStateData && timeInStateData[stateName];
        if (timeData && stateValue){
            timeData = timeData[stateValue];
        }

        if (timeData && timeData.length > 0){
            return timeData[0][0];
        }
        return null;
    },
    getLastEndDate: function(timeInStateData, stateName, stateValue){
       //console.log('getLastEndDate', stateName, stateValue)
        var timeData = timeInStateData && timeInStateData[stateName];
        if (timeData && stateValue){
            timeData = timeData[stateValue];
        }
       //console.log('getLastEndDate', timeData)
        if (timeData && timeData.length > 0){
            return timeData[timeData.length-1] && timeData[timeData.length-1][0] || null ;
        }
        return null;
    },
    getExportTimestampCSV: function(records, exportDateFormat){
        var headers = ['FormattedID','State','StateValue','StartDate','EndDate'],
            csv = [headers.join(',')],
            getTimeSpanRow = function(timeSpan, formattedID, stateName, stateValue){
                var startDate = timeSpan.length > 0 && timeSpan[0] && Rally.util.DateTime.format(timeSpan[0],exportDateFormat) || "",
                    endDate = timeSpan.length > 1 && timeSpan[1] && Rally.util.DateTime.format(timeSpan[1],exportDateFormat) || "",
                    row = [formattedID, stateName, stateValue, startDate, endDate];
                return row.join(",");
            };

        for (var i = 0; i < records.length; i++){

            var timeInStateData = records[i].get('timeInStateData'),
                formattedID = records[i].get('FormattedID');
            if (timeInStateData){
                Ext.Object.each(timeInStateData, function(stateName,stateValues){
                    if (stateName != "snaps"){
                        if (Ext.isArray(stateValues)){ //then this is ready or blocked, a boolean state
                            Ext.Array.each(stateValues, function(timeSpan){
                                csv.push(getTimeSpanRow(timeSpan, formattedID, stateName, "true"));
                            });
                        } else {
                            Ext.Object.each(stateValues, function(valueName, timeSpans){
                                Ext.Array.each(timeSpans, function(timeSpan){
                                    csv.push(getTimeSpanRow(timeSpan, formattedID, stateName, valueName));
                                });
                            });
                        }
                    }
                });
            }
        }
        return csv.join("\r\n");
    }
});