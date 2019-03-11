# @vue/dev-server

> **This is a proof of concept.**
>
> Imagine you can import Vue single-file components natively in your browser... without a build step.

In an directory, create an `index.html`:

``` html
<div id="app"></div>
<script type="module">
import Vue from 'https://unpkg.com/vue/dist/vue.esm.browser.js'
import App from './App.vue'

new Vue({
  render: h => h(App)
}).$mount('#app')
</script>
```

In `App.vue`:

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

Then:

``` bash
npm i @vue/dev-server
npx vue-dev-server
```

## How It Works

- Imports are requested by the browser as native ES module imports - there's no bundling.

- The server intercepts requests to `*.vue` files, compiles them on the fly, and sends them back as JavaScript.

- For libraries that provide ES modules builds that work in browsers, just directly import them from a CDN.

- Imports to npm packages inside `.js` files (package name only) are re-written on the fly to point to locally installed files. Currently, only `vue` is supported as a special case. Other packages will likely need to be transformed to be exposed as a native browser-targeting ES module.

## TODOs

- [x] Caching
- [ ] NPM module imports
- [ ] Pre-processors
