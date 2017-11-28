Ext.define('CArABU.technicalservices.CycleTimeCalculator',{
    singleton: true,

    precision: 0,  //number of decimal mpoints
    granularity: 'day',
    creationDateText: "(Creation)",
    noStateText: "(No State)",

    getTimeInStateData: function(snapshots, field, value, dateField,projectIds, stateField, toState, readyQueueStateField, readyQueueStateValue){
        snapshots = _.sortBy(snapshots, dateField);

        if (value === CArABU.technicalservices.CycleTimeCalculator.noStateText){
                value = "";
        }

        if (readyQueueStateValue === CArABU.technicalservices.CycleTimeCalculator.noStateText){
                readyQueueStateValue = "";
        }

        var info = [],
            idx = 0;

        Ext.Array.each(snapshots, function(snap){
            var thisDate = Rally.util.DateTime.fromIsoString(snap[dateField]);
            var endDate =  Rally.util.DateTime.fromIsoString(snap['_ValidTo']);
            //excluding when the field in ready queue state. 
            if(!(readyQueueStateField && snap[readyQueueStateField] == readyQueueStateValue) ){
                if(snap[field] === value && (Ext.Array.contains(projectIds, snap.Project) || Ext.Array.contains(projectIds, snap.Parent))){
                    //exclude if in last column and Ready for 

                    //if(!((value == 'Accepting' && snap['Ready']) || snap['ScheduleState'] == 'Accepted' || snap['ScheduleState'] == 'Deployed')){
                    if(!(snap[stateField] == toState && snap['Ready'])){    
                        if(endDate < new Date()){
                            //endDate = endDate > new Date() ? new Date() : endDate;
                            info[idx] = [thisDate,endDate];
                            idx++;    
                        }                      
                    }
                }
            }
        });

        return info
    },


    getCycleTimeData: function(snaps, field, startValue, endValue, precedence,projectIds,stateField, toState){

        var validStates = [];
        var add = false;
        Ext.Array.each(precedence, function(state){

            if(add) {
                validStates.push(state == CArABU.technicalservices.CycleTimeCalculator.noStateText ? "" :state);
            }            
            if(startValue == state){
                add = true;
                validStates.push(state == CArABU.technicalservices.CycleTimeCalculator.noStateText ? "" :state);
            }
            if(endValue == state){
                add = false;
            }
        });
        var cycleTime = 0;
        var startDate, endDate, initalStartDate;
        Ext.each(snaps, function(snap){
             if (snap[field] != null  && Ext.Array.contains(validStates,snap[field]) && (Ext.Array.contains(projectIds, snap.Parent) || Ext.Array.contains(projectIds, snap.Project))){
                if(!(snap[stateField] == toState && snap['Ready'])){
                    if(!startDate){
                        initalStartDate = Rally.util.DateTime.fromIsoString(snap._ValidFrom);
                    }
                    startDate = Rally.util.DateTime.fromIsoString(snap._ValidFrom);
                    if(new Date(snap._ValidTo) > new Date()){
                        endDate = new Date();
                    }else{
                        endDate = Rally.util.DateTime.fromIsoString(snap._ValidTo);
                    }
                    cycleTime += Rally.util.DateTime.getDifference(endDate,startDate,'second');
                }

             }
        }, this);

        if (cycleTime < 1){
            cycleTime = null;
        }

        if (cycleTime) {
            cycleTime = cycleTime / CArABU.technicalservices.CycleTimeCalculator.getGranularityMultiplier(CArABU.technicalservices.CycleTimeCalculator.granularity);
            cycleTime = cycleTime.toFixed(CArABU.technicalservices.CycleTimeCalculator.precision);
        }

        return { cycleTime: cycleTime, endDate: endDate, startDate: initalStartDate};
       
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

        return Ext.util.Format.round(timeInState,CArABU.technicalservices.CycleTimeCalculator.precision);
    },
    getRenderedTimeInStateValue: function(timeInStateData, stateName, stateValue, noDataText){

            var timeData = timeInStateData && timeInStateData[stateName];
            if (timeData && stateValue){
                timeData = timeData[stateValue];
            }

            if (!timeData || timeData.length === 0){
                return noDataText;
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