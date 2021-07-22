import dotenv from "dotenv"
const PagerDuty = require('node-pagerduty')
import * as WebRequest from 'web-request'

// Parse environment file.
const envFile = process.env.ENV_FILE || ".env-mainnet"
dotenv.config({ path: envFile })

export const PAGER_DUTY_API_KEY_NAME = 'PAGER_DUTY_API_KEY'
export const PAGER_DUTY_API_KEY = process.env[PAGER_DUTY_API_KEY_NAME] || ''
if (PAGER_DUTY_API_KEY === '') {
  throw new Error(`Private key envar ${PAGER_DUTY_API_KEY_NAME} must be set for operation!`)
}

export const PAGER_DUTY_API_SERVICE_NAME = 'PAGER_DUTY_SERVICE'
export const PAGER_DUTY_SERVICE = process.env[PAGER_DUTY_API_SERVICE_NAME] || ''
if (PAGER_DUTY_SERVICE === '') {
  throw new Error(`Private key envar ${PAGER_DUTY_API_SERVICE_NAME} must be set for operation!`)
}

export const PAGER_DUTY_EMAIL_NAME = 'PAGER_DUTY_EMAIL'
export const PAGER_DUTY_EMAIL = process.env[PAGER_DUTY_EMAIL_NAME] || ''
if (PAGER_DUTY_EMAIL === '') {
  throw new Error(`Private key envar ${PAGER_DUTY_EMAIL_NAME} must be set for operation!`)
}

export const VALIDATOR_ADDRESS_NAME = 'VALIDATOR_ADDRESS'
export const VALIDATOR_ADDRESS = process.env[VALIDATOR_ADDRESS_NAME] || ''
if (VALIDATOR_ADDRESS === '') {
  throw new Error(`Private key envar ${VALIDATOR_ADDRESS_NAME} must be set for operation!`)
}

// RPC URL
const API_URL = "http://127.0.0.1:/block"

// Amount of seconds allowed to be out of date before paging
const ACCEPTABLE_DELTA_SECS = 30

// Amount to not sign before paging
const ACCEPTABLE_CONSECUTIVE_MISS = 5

// Amount of exceptions in a row before paging.
const ACCEPTABLE_CONSECUTIVE_EXCEPTIONS = 5

// Sleep interval
const sleepInterval = 10

const pagerDutyClient = new PagerDuty(PAGER_DUTY_API_KEY);
const pagerDutyThrottle: Map<string, Date> = new Map();

let consecutiveMisses = 0
let consecutiveExceptions = 0

const monitor = async () => {
  while (true) {
    console.log("Running Health Checks")

    try {
      console.log("> Fetching Local API Information")
      const apiResponse = await WebRequest.get(API_URL)
      if (apiResponse.statusCode !== 200) {
        throw new Error(`Local API is down! Error code ${apiResponse.statusCode}: ${apiResponse.content}`)
      }
      const apiData = JSON.parse(apiResponse.content)
      console.log("> Done Local Fetch")

      // Inspect time delta between blocks
      const blockTime = Date.parse(apiData.result.block.header.time) / 1000
      const currentTime = Date.now() / 1000
      const deltaTime = Math.abs(currentTime - blockTime)
      if (deltaTime > ACCEPTABLE_DELTA_SECS) {
        await page("Node is lagging", `System Time: ${currentTime}, Block Time: ${blockTime}. Is the Osmosis network stalled?`, 5 * 60, "node-lag")
      }

      // Search through precommits and make sure the validator has signed.
      let found = false
      const precommits = apiData.result.block.last_commit.signatures
      for (let i = 0; i < precommits.length; i++) {
        const precommit = precommits[i]
        if (precommit.validatorAddress === VALIDATOR_ADDRESS) {
          found = true
        }
      }

      // Tabulate consecutive misses
      if (found = true) {
        consecutiveMisses = 0
      } else {
        console.log(`Missed sig in block ${apiData.block.header.height}`)
        consecutiveMisses++
      }

      // Page if above threshold for missed signatures
      if (consecutiveMisses > ACCEPTABLE_CONSECUTIVE_MISS) {
        await page("Missing Signatures", `Consecutive misses: ${consecutiveMisses}`, 5 * 60, "missed-signatures")
      }

      // Reset exceptions.
      consecutiveExceptions = 0
      console.log("All good!")
    } catch (e) {
      // Handle exceptions
      consecutiveExceptions++
      console.log("Unknown error: " + e)
      console.log(`Consecutive exceptions is now ${consecutiveExceptions}`)

      // Page if there's a number of consecutive flakes
      if (consecutiveExceptions > ACCEPTABLE_CONSECUTIVE_EXCEPTIONS) {
        await page("Unknown error", e.message, 5 * 60, 'uknown-error')
      }
    }

    await sleep(sleepInterval)
  }
}

const sleep = async (seconds: number): Promise<void> => {
  const milliseconds = seconds * 1000
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}


const page = async (title, details, throttleSeconds = 60, alertKey) => {
  alertKey = alertKey || title + details

  if (shouldAlert(pagerDutyThrottle, alertKey, throttleSeconds)) {
    console.log(`Paging: ${title}`)
    const payload = {
      incident: {
        title,
        type: 'incident',
        service: {
          id: PAGER_DUTY_SERVICE,
          type: 'service_reference',
        },
        body: {
          type: 'incident_body',
          details,
        },
        incident_key: alertKey,
      },
    };

    if (pagerDutyClient != undefined) {
      await pagerDutyClient.incidents.createIncident(PAGER_DUTY_EMAIL, payload)
    }
  }
}

/** if we've already sent this exact alert in the past `x` seconds, then do not re-alert */
const shouldAlert = (throttle: Map<string, Date>, key: string, throttleSeconds: number): boolean => {
  if (!throttle.has(key)) {
    throttle.set(key, new Date());
    return true;
  }

  const now = new Date().getTime();
  const lastAlertTime = throttle.get(key)?.getTime() || 0;
  const secondsSinceAlerted = (now - lastAlertTime) / 1000;

  if (secondsSinceAlerted > throttleSeconds) {
    // We've passed our throttle delay period
    throttle.set(key, new Date());
    return true;
  }
  return false;
}

monitor()