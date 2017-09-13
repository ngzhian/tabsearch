// TODO use https://developer.chrome.com/extensions/storage

/*******************************************************************************
 * Tab manipulation
 ******************************************************************************/
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

/*******************************************************************************
 * Rendering
 ******************************************************************************/
function renderListingItem(tab, i) {
  // a listing item container
  const item = document.createElement('li');
  item.id = tab.id;
  item.classList.add('listing-item');

  // fav icon image
  const img = document.createElement('img');
  img.classList.add('favicon')
  if (tab.favIconUrl) {
    img.src = tab.favIconUrl;
  }
  item.appendChild(img);

  // tab title
  const title = document.createElement('span');
  title.textContent = tab.title;
  item.appendChild(title);

  // separator
  const separator = document.createElement('span');
  separator.textContent = " - ";
  item.appendChild(separator);

  // tab url
  const url = document.createElement('span');
  url.textContent = tab.url;
  item.appendChild(url);

  if (i == SELECTED_INDEX) {
    item.classList.add('selected')
  }
  return item
}

function renderEmptyListing() {
  const empty = document.createElement('div');
  empty.textContent = "No results";
  empty.classList.add('listing-item');
  return empty
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
  MATCHES = INDEX.filter(isGood)
  // the selected index might change, so let's update it
  if (SELECTED_INDEX >= MATCHES.length) {
    SELECTED_INDEX = Math.max(MATCHES.length - 1, 0)
  }
  render(LISTING, MATCHES, SELECTED_INDEX);
}

var INDEX = [];
var MATCHES = [];
var SELECTED_INDEX = 0;
let LISTING = document.getElementById('listing');

// TODO wrap in document.onload
chrome.tabs.query({}, function(tabs) {
  INDEX = tabs
  MATCHES = tabs
  console.debug(`Built an index of ${INDEX.length} items.`)
  render(LISTING, INDEX, 0);
});

function nextSelection() {
  if (MATCHES.length > 0) {
    SELECTED_INDEX = (SELECTED_INDEX + 1) % MATCHES.length;
  }
}

function prevSelection() {
  if (MATCHES.length > 0) {
    SELECTED_INDEX = SELECTED_INDEX - 1
    SELECTED_INDEX = SELECTED_INDEX < 0 ? MATCHES.length - 1 : SELECTED_INDEX
  }
}

const onKeydown = (event) => {
  switch (event.key) {
    case 'Enter':
      // should go to first search result
      let item = MATCHES[SELECTED_INDEX];
      if (item) {
        moveToTab(item.id);
      }
      // otherwise no result available...
      break;
    case 'ArrowDown':
      event.preventDefault()
      nextSelection()
      render(LISTING, MATCHES, SELECTED_INDEX)
      break;
    case 'n':
      if (event.ctrlKey) {
        event.preventDefault()
        nextSelection()
        render(LISTING, MATCHES, SELECTED_INDEX)
      }
      break;
    case 'ArrowUp':
      event.preventDefault()
      prevSelection()
      render(LISTING, MATCHES, SELECTED_INDEX)
      break;
    case 'p':
      if (event.ctrlKey) {
        event.preventDefault();
        prevSelection()
        render(LISTING, MATCHES, SELECTED_INDEX)
      }
      break;
  }
}

let searchBox = document.getElementById('search');
searchBox.addEventListener("input", onInput);
searchBox.addEventListener("keydown", onKeydown);
