Ext.define('CArABU.technicalservices.CycleTimeCalculator',{
    singleton: true,

    precision: 0,  //number of decimal mpoints
    granularity: 'day',
    creationDateText: "(Creation)",
    noStateText: "(No State)",

    getTimeInStateData: function(snapshots, field, value, dateField){
        snapshots = _.sortBy(snapshots, dateField);

        if (value === CArABU.technicalservices.CycleTimeCalculator.creationDateText){
            value = ""
        }

        var inState = snapshots[0][field] === value,
            startTime = inState ? Rally.util.DateTime.fromIsoString(snapshots[0][dateField]) : null;

        var info = [],
            idx = 0;

        if (startTime){
            info[idx] = [startTime]
        }
        Ext.Array.each(snapshots, function(snap){
            var thisDate = Rally.util.DateTime.fromIsoString(snap[dateField]);
            if (inState && snap[field] !== value){
                info[idx].push(thisDate);
                idx++;
                inState = false;
            } else if (!inState && snap[field] === value){
                info[idx] = [thisDate];
                inState = true;
            }
        });
        //console.log('getTimeInStateData', field, value, snapshots[0].FormattedID, info);
        return info
    },

    getCycleTimeData: function(snaps, field, startValue, endValue, precedence){

        var startIdx = -1;
        precedence = _.filter(precedence, function(r){
            return (r !== CArABU.technicalservices.CycleTimeCalculator.creationDateText);
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
            if (snap[field]){
                previousStateIdx = stateIdx;
                stateIdx = _.indexOf(precedence, snap[field]);
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
            cycleTime = cycleTime.toFixed(CArABU.technicalservices.CycleTimeCalculator.precision);
        }

        return { cycleTime: cycleTime, endDate: endDate, startDate: startDate};
    },
    getGranularityMultiplier: function(granularity){
        granularity = granularity.toLowerCase();
        if (granularity === 'minute'){ return 60; }
        if (granularity === 'hour') { return 3600; }
        return 86400;  //default to day
    },
    calculateTimeInState: function(dateArrays){
        var timeInState = 0;

        Ext.Array.each(dateArrays, function(a){
            var startDate = (a.length > 0) && a[0] || null,
                endDate = (a.length > 1) && a[1] || new Date();

            if (startDate && endDate){
                timeInState = timeInState + Rally.util.DateTime.getDifference(endDate, startDate, 'second');
            }

        });
        timeInState = timeInState/CArABU.technicalservices.CycleTimeCalculator.getGranularityMultiplier(CArABU.technicalservices.CycleTimeCalculator.granularity);

        return timeInState.toFixed(CArABU.technicalservices.CycleTimeCalculator.precision);
    },
    getRenderedTimeInStateValue: function(timeInStateData, stateName, stateValue, noDataText){

            var timeData = timeInStateData[stateName];
            if (timeData && stateValue){
                timeData = timeData[stateValue];
            }

            if (!timeData || timeData.length === 0){
                return noDataText;
            }

            return CArABU.technicalservices.CycleTimeCalculator.calculateTimeInState(timeData);
    },
    getFirstStartDate: function(timeInStateData, stateName, stateValue){

        var timeData = timeInStateData[stateName];
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
        var timeData = timeInStateData[stateName];
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