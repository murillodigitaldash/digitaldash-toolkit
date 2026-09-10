import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validarSemantica, validarExcecoes, validarTudo } from '../scripts/validate-checks.mjs'

const bloqueante = (over = {}) => ({
  id: 'SEC-001',
  titulo: 'Secret hardcoded',
  dominio: 'secrets',
  severidade: 'critica',
  cadencia: ['hook', 'pr', 'release'],
  bloqueia: true,
  stacks: ['*'],
  deteccao: { tipo: 'comando', cmd: 'gitleaks detect' },
  guia: 'checks/secrets.md#sec-001',
  ...over
})

test('bloqueante mecanico com cadencia pr e valido', () => {
  assert.deepEqual(validarSemantica([bloqueante()]), [])
})

test('bloqueia true com deteccao por julgamento e reportado', () => {
  const c = bloqueante({ deteccao: { tipo: 'julgamento' } })
  assert.ok(validarSemantica([c]).some((e) => /exige deteccao.tipo "comando"/.test(e)))
})

test('bloqueia true sem cadencia pr e reportado', () => {
  const c = bloqueante({ cadencia: ['postura'] })
  assert.ok(validarSemantica([c]).some((e) => /exige cadencia "pr"/.test(e)))
})

test('deteccao comando sem cmd e reportada', () => {
  const c = bloqueante({ deteccao: { tipo: 'comando', cmd: '  ' } })
  assert.ok(validarSemantica([c]).some((e) => /exige deteccao.cmd/.test(e)))
})

test('deteccao julgamento com cmd e reportada', () => {
  const c = bloqueante({ bloqueia: false, deteccao: { tipo: 'julgamento', cmd: 'grep x' } })
  assert.ok(validarSemantica([c]).some((e) => /nao aceita cmd/.test(e)))
})

test('excecao vencida e reportada', () => {
  const config = { excecoes: [{ id: 'SEC-001', motivo: 'exemplo', expira: '2020-01-01' }] }
  const erros = validarExcecoes(config, new Set(['SEC-001']), new Date('2026-09-09T12:00:00Z'))
  assert.ok(erros.some((e) => /expirou em 2020-01-01/.test(e)))
})

test('excecao valida no futuro nao gera erro', () => {
  const config = { excecoes: [{ id: 'SEC-001', caminho: 'src/exemplo.js', motivo: 'exemplo', expira: '2027-01-01' }] }
  assert.deepEqual(validarExcecoes(config, new Set(['SEC-001']), new Date('2026-09-09T12:00:00Z')), [])
})

test('excecao para id inexistente e reportada', () => {
  const config = { excecoes: [{ id: 'XYZ-999', motivo: 'x', expira: '2027-01-01' }] }
  const erros = validarExcecoes(config, new Set(['SEC-001']), new Date('2026-09-09T12:00:00Z'))
  assert.ok(erros.some((e) => /nao existe no registry/.test(e)))
})

test('excecao sem motivo ou sem expira e reportada', () => {
  const config = { excecoes: [{ id: 'SEC-001' }] }
  const erros = validarExcecoes(config, new Set(['SEC-001']), new Date('2026-09-09T12:00:00Z'))
  assert.ok(erros.some((e) => /motivo ausente/.test(e)))
  assert.ok(erros.some((e) => /expira ausente/.test(e)))
})

test('excecao sem caminho e reportada', () => {
  const config = { excecoes: [{ id: 'SEC-001', motivo: 'exemplo', expira: '2027-01-01' }] }
  const erros = validarExcecoes(config, new Set(['SEC-001']), new Date('2026-09-09T12:00:00Z'))
  assert.ok(erros.some((e) => /caminho ausente/.test(e)))
})

test('validarTudo agrega os tres validadores', () => {
  const c = bloqueante({ deteccao: { tipo: 'julgamento' }, severidade: 'urgente' })
  const erros = validarTudo({ checks: [c], lerGuia: () => '### SEC-001\n' })
  assert.ok(erros.some((e) => /severidade invalida/.test(e)))
  assert.ok(erros.some((e) => /exige deteccao.tipo "comando"/.test(e)))
})
