
/* remember which is the current active identity 
	(so if a sudo is attempted more than once, 
	we switch between identities/priviledges) */

	var active_profile = 1;

	/* message passing port between 
		background and options page */

  var port_options = null;


/* actions jump table */

var actions = 
{
	"fb_cookies_mem": fb_cookies_mem, 
	"fb_cookies_snapsave": fb_cookies_snapsave,
	"fb_cookies_snapload": fb_cookies_snapload,
	"fb_cookies_clear": fb_cookies_clear,
	"fb_cookies_test": fb_cookies_test,
	"focus_on_url": focus_on_url,
	"nuke_settings": nuke_settings
};


/* commits current fb cookies to memory */

function fb_cookies_mem(data,port)
{
	console.log ("[-] >>> REQ fb_cookies_mem");

	cookies_mem (data.profile_id, function() 
	{
		port.postMessage({owner: "fb_cookies_mem", 
			response: null});
	});
}


/* takes a snapshort of current fb cookies. 
	used to restore state after loading other sets of fb cookies, 
	e.g., when testing stored fb cookies (we need to load them and 
	use them to test them) */

function fb_cookies_snapsave(data,port)
{
	console.log ("[-] >>> REQ fb.cookies_snapsave");

	cookies_mem (2, function() 
	{
		port.postMessage({
			owner: "fb_cookies_snapshot", response: null})
	});
}


/* see fb_cookies_snapsave */

function fb_cookies_snapload(data,port)
{
	console.log ("[-] >>> REQ fb_cookies_snapload");

	cookies_load (2, 0, function() 
	{
		port.postMessage({
			owner: "fb_cookies_snaprestore", response: null});
	});
}


/* tests stored fb cookies to see if they are working. 
	it loads stored fb cookies into current cookie store 
	for a given profile_id (0 or 1) and tries to load a 
	private Facebook account page and extract the user's 
	name */

function fb_cookies_test(data,port)
{
	console.log ("[-] >>> REQ fb_cookies_test");

	if (data.profile_id != 0 && data.profile_id != 1) 
	{
		port.postMessage({
			owner: "fb_cookies_test", response: {uid: '0'}}); 
		return;
	}

	console.log("[-] testing fb_cookies for profile " 
		+ data.profile_id + "...");

	// load stored cookies for profile_id into current cookie store

	if (cookies_load (data.profile_id, 0, function() 
	{
		var http_request = new XMLHttpRequest();
		var url = "https://www.facebook.com/";
		http_request.open ("GET", url, false);
		try 
		{
			http_request.send(null);
			if (http_request.status == 200) 
			{
				// scraping HACK
				var fb_name = "";
				var fbxWelcome_i = -1;
				var fbxWelcome_beginText_i = -1;
				var fbxWelcome_endText_i = -1;
				fbxWelcome_i 
					= http_request.responseText.indexOf('fbxWelcomeBoxName');
				if (fbxWelcome_i != -1)
					fbxWelcome_beginText_i 
						= http_request.responseText.indexOf('>',fbxWelcome_i+1);
				if (fbxWelcome_beginText_i != -1)
					fbxWelcome_endText_i 
						= http_request.responseText.indexOf('<',
								fbxWelcome_beginText_i+ 1);
				if (fbxWelcome_endText_i != -1)
					fb_name 
						= http_request.responseText.substr(
								fbxWelcome_beginText_i + 1, 
								fbxWelcome_endText_i-fbxWelcome_beginText_i-1);
				// END scraping HACK
				if (fb_name == "") 
				{
					port.postMessage({
						owner: "fb_cookies_test", response: {fb_name: ""}}); 
					return;
				}
				else 
				{
					console.log (" [!] testing fb_cookies name is '" + fb_name + "'");
					port.postMessage({
						owner: "fb_cookies_test", response: {fb_name: fb_name}});
					return;
				}
			}
			else // HTTP != 200
			{
				console.log (" [!] testing fb_cookies failed due " 
					+ "to http status " + http_request.status);
				port.postMessage({
					owner: "fb_cookies_test", response: {fb_name: ""}});
				return;
			}
		} 
		catch (e) 
		{
			console.log (" [!] testing fb_cookies failed due to exception"); 
			port.postMessage({
				owner: "fb_cookies_test", response: {fb_name: ""}}); 
			return;
		}
	}) == -1) // cookies_load returned -1 instead of calling the above callback
	{
		console.log (" [!] testing fb_cookies was unable to load " 
			+ "cookies for profile " + data.profile_id);

		port.postMessage({
			owner: "fb_cookies_test", response: {fb_name: ""}}); 

		return;
	}
}


