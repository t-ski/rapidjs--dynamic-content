# dynamic-content

<a href="https://rapidjs.org"><img src="https://rapidjs.org/_assets/readme-plugin-badge.svg" height="75"></a>

Providing dynamic content loading functionality for compound page environments.

---

```
npm install @t-ski/rapidjs--dynamic-content
```

---

## Concept

The plug-in adopts dynamic content loading functionality for compound pages: By declaring an element in a compound page's base file as content wrapper, it will display encapsulated content stored in private files co-located in the compound page directory.

---

## Content wrapper

Any non-singleton element in a compound page base file (in other words: any element that may have child elements) can be the designated content wrapper element; define the empty attribute `rapid--wrapper` upon the respective element.

> A page can not use more than one wrapper element as the loading behavior correlates with the request URL. When attributing multiple elements only the first element present in the DOM will effective be used as the content wrapper.

---

## Content

### Files

Each standalone content fragment is to be organized in its own private file, located in the related compound page directory. The content name is to be derived from the file name slicing both the private file indicator (underscore) and and the extension from the full file name. I.e. content stored in a file named *_overview.html* goes by the content name *overview*.

### Index

A file named *_index.html* must be deployed, so a page root request (URL not stating any particular content name) will result in the index content being loaded into the content wrapper element.

### Placeholder

As the content loading process starts after the base page document has been loaded, there is a time period after each page load, that there is no content present to be displayed. During that time period, the markup placed in the effective content wrapper tag will show up. That markup can be seen as placeholder content.

> The placeholder content is most effective when loading the page with weak latency. In good networks, the placeholder content will barely be perceivable. We recommend deferring the placeholder display a fraction of a second in order to prevent subliminal flickering.

### Nested

Content does not only have to be organized on one level, but can be nested (infinitely) into sub-content sections. This way, content is to be stored in a directory (same naming system as for compound pages). The index content file will act as the sub-level default content. In an URL pathname it is represented by multiple appendixes (e.g. */compound-page/content/sub-content*).

---

## Routing

As usual, the page is accessible from the compound page directory location by it's name (omitting the compound page indicator ":"). To load specific content into the designated content wrapper element on the initial page load, append the request URL pathname by a colon (content prefix) followed by the respective content name.

---

## Dynamic loading

The dynamic loading should basically replace the ordinary way of loading content using hyperlinks. To trigger the content loading mechanism, use the `load` interface.

#### Syntax

```
rapidJS["@t-ski/rapidjs--dynamic-content"].load(content, anchor = undefined)
```

#### Parameter

**content** `String` *Name of content to load*

**anchor** `String` `optional` *Anchor to scroll to after load*

#### Return value

`Promise` *Promise resolving on load complete, rejecting on error*

> When about to load nested content, provide the content levels sequence in an ordered array of the respective names.

> If the requested content does not exist, a content file named *_404.html* on compound page directory root level will be served instead. If no such file exists, the base index content will appear.

---

## Load handlers

The plug-in provides a listener interface for acting upon loading processes.

### Progress handler

The content downloading progress can be intercepted by setting up progress handlers. E.g. for displaying a progress bar.

#### Syntax

```
rapidJS["@t-ski/rapidjs--dynamic-content"].addProgressHandler(callback, flag = flag.ALWAYS)
```

#### Parameter

**callback** `Function` *Progress callback getting passed a content download progress value [0, 1] for custom loading time handling (e.g. visual feedback)*

**flag** `flag` `optional` *Type of handler application (always by default)*

### Finished handler

When content downloading has successfully finished, finished handlers will be triggered.

> Finished handlers also apply on backwards navigations to previously loaded content when set up accordingly.

#### Syntax

```
rapidJS["@t-ski/rapidjs--dynamic-content"].addFinishedHandler(callback, flag = flag.ALWAYS)
```

#### Parameter

**callback** `Function` *Callback getting passed an old and a new content name after successfully having loaded content*

**flag** `flag` `optional` *Type of handler application (always by default)*

### Flags

Using a flag on a load handler will tell the application on when to run the callback. These flags are accessible from a public enumeration.

#### Synatx

```
rapidJS["@t-ski/rapidjs--dynamic-content"].flag.TYPE
```

#### TYPEs

**ALWAYS** *Always call handler when related event fires (initially and eventually)*

**INITIALLY** *Only call handler on initial the load*

**EVENTUALLY** *Always call handler except for on the initial load*
