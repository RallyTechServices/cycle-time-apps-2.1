Ext.define('CArABU.technicalservices.CycleTimeCalculator',{
    singleton: true,

    precision: 0,  //number of decimal mpoints
    granularity: 'day',

    getTimeInStateData: function(snapshots, field, value, dateField){
        snapshots = _.sortBy(snapshots, dateField);

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
        console.log('getTimeInStateData', field, value, snapshots[0].FormattedID, info);
        return info
    },

    getCycleTimeData: function(snaps, field, startValue, endValue, precedence){
        console.log('getCycleTimeData', snaps, field, startValue, endValue, precedence);
        var startIdx = -1;

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
            if (stateIdx >= startIdx && previousStateIdx < startIdx && startIdx > -1){
                startDate = thisDate;
            }
            if (stateIdx >= endIdx && previousStateIdx < endIdx){
                endDate = thisDate;

                if (startDate != null){
                    cycleTime = Rally.util.DateTime.getDifference(endDate,startDate,'second');
                }
            }

        }, this);

        if (cycleTime){
            cycleTime = cycleTime/CArABU.technicalservices.CycleTimeCalculator.getGranularityMultiplier(CArABU.technicalservices.CycleTimeCalculator.granularity);
            cycleTime = cycleTime.toFixed(CArABU.technicalservices.CycleTimeCalculator.precision);
        }
        return { cycleTime: cycleTime, endDate: endDate, startDate: startDate };
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
            console.log('calculateTimeInState', startDate, endDate);
            if (startDate && endDate){
                timeInState = timeInState + Rally.util.DateTime.getDifference(endDate, startDate, 'second');
            }

        });
        timeInState = timeInState/CArABU.technicalservices.CycleTimeCalculator.getGranularityMultiplier(CArABU.technicalservices.CycleTimeCalculator.granularity);

        return timeInState.toFixed(CArABU.technicalservices.CycleTimeCalculator.precision);
    }
});