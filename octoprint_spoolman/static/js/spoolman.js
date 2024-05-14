$(function() {
    function SpoolmanViewModel(parameters) {
        var self = this;

        self.settings = parameters[0];

        self.id = ko.observable('-');
        self.name = ko.observable('-');
        self.material = ko.observable('-');
        self.vendor = ko.observable('-');
        self.weight = ko.observable('-');
        self.color_hex = ko.observable('FF0000');

        self.selected = function(data, event) {
            OctoPrint.simpleApiCommand("spoolman", "selected", {"id": parseInt(event.target.id)})
                .done(function(response) {
                    if (response != null) {
                        self.id(response["id"]);
                        self.name(response["filament"]["name"]);
                        self.material(response["filament"]["material"]);
                        self.vendor(response["filament"]["vendor"]["name"]);
                        self.weight(parseInt(response["remaining_weight"]).toString().concat("g"));
                        self.color_hex('#' + response["filament"]["color_hex"].trim());
                    }
                });
        };

        self.clear = function(data, event) {
            OctoPrint.simpleApiCommand("spoolman", "clear", {"id": parseInt(event.target.id)})
                .done(function(response) {
                    self.id('-');
                    self.name('-');
                    self.material('-');
                    self.vendor('-');
                    self.weight('-');
                });
        };

        self.allSpools = ko.observableArray();
        self.pageNumber = ko.observable(0);
        self.nbPerPage = 10;
        self.totalPages = ko.computed(function() {
            var div = Math.floor(self.allSpools().length / self.nbPerPage);
            div += self.allSpools().length % self.nbPerPage > 0 ? 1 : 0;
            return div - 1;
        });

        self.spools = ko.computed(function() {
            var first = self.pageNumber() * self.nbPerPage;
            return self.allSpools.slice(first, first + self.nbPerPage);
        });
        self.hasPrevious = ko.computed(function() {
            return self.pageNumber() !== 0 ? "" : "disabled";
        });
        self.hasNext = ko.computed(function() {
            return self.pageNumber() !== self.totalPages() ? "" : "disabled";
        });
        self.next = function() {
            if(self.pageNumber() < self.totalPages()) {
                self.pageNumber(self.pageNumber() + 1);
            }
        }

        self.previous = function() {
            if(self.pageNumber() != 0) {
                self.pageNumber(self.pageNumber() - 1);
            }
        }

        self.getActive = ko.computed(function() {
            if (self.id() == '-') {
                return -1;
            }
            return self.id();
        });

        self.onBeforeBinding = function() {
            $.get("/api/plugin/spoolman", null, self.allSpools, 'json');
            OctoPrint.simpleApiCommand("spoolman", "getselected")
                .done(function(response) {
                    if (response != null) {
                        self.id(response["id"]);
                        self.name(response["filament"]["name"]);
                        self.material(response["filament"]["material"]);
                        self.vendor(response["filament"]["vendor"]["name"]);
                        self.weight(parseInt(response["remaining_weight"]).toString().concat("g"));
                        self.color_hex('#' + response["filament"]["color_hex"].trim());
                    }
                    console.log(self.color_hex());
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
