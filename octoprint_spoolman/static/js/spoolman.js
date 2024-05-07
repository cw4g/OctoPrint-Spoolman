$(function() {
    function SpoolmanViewModel(parameters) {
        var self = this;

        self.settings = parameters[0];

        // this will be called when the user clicks the "Go" button and set the iframe's URL to
        // the entered URL
        self.selected = function(data, event) {
            OctoPrint.simpleApiCommand("spoolman", "selected", {"id": event.target.id})
                .done(function(response) { });
        };

        // This will get called before the HelloWorldViewModel gets bound to the DOM, but after its
        // dependencies have already been initialized. It is especially guaranteed that this method
        // gets called _after_ the settings have been retrieved from the OctoPrint backend and thus
        // the SettingsViewModel been properly populated.
        self.onBeforeBinding = function() {
            //self.selected();
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
        ["#tab_plugin_spoolman"]
    ]);
});
