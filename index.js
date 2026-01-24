const puppeteer = require('puppeteer')
const fs = require('fs')

const RSS_FEED_URL = 'https://cacm.acm.org/issue/latest/feed'

function decodeHtmlEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
}

async function fetchRSSFeed() {
  console.log(`Fetching: ${RSS_FEED_URL}`)

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  })

  try {
    const page = await browser.newPage()

    await page.goto(RSS_FEED_URL, { waitUntil: 'networkidle2', timeout: 60000 })
    await new Promise((r) => setTimeout(r, 5000))

    // Get text content from pre tag (browser renders XML as escaped text)
    const preContent = await page.$eval('pre', (el) => el.textContent).catch(() => null)

    if (preContent && preContent.includes('<rss')) {
      return preContent.trim()
    }

    // Fallback: try raw content
    const content = await page.content()
    const rssMatch = content.match(/<rss[\s\S]*<\/rss>/i)
    if (rssMatch) {
      return '<?xml version="1.0" encoding="UTF-8"?>\n' + rssMatch[0]
    }

    // Try decoding HTML entities from pre tag
    if (preContent) {
      const decoded = decodeHtmlEntities(preContent)
      if (decoded.includes('<rss')) {
        return decoded.trim()
      }
    }

    throw new Error('No RSS content found')
  } finally {
    await browser.close()
  }
}

async function main() {
  try {
    const xml = await fetchRSSFeed()
    fs.writeFileSync('feed.xml', xml)
    console.log('Saved to feed.xml')
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
