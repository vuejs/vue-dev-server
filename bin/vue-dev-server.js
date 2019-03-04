#!/usr/bin/env node

const express = require('express')
const { vueMiddleware } = require('../middleware')

const app = express()
const root = process.cwd();

app.use(vueMiddleware(root))

app.use(express.static(root))

app.listen(3000, () => {
  console.log('server running at http://localhost:3000')
})
