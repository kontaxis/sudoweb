
/* loads (fb) cookies for profile 'id' into current cookie store 
	(uses profile_id localStorage entry) */

function cookies_load (profile_id, store_id, callback, callback_args) 
{
	console.log ("[*] cookies_load for profile_id " 
		+ profile_id + ", store_id " + store_id);

	if (profile_id != 0 && profile_id != 1 && profile_id != 2) {
		console.log (" [!] cookies_load cannot work with invalid profile id");
		return -1;
	}

	var newCookies = localStorage['mycookies_' + profile_id];

	if (newCookies)
		newCookies = JSON.parse(newCookies);

	if (!newCookies || !newCookies.length)
	{
		console.log (" [!] cookies_load is unable to load mycookies_" 
			+ profile_id + ' profile. clearing existing cookies'); 
		console.log(newCookies);

		// failure to set new cookies resulting in removal of old cookies
		cookies_clear(function() {callback(callback_args)});
	
		// should NOT return -1 here as this might trigger 
		// an immediate response to the error before the 
		// cookies_clear() from above is done 
		// (e.g., see fb_cookies_test())
		//return -1;
		return;
	}

	console.log ("[*] cookies_load will load " 
		+ newCookies.length + " cookies");

	console.log(newCookies);

	// clear existing (fb) cookies before setting new ones 
	cookies_clear(function () {
		_cookies_load(newCookies, store_id, callback, callback_args);
	});
}

function _cookies_load (newCookies, store_id, callback, callback_args)
{
	/*console.log ("[*] cookies_load " + newCookies.length 
		+ " remaining cookies");*/

	// assertion
	if (newCookies.length == 0)
	{
		console.log (" [!] cookies_load has nothing to do");
		return;
	}

	var my_cookie = newCookies[0];

	// [1:]
	var new_newCookies = [];

	for (var i = 1; i < newCookies.length; i++)
		new_newCookies[i-1] = newCookies[i];

	console.log ("[*] cookies_load [" + JSON.stringify(my_cookie) + "]");

	// turn my_cookie array into an object 

	var my_cookie_obj = {};
	// cookie properties supported by chrome.cookies.getAll()
	var my_cookie_obj_properties 
		= {"url":1, "name":1, "value":1, "domain":1, "path":1, 
				"secure":1, "httpOnly":1, "expirationDate":1, "storeId":1};

	for (var my_cookie_key in my_cookie)
		if (my_cookie_obj_properties[my_cookie_key] != undefined)
			my_cookie_obj[my_cookie_key] = my_cookie[my_cookie_key];

	my_cookie_obj.url 
		= "http" + (my_cookie.secure?"s":"") + "://" + my_cookie.domain 
			+ (my_cookie.path!=undefined?my_cookie.path:"");

	// which cookie store to use
	my_cookie_obj.storeId 
		= ((store_id!=undefined)?store_id:0) + '';

	console.log("[*] cookies_load obj [" + JSON.stringify(my_cookie_obj) + "]");

	//
	chrome.cookies.set (my_cookie_obj, function(cookie) 
	{
		if (cookie == null) 
			console.log (" [!] cookies_load failed. why? " 
				+ chrome.runtime.lastError); 
		else 
		{
			console.log ("[*] cookies_load success");
		}

			// no more cookies to set?

			if (new_newCookies.length == 0)
			{
				if (callback)
				{
					console.log("[*] cookies_load DONE");
					callback(callback_args);
				}
				else
				{
					console.log("[*] cookies_load DONE without callback");
				}
			}
      else
				_cookies_load(new_newCookies, store_id, callback, callback_args);
	});
}


/* receives an array of domain names and 
  (optionally) a callback function and 
  stores any cookies the browser 
  has for those domains under the given 
  profile_id in a localStorage entry. */

function domain_cookies_mem_multi 
	(domain_array, profile_id, callback, cb_args)
{
	_domain_cookies_mem_multi(domain_array, profile_id, [], callback, cb_args);
}

