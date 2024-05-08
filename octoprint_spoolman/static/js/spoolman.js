$(function() {
    function SpoolmanViewModel(parameters) {
        var self = this;

        self.settings = parameters[0];

        self.id = ko.observable('-');
        self.name = ko.observable('-');
        self.material = ko.observable('-');
        self.vendor = ko.observable('-');
        self.weight = ko.observable('-');

        self.selected = function(data, event) {
            OctoPrint.simpleApiCommand("spoolman", "selected", {"id": parseInt(event.target.id)})
                .done(function(response) {
                    self.id(response["id"]);
                    self.name(response["filament"]["name"]);
                    self.material(response["filament"]["material"]);
                    self.vendor(response["filament"]["vendor"]["name"]);
                    self.weight(parseInt(response["remaining_weight"]).toString().concat("g"));
                });
        };

        self.refresh = function() {
            OctoPrint.simpleApiCommand("spoolman", "refresh")
                .done(function(response) { });
        };

        self.onBeforeBinding = function() {
            self.refresh();
            OctoPrint.simpleApiGet("spoolman")
                .done(function(response) {
                    self.id(response["id"]);
                    self.name(response["filament"]["name"]);
                    self.material(response["filament"]["material"]);
                    self.vendor(response["filament"]["vendor"]["name"]);
                    self.weight(parseInt(response["remaining_weight"]).toString().concat("g"));
                });
        }
    }

    // This is how our plugin registers itself with the application, by adding some configuration
    // information to the global variable OCTOPRINT_VIEWMODELS
    OCTOPRINT_VIEWMODELS.push([
        // This is the constructor to call for instantiating the plugin
        SpoolmanViewModel,

        // This is a list of dependencies to inject into the plugin, the order which you request
        // here is the order in which the dependencies will be injected into your view model upon
        // instantiation via the parameters argument
        ["settingsViewModel"],

        // Finally, this is the list of selectors for all elements we want this view model to be bound to.
        ["#tab_plugin_spoolman", "#sidebar_plugin_spoolman"]
    ]);
});
