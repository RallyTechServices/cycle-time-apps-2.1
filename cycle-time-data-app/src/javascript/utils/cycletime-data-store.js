Ext.define('CArABU.technicalservices.CycleTimeDataStore',{
    logger: new Rally.technicalservices.Logger(),

    MAX_CHUNK_SIZE: 50,

    constructor: function(config){
        this.modelNames = config.modelNames;
        this.stateField = config.stateField;
        this.includeReady = config.includeReady || false;
        this.includeBlocked = config.includeBlocked || false;
        this.stateValues = config.stateValues || [];
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
        Ext.Array.each(records, function(r){
            var oid = r.get('ObjectID'),
                snapshots = resultsByOid[oid];

            var cycleTimeData = this._mungeSnapshots(snapshots);
            r.set("cycleTimeData",cycleTimeData);
        }, this);
        return records;
    },
    _mungeSnapshots: function(snapshots){
       var cycleTimeData =  {snaps: snapshots};

       cycleTimeData.blocked = CArABU.technicalservices.CycleTimeCalculator.getTimeInStateData(snapshots, "Blocked", true, "_ValidFrom","minute");
       cycleTimeData.ready = CArABU.technicalservices.CycleTimeCalculator.getTimeInStateData(snapshots, "Ready", true, "_ValidFrom","minute");
        var stateField = this.stateField;
        console.log('stateField', stateField, this.stateValues);
        cycleTimeData[stateField] = {};
        Ext.Array.each(this.stateValues, function(stateValue){
            if (stateValue.length === 0){
                stateValue = "Creation";
            }
            cycleTimeData[stateField][stateValue] = CArABU.technicalservices.CycleTimeCalculator.getTimeInStateData(snapshots,stateField, stateValue, "_ValidFrom");
        });

       return cycleTimeData;
    },
    _fetchChunk: function(objectIDs){
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.lookback.SnapshotStore',{
            fetch: this._getFetchList(),
            filters: [
                {
                    property: 'ObjectID',
                    operator: 'in',
                    value: objectIDs
                }
            ],
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
        var fetch = ['_ValidFrom','_ValidTo','ObjectID',this.stateField, "_PreviousValues." + this.stateField];
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
        return [];
    }

});