/* clears all current fb cookies */

function fb_cookies_clear(data,port)
{
	console.log ("[-] >>> REQ fb_cookies_clear");

	cookies_clear(function() 
	{
		port.postMessage({
			owner: "fb_cookies_clear", response: null});
	});
}


/* focuses browser on tab specified by URL. 
	creates new tab if no tab is found.

	Note: URL must include scheme name 
	(i.e., http or https) */

function focus_on_url(data,port) 
{
	console.log ("[-] >>> REQ focus_on_url");

	chrome.windows.getCurrent(function (win) 
	{
		chrome.tabs.getAllInWindow (win.id, function (tabs) 
		{
			for (var i = 0; i < tabs.length; i++) 
			{
				if (tabs[i].url.indexOf(data.url) == 0)
				{
					chrome.tabs.update (tabs[i].id, {url: tabs[i].url, selected: true});
					return;
				}
			}
			// tab with given URL was not found, let's create one
			chrome.tabs.create({url: data.url, selected: true});
		});
	});
}

/* clears extension storage (localStorage). 
	This includes settings and state */

function nuke_settings(data,port)
{
	console.log("[-] >>> REQ nuke_settings");

	localStorage.clear();

	port.postMessage({owner: "nuke_settings", response: null});

	console.log("* nuke_settings DONE");
}


/* 101 init */

