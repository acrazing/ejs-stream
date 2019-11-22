# ejs-stream2

A nodejs stream template renderer based on ejs syntax.

The library [ejs](https://github.com/mde/ejs) supports `string` only to output,
but we need to output stream sometimes(see [#102](https://github.com/mde/ejs/issues/102)).
For example, with `React`'s`renderToNodeStream` API. This library makes it possible.

## Install

Please note the package name is **`ejs-stream2`** rather than `ejs-stream` in
npm, for `ejs-stream` is occupied by another people.

```bash
npm install ejs-stream2

# or var yarn
yarn add ejs-stream2
```

## Usage

```typescript jsx
import { compile } from 'ejs-stream2';
import express from 'express';
import { renderToNodeStream } from 'react-dom/server';

const template = compile(`
<!DOCTYPE html>
<html>
<head>
<title><%= title %></title>
</head>
<body>
<div id=root><%- content %></div>
<script async defer src="<%- scriptBundle %>"></script>
</body>
</html>
`);

const app = express();
app.get('/', (req, res) => {
  const stream = template({
    title: 'Hello world',
    content: renderToNodeStream(<App />),
    scriptBundle: '/bundle.js',
  });
  // please note you must listen the `error` event of `Readable`, or your
  // application with exit if error occurs.
  stream.on('error', (error) => {
    console.error(error);
    res.end();
  });
  stream.pipe(res);
});
```

## Features

- Support all the syntax set of `ejs`, see [syntax.md](https://github.com/mde/ejs/blob/master/docs/syntax.md)
- Support the following variables to output directly by `<%- variable %>` or `<%= variable %>`
  - `NodeJS.ReadableStream | Uint8Array | string`
  - `Promise<NodeJS.ReadableStream | Uint8Array | string>`
  - `Array<NodeJS.ReadableStream | Uint8Array | string | Promise<NodeJS.ReadableStream | Uint8Array | string>>`

_For simplify the test cases, we removed the following features from `ejs`_

1. file system relative features, such as `renderFile`, `include`
2. options to change delimiters
3. `async` mode
4. cache

## LICENSE

This project is published under `MIT` license

    The MIT License (MIT)

    Copyright (c) 2019 acrazing

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.

most code of the compiler comes from [mde/ejs](https://github.com/mde/ejs),
license of this project at <https://github.com/mde/ejs/blob/master/LICENSE>.
