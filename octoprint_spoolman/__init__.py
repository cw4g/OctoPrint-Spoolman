# coding=utf-8
from __future__ import absolute_import

### (Don't forget to remove me)
# This is a basic skeleton for your plugin's __init__.py. You probably want to adjust the class name of your plugin
# as well as the plugin mixins it's subclassing from. This is really just a basic skeleton to get you started,
# defining your plugin as a template plugin, settings and asset plugin. Feel free to add or remove mixins
# as necessary.
#
# Take a look at the documentation on what other plugin mixins are available.

import octoprint.plugin
import requests_openapi

class SpoolmanPlugin(octoprint.plugin.StartupPlugin,
    octoprint.plugin.SettingsPlugin,
    octoprint.plugin.AssetPlugin,
    octoprint.plugin.TemplatePlugin,
    octoprint.plugin.SimpleApiPlugin
):
    spools = []
    ##~~ StartupPlugin mixin

    def on_after_startup(self):
        spoolman_url = self._settings.get(["url"])
        self._logger.info("URL: %s" % spoolman_url)
        # load spec from url
        c = requests_openapi.Client().load_spec_from_url(spoolman_url + "/openapi.json")
        # set server
        c.set_server(requests_openapi.Server(url=spoolman_url))
        # call api by operation id
        resp = c.Find_spool_spool_get() # resp: requests.Response
        self.spools = resp.json()

        for spool in self.spools:
            self._logger.info("spool.filament.name: %s" % spool["filament"]["name"])

    ##~~ SettingsPlugin mixin

    def get_settings_defaults(self):
        return dict(url="http://spoolman.docker/api/v1")

    ##~~ AssetPlugin mixin

    def get_assets(self):
        # Define your plugin's asset files to automatically include in the
        # core UI here.
        return {
            "js": ["js/spoolman.js"],
            #"css": ["css/spoolman.css"],
            #"less": ["less/spoolman.less"]
        }

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

    ##~~ Template mixin

    def get_template_vars(self):
        return dict(spools=self.spools)

    def get_template_configs(self):
        return [
            dict(type="settings", custom_bindings=False)
        ]

    ##~~ SimpleApi mixin

    def get_api_commands(self):
        return dict(
            selected=["id"]
        )

    def on_api_command(self, command, data):
        import flask
        if command == "selected":
            self._logger.info("selected called, id is {id}".format(**data))

    def on_api_get(self, request):
        import flask
        return flask.jsonify(spools=self.spools)


# If you want your plugin to be registered within OctoPrint under a different name than what you defined in setup.py
# ("OctoPrint-PluginSkeleton"), you may define that here. Same goes for the other metadata derived from setup.py that
# can be overwritten via __plugin_xyz__ control properties. See the documentation for that.
__plugin_name__ = "Spoolman Plugin"


# Set the Python version your plugin is compatible with below. Recommended is Python 3 only for all new plugins.
# OctoPrint 1.4.0 - 1.7.x run under both Python 3 and the end-of-life Python 2.
# OctoPrint 1.8.0 onwards only supports Python 3.
__plugin_pythoncompat__ = ">=3,<4"  # Only Python 3

def __plugin_load__():
    global __plugin_implementation__
    __plugin_implementation__ = SpoolmanPlugin()

    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
    }
