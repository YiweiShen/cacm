const puppeteer = require('puppeteer')
const fs = require('fs')

const RSS_FEED_URL = 'https://cacm.acm.org/issue/latest/feed'
const OUTPUT_FILE = 'feed.xml'

const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 30000,
  jitterFactor: 0.2
}

const PAGE_CONFIG = {
  loadTimeoutMs: 60000,
  postLoadWaitMs: 5000
}

const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu'
]

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

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

function calculateBackoffDelay(attempt, config = RETRY_CONFIG) {
  const baseDelay = config.initialDelayMs * Math.pow(config.multiplier, attempt - 1)
  const cappedDelay = Math.min(baseDelay, config.maxDelayMs)
  const jitter = cappedDelay * config.jitterFactor * (Math.random() * 2 - 1)
  return Math.round(cappedDelay + jitter)
}

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

async function fetchRSSFeed(browser) {
  console.log(`Fetching: ${RSS_FEED_URL}`)
  const page = await browser.newPage()

  try {
    await page.goto(RSS_FEED_URL, {
      waitUntil: 'networkidle2',
      timeout: PAGE_CONFIG.loadTimeoutMs
    })
    await sleep(PAGE_CONFIG.postLoadWaitMs)

    const preContent = await page.$eval('pre', (el) => el.textContent).catch(() => null)
    const pageContent = await page.content()

    const rssContent = extractRssContent(preContent, pageContent)
    if (rssContent) {
      return rssContent
    }

    const pageUrl = page.url()
    console.error('Debug info:')
    console.error('  Final URL:', pageUrl)
    console.error('  Page title:', await page.title())
    console.error('  Content length:', pageContent.length)
    console.error('  Content preview:', pageContent.substring(0, 500))

    throw new Error(`No RSS content found at ${pageUrl}`)
  } finally {
    await page.close()
  }
}

async function fetchWithRetry() {
  const browser = await puppeteer.launch({
    headless: true,
    args: BROWSER_ARGS,
    defaultViewport: null
  })
  await browser.newPage().then((p) => p.setUserAgent(USER_AGENT))

  let lastError

  try {
    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        return await fetchRSSFeed(browser)
      } catch (error) {
        lastError = error
        console.error(`Attempt ${attempt}/${RETRY_CONFIG.maxRetries} failed: ${error.message}`)

        if (attempt < RETRY_CONFIG.maxRetries) {
          const delay = calculateBackoffDelay(attempt)
          console.log(`Retrying in ${(delay / 1000).toFixed(1)}s...`)
          await sleep(delay)
        }
      }
    }

    throw lastError
  } finally {
    await browser.close()
  }
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
