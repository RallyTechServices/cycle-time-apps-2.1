describe("Cycle Time Tests with Snapshots", function() {
    var calc = null;
    var precedence = ["Not Groomed","Defined","In Progress","Completed","Accepted"];
    var precedence1 = ["(No State)","","Analysis","Development","Accepting"];
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
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence,calc.acceptableProjects,"ScheduleState","Defined");
        // cycleTime: , endDate: , startDate:
        expect(result.cycleTime).toEqual('5');
    });

    it('should calculate cycle time', function() {
        var snaps = [
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: false, ScheduleState : "Not Groomed",
                _ValidFrom : "2017-10-23T20:12:28.034Z", _ValidTo : "2017-10-24T20:12:29.034Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: true, ScheduleState : "Defined",
                _ValidFrom : "2017-10-24T20:12:29.034Z", _ValidTo : "2017-10-24T20:17:29.041Z"
            }
        ];
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence,calc.acceptableProjects,"ScheduleState","Defined");
        // cycleTime: , endDate: , startDate:
        expect(result.cycleTime).toEqual('1440');
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
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence,calc.acceptableProjects,"ScheduleState","Defined");
        // cycleTime: , endDate: , startDate:
        expect(result.cycleTime).toEqual('1445');
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
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence,calc.acceptableProjects,"ScheduleState","Defined");
        // cycleTime: , endDate: , startDate:
        expect(result.cycleTime).toEqual('1445');
    });

    it('should determine cycle time if in state with ready and extra snapshot', function() {
        var snaps = [
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: false, ScheduleState : "Not Groomed",
                _ValidFrom : "2017-10-23T10:10:10.000Z", _ValidTo : "2017-10-24T10:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: false, ScheduleState : "Not Groomed",
                _ValidFrom : "2017-10-24T10:10:10.000Z", _ValidTo : "2017-10-25T10:10:10.000Z"
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
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence,calc.acceptableProjects,"ScheduleState","Defined");
        // cycleTime: , endDate: , startDate:
        expect(result.cycleTime).toEqual('2880');
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
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence,calc.acceptableProjects,"ScheduleState","Defined");
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
                _ValidFrom : "2017-10-24T10:10:10.000Z", _ValidTo : "2017-10-25T10:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: project_we_care_about, Ready: true, ScheduleState : "Defined",
                _ValidFrom : "2017-10-25T10:10:10.000Z", _ValidTo : "2017-10-26T:10:10.000Z"
            }
        ];
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence,calc.acceptableProjects,"ScheduleState","Defined");
        // cycleTime: , endDate: , startDate:
        expect(result.cycleTime).toEqual('1440');
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
                _ValidFrom : "2017-10-24T10:10:10.000Z", _ValidTo : "2017-10-25T10:10:10.000Z"
            },
            {   Blocked: false, FormattedID: "US3747", ObjectID: 167488920516,
                Project: 2, Ready: true, ScheduleState : "Defined",
                _ValidFrom : "2017-10-25T10:10:10.000Z", _ValidTo : "2017-10-26T:10:10.000Z"
            }
        ];
        var result = calc.getCycleTimeData(snaps, "ScheduleState", "Not Groomed", "Defined", precedence,calc.acceptableProjects,"ScheduleState","Defined");
        // cycleTime: , endDate: , startDate:
        expect(result.cycleTime).toEqual('1440');
    });

    it('should only care about time in the "good" project (if had good states in our project)', function() {
        var project_we_care_about = 1;
        var snaps = [    {
                          "_ValidFrom": "2017-10-24T23:32:13.096Z",
                          "_ValidTo": "2017-10-24T23:33:11.799Z",
                          "_PreviousValues": {
                            "Ready": null,
                            "Blocked": null
                          },
                          "ObjectID": 167902018072,
                          "Project": 2,
                          "Ready": false,
                          "Blocked": false,
                          "ScheduleState": "Defined",
                          "FormattedID": "US23"
                        },
                        {
                          "_ValidFrom": "2017-10-24T23:33:11.799Z",
                          "_ValidTo": "2017-10-24T23:34:13.147Z",
                          "ObjectID": 167902018072,
                          "Project": 1,
                          "Ready": false,
                          "Blocked": false,
                          "ScheduleState": "Defined",
                          "FormattedID": "US23"
                        },
                        {
                          "_ValidFrom": "2017-10-24T23:34:13.147Z",
                          "_ValidTo": "2017-10-24T23:35:11.202Z",
                          "ObjectID": 167902018072,
                          "Project": 2,
                          "Ready": false,
                          "Blocked": false,
                          "ScheduleState": "Defined",
                          "FormattedID": "US23"
                        },
                        {
                          "_ValidFrom": "2017-10-24T23:35:11.202Z",
                          "_ValidTo": "2017-10-24T23:36:11.737Z",
                          "ObjectID": 167902018072,
                          "Project": 1,
                          "Ready": false,
                          "Blocked": false,
                          "ScheduleState": "Defined",
                          "FormattedID": "US23"
                        },
                        {
                          "_ValidFrom": "2017-10-24T23:36:11.737Z",
                          "_ValidTo": "2017-10-24T23:37:13.919Z",
                          "_PreviousValues": {
                            "c_BFDevelopmentState": null
                          },
                          "ObjectID": 167902018072,
                          "Project": 1,
                          "Ready": false,
                          "Blocked": false,
                          "ScheduleState": "In-Progress",
                          "c_BFDevelopmentState": "Analysis",
                          "FormattedID": "US23"
                        },
                        {
                          "_ValidFrom": "2017-10-24T23:37:13.919Z",
                          "_ValidTo": "2017-10-24T23:38:12.872Z",
                          "ObjectID": 167902018072,
                          "Project": 1,
                          "Ready": false,
                          "Blocked": false,
                          "ScheduleState": "In-Progress",
                          "c_BFDevelopmentState": "Analysis",
                          "FormattedID": "US23"
                        },
                        {
                          "_ValidFrom": "2017-10-24T23:38:12.872Z",
                          "_ValidTo": "2017-10-24T23:39:11.148Z",
                          "_PreviousValues": {
                            "c_BFDevelopmentState": "Analysis"
                          },
                          "ObjectID": 167902018072,
                          "Project": 1,
                          "Ready": false,
                          "Blocked": false,
                          "ScheduleState": "In-Progress",
                          "c_BFDevelopmentState": "Development",
                          "FormattedID": "US23"
                        },
                        {
                          "_ValidFrom": "2017-10-24T23:39:11.148Z",
                          "_ValidTo": "2017-10-24T23:40:13.283Z",
                          "_PreviousValues": {
                            "Blocked": false
                          },
                          "ObjectID": 167902018072,
                          "Project": 1,
                          "Ready": false,
                          "Blocked": true,
                          "ScheduleState": "In-Progress",
                          "c_BFDevelopmentState": "Development",
                          "FormattedID": "US23"
                        },
                        {
                          "_ValidFrom": "2017-10-24T23:40:13.283Z",
                          "_ValidTo": "2017-10-24T23:41:11.040Z",
                          "_PreviousValues": {
                            "Blocked": true,
                            "c_BFDevelopmentState": "Development"
                          },
                          "ObjectID": 167902018072,
                          "Project": 1,
                          "Ready": false,
                          "Blocked": false,
                          "ScheduleState": "Completed",
                          "c_BFDevelopmentState": "Accepting",
                          "FormattedID": "US23"
                        },
                        {
                          "_ValidFrom": "2017-10-24T23:41:11.040Z",
                          "_ValidTo": "2017-10-24T23:41:16.960Z",
                          "_PreviousValues": {
                            "Ready": false
                          },
                          "ObjectID": 167902018072,
                          "Project": 1,
                          "Ready": true,
                          "Blocked": false,
                          "ScheduleState": "Completed",
                          "c_BFDevelopmentState": "Accepting",
                          "FormattedID": "US23"
                        },
                        {
                          "_ValidFrom": "2017-10-24T23:41:16.960Z",
                          "_ValidTo": "2017-10-24T23:46:56.045Z",
                          "_PreviousValues": {
                            "Ready": true
                          },
                          "ObjectID": 167902018072,
                          "Project": 1,
                          "Ready": false,
                          "Blocked": false,
                          "ScheduleState": "Accepted",
                          "c_BFDevelopmentState": "Accepting",
                          "AcceptedDate": "2017-10-24T23:41:16.159Z",
                          "FormattedID": "US23"
                        },
                        {
                          "_ValidFrom": "2017-10-24T23:46:56.045Z",
                          "_ValidTo": "9999-01-01T00:00:00.000Z",
                          "ObjectID": 167902018072,
                          "Project": 1,
                          "Ready": false,
                          "Blocked": false,
                          "ScheduleState": "Accepted",
                          "c_BFDevelopmentState": "Accepting",
                          "AcceptedDate": "2017-10-24T23:41:16.159Z",
                          "FormattedID": "US23"
                        }
        ];
        var result = calc.getCycleTimeData(snaps, "c_BFDevelopmentState", "", "Accepting", precedence1,calc.acceptableProjects,"c_BFDevelopmentState","Accepting");
        // cycleTime: , endDate: , startDate:
        console.log(result.endDate,result.startDate, result.cycleTime);
        expect(result.cycleTime).toEqual(1440);
    });

});
