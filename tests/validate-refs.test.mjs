import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extrairReferencias, validarReferencias, resolverRelativo } from '../scripts/validate-refs.mjs'

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

test('nome fora dos diretorios do plugin e ignorado', () => {
  const texto = 'Cada bloco corresponde a uma entrada de `registry.yaml`, e o agente ' +
    'inspeciona `CLAUDE.md`, `settings.json` e `.dd/config.yml` do projeto auditado.'
  assert.deepEqual(extrairReferencias(texto), [])
})

test('caminho interno com ponto no primeiro segmento e verificado', () => {
  assert.deepEqual(
    extrairReferencias('o manifesto vive em `.claude-plugin/plugin.json`'),
    ['.claude-plugin/plugin.json']
  )
})

test('referencia relativa e capturada', () => {
  assert.deepEqual(
    extrairReferencias('veja `./02-tipos.md` e `../templates/report.md`').sort(),
    ['../templates/report.md', './02-tipos.md']
  )
})

test('resolverRelativo resolve contra o diretorio de quem cita', () => {
  assert.equal(
    resolverRelativo('references/etapas/01-higiene.md', './02-tipos.md'),
    'references/etapas/02-tipos.md'
  )
  assert.equal(
    resolverRelativo('references/etapas/01-higiene.md', '../templates/report.md'),
    'references/templates/report.md'
  )
})

test('referencia inexistente e reportada', () => {
  const arquivos = new Map([['skills/release/SKILL.md', 'Leia `references/etapas/99-nada.md`.']])
  const { erros, verificadas } = validarReferencias(arquivos, () => false)
  assert.equal(verificadas, 1)
  assert.equal(erros.length, 1)
  assert.match(erros[0], /skills\/release\/SKILL\.md.*99-nada\.md/)
})

test('referencia existente nao gera erro', () => {
  const arquivos = new Map([['skills/release/SKILL.md', 'Leia `references/etapas/01-higiene.md`.']])
  const { erros, verificadas } = validarReferencias(arquivos, () => true)
  assert.deepEqual(erros, [])
  assert.equal(verificadas, 1)
})

test('conta zero quando nao ha ponteiro interno', () => {
  const arquivos = new Map([['checks/secrets.md', 'entrada de `registry.yaml` com o mesmo id']])
  const { erros, verificadas } = validarReferencias(arquivos, () => false)
  assert.deepEqual(erros, [])
  assert.equal(verificadas, 0)
})

test('referencia relativa e resolvida antes de checar existencia', () => {
  const arquivos = new Map([['references/etapas/01-higiene.md', 'veja `./02-tipos.md`']])
  const vistos = []
  validarReferencias(arquivos, (alvo) => { vistos.push(alvo); return true })
  assert.deepEqual(vistos, ['references/etapas/02-tipos.md'])
})
