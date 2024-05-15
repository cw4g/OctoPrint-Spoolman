$(function() {
    PLUGIN_ID = "spoolman";

    function showDialog(dialogId, confirmFunction){
        // show dialog
        // sidebar_deleteFilesDialog
        var myDialog = $(dialogId);
        var confirmButton = $("button.btn-confirm", myDialog);
        var cancelButton = $("button.btn-cancel", myDialog);
        //var dialogTitle = $("h3.modal-title", editDialog);

        confirmButton.unbind("click");
        confirmButton.bind("click", function() {
            confirmFunction(myDialog);
        });
        myDialog.modal({
            //minHeight: function() { return Math.max($.fn.modal.defaults.maxHeight() - 80, 250); }
        }).css({
            width: 'auto',
            'margin-left': function() { return -($(this).width() /2); }
        });
    }

    function SpoolmanViewModel(parameters) {
        var self = this;

        self.settings = parameters[0];
        self.printerStateViewModel = parameters[1];
        self.filesViewModel = parameters[2];

        self.activeSpool = ko.observable(null);

        const startPrint = self.printerStateViewModel.print;
        const newStartPrint = function confirmSpoolSelectionBeforeStartPrint() {
            showDialog("#navbar_spoolDialog", function(dialog) {
                startPrint();
                dialog.modal('hide');
            });
        };
        self.printerStateViewModel.print = newStartPrint;

        const loadFile = self.filesViewModel.loadFile;
        const newLoadFile = function confirmSpoolSelectionBeforeLoadFile(data, printAfterLoad) {
            showDialog("#navbar_spoolDialog", function(dialog) {
                loadFile(data, printAfterLoad);
                dialog.modal('hide');
            });
        };
        self.filesViewModel.loadFile = newLoadFile;

        self.selected = function(data, event) {
            OctoPrint.simpleApiCommand("spoolman", "selected", {"id": parseInt(event.target.id)}) .done(function(response) { if (response != null) {
                        self.activeSpool(response);
                    }
                });
        };

        self.clear = function(data, event) {
            OctoPrint.simpleApiCommand("spoolman", "clear", {"id": parseInt(event.target.id)})
                .done(function(response) {
                    self.activeSpool(null);
                });
        };

        self.getActive = function() {
            if (self.activeSpool === null) {
                return -1;
            }
            return self.activeSpool().id;
        }

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

        self.onBeforeBinding = function() {
            console.log(self.printerStateViewModel);
            $.get("/api/plugin/spoolman", null, self.allSpools, 'json');
            OctoPrint.simpleApiCommand("spoolman", "getselected")
                .done(function(response) {
                    if (response != null) {
                        self.activeSpool(response);
                    }
                });
        }

        self.onDataUpdaterPluginMessage = function(plugin, data) {
            if (plugin != PLUGIN_ID) {
                return;
            }

            if (data.action == "update spools") {
                console.log("update spools");
                $.get("/api/plugin/spoolman", null, self.allSpools, 'json');
                OctoPrint.simpleApiCommand("spoolman", "getselected")
                    .done(function(response) {
                        if (response != null) {
                            self.activeSpool(response);
                        }
                    });
            }
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
        ["settingsViewModel", "printerStateViewModel", "filesViewModel"],

        // Finally, this is the list of selectors for all elements we want this view model to be bound to.
        ["#tab_plugin_spoolman", "#sidebar_plugin_spoolman", "#navbar_spoolDialog"]
    ]);
});
