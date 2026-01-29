const RSS_FEED_URL = 'https://cacm.acm.org/issue/latest/feed'
const OUTPUT_FILE = 'feed.xml'

const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelayMs: 5000,
  multiplier: 2,
  maxDelayMs: 60000,
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

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

module.exports = {
  RSS_FEED_URL,
  OUTPUT_FILE,
  RETRY_CONFIG,
  PAGE_CONFIG,
  BROWSER_ARGS,
  USER_AGENT
}
