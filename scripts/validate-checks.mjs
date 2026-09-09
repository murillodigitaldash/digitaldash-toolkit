export const SEVERIDADES = ['critica', 'alta', 'media', 'baixa']
export const CADENCIAS = ['hook', 'pr', 'release', 'postura']
export const TIPOS_DETECCAO = ['comando', 'julgamento']
export const DOMINIOS = ['secrets', 'dependencias', 'logs', 'lgpd', 'tenant', 'ia']
export const CAMPOS_OBRIGATORIOS = [
  'id', 'titulo', 'dominio', 'severidade', 'cadencia', 'bloqueia', 'stacks', 'deteccao', 'guia'
]
export const PADRAO_ID = /^[A-Z]+(-[A-Z]+)*-\d{3}$/

export function validarSchema(checks) {
  const erros = []
  const vistos = new Set()

  for (const [i, c] of checks.entries()) {
    if (!c || typeof c !== 'object') {
      erros.push(`posicao ${i}: entrada nao e um objeto`)
      continue
    }
    const onde = c.id ?? `posicao ${i}`

    for (const campo of CAMPOS_OBRIGATORIOS) {
      if (c[campo] === undefined || c[campo] === null) {
        erros.push(`${onde}: campo obrigatorio ausente: ${campo}`)
      }
    }

    if (c.id !== undefined) {
      if (!PADRAO_ID.test(c.id)) erros.push(`${onde}: id fora do padrao PREFIXO-000`)
      if (vistos.has(c.id)) erros.push(`${c.id}: id duplicado`)
      vistos.add(c.id)
    }
    if (c.dominio !== undefined && !DOMINIOS.includes(c.dominio)) {
      erros.push(`${onde}: dominio desconhecido: ${c.dominio}`)
    }
    if (c.severidade !== undefined && !SEVERIDADES.includes(c.severidade)) {
      erros.push(`${onde}: severidade invalida: ${c.severidade}`)
    }
    if (c.cadencia !== undefined) {
      if (!Array.isArray(c.cadencia) || c.cadencia.length === 0) {
        erros.push(`${onde}: cadencia deve ser lista nao vazia`)
      } else {
        for (const cad of c.cadencia) {
          if (!CADENCIAS.includes(cad)) erros.push(`${onde}: cadencia invalida: ${cad}`)
        }
      }
    }
    if (c.bloqueia !== undefined && typeof c.bloqueia !== 'boolean') {
      erros.push(`${onde}: bloqueia deve ser booleano`)
    }
    if (c.stacks !== undefined && (!Array.isArray(c.stacks) || c.stacks.length === 0)) {
      erros.push(`${onde}: stacks deve ser lista nao vazia`)
    }
    if (c.deteccao !== undefined && !TIPOS_DETECCAO.includes(c.deteccao?.tipo)) {
      erros.push(`${onde}: deteccao.tipo invalido`)
    }
  }

  return erros
}

const PADRAO_CABECALHO = /^###\s+([A-Z]+(?:-[A-Z]+)*-\d{3})\b/gm

export function validarAncoras(checks, lerGuia) {
  const erros = []
  const porArquivo = new Map()

  for (const c of checks) {
    if (!c?.id || !c?.guia) continue
    const [arquivo, ancora] = String(c.guia).split('#')
    if (!ancora) {
      erros.push(`${c.id}: guia sem ancora (esperado ${arquivo}#${c.id.toLowerCase()})`)
      continue
    }
    if (ancora !== c.id.toLowerCase()) {
      erros.push(`${c.id}: ancora do guia deveria ser #${c.id.toLowerCase()}, veio #${ancora}`)
    }
    if (!porArquivo.has(arquivo)) porArquivo.set(arquivo, new Set())
    porArquivo.get(arquivo).add(c.id)
  }

  for (const [arquivo, ids] of porArquivo) {
    let conteudo
    try {
      conteudo = lerGuia(arquivo)
    } catch {
      erros.push(`guia ausente: ${arquivo}`)
      continue
    }
    const cabecalhos = new Set(
      [...conteudo.matchAll(PADRAO_CABECALHO)].map((m) => m[1])
    )
    for (const id of ids) {
      if (!cabecalhos.has(id)) erros.push(`${id}: sem bloco "### ${id}" em ${arquivo}`)
    }
    for (const cab of cabecalhos) {
      if (!ids.has(cab)) erros.push(`${cab}: bloco em ${arquivo} sem entrada no registry`)
    }
  }

  return erros
}
