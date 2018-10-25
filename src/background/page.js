var page = {};

// special information for every tab
page.tabs = {};

page.currentTabId = -1;
page.blockedTabs = {};

page.initSettings = function() {
	return new Promise((resolve, reject) => {
		browser.storage.local.get({'settings': {}}).then((item) => {
			page.settings = item.settings;
			if(!("checkUpdateKeePassHttp" in page.settings)) {
				page.settings.checkUpdateKeePassHttp = 3;
			}
			if(!("autoCompleteUsernames" in page.settings) || page.settings.autoCompleteUsernames === 1) {
				page.settings.autoCompleteUsernames = true;
			}
			if(!("autoFillAndSend" in page.settings) || page.settings.autoFillAndSend === 1) {
				page.settings.autoFillAndSend = true;
			}
			if(!("usePasswordGenerator" in page.settings) || page.settings.usePasswordGenerator === 1) {
				page.settings.usePasswordGenerator = true;
			}
			if(!("autoFillSingleEntry" in page.settings)) {
				page.settings.autoFillSingleEntry = false;
			}
			if(!("autoRetrieveCredentials" in page.settings) || page.settings.autoRetrieveCredentials === 1) {
				page.settings.autoRetrieveCredentials = true;
			}
			if(!("hostname" in page.settings)) {
				page.settings.hostname = "localhost";
			}
			if(!("port" in page.settings)) {
				page.settings.port = "19455";
			}
			if(!("supressAlerts" in page.settings)) {
				page.settings.supressAlerts = true;
			}
			if(!("respectMaxLength" in page.settings)) {
				page.settings.respectMaxLength = false;
			}
			browser.storage.local.set({'settings': page.settings});
			resolve(page.settings);
		});
	});
}

page.initOpenedTabs = function () {
	return new Promise((resolve, reject) => {
		browser.tabs.query({}).then(function (tabs) {
			for (var i = 0; i < tabs.length; i++) {
				page.createTabEntry(tabs[i].id);
			}

			// set initial tab-ID
			browser.tabs.query({ "active": true, "currentWindow": true }).then(function (tabs) {
				if (tabs.length === 0) {
					resolve();
					return; // For example: only the background devtools or a popup are opened
				}
				page.currentTabId = tabs[0].id;
				browserAction.show(null, tabs[0]);
				resolve();
			});
		});
	});
}

page.isValidProtocol = function(url) {
	var protocol = url.substring(0, url.indexOf(":"));
	protocol = protocol.toLowerCase();
	return !(url.indexOf(".") == -1 || (protocol != "http" && protocol != "https" && protocol != "ftp" && protocol != "sftp"));
}

page.switchTab = function(callback, tab) {
	browserAction.showDefault(null, tab);

	browser.tabs.sendMessage(tab.id, {action: "activated_tab"});
}

page.clearCredentials = function(tabId, complete) {
	if(!page.tabs[tabId]) {
		return;
	}

	page.tabs[tabId].credentials = {};
	delete page.tabs[tabId].credentials;

	if(complete) {
		page.clearLogins(tabId);

		browser.tabs.sendMessage(tabId, {
			action: "clear_credentials"
		});
	}
}

page.clearLogins = function(tabId) {
	page.tabs[tabId].loginList = [];
}

page.createTabEntry = function(tabId) {
	//console.log("page.createTabEntry("+tabId+")");
	page.tabs[tabId] = {
		"stack": [],
		"errorMessage": null,
		"loginList": {}
	};
}

page.removePageInformationFromNotExistingTabs = function() {
	var rand = Math.floor(Math.random()*1001);
	if(rand == 28) {
		browser.tabs.query({}).then(function(tabs) {
			var $tabIds = {};
			var $infoIds = Object.keys(page.tabs);

			for(var i = 0; i < tabs.length; i++) {
				$tabIds[tabs[i].id] = true;
			}

			for(var i = 0; i < $infoIds.length; i++) {
				if(!($infoIds[i] in $tabIds)) {
					delete page.tabs[$infoIds[i]];
				}
			}
		});
	}
};

page.debugConsole = function() {
	if(arguments.length > 1) {
		console.log(page.sprintf(arguments[0], arguments));
	}
	else {
		console.log(arguments[0]);
	}
};

page.sprintf = function(input, args) {
	return input.replace(/{(\d+)}/g, function(match, number) {
		return typeof args[number] != 'undefined'
			? (typeof args[number] == 'object' ? JSON.stringify(args[number]) : args[number])
			: match;
	});
}

page.debugDummy = function() {};

page.debug = page.debugDummy;

page.setDebug = function(bool) {
	if(bool) {
		page.debug = page.debugConsole;
		return "Debug mode enabled";
	}
	else {
		page.debug = page.debugDummy;
		return "Debug mode disabled";
	}
};
