import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarAncoras, PADRAO_ID } from '../scripts/validate-checks.mjs'

const check = (over = {}) => ({ id: 'SEC-001', guia: 'checks/secrets.md#sec-001', ...over })
const guiaCom = (corpo) => () => corpo

test('ancora presente nos dois lados nao gera erro', () => {
  const guia = guiaCom('### SEC-001 — Secret hardcoded\n\nTexto do guia.\n')
  assert.deepEqual(validarAncoras([check()], guia), [])
})

test('check sem bloco no guia e reportado', () => {
  const guia = guiaCom('### SEC-002 — Outro\n')
  const erros = validarAncoras([check()], guia)
  assert.ok(erros.some((e) => /SEC-001: sem bloco/.test(e)))
})

test('bloco no guia sem entrada no registry e reportado', () => {
  const guia = guiaCom('### SEC-001 — Um\n\n### SEC-009 — Orfao\n')
  const erros = validarAncoras([check()], guia)
  assert.ok(erros.some((e) => /SEC-009.*sem entrada no registry/.test(e)))
})

test('guia sem ancora no campo e reportado', () => {
  const erros = validarAncoras([check({ guia: 'checks/secrets.md' })], guiaCom('### SEC-001\n'))
  assert.ok(erros.some((e) => /sem ancora/.test(e)))
})

test('ancora que nao casa com o id e reportada', () => {
  const erros = validarAncoras([check({ guia: 'checks/secrets.md#secret-1' })], guiaCom('### SEC-001\n'))
  assert.ok(erros.some((e) => /deveria ser #sec-001/.test(e)))
})

test('arquivo de guia ausente e reportado', () => {
  const lancar = () => { throw new Error('ENOENT') }
  const erros = validarAncoras([check()], lancar)
  assert.ok(erros.some((e) => /guia ausente/.test(e)))
})

test('id de trilha com hifen extra e reconhecido', () => {
  const c = check({ id: 'LGPD-S-002', guia: 'checks/lgpd.md#lgpd-s-002' })
  const guia = guiaCom('### LGPD-S-002 — Consentimento destacado\n')
  assert.deepEqual(validarAncoras([c], guia), [])
})

test('os dois padroes concordam sobre o que e um id valido', () => {
  const validos = ['SEC-001', 'LGPD-S-002', 'A-B-C-999']
  const invalidos = ['sec-001', 'SEC-1', 'SEC-0001', 'SEC001']
  for (const id of validos) {
    assert.ok(PADRAO_ID.test(id), `PADRAO_ID deveria aceitar ${id}`)
    assert.deepEqual(validarAncoras(
      [{ id, guia: `checks/x.md#${id.toLowerCase()}` }],
      () => `### ${id} — titulo\n`
    ), [], `cabecalho deveria casar ${id}`)
  }
  for (const id of invalidos) {
    assert.equal(PADRAO_ID.test(id), false, `PADRAO_ID deveria rejeitar ${id}`)
  }
})
