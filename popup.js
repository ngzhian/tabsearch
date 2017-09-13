// TODO use https://developer.chrome.com/extensions/storage

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
      window.close();
      console.debug(`Brought window ${window.id} tab ${tab.id} to front`);
    })
  })
}

function goodSuggestion(text, tab) {
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

function renderListingItem(tab, i) {
  const div = document.createElement('div');
  div.id = tab.id;
  div.classList.add('listing-item');

  const img = document.createElement('img');
  img.classList.add('favicon')
  if (tab.favIconUrl) {
    img.src = tab.favIconUrl;
  }
  div.appendChild(img);

  const title = document.createElement('span');
  title.textContent = tab.title;
  div.appendChild(title);

  if (i == selectedIndex) {
    div.classList.add('selected')
  }
  return div
}

function renderEmptyListing() {
  const div = document.createElement('div');
  div.textContent = "No results";
  div.classList.add('listing-item');
  return div
}

function removeAllChildren(node) {
  while (node.hasChildNodes()) {
    node.removeChild(node.lastChild);
  }
}

/* Render the popup onto a root node based on matches and selected index */
function render(root, matches, selectedIndex) {
  removeAllChildren(root);

  if (matches.length === 0) {
    root.appendChild(renderEmptyListing());
    return
  }

  const children = matches.map(renderListingItem);
  children.forEach(child => root.appendChild(child));
}

const onInput = event => {
  let searchText = event.target.value
  let isGood = goodSuggestion.bind(null, searchText)
  matches = _index.filter(isGood)
  // the selected index might change, so let's update it
  if (selectedIndex >= matches.length) {
    selectedIndex = Math.max(matches.length - 1, 0)
  }
  render(listing, matches, selectedIndex);
}

var _index = [];
var matches = [];
var selectedIndex = 0;
let listing = document.getElementById('listing');

// TODO wrap in document.onload
chrome.tabs.query({}, function(tabs) {
  _index = tabs
  matches = tabs
  console.debug(`Built an index of ${_index.length} items.`)
  render(listing, _index, 0);
});

function nextSelection() {
  if (matches.length > 0) {
    selectedIndex = (selectedIndex + 1) % matches.length;
  }
}

function prevSelection() {
  if (matches.length > 0) {
    selectedIndex = selectedIndex - 1
    selectedIndex = selectedIndex < 0 ? matches.length - 1 : selectedIndex
  }
}

const onKeydown = (event) => {
  switch (event.key) {
    case 'Enter':
      // should go to first search result
      let item = matches[selectedIndex];
      if (item) {
        moveToTab(item.id);
      }
      // otherwise no result available...
      break;
    case 'ArrowDown':
      event.preventDefault()
      nextSelection()
      render(listing, matches, selectedIndex)
      break;
    case 'n':
      if (event.ctrlKey) {
        event.preventDefault()
        nextSelection()
        render(listing, matches, selectedIndex)
      }
      break;
    case 'ArrowUp':
      event.preventDefault()
      prevSelection()
      render(listing, matches, selectedIndex)
      break;
    case 'p':
      if (event.ctrlKey) {
        event.preventDefault();
        prevSelection()
        render(listing, matches, selectedIndex)
      }
      break;
  }
}

let searchBox = document.getElementById('search');
searchBox.addEventListener("input", onInput);
searchBox.addEventListener("keydown", onKeydown);