function sudoweb_init() 
{
	//alert('[-] background init:: HelloWorld!');
	console.log('[-] background init:: HelloWorld!');

	/* set up message-passing listener */

	/* all background page does is listen 
		for stuff (from the content script) 
		and act upon them */

	chrome.extension.onConnect.addListener(function(port) 
	{
		/* white-list message origins */
		if (port.name != "sudoweb_options" 
			&& port.name != "sudoweb_page_magic" 
			&& port.name != "sudoweb_etc") 
			return;

		port.onMessage.addListener(function(msg) {

			console.log ("\n\n[-] INCOMING MSG '" + JSON.stringify(msg) + "'");

			if (port.name == "sudoweb_options") 
				port_options = port;

			/* sudoweb-downgrade triggering heuristic

				incoming message from tab (page_magic). 
				do compare referrer with tab's host and 
				trigger incognito mode if there is a mismatch */

			if (port.sender.tab && msg.referrer && !port.sender.tab.incognito) 
			{
				console.log ("[-] >>> received sender.tab.url & referrer report");
				console.log ("[-] sender.tab.url \'" + port.sender.tab.url 
                       + "\', referrer \'" + msg.referrer + "\'");

				// extract domain from sender.tab.url 
				var host_current = port.sender.tab.url.split("/")[2];

				if (!host_current)
				{
					console.log (" [!] current host domain is undef");

					alert("[sudoweb] error: failed to identify domain " 
					+ "of current host. sudo capability disabled for this one :(");

					return;
				}

				// extract referrer domain from referrer 
				var host_ref = msg.referrer.split("/")[2];

				if (!host_ref)
				{
					console.log (" [!] referrer domain is undef");

					if (msg.referrer == "EMPTY")
						alert("[sudoweb] error: failed to identify parent " 
							+ "site for this facebook login. sudo capability " 
							+ "disabled for this one :(");
					else
						alert("[sudoweb] error: failed to identify domain " 
					+ "of referrer. sudo capability disabled for this one :(");

					return;
				}

				/* on host,referrer mismatch do take action: 
					- reload URL in incognito, 
					- populate incognito session with (downgraded) 
						secondary profile cookies */

				if (host_current != host_ref 
					/*&& msg.referrer != ""*/ /* AVOID referrer laundering */ 
					&& host_current == "www.facebook.com") 
				{
					console.log ("[-] [SUDOWEB_SESSION_DOWNGRADE] trigger by " 
						+ host_current + " != " + host_ref);

					// spawn new incongito window with window.opener (parent) of tab

					chrome.windows.create({incognito: true, type: "normal"}, 
						function (newwin) 
						{
							// check incognito here
							if (!newwin || !newwin.incognito) 
							{
								alert("ERROR: failed to initiate incognito mode. " 
									+ "Please, check chrome://chrome/extensions if " + 
									"SudoWeb has permission to do so (tick the box).");
								return;
							}

							console.log("[-] [SUDOWEB_SESSION_DOWNGRADE] incognito set");

							// do populate with with downgraded cookies (secondary profile)
							// then create tab with url = msg.referrer (third-party site 
							//   that triggered transition to facebook.com)
                
							// load profile id 1 in store id 1

							if (cookies_load (1, 1, function(args) 
							{
								console.log("[-] [SUDOWEB_SESSION_DOWNGRADE] cookies loaded");

								active_profile = 1;

								// update tab with URL of third-party site

								chrome.tabs.update(args.tabid, {url: args.url}, function() 
								{
									console.log("[-] [SUDOWEB_SESSION_DOWNGRADE] URL set to '" 
										+ args.url + "'");
								});

							}, {tabid: newwin.tabs[0].id, url: msg.referrer}) == -1) 
							{
								console.log(" [!] [SUDOWEB_SESSION_DOWNGRADE] " 	
									+ "was unable to load cookies");
								return;
							}
						}); // end of window create

						console.log("[-] [SUDOWEB_SESSION_DOWNGRADE] killing original tab");

						chrome.tabs.remove(port.sender.tab.id, function() {});
				}
				/* either host_domain == referrer_domain or host is not facebook.com, 
					do nothing, relax :) */
				else 
				{
					port.postMessage({verdict: "relax"}); 
				}

			} // end of sudoweb-downgrade triggering heuristic check

			/* request to reload tab with different cookie state. 
				used for upgrading a session (i.e., 'sudo') (by the sudo button? ) */

			else if (port.sender.tab && msg.reload) 
			{
				if (msg.reload == "sudo") 
				{
					console.log ("[-] >>> reload [SUDO]");

					/* load (primary) cookies into current cookie store, reload tab */

					active_profile ^= 1;

					// load profile id 0 in store id 1
					if (cookies_load (active_profile, 1, function(args) 
					{
						chrome.tabs.update(args.tabid, {url: args.url});
					}, {tabid: port.sender.tab.id, url: port.sender.tab.url}) == -1)
					{
						console.log(" [!] [SUDO] was unable to load cookies");
					}
				}
			}

			/* command the rendering of the sudo button */

			else if (port.sender.tab && port.sender.tab.incognito) 
			{
				console.log ("[-] ordering a sudo prompt");

				port.postMessage({verdict: "sudoPrompt"});
			}

			else if (port.sender.tab && msg.getParentTabURL)
			{
				var tab_url = port.sender.tab.url;

				console.log("[-] retrieving parent tab URL for tab with URL '" 
					+ tab_url + "'");

				var openerTabId = port.sender.tab.openerTabId;

				if (openerTabId != undefined)
				{
					chrome.tabs.get(openerTabId, function(tab)
					{
						console.log(" [!] parent tab URL for tab with URL '"
							+ tab_url + "' is '" + tab.url + "'");

						port.postMessage({"parentURL": tab.url});
					});
				}
				else
				{
					console.log(" [!] parent tab URL for tab with URL '" 
						+ tab_url + "' is undefined");

					port.postMessage({"parentURL": "EMPTY"});
				}
			}

			else if (msg.action)
			{
				actions[msg.action](msg.action_data,port_options);
			}

		});
	});


	// register listener for extension button: show options/status page on click

	/*chrome.browserAction.onClicked.addListener(function(tab) {
		chrome.tabs.create({url: chrome.extension.getURL("options.html"), 
												selected: true});});*/


	// init act: open the options tab 
	// the very first time this bad boy is installed

	if (!localStorage["installdate"]) 
	{
		chrome.tabs.create({url: chrome.extension.getURL("options.html"), 
			selected: true});
	   localStorage["installdate"] = new Date().getTime()
	}

} // end of init


// init sudoweb on document load

document.addEventListener('DOMContentLoaded', function() {sudoweb_init();});

