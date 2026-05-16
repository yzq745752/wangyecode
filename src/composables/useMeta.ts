export function useMeta() {
  const setTitle = (title: string) => {
    document.title = title ? `${title} - 个人博客` : '个人博客'
  }

  const setMeta = (attrs: Record<string, string>) => {
    for (const [key, value] of Object.entries(attrs)) {
      // Try property first (OG), then name (standard)
      let el = document.querySelector(`meta[property="${key}"]`)
      if (!el) el = document.querySelector(`meta[name="${key}"]`)
      if (!el) {
        el = document.createElement('meta')
        if (key.startsWith('og:')) {
          el.setAttribute('property', key)
        } else {
          el.setAttribute('name', key)
        }
        document.head.appendChild(el)
      }
      el.setAttribute('content', value)
    }
  }

  const setArticleMeta = (title: string, description: string, image?: string | null) => {
    setTitle(title)
    const siteName = '个人博客'
    setMeta({
      'description': description,
      'og:title': title,
      'og:description': description,
      'og:type': 'article',
      'og:site_name': siteName,
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description,
    })
    if (image) {
      const url = image.startsWith('http') ? image : `${window.location.origin}${image}`
      setMeta({ 'og:image': url, 'twitter:image': url })
    }
  }

  const setDefaultMeta = (title?: string) => {
    if (title) {
      setTitle(title)
      setMeta({ 'description': `${title} - 个人博客` })
    } else {
      setTitle('')
      setMeta({ 'description': '个人博客 - 分享技术、记录生活' })
    }
  }

  return { setTitle, setMeta, setArticleMeta, setDefaultMeta }
}
