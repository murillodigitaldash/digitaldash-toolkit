export const SEVERIDADES = ['critica', 'alta', 'media', 'baixa']
export const CADENCIAS = ['hook', 'pr', 'release', 'postura']
export const TIPOS_DETECCAO = ['comando', 'julgamento']
export const DOMINIOS = ['secrets', 'dependencias', 'logs', 'lgpd', 'tenant', 'ia']
export const CAMPOS_OBRIGATORIOS = [
  'id', 'titulo', 'dominio', 'severidade', 'cadencia', 'bloqueia', 'stacks', 'deteccao', 'guia'
]
// Forma canonica de um id do nucleo. PADRAO_ID e PADRAO_CABECALHO derivam
// desta constante: a forma de um id tem UMA definicao no projeto.
const NUCLEO_ID = '[A-Z]+(?:-[A-Z]+)*-\\d{3}'
export const PADRAO_ID = new RegExp(`^${NUCLEO_ID}$`)

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

const PADRAO_CABECALHO = new RegExp(`^###\\s+(${NUCLEO_ID})\\b`, 'gm')

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

export function validarSemantica(checks) {
  const erros = []
  for (const c of checks) {
    const onde = c?.id ?? 'check sem id'
    if (c?.bloqueia === true) {
      if (c?.deteccao?.tipo !== 'comando') {
        erros.push(`${onde}: bloqueia:true exige deteccao.tipo "comando"`)
      }
      if (!Array.isArray(c?.cadencia) || !c.cadencia.includes('pr')) {
        erros.push(`${onde}: bloqueia:true exige cadencia "pr"`)
      }
    }
    if (c?.deteccao?.tipo === 'comando' && !String(c?.deteccao?.cmd ?? '').trim()) {
      erros.push(`${onde}: deteccao.tipo "comando" exige deteccao.cmd`)
    }
    if (c?.deteccao?.tipo === 'julgamento' && c?.deteccao?.cmd) {
      erros.push(`${onde}: deteccao.tipo "julgamento" nao aceita cmd`)
    }
  }
  return erros
}

export function validarExcecoes(config, idsConhecidos, hoje = new Date()) {
  const erros = []
  for (const e of config?.excecoes ?? []) {
    const onde = `excecao ${e?.id ?? '(sem id)'}`
    if (!e?.id) erros.push(`${onde}: campo id ausente`)
    else if (!idsConhecidos.has(e.id)) erros.push(`${onde}: id nao existe no registry`)
    if (!e?.motivo) erros.push(`${onde}: campo motivo ausente`)
    if (!e?.caminho) erros.push(`${onde}: campo caminho ausente`)
    if (!e?.expira) {
      erros.push(`${onde}: campo expira ausente`)
      continue
    }
    const prazo = new Date(`${e.expira}T23:59:59Z`)
    if (Number.isNaN(prazo.getTime())) erros.push(`${onde}: expira invalido: ${e.expira}`)
    else if (prazo < hoje) erros.push(`${onde}: expirou em ${e.expira}`)
  }
  return erros
}

export function validarTudo({ checks, lerGuia, config = null, hoje = new Date() }) {
  const erros = [
    ...validarSchema(checks),
    ...validarAncoras(checks, lerGuia),
    ...validarSemantica(checks)
  ]
  if (config) {
    erros.push(...validarExcecoes(config, new Set(checks.map((c) => c?.id)), hoje))
  }
  return erros
}

// Executado como CLI? Comparar caminhos reais, nunca as URLs cruas:
// import.meta.url vem percent-encoded e com symlink resolvido, enquanto
// process.argv[1] vem literal. Comparar as strings direto falha em qualquer
// caminho com espaco — e o repositorio deste plugin tem um.
const ehCli = process.argv[1] && await (async () => {
  const { realpathSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
})()

if (ehCli) {
  const { readFileSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const { dirname, join } = await import('node:path')
  const { parse } = await import('yaml')

  const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
  const baseChecks = join(raiz, 'plugins', 'dd')
  const checks = parse(readFileSync(join(baseChecks, 'checks', 'registry.yaml'), 'utf8'))
  const lerGuia = (caminho) => readFileSync(join(baseChecks, caminho), 'utf8')

  const erros = validarTudo({ checks, lerGuia })
  if (erros.length > 0) {
    console.error(`${erros.length} problema(s) no nucleo de checks:\n`)
    for (const e of erros) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log(`nucleo de checks valido: ${checks.length} checks`)
}
