// =============================================================== //
// SudoWeb Facebook Extension                                      //
// --------------------------                                      //
//                                                                 //
// Research Paper                                                  //
// --------------                                                  //
//   "SudoWeb: Minimizing Information Disclosure                   //
//    to Third Parties in Single Sign-On Platforms.                //
//    Georgios Kontaxis, Michalis Polychronakis,                   //
//    and Evangelos P. Markatos.                                   //
//    In Proceedings of the 14th                                   //
//    Information Security Conference.                             //
//    October 2011, Xi'an, China."                                 //
//                                                                 //
// Contact                                                         //
// -------                                                         //
//   Georgios Kontaxis (lastname [at] cs [dot] columbia [dot] edu) //
// =============================================================== //

Notes:
- Very important! After installation of extension, user must manually 
  enable "Allow in incognito" from the "chrome://extensions/" tab. 
  Otherwise, the extension will not function...

Disclaimer: 
- This software is in beta (testing) version and 
  part of an ongoing research project. 


--------------
| To-Do List |
--------------

* 2012-06-09 [CRITICAL] 
  It seems that the current Facebook Connect (popup) window attempts 
  to locate its opener and communicate some value that the social login 
  integrator will use to set a cookie or a session variable. 
  According to this https://groups.google.com/a/chromium.org/group/chromium-extensions/browse_thread/thread/deda154e2f39bef9/f6e9b20f039f88f7 a known bug in Chrome prevents a content script from opening a new window using window.open and getting back a non-undefined window object. 
  We need to be able to do that so that we can window.open the URL that 
  would be the opener of the Facebook Connect window and explicitly invoke 
  the communication that otherwise fails (since the opener exists in normal 
  Chrome while Facebook Connect lives in incognito Chrome). 

* 2012-06-09 
  The trigger heuristic for sudoWeb is when the URL of a new page (tab) 
  matches RegExp(/^http[s]?:\/\/www.facebook.com\/dialog\/oauth/gi) OR 
  RegExp(/^http[s]?:\/\/www.facebook.com\/dialog\/permissions.request/gi) 
  AND the referrer host is either empty or not www.facebook.com. 
  The empty-referrer condition protects against referrer laundering. 
  We should add code which monitors tab inheritance to deal with 
  false positives with an empty referrer.


----------------
| Known Issues |
----------------

NONE
