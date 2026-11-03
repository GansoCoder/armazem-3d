/** Reduz uma imagem carregada pelo utilizador para caber no armazenamento local (data URL JPEG). */
export function reduzirImagem(ficheiro: File, maximo = 900, qualidade = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ficheiro.type.startsWith('image/')) {
      reject(new Error('O ficheiro escolhido não é uma imagem.'))
      return
    }
    const url = URL.createObjectURL(ficheiro)
    const img = new Image()
    img.onload = () => {
      const escala = Math.min(1, maximo / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * escala)
      canvas.height = Math.round(img.height * escala)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', qualidade))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem.'))
    }
    img.src = url
  })
}
