# dynamic content

<a href="https://rapidjs.org"><img src="https://rapidjs.org/assets/readme-plugin-badge.svg" height="75"></a>

<img src="https://rapidjs.org/assets/readme-compound-badge.svg" height="25">

Dynamic content loading functionality via wrapper element and markup partials.

```
npm install @t-ski/rapidjs--dynamic-content
```

## Concept

The Plug-in implements content partial loading functionality, eliminating full page document reloads in embedded environments.

## Wrapper element

Any non-singleton element in a compound page's base markup file can be designated as the content wrapper element. Simply assign it the empty attribute `dynamic-content-wrapper`.

> A page must not have more than one wrapper as the loading behavior interacts with the (accessible) request URL. Attributing multiple elements will activate the first DOM-ready element.

## Content

### Files

Each standalone content fragment is to be organized in its own private markup file, co-located in the respective compound page directory. The file's name represents the working content name, neglecting both the private file indicating underscore and the extension (`.html`). For instance: Content stored in the file *_overview.html* relates to the name *overview*. Content can also be deployed in a nested structure given directories and definite files.

### URL

Specific content can be requested fro the URL already: The compound argument sequence represents the requested content. Each entry (in the arguments array) therefore represents a requested content name, where the order defines the nested access.

### Index

As there might not always be given a specific content name sequence upon initial document request, the default content behavior corresponds to the common practice of internally utilizing the name `index` (*_index.html*).

### 404

For specified, yet non-existing content partials, a **404** content partial should be deployed to the root of the related compound page directoy as `404` (*_404.html*).

### Placeholder

Upon initial document request, the base markup is loaded in the first step using the web client native routine. The first content loading process is activated automatically just after the DOM has loaded sufficiently. Thus there is a time period after the initial page load with the first contentful paint and the requested content present to be displayed. During that time period, the markup hardcoded to the content wrapper's inner HTML will show up. That markup can be seen as placeholder content.

> The placeholder content is most effective when loading the page with weak latency (e.g. displaying text abstracted as bars). In good networks, the placeholder content will barely be perceivable. It's recommend to [defer display of placeholders](https://gist.github.com/t-ski/14a1dce4cd403f98f000c554cfeb1747) a fraction of a second in order to prevent a (subliminal) visual flicker effect.

## Dynamic loading interface

The benefits of the dynamic loading functionality don't become effective until a content loading event is manually triggered. To load content by name, use the public `load()` method:

#### Syntax

``` js
rapidJS["@t-ski/rapidjs--dynamic-content"].load(content, anchor = undefined)
```

#### Parameter

| Name  			    | Type			     | Description |
| --------------------- | ------------------ | ----------- |
| **content**           | `String, String[]` | *Name(s) of content to be loaded (ordered array if nested)* |
| **anchor** `optional` | `String, Boolean`  | *Anchor to scroll to (id) after load. Scrolls to top if none given. Pass `false` to disable automatic post-load scroll.* |

#### Return value

`Promise` *Resolves with the new content on success (status code 200). Rejects on fail with the error object*

## Load event listeners

To act upon load events in a general manner, the Plug-in provides a listener interface similar to the `window` event listener paradigm.

#### Syntax

``` js
rapidJS["@t-ski/rapidjs--dynamic-content"].addLoadListener(event, callback, flag = flag.ALWAYS)
```

#### Parameter

| Name		          | Type       | Description |
| ------------------- | ---------- | ----------- |
| **event**           | `String`   | *Type of load event to listen for* |
| **callback**        | `Function` | *Function to call upon event has fired. Gets passed argument(s) based on the event type.* |
| **flag** `optional` | `flag`     | *Upon which temporal frame to apply the listener callback. **ALWAYS** by default.* |

### Flags

#### Synatx

``` js
rapidJS["@t-ski/rapidjs--dynamic-content"].flag.<IDENTIFIER>
```

| Identifier     | Description |
| -------------- | ----------- |
| **INITIALLY**  | *Only invoke callback for the intial (implicitly motivated) content loading event.* |
| **EVENTUALLY** | *Only invoke callback for future content loading events, apart from the initial one.* |
| **ALWAYS**     | *Always invoke callback (initially and eventually)* |

### Events

| Type         | Description |
| ------------ | ----------- |
| **progress** | *Fires upon registered content loading progress. Callback getting passed the current progress ([0, 1], e.g. to display a loading bar).* |
| **complete** | *Fires upon successfully completed content loading processes.* |

## Clear wrapper

In case the wrapper needs to be cleared, falling back to the placeholder, it can be achieved with the void `clear()` method.
#### Syntax

``` js
rapidJS["@t-ski/rapidjs--dynamic-content"].clear()
```

## Example

``` html
<body>
	<header>Example</header>
	<main dynamic-content-wrapper><!-- << DYNAMIC CONTENT WRAPPER -->
		<b>Content is loading...</b><!-- << PLACEHOLDER -->
	</main>
	<footer>
		<a href="https://rapidjs.org" rel="noreferrer">rapidJS</a>
	</footer>
</body>
```

``` js
function loadContent(name) {
    rapidJS["@t-ski/rapidjs--dynamic-content"]
    .load(name)
    .then(content => {
        console.log(`New content: ${content.join(" > ")}`);
    })
    .catch(err => {
        console.error(err);
    });
}

rapidJS["@t-ski/rapidjs--dynamic-content"]
.addLoadListener("progress", progress => {
    console.log(`Content is loading (${progress * 100}%)`);
});
```