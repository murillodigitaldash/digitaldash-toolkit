const EXTENSOES = /\.(md|ya?ml|json|mjs|sh)$/
const EM_BACKTICK = /`([^`\n]+)`/g
const EM_LINK = /\[[^\]]*\]\(([^)]+)\)/g

export function extrairReferencias(conteudo) {
  const achados = new Set()
  const considerar = (bruto) => {
    const caminho = bruto.trim()
    if (!EXTENSOES.test(caminho)) return
    if (/^[a-z]+:\/\//.test(caminho)) return
    if (/\s/.test(caminho)) return
    // Caminhos absolutos e iniciados por ponto sao do projeto alvo, nao do
    // plugin: `.dd/config.yml` e `.protocolo/<stamp>/report.md` sao citados
    // na documentacao mas nunca existem dentro de plugins/dd.
    if (caminho.startsWith('/') || caminho.startsWith('.')) return
    achados.add(caminho)
  }
  for (const m of conteudo.matchAll(EM_BACKTICK)) considerar(m[1])
  for (const m of conteudo.matchAll(EM_LINK)) considerar(m[1])
  return [...achados]
}

export function validarReferencias(arquivos, existe) {
  const erros = []
  for (const [origem, conteudo] of arquivos) {
    for (const ref of extrairReferencias(conteudo)) {
      if (!existe(ref)) erros.push(`${origem}: referencia inexistente: ${ref}`)
    }
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

  const erros = validarReferencias(arquivos, (ref) => existsSync(join(base, ref)))
  if (erros.length > 0) {
    console.error(`${erros.length} referencia(s) quebrada(s):\n`)
    for (const e of erros) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log(`referencias validas em ${arquivos.size} arquivos`)
}