function _domain_cookies_mem_multi 
	(domain_array, profile_id, mycookies, callback, cb_args)
{
	if (!domain_array) 
	{
		console.log(" [!] domain_cookies_mem_multi has nothing to do");

		if (callback) callback(cb_args);

		return;
	}

	console.log ("[*] domain_cookies_mem_multi for profile_id " + profile_id);

	if (profile_id != 0 && profile_id != 1 && profile_id != 2) 
	{
		console.log(" [!] domain_cookies_mem_multi cannot work " 
			+ "with invalid profile id");
		callback(cb_args); 
		return;
	}

	// invalidate current profile_id memory 
	window.localStorage.removeItem('mycookies_' + profile_id);

	console.log ("[*] domain_cookies_mem_multi [" 
		+ domain_array.length + "] [" + domain_array + "]");

	// current domain is first off the domain array
	var current_domain = domain_array[0];

	console.log ("[*] domain_cookies_mem_multi working on '" 
		+ current_domain + "'");

	// create [1:] sub-array to keep going recursively
	var new_domain_array = [];

	for (var i = 1; i < domain_array.length; i++)
		new_domain_array[i-1] = domain_array[i];

	// get cookies from browser for target_domain
	chrome.cookies.getAll({'domain': current_domain}, function(cookies) 
	{
		console.log ("[*] domain_cookies_mem_multi '" 
			+ current_domain + "' has " + cookies.length + " cookies");

		j = mycookies.length?mycookies.length+1:mycookies.length;

		for (var i = 0; cookies && i < cookies.length; i++)
		{
			console.log("[*] domain_cookies_mem_multi recording <'" 
				+ cookies[i].name + "','" + cookies[i].value 
				+ "'> for '" + current_domain + "'");

			mycookies[j++] = cookies[i];
		}

		// keep going?

		if (new_domain_array.length > 0) 
			_domain_cookies_mem_multi(new_domain_array, profile_id, 
				mycookies, callback, cb_args);
		else 
		{
			// all done, let's commit to localStorage 
			// and fire up the callback function

			console.log ("[*] domain_cookies_mem_multi committing for " 
				+ "profile_id " + profile_id + " " + mycookies.length 
				+ " cookies");

			localStorage['mycookies_' + profile_id] = JSON.stringify(mycookies);

			console.log(localStorage['mycookies_' + profile_id]);

			if (callback) 
			{
				console.log ("[*] domain_cookies_mem_multi DONE"); 
				callback(cb_args);
			}
			else 
			{
				console.log ("[*] domain_cookies_mem_multi DONE without callback");
			}
		}
	});

	return;
}


/* store current fb cookies in memory (localstorage) */

function cookies_mem(profile_id, callback, cb_args) 
{
  var domains = [".facebook.com", "www.facebook.com"];
  domain_cookies_mem_multi(domains, profile_id, callback, cb_args);
}


/* receives an array of domain names and 
  (optionally) a callback function and 
  removes any cookies the browser 
  has for those domains. */

function domain_cookies_clear_multi (domain_array, callback)
{
	if (!domain_array) 
	{
		console.log(" [!] domain_cookies_clear_multi has nothing to do");

		if (callback) callback();

		return;
	}

	console.log ("[*] domain_cookies_clear_multi [" 
		+ domain_array.length + "] [" + domain_array + "]");

	// current domain is first off the domain array
	var current_domain = domain_array[0];

	console.log ("[*] domain_cookies_clear_multi working on '" 
		+ current_domain + "'");

	// create [1:] sub-array to keep going recursively
	var new_domain_array = [];

	for (var i = 1; i < domain_array.length; i++)
		new_domain_array[i-1] = domain_array[i];

	// get cookies from browser for target_domain
	chrome.cookies.getAll({'domain': current_domain}, function(cookies) 
	{
		console.log ("[*] domain_cookies_clear_multi '" 
			+ current_domain + "' has " + cookies.length + " cookies");

		for (var i = 0; cookies && i < cookies.length; i++)
		{
			console.log("[*] domain_cookies_clear_multi removing '" 
				+ cookies[i].name + "' for '" + current_domain + "'");

			// TODO: cookie removal should be sequential, 
			// not parallel as it is right now

			chrome.cookies.remove({
				'url': 'http' + (cookies[i].secure?"s":"") 
					+ '://' + cookies[i].domain + cookies[i].path, 
				'name': cookies[i].name
			},function(x)
			{
				console.log('[*] domain_cookies_clear_multi deleted ' + x.name);
			});
		}

		// keep going?

		if (new_domain_array.length > 0) 
			domain_cookies_clear_multi(new_domain_array, callback);
		else 
		{
			// all done, let's fire up the callback function
			if (callback) 
			{
				console.log ("[*] domain_cookies_clear_multi DONE"); 
				callback();
			}
			else 
			{
				console.log ("[*] domain_cookies_clear_multi DONE without callback");
			}
		}
	});

	return;
}


/* clears (or at least tries to) current fb cookies */

function cookies_clear(callback)
{
  var domains = [".facebook.com", "www.facebook.com"];
  domain_cookies_clear_multi(domains,callback);
}
