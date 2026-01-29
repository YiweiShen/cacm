const { decodeHtmlEntities } = require('./utils')

function extractRssContent(preContent, pageContent) {
  if (preContent?.includes('<rss')) {
    return preContent.trim()
  }

  const rssMatch = pageContent.match(/<rss[\s\S]*<\/rss>/i)
  if (rssMatch) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + rssMatch[0]
  }

  if (preContent) {
    const decoded = decodeHtmlEntities(preContent)
    if (decoded.includes('<rss')) {
      return decoded.trim()
    }
  }

  return null
}

async function logDebugInfo(page) {
  const pageUrl = page.url()
  const pageContent = await page.content()
  console.error('Debug info:')
  console.error('  Final URL:', pageUrl)
  console.error('  Page title:', await page.title())
  console.error('  Content length:', pageContent.length)
  console.error('  Content preview:', pageContent.substring(0, 500))
  return pageUrl
}

module.exports = {
  extractRssContent,
  logDebugInfo
}
