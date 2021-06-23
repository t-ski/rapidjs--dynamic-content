# rapidjs--components

<a href="https://rapidjs.org"><img src="https://rapidjs.org/_assets/readme-plugin-badge.svg" height="75"></a>

## Purpose

Providing dynamic content loading functionality for dynamic page environments.

---

## Installation

```
npm install rapidjs--dynamic-content
```

---

## Usage

### Concept

The plug-in adopts dynamic content loading functionality for compound pages: By declaring a compound page abse file's element as the dynamic content wrapper, it will display respective content as stored in private files located in the compound page directory.

### Content wrapper attribution

Any non-singleton element in a compound page base file (in other words, any element that may have child elements) can be the designated content wrapper element by setting up the empty `rapid--wrapper` attribute upon the element.

> A page can not have more than one wrapper element as by design. When attributing multiple elements respectively, only the first of those elements rendered by the DOM will be used as the content wrapper.

### Content files

Each standalone content fragment is to be organized in its own private file, located in the compound page directory. By

### Placeholder content

...