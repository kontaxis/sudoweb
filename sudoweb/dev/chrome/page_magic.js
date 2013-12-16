
/* content script
   run at at the *end* of every page. 
   
   reports page's referrer to the background component. 

   by-default downgraded session with Facebook for social login
   ------------------------------------------------------------

   if the background component decides it's an attempt to 
   launch Facebook social login from a third-party site, 
   it will close current Facebook login page and spawn 
   a new one using the downgraded session the user has 
   with Facebook. 

   the content script will run again in the new Facebook 
   login page and communicate that information to the 
   background component. 

   'sudo Reload'
   -------------

   the background component is supposed to respond with 
   'sudoPrompt' for downgraded sessions with Facebook and 
   then this script will add a ``sudo reload'' button in 
   the current login page, enabling the user to elevate 
   his session with Facebook. 

   if the user chooses to do so, that action will be communicated 
   to the background component which will close the current login 
   page and launch a new one with elevated priviledges.
*/

var trigger_heuristics = [
  /*function h1(url) {
    return url.match(new RegExp(/^http[s]?:\/\/www\.facebook\.com\/login.php/gi)) && (url.indexOf("api_key"));
  },*/
  function h2(url) {
    return url.match(new RegExp(/^http[s]?:\/\/www.facebook.com\/dialog\/permissions.request/gi));
  },
  /*function h3(url) {
    return url.match(new RegExp(/^http[s]?:\/\/www\.facebook\.com\/connect\//gi)) && (url.indexOf("permissions_request"));
  },*/
  /* 2012-06-09 */
  function h4(url) {
    return url.match(new RegExp(/^http[s]?:\/\/www\.facebook\.com\/dialog\/oauth/gi));
  },
];


function match_trigger_heuristics(url) 
{
	for (var i = 0; i < trigger_heuristics.length; i++)
	if (trigger_heuristics[i](url)) 
	{
		console.log("[*] [sudoweb] matched trigger heuristic #" 
			+ (i+1) + " for " + url);
		return true;
	} 
	return false;
}


function addSudoBtn() 
{
	var btn2 = document.createElement("input"); 
	btn2.setAttribute("id", "sudobtn"); 
	btn2.setAttribute("value", "sudo reload"); 
	btn2.setAttribute("alt", "sudo reload"); 
	btn2.setAttribute("type", "button");

	btn2.addEventListener("click", function()
	{
		var port = chrome.extension.connect({name: "sudoweb_etc"}); 
		if (port) 
			port.postMessage({reload: "sudo"}); 
		else alert ('[sudoweb] sudo button FAILED to transmit');
	}, false);

	try 
	{
		var x = document.getElementsByTagName("td"); 
		var i = 0;
		for (i = 0; i < x.length; i++) {
			if (x[i].className == "_51m- uiOverlayFooterButtons _51mw")
				break;
		}

		if (x.length > 0 && i < x.length)
			x[i].appendChild(btn2);
		else
			alert ("[sudoweb] error: unable to add sudo button. " 
				+ "DOM seems a little off.");
	} catch (e) 
	{
		alert ("[sudoweb] exception while trying to add sudo button. "
			+ "DOM might be off. " + e);
  }
}


function doMagic() 
{
	/* for www.facebook.com check trigger heuristics */

	if (document.URL.match(new RegExp(/^http[s]?:\/\/www.facebook.com\//gi))
		&& match_trigger_heuristics(document.URL)) 
	{
		// set up communication with the background
		var port = chrome.extension.connect({name: "sudoweb_page_magic"});

		var ref;

		if (document.referrer == "") 
			ref = "EMPTY"; 
		else 
			ref = document.referrer;

		if (ref != "EMPTY") 
		{
			console.log ("[*] [sudoWeb] communicating referrer to background: '" 
				+ document.referrer + "' (" + ref + ")");
			port.postMessage({referrer: ref});
		}
		else
			port.postMessage({getParentTabURL: true});

		// incoming (from background) message handler
		port.onMessage.addListener(function(response) 
		{
			if (response.verdict == "sudoPrompt") 
			{
				console.log ("[*] [sudoweb] adding sudo button...");

				setTimeout("addSudoBtn()", 1500);
			}
			else if (response.verdict == "nits") {; /* do nothing */ }
			else if (response.verdict == "relax") {; /* do nothing */ }
			else if (response.parentURL)
			{
				console.log ("[*] [sudoWeb] communicating referrer to background: '" 
					+ response.parentURL + "'");

				port.postMessage({referrer: response.parentURL});
			}
		}); 
	} //else console.log ("[*] [sudoweb] ignoring page URL: " + document.URL);
}


doMagic();
