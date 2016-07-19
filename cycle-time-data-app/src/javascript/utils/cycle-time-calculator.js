Ext.define('CArABU.technicalservices.CycleTimeCalculator',{
    singleton: true,

    getTimeInStateData: function(snapshots, field, value, dateField, granularity){
        snapshots = _.sortBy(snapshots, dateField);

        if (!granularity){
            granularity = "minute";
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
                console.log('snap transition out of state',snap)
                info[idx].push(thisDate);
                idx++;
                inState = false;
            } else if (!inState && snap[field] === value){
                console.log('snap transition into state',snap)
                info[idx] = [thisDate];
                inState = true;
            }
        });

        return info

    },
    getCycleTimeData: function(snaps, field, startValue, endValue, precedence, granularity){
        var start_index = -1;

        if (!granularity){
            granularity = "minute";
        }

        if (! Ext.isEmpty(startValue)){  //This is in case there is no start value (which means grab the first snapshot)
            start_index = _.indexOf(precedence, startValue);
        }
        var end_index = _.indexOf(precedence, endValue);

        //Assumes snaps are stored in ascending date order.
        var start_date = null, end_date = null;

        var previous_state_index = -1;
        var state_index = -1;
        var cycleTime = null;

        if ( start_index == -1 ) {
            start_date = Rally.util.DateTime.fromIsoString(snaps[0]._ValidFrom);
        }

        Ext.each(snaps, function(snap){
            var thisDate = Rally.util.DateTime.fromIsoString(snap._ValidFrom);
            if (snap[field]){
                previous_state_index = state_index;
                state_index = _.indexOf(precedence, snap[field]);
            } else {
                if (previous_state_index > 0){
                    //the field was cleared out
                    state_index = -1;
                }
            }
            if (state_index >= start_index && previous_state_index < start_index && start_index > -1){
                start_date = thisDate;
            }
            if (state_index >= end_index && previous_state_index < end_index){
                end_date = thisDate;

                if (start_date != null){
                    cycleTime = Rally.util.DateTime.getDifference(end_date,start_date,granularity);
                }
            }
            console.log('start',start_date, end_date, cycleTime);

        }, this);

        return {objectID: snaps[0].ObjectID, cycleTime: cycleTime, endDate: end_date, startDate: start_date };
    }
});