
/* message port with the background script */

var msg_port = null;

/* used to maintain a list of callback functions 
	per message (response) received from the background script. 
	indexed by an 'owner' string, a response with that string 
	causes the respective callback function here to be fired. */

var msg_read_callback = new Array();

/* writes a message to the message port 
	and registers a callback for its response 
	from the background script */

function msg_write (msg, function_f, function_arg) 
{
	try {
		var x = arguments.callee.caller.name.toString();

		msg_read_callback.push({
			owner: x, 
			callback_f: function_f, 
			callback_arg: function_arg
		});

    msg_port.postMessage (msg);

    console.log ("[-] msg_write: " + JSON.stringify (msg));
  } 
	catch (e) 
	{
		console.log (" [!] msg_write: exception " + e);
	}
}


function msg_readwrite_setup () 
{
	if (msg_port) return;

	try 
	{
		msg_port = chrome.extension.connect({name: "sudoweb_options"});

		msg_port.onMessage.addListener(function(msg) 
		{
			if (msg.response)
				console.log("[-] msg_read: " + msg.owner 
					+ ", " + JSON.stringify(msg.response));
			else
				console.log ("[-] msg_read: " + msg.owner);

			for (var i = 0; i < msg_read_callback.length; i++)
				if (msg_read_callback[i].owner == msg.owner 
					&& msg_read_callback[i].callback_f) 
				{
					var callback_f = msg_read_callback [i].callback_f;
					var callback_arg = msg_read_callback [i].callback_arg;
					msg_read_callback.splice(i, 1);
					callback_f (callback_arg, msg.response);
					break;
				} 
				else 
					console.log (" [!] msg_read: unable to find owner " + msg.owner);
		});
  } 
	catch (e) 
	{
		console.log (" [!] msg_read: exception " + e);
	}
}


// takes a snapshot of current fb cookies 
// and stores them under temp sudoweb profile. 
//
// used so as not minimize user discomfort 
// (he gets back his original fb session 
// after configuring sudoweb). 
//
function fb_cookies_snapshot(callback) 
{
	console.log ("[*] fb_cookies_snapshot");
	msg_write ({"action": "fb_cookies_snapsave"}, function(xcallback) 
	{
		console.log (" [*] fb_cookies_snapshot done");
		xcallback();
	}, callback);
}


// restores an fb cookie snapshot
// 
// see fb_cookies_snapshot
//
function fb_cookies_snaprestore(callback) 
{
	console.log ("[*] fb_cookies_snaprestore");
	msg_write ({"action": "fb_cookies_snapload"}, function(xcallback) 
	{
		console.log (" [*] fb_cookies_snaprestore done");
		if (xcallback) xcallback();
	}, callback);
}


// stores fb cookies under a sudoweb profile 
//
// note: currently we consider 
//       profile 0 (primary) & 1 (secondary)
// 
function fb_cookies_mem(id) 
{
	document.getElementById("identity_b_"+id).disabled = 'true';
	console.log ("[*] fb_cookies_mem " + id);
	if (!confirm("Do you really want to set an identity?")) return;
	msg_write ({"action": "fb_cookies_mem", "action_data": {"profile_id": id}}, 
		function(id) 
		{
			console.log (" [*] fb_cookies_mem " + id + " done");

			if (id == 1)
				fb_cookies_clear(function () 
				{
					fb_cookies_test(1, function() 
					{
						//alert('Identity Set!?');
						fb_cookies_snaprestore(function () 
						{
							document.getElementById("identity_b_1").disabled = '';
						});
					});
				});

			else if (id == 0)
				fb_cookies_clear(function() 
				{
					fb_cookies_test(0, function() 
					{
						//alert('Identity Set!?');
						fb_cookies_clear(function () 
						{
							document.getElementById("identity_b_0").disabled = '';
							fb_request_focus();
						});
					});
				});
		}, id);
}


// clear current fb cookies 
//
function fb_cookies_clear(callback) 
{
	console.log ("[*] fb_cookies_clear");
	msg_write ({"action": "fb_cookies_clear"}, function(xcallback) 
	{
		console.log (" [*\ fb_cookies_clear done");
		if (xcallback) xcallback();
	}, callback);
}


// test if stored fb cookies in sudoweb profiles are still valid
// 
function fb_cookies_test(id, callback) 
{
	console.log ("[*] fb_cookies_test " + id);

	var info_out = document.getElementById("identity_v_"+id);

	info_out.innerHTML = "Testing...";
	info_out.style.backgroundColor = "FFFF00";

	msg_write ({"action": "fb_cookies_test", "action_data": {"profile_id": id}}, 
		function(xcallback, response) 
		{
			var info_out = document.getElementById("identity_v_"+id);

			// success, cookies work
			if (response.fb_name != "") 
			{
				info_out.innerHTML = response.fb_name;
				info_out.style.backgroundColor = "66FF00";
			}
			// failure
			else 
			{
				info_out.innerHTML = "Missing";
				info_out.style.backgroundColor = "FF3300";
			}

			console.log (" [*] fb_cookies_test " + id + " done");

			if (xcallback) xcallback();
		}, callback);
}


// nuke sudoweb settings
// 
function nuke_settings() 
{
	console.log ("[*] nuke_settings");
	msg_write ({"action": "nuke_settings"}, function() 
	{
		console.log (" [*] nuke_settings done");
		alert('Boom! Extension settings nuked.');
		self.location.reload();
	}, null);
}


function fb_request_focus() 
{
	msg_write ({"action": "focus_on_url", 
		"action_data": {"url": "https://www.facebook.com"}}, null, null);
}


// document init
window.addEventListener('load', function() 
{
	msg_readwrite_setup();

	// enable identity-setting buttons

	document.getElementById('identity_b_0').disabled = 'true';
	document.getElementById('identity_b_1').disabled = 'true';

	/* 
		- take a snaphost of current (fb) cookies, 
		- load and test cookies from stored identity 0 and 1 
			(test makes sure cookies get you to facebook), 
		- restores current (fb) cookies */

	fb_cookies_snapshot(function() 
	{
		fb_cookies_clear(function () 
		{
			fb_cookies_test(0, function() 
			{
				fb_cookies_test(1, function() 
				{
					fb_cookies_snaprestore(function () 
					{
						document.getElementById('identity_b_0').disabled = '';
						document.getElementById('identity_b_1').disabled = '';
					});
				});
			});
		});
	});

	/* 'click' event listeners for the buttons */

	document.getElementById('identity_b_0').addEventListener('click', function() 
	{
		fb_cookies_mem(0);
	});

	document.getElementById('identity_b_1').addEventListener('click', function() 
	{
		fb_cookies_mem(1);
	});

	document.getElementById('nuke_all_b').addEventListener('click', function() 
	{
		nuke_settings();
	});

	document.getElementById('nuke_fb_b').addEventListener('click', function() 
	{
		fb_cookies_clear(function() 
		{
			alert('current fb cookies are no more!');
		});
	});

	// document close
	window.addEventListener('beforeunload', function() 
	{
		fb_cookies_snaprestore();
	});

});
