<template>
  <div>{{ msg }}</div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  data (): object {
    return {
      msg: 'Hi from the Vue file!'
    }
  }
})
</script>

<style scoped>
div {
  color: red;
}
</style>
