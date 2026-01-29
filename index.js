const puppeteer = require('puppeteer')
const fs = require('fs')

const RSS_FEED_URL = 'https://cacm.acm.org/issue/latest/feed'
const OUTPUT_FILE = 'feed.xml'
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000
const PAGE_LOAD_TIMEOUT_MS = 60000
const POST_LOAD_WAIT_MS = 5000

function decodeHtmlEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchRSSFeed() {
  console.log(`Fetching: ${RSS_FEED_URL}`)

  const browser = await puppeteer.launch({
    headless: true,
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

    await page.goto(RSS_FEED_URL, {
      waitUntil: 'networkidle2',
      timeout: PAGE_LOAD_TIMEOUT_MS
    })
    await sleep(POST_LOAD_WAIT_MS)

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

    // Log debug info before failing
    const pageUrl = page.url()
    console.error('Debug info:')
    console.error('  Final URL:', pageUrl)
    console.error('  Page title:', await page.title())
    console.error('  Content length:', content.length)
    console.error('  Content preview:', content.substring(0, 500))

    throw new Error(`No RSS content found at ${pageUrl}`)
  } finally {
    await browser.close()
  }
}

async function fetchWithRetry() {
  let lastError

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchRSSFeed()
    } catch (error) {
      lastError = error
      console.error(`Attempt ${attempt}/${MAX_RETRIES} failed: ${error.message}`)

      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`)
        await sleep(RETRY_DELAY_MS)
      }
    }
  }

  throw lastError
}

async function main() {
  try {
    const xml = await fetchWithRetry()
    fs.writeFileSync(OUTPUT_FILE, xml)
    console.log(`Saved to ${OUTPUT_FILE}`)
  } catch (error) {
    console.error('Error:', error.message)
    console.error('Stack trace:', error.stack)
    if (error.cause) {
      console.error('Cause:', error.cause)
    }
    process.exit(1)
  }
}

main()
