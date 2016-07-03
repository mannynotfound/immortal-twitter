/* Modernized version of https://github.com/horixon/immortal-ntwitter/blob/master/lib/immortal-ntwitter.js */

import util from 'util'
import {EventEmitter} from 'events'
import Twitter from 'twitter'

class BackoffStrategy {
  constructor() {
    this.httpErrorSleepRange = {
      min:     10000,
      max:     320000,
      current: 10000
    }

    this.networkErrorSleepRange = {
      min:     250,
      max:     16000,
      current: 250
    }
  }

  httpErrorBackoff(cb) {
    console.log('http sleep ' + this.httpErrorSleepRange.current)
    this.httpErrorSleep(this.httpErrorSleepRange, cb)
  }

  tcpipErrorBackoff(cb) {
    console.log('tcp/ip sleep ' + this.networkErrorSleepRange.current)
    this.tcpipErrorSleep(this.networkErrorSleepRange, cb)
  }

  resetSleeps() {
    this.httpErrorSleepRange.current = this.httpErrorSleepRange.min
    this.networkErrorSleepRange.current = this.networkErrorSleepRange.min
  }

  httpErrorSleep(range, cb) {
    this.sleepAndBackOff(range.current, () => {
      this.exponentialBackOff(range)
    }, cb)
  }

  tcpipErrorSleep(range, cb) {
    this.sleepAndBackOff(range.current, () => {
      this.linearBackOff(range)
    }, cb)
  }

  linearBackOff(range){
    if (range.current < range.max) {
      range.current = range.current + range.min
    }
  }

  exponentialBackOff(range){
    if (range.current < range.max) {
      range.current = range.current * 2
    }
  }

  sleepAndBackOff(delay, backOff, cb) {
    setTimeout(() => {
      backOff()
      cb()
    }, delay)
  }
}

class ImmortalTwitter {
  constructor(options) {
    Twitter.call(this, options)
  }

  immortalStream(method, params, cb) {
    var immortalStream = new EventEmitter()
    immortalStream.backoffStrategy = new BackoffStrategy()

    immortalStream.resurrectStream = () => {
      this.stream(method, params, (stream) => {
        immortalStream.stream = stream
        stream
        .on('error', immortalStream.handleError.bind(this))
        .on('destroy',immortalStream.resurrectWithResetSleeps.bind(this))
        .on('end', immortalStream.resurrectWithResetSleeps.bind(this))
        .on('data', (data) => {
          immortalStream.emit('data', data)
        })
        .on('limit', (data) => {
          console.log('HIT LIMIT!')
          immortalStream.emit('limit', data)
        })
        .on('delete', (data) => {
          console.log('HIT DELETE!')
          immortalStream.emit('delete', data)
        })
        .on('scrub_geo', (data) => {
          console.log('HIT GEO!')
          immortalStream.emit('scrub_geo', data)
        })
        .on('tcpTimeout', () => {
          console.log('HIT TIMEOUT!')
          immortalStream.emit('tcpTimeout')
        })
      })
    }

    immortalStream.handleError = (error) => {
      console.log('Error: ' + error)

      if (error != 'http') {
        this.backoffStrategy.tcpipErrorBackoff(this.resurrect.bind(this))
      } else {
        this.backoffStrategy.httpErrorBackoff(this.resurrect.bind(this))
      }
    }

    immortalStream.resurrectWithResetSleeps = () => {
      this.backoffStrategy.resetSleeps()
      this.resurrect()
    }

    immortalStream.resurrect = () => {
      this.stream.removeAllListeners()
      this.stream = null
      this.resurrectStream()
    }

    immortalStream.destroy = () => {
      this.stream.removeAllListeners()
      this.stream.destroySilent()
      this.stream = null
      this.emit('destroy')
    }

    cb(immortalStream)
    immortalStream.resurrectStream()

    return this
  }
}

util.inherits(ImmortalTwitter, Twitter)

export default ImmortalTwitter
