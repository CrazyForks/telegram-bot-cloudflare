/**
 * https://github.com/cvzi/telegram-bot-cloudflare
 */


let TOKEN // Get it from @BotFather https://core.telegram.org/bots#6-botfather
const WEBHOOK = '/endpoint'
let jsonInputFiles
let SECRET
const bot_url = "https://YourURL.workers.dev" //Fill in with your URL
const audio_url = "https://YourURL.workers.dev/"

/**
 * Wait for requests to the worker
 */
export default {
    async fetch(request, environment, context) {
        const url = request.url
        TOKEN =  environment.ENV_BOT_TOKEN
        SECRET = environment.ENV_BOT_SECRET
        jsonInputFiles = await environment.NAMESPACE.get('input_files')
        if (url.endsWith(WEBHOOK)){
            return await(handleWebhook(request))
        } else if (url.endsWith ('/registerWebhook')) {
            return await(registerWebhook(request, url, WEBHOOK, SECRET))
        } else if (url.endsWith('/unRegisterWebhook')) {
            return await(unRegisterWebhook(request))
        } else {
            return environment.ASSETS.fetch(request);
        }
    }
}

/**
 * Handle requests to WEBHOOK
 * https://core.telegram.org/bots/api#update
 */
export async function handleWebhook (request) {
  // Check secret
  if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== SECRET) {
    return new Response('Unauthorized', { status: 403 })
  }

  // Read request body synchronously
  const update = await request.json()
  // Deal with response asynchronously
  await onUpdate(update)
  return new Response('Ok')
}

/**
 * Handle incoming Update
 * https://core.telegram.org/bots/api#update
 */
export async function onUpdate (update) {
  if ('message' in update) {
    await onMessage(update.message)
  }else if ('inline_query' in update){
    await onInlineQuery(update.inline_query)
  }
}

/**
 * Handle incoming Message
 * https://core.telegram.org/bots/api#message
 */
export async function onMessage (message) {
        return sendPlainText(message.chat.id, 'This is an inline bot')
    }

  /**
 * Send plain text message
 * https://core.telegram.org/bots/api#sendmessage
 */
export async function sendPlainText (chatId, text) {
  return (await fetch(apiUrl('sendMessage', {
    chat_id: chatId,
    text
  }))).json()
}

/**
 * Handle incoming query
 * https://core.telegram.org/bots/api#InlineQuery
 * This will reply with a voice message but can be changed in type
 * The input file is defined in the environment variables.
 */
export async function onInlineQuery (inlineQuery) {
  const results = []
  const search = inlineQuery.query
  const parsedInputFiles = JSON.parse(jsonInputFiles)
  let number = Object.keys(parsedInputFiles).length
  if (search == ""){
    number = 50 // maximum number of audios to show
  }
  for (let i = 0; i < number; i++) {
    const caption = parsedInputFiles[i][3]
    const title = parsedInputFiles[i][0]
    if ((caption.toLowerCase().includes(search.toLowerCase()))||(title.toLowerCase().includes(search.toLowerCase()))){
      results.push({
        type: 'voice',
        id: crypto.randomUUID(),
        voice_url: audio_url+parsedInputFiles[i][1],
        title: parsedInputFiles[i][0],
        voice_duration: parsedInputFiles[i][2],
        caption: parsedInputFiles[i][3],
        parse_mode: 'HTML'
      })
    }
  }
  const res = JSON.stringify(results)
  return SendInlineQuery(inlineQuery.id, res)
}

/**
 * Send result of the query
 * https://core.telegram.org/bots/api#answerinlinequery
 */

export async function SendInlineQuery (inlineQueryId, results) {
  return (await fetch(apiUrl('answerInlineQuery', {
    inline_query_id: inlineQueryId,
    results
  }))).json()
}

/**
 * Set webhook to this worker's url
 * https://core.telegram.org/bots/api#setwebhook
 */
async function registerWebhook (event, requestUrl, suffix, secret) {
  // https://core.telegram.org/bots/api#setwebhook
  const webhookUrl = bot_url + suffix
  const r = await (await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * Remove webhook
 * https://core.telegram.org/bots/api#setwebhook
 */
export async function unRegisterWebhook (event) {
  const r = await (await fetch(apiUrl('setWebhook', { url: '' }))).json()
  return new Response('ok' in r && r.ok ? 'Ok' : JSON.stringify(r, null, 2))
}

/**
 * Return url to telegram api, optionally with parameters added
 */
export function apiUrl (methodName, params = null) {
  let query = ''
  if (params) {
    query = '?' + new URLSearchParams(params).toString()
  }
  return `https://api.telegram.org/bot${TOKEN}/${methodName}${query}`
}