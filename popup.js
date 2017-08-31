// This event is fired with the user accepts the input in the omnibox.
function moveToTab(tabId) {
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
}

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


function render(tab) {
  let div = document.createElement('div');
  div.textContent = tab.title;
  div.id = tab.id;
  return div
}

// focus on search
// on user input
  // clear listing
  // create html from
console.log("HI");

var _index;
let listing = document.getElementById('listing');

// TODO wrap in document.onload
chrome.tabs.query({}, function(tabs) {
  _index = tabs
  console.debug(`Built an index of ${_index.length} items.`)
  _index.forEach(function(tab) {
    let node = render(tab);
    listing.appendChild(node);
  });
  // _index.forEach(function(tab) {
  //   if (goodSuggestion(tab, text)) {
  //     suggestions.push(makeSuggestion(tab, text))
  //   }
  // });
});

let search = document.getElementById('search');

function removeAllChildren(node) {
  while (node.hasChildNodes()) {
    node.removeChild(node.lastChild);
  }
}

const onInput = event => {
  switch (event.key) {
    case 'Enter':
      // should go to first search result
      let item = listing.firstChild;
      if (item) {
        moveToTab(item.id);
      }
      // otherwise no result available...
      break;
    default:
      let searchText = search.value;
      // clear listing
      removeAllChildren(listing);
      // then add the matches
      _index.forEach(tab => {
        if (goodSuggestion(tab, searchText)) {
          let div = render(tab);
          listing.appendChild(div);
        }
      })
  }
}

search.addEventListener("keypress", onInput);
