const EXTENSOES = /\.(md|ya?ml|json|mjs|sh)$/
const EM_BACKTICK = /`([^`\n]+)`/g
const EM_LINK = /\[[^\]]*\]\(([^)]+)\)/g

// Diretorios de topo do plugin. Uma referencia cujo primeiro segmento e um
// destes aponta para DENTRO do plugin e precisa resolver. Qualquer outro nome
// — `CLAUDE.md`, `settings.json`, `registry.yaml`, `.dd/config.yml` — e o guia
// nomeando artefato do projeto AUDITADO, que nunca existe aqui dentro.
// Lista explicita em vez de heuristica: heuristica silencia sem avisar.
export const DIRS_DO_PLUGIN = [
  '.claude-plugin', 'agents', 'checks', 'ci', 'commands', 'hooks', 'references', 'skills'
]

export function extrairReferencias(conteudo) {
  const achados = new Set()
  const considerar = (bruto) => {
    const caminho = bruto.trim()
    if (!EXTENSOES.test(caminho)) return
    if (/^[a-z]+:\/\//.test(caminho)) return
    if (/\s/.test(caminho)) return
    if (caminho.startsWith('/')) return
    const ehRelativa = caminho.startsWith('./') || caminho.startsWith('../')
    if (!ehRelativa && !DIRS_DO_PLUGIN.includes(caminho.split('/')[0])) return
    achados.add(caminho)
  }
  for (const m of conteudo.matchAll(EM_BACKTICK)) considerar(m[1])
  for (const m of conteudo.matchAll(EM_LINK)) considerar(m[1])
  return [...achados]
}

// Resolve `./x` e `../x` contra o diretorio do arquivo que cita, sem depender
// de node:path — assim o teste continua sem tocar disco.
export function resolverRelativo(origem, ref) {
  const partes = origem.split('/').slice(0, -1)
  for (const seg of ref.split('/')) {
    if (seg === '.' || seg === '') continue
    if (seg === '..') partes.pop()
    else partes.push(seg)
  }
  return partes.join('/')
}

// Devolve { erros, verificadas }. A contagem existe para que "zero referencias
// verificadas" apareca no relatorio em vez de se disfarcar de sucesso.
export function validarReferencias(arquivos, existe) {
  const erros = []
  let verificadas = 0
  for (const [origem, conteudo] of arquivos) {
    for (const ref of extrairReferencias(conteudo)) {
      verificadas++
      const alvo = ref.startsWith('.') ? resolverRelativo(origem, ref) : ref
      if (!existe(alvo)) erros.push(`${origem}: referencia inexistente: ${ref}`)
    }
  }
  return { erros, verificadas }
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
  const { readFileSync, existsSync, readdirSync, statSync } = await import('node:fs')
  const { fileURLToPath } = await import('node:url')
  const { dirname, join, relative } = await import('node:path')

  const base = join(dirname(fileURLToPath(import.meta.url)), '..', 'plugins', 'dd')
  const arquivos = new Map()
  const varrer = (dir) => {
    for (const entrada of readdirSync(dir)) {
      const caminho = join(dir, entrada)
      if (statSync(caminho).isDirectory()) varrer(caminho)
      else if (entrada.endsWith('.md')) {
        arquivos.set(relative(base, caminho), readFileSync(caminho, 'utf8'))
      }
    }
  }
  varrer(base)

  const { erros, verificadas } = validarReferencias(
    arquivos, (ref) => existsSync(join(base, ref))
  )
  if (erros.length > 0) {
    console.error(`${erros.length} referencia(s) quebrada(s):\n`)
    for (const e of erros) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log(
    `referencias: ${verificadas} verificada(s) em ${arquivos.size} arquivo(s)` +
    (verificadas === 0 ? ' — nenhum ponteiro interno ainda' : '')
  )
}
