const puppeteer = require('puppeteer')
const { chromium } = require('playwright')
const {
  RSS_FEED_URL,
  PAGE_CONFIG,
  BROWSER_ARGS,
  USER_AGENT
} = require('./config')
const { sleep, withRetry } = require('./utils')
const { extractRssContent, logDebugInfo } = require('./rss')

async function fetchPage(page, waitUntil) {
  await page.goto(RSS_FEED_URL, {
    waitUntil,
    timeout: PAGE_CONFIG.loadTimeoutMs
  })
  await sleep(PAGE_CONFIG.postLoadWaitMs)

  const preContent = await page
    .$eval('pre', (el) => el.textContent)
    .catch(() => null)
  const pageContent = await page.content()

  const rssContent = extractRssContent(preContent, pageContent)
  if (rssContent) {
    return rssContent
  }

  const pageUrl = await logDebugInfo(page)
  throw new Error(`No RSS content found at ${pageUrl}`)
}

async function tryWithPuppeteer() {
  console.log(`Fetching ${RSS_FEED_URL} with Puppeteer...`)
  const browser = await puppeteer.launch({
    headless: true,
    args: BROWSER_ARGS,
    defaultViewport: null
  })

  try {
    return await withRetry('Puppeteer', async () => {
      const page = await browser.newPage()
      try {
        await page.setUserAgent(USER_AGENT)
        return await fetchPage(page, 'networkidle2')
      } finally {
        await page.close()
      }
    })
  } finally {
    await browser.close()
  }
}

async function tryWithPlaywright() {
  console.log(`Fetching ${RSS_FEED_URL} with Playwright...`)
  const browser = await chromium.launch({
    headless: true,
    args: BROWSER_ARGS
  })
  const context = await browser.newContext({ userAgent: USER_AGENT })

  try {
    return await withRetry('Playwright', async () => {
      const page = await context.newPage()
      try {
        return await fetchPage(page, 'networkidle')
      } finally {
        await page.close()
      }
    })
  } finally {
    await browser.close()
  }
}

async function fetchWithRetry() {
  try {
    return await tryWithPuppeteer()
  } catch (puppeteerError) {
    console.error('Puppeteer failed, falling back to Playwright...')
    console.error(`Puppeteer error: ${puppeteerError.message}`)
    return await tryWithPlaywright()
  }
}

module.exports = {
  fetchPage,
  tryWithPuppeteer,
  tryWithPlaywright,
  fetchWithRetry
}
