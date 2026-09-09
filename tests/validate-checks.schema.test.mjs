import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarSchema } from '../scripts/validate-checks.mjs'

const valido = () => ({
  id: 'SEC-001',
  titulo: 'Secret hardcoded em codigo-fonte',
  dominio: 'secrets',
  severidade: 'critica',
  cadencia: ['hook', 'pr', 'release', 'postura'],
  bloqueia: true,
  stacks: ['*'],
  deteccao: { tipo: 'comando', cmd: 'gitleaks detect --no-git --redact' },
  guia: 'checks/secrets.md#sec-001'
})

test('check completo nao gera erro', () => {
  assert.deepEqual(validarSchema([valido()]), [])
})

test('campo obrigatorio ausente e reportado', () => {
  const c = valido()
  delete c.severidade
  const erros = validarSchema([c])
  assert.equal(erros.length, 1)
  assert.match(erros[0], /SEC-001.*severidade/)
})

test('id fora do padrao e reportado', () => {
  const c = { ...valido(), id: 'sec1' }
  assert.ok(validarSchema([c]).some((e) => /padrao/.test(e)))
})

test('id no formato de trilha e aceito', () => {
  const c = { ...valido(), id: 'LGPD-S-002', guia: 'checks/lgpd.md#lgpd-s-002', dominio: 'lgpd' }
  assert.deepEqual(validarSchema([c]), [])
})

test('id duplicado e reportado', () => {
  const erros = validarSchema([valido(), valido()])
  assert.ok(erros.some((e) => /duplicado/.test(e)))
})

test('enums invalidos sao reportados', () => {
  const c = { ...valido(), severidade: 'urgente', dominio: 'infra', cadencia: ['sempre'] }
  const erros = validarSchema([c])
  assert.ok(erros.some((e) => /severidade invalida/.test(e)))
  assert.ok(erros.some((e) => /dominio desconhecido/.test(e)))
  assert.ok(erros.some((e) => /cadencia invalida/.test(e)))
})

test('cadencia vazia e reportada', () => {
  const c = { ...valido(), cadencia: [] }
  assert.ok(validarSchema([c]).some((e) => /lista nao vazia/.test(e)))
})

test('bloqueia nao booleano e reportado', () => {
  const c = { ...valido(), bloqueia: 'sim' }
  assert.ok(validarSchema([c]).some((e) => /booleano/.test(e)))
})
