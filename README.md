browserify-loader
=================

A CommonJS Loader for browserify workflow.


## What is browserify-loader

`browserify-loader` is another CommonJS loader for  browserify workflow. With BL, You don’t need  any tools  like watchify, browserify-middleware to auto build and serve bundle *js in development env.

`browserify-loader` is similar  with [requirejs](http://requirejs.org/), but:

- follow [Modules/1.1.1](http://wiki.commonjs.org/wiki/Modules/1.1.1) like [Node](http://nodejs.org/)
- get rid of wrapper code like `define()`
- be compatible all `npm` package  and  all `bower` components witch support `CommonJS`. like `underscore`, `backbone`, `jQuery` and so on.

## Getting start

### install

Download `browserify-loader`  with `npm` or  `bower`:

```bash
$ npm install browserify-loader
```  

Put  `browserify-loader.js` in your page:

```html
<!DOCTYPE html>
<html>
<head>
  <title></title>
</head>
<body>
    <script type="text/javascript"
      src="node_modules/browserify-loader/browserify-loader.js"></script>
</body>
</html>
```

Then, `browserify-loader` will start to run for `main` file in your `package.json` file.

### options

`browserify-loader` has two options to specify the `main` script or `package` location.

```javascript
    <script type="text/javascript"
        id="bl-script"
        main="backbone/app.js"
        package="backbone/"
        src="node_modules/browserify-loader/browserify-loader.js"></script>
```

- **main**: the main entrance script like `app.js` in `node app.js`
-  **package**  the location where `browserify-loader` to load `package.json`， then get the main entrance from `main` property.

>  **main** 's  priority is higher the **package** 's.

## example

Look into [todomvc-in-bl](https://github.com/island205/todomvc-in-bl) , which is a demo project based on [todomvc](https://github.com/tastejs/todomvc) to show how to use `browserify-loader`.



