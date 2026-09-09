import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const ler = (caminho) => JSON.parse(readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8'))

test('marketplace declara o plugin dd', () => {
  const mkt = ler('.claude-plugin/marketplace.json')
  assert.equal(mkt.name, 'digitaldash')
  assert.ok(Array.isArray(mkt.plugins), 'plugins deve ser lista')
  const dd = mkt.plugins.find((p) => p.name === 'dd')
  assert.ok(dd, 'plugin dd deve estar declarado')
  assert.equal(dd.source, './plugins/dd')
})

test('plugin.json tem nome e versao semver', () => {
  const plugin = ler('plugins/dd/.claude-plugin/plugin.json')
  assert.equal(plugin.name, 'dd')
  assert.match(plugin.version, /^\d+\.\d+\.\d+$/)
  assert.ok(plugin.description.length > 20, 'descricao deve ser util')
})
