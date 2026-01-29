const fs = require('fs/promises')
const { OUTPUT_FILE } = require('./config')
const { fetchWithRetry } = require('./fetcher')

async function main() {
  try {
    const xml = await fetchWithRetry()
    await fs.writeFile(OUTPUT_FILE, xml)
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
