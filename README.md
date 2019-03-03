# @vue/dev-server

> **This is a proof of concept.**
>
> Imagine you can import Vue single-file components natively in your browser... without a build step.

In an directory, create an `index.html`:

``` html
<div id="app"></div>
<script type="module">
  import './main.js'
</script>
```

In `main.js`:

``` js
import Vue from 'vue'
import App from './test.vue'

new Vue({
  render: h => h(App)
}).$mount('#app')
```

In `test.vue`:

``` vue
<template>
  <div>{{ msg }}</div>
</template>

<script>
export default {
  data() {
    return {
      msg: 'Hi from the Vue file!'
    }
  }
}
</script>

<style scoped>
div {
  color: red;
}
</style>
```

Install:

``` bash
npm install -g @vue/dev-server
```

Then in that directory, run `vue-dev-server` and see it working. There's no "build" process - compilation happens on the fly.

## How It Works

- Imports are requested by the browser as native ES module imports;

- The server intercepts requests to `*.vue` files, compiles them on the fly, and sends them back as JavaScript.

- For libraries that provide ES modules builds that work in browsers, just directly import them from a CDN.

- Imports to npm packages inside `.js` files (package name only) are re-written on the fly to point to locally installed files. Currently, only `vue` is supported as a special case. Other packages will likely need to be transformed to be exposed as a native browser-targeting ES module.

## TODOs

- Caching
- Pre-processors
