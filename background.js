// TODO think of using
// chrome.commands
//   https://developer.chrome.com/extensions/commands
// and
// chrome.browserAction
//   https://developer.chrome.com/extensions/browserAction#method-setPopup

// TODO this is very simple for now, let's do something btr
// this is a list of tabs, we search through this list sequentially
// whenever the user types something
_index = []

// Called whenever user starts the keyword input session.
// Build our index here.
chrome.omnibox.onInputStarted.addListener(function () {
  console.debug(`previous _index is ${_index.length}`);
  chrome.tabs.query({}, function(tabs) {
    _index = tabs
    console.debug(`Built an index of ${_index.length} items.`)
  });
})

function goodSuggestion(tab, text) {
  const re = new RegExp(text, 'i');
  return tab.title.match(re) || tab.url.match(re);
}

function makeSuggestion(tab, text) {
  const re = new RegExp(text, 'i');
  const title = tab.title.replace(re, `<match>$&</match>`);
  const url = `<url>${tab.url.replace(re, `<match>$&</match>`)}</url>`;
  return {
    content: String(tab.id || -1),
    description: `${title} | ${url}`,
  };
}

// This event is fired each time the user updates the text in the omnibox,
// as long as the extension's keyword mode is still active.
chrome.omnibox.onInputChanged.addListener(
  function(text, suggest) {
    // TODO deal with _index not build on first input change
    // since it has to query tabs async-ly

    // query doesn't do subset match, so we need to do something manual
    // let's just do substring for now
    // this will get all tabs (of all windows)
    suggestions = []
    _index.forEach(function(tab) {
      if (goodSuggestion(tab, text)) {
        suggestions.push(makeSuggestion(tab, text))
      }
    });
    console.debug(`Gave ${suggestions.length} suggestion(s)`);
    suggest(suggestions);
  });

// This event is fired with the user accepts the input in the omnibox.
chrome.omnibox.onInputEntered.addListener(function(tabId) {
  console.debug(`navigating to ${tabId}`);
  const updateInfo = {
    focused: true,
  };
  const updateProperties = {
    active: true,
  };
  chrome.tabs.update(parseInt(tabId, 10), updateProperties, function(tab) {
    chrome.windows.update(tab.windowId, updateInfo, function(window) {
      console.debug(`Brought window ${window.id} tab ${tab.id} to front`);
    })
  })
});

// chrome.omnibox.setDefaultSuggestion({description: "hello tabgrep"});
