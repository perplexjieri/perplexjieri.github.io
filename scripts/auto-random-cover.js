'use strict'

function pickStableCover(covers, key) {
  let hash = 0

  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0
  }

  const index = Math.abs(hash) % covers.length
  return covers[index]
}

hexo.extend.filter.register('before_post_render', data => {
  if (data.layout !== 'post') return data

  const coverPool = hexo.theme.config.cover && hexo.theme.config.cover.default_cover
  if (!Array.isArray(coverPool) || coverPool.length === 0) return data

  const key = data.source || data.slug || data.title || data.path || String(Date.now())
  const chosenCover = pickStableCover(coverPool, key)

  if (!data.cover) {
    data.cover = chosenCover
  }

  if (!data.top_img) {
    data.top_img = data.cover || chosenCover
  }

  return data
})
