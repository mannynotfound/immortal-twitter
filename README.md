# immortal-twitter

Twitter stream that never dies. A modern port of [immortal-ntwitter](https://github.com/horixon/immortal-ntwitter).

# Usage

### config

```js
import ImmortalStream from 'immortal-twitter-stream'

const config = {
  "creds": {
    "consumer_key": "XXX",
    "consumer_secret": "XXX",
    "access_token_key": "XXX",
    "access_token_secret": "XXX"
  },
  "follow": [
    "169686021", // kanye
    "25365536", // kim
  ],
  "track": [
    "goat",
    "kanye west",
  ]
}

const client = new ImmortalStream(creds)

client.stream('statuses/filter', {
  track: config.track.join(','),
  follow: config.follow.join(','),
}, (stream) => {
  stream.on('data', (err, resp) => {
    console.log(err || resp)
  })
})
```
