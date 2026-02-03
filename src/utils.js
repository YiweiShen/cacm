const { RETRY_CONFIG } = require('./config')

// Remove invalid XML 1.0 control characters (0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F)
// Valid: tab (0x09), newline (0x0A), carriage return (0x0D)
function sanitizeXml(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function calculateBackoffDelay(attempt) {
  const baseDelay =
    RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.multiplier, attempt - 1)
  const cappedDelay = Math.min(baseDelay, RETRY_CONFIG.maxDelayMs)
  const jitter =
    cappedDelay * RETRY_CONFIG.jitterFactor * (Math.random() * 2 - 1)
  return Math.round(cappedDelay + jitter)
}

async function withRetry(name, fn) {
  let lastError
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      console.error(
        `${name} attempt ${attempt}/${RETRY_CONFIG.maxRetries} failed: ${error.message}`
      )
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = calculateBackoffDelay(attempt)
        console.log(`Retrying in ${(delay / 1000).toFixed(1)}s...`)
        await sleep(delay)
      }
    }
  }
  throw lastError
}

module.exports = {
  sanitizeXml,
  decodeHtmlEntities,
  sleep,
  calculateBackoffDelay,
  withRetry
}
