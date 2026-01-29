const { RETRY_CONFIG } = require('./config')

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
  decodeHtmlEntities,
  sleep,
  calculateBackoffDelay,
  withRetry
}
