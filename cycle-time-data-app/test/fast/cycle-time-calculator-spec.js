describe("Using the Cycle Time Calculator",function() {
    var date1 = new Date(2016,08,07,0,0,0);
    var date2 = new Date(2016,08,08,14,0,0);
    var date3 = new Date(2016,08,08,23,59,0);
    var date4 = new Date(2016,08,09,7,7,0);
    var date5 = new Date(2016,08,09,23,59,0);
    var date6 = new Date(2016,08,10,0,0,0);
    var date7 = new Date(2016,08,10,23,59,0);
    var date8 = new Date(2016,08,15,0,0,0);
    var date9 = new Date(2016,08,16,0,0,0);
    var date10 = new Date(2016,08,23,0,0,0);
    var date11 = new Date(2016,10,25,0,0,0);
    var date12 = new Date(2016,10,27,0,0,0);

    //getTimeInStateData: function(snapshots, field, value, dateField){
    //returns [
    //    [startDate, endDate],
    //    [startDate, EndDate]
    //];

    //describe("When getting timeInState data",function(){
    //    it('should return an array of days without weekends', function(){
    //        var date1 = first_saturday_begin;
    //        var date2 = third_monday_begin;
    //        var array_of_days = Rally.technicalservices.util.Utilities.arrayOfDaysBetween(date1,date2,true);
    //        expect( array_of_days.length ).toEqual(11);
    //        expect( array_of_days[0] ).toEqual(first_monday_begin);
    //        expect( array_of_days[10] ).toEqual(third_monday_begin);
    //
    //    });
    //});

    //getCycleTimeData: function(snaps, field, startValue, endValue, precedence)
    //returns { cycleTime: cycleTime, endDate: endDate, startDate: startDate};
     describe("When getting cycle time data", function(){
        it ('should calculate the cycle time start and end dates correctly', function(){
            var precedence= ["",'Intake','Analysis','Refinement','Build','Test','Demo','Done','Archive'],
                snaps = [
                    { ThisState: '' , _ValidFrom: date1 },
                    { ThisState: 'Done' , _ValidFrom: date2 },
                    { ThisState: 'Intake' , _ValidFrom: date3 },
                    { ThisState: 'Analysis' , _ValidFrom: date4 },
                    { ThisState: 'Demo' , _ValidFrom: date5 },
                    { ThisState: 'Done' , _ValidFrom: date6 }
                ]
            CArABU.technicalservices.CycleTimeCalculator.precision = 2;
            CArABU.technicalservices.CycleTimeCalculator.granularity = 'day';

            var cycleTime = CArABU.technicalservices.CycleTimeCalculator.getCycleTimeData(snaps, "ThisState","Refinement","Done",precedence);
            expect( cycleTime.startDate ).toEqual(date2);
            expect( cycleTime.endDate ).toEqual(date6);

            var diff = (Rally.util.DateTime.getDifference(date6,date2,'second')/86400).toFixed(2);
            expect( cycleTime.cycleTime).toEqual(diff);

        });


        it ('should count the cycle time accurately', function(){

            var precedence= ["",'StateA','StateB','StateC','StateD'],
                snaps = [
                { ThisState: '' , _ValidFrom: date1 },
                { ThisState: 'StateA' , _ValidFrom: date2 },
                { ThisState: 'StateB' , _ValidFrom: date3 },
                { ThisState: 'StateC' , _ValidFrom: date4 },
                { ThisState: 'StateD' , _ValidFrom: date5 }
            ]
            CArABU.technicalservices.CycleTimeCalculator.precision = 2;
            CArABU.technicalservices.CycleTimeCalculator.granularity = 'day';

            var cycleTime = CArABU.technicalservices.CycleTimeCalculator.getCycleTimeData(snaps, "ThisState","StateA","StateD",precedence);
            expect( cycleTime.startDate ).toEqual(date2);
            expect( cycleTime.endDate ).toEqual(date5);

            var diff = (Rally.util.DateTime.getDifference(date5,date2,'second')/86400).toFixed(2);
            expect( cycleTime.cycleTime).toEqual(diff);

        });
         it ('should count the time in no state accurately', function(){

             var precedence= ["",'StateA','StateB','StateC','StateD'],
                 snaps = [
                     { ThisState: '' , _ValidFrom: date1 },
                     { ThisState: 'StateA' , _ValidFrom: date2 },
                     { ThisState: '' , _ValidFrom: date3 },
                     { ThisState: 'StateB' , _ValidFrom: date4 },
                     { ThisState: 'StateC' , _ValidFrom: date5 },
                     { ThisState: 'StateD' , _ValidFrom: date6 }
                 ];
             CArABU.technicalservices.CycleTimeCalculator.precision = 2;
             CArABU.technicalservices.CycleTimeCalculator.granularity = 'day';

             var cycleTime = CArABU.technicalservices.CycleTimeCalculator.getCycleTimeData(snaps, "ThisState","","StateD",precedence);
             expect( cycleTime.startDate ).toEqual(date1);
             expect( cycleTime.endDate ).toEqual(date6);

             var diff = (Rally.util.DateTime.getDifference(date6,date1,'second')/86400).toFixed(2);
             expect( cycleTime.cycleTime).toEqual(diff);

         });

         it ('should handle skipped states properly', function(){

             var precedence= ["",'StateA','StateB','StateC','StateD'],
                 snaps = [
                     { ThisState: '' , _ValidFrom: date1 },
                     { ThisState: 'StateA' , _ValidFrom: date2 },
                     { ThisState: '' , _ValidFrom: date3 },
                     { ThisState: 'StateD' , _ValidFrom: date6 }
                 ];
             CArABU.technicalservices.CycleTimeCalculator.precision = 2;
             CArABU.technicalservices.CycleTimeCalculator.granularity = 'day';

             var cycleTime = CArABU.technicalservices.CycleTimeCalculator.getCycleTimeData(snaps, "ThisState","","StateC",precedence);
             expect( cycleTime.startDate ).toEqual(date1);
             expect( cycleTime.endDate ).toEqual(date6);

             var diff = (Rally.util.DateTime.getDifference(date6,date1,'second')/86400).toFixed(2);
             expect( cycleTime.cycleTime).toEqual(diff);
         });

         it ('should not calculate cycletime when its left the end state', function(){

             var precedence= ["",'StateA','StateB','StateC','StateD'],
                 snaps = [
                     { ThisState: '' , _ValidFrom: date1 },
                     { ThisState: 'StateA' , _ValidFrom: date2 },
                     { ThisState: '' , _ValidFrom: date3 },
                     { ThisState: 'StateD' , _ValidFrom: date6 },
                     { ThisState: 'StateB' , _ValidFrom: date7 }
                 ];
             CArABU.technicalservices.CycleTimeCalculator.precision = 2;
             CArABU.technicalservices.CycleTimeCalculator.granularity = 'day';

             var cycleTime = CArABU.technicalservices.CycleTimeCalculator.getCycleTimeData(snaps, "ThisState","","StateC",precedence);
             expect( cycleTime.startDate ).toEqual(date1);
             expect( cycleTime.endDate ).toEqual(date6);
             expect( cycleTime.cycleTime).toEqual(null);

         });

    });

    it ('should calculate time in no state properly', function(){
        var snaps = [
                { ThisState: '' , _ValidFrom: date1 },
                { ThisState: 'StateA' , _ValidFrom: date2 },
                { ThisState: '' , _ValidFrom: date3 },
                { ThisState: 'StateD' , _ValidFrom: date6 }
            ];
        CArABU.technicalservices.CycleTimeCalculator.precision = 2;
        CArABU.technicalservices.CycleTimeCalculator.granularity = 'day';

        var diff = ((Rally.util.DateTime.getDifference(date2,date1,'second')/86400) + (Rally.util.DateTime.getDifference(date6,date3,'second')/86400)).toFixed(2);

        var timeInStateData = CArABU.technicalservices.CycleTimeCalculator.getTimeInStateData(snaps, "ThisState","","_ValidFrom");
        var timeInState = CArABU.technicalservices.CycleTimeCalculator.calculateTimeInState(timeInStateData);

        expect(timeInState).toEqual(diff);
    });

    it ('should skip states properly', function(){
        var precedence= ['StateA','StateB','StateC','StateD','StateE'],
            snaps = [
            { ThisState: 'StateA' , _ValidFrom: date1 },
            { ThisState: 'StateC' , _ValidFrom: date2 },
            { ThisState: 'StateA' , _ValidFrom: date3 },
            { ThisState: 'StateE' , _ValidFrom: date4 }
        ];
        CArABU.technicalservices.CycleTimeCalculator.precision = 2;
        CArABU.technicalservices.CycleTimeCalculator.granularity = 'day';

        var cycleTime = CArABU.technicalservices.CycleTimeCalculator.getCycleTimeData(snaps, "ThisState","StateB","StateD",precedence);
        var diff = (Rally.util.DateTime.getDifference(date4,date2,'second')/86400);

        expect( cycleTime.startDate ).toEqual(date2);
        expect( cycleTime.endDate ).toEqual(date4);
        expect( cycleTime.cycleTime).toEqual(diff.toFixed(2));
    });

    //getLastEndDate: function(timeInStateData, stateName, stateValue)
    //returns null or <date>
    describe("When getting the last end date", function(){
        it ('it should return the last time that the object enters the end state', function(){
            var timeInStateData = {
                stateName1: {
                    stateA: [[date1,date2],[date5,date6]],
                    stateB: [[date3,date4]],
                    stateC: [[date7,date8],[date11]]
                }
            };

            expect( CArABU.technicalservices.CycleTimeCalculator.getLastEndDate(timeInStateData,'stateName1','stateA') ).toEqual(date5);
            expect( CArABU.technicalservices.CycleTimeCalculator.getLastEndDate(timeInStateData,'stateName1','stateB') ).toEqual(date3);
            expect( CArABU.technicalservices.CycleTimeCalculator.getLastEndDate(timeInStateData,'stateName1','stateC') ).toEqual(date11);
        });
    });

    //etFirstStartDate: function(timeInStateData, stateName, stateValue)
    //returns null or <date>
    describe("When getting last end date",function(){
        it ('it should return the last time that the object enters the end state', function() {
            var timeInStateData = {
                stateName1: {
                    stateA: [[date1, date2], [date5, date6]],
                    stateB: [[date3, date4]],
                    stateC: [[date7, date8], [date11]]
                }
            };

            expect(CArABU.technicalservices.CycleTimeCalculator.getFirstStartDate(timeInStateData, 'stateName1', 'stateA')).toEqual(date1);
            expect(CArABU.technicalservices.CycleTimeCalculator.getFirstStartDate(timeInStateData, 'stateName1', 'stateB')).toEqual(date3);
            expect(CArABU.technicalservices.CycleTimeCalculator.getFirstStartDate(timeInStateData, 'stateName1', 'stateC')).toEqual(date7);
        });
    });


});