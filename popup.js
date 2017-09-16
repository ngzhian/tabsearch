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

/*******************************************************************************
 * Searching/Querying/Matching
 ******************************************************************************/

const MAX_EXEC = 10
// Match a RegExp in str, returning an array of all indices
// if re is empty, this will loop infinitely, so we cap it at an
// abitrary number of matches
function matchCompletely(re, str) {
  var n = 0 // number of execs run
  var myArray;
  const indices = [];
  while ((myArray = re.exec(str)) !== null && n < MAX_EXEC) {
    indices.push({
      startIndex: myArray.index,
      endIndex: myArray.index + myArray[0].length,
    });
    n++;
  }
  return indices;
}

// Create a new Matcher with user input
// and use it to match on tab titles and urls
// Matcher will clean up user input to try and
// eliminate pathological cases when we try to run
// it with the regexp engine.
function Matcher(dirtyText) {
  const replacements = [
    ["\\", "\\\\"],
    ["[", "\\["],
    ["]", "\\]"],
    ["+", "\\+"],
    ["*", "\\*"],
    [".", "\\."],
    ["|", "\\|"],
  ]
  const cleanText = clean(dirtyText);
  const cleanRe = new RegExp(cleanText, 'gi');

  function clean(dirtyText) {
    var text = dirtyText;
    replacements.forEach(r => { text = text.replace(r[0], r[1]); });
    return text;
  }

  // Augment the tab object with match details
  function match(tab) {
    if (cleanText.length === 0) {
      return {
        titleMatches: [],
        urlMatches: [],
      }
    }
    return {
      ...tab,
      titleMatches: matchCompletely(cleanRe, tab.title),
      urlMatches: matchCompletely(cleanRe, tab.url),
    }
  }

  return {
    match
  }
}

/*******************************************************************************
 * Rendering
 ******************************************************************************/

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

/* Render one listing item */
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
  title.classList.add('title');
  renderHelper(tab.title, tab.titleMatches).forEach(v => title.appendChild(v));
  item.appendChild(title);


  // separator
  const separator = document.createElement('span');
  separator.classList.add('separator');
  separator.textContent = " - ";
  item.appendChild(separator);

  // tab url
  const url = document.createElement('span');
  url.classList.add('url');
  renderHelper(tab.url, tab.urlMatches).forEach(v => url.appendChild(v));
  item.appendChild(url);

  if (i == SELECTED_INDEX) {
    item.classList.add('selected')
  }
  return item
}

/* Render a node with text interspered with spans */
function renderHelper(text, indices) {
  if (!indices || indices.length === 0) {
    const span = document.createElement('span');
    span.textContent = text;
    return [span];
  }

  // from [(10, 15), (19, 21)]
  // to [(0, 10, false), (10, 15, true), (15, 19, false),
  //     (19, 21, true), (21, n, false)]
  function go(list, acc, lastMatch, end) {
    if (list.length === 0) {
      acc.push([lastMatch, end, false])
      return acc;
    }

    const [x, ...xs] = list;
    var nextMatch;
    if (lastMatch < x.startIndex) {
      acc.push([lastMatch, x.startIndex, false]);
    }
    acc.push([x.startIndex, x.endIndex, true]);
    nextMatch = x.endIndex;
    return go(xs, acc, nextMatch, end);
  }

  function spanify(start, end, isMatch) {
    const span = document.createElement('span');
    if (isMatch) {
      span.classList.add('match');
    }
    span.textContent = text.substring(start, end);
    return span;
  }

  var x = go(indices, [], 0, text.length);
  return x.map(v => spanify(...v));
}

/* Render when there are no matches */
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

/*******************************************************************************
 * User input/evengts
 ******************************************************************************/

const onInput = event => {
  let searchText = event.target.value

  const matcher = new Matcher(searchText);
  const makeGood = (tab) => matcher.match(tab);

  function isGood(tab) {
    // special case when there are search is empty
    if (searchText.length === 0) {
      return true;
    }
    return tab.titleMatches.length != 0 || tab.urlMatches.length != 0
  }
  MATCHES = INDEX.map(makeGood).filter(isGood)

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
