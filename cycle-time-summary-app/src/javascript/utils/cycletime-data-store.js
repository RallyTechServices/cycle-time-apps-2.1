Ext.define('CArABU.technicalservices.CycleTimeDataStore',{
    logger: new Rally.technicalservices.Logger(),

    MAX_CHUNK_SIZE: 40,
    USE_POST: false,

    constructor: function(config){
        this.modelNames = config.modelNames;
        this.stateField = config.stateField;
        this.includeReady = config.includeReady || false;
        this.includeBlocked = config.includeBlocked || false;
        this.stateValues = config.stateValues || [];
        this.fromState = config.fromState;
        this.toState = config.toState;
        this.startDate = config.startDate || null;
        this.endDate = config.endDate || null;
        this.projects = config.projects || [];
        this.readyQueueState = config.readyQueueState;
    },

    load: function(records){
        var deferred = Ext.create('Deft.Deferred');

        var objectIDs = _.map(records, function(r){
            return r.get('ObjectID');
        });
        this.logger.log('objectIDs', objectIDs);
        var promises = [];
        for (var i=0; i < objectIDs.length; i = i+this.MAX_CHUNK_SIZE){
            var chunk = Ext.Array.slice(objectIDs, i, i + this.MAX_CHUNK_SIZE);
            promises.push(this._fetchChunk(chunk));
        }

        Deft.Promise.all(promises).then({
            success: function(results){
                this.logger.log('load Success', results);
                var snapsByOid = this._getSnapshotsByOid(results);
                var updatedRecords = this._updateRecords(snapsByOid, records);
                deferred.resolve(updatedRecords);
            },
            failure: function(msg){
                this.logger.log('load Failure', msg);
            },
            scope: this
        });

        return deferred;
    },
    _getSnapshotsByOid: function(results){
        results = _.flatten(results);
        var snapsByOid = {};
        Ext.Array.each(results, function(snap){
            var oid = snap.get('ObjectID');
            if (!snapsByOid[oid]){
                snapsByOid[oid] = [];
            }
            snapsByOid[oid].push(snap.getData());
        });
        return snapsByOid;
    },
    _updateRecords: function(resultsByOid, records){
        var updatedRecords = [];
        Ext.Array.each(records, function(r){
            var oid = r.get('ObjectID'),
                snapshots = resultsByOid[oid];

            var cycleTimeData = this._mungeCycleTimeData(snapshots);
            var timeInStateData = this._mungeTimeInStateData(snapshots);

            if (cycleTimeData && this._isCycleInDateRange(cycleTimeData, this.startDate, this.endDate)){
                r.set("cycleTimeData",cycleTimeData);
                r.set("timeInStateData", timeInStateData);
                updatedRecords.push(r);
            }

        }, this);
        return updatedRecords;
    },
    _isCycleInDateRange: function(cycleTimeData, startDate, endDate){
    //    console.log('_isCycleInDateRange', cycleTimeData.endDate, startDate, endDate);
        if (startDate && cycleTimeData.endDate < startDate){
            return false;
        }
        if (endDate && cycleTimeData.endDate > endDate){
            return false;
        }
        return true;

    },
    _mungeCycleTimeData: function(snapshots){
        if (!snapshots || snapshots.length === 0){
            return null;
        }
        var cycleTimeData = CArABU.technicalservices.CycleTimeCalculator.getCycleTimeData(snapshots, this.stateField, this.fromState, this.toState, this.stateValues);

        cycleTimeData.snaps = snapshots;

        return cycleTimeData;
    },
    _mungeTimeInStateData: function(snapshots){
        if (!snapshots || snapshots.length === 0){
            return null;
        }
       var timeInStateData =  {snaps: snapshots};

        timeInStateData.Blocked = CArABU.technicalservices.CycleTimeCalculator.getTimeInStateData(snapshots, "Blocked", true, "_ValidFrom",this.stateField,this.readyQueueState);
        timeInStateData.Ready = CArABU.technicalservices.CycleTimeCalculator.getTimeInStateData(snapshots, "Ready", true, "_ValidFrom",this.stateField, this.readyQueueState);
        var stateField = this.stateField;

        timeInStateData[stateField] = {};
        Ext.Array.each(this.stateValues, function(stateValue){
           timeInStateData[stateField][stateValue] = CArABU.technicalservices.CycleTimeCalculator.getTimeInStateData(snapshots,stateField, stateValue, "_ValidFrom");

        });

       return timeInStateData;
    },
    _fetchChunk: function(objectIDs){
        var deferred = Ext.create('Deft.Deferred');
        this.logger.log('_fetchChunks', objectIDs.length);

        Ext.create('Rally.data.lookback.SnapshotStore',{
            fetch: this._getFetchList(),
            filters: [
                // {
                //     property: 'ObjectID',endValue
                //     operator: 'in',
                //     value: objectIDs
                // }
                // ,
                {
                    property: 'ScheduleState',
                    operator: '<=',
                    value: 'Accepted'
                },
                {
                    property: 'Project',
                    operator: 'in',
                    value: this.projects
                }
            ],
            useHttpPost: this.USE_POST,
            sorters: [{
                property: 'ObjectID',
                direction: 'ASC'
            },{
                property: '_ValidFrom',
                direction: 'ASC'
            }],
            hydrate: this._getHydrateFields(),
            compress: true,
            removeUnauthorizedSnapshots: true
        }).load({
            callback: function(records, operation, success){
                if (success){
                    deferred.resolve(records);
                } else {
                    var msg = "Failure loading snapshots for objectIDs: " + objectIDs.join(', ') + ":  " + operation.error.errors.join(',');
                    deferred.resolve(msg);
                }
            }
        });
        return deferred;
    },
    _getFetchList: function(){
        var fetch = ['FormattedID','AcceptedDate','ScheduleState','_ValidFrom','_ValidTo','ObjectID',this.stateField, "_PreviousValues." + this.stateField];
        if (this.includeReady){
            fetch = fetch.concat(["Ready","_PreviousValues.Ready"]);
        }
        if (this.includeBlocked){
            fetch = fetch.concat(["Blocked","_PreviousValues.Blocked"]);
        }
        return fetch;
    },
    _getHydrateFields: function(){
        var hydratedFields = ["ScheduleState","State"];
        if (Ext.Array.contains(hydratedFields, this.stateField)){
            return [this.stateField, "_PreviousValues." + this.stateField];
        }
        return ['ScheduleState'];
    }

});
