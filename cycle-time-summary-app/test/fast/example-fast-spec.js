describe("Example test set", function() {
    it('should render the app', function() {
        var app = Rally.test.Harness.launchApp("cycle-time-summary-app");
        expect(app.getEl()).toBeDefined();
    });
});
