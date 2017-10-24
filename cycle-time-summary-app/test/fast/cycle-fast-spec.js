describe("Cycle Time Tests with Snapshots", function() {
    var calc = null;
    var precedence = ["Not Groomed","Defined","In Progress","Completed","Accepted"];
    var project_we_care_about = 1;

    beforeEach(function(){
        calc = CArABU.technicalservices.CycleTimeCalculator;
        calc.granularity = "minute";
        calc.acceptableProjects = [project_we_care_about]
    });

    it('should ignore items not in the final state', function() {
        var snaps = [
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: false, ScheduleState : "Not Groomed",
                _ValidFrom : "2017-10-23T20:12:28.034Z", _ValidTo : "2017-10-23T20:17:29.041Z"
            }
        ];
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence);
        // cycleTime: , endDate: , startDate:
        expect(result.cycleTime).toEqual(null);
    });

    it('should ignore items in the final state but missing ready', function() {
        var snaps = [
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: false, ScheduleState : "Not Groomed",
                _ValidFrom : "2017-10-23T20:12:28.034Z", _ValidTo : "2017-10-24T20:12:29.034Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: false, ScheduleState : "Defined",
                _ValidFrom : "2017-10-24T20:12:29.034Z", _ValidTo : "2017-10-24T20:17:29.041Z"
            }
        ];
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence);
        // cycleTime: , endDate: , startDate:
        expect(result.cycleTime).toEqual(null);
    });

    it('should determine cycle time if in state with ready', function() {
        var snaps = [
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: false, ScheduleState : "Not Groomed",
                _ValidFrom : "2017-10-23T20:12:28.034Z", _ValidTo : "2017-10-24T20:12:29.034Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: false, ScheduleState : "Defined",
                _ValidFrom : "2017-10-24T20:12:29.034Z", _ValidTo : "2017-10-24T20:17:29.041Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: true, ScheduleState : "Defined",
                _ValidFrom : "2017-10-24T20:17:29.041Z", _ValidTo : "9999-01-01T00:00:00.000Z"
            }
        ];
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence);
        // cycleTime: , endDate: , startDate:
        expect(result.cycleTime).toEqual(1445);
    });

    it('should determine cycle time if in state with ready and extra snapshot', function() {
        var snaps = [
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: false, ScheduleState : "Not Groomed",
                _ValidFrom : "2017-10-23T10:10:10.000Z", _ValidTo : "2017-10-24T10:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: false, ScheduleState : "Defined",
                _ValidFrom : "2017-10-24T10:10:10.000Z", _ValidTo : "2017-10-25T:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: true, ScheduleState : "Defined",
                _ValidFrom : "2017-10-25T10:10:10.000Z", _ValidTo : "2017-10-26T:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: true, ScheduleState : "Defined",
                _ValidFrom : "2017-10-26T10:10:10.000Z", _ValidTo : "9999-01-01T00:00:00.000Z"
            }
        ];
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence);
        // cycleTime: , endDate: , startDate:
        expect(result.cycleTime).toEqual(2880);
    });

    it('should ignore if in the wrong project', function() {
        var project_we_care_about = 1;
        var snaps = [
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: 2, Ready: false, ScheduleState : "Not Groomed",
                _ValidFrom : "2017-10-23T10:10:10.000Z", _ValidTo : "2017-10-24T10:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: 2, Ready: false, ScheduleState : "Defined",
                _ValidFrom : "2017-10-24T10:10:10.000Z", _ValidTo : "2017-10-25T:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: 2, Ready: true, ScheduleState : "Defined",
                _ValidFrom : "2017-10-25T10:10:10.000Z", _ValidTo : "2017-10-26T:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: 2, Ready: true, ScheduleState : "Defined",
                _ValidFrom : "2017-10-26T10:10:10.000Z", _ValidTo : "9999-01-01T00:00:00.000Z"
            }
        ];
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence);
        // cycleTime: , endDate: , startDate:
        expect(result.cycleTime).toEqual(null);
    });

    it('should only care about time in the "good" project', function() {
        var project_we_care_about = 1;
        var snaps = [
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: 2, Ready: false, ScheduleState : "Not Groomed",
                _ValidFrom : "2017-10-23T10:10:10.000Z", _ValidTo : "2017-10-24T10:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: false, ScheduleState : "Defined",
                _ValidFrom : "2017-10-24T10:10:10.000Z", _ValidTo : "2017-10-25T:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: true, ScheduleState : "Defined",
                _ValidFrom : "2017-10-25T10:10:10.000Z", _ValidTo : "2017-10-26T:10:10.000Z"
            }
        ];
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence);
        // cycleTime: , endDate: , startDate:
        expect(result.cycleTime).toEqual(1440);
    });

    it('should only care about time in the "good" project (changes)', function() {
        var project_we_care_about = 1;
        var snaps = [
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: 2, Ready: false, ScheduleState : "Not Groomed",
                _ValidFrom : "2017-10-23T10:10:10.000Z", _ValidTo : "2017-10-24T10:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: false, ScheduleState : "Defined",
                _ValidFrom : "2017-10-24T10:10:10.000Z", _ValidTo : "2017-10-25T:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: 2, Ready: true, ScheduleState : "Defined",
                _ValidFrom : "2017-10-25T10:10:10.000Z", _ValidTo : "2017-10-26T:10:10.000Z"
            }
        ];
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence);
        // cycleTime: , endDate: , startDate:
        expect(result.cycleTime).toEqual(null);
    });

    it('should only care about time in the "good" project (if had good states in our project)', function() {
        var project_we_care_about = 1;
        var snaps = [
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: 2, Ready: false, ScheduleState : "Not Groomed",
                _ValidFrom : "2017-10-23T10:10:10.000Z", _ValidTo : "2017-10-24T10:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: false, ScheduleState : "Defined",
                _ValidFrom : "2017-10-24T10:10:10.000Z", _ValidTo : "2017-10-24T:11:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: false, ScheduleState : "Defined",
                _ValidFrom : "2017-10-24T11:10:10.000Z", _ValidTo : "2017-10-25T:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: 2, Ready: true, ScheduleState : "Defined",
                _ValidFrom : "2017-10-25T10:10:10.000Z", _ValidTo : "2017-10-26T:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: true, ScheduleState : "Defined",
                _ValidFrom : "2017-10-26T10:10:10.000Z", _ValidTo : "2017-10-27T:10:10.000Z"
            }
        ];
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence);
        // cycleTime: , endDate: , startDate:
        expect(result.cycleTime).toEqual(1440);
    });

});
