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

`browserify-loader` has two options to specify the `main` script or `package` location. and browserify-loader supports `coffee-script`.

```javascript
    <script type="text/javascript"
        id="bl-script"
        main="backbone/app.js"
        package="backbone/"
        extensions="js coffee"
        src="node_modules/browserify-loader/browserify-loader.js"></script>
```

- **main**: the main entrance script like `app.js` in `node app.js`
-  **package**:  the location where `browserify-loader` to load `package.json`， then get the main entrance from `main` property.
- **extensions**: the extension names of your source code.  `browserify-loader` now supports `.js` and '.coffee'.

>  **main** 's  priority is higher the **package** 's.

## example

Look into [todomvc-in-bl](https://github.com/island205/todomvc-in-bl) , which is a demo project based on [todomvc](https://github.com/tastejs/todomvc) to show how to use `browserify-loader`.

## performance

`browserify-loader`'s performance is important, and it is not ideal now yet!

browserify-loader provide  a method to get its performance: `window.define.performance()`

Just think if there is no browserify-loader, where performance cost come from:

- script load time

and then thinking cost in browserify-loader: 

- xhr loading time,  roughly equals script load time

- define time, concat code, insert script tag and so on

- analysis module's dependences

- resolve dependences' uri, include get package.json recursively

- and so on

### Now:

```javascript
define + getDeps + resolveDeps / define + getDeps + resolveDeps + load ≈ 0.2 - 0.5
all - load / load ≈ 3 - 5
```
`load` here is just the  xhr loading time (roughly equals script loading time), `all` is the all cost form start loading all modules to done with browserify-loader.

### Update

#### 0.2.0

- support `coffee-script`





