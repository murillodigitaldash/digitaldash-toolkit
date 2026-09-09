import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extrairReferencias, validarReferencias } from '../scripts/validate-refs.mjs'

test('extrai caminhos de backtick e de link markdown', () => {
  const texto = 'Leia `references/etapas/01-higiene.md` e [o guia](checks/secrets.md).'
  assert.deepEqual(
    extrairReferencias(texto).sort(),
    ['checks/secrets.md', 'references/etapas/01-higiene.md']
  )
})

test('ignora URLs e comandos', () => {
  const texto = 'Veja https://exemplo.com/a.md e rode `npm test` e `npx knip --reporter json`.'
  assert.deepEqual(extrairReferencias(texto), [])
})

test('nome de arquivo sem barra e ignorado', () => {
  const texto = 'Cada bloco corresponde a uma entrada de `registry.yaml`, e o agente ' +
    'inspeciona `CLAUDE.md` e `settings.json` do projeto auditado.'
  assert.deepEqual(extrairReferencias(texto), [])
})

test('referencia inexistente e reportada', () => {
  const arquivos = new Map([['skills/release/SKILL.md', 'Leia `references/etapas/99-nada.md`.']])
  const erros = validarReferencias(arquivos, () => false)
  assert.equal(erros.length, 1)
  assert.match(erros[0], /skills\/release\/SKILL\.md.*99-nada\.md/)
})

test('referencia existente nao gera erro', () => {
  const arquivos = new Map([['skills/release/SKILL.md', 'Leia `references/etapas/01-higiene.md`.']])
  assert.deepEqual(validarReferencias(arquivos, () => true), [])
})
