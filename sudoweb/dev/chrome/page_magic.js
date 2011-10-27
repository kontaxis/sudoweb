/* content script: Runs at the end of every page */

// reports page's referrer to the background component, 
// if background component reports sudoPrompt, 
// a ``sudo reload'' button is added
// else, nothing happens

function doMagic() {
  // --- begin trigger heuristics ---
  if ((document.URL.match(new RegExp(/^http[s]?:\/\/www.facebook.com\/login.php/gi)) 
      && document.URL.indexOf("api_key",0) != -1) 
     || (document.URL.match(new RegExp(/^http[s]?:\/\/www.facebook.com\/dialog\/permissions.request/gi)))
     || (document.URL.match(new RegExp(/^http[s]?:\/\/www.facebook.com\/connect\//gi)) 
      && document.URL.indexOf("permissions_request"))) {
  // --- end trigger heuristics ---
    var port = chrome.extension.connect({name: "sudoweb_page_magic"});
    port.postMessage({referrer: document.referrer});
    port.onMessage.addListener(function(response) {
      if (response.verdict == "sudoPrompt") {
        console.log ("* [sudoweb] adding sudo button...");
        var btn2 = document.createElement("input"); 
        btn2.setAttribute("id", "sudobtn"); 
        btn2.setAttribute("value", "Log in using Primary Identity"); 
        btn2.setAttribute("alt", "sudo reload"); 
        btn2.setAttribute("type", "button"); 
        btn2.addEventListener("click", function(){
          var port = chrome.extension.connect({name: "sudoweb_etc"}); 
          if (port) port.postMessage({reload: "sudo"}); 
          else alert ('button FAILED');
        }, false);
        var x = document.getElementById('header_container');
        if (!x) console.log ("* [sudoweb] error: unable to add sudo button. DOM seems a little off.");
        else x.appendChild(btn2);
      }
      else if (response.verdict == "nits") {; /* do nothing */ }
      else if (response.verdict == "relax") {; /* do nothing */ }
    }); 
  } //else console.log ("* [sudoweb] ignoring page URL: " + document.URL);
}

doMagic();
