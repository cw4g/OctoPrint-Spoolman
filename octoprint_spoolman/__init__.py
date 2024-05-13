# coding=utf-8
from __future__ import absolute_import

### (Don't forget to remove me)
# This is a basic skeleton for your plugin's __init__.py. You probably want to adjust the class name of your plugin
# as well as the plugin mixins it's subclassing from. This is really just a basic skeleton to get you started,
# defining your plugin as a template plugin, settings and asset plugin. Feel free to add or remove mixins
# as necessary.
#
# Take a look at the documentation on what other plugin mixins are available.
import urllib3
import requests
import requests_openapi
import flask

import octoprint.plugin
from octoprint.events import Events
from octoprint_spoolman.newodometer import NewFilamentOdometer

class SpoolmanPlugin(octoprint.plugin.StartupPlugin,
                     octoprint.plugin.SettingsPlugin,
                     octoprint.plugin.AssetPlugin,
                     octoprint.plugin.TemplatePlugin,
                     octoprint.plugin.SimpleApiPlugin,
                     octoprint.plugin.EventHandlerPlugin
                    ):

    def initialize(self):
        self._logger.info("starting init")

        self.spools = []
        spoolman_url = self._settings.get(["url"])
        try:
            self.spoolman = requests_openapi.Client().load_spec_from_url(spoolman_url + "/openapi.json")
            self.spoolman.set_server(requests_openapi.Server(url=spoolman_url))
        #except (urllib3.exceptions.LocationParseError, requests.exceptions.InvalidURL):
        except (requests.exceptions.InvalidURL):
            self._logger.error("Can't connect to %s" % spoolman_url)

        self.filamentOdometer = NewFilamentOdometer()
        self.filamentOdometer.set_g90_extruder(self._settings.get_boolean(["feature", "g90InfluencesExtruder"]))

        self._logger.info("done init")

    ##~~

    def getSpools(self):
        resp = self.spoolman.Find_spool_spool_get() # resp: requests.Response
        return resp.json()

    def getActiveSpool(self):
        return next((sub for sub in self.getSpools() if sub['id'] == self._settings.get(["spool_id"])), None)

    def getSpoolId(self):
        return self._settings.get(["spool_id"])

    def setSpoolLengthUsed(self, length):
        id = self.getSpoolId()
        self._logger.info("Updating spool for %d", id)
        if id > 0:
            self.spoolman.Use_spool_filament_spool__spool_id__use_put(spool_id=id, json={"use_length": length})
        pass


    ##~~ StartupPlugin mixin

    def on_after_startup(self):
        self._logger.info("URL: %s" % self._settings.get(["url"]))
        self._logger.info("Spool ID: %s" % self._settings.get(["spool_id"]))
        for spool in self.getSpools():
            self._logger.info("spool.filament.name: %s" % spool["filament"]["name"])

    ##~~ SettingsPlugin mixin

    def get_settings_defaults(self):
        return dict(
            url="http://spoolman_host:port/api/v1",
            spool_id=-1
        )

    ##~~ AssetPlugin mixin

    def get_assets(self):
        # Define your plugin's asset files to automatically include in the
        # core UI here.
        return {
            "js": ["js/spoolman.js"],
            #"css": ["css/spoolman.css"],
            #"less": ["less/spoolman.less"]
        }

    ##~~ Template mixin

    def get_template_vars(self):
        return dict(spools=self.getSpools())

    def get_template_configs(self):
        return [
            dict(type="settings", custom_bindings=False)
        ]

    ##~~ SimpleApi mixin

    def get_api_commands(self):
        return dict(
            selected=["id"],
            getselected=[]
        )

    def on_api_command(self, command, data):
        if command == "selected":
            self._logger.info("selected called, id is {id}".format(**data))
            if isinstance(data.get("id"), int):
                self._logger.debug("id is integer")
                self._settings.set(["spool_id"], data.get("id"))
                self._settings.save()
                return flask.jsonify(self.getActiveSpool())
            else:
                self._logger.debug("id is not integer")
        elif command == "getselected":
            self._logger.info("get selected spool")
            return flask.jsonify(self.getActiveSpool())

    def on_api_get(self, request):
        spool = self.getActiveSpool()
        return flask.jsonify(self.getSpools())

    ##~~ Event mixin

    def on_event(self, event, payload):
        if (Events.CLIENT_OPENED == event):
            #self._on_clientOpened(payload)
            return
        if (Events.CLIENT_CLOSED == event):
            #self._on_clientClosed(payload)
            return

        elif (Events.PRINT_STARTED == event):
            #self.alreadyCanceled = False
            self.filamentOdometer.reset()

        #elif (Events.PRINT_PAUSED == event):
            #self._on_printJobFinished("paused", payload)

        elif (Events.PRINT_DONE == event):
            #self._on_printJobFinished("success", payload)
            # get the amount for tool0
            extrusion = self.filamentOdometer.getExtrusionAmount()[0]
            self._logger.info("Filament extrudes %f" % extrusion)
            self.setSpoolLengthUsed(extrusion)

        #elif (Events.PRINT_FAILED == event):
            #if self.alreadyCanceled == False:
                #self._on_printJobFinished("failed", payload)

            #elif (Events.PRINT_CANCELLED == event):
                #self.alreadyCanceled = True
                #self._on_printJobFinished("canceled", payload)
        pass


    ##~~ Softwareupdate hook

    def get_update_information(self):
        # Define the configuration for your plugin to use with the Software Update
        # Plugin here. See https://docs.octoprint.org/en/master/bundledplugins/softwareupdate.html
        # for details.
        return {
            "spoolman": {
                "displayName": "Spoolman Plugin",
                "displayVersion": self._plugin_version,

                # version check: github repository
                "type": "github_release",
                "user": "cw4g",
                "repo": "OctoPrint-Spoolman",
                "current": self._plugin_version,

                # update method: pip
                "pip": "https://github.com/cw4g/OctoPrint-Spoolman/archive/{target_version}.zip",
            }
        }

    ##~~ GCode hook

    def on_sentGCodeHook(self, comm_instance, phase, cmd, cmd_type, gcode, *args, **kwargs):
        self.filamentOdometer.processGCodeLine(cmd)
        pass


# If you want your plugin to be registered within OctoPrint under a different name than what you defined in setup.py
# ("OctoPrint-PluginSkeleton"), you may define that here. Same goes for the other metadata derived from setup.py that
# can be overwritten via __plugin_xyz__ control properties. See the documentation for that.
__plugin_name__ = "Spoolman"


# Set the Python version your plugin is compatible with below. Recommended is Python 3 only for all new plugins.
# OctoPrint 1.4.0 - 1.7.x run under both Python 3 and the end-of-life Python 2.
# OctoPrint 1.8.0 onwards only supports Python 3.
__plugin_pythoncompat__ = ">=3,<4"  # Only Python 3

def __plugin_load__():
    global __plugin_implementation__
    __plugin_implementation__ = SpoolmanPlugin()

    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
        "octoprint.comm.protocol.gcode.sent": __plugin_implementation__.on_sentGCodeHook
    }
